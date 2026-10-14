/**
 * WEBSHOP ORDER SERVICE FOR D1 (NO TRANSACTIONS)
 * Uses D1 batch API for atomic writes
 * Xử lý Đơn đặt hàng Webshop, tự động liên kết Phiếu Xuất kho & Trừ tồn kho
 */

import { eq } from 'drizzle-orm';
import {
  webshopOrders,
  webshopOrderItems,
  webshopStoreConfig,
  products,
  toVndInteger,
} from '../../db/schema';
import type { DrizzleD1Database } from '../../db/d1Client';
import type { D1Database } from '../../db/d1Client';
import { executeStockTransaction } from './stockTransactionService';

function getDrizzle(db: DrizzleD1Database | D1Database): DrizzleD1Database {
  return 'transaction' in db ? db as DrizzleD1Database : undefined as any;
}

function getD1(db: DrizzleD1Database | D1Database): D1Database {
  return 'transaction' in db ? (db as DrizzleD1Database).$client : db as D1Database;
}

export interface CreateWebshopOrderInput {
  id?: string;
  orderCode: string;
  date?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress: string;
  customerId?: string;
  accountId?: string;
  shippingMethod?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus?: string;
  warehouseId?: string;
  discountAmount?: number;
  shippingFee?: number;
  vatRate?: number;
  notes?: string;
  items: Array<{
    id?: string;
    productId: string;
    qty: number;
    unitPrice?: number;
    uomId?: string;
    uomName?: string;
  }>;
}

export async function executeCreateWebshopOrder(
  db: DrizzleD1Database | D1Database,
  input: CreateWebshopOrderInput
) {
  const drizzle = getDrizzle(db);
  const d1 = getD1(db);

  const orderId = input.id || `ws-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const orderDate = input.date || new Date().toISOString().split('T')[0];

  const [cfg] = await drizzle
    .select()
    .from(webshopStoreConfig)
    .where(eq(webshopStoreConfig.id, 1))
    .limit(1);

  const warehouseId = input.warehouseId || cfg?.defaultWarehouseId || 'WH-01';
  const autoCreateStockOut = Boolean(cfg?.autoCreateStockOut);

  let calculatedSubtotal = 0;
  const processedItems: Array<{
    id: string;
    productId: string;
    productSku: string;
    productName: string;
    qty: number;
    uomId: string;
    uomName: string;
    unitPrice: number;
    totalPrice: number;
  }> = [];

  for (const item of input.items) {
    const itemId = item.id || `wsi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const [prod] = await drizzle
      .select()
      .from(products)
      .where(eq(products.id, item.productId))
      .limit(1);

    if (!prod) {
      throw new Error(`Sản phẩm với ID ${item.productId} không tồn tại.`);
    }

    const qty = Number(item.qty || 0);
    const unitPrice = item.unitPrice !== undefined ? toVndInteger(item.unitPrice) : toVndInteger(prod.averageCost || 0);
    const lineTotal = toVndInteger(qty * unitPrice);

    calculatedSubtotal += lineTotal;
    processedItems.push({
      id: itemId,
      productId: prod.id,
      productSku: prod.sku,
      productName: prod.name,
      qty,
      uomId: item.uomId || prod.uomId || 'CAI',
      uomName: item.uomName || 'Cái',
      unitPrice,
      totalPrice: lineTotal,
    });
  }

  const discount = toVndInteger(input.discountAmount || 0);
  const shipping = toVndInteger(input.shippingFee || 0);
  const vatRate = Number(input.vatRate || 0);
  const vatAmount = toVndInteger((calculatedSubtotal - discount) * vatRate);
  const totalAmount = calculatedSubtotal - discount + shipping + vatAmount;

  let linkedStockTxId: string | null = null;

  if (autoCreateStockOut && warehouseId && processedItems.length > 0) {
    const stockRes = await executeStockTransaction(db, {
      type: 'OUT',
      warehouseId,
      customerId: input.customerId,
      referenceNo: `PX-${input.orderCode}`,
      notes: `Tự động xuất kho cho Đơn hàng Webshop ${input.orderCode}`,
      partnerName: input.customerName,
      details: processedItems.map((p) => ({
        productId: p.productId,
        qty: p.qty,
        unitPrice: p.unitPrice,
      })),
    });
    linkedStockTxId = stockRes.transactionId;
  }

  const statements: any[] = [];

  statements.push(
    d1.prepare(
      `INSERT INTO webshop_orders (id, order_code, date, customer_name, customer_phone, customer_email, customer_address, customer_id, account_id, shipping_method, payment_method, payment_status, order_status, warehouse_id, subtotal, discount_amount, shipping_fee, vat_rate, vat_amount, total_amount, stock_tx_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      orderId, input.orderCode, orderDate,
      input.customerName, input.customerPhone, input.customerEmail || null, input.customerAddress,
      input.customerId || null, input.accountId || null, input.shippingMethod || 'STANDARD', input.paymentMethod || 'COD',
      input.paymentStatus || 'UNPAID', input.orderStatus || 'PENDING',
      warehouseId, calculatedSubtotal, discount, shipping, vatRate, vatAmount, totalAmount,
      linkedStockTxId, input.notes || ''
    )
  );

  for (const item of processedItems) {
    statements.push(
      d1.prepare(
        `INSERT INTO webshop_order_items (id, order_id, product_id, product_sku, product_name, qty, uom_id, uom_name, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        item.id, orderId, item.productId, item.productSku, item.productName,
        item.qty, item.uomId, item.uomName, item.unitPrice, item.totalPrice
      )
    );
  }

  if (statements.length > 0) {
    await d1.batch(statements);
  }

  return {
    success: true,
    orderId,
    orderCode: input.orderCode,
    subtotal: calculatedSubtotal,
    totalAmount,
    stockTxId: linkedStockTxId,
  };
}