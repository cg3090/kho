/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Settings2,
  Download,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  X,
  Trash2,
  Maximize2,
  Minimize2,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SearchableSelect from './SearchableSelect';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => React.ReactNode;
}

export interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number-range';
  options?: { value: string; label: string }[];
}

interface BulkAction<T> {
  label: string;
  icon?: React.ReactNode;
  variant?: 'danger' | 'primary' | 'success' | 'warning';
  action: (selectedItems: T[], clearSelection: () => void) => void;
}

interface AdvancedTableProps<T> {
  id?: string;
  data: T[];
  columns: Column<T>[];
  searchableKeys?: (keyof T | string)[];
  searchPlaceholder?: string;
  bulkActions?: BulkAction<T>[];
  toolbarActions?: React.ReactNode;
  defaultSort?: { key: string; direction: 'asc' | 'desc' };
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyStateText?: string;
  keyExtractor?: (item: T, index?: number) => string | number;
  filterOptions?: FilterOption[];
  activeFilters?: Record<string, any>;
  onFilterChange?: (filters: Record<string, any>) => void;
  onFilterReset?: () => void;
}

export default function AdvancedTable<T extends Record<string, any>>({
  id = 'table-export',
  data,
  columns,
  searchableKeys = [],
  searchPlaceholder = 'Tìm kiếm dữ liệu...',
  bulkActions = [],
  toolbarActions,
  defaultSort,
  onRowClick,
  isLoading = false,
  emptyStateText = 'Không tìm thấy kết quả phù hợp.',
  keyExtractor = (item, index) => item.id,
  filterOptions,
  activeFilters,
  onFilterChange,
  onFilterReset,
}: AdvancedTableProps<T>) {
  // State variables
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    defaultSort || null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map((col) => col.key));
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Compute number of currently active custom filters
  const activeFilterCount = activeFilters
    ? Object.keys(activeFilters).filter((k) => {
        const val = activeFilters[k];
        if (val === undefined || val === null || val === '') return false;
        if (typeof val === 'object') {
          return (val.min !== undefined && val.min !== '') || (val.max !== undefined && val.max !== '');
        }
        return true;
      }).length
    : 0;

  const handleFilterValueChange = (key: string, value: any) => {
    if (!onFilterChange) return;
    const current = activeFilters || {};
    const updated = { ...current, [key]: value };
    onFilterChange(updated);
  };

  const handleFilterRangeChange = (key: string, part: 'min' | 'max', value: string) => {
    if (!onFilterChange) return;
    const current = activeFilters || {};
    const currentRange = current[key] || { min: '', max: '' };
    const updatedRange = { ...currentRange, [part]: value ? Number(value) : '' };
    const updated = { ...current, [key]: updatedRange };
    onFilterChange(updated);
  };

  // Auto-reset page on search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Reset selected IDs when data length changes drastically
  useEffect(() => {
    setSelectedIds(new Set());
  }, [data.length]);

  // Handle Select All
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>, pageItems: T[]) => {
    if (e.target.checked) {
      const newSelected = new Set(selectedIds);
      pageItems.forEach((item) => newSelected.add(keyExtractor(item)));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      pageItems.forEach((item) => newSelected.delete(keyExtractor(item)));
      setSelectedIds(newSelected);
    }
  };

  // Handle Select Row
  const handleSelectRow = (itemId: string | number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedIds(newSelected);
  };

  // Clear selections helper
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Export to Excel (.xlsx)
  const exportToCsv = () => {
    if (data.length === 0) return;

    const activeCols = columns.filter((col) => visibleColumns.includes(col.key) && col.key !== 'actions');
    const headers = activeCols.map((col) => col.label);

    const rows = data.map((item) =>
      activeCols.map((col) => {
        const raw = item[col.key];
        if (raw === null || raw === undefined) return '';
        if (typeof raw === 'number' || typeof raw === 'boolean') return raw;
        return String(raw);
      })
    );

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 6, 16) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${id}_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Toggle column visibility
  const toggleColumn = (key: string) => {
    if (visibleColumns.includes(key)) {
      if (visibleColumns.length > 1) {
        setVisibleColumns(visibleColumns.filter((col) => col !== key));
      }
    } else {
      setVisibleColumns([...visibleColumns, key]);
    }
  };

  // Sorting Handler
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // 1. Filtering Logic (always computed fresh so in-place array mutations update immediately without F5)
  const filteredItems = (() => {
    if (!searchTerm || searchableKeys.length === 0) return data;

    const lowerSearch = searchTerm.toLowerCase();
    return data.filter((item) => {
      return searchableKeys.some((key) => {
        const val = item[key as string];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(lowerSearch);
      });
    });
  })();

  // 2. Sorting Logic
  const sortedItems = (() => {
    const sortableItems = [...filteredItems];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (aVal === undefined || aVal === null) aVal = '';
        if (bVal === undefined || bVal === null) bVal = '';

        const isANum = !isNaN(Number(aVal)) && typeof aVal !== 'boolean' && aVal !== '';
        const isBNum = !isNaN(Number(bVal)) && typeof bVal !== 'boolean' && bVal !== '';

        if (isANum && isBNum) {
          return sortConfig.direction === 'asc'
            ? Number(aVal) - Number(bVal)
            : Number(bVal) - Number(aVal);
        }

        const strA = String(aVal).toLowerCase();
        const strB = String(bVal).toLowerCase();

        if (strA < strB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (strA > strB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  })();

  // 3. Pagination Logic
  const totalItems = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedItems = sortedItems.slice(startIndex, startIndex + pageSize);

  // Sync selected rows
  const selectedItemsInCurrentData = data.filter((item) => selectedIds.has(keyExtractor(item)));

  const allPageItemsSelected = paginatedItems.length > 0 && paginatedItems.every((item) =>
    selectedIds.has(keyExtractor(item))
  );

  const somePageItemsSelected = paginatedItems.some((item) =>
    selectedIds.has(keyExtractor(item))
  ) && !allPageItemsSelected;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 1. Header Toolbar & Integrated Filter Panel Card */}
      <div className="relative z-30 bg-[#11141b]/65 border border-white/5 rounded-xl shadow-md overflow-visible">
        {/* Main Toolbar Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 min-h-[56px]">
          {/* Search & Bulk count */}
          <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
            {searchableKeys.length > 0 && (
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs font-medium pl-9 pr-8 py-2 border border-white/10 bg-[#0d1117] text-white rounded-lg focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-150"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Integrated Filter Trigger Button */}
            {filterOptions && filterOptions.length > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-all duration-150 cursor-pointer ${
                    isFilterPanelOpen || activeFilterCount > 0
                      ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400 shadow-sm'
                      : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/10 text-slate-300 hover:text-white'
                  }`}
                  title="Bật/Tắt bộ lọc chi tiết"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Bộ lọc</span>
                  {activeFilterCount > 0 && (
                    <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                      {activeFilterCount}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isFilterPanelOpen ? 'rotate-180 text-emerald-400' : 'text-slate-400'
                    }`}
                  />
                </button>

                {activeFilterCount > 0 && onFilterReset && (
                  <button
                    type="button"
                    onClick={onFilterReset}
                    title="Xóa tất cả điều kiện lọc"
                    className="p-2 border border-white/10 hover:border-rose-500/30 bg-white/[0.02] hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Quick info if rows selected */}
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400"
              >
                Đã chọn: {selectedIds.size} dòng
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-slate-400 hover:text-white ml-1 text-[9px] uppercase tracking-wider hover:underline font-extrabold"
                >
                  Bỏ chọn
                </button>
              </motion.div>
            )}
          </div>

          {/* Action controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {toolbarActions}

            {/* Export CSV */}
            <button
              type="button"
              onClick={exportToCsv}
              disabled={data.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 text-slate-200 rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Xuất Excel/CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Xuất File</span>
            </button>

            {/* Density Toggler */}
            <button
              type="button"
              onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
              className="p-2 border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] rounded-lg text-slate-300 hover:text-white transition"
              title={density === 'comfortable' ? 'Chuyển sang dạng gọn' : 'Chuyển sang dạng rộng'}
            >
              {density === 'comfortable' ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Column toggler dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
                className={`p-2 border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] rounded-lg text-slate-300 hover:text-white transition flex items-center gap-1.5 ${
                  isColumnPickerOpen ? 'bg-white/10 border-emerald-500/30 text-emerald-400' : ''
                }`}
                title="Ẩn/Hiện cột"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold hidden md:inline">Cột</span>
              </button>

              <AnimatePresence>
                {isColumnPickerOpen && (
                  <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-10" onClick={() => setIsColumnPickerOpen(false)} />
                    {/* Menu */}
                    <motion.div
                      initial={{ opacity: 0, y: 5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-52 bg-[#0d1117] border border-white/10 rounded-xl shadow-2xl p-2 z-20"
                    >
                      <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider px-2 py-1 border-b border-white/5 mb-1">
                        Hiển thị cột
                      </p>
                      <div className="space-y-0.5 max-h-60 overflow-y-auto">
                        {columns.map((col) => {
                          const isVisible = visibleColumns.includes(col.key);
                          return (
                            <button
                              key={col.key}
                              type="button"
                              onClick={() => toggleColumn(col.key)}
                              className="w-full flex items-center justify-between text-left text-xs text-slate-300 hover:text-white hover:bg-white/[0.03] p-1.5 rounded transition"
                            >
                              <span className="font-medium">{col.label}</span>
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                  isVisible
                                    ? 'bg-emerald-500 border-emerald-500 text-black'
                                    : 'border-white/10 bg-transparent'
                                }`}
                              >
                                {isVisible && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Integrated Filter Conditions Section ("Điều kiện lọc chi tiết") */}
        <AnimatePresence>
          {isFilterPanelOpen && filterOptions && filterOptions.length > 0 && (
            <motion.div
              id="adv-filter-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="border-t border-white/10 bg-[#0d121e]/95 p-4 sm:p-5 overflow-visible"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    <Filter className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      Điều kiện lọc chi tiết
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Lọc dữ liệu chính xác theo tiêu chí mong muốn
                    </span>
                  </div>
                  {activeFilterCount > 0 && (
                    <span className="ml-2 bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                      Đang lọc: {activeFilterCount}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && onFilterReset && (
                    <button
                      type="button"
                      onClick={onFilterReset}
                      className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition border border-rose-500/20 cursor-pointer"
                      title="Xóa tất cả điều kiện lọc"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Đặt lại ({activeFilterCount})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsFilterPanelOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    title="Thu gọn bảng lọc"
                    aria-label="Thu gọn bảng lọc"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 overflow-visible py-1">
                {filterOptions.map((opt) => {
                  const currentVal = activeFilters ? activeFilters[opt.key] : undefined;
                  return (
                    <div key={opt.key} className="flex flex-col gap-1.5 relative overflow-visible">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-slate-300">
                        {opt.label}
                      </label>

                      {opt.type === 'text' && (
                        <input
                          type="text"
                          placeholder={`Tìm ${opt.label.toLowerCase()}...`}
                          value={currentVal || ''}
                          onChange={(e) => handleFilterValueChange(opt.key, e.target.value)}
                          className="w-full text-xs border border-white/10 bg-[#141926] text-white rounded-lg px-2.5 h-[38px] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition"
                        />
                      )}

                      {opt.type === 'select' && (
                        <SearchableSelect
                          id={`adv-table-${opt.key}-select`}
                          options={opt.options || []}
                          value={currentVal || ''}
                          onChange={(val) => handleFilterValueChange(opt.key, val)}
                          placeholder="Tất cả"
                          clearable={true}
                        />
                      )}

                      {opt.type === 'date' && (
                        <input
                          type="date"
                          value={currentVal || ''}
                          onChange={(e) => handleFilterValueChange(opt.key, e.target.value)}
                          className="w-full text-xs border border-white/10 bg-[#141926] text-white rounded-lg px-2.5 h-[38px] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition font-mono"
                        />
                      )}

                      {opt.type === 'number-range' && (
                        <div className="flex items-center gap-1.5 h-[38px]">
                          <input
                            type="number"
                            placeholder="Min"
                            value={currentVal?.min ?? ''}
                            onChange={(e) => handleFilterRangeChange(opt.key, 'min', e.target.value)}
                            className="w-1/2 text-xs border border-white/10 bg-[#141926] text-white rounded-lg px-2 h-full focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition font-mono"
                          />
                          <span className="text-slate-500 text-[10px] font-bold">đến</span>
                          <input
                            type="number"
                            placeholder="Max"
                            value={currentVal?.max ?? ''}
                            onChange={(e) => handleFilterRangeChange(opt.key, 'max', e.target.value)}
                            className="w-1/2 text-xs border border-white/10 bg-[#141926] text-white rounded-lg px-2 h-full focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition font-mono"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/10 text-xs">
                <span className="text-slate-400 text-[11px]">
                  Tìm thấy <b className="text-emerald-400 font-mono">{filteredItems.length}</b> kết quả phù hợp
                </span>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && onFilterReset && (
                    <button
                      type="button"
                      onClick={onFilterReset}
                      className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-rose-500/30 text-slate-300 hover:text-rose-400 text-xs font-semibold transition cursor-pointer"
                    >
                      Đặt lại
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsFilterPanelOpen(false)}
                    className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition shadow-md shadow-emerald-500/20 cursor-pointer"
                  >
                    Thu gọn
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Bulk Actions Overlay (Animated Banner) */}
      <AnimatePresence>
        {selectedIds.size > 0 && bulkActions.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-emerald-950/40 to-emerald-900/10 border border-emerald-500/20 rounded-xl p-3 px-4 shadow-lg text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-flex w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-slate-200">
                  Thao tác hàng loạt cho <b className="text-emerald-400">{selectedIds.size}</b> dòng dữ liệu đã chọn:
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {bulkActions.map((action, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => action.action(selectedItemsInCurrentData, clearSelection)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition text-[10px] uppercase tracking-wider ${
                      action.variant === 'danger'
                        ? 'bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400'
                        : action.variant === 'success'
                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400'
                        : action.variant === 'warning'
                        ? 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
                    }`}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Main Data Table Container */}
      <div className="bg-[#11141b]/40 border border-white/5 rounded-2xl shadow-xl overflow-hidden min-h-[260px]">
        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full text-left border-collapse table-auto min-w-[850px]">
            <thead>
              <tr className="border-b border-white/5 bg-black/20 text-[10px] text-slate-500 uppercase font-bold select-none">
                {/* Selection Checkbox */}
                {bulkActions.length > 0 && (
                  <th className="p-3 w-10 text-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allPageItemsSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = somePageItemsSelected;
                        }}
                        onChange={(e) => handleSelectAll(e, paginatedItems)}
                        className="rounded border-white/10 bg-[#0d1117] text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 w-3.5 h-3.5"
                      />
                    </label>
                  </th>
                )}

                {/* Visible Data Columns */}
                {columns
                  .filter((col) => visibleColumns.includes(col.key))
                  .map((col) => {
                    const isSorted = sortConfig?.key === col.key;
                    const alignClass =
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left';

                    return (
                      <th
                        key={col.key}
                        onClick={() => col.sortable !== false && requestSort(col.key)}
                        className={`p-4 font-semibold tracking-wider whitespace-nowrap ${alignClass} ${
                          col.sortable !== false ? 'cursor-pointer hover:text-white transition' : ''
                        }`}
                      >
                        <div
                          className={`inline-flex items-center gap-1.5 ${
                            col.align === 'right'
                              ? 'justify-end w-full'
                              : col.align === 'center'
                              ? 'justify-center'
                              : 'justify-start'
                          }`}
                        >
                          {col.label}
                          {col.sortable !== false && (
                            <div className="shrink-0 text-slate-500 hover:text-white">
                              {isSorted ? (
                                sortConfig?.direction === 'asc' ? (
                                  <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-45" />
                              )}
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + (bulkActions.length > 0 ? 1 : 0)}
                    className="p-12 text-center text-slate-400 text-xs italic"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      Đang xử lý tải dữ liệu...
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + (bulkActions.length > 0 ? 1 : 0)}
                    className="p-12 text-center text-slate-500 text-xs italic"
                  >
                    {emptyStateText}
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => {
                  const itemId = keyExtractor(item, idx);
                  const isSelected = selectedIds.has(itemId);
                  const rowPaddingClass = density === 'comfortable' ? 'p-3.5' : 'p-2';

                  return (
                    <tr
                      key={itemId}
                      onClick={() => onRowClick?.(item)}
                      className={`text-xs text-slate-300 hover:bg-white/[0.015] transition-colors ${
                        onRowClick ? 'cursor-pointer' : ''
                      } ${isSelected ? 'bg-emerald-500/[0.02]' : ''}`}
                    >
                      {/* Selection Checkbox */}
                      {bulkActions.length > 0 && (
                        <td
                          onClick={(e) => e.stopPropagation()}
                          className="p-3 text-center border-none"
                        >
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRow(itemId)}
                              className="rounded border-white/10 bg-[#0d1117] text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 w-3.5 h-3.5"
                            />
                          </label>
                        </td>
                      )}

                      {/* Visible Data Cells */}
                      {columns
                        .filter((col) => visibleColumns.includes(col.key))
                        .map((col) => {
                          const alignClass =
                            col.align === 'right'
                              ? 'text-right'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left';

                          return (
                            <td key={col.key} className={`${rowPaddingClass} px-4 ${alignClass}`}>
                              {col.render
                                ? col.render(item, idx)
                                : item[col.key] !== undefined && item[col.key] !== null
                                ? String(item[col.key])
                                : <span className="text-slate-600">-</span>}
                            </td>
                          );
                        })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Footer Pagination Bar */}
      {totalPages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#11141b]/30 border border-white/5 rounded-xl p-3 px-4 shadow-sm text-xs">
          {/* Item count statistics */}
          <div className="text-slate-400 font-medium">
            Hiển thị <span className="text-white font-semibold">{(currentPage - 1) * pageSize + 1}</span> đến{' '}
            <span className="text-white font-semibold">
              {Math.min(currentPage * pageSize, totalItems)}
            </span>{' '}
            trong <span className="text-white font-semibold">{totalItems}</span> kết quả
          </div>

          {/* Page selectors & size change */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Page size picker */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">Số dòng:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-[11px] font-bold border border-white/10 bg-[#0d1117] text-white rounded px-2 py-1 focus:outline-none focus:border-emerald-500/50"
              >
                {[5, 10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} dòng
                  </option>
                ))}
              </select>
            </div>

            {/* Page Control Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md border border-white/10 bg-white/[0.01] hover:bg-white/[0.05] disabled:opacity-30 disabled:hover:bg-transparent transition text-slate-300"
                title="Trang đầu"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md border border-white/10 bg-white/[0.01] hover:bg-white/[0.05] disabled:opacity-30 disabled:hover:bg-transparent transition text-slate-300"
                title="Trang trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Dynamic short lists of page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
                })
                .map((p, idx, arr) => {
                  const isCurrent = p === currentPage;
                  const prevPage = arr[idx - 1];

                  return (
                    <React.Fragment key={p}>
                      {prevPage && p - prevPage > 1 && (
                        <span className="text-slate-600 px-1 text-[10px]">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={`w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded-md transition ${
                          isCurrent
                            ? 'bg-emerald-500 text-black border border-emerald-500'
                            : 'border border-white/10 bg-white/[0.01] hover:bg-white/[0.05] text-slate-300'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md border border-white/10 bg-white/[0.01] hover:bg-white/[0.05] disabled:opacity-30 disabled:hover:bg-transparent transition text-slate-300"
                title="Trang tiếp"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md border border-white/10 bg-white/[0.01] hover:bg-white/[0.05] disabled:opacity-30 disabled:hover:bg-transparent transition text-slate-300"
                title="Trang cuối"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
