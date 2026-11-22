import { createServer } from './src/server.js';
import { HOST, PORT } from './src/config.js';

async function start() {
  try {
    const server = await createServer();
    await server.listen({ host: HOST, port: PORT });
    console.log(`TuneForge (Fastify) Server running at http://${HOST}:${PORT}`);
  } catch (err) {
    console.error('Server error:', err);
    process.exit(1);
  }
}

start();
