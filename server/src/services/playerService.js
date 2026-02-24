import db from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * 添加玩家到房间
 * @param {number} roomId - 房间ID
 * @param {string} playerName - 玩家名称
 * @param {string} userGlobalId - 用户全局唯一ID
 * @returns {object} 玩家信息
 */
export function addPlayerToRoom(roomId, playerName, userGlobalId = null) {
  const now = Date.now();

  // 检查是否已存在同一用户全局ID的玩家（允许同一用户重新加入）
  if (userGlobalId) {
    const existingPlayerByUserId = db.prepare(`
      SELECT id, room_id, name, position, is_creator, joined_at, last_active, user_global_id
      FROM players
      WHERE room_id = ? AND user_global_id = ?
    `).get(roomId, userGlobalId);

    if (existingPlayerByUserId) {
      // 同一用户重新加入，更新活跃时间
      db.prepare('UPDATE players SET last_active = ? WHERE id = ?').run(now, existingPlayerByUserId.id);

      logger.info(`玩家重新加入房间: ${playerName} (用户ID: ${userGlobalId}) -> 房间ID ${roomId}`);

      return {
        id: existingPlayerByUserId.id,
        roomId: existingPlayerByUserId.room_id,
        name: existingPlayerByUserId.name,
        position: existingPlayerByUserId.position,
        isCreator: existingPlayerByUserId.is_creator === 1,
        joinedAt: existingPlayerByUserId.joined_at,
        lastActive: now,
        userGlobalId: existingPlayerByUserId.user_global_id
      };
    }
  }

  // 检查是否已存在同名玩家（不同用户）
  const existingPlayerByName = db.prepare(`
    SELECT id, room_id, name, position, is_creator, joined_at, last_active, user_global_id
    FROM players
    WHERE room_id = ? AND name = ?
  `).get(roomId, playerName);

  if (existingPlayerByName) {
    // 如果存在同名玩家但用户ID不同，说明是不同用户尝试使用相同名称
    if (!userGlobalId || existingPlayerByName.user_global_id !== userGlobalId) {
      throw new Error('该房间内已存在同名玩家，请使用其他名称');
    }
  }

  // 检查房间是否已满
  const currentPlayers = db.prepare('SELECT COUNT(*) as count FROM players WHERE room_id = ?')
    .get(roomId);

  const room = db.prepare('SELECT max_players, allow_overflow FROM rooms WHERE id = ?').get(roomId);

  // 只有在不允许溢出时才检查人数限制
  if (!room.allow_overflow && currentPlayers.count >= room.max_players) {
    throw new Error('房间已满');
  }

  // 找到下一个可用位置
  const usedPositions = db.prepare('SELECT position FROM players WHERE room_id = ?')
    .all(roomId)
    .map(p => p.position);

  let nextPosition = 1;
  while (usedPositions.includes(nextPosition)) {
    nextPosition++;
  }

  // 插入玩家
  const insertPlayer = db.prepare(`
    INSERT INTO players (room_id, name, position, is_creator, joined_at, last_active, user_global_id)
    VALUES (?, ?, ?, 0, ?, ?, ?)
  `);

  try {
    const result = insertPlayer.run(roomId, playerName, nextPosition, now, now, userGlobalId);
    const playerId = result.lastInsertRowid;

    logger.info(`玩家加入房间: ${playerName} (用户ID: ${userGlobalId}) -> 房间ID ${roomId}`);

    return {
      id: playerId,
      roomId,
      name: playerName,
      position: nextPosition,
      isCreator: false,
      joinedAt: now,
      lastActive: now,
      userGlobalId
    };
  } catch (error) {
    logger.error('添加玩家失败:', error);
    throw error;
  }
}

/**
 * 根据ID获取玩家
 * @param {number} playerId - 玩家ID
 * @returns {object|null} 玩家信息
 */
export function getPlayerById(playerId) {
  return db.prepare(`
    SELECT id, room_id, name, position, is_creator, joined_at, last_active
    FROM players
    WHERE id = ?
  `).get(playerId);
}

/**
 * 更新玩家名称
 * @param {number} playerId - 玩家ID
 * @param {string} newName - 新名称
 * @returns {boolean} 是否成功
 */
export function updatePlayerName(playerId, newName) {
  try {
    db.prepare('UPDATE players SET name = ? WHERE id = ?').run(newName, playerId);
    logger.info(`玩家名称更新: ID ${playerId} -> ${newName}`);
    return true;
  } catch (error) {
    logger.error('更新玩家名称失败:', error);
    return false;
  }
}

/**
 * 移除玩家
 * @param {number} playerId - 玩家ID
 * @returns {boolean} 是否成功
 */
export function removePlayer(playerId) {
  try {
    const player = getPlayerById(playerId);
    if (!player) {
      return false;
    }

    // 如果是创建者，不允许删除
    if (player.is_creator) {
      throw new Error('不能移除房间创建者');
    }

    db.prepare('DELETE FROM players WHERE id = ?').run(playerId);
    logger.info(`玩家移除: ID ${playerId}`);
    return true;
  } catch (error) {
    logger.error('移除玩家失败:', error);
    throw error;
  }
}

/**
 * 获取房间的玩家数量
 * @param {number} roomId - 房间ID
 * @returns {number} 玩家数量
 */
export function getPlayerCount(roomId) {
  const result = db.prepare('SELECT COUNT(*) as count FROM players WHERE room_id = ?')
    .get(roomId);
  return result.count;
}
