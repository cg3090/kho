import test from 'node:test';
import assert from 'node:assert/strict';
import { postgresApi } from '../src/server/netlifyPostgresApp';
import { createPostgresPayment } from '../src/server/services/postgresPaymentService';
import { savePostgresCatalog } from '../src/server/services/postgresCatalogService';

test('health endpoint clearly reports limited functionality', async () => {
  const result = await postgresApi.request('http://localhost/api/health');
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.equal(body.businessMutationsEnabled, false);
});

test('ERP state cannot be read without a signed session', async () => {
  const result = await postgresApi.request('http://localhost/api/db/state');
  assert.equal(result.status, 401);
});

test('unauthenticated ERP writes are blocked', async () => {
  const result = await postgresApi.request('http://localhost/api/db/sync-all', { method: 'POST' });
  assert.equal(result.status, 401);
});

test('malformed login rejected without touching database', async () => {
  const result = await postgresApi.request('http://localhost/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: '' }),
  });
  assert.equal(result.status, 400);
});

test('invalid payment rejected before database access', async () => {
  await assert.rejects(
    () => createPostgresPayment(null as any, {
      type: 'RECEIVE', partnerId: 'c-1', partnerType: 'CUSTOMER',
      amount: -5, method: 'CASH', referenceNo: 'PT-1',
    }),
    /thanh toán không hợp lệ/
  );
});

test('duplicate catalog IDs rejected before database access', async () => {
  await assert.rejects(
    () => savePostgresCatalog(null as any, 'categories', [
      { id: 'c-1', name: 'A' }, { id: 'c-1', name: 'B' },
    ]),
    /ID bị trùng/
  );
});

test('unsupported catalog mutations fail closed', async () => {
  await assert.rejects(() => savePostgresCatalog(null as any, 'stockTransactions', []), /chưa được hỗ trợ/);
});
