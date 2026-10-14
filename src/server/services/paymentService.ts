/**
 * PAYMENT SERVICE FOR D1 (NO TRANSACTIONS)
 * Uses D1 batch API for atomic writes
 * Quản lý Phiếu Thu (PT) / Phiếu Chi (PC), Công nợ & Bút toán Sổ Nhật ký chung
 */

import { eq } from 'drizzle-orm';
import {
  payments,
  debts,
  journalEntries,
  journalEntryLines,
  toVndInteger,
} from '../../db/schema';
import type { DrizzleD1Database } from '../../db/d1Client';
import type { D1Database } from '../../db/d1Client';

function getDrizzle(db: DrizzleD1Database | D1Database): DrizzleD1Database {
  return 'transaction' in db ? db as DrizzleD1Database : undefined as any;
}

function getD1(db: DrizzleD1Database | D1Database): D1Database {
  return 'transaction' in db ? (db as DrizzleD1Database).$client : db as D1Database;
}

export interface CreatePaymentInput {
  id?: string;
  type: 'RECEIVE' | 'PAY';
  debtId?: string;
  partnerId: string;
  partnerType: 'SUPPLIER' | 'CUSTOMER';
  date?: string;
  amount: number;
  method: 'CASH' | 'BANK' | 'OTHER';
  referenceNo: string;
  notes?: string;
}

export async function executePaymentTransaction(
  db: DrizzleD1Database | D1Database,
  input: CreatePaymentInput
) {
  const drizzle = getDrizzle(db);
  const d1 = getD1(db);

  const payId = input.id || `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const payDate = input.date || new Date().toISOString().split('T')[0];
  const amount = toVndInteger(input.amount);

  if (amount <= 0) {
    throw new Error('Số tiền thanh toán phải lớn hơn 0 VNĐ.');
  }

  let newPaid = amount;
  let newStatus = 'PAID';

  if (input.debtId) {
    const [debtRow] = await drizzle
      .select()
      .from(debts)
      .where(eq(debts.id, input.debtId))
      .limit(1);

    if (debtRow) {
      const currentPaid = toVndInteger(debtRow.paidAmount || 0);
      const debtTotal = toVndInteger(debtRow.amount || 0);
      newPaid = currentPaid + amount;
      newStatus = newPaid >= debtTotal ? 'PAID' : 'PARTIAL';
    }
  }

  const statements: any[] = [];

  statements.push(
    d1.prepare(
      `INSERT INTO payments (id, type, debt_id, partner_id, partner_type, date, amount, method, reference_no, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      payId, input.type, input.debtId || null, input.partnerId,
      input.partnerType, payDate, amount, input.method,
      input.referenceNo, input.notes || ''
    )
  );

  if (input.debtId) {
    statements.push(
      d1.prepare(
        `UPDATE debts SET paid_amount = ?, status = ? WHERE id = ?`
      ).bind(newPaid, newStatus, input.debtId)
    );
  }

  const jeId = `je-${payId}`;
  const accountCashOrBank = input.method === 'BANK' ? '112' : '111';

  statements.push(
    d1.prepare(
      `INSERT INTO journal_entries (id, date, reference_no, description, fiscal_year)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(
      jeId, payDate, input.referenceNo,
      input.notes || `${input.type === 'RECEIVE' ? 'Thu tiền' : 'Chi tiền'} theo phiếu ${input.referenceNo}`,
      new Date(payDate).getFullYear()
    )
  );

  if (input.type === 'RECEIVE') {
    statements.push(
      d1.prepare(
        `INSERT INTO journal_entry_lines (id, entry_id, account_code, debit, credit, partner_id, partner_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(`jel-${jeId}-1`, jeId, accountCashOrBank, amount, 0, input.partnerId, 'CUSTOMER')
    );
    statements.push(
      d1.prepare(
        `INSERT INTO journal_entry_lines (id, entry_id, account_code, debit, credit, partner_id, partner_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(`jel-${jeId}-2`, jeId, '131', 0, amount, input.partnerId, 'CUSTOMER')
    );
  } else {
    statements.push(
      d1.prepare(
        `INSERT INTO journal_entry_lines (id, entry_id, account_code, debit, credit, partner_id, partner_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(`jel-${jeId}-1`, jeId, '331', amount, 0, input.partnerId, 'SUPPLIER')
    );
    statements.push(
      d1.prepare(
        `INSERT INTO journal_entry_lines (id, entry_id, account_code, debit, credit, partner_id, partner_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(`jel-${jeId}-2`, jeId, accountCashOrBank, 0, amount, input.partnerId, 'SUPPLIER')
    );
  }

  if (statements.length > 0) {
    await d1.batch(statements);
  }

  return {
    success: true,
    paymentId: payId,
    referenceNo: input.referenceNo,
    amount,
  };
}