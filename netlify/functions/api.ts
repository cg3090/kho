/**
 * Netlify deployment gate.
 * The core Hono routes still depend on Cloudflare D1. Do not silently use
 * ephemeral Node SQLite for financial/inventory records in serverless runtime.
 * Until the transactional business endpoints are migrated to PostgreSQL,
 * only read-only readiness endpoints are enabled.
 */
import { testPostgresConnection } from '../../src/server/services/postgresService';

export const handler = async (event: any) => {
  const method = event.httpMethod || 'GET';
  const originalPath = String(event.path || '');
  const forwardedPath = event.queryStringParameters?.path || '';
  const path = forwardedPath
    ? '/api/' + String(forwardedPath).replace(/^\/+/, '')
    : originalPath.startsWith('/.netlify/functions/api/')
      ? '/api/' + originalPath.slice('/.netlify/functions/api/'.length)
      : originalPath;

  const json = (statusCode: number, result: Record<string, unknown>) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(result),
  });

  if (method === 'GET' && path === '/api/health') {
    return json(200, {
      status: 'limited', framework: 'Netlify Functions',
      database: 'PostgreSQL migration required for transactional API',
      readyForProduction: false,
    });
  }

  if (method === 'GET' && path === '/api/db/status') {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) return json(503, { connected: false, error: 'DATABASE_URL not configured' });
    try {
      await testPostgresConnection({ connectionString, ssl: true });
      return json(200, {
        connected: true,
        engine: 'supabase',
        message: 'PostgreSQL connection verified. ERP business API migration is still required.',
        businessApiReady: false,
      });
    } catch {
      return json(503, { connected: false, error: 'PostgreSQL connection failed; inspect server logs.' });
    }
  }

  return json(503, {
    success: false,
    error: 'Business API temporarily disabled on Netlify: Cloudflare D1 routes have not been migrated to Supabase PostgreSQL.',
    code: 'POSTGRES_API_MIGRATION_REQUIRED',
  });
};
