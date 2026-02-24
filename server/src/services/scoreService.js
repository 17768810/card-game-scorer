import db from '../config/database.js';
import { validateScoresByGameType } from './gameRules.js';
import { incrementRoundCounter } from './roomService.js';
import logger from '../utils/logger.js';

/**
 * 验证本局积分
 * @param {Array} scores - 积分数组 [{playerId, score}, ...]
 * @param {object} gameType - 游戏类型对象
 * @returns {object} 验证结果 {isValid, error?}
 */
export function validateRoundScores(scores, gameType) {
  return validateScoresByGameType(scores, gameType);
}

/**
 * 提交本局积分（使用事务）
 * @param {number} roomId - 房间ID
 * @param {number} roundNumber - 局次号
 * @param {Array} scoreData - 积分数据 [{playerId, score, enteredBy}, ...]
 * @param {object} gameType - 游戏类型对象
 * @returns {object} 结果 {success, roundId?, currentRound?, error?}
 */
export function submitRoundScores(roomId, roundNumber, scoreData, gameType) {
  // 验证积分
  const validation = validateRoundScores(scoreData, gameType);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  const insertScores = db.transaction((roomId, roundNumber, scoreData) => {
    try {
      const now = Date.now();

      // 1. 创建或获取局次
      let round = db.prepare('SELECT id FROM rounds WHERE room_id = ? AND round_number = ?')
        .get(roomId, roundNumber);

      if (!round) {
        const insertRound = db.prepare(
          'INSERT INTO rounds (room_id, round_number, created_at) VALUES (?, ?, ?)'
        );
        const result = insertRound.run(roomId, roundNumber, now);
        round = { id: result.lastInsertRowid };
      }

      // 2. 插入所有积分
      const insertScore = db.prepare(
        'INSERT OR REPLACE INTO scores (round_id, player_id, score, entered_by, entered_at) VALUES (?, ?, ?, ?, ?)'
      );

      for (const { playerId, score, enteredBy } of scoreData) {
        insertScore.run(round.id, playerId, parseInt(score), enteredBy || null, now);
      }

      // 3. 标记局次完成
      db.prepare('UPDATE rounds SET completed_at = ? WHERE id = ?').run(now, round.id);

      // 4. 更新玩家统计
      updatePlayerStats(roomId, scoreData);

      // 5. 增加房间局数计数器
      const currentRound = incrementRoundCounter(roomId);

      return { success: true, roundId: round.id, currentRound };
    } catch (error) {
      logger.error('提交积分失败:', error);
      throw error;
    }
  });

  try {
    return insertScores(roomId, roundNumber, scoreData);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 更新玩家统计
 * @param {number} roomId - 房间ID
 * @param {Array} scoreData - 积分数据
 */
function updatePlayerStats(roomId, scoreData) {
  const now = Date.now();

  for (const { playerId, score } of scoreData) {
    const scoreInt = parseInt(score);

    // 获取当前统计
    let stats = db.prepare(
      'SELECT * FROM player_stats WHERE player_id = ? AND room_id = ?'
    ).get(playerId, roomId);

    if (!stats) {
      // 创建新统计
      db.prepare(`
        INSERT INTO player_stats (
          player_id, room_id, total_score, rounds_played, rounds_won,
          highest_round_score, lowest_round_score, average_score, last_updated
        ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)
      `).run(
        playerId, roomId, scoreInt,
        scoreInt > 0 ? 1 : 0,
        scoreInt, scoreInt, scoreInt, now
      );
    } else {
      // 更新统计
      const newTotalScore = stats.total_score + scoreInt;
      const newRoundsPlayed = stats.rounds_played + 1;
      const newRoundsWon = stats.rounds_won + (scoreInt > 0 ? 1 : 0);
      const newHighest = Math.max(stats.highest_round_score, scoreInt);
      const newLowest = Math.min(stats.lowest_round_score, scoreInt);
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
        newHighest, newLowest, newAverage, now,
        playerId, roomId
      );
    }
  }
}

/**
 * 获取房间统计信息
 * @param {number} roomId - 房间ID
 * @returns {object} 统计信息
 */
export function getRoomStats(roomId) {
  const stats = db.prepare(`
    SELECT
      p.id as player_id,
      p.name as player_name,
      ps.total_score,
      ps.rounds_played,
      ps.rounds_won,
      ps.highest_round_score,
      ps.lowest_round_score,
      ps.average_score
    FROM players p
    LEFT JOIN player_stats ps ON p.id = ps.player_id AND ps.room_id = ?
    WHERE p.room_id = ?
    ORDER BY ps.total_score DESC
  `).all(roomId, roomId);

  return stats;
}

/**
 * 获取所有局次历史
 * @param {number} roomId - 房间ID
 * @returns {Array} 局次历史
 */
export function getRoundHistory(roomId) {
  const rounds = db.prepare(`
    SELECT
      r.id,
      r.round_number,
      r.created_at,
      r.completed_at
    FROM rounds r
    WHERE r.room_id = ?
    ORDER BY r.round_number ASC
  `).all(roomId);

  // 获取每局的积分
  for (const round of rounds) {
    round.scores = db.prepare(`
      SELECT
        s.player_id,
        p.name as player_name,
        s.score
      FROM scores s
      JOIN players p ON s.player_id = p.id
      WHERE s.round_id = ?
      ORDER BY p.position ASC
    `).all(round.id);
  }

  return rounds;
}

/**
 * 删除指定局次及其积分（回滚统计）
 * @param {number} roomId - 房间ID
 * @param {number} roundId - 局次ID
 * @returns {object} 结果 {success, error?}
 */
export function deleteRound(roomId, roundId) {
  const deleteRoundTransaction = db.transaction((roomId, roundId) => {
    try {
      // 1. 获取该局的所有积分
      const scores = db.prepare(`
        SELECT player_id, score
        FROM scores
        WHERE round_id = ?
      `).all(roundId);

      if (scores.length === 0) {
        throw new Error('未找到该局的积分记录');
      }

      // 2. 回滚玩家统计
      for (const { player_id, score } of scores) {
        const scoreInt = parseInt(score);

        // 获取当前统计
        const stats = db.prepare(`
          SELECT * FROM player_stats
          WHERE player_id = ? AND room_id = ?
        `).get(player_id, roomId);

        if (stats) {
          // 计算回滚后的值
          const newTotalScore = stats.total_score - scoreInt;
          const newRoundsPlayed = stats.rounds_played - 1;
          const newRoundsWon = stats.rounds_won - (scoreInt > 0 ? 1 : 0);

          if (newRoundsPlayed === 0) {
            // 如果没有局次了，删除统计记录
            db.prepare(`
              DELETE FROM player_stats
              WHERE player_id = ? AND room_id = ?
            `).run(player_id, roomId);
          } else {
            // 重新计算最高分、最低分和平均分
            const allScores = db.prepare(`
              SELECT s.score
              FROM scores s
              JOIN rounds r ON s.round_id = r.id
              WHERE s.player_id = ? AND r.room_id = ? AND r.id != ?
            `).all(player_id, roomId, roundId);

            const scoreValues = allScores.map(s => s.score);
            const newHighest = Math.max(...scoreValues);
            const newLowest = Math.min(...scoreValues);
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
              player_id, roomId
            );
          }
        }
      }

      // 3. 删除积分记录
      db.prepare('DELETE FROM scores WHERE round_id = ?').run(roundId);

      // 4. 删除局次记录
      db.prepare('DELETE FROM rounds WHERE id = ?').run(roundId);

      // 5. 减少房间局数计数器
      db.prepare(`
        UPDATE rooms
        SET current_round = current_round - 1
        WHERE id = ?
      `).run(roomId);

      return { success: true };
    } catch (error) {
      logger.error('删除局次失败:', error);
      throw error;
    }
  });

  try {
    return deleteRoundTransaction(roomId, roundId);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

