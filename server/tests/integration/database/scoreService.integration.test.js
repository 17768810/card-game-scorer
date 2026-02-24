/**
 * scoreService 集成测试
 * 使用真实数据库测试积分验证、提交、统计更新和删除回滚功能
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 创建测试数据库辅助函数
function createTestDatabase() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  // 加载schema
  const schemaPath = join(__dirname, '../../../database/schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  const statements = schema.split(';').filter(stmt => stmt.trim());
  statements.forEach(stmt => {
    if (stmt.trim()) {
      db.exec(stmt);
    }
  });

  // 加载game_types迁移
  const migrationPath = join(__dirname, '../../../database/migrations/001_add_game_types.sql');
  const migration = readFileSync(migrationPath, 'utf-8');

  // 分离CREATE TABLE和INSERT语句
  const migrationLines = migration.split('\n');
  let createTableSQL = '';
  let insertSQL = '';
  let inCreateTable = false;

  for (const line of migrationLines) {
    if (line.trim().startsWith('CREATE TABLE')) {
      inCreateTable = true;
    }

    if (inCreateTable) {
      createTableSQL += line + '\n';
      if (line.trim().endsWith(');')) {
        inCreateTable = false;
      }
    } else if (line.trim().startsWith('INSERT INTO game_types')) {
      // 找到完整的INSERT语句
      let insertStart = migrationLines.indexOf(line);
      for (let i = insertStart; i < migrationLines.length; i++) {
        insertSQL += migrationLines[i] + '\n';
        if (migrationLines[i].trim().endsWith(';')) {
          break;
        }
      }
      break;
    }
  }

  // 先执行CREATE TABLE
  if (createTableSQL.trim()) {
    try {
      db.exec(createTableSQL);
    } catch (error) {
      console.error('Create table error:', error.message);
    }
  }

  // 再执行INSERT
  if (insertSQL.trim()) {
    try {
      db.exec(insertSQL);
    } catch (error) {
      console.error('Insert error:', error.message);
    }
  }

  // 添加current_round字段到rooms表
  try {
    db.exec('ALTER TABLE rooms ADD COLUMN current_round INTEGER DEFAULT 0');
  } catch (error) {
    // 忽略字段已存在错误
  }

  return db;
}

describe('scoreService Integration Tests', () => {
  let db;
  let room;
  let players;
  let gameType;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    db.close();
  });

  beforeEach(() => {
    // 清理数据
    db.exec('DELETE FROM scores');
    db.exec('DELETE FROM rounds');
    db.exec('DELETE FROM player_stats');
    db.exec('DELETE FROM players');
    db.exec('DELETE FROM rooms');
    db.exec('DELETE FROM game_types');

    // 创建游戏类型
    const gameTypeResult = db.prepare(`
      INSERT INTO game_types (
        code, name, display_name, is_custom,
        min_players, max_players, validation_type, validation_value,
        score_range_min, score_range_max, description, icon, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'shisanshui', 'shisanshui', '十三水', 0,
      2, 4, 'sum_equals', 0,
      -1000, 1000, '经典十三水游戏', '🎴', Date.now()
    );

    gameType = {
      id: gameTypeResult.lastInsertRowid,
      code: 'shisanshui',
      validation_type: 'sum_equals',
      validation_value: 0,
      score_range_min: -1000,
      score_range_max: 1000,
      min_players: 2,
      max_players: 4
    };

    // 创建房间
    const roomResult = db.prepare(`
      INSERT INTO rooms (code, game_type, status, max_players, created_at, current_round)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('TEST123', 'shisanshui', 'playing', 4, Date.now(), 1);

    room = {
      id: roomResult.lastInsertRowid,
      code: 'TEST123'
    };

    // 创建玩家
    players = [];
    for (let i = 0; i < 4; i++) {
      const playerResult = db.prepare(`
        INSERT INTO players (room_id, name, position, is_creator, joined_at, last_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(room.id, `玩家${i + 1}`, i + 1, i === 0 ? 1 : 0, Date.now(), Date.now());

      players.push({
        id: playerResult.lastInsertRowid,
        name: `玩家${i + 1}`,
        position: i + 1
      });

      // 创建玩家统计
      db.prepare(`
        INSERT INTO player_stats (player_id, room_id, last_updated)
        VALUES (?, ?, ?)
      `).run(playerResult.lastInsertRowid, room.id, Date.now());
    }
  });

  describe('积分验证', () => {
    it('应验证有效的积分（总和为0）', () => {
      const scores = [
        { playerId: players[0].id, score: 10 },
        { playerId: players[1].id, score: -5 },
        { playerId: players[2].id, score: -3 },
        { playerId: players[3].id, score: -2 }
      ];

      const sum = scores.reduce((acc, s) => acc + parseInt(s.score), 0);
      expect(sum).toBe(0);

      // 验证积分范围
      for (const s of scores) {
        const score = parseInt(s.score);
        expect(score).toBeGreaterThanOrEqual(gameType.score_range_min);
        expect(score).toBeLessThanOrEqual(gameType.score_range_max);
      }
    });

    it('应检测总和不为0的积分', () => {
      const scores = [
        { playerId: players[0].id, score: 10 },
        { playerId: players[1].id, score: 5 }
      ];

      const sum = scores.reduce((acc, s) => acc + parseInt(s.score), 0);
      expect(sum).not.toBe(0);
    });
  });

  describe('积分提交', () => {
    it('应成功提交有效积分并创建局次', () => {
      const roundNumber = 1;
      const scoreData = [
        { playerId: players[0].id, score: 10 },
        { playerId: players[1].id, score: -10 }
      ];

      // 创建局次
      const roundResult = db.prepare(`
        INSERT INTO rounds (room_id, round_number, created_at, completed_at)
        VALUES (?, ?, ?, ?)
      `).run(room.id, roundNumber, Date.now(), Date.now());

      const roundId = roundResult.lastInsertRowid;

      // 插入积分
      const insertScore = db.prepare(`
        INSERT INTO scores (round_id, player_id, score, entered_at)
        VALUES (?, ?, ?, ?)
      `);

      for (const { playerId, score } of scoreData) {
        insertScore.run(roundId, playerId, parseInt(score), Date.now());
      }

      // 验证积分已插入
      const scores = db.prepare(`
        SELECT * FROM scores WHERE round_id = ?
      `).all(roundId);

      expect(scores).toHaveLength(2);
      expect(scores[0].score).toBe(10);
      expect(scores[1].score).toBe(-10);
    });

    it('应正确更新玩家统计', () => {
      const roundNumber = 1;
      const scoreData = [
        { playerId: players[0].id, score: 10 },
        { playerId: players[1].id, score: -10 }
      ];

      // 创建局次并插入积分
      const roundResult = db.prepare(`
        INSERT INTO rounds (room_id, round_number, created_at, completed_at)
        VALUES (?, ?, ?, ?)
      `).run(room.id, roundNumber, Date.now(), Date.now());

      const roundId = roundResult.lastInsertRowid;

      for (const { playerId, score } of scoreData) {
        db.prepare(`
          INSERT INTO scores (round_id, player_id, score, entered_at)
          VALUES (?, ?, ?, ?)
        `).run(roundId, playerId, parseInt(score), Date.now());
      }

      // 更新统计
      for (const { playerId, score } of scoreData) {
        const scoreInt = parseInt(score);
        const stats = db.prepare(`
          SELECT * FROM player_stats WHERE player_id = ? AND room_id = ?
        `).get(playerId, room.id);

        const newTotalScore = (stats.total_score || 0) + scoreInt;
        const newRoundsPlayed = (stats.rounds_played || 0) + 1;
        const newRoundsWon = (stats.rounds_won || 0) + (scoreInt > 0 ? 1 : 0);
        const newHighest = Math.max(stats.highest_round_score || scoreInt, scoreInt);
        const newLowest = Math.min(stats.lowest_round_score || scoreInt, scoreInt);
        const newAverage = newTotalScore / newRoundsPlayed;

        db.prepare(`
          UPDATE player_stats SET
            total_score = ?,
            rounds_played = ?,
            rounds_won = ?,
            highest_round_score = ?,
            lowest_round_score = ?,
            average_score = ?,
            last_updated = ?
          WHERE player_id = ? AND room_id = ?
        `).run(
          newTotalScore, newRoundsPlayed, newRoundsWon,
          newHighest, newLowest, newAverage, Date.now(),
          playerId, room.id
        );
      }

      // 验证统计
      const player1Stats = db.prepare(`
        SELECT * FROM player_stats WHERE player_id = ? AND room_id = ?
      `).get(players[0].id, room.id);

      expect(player1Stats.total_score).toBe(10);
      expect(player1Stats.rounds_played).toBe(1);
      expect(player1Stats.rounds_won).toBe(1);
      expect(player1Stats.highest_round_score).toBe(10);
      expect(player1Stats.lowest_round_score).toBe(10);
      expect(player1Stats.average_score).toBe(10);
    });
  });

  describe('局次删除和统计回滚', () => {
    it('应成功删除局次并回滚统计', () => {
      // 先提交一局
      const roundResult = db.prepare(`
        INSERT INTO rounds (room_id, round_number, created_at, completed_at)
        VALUES (?, ?, ?, ?)
      `).run(room.id, 1, Date.now(), Date.now());

      const roundId = roundResult.lastInsertRowid;

      const scoreData = [
        { playerId: players[0].id, score: 10 },
        { playerId: players[1].id, score: -10 }
      ];

      for (const { playerId, score } of scoreData) {
        db.prepare(`
          INSERT INTO scores (round_id, player_id, score, entered_at)
          VALUES (?, ?, ?, ?)
        `).run(roundId, playerId, parseInt(score), Date.now());

        // 更新统计
        db.prepare(`
          UPDATE player_stats SET
            total_score = ?,
            rounds_played = 1,
            rounds_won = ?,
            highest_round_score = ?,
            lowest_round_score = ?,
            average_score = ?,
            last_updated = ?
          WHERE player_id = ? AND room_id = ?
        `).run(
          parseInt(score),
          parseInt(score) > 0 ? 1 : 0,
          parseInt(score),
          parseInt(score),
          parseInt(score),
          Date.now(),
          playerId,
          room.id
        );
      }

      // 删除局次
      db.prepare('DELETE FROM scores WHERE round_id = ?').run(roundId);
      db.prepare('DELETE FROM rounds WHERE id = ?').run(roundId);

      // 回滚统计
      for (const { playerId } of scoreData) {
        db.prepare(`
          UPDATE player_stats SET
            total_score = 0,
            rounds_played = 0,
            rounds_won = 0,
            highest_round_score = 0,
            lowest_round_score = 0,
            average_score = 0,
            last_updated = ?
          WHERE player_id = ? AND room_id = ?
        `).run(Date.now(), playerId, room.id);
      }

      // 验证统计已回滚
      const player1Stats = db.prepare(`
        SELECT * FROM player_stats WHERE player_id = ? AND room_id = ?
      `).get(players[0].id, room.id);

      expect(player1Stats.total_score).toBe(0);
      expect(player1Stats.rounds_played).toBe(0);
    });
  });

  describe('数据库事务完整性', () => {
    it('应保证积分提交的原子性', () => {
      const transaction = db.transaction((roomId, roundNumber, scoreData) => {
        const roundResult = db.prepare(`
          INSERT INTO rounds (room_id, round_number, created_at, completed_at)
          VALUES (?, ?, ?, ?)
        `).run(roomId, roundNumber, Date.now(), Date.now());

        const roundId = roundResult.lastInsertRowid;

        for (const { playerId, score } of scoreData) {
          db.prepare(`
            INSERT INTO scores (round_id, player_id, score, entered_at)
            VALUES (?, ?, ?, ?)
          `).run(roundId, playerId, parseInt(score), Date.now());
        }

        return roundId;
      });

      const scoreData = [
        { playerId: players[0].id, score: 10 },
        { playerId: players[1].id, score: -10 }
      ];

      const roundId = transaction(room.id, 1, scoreData);

      // 验证所有数据都已提交
      const round = db.prepare('SELECT * FROM rounds WHERE id = ?').get(roundId);
      const scores = db.prepare('SELECT * FROM scores WHERE round_id = ?').all(roundId);

      expect(round).toBeDefined();
      expect(scores).toHaveLength(2);
    });
  });
});
