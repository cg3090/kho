import type { Request, Response, NextFunction } from 'express';

/**
 * Only trust forwarding headers when the deployment sits behind a known
 * reverse proxy (TRUST_PROXY=true). Otherwise X-Forwarded-* values are
 * client-supplied and must never influence rate limiting or HTTPS detection.
 */
function trustsForwardedHeaders(): boolean {
  return process.env.TRUST_PROXY === 'true';
}

export function clientIp(req: Request): string {
  if (trustsForwardedHeaders()) {
    const forwarded = req.headers['x-forwarded-for']?.toString().split(',')[0].trim();
    if (forwarded) return forwarded;
  }
  return req.socket.remoteAddress || 'unknown';
}

export function isSecureTransport(req: Request): boolean {
  if (trustsForwardedHeaders()) {
    const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    if (proto) return proto === 'https';
  }
  return Boolean((req.socket as { encrypted?: boolean }).encrypted);
}

const isProduction = process.env.NODE_ENV === 'production';

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  const csp = isProduction
    ? [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
    : [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' ws: wss:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ');

  res.setHeader('Content-Security-Policy', csp);

  next();
}

export function bodySizeLimit(options: { limit?: string; paths?: RegExp[] } = {}) {
  const { limit = '1mb', paths = [] } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      const limitBytes = parseSize(limit);
      if (size > limitBytes) {
        return res.status(413).json({ success: false, error: 'Payload too large' });
      }
    }

    if (paths.length > 0) {
      const matched = paths.some((p) => p.test(req.path));
      if (!matched) {
        return next();
      }
    }

    next();
  };
}

function parseSize(size: string): number {
  const match = size.match(/^(\d+(?:\.\d+)?)\s*(kb|mb|gb)?$/i);
  if (!match) return 1024 * 1024;
  const value = parseFloat(match[1]);
  const unit = (match[2] || 'kb').toLowerCase();
  const multipliers: Record<string, number> = { kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  return Math.floor(value * (multipliers[unit] || 1024));
}

export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
} = { windowMs: 60000, max: 100 }) {
  const { windowMs, max, keyGenerator = defaultKeyGenerator } = options;
  const hits = new Map<string, { count: number; resetTime: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of hits.entries()) {
      if (value.resetTime <= now) hits.delete(key);
    }
  }, windowMs);

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const record = hits.get(key);

    if (!record || record.resetTime <= now) {
      hits.set(key, { count: 1, resetTime: now + windowMs });
      setRateLimitHeaders(res, max, max - 1, windowMs);
      return next();
    }

    if (record.count >= max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      setRateLimitHeaders(res, max, 0, windowMs);
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter,
      });
    }

    record.count++;
    setRateLimitHeaders(res, max, max - record.count, windowMs);
    next();
  };
}

function defaultKeyGenerator(req: Request): string {
  return `${clientIp(req)}:${req.path}`;
}

function setRateLimitHeaders(res: Response, limit: number, remaining: number, windowMs: number) {
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil((Date.now() + windowMs) / 1000)));
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  const sanitize = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    if (Array.isArray(obj)) return obj.map(sanitize);
    if (typeof obj === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(obj)) {
        out[k] = sanitize(v);
      }
      return out;
    }
    return obj;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
}

export function requireHttps(req: Request, res: Response, next: NextFunction) {
  if (isProduction) {
    if (!isSecureTransport(req)) {
      const host = req.headers.host || 'localhost';
      return res.redirect(301, `https://${host}${req.url}`);
    }
  }
  next();
}