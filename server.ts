import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRequestListener } from '@hono/node-server';
import { app as honoApp } from './src/server/app';
import { getOrCreateLocalD1 } from './src/db/d1Client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Warm up local D1 SQLite database for dev
  try {
    getOrCreateLocalD1();
    console.log('✅ Local Cloudflare D1 engine initialized (SQLite mode with VNĐ integer standard).');
  } catch (err) {
    console.warn('Local D1 initialization warning:', err);
  }

  const app = express();
  const PORT = 3000;

  // Mount Hono Web-Standard API Router for all /api endpoints
  const honoHandler = getRequestListener(honoApp.fetch);
  app.all('/api*', (req, res) => {
    return honoHandler(req, res);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: [
            '**/.env*',
            '**/.pg-runtime-config.json',
            '**/.d1-local/**',
            '**/node_modules/**',
          ],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Hono + React Fullstack Cloudflare Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
