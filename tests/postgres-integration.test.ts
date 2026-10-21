import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { createPostgresStockTransaction } from '../src/server/services/postgresStockService';
import { createPostgresPayment } from '../src/server/services/postgresPaymentService';

const url = process.env.DATABASE_URL || '';
if (!/localhost|127\.0\.0\.1/.test(url)) {
  throw new Error('Integration tests may only run against local disposable PostgreSQL');
}
const db = new PrismaClient();
const uid = 'ci-' + crypto.randomUUID().slice(0, 8);

test('REAL PostgreSQL: stock IN/OUT, debt, balanced journals and payment', async () => {
  const wh = uid + '-wh', supp = uid + '-supp', cust = uid + '-cust', prod = uid + '-prod';
  await db.warehouse.create({ data: { id: wh, name: 'CI warehouse' } });
  await db.supplier.create({ data: { id: supp, name: 'CI supplier', taxCode: '' } });
  await db.customer.create({ data: { id: cust, name: 'CI customer', taxCode: '' } });
  await db.product.create({ data: { id: prod, sku: uid + '-SKU', name: 'CI inventory item', currentQty: 0, averageCost: 0 } });
  await db.systemConfig.upsert({ where: { id: 1 }, create: { id: 1, allowNegativeStock: false }, update: { allowNegativeStock: false } });
  for (const code of ['111', '131', '1331', '156', '331', '3331', '511', '632']) {
    await db.chartOfAccount.upsert({ where: { code }, create: { code, name: 'CI ' + code, type: 'ASSET' }, update: {} });
  }
  for (const [key, accountCode] of Object.entries({
    STOCK_IN: '156', VAT_INPUT: '1331', AP_PAYMENT: '331',
    SALE: '511', COGS: '632', AR_PAYMENT: '131', VAT_OUTPUT: '3331',
  })) {
    await db.accountMapping.upsert({
      where: { key }, create: { key, accountCode }, update: { accountCode },
    });
  }

  const incoming = await createPostgresStockTransaction(db, {
    type: 'IN', warehouseId: wh, supplierId: supp,
    date: '2026-10-21', referenceNo: uid + '-PN', vatRate: 0.1,
    details: [{ productId: prod, qty: 5, unitPrice: 100000 }],
  });
  assert.equal(incoming.subtotal, 500000);
  const warehouseStock = () => db.inventoryStock.findUnique({
    where: { warehouseId_productId: { warehouseId: wh, productId: prod } },
  });
  assert.equal((await warehouseStock())?.quantity.toString(), '5');

  const outgoing = await createPostgresStockTransaction(db, {
    type: 'OUT', warehouseId: wh, customerId: cust,
    date: '2026-10-21', referenceNo: uid + '-PX', vatRate: 0.1,
    details: [{ productId: prod, qty: 2, unitPrice: 150000 }],
  });
  assert.equal(outgoing.subtotal, 300000);
  assert.equal(outgoing.totalAmount, 330000);
  assert.equal((await warehouseStock())?.quantity.toString(), '3');
  assert.equal((await db.product.findUnique({ where: { id: prod } }))?.currentQty?.toString(), '3');
  const debt = await db.debt.findUnique({ where: { id: 'debt-' + outgoing.transactionId } });
  assert.equal(debt?.amount.toString(), '330000');
  assert.equal(debt?.type, 'AR');

  const payment = await createPostgresPayment(db, {
    type: 'RECEIVE', debtId: debt!.id, partnerId: cust, partnerType: 'CUSTOMER',
    date: '2026-10-21', amount: 200000, method: 'CASH', referenceNo: uid + '-PT',
  });
  assert.equal(payment.success, true);
  const afterPayment = await db.debt.findUnique({ where: { id: debt!.id } });
  assert.equal(afterPayment?.paidAmount.toString(), '200000');
  assert.equal(afterPayment?.status, 'PARTIAL');

  const entries = await db.journalEntry.findMany({
    where: { OR: [{ referenceNo: uid + '-PT' }, { referenceNo: 'DT-' + uid + '-PX' }, { referenceNo: 'GV-' + uid + '-PX' }] },
    include: { lines: true },
  });
  assert.equal(entries.length, 3);
  for (const entry of entries) {
    const debit = entry.lines.reduce((sum, l) => sum + Number(l.debit), 0);
    const credit = entry.lines.reduce((sum, l) => sum + Number(l.credit), 0);
    assert.equal(debit, credit, 'unbalanced entry ' + entry.referenceNo);
  }

  await assert.rejects(() => createPostgresStockTransaction(db, {
    type: 'OUT', warehouseId: wh, customerId: cust,
    referenceNo: uid + '-OUT-FAIL', details: [{ productId: prod, qty: 999, unitPrice: 200000 }],
  }), /Không đủ tồn kho/);
  assert.equal((await warehouseStock())?.quantity.toString(), '3');
  assert.equal(await db.stockTransaction.count({ where: { referenceNo: uid + '-OUT-FAIL' } }), 0);
});

test.after(async () => {
  await db.$disconnect();
});
