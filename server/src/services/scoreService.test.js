/**
 * scoreService 单元测试
 * 测试积分验证、提交、统计更新和删除回滚功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb } from '../../tests/helpers/db-helper.js';
import {
  validateRoundScores,
  submitRoundScores,
  getRoomStats,
  getRoundHistory,
  deleteRound
} from './scoreService.js';

describe('scoreService', () => {
  let testDb;
  let room;
  let players;
  let gameType;

  beforeEach(() => {
    // 创建测试数据库
    testDb = createTestDb();

    // 创建测试场景
    const scenario = testDb.createTestScenario({ playerCount: 4 });
    room = scenario.room;
    players = scenario.players;

    // 创建十三水游戏类型
    const db = testDb.getDb();
    const result = db.prepare(`
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
      id: result.lastInsertRowid,
      code: 'shisanshui',
      name: 'shisanshui',
      display_name: '十三水',
      validation_type: 'sum_equals',
      validation_value: 0,
      score_range_min: -1000,
      score_range_max: 1000,
      min_players: 2,
      max_players: 4
    };
  });

  afterEach(() => {
    testDb.close();
  });

  describe('validateRoundScores', () => {
    it('应验证有效的积分（总和为0）', () => {
      const scores = [
        { playerId: players[0].id, score: 10 },
        { playerId: players[1].id, score: -5 },
        { playerId: players[2].id, score: -3 },
        { playerId: players[3].id, score: -2 }
      ];

      const result = validateRoundScores(scores, gameType);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应拒绝总和不为0的积分', () => {
      const scores = [
        { playerId: players[0].id, score: 10 },
        { playerId: players[1].id, score: 5 },
        { playerId: players[2].id, score: -3 },
        { playerId: players[3].id, score: -2 }
      ];

      const result = validateRoundScores(scores, gameType);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('积分总和必须为0');
    });

    it('应拒绝超出范围的积分', () => {
      const scores = [
        { playerId: players[0].id, score: 2000 },
        { playerId: players[1].id, score: -2000 }
      ];

      const result = validateRoundScores(scores, gameType);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('积分必须在');
    });

    it('应拒绝少于2名玩家的积分', () => {
      const scores = [
        { playerId: players[0].id, score: 0 }
      ];

      const result = validateRoundScores(scores, gameType);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('至少需要2名玩家');
    });
  });

  describe('submitRoundScores', () => {
    it('应成功提交有效积分', () => {
      const scoreData = [
        { playerId: players[0].id, score: 10, enteredBy: players[0].id },
        { playerId: players[1].id, score: -5, enteredBy: players[0].id },
        { playerId: players[2].id, score: -3, enteredBy: players[0].id },
        { playerId: players[3].id, score: -2, enteredBy: players[0].id }
      ];

      const result = submitRoundScores(room.id, 1, scoreData, gameType);

      expect(result.success).toBe(true);
      expect(result.roundId).toBeDefined();
      expect(result.currentRound).toBe(2);
    });

    it('应拒绝提交无效积分', () => {
      const scoreData = [
        { playerId: players[0].id, score: 10, enteredBy: players[0].id },
        { playerId: players[1].id, score: 10, enteredBy: players[0].id }
      ];

      const result = submitRoundScores(room.id, 1, scoreData, gameType);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应正确更新玩家统计（首次提交）', () => {
      const scoreData = [
        { playerId: players[0].id, score: 10, enteredBy: players[0].id },
        { playerId: players[1].id, score: -10, enteredBy: players[0].id }
      ];

      submitRoundScores(room.id, 1, scoreData, gameType);

      const stats = getRoomStats(room.id);

      // 玩家1应该有正分
      const player1Stats = stats.find(s => s.player_id === players[0].id);
      expect(player1Stats.total_score).toBe(10);
      expect(player1Stats.rounds_played).toBe(1);
      expect(player1Stats.rounds_won).toBe(1);
      expect(player1Stats.highest_round_score).toBe(10);
      expect(player1Stats.lowest_round_score).toBe(10);
      expect(player1Stats.average_score).toBe(10);

      // 玩家2应该有负分
      const player2Stats = stats.find(s => s.player_id === players[1].id);
      expect(player2Stats.total_score).toBe(-10);
      expect(player2Stats.rounds_played).toBe(1);
      expect(player2Stats.rounds_won).toBe(0);
    });

    it('应正确累积玩家统计（多次提交）', () => {
      // 第一局
      submitRoundScores(room.id, 1, [
        { playerId: players[0].id, score: 10, enteredBy: players[0].id },
        { playerId: players[1].id, score: -10, enteredBy: players[0].id }
      ], gameType);

      // 第二局
      submitRoundScores(room.id, 2, [
        { playerId: players[0].id, score: 5, enteredBy: players[0].id },
        { playerId: players[1].id, score: -5, enteredBy: players[0].id }
      ], gameType);

      const stats = getRoomStats(room.id);

      const player1Stats = stats.find(s => s.player_id === players[0].id);
      expect(player1Stats.total_score).toBe(15);
      expect(player1Stats.rounds_played).toBe(2);
      expect(player1Stats.rounds_won).toBe(2);
      expect(player1Stats.highest_round_score).toBe(10);
      expect(player1Stats.lowest_round_score).toBe(5);
      expect(player1Stats.average_score).toBe(7.5);
    });

    it('应正确处理负分和最低分', () => {
      submitRoundScores(room.id, 1, [
        { playerId: players[0].id, score: 20, enteredBy: players[0].id },
        { playerId: players[1].id, score: -20, enteredBy: players[0].id }
      ], gameType);

      submitRoundScores(room.id, 2, [
        { playerId: players[0].id, score: -10, enteredBy: players[0].id },
        { playerId: players[1].id, score: 10, enteredBy: players[0].id }
      ], gameType);

      const stats = getRoomStats(room.id);

      const player1Stats = stats.find(s => s.player_id === players[0].id);
      expect(player1Stats.total_score).toBe(10);
      expect(player1Stats.highest_round_score).toBe(20);
      expect(player1Stats.lowest_round_score).toBe(-10);
    });
  });

  describe('getRoundHistory', () => {
    it('应返回空历史（无局次）', () => {
      const history = getRoundHistory(room.id);

      expect(history).toEqual([]);
    });

    it('应返回完整的局次历史', () => {
      // 提交两局
      submitRoundScores(room.id, 1, [
        { playerId: players[0].id, score: 10, enteredBy: players[0].id },
        { playerId: players[1].id, score: -10, enteredBy: players[0].id }
      ], gameType);

      submitRoundScores(room.id, 2, [
        { playerId: players[0].id, score: 5, enteredBy: players[0].id },
        { playerId: players[1].id, score: -5, enteredBy: players[0].id }
      ], gameType);

      const history = getRoundHistory(room.id);

      expect(history).toHaveLength(2);
      expect(history[0].round_number).toBe(1);
      expect(history[0].scores).toHaveLength(2);
      expect(history[1].round_number).toBe(2);
      expect(history[1].scores).toHaveLength(2);
    });
  });

  describe('deleteRound', () => {
    it('应成功删除局次并回滚统计', () => {
      // 提交一局
      const submitResult = submitRoundScores(room.id, 1, [
        { playerId: players[0].id, score: 10, enteredBy: players[0].id },
        { playerId: players[1].id, score: -10, enteredBy: players[0].id }
      ], gameType);

      // 删除局次
      const deleteResult = deleteRound(room.id, submitResult.roundId);

      expect(deleteResult.success).toBe(true);

      // 验证统计已回滚
      const stats = getRoomStats(room.id);
      const player1Stats = stats.find(s => s.player_id === players[0].id);
      expect(player1Stats.total_score).toBeNull();
      expect(player1Stats.rounds_played).toBeNull();
    });

    it('应正确回滚多局中的一局', () => {
      // 提交三局
      submitRoundScores(room.id, 1, [
        { playerId: players[0].id, score: 10, enteredBy: players[0].id },
        { playerId: players[1].id, score: -10, enteredBy: players[0].id }
      ], gameType);

      const round2 = submitRoundScores(room.id, 2, [
        { playerId: players[0].id, score: 20, enteredBy: players[0].id },
        { playerId: players[1].id, score: -20, enteredBy: players[0].id }
      ], gameType);

      submitRoundScores(room.id, 3, [
        { playerId: players[0].id, score: 5, enteredBy: players[0].id },
        { playerId: players[1].id, score: -5, enteredBy: players[0].id }
      ], gameType);

      // 删除第二局
      deleteRound(room.id, round2.roundId);

      // 验证统计
      const stats = getRoomStats(room.id);
      const player1Stats = stats.find(s => s.player_id === players[0].id);

      expect(player1Stats.total_score).toBe(15); // 10 + 5
      expect(player1Stats.rounds_played).toBe(2);
      expect(player1Stats.highest_round_score).toBe(10);
      expect(player1Stats.lowest_round_score).toBe(5);
    });

    it('应拒绝删除不存在的局次', () => {
      const result = deleteRound(room.id, 99999);

      expect(result.success).toBe(false);
      expect(result.error).toContain('未找到该局的积分记录');
    });
  });
});
