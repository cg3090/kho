import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

export type PaymentRequest = {
  id?: string;
  type: 'RECEIVE' | 'PAY';
  debtId?: string;
  partnerId: string;
  partnerType: 'CUSTOMER' | 'SUPPLIER';
  date?: string;
  amount: number;
  method: 'CASH' | 'BANK' | 'OTHER';
  referenceNo: string;
  notes?: string;
};

export async function createPostgresPayment(db: PrismaClient, input: PaymentRequest) {
  if (!input || !['RECEIVE', 'PAY'].includes(input.type) ||
      !['CUSTOMER', 'SUPPLIER'].includes(input.partnerType) ||
      !['CASH', 'BANK', 'OTHER'].includes(input.method) ||
      typeof input.partnerId !== 'string' || !input.partnerId.trim() ||
      typeof input.referenceNo !== 'string' || !input.referenceNo.trim() ||
      !Number.isSafeInteger(input.amount) || input.amount <= 0 ||
      input.amount > 9_000_000_000_000_000) {
    throw new Error('Thông tin thanh toán không hợp lệ');
  }
  if ((input.type === 'RECEIVE' && input.partnerType !== 'CUSTOMER') ||
      (input.type === 'PAY' && input.partnerType !== 'SUPPLIER')) {
    throw new Error('Loại đối tác không phù hợp với phiếu thu/chi');
  }
  const dateText = input.date || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) throw new Error('Ngày thanh toán không hợp lệ');
  const date = new Date(dateText + 'T00:00:00.000Z');
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateText) throw new Error('Ngày không hợp lệ');
  const id = input.id || 'pay-' + crypto.randomUUID();
  const jeId = 'je-' + id;
  const amount = new Prisma.Decimal(input.amount);
  const cash = input.method === 'BANK' ? '112' : '111';
  const debit = input.type === 'RECEIVE' ? cash : '331';
  const credit = input.type === 'RECEIVE' ? '131' : cash;

  return db.$transaction(async (tx) => {
    // PostgreSQL row lock ensures concurrent payments cannot overpay the same debt.
    if (input.debtId) {
      const rows = await tx.$queryRaw<{ id: string; amount: Prisma.Decimal; paid_amount: Prisma.Decimal; partner_id: string; type: string; is_reversed: boolean }[]>`
        SELECT id, amount, paid_amount, partner_id, type, is_reversed
        FROM debts WHERE id = ${input.debtId} FOR UPDATE
      `;
      const debt = rows[0];
      if (!debt || debt.is_reversed || debt.partner_id !== input.partnerId ||
          (input.type === 'RECEIVE' ? debt.type !== 'AR' : debt.type !== 'AP')) {
        throw new Error('Công nợ không hợp lệ hoặc không khớp đối tác');
      }
      const total = new Prisma.Decimal(debt.amount);
      const paid = new Prisma.Decimal(debt.paid_amount);
      const next = paid.add(amount);
      if (next.gt(total)) throw new Error('Số tiền thanh toán vượt quá công nợ');
      await tx.debt.update({
        where: { id: debt.id },
        data: { paidAmount: next, status: next.eq(total) ? 'PAID' : 'PARTIAL' },
      });
    }
    const accounts = await tx.chartOfAccount.findMany({ where: { code: { in: [debit, credit] } }, select: { code: true } });
    if (!accounts.some(a => a.code === debit) || !accounts.some(a => a.code === credit)) {
      throw new Error('Thiếu tài khoản hạch toán ' + debit + ' hoặc ' + credit);
    }
    await tx.payment.create({
      data: {
        id, type: input.type, debtId: input.debtId || null, partnerId: input.partnerId,
        partnerType: input.partnerType, date, amount, method: input.method,
        referenceNo: input.referenceNo, notes: input.notes || '',
      },
    });
    await tx.journalEntry.create({
      data: {
        id: jeId, date, referenceNo: input.referenceNo,
        description: input.notes || (input.type === 'RECEIVE' ? 'Phiếu thu ' : 'Phiếu chi ') + input.referenceNo,
        fiscalYear: date.getUTCFullYear(),
        lines: {
          create: [
            { id: 'jel-' + jeId + '-1', accountCode: debit, debit: amount, credit: 0, partnerId: input.partnerId, partnerType: input.partnerType },
            { id: 'jel-' + jeId + '-2', accountCode: credit, debit: 0, credit: amount, partnerId: input.partnerId, partnerType: input.partnerType },
          ],
        },
      },
    });
    return { success: true, paymentId: id, referenceNo: input.referenceNo, amount: input.amount };
  }, { maxWait: 5000, timeout: 10000 });
}
