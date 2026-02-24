/**
 * 游戏类型API路由
 */
import {
  getAllGameTypes,
  getGameTypeById,
  createCustomGameType
} from '../services/gameRules.js';
import logger from '../utils/logger.js';

export default async function gameTypesRoutes(fastify) {
  /**
   * 获取所有游戏类型
   * GET /api/game-types
   */
  fastify.get('/api/game-types', async (request, reply) => {
    try {
      const { includeCustom = 'true' } = request.query;
      const gameTypes = getAllGameTypes(includeCustom === 'true');

      return {
        success: true,
        data: gameTypes
      };
    } catch (error) {
      logger.error('获取游戏类型失败:', error);
      return reply.code(500).send({
        success: false,
        error: '获取游戏类型失败'
      });
    }
  });

  /**
   * 获取单个游戏类型
   * GET /api/game-types/:id
   */
  fastify.get('/api/game-types/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const gameType = getGameTypeById(parseInt(id));

      if (!gameType) {
        return reply.code(404).send({
          success: false,
          error: '游戏类型不存在'
        });
      }

      return {
        success: true,
        data: gameType
      };
    } catch (error) {
      logger.error('获取游戏类型失败:', error);
      return reply.code(500).send({
        success: false,
        error: '获取游戏类型失败'
      });
    }
  });

  /**
   * 创建自定义游戏类型
   * POST /api/game-types
   */
  fastify.post('/api/game-types', async (request, reply) => {
    try {
      const {
        name,
        displayName,
        minPlayers,
        maxPlayers,
        validationType,
        validationValue,
        scoreRangeMin,
        scoreRangeMax,
        description,
        icon,
        createdBy
      } = request.body;

      // 验证必填字段
      if (!name || !displayName) {
        return reply.code(400).send({
          success: false,
          error: '游戏名称和显示名称为必填项'
        });
      }

      // 验证玩家数量
      if (minPlayers && maxPlayers && minPlayers > maxPlayers) {
        return reply.code(400).send({
          success: false,
          error: '最小玩家数不能大于最大玩家数'
        });
      }

      const result = createCustomGameType({
        name,
        displayName,
        minPlayers,
        maxPlayers,
        validationType,
        validationValue,
        scoreRangeMin,
        scoreRangeMax,
        description,
        icon,
        createdBy
      });

      if (!result.success) {
        return reply.code(400).send(result);
      }

      // 获取创建的游戏类型
      const gameType = getGameTypeById(result.gameTypeId);

      return reply.code(201).send({
        success: true,
        data: gameType
      });
    } catch (error) {
      logger.error('创建游戏类型失败:', error);
      return reply.code(500).send({
        success: false,
        error: '创建游戏类型失败'
      });
    }
  });
}
