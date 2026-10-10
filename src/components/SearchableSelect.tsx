import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  sublabel?: string; // Optional subtitle (e.g. SKU, category, phone number)
}

interface SearchableSelectProps {
  id?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  clearable?: boolean;
}

// Helper functions for advanced Vietnamese searching
function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
    .toLowerCase();
}

function getMatchScore(opt: SelectOption, searchTerm: string): { isMatch: boolean; score: number } {
  if (!searchTerm) return { isMatch: true, score: 0 };

  const queryWords = normalizeString(searchTerm).split(/[^a-z0-9]+/).filter(Boolean);
  const cleanQuery = normalizeString(searchTerm).replace(/[^a-z0-9]/g, '');

  if (queryWords.length === 0) return { isMatch: true, score: 0 };

  const cleanLabel = normalizeString(opt.label).replace(/[^a-z0-9]/g, '');
  const cleanSublabel = opt.sublabel ? normalizeString(opt.sublabel).replace(/[^a-z0-9]/g, '') : '';
  const cleanValue = normalizeString(opt.value).replace(/[^a-z0-9]/g, '');

  const combinedTarget = `${cleanLabel} ${cleanSublabel} ${cleanValue}`.replace(/[^a-z0-9]/g, '');

  // Check if all query words are present in the combined target
  const isWordByWordMatch = queryWords.every(word => combinedTarget.includes(word));
  if (!isWordByWordMatch) {
    return { isMatch: false, score: -1 };
  }

  let score = 0;

  // 1. STARTS WITH keyword
  if (cleanQuery) {
    if (cleanLabel.startsWith(cleanQuery)) {
      score += 10000;
    } else if (cleanSublabel.startsWith(cleanQuery)) {
      score += 5000;
    } else if (cleanValue.startsWith(cleanQuery)) {
      score += 2500;
    }
    // 2. CONTAINS keyword
    else if (cleanLabel.includes(cleanQuery)) {
      score += 1000;
    } else if (cleanSublabel.includes(cleanQuery)) {
      score += 500;
    } else if (cleanValue.includes(cleanQuery)) {
      score += 250;
    }
  }

  // 3. Match in specific fields (word by word)
  const matchLabel = queryWords.every(word => cleanLabel.includes(word));
  const matchSublabel = cleanSublabel ? queryWords.every(word => cleanSublabel.includes(word)) : false;
  const matchValue = queryWords.every(word => cleanValue.includes(word));

  if (matchLabel) {
    score += 100;
  } else if (matchSublabel) {
    score += 50;
  } else if (matchValue) {
    score += 25;
  } else {
    score += 5; // Mixed match
  }

  return { isMatch: true, score };
}

export default function SearchableSelect({
  id = 'searchable-select',
  options,
  value,
  onChange,
  placeholder = '-- Chọn một tùy chọn --',
  emptyText = 'Không tìm thấy kết quả',
  className = '',
  disabled = false,
  clearable = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens without causing page scroll jump
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options
    .map((opt, index) => {
      const { isMatch, score } = getMatchScore(opt, searchTerm);
      return { opt, isMatch, score, index };
    })
    .filter((item) => item.isMatch)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.index - b.index;
    })
    .map((item) => item.opt);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div
      id={`${id}-wrapper`}
      ref={containerRef}
      className={`relative w-full ${isOpen ? 'z-[60]' : 'z-10'} ${className}`}
    >
      {/* Target Trigger */}
      <div
        id={`${id}-trigger`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between text-xs border rounded-lg px-2.5 min-h-[38px] h-[38px] bg-[#161a23] text-white transition cursor-pointer select-none
          ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-900 border-white/5 text-slate-400' : 'hover:border-white/20 border-white/10'}
          ${isOpen ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : ''}
        `}
      >
        <div className="flex-1 truncate pr-1 flex flex-col justify-center">
          {selectedOption ? (
            <div className="flex flex-col text-left truncate leading-tight">
              <span className="font-medium truncate">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-[9px] text-slate-400 truncate font-mono">
                  {selectedOption.sublabel}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {clearable && value && !disabled && (
            <button
              id={`${id}-clear-btn`}
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-rose-400 rounded-full transition hover:bg-white/5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180 text-emerald-400' : ''
            }`}
          />
        </div>
      </div>

      {/* Floating Options List */}
      {isOpen && (
        <div
          id={`${id}-dropdown`}
          className="absolute z-[70] left-0 right-0 mt-1 bg-[#11141b] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-slideDown max-h-72 flex flex-col"
        >
          {/* Search box wrapper */}
          <div className="p-2 border-b border-white/5 bg-black/20 flex items-center gap-1.5 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Gõ để tìm nhanh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-xs border-0 text-white focus:outline-none focus:ring-0 placeholder-slate-500 p-1"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1 text-slate-400 hover:text-white rounded-full transition"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options list container */}
          <div className="overflow-y-auto flex-1 py-1 max-h-48 divide-y divide-white/[0.02]">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer select-none transition-colors
                      ${isSelected ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'text-slate-200 hover:bg-white/5'}
                    `}
                  >
                    <div className="flex flex-col pr-2 truncate">
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
