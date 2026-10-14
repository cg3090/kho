/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { MockDatabase } from '../db/mockDb';
import { User } from '../types';
import { canViewPurchaseCost } from '../utils/rbac';
import { formatDate } from '../utils/dateUtils';
import {
  Calendar,
  Search,
  Download,
  Printer,
  Filter,
  Warehouse as WarehouseIcon,
  FolderTree,
  ArrowLeft,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  PackageCheck,
} from 'lucide-react';

interface InventoryMovementReportProps {
  db: MockDatabase;
  currentUser?: User | null;
}

export default function InventoryMovementReport({
  db,
  currentUser,
}: InventoryMovementReportProps) {
  const canViewCost = canViewPurchaseCost(currentUser, db.roles);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

  const [startDate, setStartDate] = useState<string>(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState<string>(`${currentYear}-12-31`);
  const [activePreset, setActivePreset] = useState<string>('this-year');
  const [warehouseId, setWarehouseId] = useState<string>('ALL');
  const [categoryId, setCategoryId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hideZeroRows, setHideZeroRows] = useState<boolean>(false);
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);

  const applyTimePreset = (preset: string) => {
    setActivePreset(preset);
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth(); // 0-indexed

    if (preset === 'this-month') {
      const firstDay = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const lastDayDate = new Date(y, m + 1, 0);
      const lastDay = `${y}-${String(m + 1).padStart(2, '0')}-${String(
        lastDayDate.getDate()
      ).padStart(2, '0')}`;
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'last-month') {
      const prevDate = new Date(y, m - 1, 1);
      const py = prevDate.getFullYear();
      const pm = prevDate.getMonth();
      const lastDayDate = new Date(py, pm + 1, 0);
      setStartDate(`${py}-${String(pm + 1).padStart(2, '0')}-01`);
      setEndDate(
        `${py}-${String(pm + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`
      );
    } else if (preset === 'this-quarter') {
      const qStartMonth = Math.floor(m / 3) * 3;
      const qEndMonth = qStartMonth + 2;
      const lastDayDate = new Date(y, qEndMonth + 1, 0);
      setStartDate(`${y}-${String(qStartMonth + 1).padStart(2, '0')}-01`);
      setEndDate(
        `${y}-${String(qEndMonth + 1).padStart(2, '0')}-${String(
          lastDayDate.getDate()
        ).padStart(2, '0')}`
      );
    } else if (preset === 'this-year') {
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
    } else if (preset === 'last-year') {
      const ly = y - 1;
      setStartDate(`${ly}-01-01`);
      setEndDate(`${ly}-12-31`);
    } else if (preset === 'all-time') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Compute NXT report rows
  const rawRows = useMemo(() => {
    return db.getInventoryMovementReport(
      startDate || undefined,
      endDate || undefined,
      warehouseId,
      categoryId
    );
  }, [
    db,
    startDate,
    endDate,
    warehouseId,
    categoryId,
    db.stockTransactions.length,
    db.stockTransactionDetails.length,
    db.products.length,
  ]);

  const filteredRows = useMemo(() => {
    return rawRows.filter((r) => {
      if (hideZeroRows) {
        const hasActivity =
          r.openingQty !== 0 || r.inQty !== 0 || r.outQty !== 0 || r.closingQty !== 0;
        if (!hasActivity) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.sku.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q) ||
          r.categoryName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rawRows, hideZeroRows, searchQuery]);

  // Totals calculation
  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, r) => {
        acc.openingQty += r.openingQty;
        acc.openingValue += r.openingValue;
        acc.inQty += r.inQty;
        acc.inValue += r.inValue;
        acc.outQty += r.outQty;
        acc.outValue += r.outValue;
        acc.outRevenue += r.outRevenue;
        acc.closingQty += r.closingQty;
        acc.closingValue += r.closingValue;
        return acc;
      },
      {
        openingQty: 0,
        openingValue: 0,
        inQty: 0,
        inValue: 0,
        outQty: 0,
        outValue: 0,
        outRevenue: 0,
        closingQty: 0,
        closingValue: 0,
      }
    );
  }, [filteredRows]);

  const handleExportCsv = () => {
    const headers = [
      'STT',
      'Mã SKU',
      'Tên hàng hóa',
      'Nhóm hàng',
      'ĐVT',
      'SL Đầu kỳ',
      ...(canViewCost ? ['Giá trị Đầu kỳ (VND)'] : []),
      'SL Nhập trong kỳ',
      ...(canViewCost ? ['Giá trị Nhập (VND)'] : []),
      'SL Xuất trong kỳ',
      ...(canViewCost ? ['Giá trị Vốn Xuất (VND)'] : []),
      'SL Tồn cuối kỳ',
      ...(canViewCost ? ['Đơn giá BQ Cuối kỳ (VND)', 'Giá trị Tồn cuối kỳ (VND)'] : []),
    ];

    const csvRows = [
      headers.join(','),
      ...filteredRows.map((r, idx) => {
        const cols = [
          idx + 1,
          `"${r.sku}"`,
          `"${r.productName.replace(/"/g, '""')}"`,
          `"${r.categoryName.replace(/"/g, '""')}"`,
          `"${r.uomName}"`,
          r.openingQty,
          ...(canViewCost ? [r.openingValue] : []),
          r.inQty,
          ...(canViewCost ? [r.inValue] : []),
          r.outQty,
          ...(canViewCost ? [r.outValue] : []),
          r.closingQty,
          ...(canViewCost ? [r.closingUnitCost, r.closingValue] : []),
        ];
        return cols.join(',');
      }),
    ];

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Bao_Cao_Nhap_Xuat_Ton_${startDate || 'Dau'}_${endDate || 'Cuoi'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectedWarehouseName =
    warehouseId === 'ALL'
      ? 'Tất cả kho hàng'
      : db.warehouses.find((w) => w.id === warehouseId)?.name || warehouseId;

  if (showPrintPreview) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#11141b] p-4 rounded-2xl border border-white/5 shadow-2xl">
          <button
            type="button"
            onClick={() => setShowPrintPreview(false)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold rounded-xl text-slate-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition shadow"
          >
            <Printer className="w-4 h-4" />
            <span>In Báo Cáo (Print)</span>
          </button>
        </div>

        {/* Printable Vietnamese S10-DN Sheet */}
        <div className="bg-white text-black p-8 md:p-10 rounded-2xl border border-white/5 shadow-2xl space-y-6 font-sans max-w-6xl mx-auto printable-area">
          <div className="flex justify-between items-start border-b border-slate-300 pb-4">
            <div className="space-y-1">
              <p className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                {db.companyInfo?.name || 'CÔNG TY TNHH V-ERP SMART SOLUTIONS'}
              </p>
              <p className="text-xs text-slate-600">
                Địa chỉ: {db.companyInfo?.address || 'TP. Hồ Chí Minh'}
              </p>
              <p className="text-xs text-slate-600">
                MST: {db.companyInfo?.taxCode || '0315894123'}
              </p>
            </div>
            <div className="text-right space-y-1 text-xs">
              <p className="font-bold text-slate-800">Mẫu số S10-DN</p>
              <p className="text-[11px] text-slate-500 italic">
                (Ban hành theo Thông tư số 133/2016/TT-BTC)
              </p>
            </div>
          </div>

          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
              BẢNG TỔNG HỢP NHẬP - XUẤT - TỒN KHO HÀNG HÓA
            </h2>
            <p className="text-xs text-slate-700 font-semibold">
              Kỳ báo cáo:{' '}
              {startDate ? `Từ ngày ${formatDate(startDate)}` : 'Từ đầu kỳ'}{' '}
              {endDate ? `đến ngày ${formatDate(endDate)}` : 'đến hiện tại'} · Kho:{' '}
              {selectedWarehouseName}
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-900 font-bold text-center">
                  <th rowSpan={2} className="p-2 border-r border-slate-300 w-10">
                    STT
                  </th>
                  <th rowSpan={2} className="p-2 border-r border-slate-300 text-left">
                    Mã SKU
                  </th>
                  <th rowSpan={2} className="p-2 border-r border-slate-300 text-left">
                    Tên nhãn hiệu, quy cách hàng hóa
                  </th>
                  <th rowSpan={2} className="p-2 border-r border-slate-300 w-14">
                    ĐVT
                  </th>
                  <th colSpan={2} className="p-2 border-r border-slate-300 border-b">
                    TỒN ĐẦU KỲ
                  </th>
                  <th colSpan={2} className="p-2 border-r border-slate-300 border-b">
                    NHẬP TRONG KỲ
                  </th>
                  <th colSpan={2} className="p-2 border-r border-slate-300 border-b">
                    XUẤT TRONG KỲ
                  </th>
                  <th colSpan={2} className="p-2 border-b border-slate-300">
                    TỒN CUỐI KỲ
                  </th>
                </tr>
                <tr className="bg-slate-50 border-b border-slate-300 text-slate-800 font-bold text-right">
                  <th className="p-2 border-r border-slate-300">Số lượng</th>
                  <th className="p-2 border-r border-slate-300">Thành tiền</th>
                  <th className="p-2 border-r border-slate-300">Số lượng</th>
                  <th className="p-2 border-r border-slate-300">Thành tiền</th>
                  <th className="p-2 border-r border-slate-300">Số lượng</th>
                  <th className="p-2 border-r border-slate-300">Thành tiền</th>
                  <th className="p-2 border-r border-slate-300">Số lượng</th>
                  <th className="p-2">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filteredRows.map((r, idx) => (
                  <tr key={r.productId}>
                    <td className="p-2 text-center border-r border-slate-200 font-mono">
                      {idx + 1}
                    </td>
                    <td className="p-2 border-r border-slate-200 font-mono font-bold">
                      {r.sku}
                    </td>
                    <td className="p-2 border-r border-slate-200 font-semibold">
                      {r.productName}
                    </td>
                    <td className="p-2 text-center border-r border-slate-200">
                      {r.uomName}
                    </td>
                    <td className="p-2 text-right border-r border-slate-200 font-mono tabular-nums font-semibold">
                      {r.openingQty.toLocaleString()}
                    </td>
                    <td className="p-2 text-right border-r border-slate-200 font-mono tabular-nums">
                      {canViewCost ? `${r.openingValue.toLocaleString()}đ` : '***'}
                    </td>
                    <td className="p-2 text-right border-r border-slate-200 font-mono tabular-nums font-semibold">
                      {r.inQty.toLocaleString()}
                    </td>
                    <td className="p-2 text-right border-r border-slate-200 font-mono tabular-nums">
                      {canViewCost ? `${r.inValue.toLocaleString()}đ` : '***'}
                    </td>
                    <td className="p-2 text-right border-r border-slate-200 font-mono tabular-nums font-semibold">
                      {r.outQty.toLocaleString()}
                    </td>
                    <td className="p-2 text-right border-r border-slate-200 font-mono tabular-nums">
                      {canViewCost ? `${r.outValue.toLocaleString()}đ` : '***'}
                    </td>
                    <td className="p-2 text-right border-r border-slate-200 font-mono tabular-nums font-bold">
                      {r.closingQty.toLocaleString()}
                    </td>
                    <td className="p-2 text-right font-mono tabular-nums font-bold">
                      {canViewCost ? `${r.closingValue.toLocaleString()}đ` : '***'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-400 font-black text-slate-900">
                  <td colSpan={4} className="p-2.5 text-right border-r border-slate-300">
                    TỔNG CỘNG:
                  </td>
                  <td className="p-2.5 text-right border-r border-slate-300 font-mono tabular-nums">
                    {totals.openingQty.toLocaleString()}
                  </td>
                  <td className="p-2.5 text-right border-r border-slate-300 font-mono tabular-nums">
                    {canViewCost ? `${totals.openingValue.toLocaleString()}đ` : '***'}
                  </td>
                  <td className="p-2.5 text-right border-r border-slate-300 font-mono tabular-nums">
                    {totals.inQty.toLocaleString()}
                  </td>
                  <td className="p-2.5 text-right border-r border-slate-300 font-mono tabular-nums">
                    {canViewCost ? `${totals.inValue.toLocaleString()}đ` : '***'}
                  </td>
                  <td className="p-2.5 text-right border-r border-slate-300 font-mono tabular-nums">
                    {totals.outQty.toLocaleString()}
                  </td>
                  <td className="p-2.5 text-right border-r border-slate-300 font-mono tabular-nums">
                    {canViewCost ? `${totals.outValue.toLocaleString()}đ` : '***'}
                  </td>
                  <td className="p-2.5 text-right border-r border-slate-300 font-mono tabular-nums">
                    {totals.closingQty.toLocaleString()}
                  </td>
                  <td className="p-2.5 text-right font-mono tabular-nums">
                    {canViewCost ? `${totals.closingValue.toLocaleString()}đ` : '***'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center text-xs pt-8">
            <div className="space-y-12">
              <p className="font-bold text-slate-900">Người lập biểu</p>
              <p className="text-slate-500 italic">(Ký, họ tên)</p>
            </div>
            <div className="space-y-12">
              <p className="font-bold text-slate-900">Kế toán trưởng</p>
              <p className="text-slate-500 italic">(Ký, họ tên)</p>
            </div>
            <div className="space-y-12">
              <p className="font-bold text-slate-900">Giám đốc</p>
              <p className="text-slate-500 italic">(Ký, họ tên, đóng dấu)</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filter Control Panel */}
      <div className="bg-[#11141b] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="space-y-1">
 
            <h3 className="text-xl font-bold text-white tracking-tight">
              Nhập - Xuất - Tồn
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCsv}
              className="bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Xuất Excel (CSV)</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPrintPreview(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-500/15"
            >
              <Printer className="w-4 h-4" />
              <span>Xem Bản In S10-DN</span>
            </button>
          </div>
        </div>

        {/* Time Filter Row */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mr-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Chọn nhanh kỳ báo cáo:</span>
              </span>
              {[
                { id: 'this-month', label: `Tháng này (${currentMonth}/${currentYear})` },
                { id: 'last-month', label: 'Tháng trước' },
                { id: 'this-quarter', label: 'Quý này' },
                { id: 'this-year', label: `Năm nay (${currentYear})` },
                { id: 'last-year', label: `Năm trước (${currentYear - 1})` },
                { id: 'all-time', label: 'Toàn thời gian' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyTimePreset(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activePreset === p.id
                      ? 'bg-emerald-500 text-black font-bold shadow-sm'
                      : 'bg-[#161a23] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideZeroRows}
                onChange={(e) => setHideZeroRows(e.target.checked)}
                className="rounded border-white/20 bg-[#161a23] text-emerald-500 focus:ring-0"
              />
              <span>Ẩn mặt hàng không có số dư & phát sinh</span>
            </label>
          </div>

          {/* Detailed Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Từ ngày (Mốc tính Tồn đầu kỳ)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset('custom');
                }}
                className="w-full text-xs bg-[#161a23] border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Đến ngày (Mốc tính Tồn cuối kỳ)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset('custom');
                }}
                className="w-full text-xs bg-[#161a23] border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Kho hàng
              </label>
              <div className="relative">
                <WarehouseIcon className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-[#161a23] border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="ALL">Tất cả kho hàng</option>
                  {db.warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Nhóm / Danh mục hàng
              </label>
              <div className="relative">
                <FolderTree className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-[#161a23] border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="ALL">Tất cả nhóm hàng</option>
                  {db.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Tìm kiếm SKU / Tên hàng
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nhập mã SKU, tên sản phẩm..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-[#161a23] border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div className="bg-black/30 border border-white/5 rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>1. Tồn đầu kỳ ({startDate ? formatDate(startDate) : 'Đầu kỳ'})</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-lg font-bold text-white font-mono tabular-nums">
              {totals.openingQty.toLocaleString()} <span className="text-xs font-normal text-slate-400">ĐVT</span>
            </p>
            <p className="text-xs font-mono tabular-nums text-slate-400">
              Giá trị: {canViewCost ? `${totals.openingValue.toLocaleString()}đ` : '***'}
            </p>
          </div>

          <div className="bg-black/30 border border-blue-500/15 rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-blue-400">
              <span>2. Nhập trong kỳ (+)</span>
              <ArrowDownLeft className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-lg font-bold text-blue-400 font-mono tabular-nums">
              +{totals.inQty.toLocaleString()} <span className="text-xs font-normal text-slate-400">ĐVT</span>
            </p>
            <p className="text-xs font-mono tabular-nums text-slate-300">
              Giá trị nhập: {canViewCost ? `${totals.inValue.toLocaleString()}đ` : '***'}
            </p>
          </div>

          <div className="bg-black/30 border border-amber-500/15 rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-amber-400">
              <span>3. Xuất trong kỳ (-)</span>
              <ArrowUpRight className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-lg font-bold text-amber-400 font-mono tabular-nums">
              -{totals.outQty.toLocaleString()} <span className="text-xs font-normal text-slate-400">ĐVT</span>
            </p>
            <p className="text-xs font-mono tabular-nums text-slate-300">
              Giá vốn xuất: {canViewCost ? `${totals.outValue.toLocaleString()}đ` : '***'}
            </p>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
              <span>4. Tồn cuối kỳ ({endDate ? formatDate(endDate) : 'Hiện tại'})</span>
              <PackageCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-lg font-bold text-emerald-400 font-mono tabular-nums">
              {totals.closingQty.toLocaleString()} <span className="text-xs font-normal text-slate-400">ĐVT</span>
            </p>
            <p className="text-xs font-mono tabular-nums text-white font-semibold">
              Giá trị tồn: {canViewCost ? `${totals.closingValue.toLocaleString()}đ` : '***'}
            </p>
          </div>
        </div>
      </div>

      {/* Main NXT Table */}
      <div className="bg-[#11141b] border border-white/5 rounded-2xl p-5 shadow-2xl">
        {filteredRows.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs space-y-1.5">
            <p className="font-semibold text-slate-300 text-sm">
              Không có dữ liệu hàng hóa thỏa mãn điều kiện lọc
            </p>
            <p>
              Hãy thử mở rộng khoảng thời gian lọc hoặc bỏ chọn "Ẩn mặt hàng không có số dư & phát sinh".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-white/10 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-black/50 border-b border-white/10 text-slate-300 font-bold text-center">
                  <th rowSpan={2} className="p-3 border-r border-white/10 w-10">
                    #
                  </th>
                  <th rowSpan={2} className="p-3 border-r border-white/10 text-left">
                    Mã SKU
                  </th>
                  <th rowSpan={2} className="p-3 border-r border-white/10 text-left min-w-[180px]">
                    Tên hàng hóa / Vật tư
                  </th>
                  <th rowSpan={2} className="p-3 border-r border-white/10 w-16">
                    ĐVT
                  </th>
                  <th
                    colSpan={2}
                    className="p-2.5 border-r border-white/10 border-b bg-white/[0.02] text-slate-200"
                  >
                    TỒN ĐẦU KỲ
                  </th>
                  <th
                    colSpan={2}
                    className="p-2.5 border-r border-white/10 border-b bg-blue-500/[0.04] text-blue-400"
                  >
                    NHẬP TRONG KỲ
                  </th>
                  <th
                    colSpan={2}
                    className="p-2.5 border-r border-white/10 border-b bg-amber-500/[0.04] text-amber-400"
                  >
                    XUẤT TRONG KỲ
                  </th>
                  <th
                    colSpan={3}
                    className="p-2.5 border-b border-white/10 bg-emerald-500/[0.05] text-emerald-400"
                  >
                    TỒN CUỐI KỲ
                  </th>
                </tr>
                <tr className="bg-black/30 border-b border-white/10 text-[11px] font-semibold text-slate-400 text-right">
                  <th className="p-2.5 border-r border-white/5 bg-white/[0.01]">Số lượng</th>
                  <th className="p-2.5 border-r border-white/10 bg-white/[0.01]">Giá trị</th>
                  <th className="p-2.5 border-r border-white/5 bg-blue-500/[0.02]">Số lượng</th>
                  <th className="p-2.5 border-r border-white/10 bg-blue-500/[0.02]">Giá trị nhập</th>
                  <th className="p-2.5 border-r border-white/5 bg-amber-500/[0.02]">Số lượng</th>
                  <th className="p-2.5 border-r border-white/10 bg-amber-500/[0.02]">Giá trị vốn</th>
                  <th className="p-2.5 border-r border-white/5 bg-emerald-500/[0.03] text-emerald-300">
                    Số lượng
                  </th>
                  <th className="p-2.5 border-r border-white/5 bg-emerald-500/[0.03]">
                    Đơn giá BQ
                  </th>
                  <th className="p-2.5 bg-emerald-500/[0.03] text-emerald-300">Giá trị tồn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRows.map((r, idx) => (
                  <tr key={r.productId} className="hover:bg-white/[0.03] transition">
                    <td className="p-3 text-center text-slate-500 font-mono tabular-nums border-r border-white/5">
                      {idx + 1}
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-400 border-r border-white/5">
                      {r.sku}
                    </td>
                    <td className="p-3 border-r border-white/5">
                      <p className="font-semibold text-slate-200">{r.productName}</p>
                      <p className="text-[11px] text-slate-500">{r.categoryName}</p>
                    </td>
                    <td className="p-3 text-center text-slate-400 border-r border-white/10">
                      {r.uomName}
                    </td>

                    {/* Opening */}
                    <td className="p-3 text-right font-mono tabular-nums font-semibold text-slate-200 border-r border-white/5 bg-white/[0.01]">
                      {r.openingQty.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums text-slate-400 border-r border-white/10 bg-white/[0.01]">
                      {canViewCost ? `${r.openingValue.toLocaleString()}đ` : '***'}
                    </td>

                    {/* Stock In */}
                    <td className="p-3 text-right font-mono tabular-nums font-bold text-blue-400 border-r border-white/5 bg-blue-500/[0.01]">
                      {r.inQty > 0 ? `+${r.inQty.toLocaleString()}` : '0'}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums text-slate-300 border-r border-white/10 bg-blue-500/[0.01]">
                      {canViewCost ? `${r.inValue.toLocaleString()}đ` : '***'}
                    </td>

                    {/* Stock Out */}
                    <td className="p-3 text-right font-mono tabular-nums font-bold text-amber-400 border-r border-white/5 bg-amber-500/[0.01]">
                      {r.outQty > 0 ? `-${r.outQty.toLocaleString()}` : '0'}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums text-slate-300 border-r border-white/10 bg-amber-500/[0.01]">
                      {canViewCost ? `${r.outValue.toLocaleString()}đ` : '***'}
                    </td>

                    {/* Closing */}
                    <td
                      className={`p-3 text-right font-mono tabular-nums font-bold border-r border-white/5 bg-emerald-500/[0.02] ${
                        r.closingQty < 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {r.closingQty.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums text-slate-300 border-r border-white/5 bg-emerald-500/[0.02]">
                      {canViewCost ? `${r.closingUnitCost.toLocaleString()}đ` : '***'}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums font-bold text-white bg-emerald-500/[0.02]">
                      {canViewCost ? `${r.closingValue.toLocaleString()}đ` : '***'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-black/60 border-t-2 border-white/15 font-bold text-white">
                  <td
                    colSpan={4}
                    className="p-3 text-right uppercase text-[11px] text-slate-300 border-r border-white/10"
                  >
                    Tổng cộng ({filteredRows.length} mặt hàng):
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-slate-200 border-r border-white/5">
                    {totals.openingQty.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-slate-200 border-r border-white/10">
                    {canViewCost ? `${totals.openingValue.toLocaleString()}đ` : '***'}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-blue-400 border-r border-white/5">
                    +{totals.inQty.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-blue-300 border-r border-white/10">
                    {canViewCost ? `${totals.inValue.toLocaleString()}đ` : '***'}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-amber-400 border-r border-white/5">
                    -{totals.outQty.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-amber-300 border-r border-white/10">
                    {canViewCost ? `${totals.outValue.toLocaleString()}đ` : '***'}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-emerald-400 border-r border-white/5">
                    {totals.closingQty.toLocaleString()}
                  </td>
                  <td className="p-3 text-right text-slate-500 font-normal text-[11px] border-r border-white/5">
                    BQGQ
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-emerald-400">
                    {canViewCost ? `${totals.closingValue.toLocaleString()}đ` : '***'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
