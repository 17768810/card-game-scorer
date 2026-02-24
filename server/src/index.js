import Fastify from 'fastify';
import cors from '@fastify/cors';
import { setupSocketIO } from './config/socket.js';
import healthRoutes from './routes/health.js';
import roomRoutes from './routes/rooms.js';
import gameTypesRoutes from './routes/gameTypes.js';
import logger from './utils/logger.js';
import 'dotenv/config';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// 创建Fastify实例
const fastify = Fastify({
  logger: process.env.NODE_ENV === 'development' ? {
    transport: {
      target: 'pino-pretty'
    }
  } : true
});

// 注册CORS
await fastify.register(cors, {
  origin: process.env.CLIENT_URL || '*'
});

// 注册路由
await fastify.register(healthRoutes, { prefix: '/api' });
await fastify.register(roomRoutes, { prefix: '/api' });
await fastify.register(gameTypesRoutes);

// 启动服务器
try {
  await fastify.listen({ port: PORT, host: HOST });

  // 设置Socket.IO
  const io = setupSocketIO(fastify.server);

  logger.info(`服务器启动成功`);
  logger.info(`HTTP服务: http://${HOST}:${PORT}`);
  logger.info(`WebSocket服务已启动`);

  // 优雅关闭
  const signals = ['SIGINT', 'SIGTERM'];
  signals.forEach(signal => {
    process.on(signal, async () => {
      logger.info(`收到 ${signal} 信号，正在关闭服务器...`);
      await fastify.close();
      process.exit(0);
    });
  });
} catch (err) {
  logger.error('服务器启动失败:', err);
  process.exit(1);
}
