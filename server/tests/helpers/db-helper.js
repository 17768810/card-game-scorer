/**
 * 数据库测试辅助工具
 * 提供内存数据库实例和测试数据种子方法
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class TestDatabase {
  constructor() {
    // 创建内存数据库
    this.db = new Database(':memory:');
    this.db.pragma('foreign_keys = ON');
    this.loadSchema();
  }

  /**
   * 加载数据库schema
   */
  loadSchema() {
    const schemaPath = join(__dirname, '../../database/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    const statements = schema.split(';').filter(stmt => stmt.trim());
    statements.forEach(stmt => {
      if (stmt.trim()) {
        this.db.exec(stmt);
      }
    });
  }

  /**
   * 创建测试房间
   * @param {Object} options - 房间选项
   * @returns {Object} 房间信息
   */
  createTestRoom(options = {}) {
    const {
      code = 'TEST' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      game_type = 'shisanshui',
      status = 'waiting',
      max_players = 4,
      settings = null
    } = options;

    const stmt = this.db.prepare(`
      INSERT INTO rooms (code, game_type, status, max_players, created_at, settings)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      code,
      game_type,
      status,
      max_players,
      Date.now(),
      settings ? JSON.stringify(settings) : null
    );

    return {
      id: result.lastInsertRowid,
      code,
      game_type,
      status,
      max_players,
      settings
    };
  }

  /**
   * 创建测试玩家
   * @param {number} roomId - 房间ID
   * @param {Object} options - 玩家选项
   * @returns {Object} 玩家信息
   */
  createTestPlayer(roomId, options = {}) {
    const {
      name = 'Player' + Math.random().toString(36).substring(2, 6),
      position = this.getNextPlayerPosition(roomId),
      is_creator = false
    } = options;

    const stmt = this.db.prepare(`
      INSERT INTO players (room_id, name, position, is_creator, joined_at, last_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const now = Date.now();
    const result = stmt.run(roomId, name, position, is_creator ? 1 : 0, now, now);

    // 创建玩家统计记录
    const statsStmt = this.db.prepare(`
      INSERT INTO player_stats (player_id, room_id, last_updated)
      VALUES (?, ?, ?)
    `);
    statsStmt.run(result.lastInsertRowid, roomId, now);

    return {
      id: result.lastInsertRowid,
      room_id: roomId,
      name,
      position,
      is_creator
    };
  }

  /**
   * 获取下一个玩家位置
   * @param {number} roomId - 房间ID
   * @returns {number} 位置编号
   */
  getNextPlayerPosition(roomId) {
    const stmt = this.db.prepare(`
      SELECT MAX(position) as max_pos FROM players WHERE room_id = ?
    `);
    const result = stmt.get(roomId);
    return (result.max_pos || 0) + 1;
  }

  /**
   * 创建测试局次
   * @param {number} roomId - 房间ID
   * @param {number} roundNumber - 局次编号
   * @returns {Object} 局次信息
   */
  createTestRound(roomId, roundNumber) {
    const stmt = this.db.prepare(`
      INSERT INTO rounds (room_id, round_number, created_at)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(roomId, roundNumber, Date.now());

    return {
      id: result.lastInsertRowid,
      room_id: roomId,
      round_number: roundNumber
    };
  }

  /**
   * 创建测试积分
   * @param {number} roundId - 局次ID
   * @param {number} playerId - 玩家ID
   * @param {number} score - 积分
   * @returns {Object} 积分信息
   */
  createTestScore(roundId, playerId, score) {
    const stmt = this.db.prepare(`
      INSERT INTO scores (round_id, player_id, score, entered_at)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(roundId, playerId, score, Date.now());

    return {
      id: result.lastInsertRowid,
      round_id: roundId,
      player_id: playerId,
      score
    };
  }

  /**
   * 创建完整的测试场景
   * @param {Object} options - 场景选项
   * @returns {Object} 完整的测试数据
   */
  createTestScenario(options = {}) {
    const {
      playerCount = 4,
      roundCount = 0,
      gameType = 'shisanshui'
    } = options;

    // 创建房间
    const room = this.createTestRoom({ game_type: gameType });

    // 创建玩家
    const players = [];
    for (let i = 0; i < playerCount; i++) {
      const player = this.createTestPlayer(room.id, {
        name: `玩家${i + 1}`,
        is_creator: i === 0
      });
      players.push(player);
    }

    // 更新房间创建者
    if (players.length > 0) {
      this.db.prepare('UPDATE rooms SET creator_id = ? WHERE id = ?')
        .run(players[0].id, room.id);
    }

    // 创建局次（如果需要）
    const rounds = [];
    for (let i = 0; i < roundCount; i++) {
      const round = this.createTestRound(room.id, i + 1);
      rounds.push(round);
    }

    return {
      room,
      players,
      rounds
    };
  }

  /**
   * 清理所有数据
   */
  clear() {
    this.db.exec('DELETE FROM scores');
    this.db.exec('DELETE FROM rounds');
    this.db.exec('DELETE FROM player_stats');
    this.db.exec('DELETE FROM players');
    this.db.exec('DELETE FROM rooms');
  }

  /**
   * 关闭数据库连接
   */
  close() {
    this.db.close();
  }

  /**
   * 获取数据库实例
   * @returns {Database} 数据库实例
   */
  getDb() {
    return this.db;
  }
}

/**
 * 创建测试数据库实例
 * @returns {TestDatabase} 测试数据库实例
 */
export function createTestDb() {
  return new TestDatabase();
}
