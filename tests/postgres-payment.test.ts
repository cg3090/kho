import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { createPostgresPayment } from '../src/server/services/postgresPaymentService';

const makeDb = (paid: number, total: number) => {
  const events: Array<{ kind: string; data: any }> = [];
  const tx = {
    $queryRaw: async () => [{
      id: 'debt-1', amount: new Prisma.Decimal(total), paid_amount: new Prisma.Decimal(paid),
      partner_id: 'cust-1', type: 'AR', is_reversed: false,
    }],
    debt: { update: async (args: any) => { events.push({ kind: 'debt', data: args.data }); } },
    chartOfAccount: { findMany: async () => [{ code: '111' }, { code: '131' }] },
    payment: { create: async (args: any) => { events.push({ kind: 'payment', data: args.data }); } },
    journalEntry: { create: async (args: any) => { events.push({ kind: 'journal', data: args.data }); } },
  };
  const db = {
    $transaction: async (callback: (t: any) => Promise<any>) => callback(tx),
  };
  return { db: db as any, events };
};

const request = {
  id: 'pay-test', type: 'RECEIVE' as const, debtId: 'debt-1',
  partnerId: 'cust-1', partnerType: 'CUSTOMER' as const,
  date: '2026-10-21', amount: 450000,
  method: 'CASH' as const, referenceNo: 'PT-2026-1',
};

test('payment, debt and double-entry journal use one transaction', async () => {
  const { db, events } = makeDb(0, 500000);
  const response = await createPostgresPayment(db, request);
  assert.equal(response.success, true);
  assert.deepEqual(events.map(x => x.kind), ['debt', 'payment', 'journal']);
  assert.equal(events[0].data.paidAmount.toString(), '450000');
  assert.equal(events[0].data.status, 'PARTIAL');
  const lines = events[2].data.lines.create;
  assert.equal(lines.length, 2);
  assert.equal(lines[0].debit.toString(), '450000');
  assert.equal(lines[1].credit.toString(), '450000');
  assert.equal(lines[0].accountCode, '111');
  assert.equal(lines[1].accountCode, '131');
});

test('overpayment fails before creating payment or journal entries', async () => {
  const { db, events } = makeDb(400000, 500000);
  await assert.rejects(() => createPostgresPayment(db, request), /vượt quá công nợ/);
  assert.deepEqual(events, []);
});

test('full settlement produces PAID status', async () => {
  const { db, events } = makeDb(50000, 500000);
  await createPostgresPayment(db, request);
  assert.equal(events[0].data.status, 'PAID');
});

test('invalid payment date rejected before database access', async () => {
  await assert.rejects(
    () => createPostgresPayment(null as any, { ...request, date: '2026-02-30' }),
    /Ngày không hợp lệ/
  );
});
