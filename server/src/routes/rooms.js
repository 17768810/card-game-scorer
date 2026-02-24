import * as roomService from '../services/roomService.js';
import * as playerService from '../services/playerService.js';
import * as scoreService from '../services/scoreService.js';

export default async function roomRoutes(fastify, options) {
  // 创建房间
  fastify.post('/rooms', async (request, reply) => {
    try {
      const { gameTypeId, creatorName, customGameName, settings, password, customMaxPlayers, allowOverflow, userGlobalId } = request.body;

      // 验证必填字段
      if (!gameTypeId || !creatorName) {
        reply.code(400);
        return {
          success: false,
          error: '游戏类型ID和创建者名称为必填项'
        };
      }

      const room = await roomService.createRoom(
        gameTypeId,
        creatorName,
        customGameName,
        settings,
        password,
        customMaxPlayers,
        allowOverflow,
        userGlobalId
      );

      return {
        success: true,
        data: room
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // 验证房间密码
  fastify.post('/rooms/:code/verify-password', async (request, reply) => {
    try {
      const { code } = request.params;
      const { password } = request.body;

      const isValid = await roomService.verifyRoomPassword(code, password);

      return {
        success: true,
        data: { isValid }
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // 获取房间信息
  fastify.get('/rooms/:code', async (request, reply) => {
    try {
      const { code } = request.params;
      const room = roomService.getRoomByCode(code);

      if (!room) {
        reply.code(404);
        return {
          success: false,
          error: '房间不存在'
        };
      }

      return {
        success: true,
        data: room
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // 获取房间玩家列表
  fastify.get('/rooms/:code/players', async (request, reply) => {
    try {
      const { code } = request.params;
      const room = roomService.getRoomByCode(code);

      if (!room) {
        reply.code(404);
        return {
          success: false,
          error: '房间不存在'
        };
      }

      const players = roomService.getRoomPlayers(room.id);

      return {
        success: true,
        data: players
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // 加入房间
  fastify.post('/rooms/:code/players', async (request, reply) => {
    try {
      const { code } = request.params;
      const { playerName, userGlobalId } = request.body;

      const room = roomService.getRoomByCode(code);

      if (!room) {
        reply.code(404);
        return {
          success: false,
          error: '房间不存在'
        };
      }

      const player = playerService.addPlayerToRoom(room.id, playerName, userGlobalId);

      return {
        success: true,
        data: player
      };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // 更新玩家名称
  fastify.patch('/rooms/:code/players/:playerId', async (request, reply) => {
    try {
      const { playerId } = request.params;
      const { name } = request.body;

      const success = playerService.updatePlayerName(parseInt(playerId), name);

      if (!success) {
        reply.code(400);
        return {
          success: false,
          error: '更新失败'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // 移除玩家
  fastify.delete('/rooms/:code/players/:playerId', async (request, reply) => {
    try {
      const { playerId } = request.params;

      const success = playerService.removePlayer(parseInt(playerId));

      if (!success) {
        reply.code(400);
        return {
          success: false,
          error: '移除失败'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // 获取所有局次
  fastify.get('/rooms/:code/rounds', async (request, reply) => {
    try {
      const { code } = request.params;
      const room = roomService.getRoomByCode(code);

      if (!room) {
        reply.code(404);
        return {
          success: false,
          error: '房间不存在'
        };
      }

      const rounds = scoreService.getRoundHistory(room.id);

      return {
        success: true,
        data: rounds
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // 获取统计信息
  fastify.get('/rooms/:code/stats', async (request, reply) => {
    try {
      const { code } = request.params;
      const room = roomService.getRoomByCode(code);

      if (!room) {
        reply.code(404);
        return {
          success: false,
          error: '房间不存在'
        };
      }

      const stats = scoreService.getRoomStats(room.id);

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // 创建新局
  fastify.post('/rooms/:code/rounds', async (request, reply) => {
    try {
      const { code } = request.params;
      const room = roomService.getRoomByCode(code);

      if (!room) {
        reply.code(404);
        return {
          success: false,
          error: '房间不存在'
        };
      }

      const nextRoundNumber = roomService.getNextRoundNumber(room.id);

      return {
        success: true,
        data: {
          roundNumber: nextRoundNumber
        }
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error.message
      };
    }
  });
}
