/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MockDatabase } from '../db/mockDb';
import { Debt, Payment } from '../types';
import { CreditCard, DollarSign, ArrowDownRight, ArrowUpRight, Check, History, AlertTriangle, Bell, Clock, ChevronDown, ChevronUp, ArrowRight, FileSpreadsheet, Download, CheckCircle2 } from 'lucide-react';
import AdvancedFilter from './AdvancedFilter';
import AdvancedTable from './AdvancedTable';
import ExcelImportModal from './ExcelImportModal';
import { downloadExcelTemplate, exportDataToExcel } from '../utils/excelHelper';
import { motion } from 'motion/react';
import { formatDate } from '../utils/dateUtils';

interface DebtAndVatProps {
  db: MockDatabase;
  onUpdate: () => void;
  updateTrigger?: number;
}

export default function DebtAndVat({ db, onUpdate, updateTrigger }: DebtAndVatProps) {
  const [activeTab, setActiveTab] = useState<'ap' | 'ar' | 'payments'>('ap');
  const [showExcelModal, setShowExcelModal] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Payment Recording State
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'OTHER'>('BANK');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Filtering Debts (AP or AR) with persistent filter memory
  const [debtFilters, setDebtFilters] = useState<{ ap: Record<string, any>; ar: Record<string, any> }>({
    ap: {},
    ar: {},
  });
  const [filteredDebts, setFilteredDebts] = useState<Debt[]>(db.debts.filter((d) => d.type === 'AP' && !d.isReversed));

  const applyDebtFilters = (tab: 'ap' | 'ar', filters: Record<string, any>, source = db.debts) => {
    const targetType = tab === 'ap' ? 'AP' : 'AR';
    let rawDebts = source.filter((d) => d.type === targetType && !d.isReversed);

    if (filters.search) {
      const q = filters.search.toLowerCase();
      rawDebts = rawDebts.filter((d) => d.referenceNo.toLowerCase().includes(q));
    }
    if (filters.status) {
      rawDebts = rawDebts.filter((d) => d.status === filters.status);
    }
    if (filters.date) {
      rawDebts = rawDebts.filter((d) => d.date === filters.date);
    }

    return rawDebts;
  };

  // Synchronize filteredDebts when database updates or activeTab changes while preserving active filters
  useEffect(() => {
    if (activeTab === 'ap' || activeTab === 'ar') {
      setFilteredDebts(applyDebtFilters(activeTab, debtFilters[activeTab], db.debts));
    }
  }, [updateTrigger, activeTab, db.debts, db.debts.length, debtFilters]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter out reversed debts and keep unpaid or partial debts
  const activeUnpaidDebts = db.debts.filter((d) => !d.isReversed && d.status !== 'PAID');

  // Overdue Debts (dueDate is in the past)
  const overdueDebts = activeUnpaidDebts.filter((d) => d.dueDate && d.dueDate < todayStr);

  // Near-due Debts (dueDate is today or in the next 7 days)
  const nearDueDebts = activeUnpaidDebts.filter((d) => {
    if (!d.dueDate) return false;
    if (d.dueDate < todayStr) return false;
    const diffTime = new Date(d.dueDate).getTime() - new Date(todayStr).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  const handleFilterChange = (filters: Record<string, any>) => {
    if (activeTab !== 'ap' && activeTab !== 'ar') return;
    const updated = { ...debtFilters, [activeTab]: filters };
    setDebtFilters(updated);
    setFilteredDebts(applyDebtFilters(activeTab, filters, db.debts));
  };

  const handleResetFilter = () => {
    if (activeTab !== 'ap' && activeTab !== 'ar') return;
    const updated = { ...debtFilters, [activeTab]: {} };
    setDebtFilters(updated);
    setFilteredDebts(applyDebtFilters(activeTab, {}, db.debts));
  };

  // Sync state whenever tab switches
  const handleTabChange = (tab: 'ap' | 'ar' | 'payments') => {
    setActiveTab(tab);
    if (tab === 'ap' || tab === 'ar') {
      setFilteredDebts(applyDebtFilters(tab, debtFilters[tab], db.debts));
    }
  };

  // Submit payment record
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;

    const res = db.recordPayment(
      selectedDebt.type === 'AP' ? 'PAY' : 'RECEIVE',
      selectedDebt.id,
      selectedDebt.partnerId,
      selectedDebt.type === 'AP' ? 'SUPPLIER' : 'CUSTOMER',
      paymentAmount,
      paymentMethod,
      paymentRef.toUpperCase().trim() || `TT-${Date.now()}`,
      paymentNotes.trim()
    );

    showToast(res.message);
    if (res.success) {
      onUpdate();
      setSelectedDebt(null);
      setPaymentAmount(0);
      setPaymentRef('');
      setPaymentNotes('');
      // Refresh current filtered view while preserving active filters
      if (activeTab === 'ap' || activeTab === 'ar') {
        setFilteredDebts(applyDebtFilters(activeTab, debtFilters[activeTab], db.debts));
      }
    }
  };

  const debtsColumns = [
    {
      key: 'date',
      label: 'Ngày ghi',
      sortable: true,
      render: (d: any) => <span className="font-mono text-slate-400">{formatDate(d.date)}</span>,
    },
    {
      key: 'referenceNo',
      label: 'Số chứng từ gốc',
      sortable: true,
      render: (d: any) => <span className="font-bold text-slate-200">{d.referenceNo}</span>,
    },
    {
      key: 'partner',
      label: activeTab === 'ap' ? 'Nhà cung cấp' : 'Khách hàng',
      sortable: true,
      render: (d: any) => {
        const name = d.type === 'AP'
          ? db.suppliers.find((s) => s.id === d.partnerId)?.name
          : db.customers.find((c) => c.id === d.partnerId)?.name || 'Khách vãng lai';
        return <span className="font-semibold text-slate-300">{name}</span>;
      },
    },
    {
      key: 'amount',
      label: 'Tổng dư nợ gốc',
      sortable: true,
      align: 'right' as const,
      render: (d: any) => <span className="font-bold text-slate-200">{d.amount.toLocaleString()}đ</span>,
    },
    {
      key: 'paidAmount',
      label: 'Đã thanh toán',
      sortable: true,
      align: 'right' as const,
      render: (d: any) => <span className="font-semibold text-emerald-400">{d.paidAmount.toLocaleString()}đ</span>,
    },
    {
      key: 'remaining',
      label: 'Dư nợ còn lại',
      sortable: true,
      align: 'right' as const,
      render: (d: any) => <span className="font-bold text-rose-400">{(d.amount - d.paidAmount).toLocaleString()}đ</span>,
    },
    {
      key: 'dueDate',
      label: 'Hạn thanh toán',
      sortable: true,
      align: 'center' as const,
      render: (d: any) => {
        if (!d.dueDate) return <span className="text-slate-500 text-xs">-</span>;
        const today = new Date().toISOString().split('T')[0];
        const isOverdue = d.status !== 'PAID' && d.dueDate < today;
        return (
          <span className={`font-mono text-xs font-semibold ${isOverdue ? 'text-rose-500 font-bold' : 'text-slate-300'}`}>
            {d.dueDate} {isOverdue && <span className="bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded ml-1 text-[9px] font-bold">Trễ hạn</span>}
          </span>
        );
      }
    },
    {
      key: 'status',
      label: 'Tình trạng',
      sortable: true,
      align: 'center' as const,
      render: (d: any) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
          d.status === 'PAID'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : d.status === 'PARTIAL'
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }`}>
          {d.status === 'PAID' ? 'Đã thanh toán' : d.status === 'PARTIAL' ? 'Trả một phần' : 'Chưa trả'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Hành động',
      sortable: false,
      align: 'center' as const,
      render: (d: any) => {
        const remaining = d.amount - d.paidAmount;
        return d.status !== 'PAID' ? (
          <button
            onClick={() => {
              setSelectedDebt(d);
              setPaymentAmount(remaining);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded transition text-xs"
          >
            {d.type === 'AP' ? 'Thanh toán' : 'Thu tiền'}
          </button>
        ) : (
          <span className="text-emerald-400 font-semibold flex items-center justify-center gap-1 text-xs">
            <Check className="w-3.5 h-3.5" /> Tất toán
          </span>
        );
      },
    },
  ];

  const paymentsColumns = [
    {
      key: 'date',
      label: 'Ngày giao dịch',
      sortable: true,
      render: (p: any) => <span className="font-mono text-slate-400">{formatDate(p.date)}</span>,
    },
    {
      key: 'referenceNo',
      label: 'Số chứng từ (UNC/Phiếu chi)',
      sortable: true,
      render: (p: any) => <span className="font-bold text-slate-200">{p.referenceNo}</span>,
    },
    {
      key: 'type',
      label: 'Loại hình quỹ',
      sortable: true,
      render: (p: any) => (
        p.type === 'RECEIVE' ? (
          <span className="text-emerald-400 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Thu tiền quỹ
          </span>
        ) : (
          <span className="text-rose-400 flex items-center gap-1">
            <ArrowDownRight className="w-3.5 h-3.5" /> Chi tiền quỹ
          </span>
        )
      ),
    },
    {
      key: 'notes',
      label: 'Mục đích hạch toán',
      sortable: true,
      render: (p: any) => <span className="italic text-slate-400">{p.notes || '-'}</span>,
    },
    {
      key: 'amount',
      label: 'Số tiền tất toán',
      sortable: true,
      align: 'right' as const,
      render: (p: any) => <span className="font-bold text-slate-200">{p.amount.toLocaleString()}đ</span>,
    },
    {
      key: 'method',
      label: 'Hình thức chi trả',
      sortable: true,
      render: (p: any) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 border border-white/10 text-slate-300">
          {p.method}
        </span>
      ),
    },
    {
      key: 'partner',
      label: 'Đối tác nhận/trả',
      sortable: true,
      render: (p: any) => {
        const name = p.partnerType === 'SUPPLIER'
          ? db.suppliers.find((s) => s.id === p.partnerId)?.name
          : db.customers.find((c) => c.id === p.partnerId)?.name || 'Khách vãng lai';
        return <span className="text-slate-400 font-semibold">{name}</span>;
      },
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-black font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Title & Excel Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowExcelModal(true)}
            className="flex items-center gap-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold px-4 py-2.5 rounded-xl text-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Nhập Công Nợ từ Excel (.xlsx / .csv)</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadExcelTemplate('debts')}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold px-3.5 py-2 rounded-xl text-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tải File Mẫu (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={() => exportDataToExcel(db, 'debts')}
            className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-semibold px-3.5 py-2 rounded-xl text-xs transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Excel Công Nợ (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Debt Alert & Reminder Panel */}
      {(overdueDebts.length > 0 || nearDueDebts.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fadeIn">
          {/* Overdue Alert Column */}
          {overdueDebts.length > 0 ? (
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-rose-500/10 pb-3">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertTriangle className="w-5 h-5 animate-bounce" />
                  <h3 className="font-bold text-sm text-rose-300">CẢNH BÁO: CÔNG NỢ QUÁ HẠN ({overdueDebts.length})</h3>
                </div>
                <span className="bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Cần giải quyết ngay</span>
              </div>
              <div className="max-h-[220px] overflow-y-auto space-y-3 pr-1">
                {overdueDebts.map((d) => {
                  const partnerName = d.type === 'AP'
                    ? db.suppliers.find((s) => s.id === d.partnerId)?.name
                    : db.customers.find((c) => c.id === d.partnerId)?.name || 'Khách vãng lai';
                  const remaining = d.amount - d.paidAmount;
                  const daysOverdue = Math.ceil((new Date(todayStr).getTime() - new Date(d.dueDate!).getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <div key={d.id} className="bg-black/20 border border-rose-500/10 rounded-xl p-3.5 flex items-center justify-between hover:bg-black/30 transition">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${d.type === 'AP' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                            {d.type === 'AP' ? 'NỢ PHẢI TRẢ (AP)' : 'NỢ PHẢI THU (AR)'}
                          </span>
                          <span className="font-bold text-slate-300 font-mono text-xs">{d.referenceNo}</span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium line-clamp-1">{partnerName}</p>
                        <p className="text-[10px] text-rose-400 font-semibold">
                          Trễ hạn {daysOverdue} ngày (Hạn: {d.dueDate})
                        </p>
                      </div>
                      <div className="text-right space-y-1.5">
                        <p className="text-xs text-slate-400">Còn nợ: <strong className="text-rose-400 font-mono text-sm">{remaining.toLocaleString()}đ</strong></p>
                        <button
                          onClick={() => {
                            setSelectedDebt(d);
                            setPaymentAmount(remaining);
                          }}
                          className="text-[10px] bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white px-2.5 py-1 rounded-lg border border-rose-500/20 font-bold transition flex items-center gap-1 ml-auto"
                        >
                          {d.type === 'AP' ? 'Thanh toán' : 'Thu nợ'}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-2 h-[312px]">
              <div className="bg-emerald-500/10 p-3 rounded-full text-emerald-400">
                <Check className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-200">Không có công nợ quá hạn</h4>
              <p className="text-xs text-slate-400 max-w-xs">Tuyệt vời! Tất cả các khoản công nợ của bạn đều đang trong kỳ hạn thanh toán cho phép.</p>
            </div>
          )}

          {/* Near Due Alert Column */}
          {nearDueDebts.length > 0 ? (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-amber-500/10 pb-3">
                <div className="flex items-center gap-2 text-amber-400">
                  <Clock className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-amber-300">NHẮC NHỞ: SẮP ĐẾN HẠN TRONG 7 NGÀY ({nearDueDebts.length})</h3>
                </div>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Kế hoạch dòng tiền</span>
              </div>
              <div className="max-h-[220px] overflow-y-auto space-y-3 pr-1">
                {nearDueDebts.map((d) => {
                  const partnerName = d.type === 'AP'
                    ? db.suppliers.find((s) => s.id === d.partnerId)?.name
                    : db.customers.find((c) => c.id === d.partnerId)?.name || 'Khách vãng lai';
                  const remaining = d.amount - d.paidAmount;
                  const diffTime = new Date(d.dueDate!).getTime() - new Date(todayStr).getTime();
                  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  return (
                    <div key={d.id} className="bg-black/20 border border-amber-500/10 rounded-xl p-3.5 flex items-center justify-between hover:bg-black/30 transition">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${d.type === 'AP' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                            {d.type === 'AP' ? 'NỢ PHẢI TRẢ (AP)' : 'NỢ PHẢI THU (AR)'}
                          </span>
                          <span className="font-bold text-slate-300 font-mono text-xs">{d.referenceNo}</span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium line-clamp-1">{partnerName}</p>
                        <p className="text-[10px] text-amber-400 font-semibold">
                          Còn {daysLeft} ngày (Hạn: {d.dueDate})
                        </p>
                      </div>
                      <div className="text-right space-y-1.5">
                        <p className="text-xs text-slate-400">Còn nợ: <strong className="text-amber-400 font-mono text-sm">{remaining.toLocaleString()}đ</strong></p>
                        <button
                          onClick={() => {
                            setSelectedDebt(d);
                            setPaymentAmount(remaining);
                          }}
                          className="text-[10px] bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-white px-2.5 py-1 rounded-lg border border-amber-500/20 font-bold transition flex items-center gap-1 ml-auto"
                        >
                          {d.type === 'AP' ? 'Thanh toán' : 'Thu nợ'}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-[#11141b] border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-2 h-[312px]">
              <div className="bg-white/5 p-3 rounded-full text-slate-400">
                <Bell className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-200">Không có công nợ sắp đến hạn</h4>
              <p className="text-xs text-slate-400 max-w-xs">Không ghi nhận khoản công nợ phải thu/phải trả nào sắp đến hạn trong vòng 7 ngày tới.</p>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-white/5 gap-1.5 pb-0.5">
        <button
          onClick={() => handleTabChange('ap')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'ap' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          Phải trả Nhà cung cấp (AP)
        </button>
        <button
          onClick={() => handleTabChange('ar')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'ar' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          Phải thu Khách hàng (AR)
        </button>
        <button
          onClick={() => handleTabChange('payments')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'payments' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          Nhật ký thanh toán tiền mặt/chuyển khoản
        </button>
      </div>

      {/* Tab Contents: AP / AR DEBTS */}
      {(activeTab === 'ap' || activeTab === 'ar') && (
        <div className="space-y-4">
          <div className="bg-[#11141b] border border-white/5 rounded-2xl shadow-2xl overflow-visible p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">
                  {activeTab === 'ap'
                    ? 'Sổ theo dõi nợ phải trả Nhà cung cấp (Tài khoản 331)'
                    : 'Sổ theo dõi nợ phải thu Khách hàng (Tài khoản 131)'}
                </h3>
              </div>
            </div>

            <AdvancedTable
              data={filteredDebts}
              columns={debtsColumns}
              searchableKeys={['referenceNo']}
              searchPlaceholder="Tìm theo số chứng từ gốc..."
              keyExtractor={(d) => d.id}
              filterOptions={[
                {
                  key: 'status',
                  label: 'Tình trạng tất toán',
                  type: 'select',
                  options: [
                    { value: 'UNPAID', label: 'Chưa thanh toán (Unpaid)' },
                    { value: 'PARTIAL', label: 'Thanh toán một phần (Partial)' },
                    { value: 'PAID', label: 'Đã hoàn tất (Paid)' },
                  ],
                },
                { key: 'date', label: 'Ngày ghi nhận', type: 'date' },
              ]}
              activeFilters={debtFilters[activeTab]}
              onFilterChange={handleFilterChange}
              onFilterReset={handleResetFilter}
            />
          </div>
        </div>
      )}

      {/* Tab Content: PAYMENTS JOURNAL */}
      {activeTab === 'payments' && (
        <div className="bg-[#11141b] border border-white/5 rounded-2xl shadow-2xl overflow-hidden p-4 space-y-4">
          <div className="flex items-center gap-2 text-slate-300">
            <History className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Sổ quỹ tiền mặt & Tiền gửi Ngân hàng (Nhật ký thanh toán)</h3>
          </div>

          <AdvancedTable
            data={db.payments}
            columns={paymentsColumns}
            searchableKeys={['referenceNo', 'notes']}
            searchPlaceholder="Tìm theo số chứng từ, ghi chú..."
            keyExtractor={(p) => p.id}
          />
        </div>
      )}

      {/* Record Payment Modal popup */}
      {selectedDebt && (
        <div className="fixed inset-0 bg-[#08090a]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <form onSubmit={handleRecordPayment} className="bg-[#11141b] rounded-2xl w-full max-w-md border border-white/5 shadow-2xl p-6 space-y-4 animate-fadeIn">
            <h3 className="font-bold text-white text-base">
              {selectedDebt.type === 'AP' ? 'Tất toán thanh toán Nhà cung cấp' : 'Ghi nhận khách hàng trả nợ'}
            </h3>
            <p className="text-xs text-slate-400">
              Bút toán kế toán sẽ được sinh tự động khớp với TK hạch toán.
            </p>

            <div className="space-y-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Hóa đơn gốc cần hạch toán</label>
                <input
                  type="text"
                  disabled
                  value={selectedDebt.referenceNo}
                  className="text-xs border border-white/10 rounded-lg px-3 py-2 bg-black/40 text-slate-200 font-bold font-mono outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Số tiền chi trả tất toán (VNĐ)</label>
                <input
                  type="number"
                  required
                  max={selectedDebt.amount - selectedDebt.paidAmount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-black/40 text-slate-200 text-right font-bold outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Hình thức quỹ thanh toán</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="text-xs border border-white/10 rounded-lg px-3 py-2 bg-black/40 text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="BANK" className="bg-[#11141b] text-slate-200">Ủy nhiệm chi / Chuyển khoản (TK 112)</option>
                  <option value="CASH" className="bg-[#11141b] text-slate-200">Phiếu chi / Tiền mặt tại quỹ (TK 111)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Mã UNC / Số phiếu hạch toán (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: UNC-001"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="text-xs border border-white/10 rounded-lg px-3 py-2 bg-black/40 text-slate-200 uppercase font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Ghi chú diễn giải kế toán</label>
                <input
                  type="text"
                  placeholder="Diễn giải bút toán sổ quỹ..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="text-xs border border-white/10 rounded-lg px-3 py-2 bg-black/40 text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 text-xs rounded-xl transition"
              >
                Ghi nhận bút toán quỹ
              </button>
              <button
                type="button"
                onClick={() => setSelectedDebt(null)}
                className="border border-white/10 text-slate-400 px-4 py-2 text-xs rounded-xl hover:bg-white/[0.03] transition"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      <ExcelImportModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        db={db}
        defaultType="debts"
        onUpdate={() => {
          handleTabChange(activeTab);
          onUpdate();
        }}
        onImportSuccess={(msg) => {
          handleTabChange(activeTab);
          showToast(msg);
        }}
      />
    </motion.div>
  );
}
