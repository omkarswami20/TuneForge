import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { DOWNLOADS_DIR, FFMPEG_PATH, YTDLP_PATH, HOST, PORT } from './config.js';
import { manager } from './downloader.js';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIST = path.resolve(__dirname, '..', '..', 'frontend', 'dist');

export async function createServer() {
  const app = Fastify({
    logger: false
  });

  // CORS
  await app.register(cors, {
    origin: true
  });

  // WebSockets
  await app.register(websocket);

  // WebSocket Route
  app.get('/ws', { websocket: true }, (connection) => {
    const ws = connection?.socket ?? connection;
    if (!ws) return;

    manager.registerListener(ws);

    try {
      ws.send(JSON.stringify(manager.getState()));
    } catch {}

    ws.on('message', (message) => {
      const text = message?.toString?.() ?? '';
      if (text === 'ping') {
        try { ws.send('pong'); } catch {}
      }
    });

    ws.on('close', () => {
      manager.unregisterListener(ws);
    });

    ws.on('error', () => {
      manager.unregisterListener(ws);
    });
  });

  // Health check
  app.get('/api/health', async () => {
    return {
      status: 'ok',
      engine: 'fastify',
      ytdlp: YTDLP_PATH,
      ffmpeg: Boolean(FFMPEG_PATH),
      ffmpeg_path: FFMPEG_PATH,
      output_dir: DOWNLOADS_DIR
    };
  });

  // Current queue state
  app.get('/api/state', async () => {
    return manager.getState();
  });

  // Extract metadata
  app.post('/api/extract', async (request, reply) => {
    const rawUrl = request.body?.url;
    if (!rawUrl || typeof rawUrl !== 'string') {
      return reply.code(400).send({ detail: 'A valid URL string is required.' });
    }

    try {
      const state = await manager.extractUrl(rawUrl.trim());
      return state;
    } catch (err) {
      return reply.code(500).send({ detail: err?.message ?? 'Failed to extract link.' });
    }
  });

  // Start queue
  app.post('/api/start', async () => {
    await manager.startQueue();
    return { status: 'started' };
  });

  // Stop queue
  app.post('/api/stop', async () => {
    manager.stopQueue();
    return { status: 'stopped' };
  });

  // Open PC folder (for host machine)
  app.post('/api/open-folder', async (request, reply) => {
    try {
      if (!fs.existsSync(DOWNLOADS_DIR)) {
        fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
      }
      exec(`explorer.exe "${DOWNLOADS_DIR}"`);
      return { status: 'opened', path: DOWNLOADS_DIR };
    } catch (err) {
      return reply.code(500).send({ detail: 'Could not open folder: ' + (err?.message ?? err) });
    }
  });

  // Folder info
  app.get('/api/folder', async () => {
    try {
      if (!fs.existsSync(DOWNLOADS_DIR)) {
        fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
      }
      const files = fs.readdirSync(DOWNLOADS_DIR).filter(f => f?.endsWith('.mp3'));
      let totalSize = 0;
      for (const f of files) {
        try {
          totalSize += fs.statSync(path.join(DOWNLOADS_DIR, f)).size;
        } catch {}
      }
      return {
        path: DOWNLOADS_DIR,
        file_count: files.length,
        total_size_mb: Math.round((totalSize / (1024 * 1024)) * 100) / 100
      };
    } catch {
      return { path: DOWNLOADS_DIR, file_count: 0, total_size_mb: 0 };
    }
  });

  // Download single MP3 directly (for iPhone, iPad, Android)
  app.get('/api/download-file', async (request, reply) => {
    const fileName = request.query?.file;
    if (!fileName || typeof fileName !== 'string') {
      return reply.code(400).send({ detail: 'File name is required.' });
    }

    const safeBase = path.basename(fileName);
    const targetPath = path.join(DOWNLOADS_DIR, safeBase);

    if (!fs.existsSync(targetPath)) {
      return reply.code(404).send({ detail: 'File not found on server.' });
    }

    reply.header('Content-Type', 'audio/mpeg');
    reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(safeBase)}"`);
    const stream = fs.createReadStream(targetPath);
    return reply.send(stream);
  });

  // Download all completed tracks as a ZIP file (for iPhone, iPad, Android)
  app.get('/api/download-zip', async (request, reply) => {
    const completedItems = (manager?.items ?? []).filter(
      i => i?.status === 'completed' && i?.clean_title
    );

    if (completedItems.length === 0) {
      return reply.code(400).send({ detail: 'No completed MP3 files to download yet.' });
    }

    const safePlaylistTitle = (manager?.playlistTitle || 'TuneForge_Music').replace(/[\\/*?:"<>|]/g, '').trim() || 'TuneForge_Music';
    
    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(safePlaylistTitle)}.zip"`);

    const archive = archiver('zip', {
      zlib: { level: 5 }
    });

    archive.on('warning', err => {
      console.warn('[TuneForge Archive] Warning:', err);
    });

    archive.on('error', err => {
      console.error('[TuneForge Archive] Error:', err);
      reply.code(500).send({ detail: 'Failed to generate zip archive.' });
    });

    for (const item of completedItems) {
      const filePath = path.join(DOWNLOADS_DIR, `${item.clean_title}.mp3`);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: `${item.clean_title}.mp3` });
      }
    }

    archive.finalize();
    return reply.send(archive);
  });

  // Static Frontend SPA Serving
  if (fs.existsSync(FRONTEND_DIST)) {
    await app.register(fastifyStatic, {
      root: FRONTEND_DIST,
      prefix: '/'
    });

    // SPA fallback
    app.setNotFoundHandler((request, reply) => {
      reply.sendFile('index.html');
    });
  }

  return app;
}
