/**
 * CLOUDFLARE WORKERS ENTRY POINT
 * Chạy toàn bộ hệ thống API Hono trên Cloudflare Edge Worker
 */

import { app } from './app';
import { Hono } from 'hono';

const worker = new Hono();

// Serve SPA for /shop routes (Assets fallback doesn't catch these)
worker.get('/shop*', async (c) => {
  const env = c.env as { ASSETS?: { fetch: (req: Request) => Promise<Response> } };
  const asset = await env.ASSETS?.fetch(new Request(new URL('/index.html', c.req.url)));
  if (!asset) {
    return c.text('Not found', 404);
  }
  return asset;
});

// Mount main app
worker.route('/', app);

export default worker;