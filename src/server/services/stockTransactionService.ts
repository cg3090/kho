/**
 * STOCK TRANSACTION SERVICE FOR D1 (NO TRANSACTIONS)
 * Uses D1 batch API for atomic writes
 * Bảo vệ tính toàn vẹn 100% của Tồn kho & Kế toán theo Thông tư 133/200
 * Chuẩn số nguyên VNĐ (Zero decimal floating-point errors)
 */

import { eq, and, sql } from 'drizzle-orm';
import {
  stockTransactions,
  stockTransactionDetails,
  inventoryStock,
  products,
  journalEntries,
  journalEntryLines,
  debts,
  payments,
  vatLedger,
  systemConfig,
  toVndInteger,
} from '../../db/schema';
import type { DrizzleD1Database } from '../../db/d1Client';
import type { D1Database } from '../../db/d1Client';

export interface CreateStockTxInput {
  id?: string;
  type: 'IN' | 'OUT' | 'OPENING';
  date?: string;
  warehouseId: string;
  supplierId?: string;
  customerId?: string;
  referenceNo: string;
  vatRate?: number;
  vatType?: 'ITEMIZED' | 'GROUPED';
  notes?: string;
  prepaidAmount?: number;
  prepaidMethod?: 'CASH' | 'BANK';
  dueDate?: string;
  fiscalYear?: number;
  partnerName?: string;
  partnerTaxCode?: string;
  details: Array<{
    id?: string;
    productId: string;
    qty: number;
    unitPrice: number;
    vatRate?: number;
    altUomId?: string;
    altQty?: number;
    altUnitPrice?: number;
    cartonQty?: number;
  }>;
}

function getDrizzle(db: DrizzleD1Database | D1Database): DrizzleD1Database {
  return 'transaction' in db ? db as DrizzleD1Database : undefined as any;
}

function getD1(db: DrizzleD1Database | D1Database): D1Database {
  return 'transaction' in db ? (db as DrizzleD1Database).$client : db as D1Database;
}

export async function executeStockTransaction(
  db: DrizzleD1Database | D1Database,
  input: CreateStockTxInput
) {
  const drizzle = getDrizzle(db);
  const d1 = getD1(db);

  const txId = input.id || `stx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const txDate = input.date || new Date().toISOString().split('T')[0];
  const txType = input.type;

  const [cfg] = await drizzle
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.id, 1))
    .limit(1);
  const allowNegative = Boolean(cfg?.allowNegativeStock);

  let calculatedSubtotal = 0;
  let calculatedVatTotal = 0;
  let totalCogsCalculated = 0;

  const processedDetails: Array<{
    id: string;
    productId: string;
    qty: number;
    unitPrice: number;
    totalPrice: number;
    vatRate: number;
    vatAmount: number;
    altUomId?: string;
    altQty?: number;
    altUnitPrice?: number;
    cogsUnitCost: number;
    cogsTotal: number;
    cartonQty: number;
  }> = [];

  for (const item of input.details) {
    const detailId = item.id || `stxd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const qty = Number(item.qty || 0);
    const unitPrice = toVndInteger(item.unitPrice);
    const itemVatRate = item.vatRate !== undefined ? Number(item.vatRate) : Number(input.vatRate || 0);
    const lineTotal = toVndInteger(qty * unitPrice);
    const lineVat = toVndInteger(lineTotal * itemVatRate);

    calculatedSubtotal += lineTotal;
    calculatedVatTotal += lineVat;

    const [prod] = await drizzle
      .select()
      .from(products)
      .where(eq(products.id, item.productId))
      .limit(1);

    if (!prod) {
      throw new Error(`Sản phẩm với ID ${item.productId} không tồn tại trong hệ thống.`);
    }

    const currentProdQty = Number(prod.currentQty || 0);
    const currentAvgCost = toVndInteger(prod.averageCost || 0);

    const [inv] = await drizzle
      .select()
      .from(inventoryStock)
      .where(
        and(
          eq(inventoryStock.warehouseId, input.warehouseId),
          eq(inventoryStock.productId, item.productId)
        )
      )
      .limit(1);

    const currentWhQty = inv ? Number(inv.quantity || 0) : 0;

    let cogsUnitCost = 0;
    let cogsTotal = 0;
    let newWhQty = currentWhQty;
    let newProdQty = currentProdQty;
    let newAvgCost = currentAvgCost;

    if (txType === 'OUT') {
      if (!allowNegative && currentWhQty < qty) {
        throw new Error(
          `Không đủ tồn kho để xuất! Sản phẩm "${prod.name}" (SKU: ${prod.sku}) tại kho chỉ còn ${currentWhQty}, yêu cầu xuất ${qty}.`
        );
      }

      cogsUnitCost = currentAvgCost;
      cogsTotal = toVndInteger(qty * cogsUnitCost);
      totalCogsCalculated += cogsTotal;

      newWhQty = currentWhQty - qty;
      newProdQty = currentProdQty - qty;
    } else if (txType === 'IN') {
      const oldTotalValue = currentProdQty > 0 ? currentProdQty * currentAvgCost : 0;
      const inTotalValue = qty * unitPrice;
      newProdQty = currentProdQty + qty;
      newWhQty = currentWhQty + qty;
      newAvgCost = newProdQty > 0 ? toVndInteger((oldTotalValue + inTotalValue) / newProdQty) : unitPrice;
    } else {
      newWhQty = currentWhQty + qty;
      newProdQty = currentProdQty + qty;
      newAvgCost = unitPrice > 0 ? unitPrice : currentAvgCost;
    }

    processedDetails.push({
      id: detailId,
      productId: item.productId,
      qty,
      unitPrice,
      totalPrice: lineTotal,
      vatRate: itemVatRate,
      vatAmount: lineVat,
      altUomId: item.altUomId,
      altQty: item.altQty,
      altUnitPrice: item.altUnitPrice ? toVndInteger(item.altUnitPrice) : undefined,
      cogsUnitCost,
      cogsTotal,
      cartonQty: Number(item.cartonQty || 0),
    });

    const isNewInventory = !inv;
  }

  const finalSubtotal = calculatedSubtotal;
  const finalVatAmount = calculatedVatTotal;
  const finalTotalAmount = finalSubtotal + finalVatAmount;
  const prepaidAmount = toVndInteger(input.prepaidAmount || 0);

  const statements: any[] = [];

  statements.push(
    d1.prepare(
      `INSERT INTO stock_transactions (id, type, date, warehouse_id, supplier_id, customer_id, reference_no, vat_rate, vat_type, subtotal, vat_amount, total_amount, is_confirmed, notes, prepaid_amount, prepaid_method, due_date, fiscal_year)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      txId, txType, txDate, input.warehouseId,
      input.supplierId || null, input.customerId || null,
      input.referenceNo, input.vatRate || 0, input.vatType || 'ITEMIZED',
      finalSubtotal, finalVatAmount, finalTotalAmount, 1,
      input.notes || '', prepaidAmount, input.prepaidMethod || null,
      input.dueDate || null, input.fiscalYear || new Date(txDate).getFullYear()
    )
  );

  for (const dt of processedDetails) {
    statements.push(
      d1.prepare(
        `INSERT INTO stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        dt.id, txId, dt.productId, dt.qty, dt.unitPrice, dt.totalPrice,
        dt.vatRate, dt.vatAmount, dt.altUomId || null, dt.altQty || null,
        dt.altUnitPrice || null, dt.cogsUnitCost, dt.cogsTotal, dt.cartonQty
      )
    );
  }

  for (const dt of processedDetails) {
    const [inv] = await drizzle
      .select()
      .from(inventoryStock)
      .where(
        and(
          eq(inventoryStock.warehouseId, input.warehouseId),
          eq(inventoryStock.productId, dt.productId)
        )
      )
      .limit(1);

    if (inv) {
      statements.push(
        d1.prepare(
          `UPDATE inventory_stock SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE warehouse_id = ? AND product_id = ?`
        ).bind(dt.qty + (txType === 'OUT' ? -dt.qty : dt.qty), input.warehouseId, dt.productId)
      );
    } else {
      statements.push(
        d1.prepare(
          `INSERT INTO inventory_stock (warehouse_id, product_id, quantity) VALUES (?, ?, ?)`
        ).bind(input.warehouseId, dt.productId, dt.qty)
      );
    }

    const [prod] = await drizzle
      .select()
      .from(products)
      .where(eq(products.id, dt.productId))
      .limit(1);

    const currentProdQty = Number(prod?.currentQty || 0);
    const currentAvgCost = toVndInteger(prod?.averageCost || 0);

    let newProdQtyCalc = currentProdQty;
    let newAvgCostCalc = currentAvgCost;

    if (txType === 'OUT') {
      newProdQtyCalc = currentProdQty - dt.qty;
      newAvgCostCalc = currentAvgCost;
    } else if (txType === 'IN') {
      const oldTotalValue = currentProdQty > 0 ? currentProdQty * currentAvgCost : 0;
      const inTotalValue = dt.qty * dt.unitPrice;
      newProdQtyCalc = currentProdQty + dt.qty;
      newAvgCostCalc = newProdQtyCalc > 0 ? toVndInteger((oldTotalValue + inTotalValue) / newProdQtyCalc) : dt.unitPrice;
    } else {
      newProdQtyCalc = currentProdQty + dt.qty;
      newAvgCostCalc = dt.unitPrice > 0 ? dt.unitPrice : currentAvgCost;
    }

    statements.push(
      d1.prepare(
        `UPDATE products SET current_qty = ?, average_cost = ? WHERE id = ?`
      ).bind(newProdQtyCalc, newAvgCostCalc, dt.productId)
    );
  }

  if (txType === 'IN') {
    const jeId = `je-in-${txId}`;
    statements.push(
      d1.prepare(
        `INSERT INTO journal_entries (id, date, reference_no, description, fiscal_year)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(jeId, txDate, `NK-${input.referenceNo}`, `Nhập kho theo phiếu ${input.referenceNo}`, new Date(txDate).getFullYear())
    );

    statements.push(
      d1.prepare(
        `INSERT INTO journal_entry_lines (id, entry_id, account_code, debit, credit, partner_id, partner_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(`jel-${jeId}-1`, jeId, '156', finalSubtotal, 0, input.supplierId || null, 'SUPPLIER')
    );

    if (finalVatAmount > 0) {
      statements.push(
        d1.prepare(
          `INSERT INTO journal_entry_lines (id, entry_id, account_code, debit, credit, partner_id, partner_type)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(`jel-${jeId}-2`, jeId, '1331', finalVatAmount, 0, input.supplierId || null, 'SUPPLIER')
      );
    }

    statements.push(
      d1.prepare(
        `INSERT INTO journal_entry_lines (id, entry_id, account_code, debit, credit, partner_id, partner_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(`jel-${jeId}-3`, jeId, '331', 0, finalTotalAmount, input.supplierId || null, 'SUPPLIER')
    );
  } else if (txType === 'OUT') {
    if (totalCogsCalculated > 0) {
      const jeCogsId = `je-cogs-${txId}`;
      statements.push(
        d1.prepare(
          `INSERT INTO journal_entries (id, date, reference_no, description, fiscal_year)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(jeCogsId, txDate, `GV-${input.referenceNo}`, `Giá vốn xuất kho theo phiếu ${input.referenceNo}`, new Date(txDate).getFullYear())
      );

      statements.push(
        d1.prepare(
          `INSERT INTO journal_entry_lines (id, entry_id, account_code, debit, credit)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(`jel-${jeCogsId}-1`, jeCogsId, '632', totalCogsCalculated, 0)
      );

      statements.push(
        d1.prepare(
          `INSERT INTO journal_entry_lines (id, entry_id, account_code, debit, credit)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(`jel-${jeCogsId}-2`, jeCogsId, '156', 0, totalCogsCalculated)
      );
    }

    const jeRevId = `je-rev-${txId}`;
    statements.push(
      d1.prepare(
        `INSERT INTO journal_entries (id, date, reference_no, description, fiscal_year)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(jeRevId, txDate, `DT-${input.referenceNo}`, `Doanh thu bán hàng theo phiếu ${input.referenceNo}`, new Date(txDate).getFullYear())
    );

    statements.push(
      d1.prepare(
        `INSERT INTO journal_entry_lines (id, entry_id, account_code, debit, credit, partner_id, partner_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(`jel-${jeRevId}-1`, jeRevId, '131', finalTotalAmount, 0, input.customerId || null, 'CUSTOMER')
    );

    statements.push(
      d1.prepare(
        `INSERT INTO journal_entry_lines (id, entry_id, account_code, debit, credit, partner_id, partner_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(`jel-${jeRevId}-2`, jeRevId, '511', 0, finalSubtotal, input.customerId || null, 'CUSTOMER')
    );

    if (finalVatAmount > 0) {
      statements.push(
        d1.prepare(
          `INSERT INTO journal_entry_lines (id, entry_id, account_code, debit, credit, partner_id, partner_type)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(`jel-${jeRevId}-3`, jeRevId, '3331', 0, finalVatAmount, input.customerId || null, 'CUSTOMER')
      );
    }
  }

  let debtId: string | undefined;
  if (txType === 'IN' && input.supplierId) {
    debtId = `debt-${txId}`;
    const debtStatus = prepaidAmount >= finalTotalAmount ? 'PAID' : prepaidAmount > 0 ? 'PARTIAL' : 'UNPAID';
    statements.push(
      d1.prepare(
        `INSERT INTO debts (id, type, partner_id, tx_id, reference_no, date, amount, paid_amount, status, due_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(debtId, 'AP', input.supplierId, txId, input.referenceNo, txDate, finalTotalAmount, prepaidAmount, debtStatus, input.dueDate || null)
    );
  } else if (txType === 'OUT' && input.customerId) {
    debtId = `debt-${txId}`;
    const debtStatus = prepaidAmount >= finalTotalAmount ? 'PAID' : prepaidAmount > 0 ? 'PARTIAL' : 'UNPAID';
    statements.push(
      d1.prepare(
        `INSERT INTO debts (id, type, partner_id, tx_id, reference_no, date, amount, paid_amount, status, due_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(debtId, 'AR', input.customerId, txId, input.referenceNo, txDate, finalTotalAmount, prepaidAmount, debtStatus, input.dueDate || null)
    );
  }

  if (finalVatAmount > 0) {
    statements.push(
      d1.prepare(
        `INSERT INTO vat_ledger (id, type, date, tx_id, invoice_no, partner_name, partner_tax_code, amount_before_vat, vat_rate, vat_amount, account_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        `vat-${txId}`,
        txType === 'IN' ? 'INPUT' : 'OUTPUT',
        txDate, txId, input.referenceNo,
        input.partnerName || (txType === 'IN' ? 'Nhà cung cấp' : 'Khách hàng'),
        input.partnerTaxCode || '',
        finalSubtotal, input.vatRate || 0, finalVatAmount,
        txType === 'IN' ? '1331' : '3331'
      )
    );
  }

  if (prepaidAmount > 0 && debtId) {
    const payId = `pay-prepaid-${txId}`;
    const payRef = (txType === 'IN' ? 'PC-' : 'PT-') + input.referenceNo;
    statements.push(
      d1.prepare(
        `INSERT INTO payments (id, type, debt_id, partner_id, partner_type, date, amount, method, reference_no, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        payId,
        txType === 'IN' ? 'PAY' : 'RECEIVE',
        debtId,
        (txType === 'IN' ? input.supplierId : input.customerId) || 'UNKNOWN',
        txType === 'IN' ? 'SUPPLIER' : 'CUSTOMER',
        txDate, prepaidAmount, input.prepaidMethod || 'CASH', payRef,
        `Thanh toán ngay khi tạo phiếu ${input.referenceNo}`
      )
    );

    const payJeId = `je-pay-${payId}`;
    const payAcc = input.prepaidMethod === 'BANK' ? '112' : '111';
    statements.push(
      d1.prepare(
        `INSERT INTO journal_entries (id, date, reference_no, description, fiscal_year)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(payJeId, txDate, payRef, `Thanh toán phiếu ${input.referenceNo}`, new Date(txDate).getFullYear())
    );

    if (txType === 'IN') {
      statements.push(
        d1.prepare(
          `INSERT INTO journal_entry_lines (id, entry_id, account_code, debit, credit)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(`jel-${payJeId}-1`, payJeId, '331', prepaidAmount, 0)
      );
      statements.push(
        d1.prepare(
          `INSERT INTO journal_entry_lines (id, entry_id, account_code, debit, credit)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(`jel-${payJeId}-2`, payJeId, payAcc, 0, prepaidAmount)
      );
    } else {
      statements.push(
        d1.prepare(
          `INSERT INTO journal_entry_lines (id, entry_id, account_code, debit, credit)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(`jel-${payJeId}-1`, payJeId, payAcc, prepaidAmount, 0)
      );
      statements.push(
        d1.prepare(
          `INSERT INTO journal_entry_lines (id, entry_id, account_code, debit, credit)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(`jel-${payJeId}-2`, payJeId, '131', 0, prepaidAmount)
      );
    }
  }

  if (statements.length > 0) {
    await d1.batch(statements);
  }

  return {
    success: true,
    transactionId: txId,
    referenceNo: input.referenceNo,
    subtotal: finalSubtotal,
    vatAmount: finalVatAmount,
    totalAmount: finalTotalAmount,
    cogsTotal: totalCogsCalculated,
    itemsCount: processedDetails.length,
  };
}