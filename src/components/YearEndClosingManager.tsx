/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MockDatabase } from '../db/mockDb';
import { User } from '../types';
import { canViewPurchaseCost } from '../utils/rbac';
import { Num } from '../utils/format';
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Calendar,
  ShieldCheck,
  FileCheck,
  BookOpen,
  PackageCheck,
  History,
  ArrowRight,
} from 'lucide-react';

interface YearEndClosingManagerProps {
  db: MockDatabase;
  onUpdate: () => void;
  currentUser?: User | null;
}

const currentSystemYear = new Date().getFullYear();
const CLOSING_YEARS = [
  currentSystemYear - 2,
  currentSystemYear - 1,
  currentSystemYear,
  currentSystemYear + 1,
];

export default function YearEndClosingManager({
  db,
  onUpdate,
  currentUser,
}: YearEndClosingManagerProps) {
  const canViewCost = canViewPurchaseCost(currentUser, db.roles);
  const [fiscalYear, setFiscalYear] = useState<number>(currentSystemYear);
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const checklist = db.getPreClosingChecklist(fiscalYear);
  const nextYear = fiscalYear + 1;

  const handleConfirmAllDrafts = () => {
    let confirmedCount = 0;
    for (const draft of checklist.draftTransactions) {
      const res =
        draft.type === 'IN'
          ? db.confirmStockIn(draft.id)
          : db.confirmStockOut(draft.id);
      if (res.success) confirmedCount++;
    }
    onUpdate();
    setFeedback({
      type: 'info',
      text: `Đã tự động xác nhận ${confirmedCount}/${checklist.draftTransactions.length} chứng từ nháp trong năm ${fiscalYear}!`,
    });
  };

  const handleAutoSyncOpeningWithPrior = () => {
    const priorYear = fiscalYear - 1;
    const activeWarehouses =
      db.warehouses.length > 0 ? db.warehouses : [{ id: 'wh-1', name: 'Kho Chính' }];

    for (const wh of activeWarehouses) {
      const priorClosing = db.getYearClosingStock(priorYear, wh.id);
      const lines = db.products.map((p) => {
        const item = priorClosing.find((c) => c.productId === p.id);
        return {
          productId: p.id,
          qty: item?.qty || 0,
          unitCost: item?.unitCost || p.averageCost || 0,
        };
      });
      db.saveOpeningStockBalance({
        fiscalYear,
        warehouseId: wh.id,
        lines,
        notes: `Đồng bộ tự động số dư tồn đầu kỳ ${fiscalYear} khớp 100% với cuối kỳ ${priorYear}`,
      });
    }
    onUpdate();
    setFeedback({
      type: 'success',
      text: `Đã đồng bộ Số dư tồn đầu kỳ năm ${fiscalYear} khớp 100% với Số dư cuối kỳ năm ${priorYear}!`,
    });
  };

  const handleExecuteClosing = () => {
    const res = db.performYearEndClosing(
      fiscalYear,
      closingNotes.trim() ||
        `Kết chuyển doanh thu, giá vốn, chi phí xác định KQKD và khóa sổ tồn kho cuối năm ${fiscalYear} chuyển sang đầu kỳ ${nextYear}`
    );
    setShowConfirmModal(false);
    setFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
    if (res.success) {
      onUpdate();
    }
  };

  const handleUnlockYear = (yearToUnlock: number) => {
    const res = db.unlockFiscalYear(yearToUnlock);
    setFeedback({
      type: res.success ? 'info' : 'error',
      text: res.message,
    });
    if (res.success) {
      onUpdate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Fiscal Year Selector */}
      <div className="bg-[#11141b] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <Lock className="w-4 h-4" />
              <span>Quy trình Khóa Sổ Kế Toán & Kết Chuyển Tồn Kho Cuối Năm</span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Kết Chuyển & Khóa Sổ Năm Tài Chính {fiscalYear}
            </h3>
            
             <p className="text-xs text-slate-400">
            
            </p> 
            
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[#161a23] border border-white/10 rounded-xl px-3.5 py-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400 font-semibold">Chọn năm khóa sổ:</span>
              <select
                value={fiscalYear}
                onChange={(e) => {
                  setFiscalYear(Number(e.target.value));
                  setFeedback(null);
                }}
                className="bg-transparent text-xs font-bold text-white focus:outline-none font-mono"
              >
                {CLOSING_YEARS.map((y) => (
                  <option key={y} value={y} className="bg-[#11141b] text-white">
                    Năm tài chính {y} (Chốt 31/12/{y})
                  </option>
                ))}
              </select>
            </div>

            {checklist.isAlreadyLocked ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-xl">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Đã khóa sổ năm {fiscalYear}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleUnlockYear(fiscalYear)}
                  className="text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Mở khóa sổ để điều chỉnh</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!checklist.canClose}
                onClick={() => setShowConfirmModal(true)}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-500/15"
              >
                <Lock className="w-4 h-4" />
                <span>Kết chuyển & Khóa sổ năm {fiscalYear}</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-start justify-between gap-3 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : feedback.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span className="font-semibold leading-relaxed">{feedback.text}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-white font-bold px-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Step 1: Pre-Closing Audit Checklist */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Bước 1. Kiểm tra điều kiện an toàn trước khi khóa sổ cuối năm {fiscalYear}</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Check 1: Draft Vouchers */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                checklist.draftTransactions.length === 0
                  ? 'bg-black/25 border-white/5'
                  : 'bg-amber-500/5 border-amber-500/25'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {checklist.draftTransactions.length === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold text-white">1. Kiểm tra chứng từ Nháp (Chưa xác nhận)</p>
                  <p className="text-slate-400 mt-0.5">
                    {checklist.draftTransactions.length === 0
                      ? `Tất cả chứng từ nhập/xuất năm ${fiscalYear} đã được duyệt ghi sổ.`
                      : `Còn ${checklist.draftTransactions.length} chứng từ nháp chưa xác nhận (${checklist.draftTransactions.map((d) => d.referenceNo).join(', ')}).`}
                  </p>
                </div>
              </div>
              {checklist.draftTransactions.length > 0 && !checklist.isAlreadyLocked && (
                <button
                  type="button"
                  onClick={handleConfirmAllDrafts}
                  className="shrink-0 bg-amber-500 hover:bg-amber-400 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] transition"
                >
                  Duyệt ngay ({checklist.draftTransactions.length})
                </button>
              )}
            </div>

            {/* Check 2: General Ledger Trial Balance */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                checklist.isTrialBalanced
                  ? 'bg-black/25 border-white/5'
                  : 'bg-rose-500/5 border-rose-500/25'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {checklist.isTrialBalanced ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold text-white">2. Kiểm tra cân đối Sổ Cái (Nợ = Có)</p>
                  <p className="text-slate-400 mt-0.5 font-mono tabular-nums">
                    Phát sinh Nợ: {checklist.totalPeriodDebit.toLocaleString()}đ · Phát sinh Có:{' '}
                    {checklist.totalPeriodCredit.toLocaleString()}đ
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 shrink-0">
                {checklist.isTrialBalanced ? 'Cân đối 100%' : 'Lệch sổ'}
              </span>
            </div>

            {/* Check 3: Prior Year Opening Match */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                checklist.isOpeningMatchedWithPrior
                  ? 'bg-black/25 border-white/5'
                  : 'bg-rose-500/5 border-rose-500/25'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {checklist.isOpeningMatchedWithPrior ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold text-white">
                    3. Khớp Tồn đầu kỳ {fiscalYear} với Cuối kỳ {fiscalYear - 1}
                  </p>
                  <p className="text-slate-400 mt-0.5">
                    {checklist.isOpeningMatchedWithPrior
                      ? `Số dư đầu kỳ ${fiscalYear} khớp 100% với cuối kỳ ${fiscalYear - 1}.`
                      : `Số dư đầu kỳ ${fiscalYear} đang lệch so với cuối kỳ ${fiscalYear - 1}.`}
                  </p>
                </div>
              </div>
              {!checklist.isOpeningMatchedWithPrior && !checklist.isAlreadyLocked && (
                <button
                  type="button"
                  onClick={handleAutoSyncOpeningWithPrior}
                  className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] transition"
                >
                  Đồng bộ khớp ngay
                </button>
              )}
            </div>

            {/* Check 4: Negative Stock Check */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                checklist.negativeStockItems.length === 0
                  ? 'bg-black/25 border-white/5'
                  : 'bg-amber-500/5 border-amber-500/25'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {checklist.negativeStockItems.length === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold text-white">4. Kiểm tra hàng tồn kho âm (31/12/{fiscalYear})</p>
                  <p className="text-slate-400 mt-0.5">
                    {checklist.negativeStockItems.length === 0
                      ? 'Không có mặt hàng nào bị âm kho cuối kỳ.'
                      : `Có ${checklist.negativeStockItems.length} mặt hàng đang âm kho cuối kỳ.`}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 shrink-0">
                {checklist.negativeStockItems.length === 0 ? 'Hợp lệ' : 'Cần kiểm tra'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2 & Step 3 Grid: Accounting P&L Closing + Inventory Carry-Forward */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 2: Accounting Closing Entries */}
        <div className="bg-[#11141b] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">
                Bước 2. Bút toán Kết chuyển Kế toán Cuối năm (31/12/{fiscalYear})
              </h4>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              KC-{fiscalYear}-1231
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Hệ thống tự động kết chuyển toàn bộ số dư các tài khoản Doanh thu (loại 5), Chi phí & Giá vốn (loại 6) sang Tài khoản 911 để tất toán về 0, và kết chuyển Lãi/Lỗ thuần vào Tài khoản 421 (Lợi nhuận sau thuế chưa phân phối).
          </p>

          <div className="overflow-x-auto border border-white/5 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-black/40 border-b border-white/10 text-slate-400 font-semibold">
                  <th className="p-2.5">Nội dung bút toán kết chuyển</th>
                  <th className="p-2.5 text-center">TK Nợ</th>
                  <th className="p-2.5 text-center">TK Có</th>
                  <th className="p-2.5 text-right">Số tiền kết chuyển</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="p-2.5 text-slate-200 font-medium">
                    1. Kết chuyển Doanh thu bán hàng thuần
                  </td>
                  <td className="p-2.5 text-center font-mono font-bold text-emerald-400">511</td>
                  <td className="p-2.5 text-center font-mono font-bold text-slate-300">911</td>
                  <td className="p-2.5 text-right font-mono tabular-nums font-bold text-white">
                    {checklist.revenueToClose.toLocaleString()}đ
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 text-slate-200 font-medium">
                    2. Kết chuyển Giá vốn hàng bán trong năm
                  </td>
                  <td className="p-2.5 text-center font-mono font-bold text-emerald-400">911</td>
                  <td className="p-2.5 text-center font-mono font-bold text-slate-300">632</td>
                  <td className="p-2.5 text-right font-mono tabular-nums font-bold text-white">
                    {canViewCost ? `${checklist.cogsToClose.toLocaleString()}đ` : '***'}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 text-slate-200 font-medium">
                    3. Kết chuyển Chi phí quản lý doanh nghiệp
                  </td>
                  <td className="p-2.5 text-center font-mono font-bold text-emerald-400">911</td>
                  <td className="p-2.5 text-center font-mono font-bold text-slate-300">642</td>
                  <td className="p-2.5 text-right font-mono tabular-nums font-bold text-white">
                    {checklist.expenseToClose.toLocaleString()}đ
                  </td>
                </tr>
                <tr className="bg-emerald-500/5">
                  <td className="p-2.5 text-white font-bold">
                    4. Kết chuyển {checklist.netProfitToClose >= 0 ? 'Lãi' : 'Lỗ'} thuần vào LN chưa phân phối
                  </td>
                  <td className="p-2.5 text-center font-mono font-bold text-emerald-400">
                    {checklist.netProfitToClose >= 0 ? '911' : '421'}
                  </td>
                  <td className="p-2.5 text-center font-mono font-bold text-emerald-400">
                    {checklist.netProfitToClose >= 0 ? '421' : '911'}
                  </td>
                  <td className="p-2.5 text-right font-mono tabular-nums font-bold text-emerald-400">
                    {canViewCost
                      ? `${Math.abs(checklist.netProfitToClose).toLocaleString()}đ`
                      : '***'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Step 3: Inventory Carry-Forward Preview */}
        <div className="bg-[#11141b] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">
                Bước 3. Kết chuyển Tồn kho 31/12/{fiscalYear} → Đầu kỳ 01/01/{nextYear}
              </h4>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              SDDK-{nextYear}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Toàn bộ lượng tồn kho và giá trị vốn bình quân tại thời điểm 31/12/{fiscalYear} được chốt sổ và tự động tạo chứng từ Tồn đầu kỳ ngày 01/01/{nextYear}, đảm bảo khớp chính xác 100% giữa hai năm tài chính.
          </p>

          <div className="overflow-x-auto max-h-60 border border-white/5 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#11141b]">
                <tr className="bg-black/40 border-b border-white/10 text-slate-400 font-semibold">
                  <th className="p-2.5">Mã SKU</th>
                  <th className="p-2.5">Tên hàng hóa</th>
                  <th className="p-2.5 text-right">SL Chuyển sang {nextYear}</th>
                  <th className="p-2.5 text-right">Giá trị chuyển sang {nextYear}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {checklist.closingStockRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500">
                      Chưa có mặt hàng tồn kho
                    </td>
                  </tr>
                ) : (
                  checklist.closingStockRows.map((r) => (
                    <tr key={r.productId} className="hover:bg-white/[0.02]">
                      <td className="p-2.5 font-mono font-bold text-emerald-400">{r.sku}</td>
                      <td className="p-2.5 text-slate-200 font-medium">{r.productName}</td>
                      <td className="p-2.5 text-right font-mono tabular-nums font-bold text-white">
                        <Num value={r.closingQty} /> {r.uomName}
                      </td>
                      <td className="p-2.5 text-right font-mono tabular-nums text-slate-300">
                        {canViewCost ? <Num value={r.closingValue} suffix="đ" /> : '***'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-black/50 border-t border-white/10 font-bold text-white">
                  <td colSpan={2} className="p-2.5 text-right text-slate-400">
                    Tổng cộng chuyển sang 01/01/{nextYear}:
                  </td>
                  <td className="p-2.5 text-right font-mono tabular-nums text-emerald-400">
                    {checklist.totalClosingStockQty.toLocaleString()} ĐVT
                  </td>
                  <td className="p-2.5 text-right font-mono tabular-nums text-emerald-400">
                    {canViewCost ? `${checklist.totalClosingStockValue.toLocaleString()}đ` : '***'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* History of Closed Fiscal Years */}
      <div className="bg-[#11141b] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">
              Nhật ký Khóa sổ & Kết chuyển Cuối năm Các Kỳ Kế Toán
            </h4>
          </div>
          <span className="text-xs text-slate-400">
            {(db.fiscalClosings || []).length} kỳ đã thực hiện
          </span>
        </div>

        {(db.fiscalClosings || []).length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            Chưa có kỳ kế toán năm nào được khóa sổ. Chọn năm tài chính và nhấn "Kết chuyển & Khóa sổ" ở trên để thực hiện.
          </p>
        ) : (
          <div className="overflow-x-auto border border-white/5 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-black/40 border-b border-white/10 text-slate-400 font-semibold">
                  <th className="p-3">Kỳ năm</th>
                  <th className="p-3">Ngày khóa sổ</th>
                  <th className="p-3">Người thực hiện</th>
                  <th className="p-3 text-right">Doanh thu kết chuyển</th>
                  <th className="p-3 text-right">Lợi nhuận kết chuyển (421)</th>
                  <th className="p-3 text-right">Tồn kho chuyển sang năm sau</th>
                  <th className="p-3 text-center">Trạng thái</th>
                  <th className="p-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(db.fiscalClosings || []).map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02]">
                    <td className="p-3 font-mono font-bold text-white">
                      Năm {c.fiscalYear} → {c.fiscalYear + 1}
                    </td>
                    <td className="p-3 font-mono text-slate-400">
                      {new Date(c.closedAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-3 text-slate-300 font-medium">{c.closedBy}</td>
                    <td className="p-3 text-right font-mono tabular-nums text-slate-200">
                      {c.totalRevenueTransferred.toLocaleString()}đ
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums font-bold text-emerald-400">
                      {canViewCost ? <Num value={c.netProfitTransferred} suffix="đ" /> : '***'}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums text-white">
                      <Num value={c.totalClosingStockQty} /> ĐVT
                      {canViewCost && (
                        <span className="text-slate-400 ml-1">
                          (<Num value={c.totalClosingStockValue} suffix="đ" />)
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {c.status === 'LOCKED' ? (
                        <span className="text-emerald-400 font-bold">Đã khóa sổ</span>
                      ) : (
                        <span className="text-amber-400 font-bold">Đã mở khóa</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {c.status === 'LOCKED' ? (
                        <button
                          type="button"
                          onClick={() => handleUnlockYear(c.fiscalYear)}
                          className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                        >
                          Mở khóa
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setFiscalYear(c.fiscalYear);
                            setShowConfirmModal(true);
                          }}
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                        >
                          Khóa sổ lại
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141b] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-emerald-400">
              <Lock className="w-5 h-5" />
              <h4 className="text-base font-bold text-white">
                Xác nhận Kết chuyển Cuối năm & Khóa sổ Năm {fiscalYear}
              </h4>
            </div>

            <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                Hệ thống sẽ thực hiện đồng thời các nghiệp vụ khóa sổ cuối năm <strong>{fiscalYear}</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>
                  Sinh bút toán kết chuyển <strong className="text-white">KC-{fiscalYear}-1231</strong> tất toán TK 511, 632, 642 sang TK 911 và kết chuyển KQKD vào TK 421.
                </li>
                <li>
                  Chốt số dư tồn kho cuối kỳ ngày <strong className="text-white">31/12/{fiscalYear}</strong> ({checklist.totalClosingStockQty.toLocaleString()} ĐVT) và tự động tạo chứng từ Tồn đầu kỳ <strong className="text-emerald-400">SDDK-{nextYear}</strong> ngày <strong className="text-white">01/01/{nextYear}</strong> khớp 100%.
                </li>
                <li>
                  Khóa kỳ kế toán năm {fiscalYear} để bảo vệ toàn vẹn dữ liệu lịch sử.
                </li>
              </ul>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1.5">
                Ghi chú khóa sổ (tùy chọn)
              </label>
              <input
                type="text"
                placeholder={`Khóa sổ kế toán và kết chuyển tồn kho cuối năm ${fiscalYear}...`}
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                className="w-full text-xs bg-[#161a23] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-200 hover:text-white bg-white/[0.07] rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteClosing}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-400 rounded-xl transition flex items-center gap-1.5"
              >
                <FileCheck className="w-4 h-4" />
                <span>Xác nhận Kết chuyển & Khóa sổ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
