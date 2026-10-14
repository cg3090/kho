/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MockDatabase } from '../db/mockDb';
import { ChartOfAccount, AccountMapping, User } from '../types';
import { Plus, ListFilter, Map, Table, ClipboardList, BookOpen, Calculator, RefreshCw, Database, Lock, FileSpreadsheet, Download, CheckCircle2 } from 'lucide-react';
import AdvancedFilter from './AdvancedFilter';
import AdvancedTable from './AdvancedTable';
import SearchableSelect from './SearchableSelect';
import ExcelImportModal from './ExcelImportModal';
import { downloadExcelTemplate, exportDataToExcel } from '../utils/excelHelper';
import { motion } from 'motion/react';
import { formatDate } from '../utils/dateUtils';
import OpeningStockManager from './OpeningStockManager';
import YearEndClosingManager from './YearEndClosingManager';

interface AccountingProps {
  db: MockDatabase;
  onUpdate: () => void;
  updateTrigger?: number;
  currentUser?: User | null;
}

export default function Accounting({ db, onUpdate, updateTrigger, currentUser }: AccountingProps) {
  const [activeTab, setActiveTab] = useState<'journal' | 'coa' | 'mapping' | 'trial' | 'balance-sheet' | 'income-statement' | 'opening-balance' | 'year-end-closing'>('journal');
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // New Account State
  const [showCoaForm, setShowCoaForm] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'OFF_BALANCE'>('ASSET');
  const [parentCode, setParentCode] = useState('');

  // Editing Mapping State
  const [selectedMapKey, setSelectedMapKey] = useState<string | null>(null);
  const [mappedAccountCode, setMappedAccountCode] = useState('');

  // General Journal entries filters with persistent filter memory
  const [journalFilters, setJournalFilters] = useState<Record<string, any>>({});
  const [filteredEntries, setFilteredEntries] = useState(db.journalEntries);

  const applyJournalFilters = (filters: Record<string, any>, source = db.journalEntries) => {
    let result = [...source];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((je) => je.referenceNo.toLowerCase().includes(q) || je.description.toLowerCase().includes(q));
    }
    if (filters.accountCode) {
      // Find entries that have a line with this account code
      const entryIdsWithAccount = db.journalLines
        .filter((l) => l.accountCode.startsWith(filters.accountCode))
        .map((l) => l.entryId);
      result = result.filter((je) => entryIdsWithAccount.includes(je.id));
    }
    if (filters.dateRange) {
      if (typeof filters.dateRange === 'string') {
        result = result.filter((je) => je.date === filters.dateRange);
      } else {
        const { min, max } = filters.dateRange;
        if (min) result = result.filter((je) => je.date >= min);
        if (max) result = result.filter((je) => je.date <= max);
      }
    }

    return result;
  };

  // Synchronize filteredEntries when database updates while strictly preserving any active filters
  useEffect(() => {
    setFilteredEntries(applyJournalFilters(journalFilters, db.journalEntries));
  }, [updateTrigger, db.journalEntries, db.journalEntries.length, journalFilters]);

  const handleFilterChange = (filters: Record<string, any>) => {
    setJournalFilters(filters);
    setFilteredEntries(applyJournalFilters(filters, db.journalEntries));
  };

  const handleResetFilter = () => {
    setJournalFilters({});
    setFilteredEntries(db.journalEntries);
  };

  // Add Account submit handler
  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) return showToast('Vui lòng điền đủ mã và tên tài khoản!');

    const res = db.addAccount(newCode.trim(), newName.trim(), newType, parentCode.trim() || undefined);
    showToast(res.message);
    if (res.success) {
      onUpdate();
      setShowCoaForm(false);
      setNewCode('');
      setNewName('');
      setParentCode('');
    }
  };

  // Map account update handler
  const handleUpdateMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMapKey || !mappedAccountCode) return;

    const mappings = db.accountMapping || [];
    const map = mappings.find((m) => m.key === selectedMapKey);
    if (map) {
      map.accountCode = mappedAccountCode;
      if (typeof db.saveAll === 'function') {
        db.saveAll();
      }
      onUpdate();
      showToast('Cập nhật quy tắc map tài khoản thành công!');
      setSelectedMapKey(null);
    }
  };

  // Fetch Report Data
  const trialBalance = db.getTrialBalance();
  const incomeStatement = db.getIncomeStatement();
  const balanceSheet = db.getBalanceSheet();

  const flattenedJournalLines = filteredEntries.flatMap((je) => {
    const lines = db.journalLines.filter((l) => l.entryId === je.id);
    return lines.map((line, idx) => {
      let partnerName = '';
      if (line.partnerId) {
        if (line.partnerType === 'SUPPLIER') {
          partnerName = db.suppliers.find((s) => s.id === line.partnerId)?.name || 'NCC';
        } else {
          partnerName = db.customers.find((c) => c.id === line.partnerId)?.name || 'Khách hàng';
        }
      }
      const side = (line as any).side || (line.debit > 0 ? 'DEBIT' : 'CREDIT');
      const amount = (line as any).amount !== undefined ? (line as any).amount : (line.debit > 0 ? line.debit : line.credit);
      return {
        ...line,
        side,
        amount,
        jeDate: je.date,
        jeRef: je.referenceNo,
        jeDesc: je.description,
        jeIsReversed: je.isReversed,
        partnerName,
        isFirstInEntry: idx === 0,
        entryLineCount: lines.length,
      };
    });
  });

  const journalColumns = [
    {
      key: 'jeDate',
      label: 'Ngày',
      sortable: true,
      render: (l: any) => l.isFirstInEntry ? <span className="font-mono text-slate-400 font-bold">{formatDate(l.jeDate)}</span> : null,
    },
    {
      key: 'jeRef',
      label: 'Chứng từ',
      sortable: true,
      render: (l: any) => l.isFirstInEntry ? (
        <span className={`font-bold font-mono ${l.jeIsReversed ? 'text-rose-400 line-through' : 'text-emerald-400'}`}>
          {l.jeRef}
        </span>
      ) : null,
    },
    {
      key: 'jeDesc',
      label: 'Diễn giải hạch toán',
      sortable: true,
      render: (l: any) => l.isFirstInEntry ? (
        <span className={`font-semibold ${l.jeIsReversed ? 'text-slate-500 italic' : 'text-slate-200'}`}>
          {l.jeDesc} {l.jeIsReversed && '(BÚT TOÁN ĐẢO HỦY)'}
        </span>
      ) : null,
    },
    {
      key: 'accountCode',
      label: 'TK Nợ/Có',
      sortable: true,
      render: (l: any) => (
        <span className={`font-mono font-bold ${l.side === 'DEBIT' ? 'text-white font-black' : 'text-slate-400 pl-4'}`}>
          {l.accountCode}
        </span>
      ),
    },
    {
      key: 'debit',
      label: 'Số phát sinh Nợ',
      sortable: true,
      align: 'right' as const,
      render: (l: any) => l.side === 'DEBIT' ? (
        <span className="font-bold text-slate-200">{l.amount.toLocaleString()}đ</span>
      ) : (
        <span className="text-slate-600">-</span>
      ),
    },
    {
      key: 'credit',
      label: 'Số phát sinh Có',
      sortable: true,
      align: 'right' as const,
      render: (l: any) => l.side === 'CREDIT' ? (
        <span className="font-bold text-slate-200">{l.amount.toLocaleString()}đ</span>
      ) : (
        <span className="text-slate-600">-</span>
      ),
    },
    {
      key: 'partnerName',
      label: 'Đối tượng',
      sortable: true,
      render: (l: any) => <span className="text-slate-400 font-medium">{l.partnerName || '-'}</span>,
    },
  ];

  const coaColumns = [
    {
      key: 'code',
      label: 'Mã số TK',
      sortable: true,
      render: (a: any) => <span className="font-mono font-bold text-emerald-400">{a.code}</span>,
    },
    {
      key: 'name',
      label: 'Tên gọi tài khoản',
      sortable: true,
      render: (a: any) => <span className="font-semibold text-slate-200">{a.name}</span>,
    },
    {
      key: 'type',
      label: 'Tính chất',
      sortable: true,
      render: (a: any) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 border border-white/10 text-slate-300">
          {a.type}
        </span>
      ),
    },
    {
      key: 'parentCode',
      label: 'TK Mẹ',
      sortable: true,
      render: (a: any) => <span className="font-mono text-slate-400">{a.parentCode || '-'}</span>,
    },
    {
      key: 'isCustom',
      label: 'Loại',
      sortable: true,
      render: (a: any) => a.isCustom ? (
        <span className="text-[10px] text-emerald-400 font-bold">Người dùng thêm</span>
      ) : (
        <span className="text-[10px] text-slate-500">Chuẩn BTC</span>
      ),
    },
  ];

  const mappingColumns = [
    {
      key: 'key',
      label: 'Khóa ánh xạ (Mapping Key)',
      sortable: true,
      render: (m: any) => <span className="font-mono font-bold text-emerald-400">{m.key}</span>,
    },
    {
      key: 'description',
      label: 'Diễn giải sự nghiệp hạch toán',
      sortable: true,
      render: (m: any) => <span className="text-slate-400">{m.description}</span>,
    },
    {
      key: 'accountCode',
      label: 'Mã tài khoản đang ánh xạ',
      sortable: true,
      render: (m: any) => (
        <span className="p-2 font-mono font-extrabold text-slate-200 bg-emerald-500/5 border border-emerald-500/10 rounded">
          {m.accountCode} - {db.coa.find((a) => a.code === m.accountCode)?.name || 'Chưa định danh'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Hành động',
      sortable: false,
      align: 'center' as const,
      render: (m: any) => (
        <button
          onClick={() => {
            setSelectedMapKey(m.key);
            setMappedAccountCode(m.accountCode);
          }}
          className="text-xs text-emerald-400 hover:text-emerald-300 font-bold"
        >
          Sửa Ánh Xạ
        </button>
      ),
    },
  ];

  const trialColumns = [
    {
      key: 'code',
      label: 'Mã TK',
      sortable: true,
      render: (r: any) => <span className="font-mono font-bold text-emerald-400">{r.code}</span>,
    },
    {
      key: 'name',
      label: 'Tên tài khoản kế toán',
      sortable: true,
      render: (r: any) => <span className="font-semibold text-slate-200">{r.name}</span>,
    },
    {
      key: 'openingDebit',
      label: 'Đầu kỳ Nợ',
      sortable: true,
      align: 'right' as const,
      render: (r: any) => r.openingDebit > 0 ? <span className="text-slate-400 font-medium">{r.openingDebit.toLocaleString()}đ</span> : <span className="text-slate-600">-</span>,
    },
    {
      key: 'openingCredit',
      label: 'Đầu kỳ Có',
      sortable: true,
      align: 'right' as const,
      render: (r: any) => r.openingCredit > 0 ? <span className="text-slate-400 font-medium">{r.openingCredit.toLocaleString()}đ</span> : <span className="text-slate-600">-</span>,
    },
    {
      key: 'periodDebit',
      label: 'Phát sinh Nợ',
      sortable: true,
      align: 'right' as const,
      render: (r: any) => r.periodDebit > 0 ? <span className="text-slate-400 font-medium">{r.periodDebit.toLocaleString()}đ</span> : <span className="text-slate-600">-</span>,
    },
    {
      key: 'periodCredit',
      label: 'Phát sinh Có',
      sortable: true,
      align: 'right' as const,
      render: (r: any) => r.periodCredit > 0 ? <span className="text-slate-400 font-medium">{r.periodCredit.toLocaleString()}đ</span> : <span className="text-slate-600">-</span>,
    },
    {
      key: 'closingDebit',
      label: 'Cuối kỳ Nợ',
      sortable: true,
      align: 'right' as const,
      render: (r: any) => r.closingDebit > 0 ? <span className="text-slate-200 font-bold">{r.closingDebit.toLocaleString()}đ</span> : <span className="text-slate-600">-</span>,
    },
    {
      key: 'closingCredit',
      label: 'Cuối kỳ Có',
      sortable: true,
      align: 'right' as const,
      render: (r: any) => r.closingCredit > 0 ? <span className="text-slate-200 font-bold">{r.closingCredit.toLocaleString()}đ</span> : <span className="text-slate-600">-</span>,
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

      {/* Upper Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Kế toán doanh nghiệp & Báo cáo tài chính</h2>
          <p className="text-sm text-slate-400">Xem sổ sách kế toán, sơ đồ ánh xạ tài khoản, bảng cân đối phát sinh và báo cáo Kết quả KD tự động</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowExcelModal(true)}
            className="flex items-center gap-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold px-4 py-2.5 rounded-xl text-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Nhập từ Excel</span>
          </button>
          <button
            type="button"
            onClick={() => downloadExcelTemplate(activeTab === 'opening-balance' ? 'opening_stock' : 'coa')}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold px-3.5 py-2 rounded-xl text-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tải File Mẫu</span>
          </button>
          <button
            type="button"
            onClick={() => exportDataToExcel(db, activeTab === 'opening-balance' ? 'opening_stock' : 'coa')}
            className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-semibold px-3.5 py-2 rounded-xl text-xs transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Tab navigations */}
      <div className="flex flex-wrap border-b border-white/5 gap-1.5 pb-0.5">
        <button
          onClick={() => setActiveTab('journal')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'journal' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          Nhật ký chung (Sổ cái)
        </button>
        <button
          onClick={() => setActiveTab('coa')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'coa' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          Hệ thống tài khoản
        </button>
        <button
          onClick={() => setActiveTab('mapping')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'mapping' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          Quy tắc ánh xạ (Mapping)
        </button>
        <button
          onClick={() => setActiveTab('trial')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'trial' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          Cân đối phát sinh
        </button>
        <button
          onClick={() => setActiveTab('balance-sheet')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'balance-sheet' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          Bảng CĐKT
        </button>
        <button
          onClick={() => setActiveTab('income-statement')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'income-statement' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          BCKQKD (P&L)
        </button>
        <button
          onClick={() => setActiveTab('opening-balance')}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'opening-balance' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Số dư đầu kỳ</span>
        </button>
        <button
          onClick={() => setActiveTab('year-end-closing')}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'year-end-closing' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Kết chuyển cuối năm</span>
        </button>
      </div>

      {/* TAB Content: GENERAL JOURNAL */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          <div className="bg-[#11141b] border border-white/5 rounded-2xl shadow-2xl overflow-visible p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2 text-slate-300">
                <ClipboardList className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Sổ nhật ký chung doanh nghiệp (General Journal)</h3>
              </div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Tự động kết xuất</p>
            </div>

            <AdvancedTable
              data={flattenedJournalLines}
              columns={journalColumns}
              searchableKeys={['jeRef', 'jeDesc', 'accountCode', 'partnerName']}
              searchPlaceholder="Tìm kiếm theo chứng từ, diễn giải, tài khoản..."
              keyExtractor={(l) => `${l.id}-${l.side}`}
              filterOptions={[
                { key: 'accountCode', label: 'Tài khoản (Bắt đầu bằng)', type: 'text' },
                { key: 'dateRange', label: 'Ngày lập', type: 'date' },
              ]}
              activeFilters={journalFilters}
              onFilterChange={handleFilterChange}
              onFilterReset={handleResetFilter}
            />
          </div>
        </div>
      )}

      {/* TAB Content: CHART OF ACCOUNTS */}
      {activeTab === 'coa' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#11141b] border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-black/20 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Danh mục hệ thống tài khoản kế toán</h3>
              </div>
              <button
                onClick={() => setShowCoaForm(!showCoaForm)}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg transition"
              >
                + Thêm tài khoản mới
              </button>
            </div>

            <div className="p-4 space-y-4">
              <AdvancedTable
                data={db.coa}
                columns={coaColumns}
                searchableKeys={['code', 'name', 'type']}
                searchPlaceholder="Tìm theo mã TK, tên tài khoản..."
                keyExtractor={(a) => a.code}
              />
            </div>
          </div>

          {/* Form to add custom Coa */}
          {showCoaForm ? (
            <form onSubmit={handleAddAccount} className="bg-[#11141b] border border-white/5 rounded-2xl p-5 space-y-4 shadow-2xl self-start">
              <h4 className="font-bold text-white text-sm">Thêm tài khoản thủ công</h4>
              <p className="text-xs text-slate-400">Bổ sung tài khoản phụ hoặc tài khoản chi tiết theo cơ cấu doanh nghiệp.</p>

              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400">Số hiệu tài khoản (Bắt buộc)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 15611"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="text-xs border border-white/10 rounded-lg px-3 py-2 bg-black/40 text-slate-200 font-mono focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400">Tên tài khoản (Bắt buộc)</label>
                  <input
                    type="text"
                    required
                    placeholder="Tên tài khoản tiếng Việt"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="text-xs border border-white/10 rounded-lg px-3 py-2 bg-black/40 text-slate-200 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400">Tính chất nguồn/tài sản</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="text-xs border border-white/10 rounded-lg px-3 py-2 bg-black/40 text-slate-200 focus:border-emerald-500 outline-none"
                  >
                    <option value="ASSET" className="bg-[#11141b] text-slate-200">TÀI SẢN (Asset)</option>
                    <option value="LIABILITY" className="bg-[#11141b] text-slate-200">NỢ PHẢI TRẢ (Liability)</option>
                    <option value="EQUITY" className="bg-[#11141b] text-slate-200">VỐN CHỦ SỞ HỮU (Equity)</option>
                    <option value="REVENUE" className="bg-[#11141b] text-slate-200">DOANH THU (Revenue)</option>
                    <option value="EXPENSE" className="bg-[#11141b] text-slate-200">CHI PHÍ (Expense)</option>
                    <option value="OFF_BALANCE" className="bg-[#11141b] text-slate-200">NGOÀI BẢNG (Off Balance)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400">Mã tài khoản cấp trên (Tùy chọn)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 156"
                    value={parentCode}
                    onChange={(e) => setParentCode(e.target.value)}
                    className="text-xs border border-white/10 rounded-lg px-3 py-2 bg-black/40 text-slate-200 font-mono focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="bg-emerald-600 text-white font-bold px-3 py-2 text-xs rounded-lg hover:bg-emerald-500 transition"
                >
                  Thêm tài khoản
                </button>
                <button
                  type="button"
                  onClick={() => setShowCoaForm(false)}
                  className="border border-white/10 text-slate-400 px-3 py-2 text-xs rounded-lg hover:bg-white/[0.03] transition"
                >
                  Hủy
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-[#11141b] border border-white/5 rounded-2xl p-5 shadow-2xl text-slate-400 text-xs space-y-3">
              <h4 className="font-bold text-white text-sm">Hệ thống chuẩn mực kế toán Việt Nam</h4>
              <p>Mặc định hệ thống cung cấp đầy đủ các tài khoản cơ bản phục vụ tính giá vốn bình quân liên hoàn, báo cáo VAT đầu vào, đầu ra.</p>
              <div className="p-3 bg-black/20 rounded-xl border border-white/5 font-mono text-[10px] space-y-1 text-slate-300">
                <div>- 111, 112: Tiền mặt, tiền ngân hàng</div>
                <div>- 131: Phải thu khách hàng</div>
                <div>- 1331: VAT đầu vào khấu trừ</div>
                <div>- 1561: Giá mua hàng hóa trong kho</div>
                <div>- 331: Phải trả nhà bán hàng</div>
                <div>- 3331: VAT đầu ra phải nộp</div>
                <div>- 511: Doanh thu bán hàng</div>
                <div>- 632: Giá vốn hàng bán</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB Content: ACCOUNT MAPPING RULES */}
      {activeTab === 'mapping' && (
        <div className="bg-[#11141b] border border-white/5 rounded-2xl shadow-2xl overflow-hidden p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Quy tắc cấu hình ánh xạ hạch toán tài khoản (Account Mapping)</h3>
            </div>
            <p className="text-xs text-slate-400">Hệ thống tự động sử dụng quy định này khi sinh bút toán hạch toán, không hằng số hóa tài khoản.</p>
          </div>

          <AdvancedTable
            data={db.accountMapping || []}
            columns={mappingColumns}
            searchableKeys={['key', 'description', 'accountCode']}
            searchPlaceholder="Tìm kiếm theo mã khóa, diễn giải, tài khoản..."
            keyExtractor={(m) => m.key}
          />

          {selectedMapKey && (
            <div className="fixed inset-0 bg-[#08090a]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <form onSubmit={handleUpdateMapping} className="bg-[#11141b] rounded-2xl border border-white/5 w-full max-w-md p-6 space-y-4 shadow-2xl">
                <h3 className="font-bold text-white text-base">Cấu hình ánh xạ lại cho: {selectedMapKey}</h3>
                <p className="text-xs text-slate-400">Chọn tài khoản khác để thay thế hạch toán tự động.</p>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Chọn tài khoản hạch toán mới</label>
                  <SearchableSelect
                    id="mapped-account-select"
                    options={db.coa.map((a) => ({ value: a.code, label: `${a.code} - ${a.name}` }))}
                    value={mappedAccountCode}
                    onChange={(val) => setMappedAccountCode(val)}
                    placeholder="Chọn tài khoản..."
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 text-xs rounded-xl transition"
                  >
                    Lưu cấu hình
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMapKey(null)}
                    className="border border-white/10 text-slate-400 px-4 py-2 text-xs rounded-xl hover:bg-white/[0.03] transition"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB Content: TRIAL BALANCE */}
      {activeTab === 'trial' && (
        <div className="bg-[#11141b] border border-white/5 rounded-2xl shadow-2xl overflow-hidden p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Bảng Cân đối số phát sinh tài khoản (Trial Balance)</h3>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Tự động cân đối</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-[#11141b]/40 border border-white/5 rounded-xl p-3 space-y-1">
              <span className="text-slate-400 block font-medium uppercase text-[10px] tracking-wider">Cân đối Số dư đầu kỳ</span>
              <div className="flex justify-between font-bold">
                <span className="text-slate-400">Nợ: <span className="text-slate-200">{trialBalance.reduce((sum, r) => sum + r.openingDebit, 0).toLocaleString()}đ</span></span>
                <span className="text-slate-400">Có: <span className="text-slate-200">{trialBalance.reduce((sum, r) => sum + r.openingCredit, 0).toLocaleString()}đ</span></span>
              </div>
            </div>
            <div className="bg-[#11141b]/40 border border-white/5 rounded-xl p-3 space-y-1">
              <span className="text-slate-400 block font-medium uppercase text-[10px] tracking-wider">Cân đối Số phát sinh trong kỳ</span>
              <div className="flex justify-between font-bold">
                <span className="text-slate-400">Nợ: <span className="text-emerald-400">{trialBalance.reduce((sum, r) => sum + r.periodDebit, 0).toLocaleString()}đ</span></span>
                <span className="text-slate-400">Có: <span className="text-emerald-400">{trialBalance.reduce((sum, r) => sum + r.periodCredit, 0).toLocaleString()}đ</span></span>
              </div>
            </div>
            <div className="bg-[#11141b]/40 border border-white/5 rounded-xl p-3 space-y-1">
              <span className="text-slate-400 block font-medium uppercase text-[10px] tracking-wider">Cân đối Số dư cuối kỳ</span>
              <div className="flex justify-between font-bold">
                <span className="text-slate-400">Nợ: <span className="text-emerald-400 font-black">{trialBalance.reduce((sum, r) => sum + r.closingDebit, 0).toLocaleString()}đ</span></span>
                <span className="text-slate-400">Có: <span className="text-emerald-400 font-black">{trialBalance.reduce((sum, r) => sum + r.closingCredit, 0).toLocaleString()}đ</span></span>
              </div>
            </div>
          </div>

          <AdvancedTable
            data={trialBalance}
            columns={trialColumns}
            searchableKeys={['code', 'name']}
            searchPlaceholder="Tìm theo mã TK, tên tài khoản..."
            keyExtractor={(r) => r.code}
          />
        </div>
      )}

      {/* TAB Content: BALANCE SHEET */}
      {activeTab === 'balance-sheet' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#11141b] border border-white/5 rounded-2xl p-6 shadow-2xl">
          {/* Left: Assets */}
          <div className="space-y-4">
            <div className="border-b border-white/5 pb-2 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">PHẦN I. TÀI SẢN (ASSETS)</h3>
              <span className="text-[10px] text-slate-500 font-mono font-semibold">Bên Nợ sổ cái</span>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex justify-between items-center p-2.5 bg-black/10 rounded-lg">
                <span className="font-medium">1. Tiền và tương đương tiền (111, 112)</span>
                <span className="font-bold text-slate-100">{balanceSheet.cashAndBank.toLocaleString()}đ</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-black/10 rounded-lg">
                <span className="font-medium">2. Phải thu khách hàng ngắn hạn (131)</span>
                <span className="font-bold text-slate-100">{balanceSheet.receivables.toLocaleString()}đ</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-black/10 rounded-lg">
                <span className="font-medium">3. Hàng tồn kho vật liệu/hàng hóa (1561)</span>
                <span className="font-bold text-slate-100">{balanceSheet.inventory.toLocaleString()}đ</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-black/10 rounded-lg">
                <span className="font-medium">4. Thuế GTGT được khấu trừ (1331)</span>
                <span className="font-bold text-slate-100">{balanceSheet.vatInput.toLocaleString()}đ</span>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-white/5 pt-3 text-sm font-extrabold text-emerald-400 bg-emerald-500/5 p-2.5 rounded-xl border border-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
              <span>TỔNG CỘNG TÀI SẢN</span>
              <span>{balanceSheet.totalAssets.toLocaleString()}đ</span>
            </div>
          </div>

          {/* Right: Liabilities & Equity */}
          <div className="space-y-4">
            <div className="border-b border-white/5 pb-2 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">PHẦN II. NGUỒN VỐN (RESOURCES)</h3>
              <span className="text-[10px] text-slate-500 font-mono font-semibold">Bên Có sổ cái</span>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300">
              {/* Liabilities */}
              <div>
                <h4 className="font-bold text-slate-500 text-[10px] uppercase mb-1.5 tracking-wider">A. Nợ phải trả (Liabilities)</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-black/10 rounded-lg">
                    <span>1. Phải trả người bán ngắn hạn (331)</span>
                    <span className="font-bold text-slate-100">{balanceSheet.payables.toLocaleString()}đ</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-black/10 rounded-lg">
                    <span>2. Thuế và các khoản phải nộp nhà nước (3331)</span>
                    <span className="font-bold text-slate-100">{balanceSheet.vatOutput.toLocaleString()}đ</span>
                  </div>
                </div>
              </div>

              {/* Equity */}
              <div>
                <h4 className="font-bold text-slate-500 text-[10px] uppercase mb-1.5 tracking-wider">B. Vốn chủ sở hữu (Equity)</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-black/10 rounded-lg">
                    <span>1. Vốn góp của chủ sở hữu (411)</span>
                    <span className="font-bold text-slate-100">{balanceSheet.ownerEquity.toLocaleString()}đ</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-black/10 rounded-lg">
                    <span>2. Lợi nhuận sau thuế chưa phân phối (421)</span>
                    <span className="font-bold text-emerald-400">{balanceSheet.currentProfit.toLocaleString()}đ</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-white/5 pt-3 text-sm font-extrabold text-emerald-400 bg-emerald-500/5 p-2.5 rounded-xl border border-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
              <span>TỔNG CỘNG NGUỒN VỐN</span>
              <span>{balanceSheet.totalResources.toLocaleString()}đ</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB Content: INCOME STATEMENT */}
      {activeTab === 'income-statement' && (
        <div className="bg-[#11141b] border border-white/5 rounded-2xl p-6 shadow-2xl max-w-3xl mx-auto space-y-4">
          <div className="border-b border-white/5 pb-3 text-center">
            <h3 className="font-bold text-white text-lg">BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH (P&L)</h3>
            <p className="text-xs text-slate-400">Mẫu số B02-DNN theo Thông tư 133 của Bộ Tài chính</p>
          </div>

          <div className="space-y-3.5 text-xs text-slate-300">
            <div className="flex justify-between items-center p-2.5 border-b border-white/5">
              <span className="font-medium text-slate-400">1. Doanh thu bán hàng và cung cấp dịch vụ (TK 511)</span>
              <span className="font-bold text-slate-200">{incomeStatement.totalRevenue.toLocaleString()}đ</span>
            </div>
            <div className="flex justify-between items-center p-2.5 border-b border-white/5 text-slate-500">
              <span className="font-medium text-slate-500">2. Các khoản giảm trừ doanh thu</span>
              <span>-đ</span>
            </div>
            <div className="flex justify-between items-center p-2.5 border-b border-white/10 font-bold bg-white/[0.02] text-white">
              <span>3. Doanh thu thuần về bán hàng (3 = 1 - 2)</span>
              <span>{incomeStatement.totalRevenue.toLocaleString()}đ</span>
            </div>
            <div className="flex justify-between items-center p-2.5 border-b border-white/5 text-slate-300">
              <span className="font-medium text-slate-400">4. Giá vốn hàng bán ra (TK 632)</span>
              <span className="text-rose-400 font-semibold">({incomeStatement.totalCOGS.toLocaleString()}đ)</span>
            </div>
            <div className="flex justify-between items-center p-2.5 border-b border-white/10 font-bold bg-emerald-500/5 text-emerald-400 border border-emerald-500/10">
              <span>5. Lợi nhuận gộp về bán hàng (5 = 3 - 4)</span>
              <span>{incomeStatement.grossProfit.toLocaleString()}đ</span>
            </div>
            <div className="flex justify-between items-center p-2.5 border-b border-white/5 text-slate-300">
              <span className="font-medium text-slate-400">6. Chi phí bán hàng & quản lý doanh nghiệp (TK 642)</span>
              <span className="text-rose-400 font-semibold">({incomeStatement.totalAdminExpense.toLocaleString()}đ)</span>
            </div>
            <div className="flex justify-between items-center p-2.5 border-b border-white/10 font-bold bg-white/[0.02] text-white">
              <span>7. Lợi nhuận thuần trước thuế (7 = 5 - 6)</span>
              <span>{incomeStatement.netProfitBeforeTax.toLocaleString()}đ</span>
            </div>
            <div className="flex justify-between items-center p-2.5 border-b border-white/5 text-slate-500">
              <span>8. Thuế thu nhập doanh nghiệp ước tính (CIT 20%)</span>
              <span>({incomeStatement.taxAmount.toLocaleString()}đ)</span>
            </div>
            <div className="flex justify-between items-center p-3 border-b border-emerald-500/20 font-black text-sm bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <span>9. LỢI NHUẬN SAU THUẾ TỰ ĐỘNG (9 = 7 - 8)</span>
              <span>{incomeStatement.netProfit.toLocaleString()}đ</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB Content: OPENING BALANCE */}
      {activeTab === 'opening-balance' && (
        <OpeningStockManager db={db} onUpdate={onUpdate} updateTrigger={updateTrigger} currentUser={currentUser} />
      )}

      {/* TAB Content: YEAR-END CLOSING */}
      {activeTab === 'year-end-closing' && (
        <YearEndClosingManager db={db} onUpdate={onUpdate} currentUser={currentUser} />
      )}

      <ExcelImportModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        db={db}
        defaultType={activeTab === 'opening-balance' ? 'opening_stock' : 'coa'}
        onUpdate={() => {
          setFilteredEntries([...db.journalEntries]);
          onUpdate();
        }}
        onImportSuccess={(msg) => {
          setFilteredEntries([...db.journalEntries]);
          showToast(msg);
        }}
      />
    </motion.div>
  );
}
