/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MockDatabase } from '../db/mockDb';
import { User } from '../types';
import { canViewPurchaseCost } from '../utils/rbac';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Lock,
  Layers,
  Calendar,
  Search,
  Check,
  ArrowRight,
  ShieldCheck,
  Warehouse as WarehouseIcon,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import ExcelImportModal from './ExcelImportModal';
import { downloadExcelTemplate, exportDataToExcel } from '../utils/excelHelper';

interface OpeningStockManagerProps {
  db: MockDatabase;
  onUpdate: () => void;
  updateTrigger?: number;
  currentUser?: User | null;
}

const currentSystemYear = new Date().getFullYear();
const AVAILABLE_YEARS = [
  currentSystemYear - 2,
  currentSystemYear - 1,
  currentSystemYear,
  currentSystemYear + 1,
];

export default function OpeningStockManager({
  db,
  onUpdate,
  updateTrigger,
  currentUser,
}: OpeningStockManagerProps) {
  const canViewCost = canViewPurchaseCost(currentUser, db.roles);

  const [fiscalYear, setFiscalYear] = useState<number>(currentSystemYear);
  const [warehouseId, setWarehouseId] = useState<string>(db.warehouses[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [notes, setNotes] = useState<string>('');
  const [showExcelModal, setShowExcelModal] = useState<boolean>(false);

  // Editable lines: productId -> { qty, unitCost }
  const [lineInputs, setLineInputs] = useState<
    Record<string, { qty: number; unitCost: number }>
  >({});

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Sync warehouseId if warehouses change
  useEffect(() => {
    if (!warehouseId && db.warehouses.length > 0) {
      setWarehouseId(db.warehouses[0].id);
    }
  }, [db.warehouses, warehouseId]);

  const priorYear = fiscalYear - 1;
  const priorHasData = warehouseId ? db.hasPriorYearData(fiscalYear, warehouseId) : false;
  const priorClosingStock = warehouseId ? db.getYearClosingStock(priorYear, warehouseId) : [];
  const existingOpeningVoucher = warehouseId
    ? db.getOpeningStockVoucher(fiscalYear, warehouseId)
    : { details: [] };
  const yearLockInfo = db.isDateInLockedYear(`${fiscalYear}-01-01`);

  // Load initial values into lineInputs when fiscalYear or warehouseId changes
  useEffect(() => {
    if (!warehouseId) return;
    const existing = db.getOpeningStockVoucher(fiscalYear, warehouseId);
    const nextInputs: Record<string, { qty: number; unitCost: number }> = {};

    for (const prod of db.products) {
      const detail = existing.details.find((d) => d.productId === prod.id);
      if (detail) {
        nextInputs[prod.id] = {
          qty: detail.qty,
          unitCost: detail.unitPrice,
        };
      } else {
        nextInputs[prod.id] = {
          qty: 0,
          unitCost: prod.averageCost || 0,
        };
      }
    }

    setLineInputs(nextInputs);
    setNotes(
      existing.tx?.notes ||
        (db.hasPriorYearData(fiscalYear, warehouseId)
          ? `Số dư tồn đầu kỳ năm ${fiscalYear} (Khớp chính xác với số dư cuối kỳ 31/12/${fiscalYear - 1})`
          : `Khai báo số dư tồn kho đầu kỳ năm ${fiscalYear}`)
    );
  }, [fiscalYear, warehouseId, db.products.length, updateTrigger, db.version]);

  const handleSyncFromPriorYear = () => {
    if (!warehouseId) return;
    const closingList = db.getYearClosingStock(priorYear, warehouseId);
    const synced: Record<string, { qty: number; unitCost: number }> = {};

    for (const prod of db.products) {
      const item = closingList.find((c) => c.productId === prod.id);
      synced[prod.id] = {
        qty: item?.qty || 0,
        unitCost: item?.unitCost || prod.averageCost || 0,
      };
    }

    setLineInputs(synced);
    setStatusMessage({
      type: 'info',
      text: `Đã lấy toàn bộ số dư tồn cuối kỳ ngày 31/12/${priorYear} sang bảng nhập tồn đầu kỳ 01/01/${fiscalYear}. Nhấn "Lưu & Xác nhận Tồn đầu kỳ" để ghi sổ!`,
    });
  };

  const handleMatchSingleRow = (productId: string, expectedQty: number, expectedCost: number) => {
    setLineInputs((prev) => ({
      ...prev,
      [productId]: {
        qty: expectedQty,
        unitCost: expectedCost,
      },
    }));
  };

  const handleInputChange = (
    productId: string,
    field: 'qty' | 'unitCost',
    val: string
  ) => {
    const num = val === '' ? 0 : Math.max(0, Number(val));
    setLineInputs((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || { qty: 0, unitCost: 0 }),
        [field]: num,
      },
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId) {
      setStatusMessage({
        type: 'error',
        text: 'Vui lòng chọn kho hàng trước khi lưu số dư tồn đầu kỳ!',
      });
      return;
    }

    const lines = db.products.map((p) => ({
      productId: p.id,
      qty: lineInputs[p.id]?.qty || 0,
      unitCost: lineInputs[p.id]?.unitCost || 0,
    }));

    const result = db.saveOpeningStockBalance({
      fiscalYear,
      warehouseId,
      lines,
      notes,
    });

    setStatusMessage({
      type: result.success ? 'success' : 'error',
      text: result.message,
    });

    if (result.success) {
      onUpdate();
    }
  };

  // Filtered products for display
  const filteredProducts = db.products.filter((p) => {
    if (categoryFilter !== 'ALL' && p.categoryId !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
    }
    return true;
  });

  // Compute totals and comparison stats
  let totalEnteredQty = 0;
  let totalEnteredValue = 0;
  let totalPriorQty = 0;
  let totalPriorValue = 0;
  let mismatchCount = 0;

  for (const prod of db.products) {
    const entered = lineInputs[prod.id] || { qty: 0, unitCost: 0 };
    const enteredVal = Math.round(entered.qty * entered.unitCost);
    totalEnteredQty += entered.qty;
    totalEnteredValue += enteredVal;

    const prior = priorClosingStock.find((c) => c.productId === prod.id);
    const expQty = prior?.qty || 0;
    const expVal = prior?.totalValue || 0;
    totalPriorQty += expQty;
    totalPriorValue += expVal;

    if (priorHasData) {
      const qtyDiff = entered.qty !== expQty;
      const valDiff = expQty > 0 && Math.abs(enteredVal - expVal) > Math.max(10, expQty);
      if (qtyDiff || valDiff) {
        mismatchCount++;
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#11141b] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <Layers className="w-4 h-4" />
              <span>Khai báo & Đối chiếu Số dư Tồn Kho Đầu Kỳ (01/01/{fiscalYear})</span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Nhập Số Dư Tồn Đầu Kỳ Năm Tài Chính {fiscalYear}
            </h3>
            <p className="text-xs text-slate-400">
              Nguyên tắc kế toán liên tục: Số dư tồn đầu kỳ năm nay ({fiscalYear}) phải khớp chính xác 100% với số dư tồn cuối kỳ của năm trước ({priorYear}).
            </p>
          </div>

          {/* Year & Warehouse Selectors */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowExcelModal(true)}
              className="flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold px-3.5 py-2 rounded-xl text-xs transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Nhập Tồn Đầu Kỳ từ Excel</span>
            </button>

            <button
              type="button"
              onClick={() => downloadExcelTemplate('opening_stock')}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold px-3 py-2 rounded-xl text-xs transition"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tải Mẫu</span>
            </button>

            <button
              type="button"
              onClick={() => exportDataToExcel(db, 'opening_stock')}
              className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-semibold px-3 py-2 rounded-xl text-xs transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất Excel</span>
            </button>

            <div className="flex items-center gap-2 bg-[#161a23] border border-white/10 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400 font-semibold">Năm tài chính:</span>
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-white focus:outline-none font-mono"
              >
                {AVAILABLE_YEARS.map((y) => (
                  <option key={y} value={y} className="bg-[#11141b] text-white">
                    Năm {y} (Đầu kỳ 01/01/{y})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-[#161a23] border border-white/10 rounded-xl px-3 py-2">
              <WarehouseIcon className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400 font-semibold">Kho hàng:</span>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none"
              >
                {db.warehouses.length === 0 ? (
                  <option value="" className="bg-[#11141b] text-slate-400">
                    Chưa có kho hàng
                  </option>
                ) : (
                  db.warehouses.map((w) => (
                    <option key={w.id} value={w.id} className="bg-[#11141b] text-white">
                      {w.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Reconciliation Rule Status Box */}
        {priorHasData ? (
          <div
            className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              mismatchCount === 0
                ? 'bg-emerald-500/5 border-emerald-500/25 text-emerald-300'
                : 'bg-amber-500/5 border-amber-500/25 text-amber-300'
            }`}
          >
            <div className="flex items-start gap-3">
              {mismatchCount === 0 ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-xs">
                <p className="font-bold text-white">
                  {mismatchCount === 0
                    ? `ĐỐI CHIẾU HỢP LỆ: Số dư tồn đầu kỳ 01/01/${fiscalYear} đã KHỚP CHÍNH XÁC 100% với số dư cuối kỳ 31/12/${priorYear}`
                    : `CẢNH BÁO ĐỐI CHIẾU LIÊN KỲ: Phát hiện ${mismatchCount} mặt hàng có số dư đầu kỳ ${fiscalYear} chưa khớp với cuối kỳ ${priorYear}`}
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Hệ thống phát hiện năm {priorYear} đã có dữ liệu giao dịch/chốt sổ (Tổng tồn cuối kỳ 31/12/{priorYear}:{' '}
                  <strong className="text-white font-mono">{totalPriorQty.toLocaleString()}</strong> ĐVT
                  {canViewCost && (
                    <>
                      {' '}
                      · Giá trị:{' '}
                      <strong className="text-emerald-400 font-mono">
                        {totalPriorValue.toLocaleString()}đ
                      </strong>
                    </>
                  )}
                  ). Để đảm bảo tính liên tục của sổ kho, số dư đầu kỳ năm {fiscalYear} bắt buộc phải bằng chính xác số dư cuối kỳ năm {priorYear}.
                </p>
              </div>
            </div>

            {!yearLockInfo.locked && (
              <button
                type="button"
                onClick={handleSyncFromPriorYear}
                className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-500/10"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Đồng bộ 100% từ Cuối kỳ {priorYear}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl border bg-blue-500/5 border-blue-500/20 text-xs flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-white">
                Chế độ Khai báo Số dư Tồn đầu kỳ Ban đầu (Năm {priorYear} chưa có phát sinh)
              </p>
              <p className="text-slate-400 leading-relaxed">
                Năm trước ({priorYear}) chưa có dữ liệu tồn kho trên hệ thống tại kho này. Bạn có thể nhập trực tiếp Số lượng tồn đầu kỳ và Đơn giá vốn cho năm {fiscalYear}. Khi lưu, hệ thống sẽ lập chứng từ{' '}
                <span className="font-mono text-emerald-400 font-bold">SDDK-{fiscalYear}</span>, cập nhật tồn kho & giá vốn bình quân gia quyền, đồng thời tự động ghi nhận bút toán đầu kỳ{' '}
                <span className="font-mono text-slate-200">Nợ TK 1561 / Có TK 411</span>.
              </p>
            </div>
          </div>
        )}

        {/* Summary KPI Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div className="bg-black/25 border border-white/5 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 block">Chứng từ Tồn đầu kỳ {fiscalYear}</span>
            <p className="text-sm font-bold text-white font-mono mt-1">
              {existingOpeningVoucher.tx ? (
                <span className="text-emerald-400">{existingOpeningVoucher.tx.referenceNo} (Đã ghi sổ)</span>
              ) : (
                <span className="text-amber-400">Chưa lưu chứng từ đầu kỳ</span>
              )}
            </p>
          </div>

          <div className="bg-black/25 border border-white/5 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 block">Tổng Lượng Tồn Cuối Kỳ {priorYear}</span>
            <p className="text-base font-bold text-slate-200 font-mono tabular-nums mt-1">
              {priorHasData ? `${totalPriorQty.toLocaleString()} ĐVT` : 'Không có dữ liệu năm trước'}
            </p>
          </div>

          <div className="bg-black/25 border border-white/5 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 block">Tổng Lượng Tồn Đầu Kỳ {fiscalYear}</span>
            <p className="text-base font-bold text-emerald-400 font-mono tabular-nums mt-1">
              {totalEnteredQty.toLocaleString()} ĐVT
            </p>
          </div>

          <div className="bg-black/25 border border-white/5 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 block">Tổng Giá Trị Vốn Đầu Kỳ {fiscalYear}</span>
            <p className="text-base font-bold text-white font-mono tabular-nums mt-1">
              {canViewCost ? `${totalEnteredValue.toLocaleString()}đ` : '*** (Bảo mật)'}
            </p>
          </div>
        </div>
      </div>

      {/* Status feedback banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start justify-between gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="font-semibold leading-relaxed">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white font-bold px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Entry Table */}
      <form
        onSubmit={handleSave}
        className="bg-[#11141b] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-5"
      >
        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhanh theo mã SKU, tên sản phẩm..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#161a23] border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs bg-[#161a23] border border-white/10 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
            >
              <option value="ALL">Tất cả nhóm hàng ({db.products.length})</option>
              {db.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {yearLockInfo.locked ? (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-xl font-bold">
              <Lock className="w-4 h-4" />
              <span>Năm {fiscalYear} đã khóa sổ cuối năm</span>
            </div>
          ) : (
            <button
              type="submit"
              disabled={db.products.length === 0 || !warehouseId}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-500/15"
            >
              <Save className="w-4 h-4" />
              <span>Lưu & Xác nhận Tồn Đầu Kỳ {fiscalYear}</span>
            </button>
          )}
        </div>

        {/* Table */}
        {db.products.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs space-y-2 border border-dashed border-white/10 rounded-xl">
            <p className="font-semibold text-slate-300">Chưa có mặt hàng nào trong Danh mục Sản phẩm</p>
            <p>Vui lòng thêm Hàng hóa và Kho hàng tại mục Danh mục trước khi khai báo số dư tồn đầu kỳ.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-white/5 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-black/40 border-b border-white/10 text-slate-400 font-semibold">
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">Mã SKU</th>
                  <th className="p-3">Tên hàng hóa / Vật tư</th>
                  <th className="p-3 text-center">ĐVT</th>
                  {priorHasData && (
                    <>
                      <th className="p-3 text-right bg-white/[0.02] border-l border-white/5">
                        SL Cuối kỳ {priorYear}
                      </th>
                      <th className="p-3 text-right bg-white/[0.02]">
                        Giá trị Cuối kỳ {priorYear}
                      </th>
                    </>
                  )}
                  <th className="p-3 text-right border-l border-white/5 w-36">
                    SL Đầu kỳ {fiscalYear}
                  </th>
                  <th className="p-3 text-right w-44">
                    Đơn giá vốn Đầu kỳ (đ)
                  </th>
                  <th className="p-3 text-right w-40">
                    Thành tiền Đầu kỳ {fiscalYear}
                  </th>
                  {priorHasData && (
                    <th className="p-3 text-center border-l border-white/5 w-36">
                      Đối chiếu {priorYear} → {fiscalYear}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProducts.map((prod, idx) => {
                  const uomName = db.uoms.find((u) => u.id === prod.uomId)?.name || 'Cái';
                  const entered = lineInputs[prod.id] || { qty: 0, unitCost: 0 };
                  const enteredValue = Math.round(entered.qty * entered.unitCost);

                  const prior = priorClosingStock.find((c) => c.productId === prod.id);
                  const expQty = prior?.qty || 0;
                  const expCost = prior?.unitCost || 0;
                  const expVal = prior?.totalValue || 0;

                  const isMatched =
                    !priorHasData ||
                    (entered.qty === expQty &&
                      (expQty === 0 || Math.abs(enteredValue - expVal) <= Math.max(10, expQty)));

                  return (
                    <tr
                      key={prod.id}
                      className={`hover:bg-white/[0.02] transition ${
                        !isMatched ? 'bg-rose-500/[0.04]' : ''
                      }`}
                    >
                      <td className="p-3 text-center text-slate-500 font-mono tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-400">
                        {prod.sku}
                      </td>
                      <td className="p-3 font-semibold text-slate-200">
                        {prod.name}
                      </td>
                      <td className="p-3 text-center text-slate-400">
                        {uomName}
                      </td>

                      {priorHasData && (
                        <>
                          <td className="p-3 text-right font-mono tabular-nums font-bold text-slate-300 bg-white/[0.01] border-l border-white/5">
                            {expQty.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-mono tabular-nums text-slate-400 bg-white/[0.01]">
                            {canViewCost ? `${expVal.toLocaleString()}đ` : '***'}
                          </td>
                        </>
                      )}

                      {/* Editable Opening Qty */}
                      <td className="p-3 text-right border-l border-white/5">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          disabled={yearLockInfo.locked}
                          value={entered.qty}
                          onChange={(e) => handleInputChange(prod.id, 'qty', e.target.value)}
                          className={`w-28 text-right font-mono tabular-nums font-bold px-2.5 py-1.5 rounded-lg border bg-[#161a23] text-white focus:outline-none ${
                            !isMatched
                              ? 'border-rose-500/60 text-rose-300'
                              : 'border-white/10 focus:border-emerald-500'
                          }`}
                        />
                      </td>

                      {/* Editable Opening Unit Cost */}
                      <td className="p-3 text-right">
                        {!canViewCost ? (
                          <span className="text-slate-500 font-mono italic">*** (Chỉ Admin)</span>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            step="any"
                            disabled={yearLockInfo.locked}
                            value={entered.unitCost}
                            onChange={(e) =>
                              handleInputChange(prod.id, 'unitCost', e.target.value)
                            }
                            className={`w-36 text-right font-mono tabular-nums font-semibold px-2.5 py-1.5 rounded-lg border bg-[#161a23] text-slate-200 focus:outline-none ${
                              !isMatched
                                ? 'border-rose-500/60 text-rose-300'
                                : 'border-white/10 focus:border-emerald-500'
                            }`}
                          />
                        )}
                      </td>

                      {/* Opening Total Value */}
                      <td className="p-3 text-right font-mono tabular-nums font-bold text-white">
                        {canViewCost ? `${enteredValue.toLocaleString()}đ` : '***'}
                      </td>

                      {/* Reconciliation status per row */}
                      {priorHasData && (
                        <td className="p-3 text-center border-l border-white/5">
                          {isMatched ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                              <Check className="w-3.5 h-3.5" />
                              <span>Khớp 100%</span>
                            </span>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-rose-400 font-bold text-[11px]">
                                Lệch {entered.qty - expQty > 0 ? `+${entered.qty - expQty}` : entered.qty - expQty}
                              </span>
                              {!yearLockInfo.locked && (
                                <button
                                  type="button"
                                  onClick={() => handleMatchSingleRow(prod.id, expQty, expCost)}
                                  className="text-[10px] bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold transition flex items-center gap-1"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                  <span>Khớp ngay</span>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-black/50 border-t border-white/10 font-bold text-white">
                  <td colSpan={4} className="p-3 text-right uppercase text-[11px] text-slate-400">
                    Tổng cộng toàn kho:
                  </td>
                  {priorHasData && (
                    <>
                      <td className="p-3 text-right font-mono tabular-nums text-slate-200 border-l border-white/5">
                        {totalPriorQty.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-slate-300">
                        {canViewCost ? `${totalPriorValue.toLocaleString()}đ` : '***'}
                      </td>
                    </>
                  )}
                  <td className="p-3 text-right font-mono tabular-nums text-emerald-400 border-l border-white/5">
                    {totalEnteredQty.toLocaleString()}
                  </td>
                  <td className="p-3 text-right text-slate-500 font-normal text-[11px]">
                    Bình quân gia quyền
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-emerald-400">
                    {canViewCost ? `${totalEnteredValue.toLocaleString()}đ` : '***'}
                  </td>
                  {priorHasData && (
                    <td className="p-3 text-center border-l border-white/5">
                      {mismatchCount === 0 ? (
                        <span className="text-emerald-400 text-[11px]">Khớp toàn bộ</span>
                      ) : (
                        <span className="text-rose-400 text-[11px]">{mismatchCount} SP lệch</span>
                      )}
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Notes Input */}
        <div className="pt-2">
          <label className="text-xs text-slate-400 font-semibold block mb-1.5">
            Diễn giải chứng từ Tồn đầu kỳ ({fiscalYear})
          </label>
          <input
            type="text"
            disabled={yearLockInfo.locked}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs bg-[#161a23] border border-white/10 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </form>

      <ExcelImportModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        db={db}
        defaultType="opening_stock"
        onUpdate={() => {
          onUpdate();
        }}
        onImportSuccess={(msg) => {
          setStatusMessage({ type: 'success', text: msg });
          onUpdate();
        }}
      />
    </div>
  );
}
