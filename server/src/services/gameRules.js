/**
 * 游戏规则服务
 * 从数据库动态加载游戏类型规则
 */
import db from '../config/database.js';

/**
 * 根据ID获取游戏类型
 * @param {number} gameTypeId - 游戏类型ID
 * @returns {object|null} 游戏类型对象
 */
export function getGameTypeById(gameTypeId) {
  return db.prepare('SELECT * FROM game_types WHERE id = ?').get(gameTypeId);
}

/**
 * 根据代码获取游戏类型
 * @param {string} code - 游戏类型代码
 * @returns {object|null} 游戏类型对象
 */
export function getGameTypeByCode(code) {
  return db.prepare('SELECT * FROM game_types WHERE code = ?').get(code);
}

/**
 * 获取所有游戏类型
 * @param {boolean} includeCustom - 是否包含自定义游戏
 * @returns {Array} 游戏类型列表
 */
export function getAllGameTypes(includeCustom = true) {
  if (includeCustom) {
    return db.prepare('SELECT * FROM game_types ORDER BY is_custom ASC, id ASC').all();
  }
  return db.prepare('SELECT * FROM game_types WHERE is_custom = 0 ORDER BY id ASC').all();
}

/**
 * 验证积分（根据游戏类型规则）
 * @param {Array} scores - 积分数组 [{playerId, score}, ...]
 * @param {object} gameType - 游戏类型对象
 * @returns {object} 验证结果 {isValid, error?}
 */
export function validateScoresByGameType(scores, gameType) {
  // 1. 验证至少有2名玩家
  if (scores.length < 2) {
    return {
      isValid: false,
      error: `至少需要2名玩家，当前：${scores.length}名`
    };
  }

  // 2. 根据验证类型进行验证
  switch (gameType.validation_type) {
    case 'sum_equals': {
      const sum = scores.reduce((acc, s) => acc + parseInt(s.score), 0);
      if (sum !== gameType.validation_value) {
        return {
          isValid: false,
          error: `积分总和必须为${gameType.validation_value}，当前：${sum}`
        };
      }
      break;
    }
    case 'none':
      // 无验证，跳过
      break;
    case 'custom':
      // 预留自定义验证逻辑
      break;
    default:
      return {
        isValid: false,
        error: `未知的验证类型：${gameType.validation_type}`
      };
  }

  // 3. 验证积分范围
  for (const s of scores) {
    const score = parseInt(s.score);
    if (score < gameType.score_range_min || score > gameType.score_range_max) {
      return {
        isValid: false,
        error: `积分必须在${gameType.score_range_min}到${gameType.score_range_max}之间`
      };
    }
  }

  return { isValid: true };
}

/**
 * 验证玩家数量
 * @param {object} gameType - 游戏类型对象
 * @param {number} playerCount - 玩家数量
 * @returns {boolean} 是否有效
 */
export function validatePlayerCount(gameType, playerCount) {
  return playerCount >= gameType.min_players && playerCount <= gameType.max_players;
}

/**
 * 创建自定义游戏类型
 * @param {object} data - 游戏类型数据
 * @returns {object} 创建结果 {success, gameTypeId?, error?}
 */
export function createCustomGameType(data) {
  try {
    const {
      name,
      displayName,
      minPlayers = 2,
      maxPlayers = 10,
      validationType = 'none',
      validationValue = 0,
      scoreRangeMin = -1000,
      scoreRangeMax = 1000,
      description = '',
      icon = '🎮',
      createdBy = null
    } = data;

    // 生成唯一的code
    const code = `custom_${Date.now()}`;
    const now = Date.now();

    const result = db.prepare(`
      INSERT INTO game_types (
        code, name, display_name, is_custom, created_by,
        min_players, max_players, validation_type, validation_value,
        score_range_min, score_range_max, description, icon, created_at
      ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      code, name, displayName, createdBy,
      minPlayers, maxPlayers, validationType, validationValue,
      scoreRangeMin, scoreRangeMax, description, icon, now
    );

    return { success: true, gameTypeId: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
