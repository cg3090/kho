import { Prisma, type PrismaClient } from '@prisma/client';

type D = Prisma.Decimal;
export type StockLineInput = {
  id?: string; productId: string; qty: number; unitPrice: number;
  vatRate?: number; altUomId?: string; altQty?: number;
  altUnitPrice?: number; cartonQty?: number;
};
export type StockInput = {
  id?: string; type: 'IN' | 'OUT' | 'OPENING';
  date?: string; warehouseId: string; referenceNo: string;
  supplierId?: string; customerId?: string; vatRate?: number;
  vatType?: string; notes?: string; dueDate?: string;
  prepaidAmount?: number; prepaidMethod?: string; fiscalYear?: number;
  partnerName?: string; partnerTaxCode?: string;
  details: StockLineInput[];
};

export class StockValidationError extends Error {}
const decimal = (value: number) => new Prisma.Decimal(value);
const money = (n: D) => n.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
const positive = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n > 0;

function parseDate(value?: string) {
  const s = value || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new StockValidationError('Ngày chứng từ không hợp lệ');
  const date = new Date(s + 'T00:00:00.000Z');
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== s) {
    throw new StockValidationError('Ngày chứng từ không hợp lệ');
  }
  return date;
}

export function validateStockRequest(input: StockInput) {
  if (!input || !['IN', 'OUT', 'OPENING'].includes(input.type) ||
    typeof input.warehouseId !== 'string' || !input.warehouseId ||
    typeof input.referenceNo !== 'string' || !input.referenceNo ||
    !Array.isArray(input.details) || input.details.length < 1 || input.details.length > 100 ||
    (input.prepaidAmount !== undefined && Number(input.prepaidAmount) !== 0)) {
    throw new StockValidationError('Chứng từ không hợp lệ; trả trước chưa được hỗ trợ trên PostgreSQL');
  }
  const date = parseDate(input.date);
  const year = date.getUTCFullYear();
  if (input.fiscalYear !== undefined && input.fiscalYear !== year) {
    throw new StockValidationError('Năm tài chính không khớp ngày chứng từ');
  }
  const defaultVatRate = input.vatRate ?? 0;
  if (!Number.isFinite(defaultVatRate) || defaultVatRate < 0 || defaultVatRate > 1) {
    throw new StockValidationError('VAT phải là tỷ lệ từ 0 đến 1');
  }
  const seen = new Set<string>();
  for (const line of input.details) {
    if (!line || typeof line.productId !== 'string' || !line.productId ||
      !positive(line.qty) || decimal(line.qty).decimalPlaces() > 4 ||
      typeof line.unitPrice !== 'number' || !Number.isSafeInteger(line.unitPrice) ||
      line.unitPrice < 0 || line.unitPrice > 1_000_000_000_000) {
      throw new StockValidationError('Số lượng hoặc đơn giá của sản phẩm không hợp lệ');
    }
    const rate = line.vatRate ?? defaultVatRate;
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) throw new StockValidationError('VAT sản phẩm không hợp lệ');
    if (seen.has(line.productId)) throw new StockValidationError('Không được khai báo trùng sản phẩm trong một phiếu');
    seen.add(line.productId);
  }
  if (input.type === 'IN' && !input.supplierId) {
    throw new StockValidationError('Phiếu nhập cần nhà cung cấp để hạch toán công nợ');
  }
  if (input.type === 'OUT' && !input.customerId) {
    throw new StockValidationError('Phiếu xuất cần khách hàng để hạch toán công nợ');
  }
  return { date, year, defaultVatRate };
}

export async function createPostgresStockTransaction(db: PrismaClient, input: StockInput) {
  const { date, year, defaultVatRate } = validateStockRequest(input);
  const id = input.id || 'stx-' + crypto.randomUUID();
  const neededKeys = input.type === 'IN'
    ? ['STOCK_IN', 'VAT_INPUT', 'AP_PAYMENT']
    : input.type === 'OUT'
      ? ['STOCK_IN', 'SALE', 'COGS', 'AR_PAYMENT', 'VAT_OUTPUT']
      : [];

  // SERIALIZABLE aborts conflicting concurrent stock movements rather than losing updates.
  // All stock, debt, VAT and accounting changes must commit or roll back together.
  return db.$transaction(async tx => {
    const warehouse = await tx.warehouse.findUnique({ where: { id: input.warehouseId } });
    if (!warehouse) throw new StockValidationError('Kho không tồn tại');
    const closing = await tx.fiscalClosing.findFirst({ where: { fiscalYear: year, status: 'LOCKED' } });
    if (closing) throw new StockValidationError('Năm tài chính đã khóa sổ');
    const config = await tx.systemConfig.findUnique({ where: { id: 1 } });
    const allowNegative = Boolean(config?.allowNegativeStock);
    const maps = await tx.accountMapping.findMany({ where: { key: { in: neededKeys } } });
    const accounts = Object.fromEntries(maps.map(row => [row.key, row.accountCode]));
    for (const key of neededKeys) {
      if (!accounts[key]) throw new StockValidationError('Thiếu ánh xạ tài khoản ' + key);
    }
    let subtotal = new Prisma.Decimal(0);
    let vat = new Prisma.Decimal(0);
    let cogs = new Prisma.Decimal(0);
    const prepared = [];
    for (const line of input.details) {
      const product = await tx.product.findUnique({ where: { id: line.productId } });
      if (!product) throw new StockValidationError('Sản phẩm không tồn tại: ' + line.productId);
      const pk = { warehouseId_productId: { warehouseId: input.warehouseId, productId: line.productId } };
      const inv = await tx.inventoryStock.findUnique({ where: pk });
      const qty = decimal(line.qty);
      const unitPrice = decimal(line.unitPrice);
      const oldQty = new Prisma.Decimal(product.currentQty || 0);
      const oldCost = new Prisma.Decimal(product.averageCost || 0);
      const oldWarehouseQty = new Prisma.Decimal(inv?.quantity || 0);
      if (input.type === 'OUT' && !allowNegative && oldWarehouseQty.lt(qty)) {
        throw new StockValidationError('Không đủ tồn kho: ' + product.sku);
      }
      const delta = input.type === 'OUT' ? qty.negated() : qty;
      const nextGlobal = oldQty.add(delta);
      const nextWarehouse = oldWarehouseQty.add(delta);
      const rate = decimal(line.vatRate ?? defaultVatRate);
      const lineTotal = money(qty.mul(unitPrice));
      const lineVat = money(lineTotal.mul(rate));
      const cost = input.type === 'OUT' ? oldCost : new Prisma.Decimal(0);
      const lineCogs = input.type === 'OUT' ? money(qty.mul(oldCost)) : new Prisma.Decimal(0);
      let nextCost = oldCost;
      if (input.type !== 'OUT' && nextGlobal.gt(0)) {
        nextCost = money(oldQty.mul(oldCost).add(qty.mul(unitPrice)).div(nextGlobal));
      }
      await tx.product.update({
        where: { id: product.id },
        data: { currentQty: nextGlobal, averageCost: nextCost },
      });
      await tx.inventoryStock.upsert({
        where: pk,
        create: { warehouseId: input.warehouseId, productId: product.id, quantity: nextWarehouse },
        update: { quantity: nextWarehouse, updatedAt: new Date() },
      });
      subtotal = subtotal.add(lineTotal);
      vat = vat.add(lineVat);
      cogs = cogs.add(lineCogs);
      prepared.push({
        id: line.id || 'stxd-' + crypto.randomUUID(), productId: product.id,
        qty, unitPrice, totalPrice: lineTotal, vatRate: rate, vatAmount: lineVat,
        altUomId: line.altUomId || null, altQty: line.altQty === undefined ? null : decimal(line.altQty),
        altUnitPrice: line.altUnitPrice === undefined ? null : decimal(line.altUnitPrice),
        cogsUnitCost: cost, cogsTotal: lineCogs,
        cartonQty: decimal(line.cartonQty || 0),
      });
    }
    const total = subtotal.add(vat);
    const record = await tx.stockTransaction.create({
      data: {
        id, type: input.type, date, warehouseId: input.warehouseId,
        supplierId: input.supplierId || null, customerId: input.customerId || null,
        referenceNo: input.referenceNo, vatRate: decimal(defaultVatRate),
        vatType: input.vatType || 'ITEMIZED',
        subtotal, vatAmount: vat, totalAmount: total, isConfirmed: true,
        notes: input.notes || '', prepaidAmount: 0,
        dueDate: input.dueDate ? parseDate(input.dueDate) : null, fiscalYear: year,
        details: { create: prepared },
      },
    });
    const entry = async (entryId: string, reference: string, description: string,
      lines: Array<{ account: string; debit: D; credit: D; partnerId?: string; partnerType?: string }>) => {
      if (lines.length < 2) return;
      const totalDebit = lines.reduce((sum, l) => sum.add(l.debit), new Prisma.Decimal(0));
      const totalCredit = lines.reduce((sum, l) => sum.add(l.credit), new Prisma.Decimal(0));
      if (!totalDebit.eq(totalCredit)) throw new StockValidationError('Bút toán kế toán không cân');
      await tx.journalEntry.create({
        data: {
          id: entryId, date, referenceNo: reference, description, fiscalYear: year,
          lines: { create: lines.map((l) => ({
            id: 'jl-' + crypto.randomUUID(),
            accountCode: l.account, debit: l.debit, credit: l.credit,
            partnerId: l.partnerId || null, partnerType: l.partnerType || null,
          })) },
        },
      });
    };
    const zero = new Prisma.Decimal(0);
    if (input.type === 'IN') {
      await entry('je-in-' + id, 'NK-' + input.referenceNo, 'Nhập kho ' + input.referenceNo, [
        { account: accounts.STOCK_IN!, debit: subtotal, credit: zero },
        ...(vat.gt(0) ? [{ account: accounts.VAT_INPUT!, debit: vat, credit: zero }] : []),
        { account: accounts.AP_PAYMENT!, debit: zero, credit: total, partnerId: input.supplierId, partnerType: 'SUPPLIER' },
      ]);
    } else if (input.type === 'OUT') {
      await entry('je-rev-' + id, 'DT-' + input.referenceNo, 'Doanh thu ' + input.referenceNo, [
        { account: accounts.AR_PAYMENT!, debit: total, credit: zero, partnerId: input.customerId, partnerType: 'CUSTOMER' },
        { account: accounts.SALE!, debit: zero, credit: subtotal },
        ...(vat.gt(0) ? [{ account: accounts.VAT_OUTPUT!, debit: zero, credit: vat }] : []),
      ]);
      if (cogs.gt(0)) {
        await entry('je-cogs-' + id, 'GV-' + input.referenceNo, 'Giá vốn ' + input.referenceNo, [
          { account: accounts.COGS!, debit: cogs, credit: zero },
          { account: accounts.STOCK_IN!, debit: zero, credit: cogs },
        ]);
      }
    }
    const partnerId = input.type === 'IN' ? input.supplierId : input.customerId;
    if (input.type !== 'OPENING' && partnerId) {
      await tx.debt.create({
        data: {
          id: 'debt-' + id, type: input.type === 'IN' ? 'AP' : 'AR',
          partnerId, txId: record.id, date, referenceNo: input.referenceNo,
          amount: total, paidAmount: 0, status: total.gt(0) ? 'UNPAID' : 'PAID',
          dueDate: input.dueDate ? parseDate(input.dueDate) : null,
        },
      });
    }
    if (input.type !== 'OPENING' && vat.gt(0)) {
      const code = input.type === 'IN' ? accounts.VAT_INPUT! : accounts.VAT_OUTPUT!;
      await tx.vatLedger.create({
        data: {
          id: 'vat-' + id, type: input.type === 'IN' ? 'INPUT' : 'OUTPUT', date,
          txId: id, invoiceNo: input.referenceNo,
          partnerName: input.partnerName || '', partnerTaxCode: input.partnerTaxCode || '',
          amountBeforeVat: subtotal, vatRate: decimal(defaultVatRate), vatAmount: vat,
          accountCode: code,
        },
      });
    }
    return {
      success: true, transactionId: record.id, referenceNo: record.referenceNo,
      subtotal: Number(subtotal), vatAmount: Number(vat), totalAmount: Number(total),
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 20000 });
}
