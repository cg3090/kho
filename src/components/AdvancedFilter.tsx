/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Filter, X, ChevronDown, RefreshCw } from 'lucide-react';
import SearchableSelect from './SearchableSelect';

interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number-range';
  options?: { value: string; label: string }[];
}

interface AdvancedFilterProps {
  id: string;
  options: FilterOption[];
  onFilterChange: (filters: Record<string, any>) => void;
  onReset: () => void;
  activeFilters?: Record<string, any>;
}

export default function AdvancedFilter({ id, options, onFilterChange, onReset, activeFilters }: AdvancedFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>(activeFilters || {});

  // Sync internal filter state if activeFilters prop is provided
  useEffect(() => {
    if (activeFilters !== undefined) {
      setFilters(activeFilters);
    }
  }, [activeFilters]);

  const handleValueChange = (key: string, value: any) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    onFilterChange(updated);
  };

  const handleRangeChange = (key: string, part: 'min' | 'max', value: string) => {
    const currentRange = filters[key] || { min: '', max: '' };
    const updatedRange = { ...currentRange, [part]: value ? Number(value) : '' };
    const updated = { ...filters, [key]: updatedRange };
    setFilters(updated);
    onFilterChange(updated);
  };

  const handleClear = () => {
    setFilters({});
    onReset();
  };

  const activeCount = Object.keys(filters).filter((k) => {
    const val = filters[k];
    if (!val) return false;
    if (typeof val === 'object') {
      return val.min !== '' || val.max !== '';
    }
    return true;
  }).length;

  return (
    <div id={`${id}-container`} className="bg-[#11141b]/80 backdrop-blur-md border border-white/5 rounded-xl px-4 py-2.5 shadow-lg mb-3 transition-all duration-300">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-xs">Bộ lọc nâng cao</h3>
            <span className="hidden sm:inline text-[10px] text-slate-500">| Lọc đa chiều</span>
            {activeCount > 0 && (
              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold">
                Đang lọc: {activeCount}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id={`${id}-toggle-btn`}
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold border border-white/10 text-slate-300 hover:bg-white/[0.04] bg-white/[0.01] rounded-lg transition"
          >
            {isOpen ? 'Thu gọn' : 'Bấm để lọc'}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          {activeCount > 0 && (
            <button
              id={`${id}-reset-btn`}
              onClick={handleClear}
              title="Xóa bộ lọc"
              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-white/[0.03] rounded-lg transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div id={`${id}-grid`} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-2.5 pt-2.5 border-t border-white/5">
          {options.map((opt) => (
            <div key={opt.key} className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{opt.label}</label>

              {opt.type === 'text' && (
                <input
                  type="text"
                  placeholder={`Tìm ${opt.label.toLowerCase()}...`}
                  value={filters[opt.key] || ''}
                  onChange={(e) => handleValueChange(opt.key, e.target.value)}
                  className="w-full text-xs border border-white/10 bg-[#161a23] text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500/50 transition"
                />
              )}

              {opt.type === 'select' && (
                <SearchableSelect
                  id={`${id}-${opt.key}-select`}
                  options={opt.options || []}
                  value={filters[opt.key] || ''}
                  onChange={(val) => handleValueChange(opt.key, val)}
                  placeholder="Tất cả"
                  clearable={true}
                />
              )}

              {opt.type === 'date' && (
                <input
                  type="date"
                  value={filters[opt.key] || ''}
                  onChange={(e) => handleValueChange(opt.key, e.target.value)}
                  className="w-full text-xs border border-white/10 bg-[#161a23] text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500/50 transition"
                />
              )}

              {opt.type === 'number-range' && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters[opt.key]?.min || ''}
                    onChange={(e) => handleRangeChange(opt.key, 'min', e.target.value)}
                    className="w-1/2 text-xs border border-white/10 bg-[#161a23] text-white rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-500/50 transition"
                  />
                  <span className="text-slate-500 text-[10px]">đến</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters[opt.key]?.max || ''}
                    onChange={(e) => handleRangeChange(opt.key, 'max', e.target.value)}
                    className="w-1/2 text-xs border border-white/10 bg-[#161a23] text-white rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-500/50 transition"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
