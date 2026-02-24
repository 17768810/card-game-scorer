import { Server } from 'socket.io';
import { setupRoomHandlers } from '../sockets/roomHandlers.js';
import { setupScoreHandlers } from '../sockets/scoreHandlers.js';
import logger from '../utils/logger.js';

export function setupSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    logger.info(`客户端连接: ${socket.id}`);

    // 设置各种事件处理器
    setupRoomHandlers(io, socket);
    setupScoreHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      logger.info(`客户端断开: ${socket.id}, 原因: ${reason}`);
    });
  });

  return io;
}
