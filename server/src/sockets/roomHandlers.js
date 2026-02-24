import { SOCKET_EVENTS } from '../utils/constants.js';
import * as roomService from '../services/roomService.js';
import * as playerService from '../services/playerService.js';
import logger from '../utils/logger.js';

export function setupRoomHandlers(io, socket) {
  // 加入房间
  socket.on(SOCKET_EVENTS.JOIN_ROOM, async (data) => {
    try {
      const { roomCode, playerId, password } = data;

      // 验证房间存在
      const room = roomService.getRoomByCode(roomCode);
      if (!room) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: '房间不存在' });
        return;
      }

      // 验证密码
      if (room.is_password_protected) {
        const isPasswordValid = await roomService.verifyRoomPassword(roomCode, password);
        if (!isPasswordValid) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: '密码错误' });
          return;
        }
      }

      // 验证玩家存在
      const player = playerService.getPlayerById(playerId);
      if (!player || player.room_id !== room.id) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: '玩家不存在' });
        return;
      }

      // 加入Socket.io房间
      socket.join(`room:${roomCode}`);
      socket.data.roomCode = roomCode;
      socket.data.playerId = playerId;

      // 更新玩家活跃时间
      roomService.updatePlayerActivity(playerId);

      // 通知房间内所有人
      const players = roomService.getRoomPlayers(room.id);
      io.to(`room:${roomCode}`).emit(SOCKET_EVENTS.PLAYER_JOINED, {
        player,
        players,
        room: { status: room.status }
      });

      logger.info(`玩家 ${playerId} 加入房间 ${roomCode}`);
    } catch (error) {
      logger.error('加入房间失败:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  });

  // 离开房间
  socket.on(SOCKET_EVENTS.LEAVE_ROOM, async () => {
    try {
      const { roomCode, playerId } = socket.data;

      if (roomCode) {
        socket.leave(`room:${roomCode}`);

        // 通知房间内其他人
        const room = roomService.getRoomByCode(roomCode);
        if (room) {
          const players = roomService.getRoomPlayers(room.id);
          io.to(`room:${roomCode}`).emit(SOCKET_EVENTS.PLAYER_LEFT, {
            playerId,
            players,
            room: { status: room.status }
          });
        }

        logger.info(`玩家 ${playerId} 离开房间 ${roomCode}`);
      }
    } catch (error) {
      logger.error('离开房间失败:', error);
    }
  });

  // 开始游戏
  socket.on(SOCKET_EVENTS.START_GAME, async (data) => {
    try {
      const { roomCode } = data;
      const room = roomService.getRoomByCode(roomCode);

      if (!room) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: '房间不存在' });
        return;
      }

      // 检查玩家数量（至少需要2名玩家）
      const playerCount = playerService.getPlayerCount(room.id);
      if (playerCount < 2) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: '至少需要2名玩家才能开始游戏'
        });
        return;
      }

      // 开始游戏
      roomService.startGame(room.id);

      // 通知所有玩家
      io.to(`room:${roomCode}`).emit(SOCKET_EVENTS.GAME_STARTED, {
        roomId: room.id,
        startedAt: Date.now()
      });

      logger.info(`游戏开始: 房间 ${roomCode}`);
    } catch (error) {
      logger.error('开始游戏失败:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  });

  // 更新玩家名称
  socket.on(SOCKET_EVENTS.UPDATE_PLAYER_NAME, async (data) => {
    try {
      const { playerId, name } = data;
      const { roomCode } = socket.data;

      playerService.updatePlayerName(playerId, name);

      // 通知房间内所有人
      const room = roomService.getRoomByCode(roomCode);
      if (room) {
        const players = roomService.getRoomPlayers(room.id);
        io.to(`room:${roomCode}`).emit(SOCKET_EVENTS.ROOM_UPDATED, {
          players
        });
      }

      logger.info(`玩家名称更新: ${playerId} -> ${name}`);
    } catch (error) {
      logger.error('更新玩家名称失败:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  });

  // 踢出玩家
  socket.on('kick-player', async (data) => {
    try {
      const { roomCode, playerId } = data;
      const kickerPlayerId = socket.data.playerId;

      // 验证房间存在
      const room = roomService.getRoomByCode(roomCode);
      if (!room) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: '房间不存在' });
        return;
      }

      // 验证踢人者是房主
      const kicker = playerService.getPlayerById(kickerPlayerId);
      if (!kicker || !kicker.is_creator) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: '只有房主可以踢出玩家' });
        return;
      }

      // 验证被踢玩家存在
      const kickedPlayer = playerService.getPlayerById(playerId);
      if (!kickedPlayer || kickedPlayer.room_id !== room.id) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: '玩家不存在' });
        return;
      }

      // 不能踢出房主自己
      if (kickedPlayer.is_creator) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: '不能踢出房主' });
        return;
      }

      // 删除玩家
      playerService.removePlayer(playerId);

      // 通知被踢玩家
      io.to(`room:${roomCode}`).emit('player-kicked', {
        playerId,
        playerName: kickedPlayer.name
      });

      // 更新玩家列表
      const players = roomService.getRoomPlayers(room.id);
      io.to(`room:${roomCode}`).emit(SOCKET_EVENTS.PLAYER_LEFT, {
        playerId,
        players,
        room: { status: room.status }
      });

      logger.info(`玩家 ${playerId} 被踢出房间 ${roomCode}`);
    } catch (error) {
      logger.error('踢出玩家失败:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  });

  // 断开连接
  socket.on('disconnect', () => {
    const { roomCode, playerId } = socket.data;
    if (roomCode && playerId) {
      logger.info(`玩家 ${playerId} 断开连接，房间 ${roomCode}`);
    }
  });
}
