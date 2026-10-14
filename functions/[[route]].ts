/**
 * CLOUDFLARE PAGES FUNCTIONS ADAPTER
 * Tự động chuyển tiếp toàn bộ request API trên Cloudflare Pages đến ứng dụng Hono
 */

import { handle } from 'hono/cloudflare-pages';
import { app } from '../src/server/app';

export const onRequest = handle(app);
