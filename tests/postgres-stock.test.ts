import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStockRequest, StockValidationError, createPostgresStockTransaction } from '../src/server/services/postgresStockService';

const valid = () => ({
  type: 'IN' as const, warehouseId: 'wh-1', supplierId: 'sup-1',
  date: '2026-10-21', referenceNo: 'PN-1',
  vatRate: 0.1,
  details: [{ productId: 'prod-1', qty: 5, unitPrice: 120000 }],
});

test('stock request validates before database interaction', () => {
  const parsed = validateStockRequest(valid());
  assert.equal(parsed.year, 2026);
  assert.equal(parsed.defaultVatRate, 0.1);
});

test('negative quantity cannot be posted', async () => {
  const input = valid();
  input.details[0].qty = -5;
  await assert.rejects(() => createPostgresStockTransaction(null as any, input), StockValidationError);
});

test('duplicate SKU lines cannot produce lost inventory updates', () => {
  const input = valid();
  input.details.push({ ...input.details[0] });
  assert.throws(() => validateStockRequest(input), /trùng sản phẩm/);
});

test('VAT outside decimal fraction is rejected', () => {
  const input = { ...valid(), vatRate: 10 };
  assert.throws(() => validateStockRequest(input), /VAT/);
});

test('prepayments are blocked until ledger accounting is implemented', () => {
  assert.throws(() => validateStockRequest({ ...valid(), prepaidAmount: 30000 }), /trả trước/);
});

test('stock document cannot post into another fiscal year', () => {
  assert.throws(() => validateStockRequest({ ...valid(), fiscalYear: 2025 }), /Năm tài chính/);
});
