/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MockDatabase } from '../db/mockDb';
import { VatLedgerEntry } from '../types';
import { Receipt, Percent, ArrowDownRight, ArrowUpRight, Scale, BookOpen, Calculator, Search } from 'lucide-react';
import AdvancedTable from './AdvancedTable';
import { motion } from 'motion/react';
import { formatDate } from '../utils/dateUtils';

interface VatLedgerProps {
  db: MockDatabase;
  onUpdate: () => void;
}

export default function VatLedger({ db, onUpdate }: VatLedgerProps) {
  const [activeTab, setActiveTab] = useState<'vat-in' | 'vat-out' | 'vat-summary'>('vat-summary');

  const vatInColumns = [
    {
      key: 'date',
      label: 'Ngày hóa đơn',
      sortable: true,
      render: (v: any) => <span className="font-mono text-slate-400">{formatDate(v.date)}</span>,
    },
    {
      key: 'invoiceNo',
      label: 'Số hóa đơn mua',
      sortable: true,
      render: (v: any) => <span className="font-bold text-slate-200">{v.invoiceNo}</span>,
    },
    {
      key: 'partnerName',
      label: 'Đơn vị bán hàng',
      sortable: true,
      render: (v: any) => <span className="font-semibold text-slate-200">{v.partnerName}</span>,
    },
    {
      key: 'partnerTaxCode',
      label: 'Mã số thuế bán',
      sortable: true,
      render: (v: any) => <span className="font-mono text-slate-400">{v.partnerTaxCode}</span>,
    },
    {
      key: 'amountBeforeVat',
      label: 'Doanh số mua chưa thuế',
      sortable: true,
      align: 'right' as const,
      render: (v: any) => <span className="font-medium text-slate-200">{v.amountBeforeVat.toLocaleString()}đ</span>,
    },
    {
      key: 'vatRate',
      label: 'Thuế suất',
      sortable: true,
      align: 'center' as const,
      render: (v: any) => <span className="font-bold text-slate-400">{v.vatRate}%</span>,
    },
    {
      key: 'vatAmount',
      label: 'Tiền thuế VAT đầu vào',
      sortable: true,
      align: 'right' as const,
      render: (v: any) => <span className="font-bold text-emerald-400">{v.vatAmount.toLocaleString()}đ</span>,
    },
    {
      key: 'accountCode',
      label: 'Hạch toán TK',
      sortable: true,
      render: (v: any) => <span className="font-mono text-emerald-400 font-bold">{v.accountCode}</span>,
    },
  ];

  const vatOutColumns = [
    {
      key: 'date',
      label: 'Ngày hóa đơn',
      sortable: true,
      render: (v: any) => <span className="font-mono text-slate-400">{formatDate(v.date)}</span>,
    },
    {
      key: 'invoiceNo',
      label: 'Số hóa đơn bán',
      sortable: true,
      render: (v: any) => <span className="font-bold text-slate-200">{v.invoiceNo}</span>,
    },
    {
      key: 'partnerName',
      label: 'Đơn vị mua hàng',
      sortable: true,
      render: (v: any) => <span className="font-semibold text-slate-200">{v.partnerName}</span>,
    },
    {
      key: 'partnerTaxCode',
      label: 'Mã số thuế mua',
      sortable: true,
      render: (v: any) => <span className="font-mono text-slate-400">{v.partnerTaxCode}</span>,
    },
    {
      key: 'amountBeforeVat',
      label: 'Doanh thu bán chưa thuế',
      sortable: true,
      align: 'right' as const,
      render: (v: any) => <span className="font-medium text-slate-200">{v.amountBeforeVat.toLocaleString()}đ</span>,
    },
    {
      key: 'vatRate',
      label: 'Thuế suất',
      sortable: true,
      align: 'center' as const,
      render: (v: any) => <span className="font-bold text-slate-400">{v.vatRate}%</span>,
    },
    {
      key: 'vatAmount',
      label: 'Tiền thuế VAT đầu ra',
      sortable: true,
      align: 'right' as const,
      render: (v: any) => <span className="font-bold text-rose-400">{v.vatAmount.toLocaleString()}đ</span>,
    },
    {
      key: 'accountCode',
      label: 'Hạch toán TK',
      sortable: true,
      render: (v: any) => <span className="font-mono text-emerald-400 font-bold">{v.accountCode}</span>,
    },
  ];

  const currentVatIn = db.vatLedger.filter((v) => v.type === 'INPUT' && !v.isReversed);
  const currentVatOut = db.vatLedger.filter((v) => v.type === 'OUTPUT' && !v.isReversed);

  const totalVatInAmount = currentVatIn.reduce((sum, v) => sum + v.vatAmount, 0);
  const totalVatOutAmount = currentVatOut.reduce((sum, v) => sum + v.vatAmount, 0);

  const totalVatInBase = currentVatIn.reduce((sum, v) => sum + v.amountBeforeVat, 0);
  const totalVatOutBase = currentVatOut.reduce((sum, v) => sum + v.amountBeforeVat, 0);

  const netPayable = totalVatOutAmount - totalVatInAmount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Sổ sách & Kê khai Thuế VAT</h2>
          <p className="text-sm text-slate-400">Nghiệp vụ hạch toán chuyên sâu kế toán thuế Giá trị gia tăng (Thông tư 133/200)</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-white/5 gap-1.5 pb-0.5">
        <button
          onClick={() => setActiveTab('vat-summary')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'vat-summary' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          <Scale className="w-4 h-4" />
          Tổng hợp Nghĩa vụ Thuế VAT
        </button>
        <button
          onClick={() => setActiveTab('vat-in')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'vat-in' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          <ArrowDownRight className="w-4 h-4 text-emerald-400" />
          Bảng kê VAT mua vào (133)
        </button>
        <button
          onClick={() => setActiveTab('vat-out')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'vat-out' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-rose-400" />
          Bảng kê VAT bán ra (3331)
        </button>
      </div>

      {/* Tab 1: Summary Dashboard */}
      {activeTab === 'vat-summary' && (
        <div className="space-y-6">
          {/* Bento Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-[#11141b] border border-white/5 rounded-2xl p-5 space-y-3 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-bold tracking-wider uppercase">Thuế VAT Đầu vào</span>
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                  <ArrowDownRight className="w-4 h-4" />
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-2xl font-black text-white">{totalVatInAmount.toLocaleString()}đ</span>
                <p className="text-[11px] text-slate-400 font-medium">Được khấu trừ (TK 133)</p>
              </div>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Doanh số mua:</span>
                <span className="text-slate-300 font-semibold">{totalVatInBase.toLocaleString()}đ</span>
              </div>
            </div>

            <div className="bg-[#11141b] border border-white/5 rounded-2xl p-5 space-y-3 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-bold tracking-wider uppercase">Thuế VAT Đầu ra</span>
                <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/15">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-2xl font-black text-white">{totalVatOutAmount.toLocaleString()}đ</span>
                <p className="text-[11px] text-slate-400 font-medium">Phải nộp Nhà nước (TK 3331)</p>
              </div>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Doanh thu bán:</span>
                <span className="text-slate-300 font-semibold">{totalVatOutBase.toLocaleString()}đ</span>
              </div>
            </div>

            <div className={`bg-[#11141b] border rounded-2xl p-5 space-y-3 shadow-xl relative overflow-hidden ${
              netPayable >= 0 ? 'border-rose-500/20' : 'border-emerald-500/20'
            }`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-bold tracking-wider uppercase">Nghĩa vụ chênh lệch</span>
                <span className={`p-2 rounded-xl border ${
                  netPayable >= 0 
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/15' 
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                }`}>
                  <Scale className="w-4 h-4" />
                </span>
              </div>
              <div className="space-y-1">
                <span className={`text-2xl font-black ${netPayable >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {Math.abs(netPayable).toLocaleString()}đ
                </span>
                <p className="text-[11px] text-slate-400 font-medium">
                  {netPayable >= 0 ? 'Còn phải nộp ngân sách' : 'Thuế VAT còn được khấu trừ tiếp'}
                </p>
              </div>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Trạng thái:</span>
                <span className={`font-bold uppercase tracking-wider ${netPayable >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {netPayable >= 0 ? 'Phải nộp thuế' : 'Còn được khấu trừ'}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Tax Statement Sheet */}
          <div className="bg-[#11141b] border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center gap-2.5">
              <Calculator className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base">Bảng Tổng hợp Hạch toán Thuế VAT (Tờ khai nội bộ)</h3>
            </div>

            <div className="divide-y divide-white/5 font-mono text-sm max-w-3xl">
              <div className="py-3.5 flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-slate-300 font-semibold">[01] Doanh số mua hàng hóa dịch vụ chưa có thuế</span>
                  <p className="text-[11px] text-slate-500 font-sans">Tổng giá trị mua ròng chưa VAT từ các phiếu nhập kho</p>
                </div>
                <span className="font-bold text-slate-200">{totalVatInBase.toLocaleString()}đ</span>
              </div>

              <div className="py-3.5 flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-slate-300 font-semibold">[02] Thuế VAT đầu vào lũy kế được khấu trừ</span>
                  <p className="text-[11px] text-slate-500 font-sans">Tổng thuế VAT ghi nợ TK 133</p>
                </div>
                <span className="font-bold text-emerald-400">{totalVatInAmount.toLocaleString()}đ</span>
              </div>

              <div className="py-3.5 flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-slate-300 font-semibold">[03] Doanh thu bán hàng hóa dịch vụ chưa có thuế</span>
                  <p className="text-[11px] text-slate-500 font-sans">Tổng giá trị doanh thu ròng chưa VAT từ phiếu xuất kho</p>
                </div>
                <span className="font-bold text-slate-200">{totalVatOutBase.toLocaleString()}đ</span>
              </div>

              <div className="py-3.5 flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-slate-300 font-semibold">[04] Thuế VAT đầu ra phát sinh phải nộp</span>
                  <p className="text-[11px] text-slate-500 font-sans">Tổng thuế VAT ghi có TK 3331</p>
                </div>
                <span className="font-bold text-rose-400">{totalVatOutAmount.toLocaleString()}đ</span>
              </div>

              <div className="py-4 flex justify-between items-center bg-white/[0.01] px-4 rounded-xl border border-white/5 mt-2">
                <div className="space-y-0.5">
                  <span className="text-white font-bold">[05] Thuế VAT chênh lệch trong kỳ</span>
                  <p className="text-[11px] text-slate-400 font-sans">Kết chuyển chênh lệch thuế giữa TK 133 và TK 3331</p>
                </div>
                <div className="text-right">
                  <span className={`text-base font-black ${netPayable >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {netPayable >= 0 ? `+${netPayable.toLocaleString()}đ` : `-${Math.abs(netPayable).toLocaleString()}đ`}
                  </span>
                  <p className={`text-[10px] font-sans font-semibold uppercase tracking-wider ${netPayable >= 0 ? 'text-rose-400/80' : 'text-emerald-400/80'}`}>
                    {netPayable >= 0 ? 'Phải nộp ngân sách' : 'Còn được khấu trừ'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10 text-xs text-slate-400 space-y-1">
              <p className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                <BookOpen className="w-3.5 h-3.5" /> Nguyên tắc kết chuyển thuế VAT (Chuẩn mực thông tư):
              </p>
              <p>• Cuối kỳ kế toán, kế toán thực hiện bút toán kết chuyển thuế GTGT được khấu trừ theo nguyên tắc lấy số nhỏ hơn giữa Thuế GTGT đầu vào được khấu trừ và Thuế GTGT đầu ra phát sinh.</p>
              <p>• Bút toán kết chuyển mẫu: <span className="text-slate-200 font-mono">Nợ TK 3331 / Có TK 133</span>.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: VAT INPUT TABLE */}
      {activeTab === 'vat-in' && (
        <div className="bg-[#11141b] border border-white/5 rounded-2xl shadow-2xl overflow-visible p-4 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Bảng kê hóa đơn, chứng từ hàng hóa dịch vụ mua vào (VAT Input - TK 133)</h3>
            </div>
          </div>

          <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-wrap gap-6 items-center justify-between text-sm">
            <div>
              <span className="text-xs text-slate-400 block font-medium">TỔNG CỘNG DOANH SỐ MUA CHƯA THUẾ</span>
              <span className="text-lg font-black text-slate-200">
                {totalVatInBase.toLocaleString()}đ
              </span>
            </div>
            <div className="text-right sm:text-left">
              <span className="text-xs text-slate-400 block font-medium">TỔNG CỘNG THUẾ VAT ĐẦU VÀO ĐƯỢC KHẤU TRỪ</span>
              <span className="text-lg font-black text-emerald-400">
                {totalVatInAmount.toLocaleString()}đ
              </span>
            </div>
          </div>

          <AdvancedTable
            data={currentVatIn}
            columns={vatInColumns}
            searchableKeys={['invoiceNo', 'partnerName']}
            searchPlaceholder="Tìm theo số hóa đơn mua, đơn vị bán..."
            keyExtractor={(v) => v.id}
          />
        </div>
      )}

      {/* Tab 3: VAT OUTPUT TABLE */}
      {activeTab === 'vat-out' && (
        <div className="bg-[#11141b] border border-white/5 rounded-2xl shadow-2xl overflow-visible p-4 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <Receipt className="w-4 h-4 text-rose-400" />
              <h3 className="font-bold text-sm text-white">Bảng kê hóa đơn, chứng từ hàng hóa dịch vụ bán ra (VAT Output - TK 3331)</h3>
            </div>
          </div>

          <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-wrap gap-6 items-center justify-between text-sm">
            <div>
              <span className="text-xs text-slate-400 block font-medium">TỔNG CỘNG DOANH THU BÁN CHƯA THUẾ</span>
              <span className="text-lg font-black text-slate-200">
                {totalVatOutBase.toLocaleString()}đ
              </span>
            </div>
            <div className="text-right sm:text-left">
              <span className="text-xs text-slate-400 block font-medium">TỔNG CỘNG THUẾ VAT ĐẦU RA PHẢI NỘP</span>
              <span className="text-lg font-black text-rose-400">
                {totalVatOutAmount.toLocaleString()}đ
              </span>
            </div>
          </div>

          <AdvancedTable
            data={currentVatOut}
            columns={vatOutColumns}
            searchableKeys={['invoiceNo', 'partnerName']}
            searchPlaceholder="Tìm theo số hóa đơn bán, đơn vị mua..."
            keyExtractor={(v) => v.id}
          />
        </div>
      )}
    </motion.div>
  );
}
