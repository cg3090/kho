/** Netlify request adapter backed exclusively by Supabase PostgreSQL. */
import { postgresApi } from '../../src/server/netlifyPostgresApp';

export const handler = async (event: any) => {
  const host = event.headers?.host || 'localhost';
  const protocol = event.headers?.['x-forwarded-proto'] || 'https';
  const originalPath = String(event.path || '/');
  const rest = event.queryStringParameters?.path;
  const pathname = typeof rest === 'string'
    ? '/api/' + rest.replace(/^\/+/, '')
    : originalPath.startsWith('/.netlify/functions/api/')
      ? '/api/' + originalPath.slice('/.netlify/functions/api/'.length)
      : originalPath;
  const params = new URLSearchParams(event.queryStringParameters || {});
  params.delete('path');
  const url = new URL(pathname + (params.size ? '?' + params.toString() : ''), protocol + '://' + host);
  try {
    const method = (event.httpMethod || 'GET').toUpperCase();
    const headers = new Headers(event.headers || {});
    const body = !['GET', 'HEAD'].includes(method) && event.body
      ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body)
      : undefined;
    const request = new Request(url, { method, headers, body });
    const response = await postgresApi.fetch(request);
    const responseBody = Buffer.from(await response.arrayBuffer());
    const responseHeaders = Object.fromEntries(response.headers.entries());
    return {
      statusCode: response.status,
      headers: { ...responseHeaders, 'Cache-Control': 'no-store' },
      body: responseBody.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('Netlify API handler failure', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ success: false, error: 'Internal API error' }),
    };
  }
};
