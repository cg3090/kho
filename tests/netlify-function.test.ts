import test from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../netlify/functions/api';

test('Netlify function maps SPA API health redirect', async () => {
  const result = await handler({
    path: '/.netlify/functions/api',
    queryStringParameters: { path: 'health' },
    httpMethod: 'GET',
    headers: { host: 'example.netlify.app', 'x-forwarded-proto': 'https' },
  });
  assert.equal(result.statusCode, 200);
  const data = JSON.parse(Buffer.from(result.body, 'base64').toString('utf8'));
  assert.equal(data.storage, 'Supabase PostgreSQL');
});

test('Netlify function forwards auth protections', async () => {
  const result = await handler({
    path: '/.netlify/functions/api',
    queryStringParameters: { path: 'db/state' },
    httpMethod: 'GET',
    headers: { host: 'example.netlify.app', 'x-forwarded-proto': 'https' },
  });
  assert.equal(result.statusCode, 401);
});
