import db from '../config/database.js';
import { generateRoomCode } from '../utils/roomCodeGenerator.js';
import { ROOM_STATUS, DEFAULT_MAX_PLAYERS } from '../utils/constants.js';
import { getGameTypeById } from './gameRules.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * 创建房间
 * @param {number} gameTypeId - 游戏类型ID
 * @param {string} creatorName - 创建者名称
 * @param {string} customGameName - 自定义游戏名称（可选）
 * @param {object} settings - 房间设置
 * @param {string} password - 房间密码（可选）
 * @param {number} customMaxPlayers - 自定义最大玩家数（可选）
 * @param {boolean} allowOverflow - 是否允许超出最大玩家数（可选）
 * @param {string} userGlobalId - 用户全局唯一ID（可选）
 * @returns {object} 房间信息
 */
export async function createRoom(gameTypeId = 1, creatorName = '玩家1', customGameName = null, settings = {}, password = null, customMaxPlayers = null, allowOverflow = false, userGlobalId = null) {
  // 获取游戏类型信息
  const gameType = getGameTypeById(gameTypeId);
  if (!gameType) {
    throw new Error('游戏类型不存在');
  }

  // 处理密码哈希
  let passwordHash = null;
  let isPasswordProtected = false;
  if (password) {
    passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    isPasswordProtected = true;
  }

  // 确定最大玩家数
  const maxPlayers = customMaxPlayers || gameType.max_players;

  const code = generateRoomCode();
  const now = Date.now();

  const createRoomTransaction = db.transaction(() => {
    // 创建房间
    const insertRoom = db.prepare(`
      INSERT INTO rooms (
        code, game_type, game_type_id, custom_game_name, status, max_players,
        current_round, created_at, settings, password_hash, is_password_protected,
        allow_overflow, custom_max_players
      )
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertRoom.run(
      code,
      gameType.code,  // 保留旧字段以兼容
      gameTypeId,
      customGameName,
      ROOM_STATUS.WAITING,
      maxPlayers,
      now,
      JSON.stringify(settings),
      passwordHash,
      isPasswordProtected ? 1 : 0,
      allowOverflow ? 1 : 0,
      customMaxPlayers
    );

    const roomId = result.lastInsertRowid;

    // 创建者自动加入房间
    const insertPlayer = db.prepare(`
      INSERT INTO players (room_id, name, position, is_creator, joined_at, last_active, user_global_id)
      VALUES (?, ?, ?, 1, ?, ?, ?)
    `);

    const playerResult = insertPlayer.run(roomId, creatorName, 1, now, now, userGlobalId);
    const creatorId = playerResult.lastInsertRowid;

    // 更新房间的创建者ID
    db.prepare('UPDATE rooms SET creator_id = ? WHERE id = ?').run(creatorId, roomId);

    return {
      id: roomId,
      code,
      gameType: gameType.code,
      gameTypeId,
      gameTypeName: customGameName || gameType.display_name,
      status: ROOM_STATUS.WAITING,
      maxPlayers,
      currentRound: 0,
      createdAt: now,
      creatorId,
      settings,
      isPasswordProtected,
      allowOverflow,
      customMaxPlayers
    };
  });

  try {
    const room = createRoomTransaction();
    logger.info(`房间创建成功: ${code} (${room.gameTypeName}) - 创建者用户ID: ${userGlobalId}`);
    return room;
  } catch (error) {
    logger.error('创建房间失败:', error);
    throw error;
  }
}

/**
 * 根据房间码获取房间信息
 * @param {string} code - 房间码
 * @returns {object|null} 房间信息
 */
export function getRoomByCode(code) {
  const room = db.prepare(`
    SELECT
      r.id, r.code, r.game_type, r.game_type_id, r.custom_game_name,
      r.creator_id, r.status, r.max_players, r.current_round,
      r.created_at, r.started_at, r.finished_at, r.settings,
      r.password_hash, r.is_password_protected, r.allow_overflow, r.custom_max_players,
      gt.name as game_type_name, gt.display_name as game_type_display_name,
      gt.icon as game_type_icon, gt.validation_type, gt.validation_value,
      gt.score_range_min, gt.score_range_max
    FROM rooms r
    LEFT JOIN game_types gt ON r.game_type_id = gt.id
    WHERE r.code = ?
  `).get(code);

  if (!room) {
    return null;
  }

  // 解析settings
  if (room.settings) {
    room.settings = JSON.parse(room.settings);
  }

  // 组装游戏类型信息
  room.gameTypeInfo = {
    id: room.game_type_id,
    name: room.game_type_name,
    displayName: room.custom_game_name || room.game_type_display_name,
    icon: room.game_type_icon,
    validationType: room.validation_type,
    validationValue: room.validation_value,
    scoreRangeMin: room.score_range_min,
    scoreRangeMax: room.score_range_max
  };

  return room;
}

/**
 * 验证房间密码
 * @param {string} code - 房间码
 * @param {string} password - 密码
 * @returns {Promise<boolean>} 是否验证成功
 */
export async function verifyRoomPassword(code, password) {
  const room = getRoomByCode(code);
  if (!room) {
    throw new Error('房间不存在');
  }

  if (!room.is_password_protected) {
    return true; // 无密码保护，直接通过
  }

  if (!password) {
    return false; // 需要密码但未提供
  }

  return await bcrypt.compare(password, room.password_hash);
}

/**
 * 获取房间的所有玩家
 * @param {number} roomId - 房间ID
 * @returns {Array} 玩家列表
 */
export function getRoomPlayers(roomId) {
  return db.prepare(`
    SELECT id, room_id, name, position, is_creator, joined_at, last_active
    FROM players
    WHERE room_id = ?
    ORDER BY position ASC
  `).all(roomId);
}

/**
 * 开始游戏
 * @param {number} roomId - 房间ID
 * @returns {boolean} 是否成功
 */
export function startGame(roomId) {
  const now = Date.now();

  try {
    db.prepare(`
      UPDATE rooms
      SET status = ?, started_at = ?
      WHERE id = ? AND status = ?
    `).run(ROOM_STATUS.ACTIVE, now, roomId, ROOM_STATUS.WAITING);

    logger.info(`游戏开始: 房间ID ${roomId}`);
    return true;
  } catch (error) {
    logger.error('开始游戏失败:', error);
    return false;
  }
}

/**
 * 结束游戏
 * @param {number} roomId - 房间ID
 * @returns {boolean} 是否成功
 */
export function finishGame(roomId) {
  const now = Date.now();

  try {
    db.prepare(`
      UPDATE rooms
      SET status = ?, finished_at = ?
      WHERE id = ?
    `).run(ROOM_STATUS.FINISHED, now, roomId);

    logger.info(`游戏结束: 房间ID ${roomId}`);
    return true;
  } catch (error) {
    logger.error('结束游戏失败:', error);
    return false;
  }
}

/**
 * 更新玩家活跃时间
 * @param {number} playerId - 玩家ID
 */
export function updatePlayerActivity(playerId) {
  const now = Date.now();
  db.prepare('UPDATE players SET last_active = ? WHERE id = ?').run(now, playerId);
}

/**
 * 获取房间的下一个局次号
 * @param {number} roomId - 房间ID
 * @returns {number} 下一个局次号
 */
export function getNextRoundNumber(roomId) {
  const result = db.prepare(`
    SELECT MAX(round_number) as max_round
    FROM rounds
    WHERE room_id = ?
  `).get(roomId);

  return (result.max_round || 0) + 1;
}

/**
 * 增加房间局数计数器
 * @param {number} roomId - 房间ID
 * @returns {number} 新的局数
 */
export function incrementRoundCounter(roomId) {
  const result = db.prepare(`
    UPDATE rooms
    SET current_round = current_round + 1
    WHERE id = ?
  `).run(roomId);

  const room = db.prepare('SELECT current_round FROM rooms WHERE id = ?').get(roomId);
  return room.current_round;
}
