import { SOCKET_EVENTS } from '../utils/constants.js';
import * as roomService from '../services/roomService.js';
import * as playerService from '../services/playerService.js';
import * as scoreService from '../services/scoreService.js';
import logger from '../utils/logger.js';

export function setupScoreHandlers(io, socket) {
  // 实时输入同步
  socket.on('score-input-change', (data) => {
    const { roomCode, roundNumber, playerId, score, enteredBy } = data;

    // 广播给房间内其他玩家
    socket.to(`room:${roomCode}`).emit('score-input-updated', {
      roomCode,
      roundNumber,
      playerId,
      score,
      enteredBy
    });
  });

  // 提交本局积分
  socket.on(SOCKET_EVENTS.SUBMIT_ROUND_SCORES, async (data) => {
    try {
      const { roomCode, roundNumber, scores, enteredBy } = data;

      // 验证房间
      const room = roomService.getRoomByCode(roomCode);
      if (!room) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: '房间不存在' });
        return;
      }

      // 准备积分数据
      const scoreData = scores.map(s => ({
        playerId: s.playerId,
        score: s.score,
        enteredBy
      }));

      // 提交积分
      const result = scoreService.submitRoundScores(
        room.id,
        roundNumber,
        scoreData,
        {
          // 转换为snake_case格式以匹配验证函数
          validation_type: room.gameTypeInfo.validationType,
          validation_value: room.gameTypeInfo.validationValue,
          score_range_min: room.gameTypeInfo.scoreRangeMin,
          score_range_max: room.gameTypeInfo.scoreRangeMax,
          min_players: room.gameTypeInfo.minPlayers || 2,
          max_players: room.gameTypeInfo.maxPlayers || 10
        }
      );

      if (!result.success) {
        // 验证失败，通知提交者
        socket.emit(SOCKET_EVENTS.SCORE_VALIDATION_ERROR, {
          error: result.error || '积分验证失败，请检查输入'
        });
        logger.warn(`积分验证失败: 房间 ${roomCode}, 错误: ${result.error}`);
        return;
      }

      // 获取更新后的统计信息
      const stats = scoreService.getRoomStats(room.id);
      const rounds = scoreService.getRoundHistory(room.id);
      const players = roomService.getRoomPlayers(room.id);

      // 通知房间内所有人
      io.to(`room:${roomCode}`).emit(SOCKET_EVENTS.SCORES_SUBMITTED, {
        roundNumber,
        roundId: result.roundId,
        currentRound: result.currentRound,  // 新增：当前局数
        scores: scoreData
      });

      io.to(`room:${roomCode}`).emit(SOCKET_EVENTS.STATS_UPDATED, {
        stats,
        rounds,
        players
      });

      logger.info(`积分提交成功: 房间 ${roomCode}, 第 ${roundNumber} 局`);
    } catch (error) {
      logger.error('提交积分失败:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  });

  // 删除局次
  socket.on('delete-round', async (data) => {
    try {
      const { roomCode, roundId, roundNumber } = data;
      const deleterPlayerId = socket.data.playerId;

      // 验证房间
      const room = roomService.getRoomByCode(roomCode);
      if (!room) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: '房间不存在' });
        return;
      }

      // 验证删除者是房主
      const deleter = playerService.getPlayerById(deleterPlayerId);
      if (!deleter || !deleter.is_creator) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: '只有房主可以删除积分记录' });
        return;
      }

      // 删除局次
      const result = scoreService.deleteRound(room.id, roundId);

      if (!result.success) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: result.error || '删除失败' });
        logger.warn(`删除局次失败: 房间 ${roomCode}, 局次 ${roundNumber}, 错误: ${result.error}`);
        return;
      }

      // 获取更新后的统计信息
      const stats = scoreService.getRoomStats(room.id);
      const rounds = scoreService.getRoundHistory(room.id);
      const players = roomService.getRoomPlayers(room.id);

      // 通知房间内所有人
      io.to(`room:${roomCode}`).emit('round-deleted', {
        roundId,
        roundNumber,
        rounds  // 添加rounds数据
      });

      io.to(`room:${roomCode}`).emit(SOCKET_EVENTS.STATS_UPDATED, {
        stats,
        rounds,
        players
      });

      logger.info(`删除局次成功: 房间 ${roomCode}, 第 ${roundNumber} 局`);
    } catch (error) {
      logger.error('删除局次失败:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  });
}
