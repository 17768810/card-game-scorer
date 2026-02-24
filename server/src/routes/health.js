export default async function healthRoutes(fastify, options) {
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime()
    };
  });
}
