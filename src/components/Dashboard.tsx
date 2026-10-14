/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { MockDatabase } from '../db/mockDb';
import { User } from '../types';
import { canViewPurchaseCost } from '../utils/rbac';
import {
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  ShoppingCart,
  Calendar,
  AlertTriangle,
  Clock,
  ArrowRight,
  Lock,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Package,
  Layers,
  Building2,
  Percent,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate } from '../utils/dateUtils';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface DashboardProps {
  db: MockDatabase;
  setTab: (tab: string) => void;
  currentUser?: User | null;
}

type Timeframe = '7d' | '30d' | '90d' | 'year' | 'custom' | 'all';
type AnalyticsTab = 'overview' | 'inventory' | 'financial' | 'products';

// Visual Palette matching high-contrast dark dashboard
const CHART_COLORS = {
  emerald: '#10b981',
  cyan: '#06b6d4',
  blue: '#3b82f6',
  amber: '#f59e0b',
  rose: '#f43f5e',
  purple: '#8b5cf6',
  indigo: '#6366f1',
  slate: '#64748b',
};

const PIE_PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

export default function Dashboard({ db, setTab, currentUser }: DashboardProps) {
  const canViewCost = canViewPurchaseCost(currentUser, db.roles);

  // Filter & Mode States
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [analyticsTab, setAnalyticsTab] = useState<AnalyticsTab>('overview');
  const [donutView, setDonutView] = useState<'category' | 'warehouse'>('category');
  const [volumeMetric, setVolumeMetric] = useState<'qty' | 'value'>('qty');
  const [productSearch, setProductSearch] = useState<string>('');

  // Today Date Reference
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filtered Date Range Thresholds (Start & End)
  const { startDateStr, endDateStr } = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (timeframe === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return { startDateStr: d.toISOString().split('T')[0], endDateStr: today };
    } else if (timeframe === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return { startDateStr: d.toISOString().split('T')[0], endDateStr: today };
    } else if (timeframe === '90d') {
      // Quý này: từ đầu quý hiện tại đến nay
      const currentMonth = now.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      const qStart = new Date(now.getFullYear(), quarterStartMonth, 1);
      return { startDateStr: qStart.toISOString().split('T')[0], endDateStr: today };
    } else if (timeframe === 'year') {
      // Năm: từ đầu năm hiện tại đến nay
      const yStart = new Date(now.getFullYear(), 0, 1);
      return { startDateStr: yStart.toISOString().split('T')[0], endDateStr: today };
    } else if (timeframe === 'custom') {
      return {
        startDateStr: customStartDate || '2000-01-01',
        endDateStr: customEndDate || today,
      };
    } else {
      // Tất cả
      return { startDateStr: '2000-01-01', endDateStr: '2099-12-31' };
    }
  }, [timeframe, customStartDate, customEndDate]);

  // Filter Transactions according to Timeframe & Warehouse
  const filteredTransactions = useMemo(() => {
    return db.stockTransactions.filter((tx) => {
      if (tx.isReversed) return false;
      if (timeframe !== 'all') {
        if (tx.date < startDateStr || tx.date > endDateStr) return false;
      }
      if (selectedWarehouseId !== 'all' && tx.warehouseId !== selectedWarehouseId) return false;
      return true;
    });
  }, [db.stockTransactions, timeframe, startDateStr, endDateStr, selectedWarehouseId]);

  // Master Raw Collections
  const products = db.products;
  const debts = db.debts.filter((d) => !d.isReversed);

  // 1. KPI Aggregations
  const totalInventoryValue = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.currentQty * p.averageCost), 0);
  }, [products]);

  const totalPhysicalUnits = useMemo(() => {
    return products.reduce((sum, p) => sum + Math.max(0, p.currentQty), 0);
  }, [products]);

  const totalAP = useMemo(() => {
    return debts.filter((d) => d.type === 'AP').reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
  }, [debts]);

  const totalAR = useMemo(() => {
    return debts.filter((d) => d.type === 'AR').reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
  }, [debts]);

  const isReport = useMemo(() => {
    return db.getIncomeStatement(
      timeframe !== 'all' ? startDateStr : undefined,
      timeframe !== 'all' ? endDateStr : undefined
    );
  }, [db, timeframe, startDateStr, endDateStr]);

  // Financial Ratios
  const grossMargin = useMemo(() => {
    if (!isReport.totalRevenue || isReport.totalRevenue <= 0) return 0;
    return Math.round((isReport.grossProfit / isReport.totalRevenue) * 100);
  }, [isReport]);

  const inventoryTurnover = useMemo(() => {
    if (totalInventoryValue <= 0) return 0;
    let annualizedFactor = 1;
    if (timeframe === '7d') annualizedFactor = 52;
    else if (timeframe === '30d') annualizedFactor = 12;
    else if (timeframe === '90d') annualizedFactor = 4;
    else if (timeframe === 'year') annualizedFactor = 1;
    else if (timeframe === 'custom') {
      const s = new Date(startDateStr);
      const e = new Date(endDateStr);
      const diffDays = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
      annualizedFactor = Math.round((365 / diffDays) * 10) / 10;
    } else {
      annualizedFactor = 1;
    }
    const ratio = (isReport.totalCOGS * annualizedFactor) / totalInventoryValue;
    return Math.round(ratio * 10) / 10;
  }, [isReport.totalCOGS, totalInventoryValue, timeframe, startDateStr, endDateStr]);

  // Active Unpaid Debts & Overdue / Near-due alert calculations
  const activeUnpaidDebts = useMemo(() => {
    return debts.filter((d) => d.status !== 'PAID');
  }, [debts]);

  const overdueDebts = useMemo(() => {
    return activeUnpaidDebts.filter((d) => d.dueDate && d.dueDate < todayStr);
  }, [activeUnpaidDebts, todayStr]);

  const nearDueDebts = useMemo(() => {
    return activeUnpaidDebts.filter((d) => {
      if (!d.dueDate || d.dueDate < todayStr) return false;
      const diffTime = new Date(d.dueDate).getTime() - new Date(todayStr).getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    });
  }, [activeUnpaidDebts, todayStr]);

  // Low stock products
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.currentQty <= 10);
  }, [products]);

  // 2. Timeline Series for Multi-Metric AreaChart & Volume BarChart
  const timeSeriesData = useMemo(() => {
    const map = new Map<string, {
      date: string;
      displayDate: string;
      revenue: number;
      cost: number;
      profit: number;
      inQty: number;
      outQty: number;
      inValue: number;
      outValue: number;
    }>();

    // Continuous points for short ranges
    if (timeframe === '7d' || timeframe === '30d') {
      const days = timeframe === '7d' ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().split('T')[0];
        const parts = iso.split('-');
        map.set(iso, {
          date: iso,
          displayDate: `${parts[2]}/${parts[1]}`,
          revenue: 0,
          cost: 0,
          profit: 0,
          inQty: 0,
          outQty: 0,
          inValue: 0,
          outValue: 0,
        });
      }
    } else if (timeframe === 'custom' && startDateStr && endDateStr) {
      const s = new Date(startDateStr);
      const e = new Date(endDateStr);
      const diffDays = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 31) {
        for (let i = 0; i <= diffDays; i++) {
          const d = new Date(s);
          d.setDate(d.getDate() + i);
          const iso = d.toISOString().split('T')[0];
          const parts = iso.split('-');
          map.set(iso, {
            date: iso,
            displayDate: `${parts[2]}/${parts[1]}`,
            revenue: 0,
            cost: 0,
            profit: 0,
            inQty: 0,
            outQty: 0,
            inValue: 0,
            outValue: 0,
          });
        }
      }
    }

    filteredTransactions.forEach((tx) => {
      const parts = tx.date.split('-');
      const displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : tx.date;
      if (!map.has(tx.date)) {
        map.set(tx.date, {
          date: tx.date,
          displayDate,
          revenue: 0,
          cost: 0,
          profit: 0,
          inQty: 0,
          outQty: 0,
          inValue: 0,
          outValue: 0,
        });
      }
      const entry = map.get(tx.date)!;

      const details = db.stockTransactionDetails.filter((d) => d.txId === tx.id);
      const totalUnits = details.reduce((sum, d) => sum + d.qty, 0);

      if (tx.type === 'OUT') {
        entry.revenue += tx.totalAmount;
        entry.outQty += totalUnits;
        entry.outValue += tx.totalAmount;
        const estimatedCogs = details.reduce((sum, d) => {
          const prod = products.find((p) => p.id === d.productId);
          return sum + (d.cogsTotal || (d.qty * (prod?.averageCost || d.unitPrice * 0.8)));
        }, 0);
        entry.profit += Math.max(0, tx.totalAmount - estimatedCogs);
      } else if (tx.type === 'IN') {
        entry.cost += tx.totalAmount;
        entry.inQty += totalUnits;
        entry.inValue += tx.totalAmount;
      }
    });

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTransactions, timeframe, startDateStr, endDateStr, db.stockTransactionDetails, products]);

  // 3. Category & Warehouse Distribution for Donut Chart
  const categoryDistributionData = useMemo(() => {
    return db.categories.map((cat, idx) => {
      const prodsInCat = products.filter((p) => p.categoryId === cat.id);
      const totalCatValue = prodsInCat.reduce((sum, p) => sum + (p.currentQty * p.averageCost), 0);
      const totalCatUnits = prodsInCat.reduce((sum, p) => sum + Math.max(0, p.currentQty), 0);
      return {
        id: cat.id,
        name: cat.name,
        value: canViewCost ? totalCatValue : totalCatUnits,
        totalValue: totalCatValue,
        units: totalCatUnits,
        skuCount: prodsInCat.length,
        color: PIE_PALETTE[idx % PIE_PALETTE.length],
      };
    }).filter((c) => c.value > 0);
  }, [db.categories, products, canViewCost]);

  const warehouseDistributionData = useMemo(() => {
    return db.warehouses.map((wh, idx) => {
      const whTxs = db.stockTransactions.filter((tx) => tx.warehouseId === wh.id && !tx.isReversed);
      return {
        id: wh.id,
        name: wh.name,
        value: whTxs.length > 0 ? whTxs.length : 1,
        txCount: whTxs.length,
        color: PIE_PALETTE[(idx + 2) % PIE_PALETTE.length],
      };
    });
  }, [db.warehouses, db.stockTransactions]);

  // 4. Debt Aging Analytics (Current, 1-15, 16-30, >30)
  const debtAgingData = useMemo(() => {
    const buckets = [
      { name: 'Trong hạn', key: 'current', AP: 0, AR: 0 },
      { name: '1-15 Ngày', key: '1-15', AP: 0, AR: 0 },
      { name: '16-30 Ngày', key: '16-30', AP: 0, AR: 0 },
      { name: '>30 Ngày', key: '>30', AP: 0, AR: 0 },
    ];

    activeUnpaidDebts.forEach((d) => {
      const remaining = d.amount - d.paidAmount;
      if (remaining <= 0) return;

      if (!d.dueDate || d.dueDate >= todayStr) {
        if (d.type === 'AP') buckets[0].AP += remaining;
        else buckets[0].AR += remaining;
      } else {
        const diffDays = Math.ceil((new Date(todayStr).getTime() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 15) {
          if (d.type === 'AP') buckets[1].AP += remaining;
          else buckets[1].AR += remaining;
        } else if (diffDays <= 30) {
          if (d.type === 'AP') buckets[2].AP += remaining;
          else buckets[2].AR += remaining;
        } else {
          if (d.type === 'AP') buckets[3].AP += remaining;
          else buckets[3].AR += remaining;
        }
      }
    });

    return buckets;
  }, [activeUnpaidDebts, todayStr]);

  // 5. Top Performing Products
  const topProducts = useMemo(() => {
    const salesMap = new Map<string, { product: typeof products[0]; totalQty: number; totalRevenue: number }>();

    filteredTransactions.filter((tx) => tx.type === 'OUT').forEach((tx) => {
      const details = db.stockTransactionDetails.filter((d) => d.txId === tx.id);
      details.forEach((det) => {
        const prod = products.find((p) => p.id === det.productId);
        if (!prod) return;
        if (!salesMap.has(prod.id)) {
          salesMap.set(prod.id, { product: prod, totalQty: 0, totalRevenue: 0 });
        }
        const record = salesMap.get(prod.id)!;
        record.totalQty += det.qty;
        record.totalRevenue += det.totalPrice;
      });
    });

    const list = Array.from(salesMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
    if (list.length === 0) {
      return products.slice(0, 5).map((p) => ({
        product: p,
        totalQty: p.currentQty,
        totalRevenue: p.currentQty * p.averageCost,
      }));
    }
    return list.slice(0, 5);
  }, [filteredTransactions, db.stockTransactionDetails, products]);

  // Filtered Product Matrix
  const filteredProductsList = useMemo(() => {
    return products.filter((p) => {
      if (!productSearch) return true;
      const q = productSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    });
  }, [products, productSearch]);

  // Latest 6 transactions
  const latestTransactions = useMemo(() => {
    return [...db.stockTransactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  }, [db.stockTransactions]);

  // Custom Dark Tooltips
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#141824]/95 border border-white/15 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs">
          <p className="font-bold text-white mb-2 pb-1 border-b border-white/10">{label}</p>
          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => (
              <div key={`entry-${index}`} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-mono font-bold text-white">
                  {typeof entry.value === 'number' ? `${entry.value.toLocaleString()}đ` : entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomQtyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#141824]/95 border border-white/15 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs">
          <p className="font-bold text-white mb-2 pb-1 border-b border-white/10">{label}</p>
          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => (
              <div key={`qty-${index}`} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-mono font-bold text-white">
                  {volumeMetric === 'qty'
                    ? `${typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value} Cái`
                    : `${typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}đ`}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* 1. ANALYTICS CONTROL TOOLBAR */}
      <div className="bg-[#11141b] border border-white/5 rounded-2xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        {/* Left: View Mode Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            id="tab-overview"
            onClick={() => setAnalyticsTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              analyticsTab === 'overview'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Tổng quan Điều hành</span>
          </button>
          <button
            id="tab-inventory"
            onClick={() => setAnalyticsTab('inventory')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              analyticsTab === 'inventory'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Phân tích Tồn kho & Lưu chuyển</span>
          </button>
          <button
            id="tab-financial"
            onClick={() => setAnalyticsTab('financial')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              analyticsTab === 'financial'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Tài chính & Tuổi nợ</span>
          </button>
          <button
            id="tab-products"
            onClick={() => setAnalyticsTab('products')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              analyticsTab === 'products'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Xếp hạng Sản phẩm</span>
          </button>
        </div>

        {/* Right: Dynamic Filters */}
        <div className="flex items-center gap-2.5">
          {/* Warehouse Selector */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="select-warehouse-filter"
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              aria-label="Chọn kho lọc phân tích dữ liệu"
              className="bg-transparent border-none text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#141824] text-white">Tất cả kho hàng</option>
              {db.warehouses.map((wh) => (
                <option key={wh.id} value={wh.id} className="bg-[#141824] text-white">{wh.name}</option>
              ))}
            </select>
          </div>

          {/* Timeframe Segmented Control & Custom Date Range */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-black/40 p-0.5 rounded-xl border border-white/10 text-xs font-semibold overflow-x-auto">
              {[
                { id: '7d', label: '7 Ngày' },
                { id: '30d', label: '30 Ngày' },
                { id: '90d', label: 'Quý này' },
                { id: 'year', label: 'Năm' },
                { id: 'custom', label: 'Tùy chọn' },
                { id: 'all', label: 'Tất cả' },
              ].map((item) => (
                <button
                  key={item.id}
                  id={`btn-timeframe-${item.id}`}
                  onClick={() => setTimeframe(item.id as Timeframe)}
                  className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                    timeframe === item.id
                      ? 'bg-emerald-500 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range Picker when 'custom' is active */}
            {timeframe === 'custom' && (
              <div className="flex items-center gap-1.5 bg-black/50 border border-emerald-500/40 px-2.5 py-1 rounded-xl text-xs text-slate-300 shadow-md">
                <Calendar className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400">Từ</span>
                  <input
                    type="date"
                    id="input-custom-start-date"
                    aria-label="Chọn ngày bắt đầu phân tích"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-[#141824] border border-white/15 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400">Đến</span>
                  <input
                    type="date"
                    id="input-custom-end-date"
                    aria-label="Chọn ngày kết thúc phân tích"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-[#141824] border border-white/15 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE ANALYTICS KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Inventory Value & Turnover */}
        <div className="bg-[#11141b] border border-white/5 rounded-2xl p-5 shadow-2xl hover:border-white/10 transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Tổng Giá trị Tồn kho</span>
              <span className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl">
                <ShoppingCart className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3">
              {canViewCost ? (
                <>
                  <h3 className="text-2xl font-bold text-white font-mono">{totalInventoryValue.toLocaleString()}đ</h3>
                  <div className="flex items-center gap-2 mt-1.5 text-xs">
                    <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {inventoryTurnover}x Vòng/năm
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-slate-400 font-mono tracking-wider">***</h3>
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Bảo mật (Chỉ Admin)</span>
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Sản lượng vật lý:</span>
            <span className="font-mono font-bold text-slate-200">{totalPhysicalUnits.toLocaleString()} Cái ({products.length} SKU)</span>
          </div>
        </div>

        {/* KPI 2: Outflow Revenue */}
        <div className="bg-[#11141b] border border-white/5 rounded-2xl p-5 shadow-2xl hover:border-white/10 transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Doanh thu Xuất kho</span>
              <span className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-emerald-400 font-mono">{isReport.totalRevenue.toLocaleString()}đ</h3>
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                <span className="text-emerald-400 font-semibold">Doanh số thực tế ghi nhận</span>
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Biên Lợi nhuận Gộp:</span>
            <span className="font-bold text-white">{grossMargin}% Doanh thu</span>
          </div>
        </div>

        {/* KPI 3: Net Profit */}
        <div className="bg-[#11141b] border border-white/5 rounded-2xl p-5 shadow-2xl hover:border-white/10 transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Lợi nhuận Sau thuế</span>
              <span className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
                <Percent className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-white font-mono">{isReport.netProfit.toLocaleString()}đ</h3>
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                <span className="text-amber-400 font-medium">Báo cáo Kết quả KD (P&L)</span>
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Lợi nhuận gộp:</span>
            <span className="font-bold text-emerald-400 font-mono">{isReport.grossProfit.toLocaleString()}đ</span>
          </div>
        </div>

        {/* KPI 4: Net Debt Position */}
        <div className="bg-[#11141b] border border-white/5 rounded-2xl p-5 shadow-2xl hover:border-white/10 transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Vị thế Công nợ Ròng</span>
              <span className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
                <Activity className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className={`text-2xl font-bold font-mono ${totalAR - totalAP >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {(totalAR - totalAP).toLocaleString()}đ
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                <span>{totalAR >= totalAP ? 'Thặng dư thanh khoản' : 'Thâm hụt vốn lưu động'}</span>
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Phải thu / Phải trả:</span>
            <span className="font-mono font-bold text-slate-200">
              {totalAP > 0 ? (totalAR / totalAP).toFixed(2) : '1.00'}x
            </span>
          </div>
        </div>
      </div>

      {/* 3. DYNAMIC CONTENT VIEWS ACCORDING TO SELECTED TAB */}
      {(analyticsTab === 'overview' || analyticsTab === 'financial') && (
        <div className="bg-[#11141b] border border-white/5 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Xu hướng Doanh thu Xuất kho, Chi phí Nhập & Lợi nhuận theo Thời gian
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Biểu đồ Area Chart đa biến phân tích dòng tiền và giá trị xuất nhập kho
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                Doanh thu Xuất kho
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <span className="w-3 h-3 rounded-full bg-cyan-500" />
                Chi phí Nhập kho
              </span>
              {canViewCost && (
                <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  Lợi nhuận Gộp
                </span>
              )}
            </div>
          </div>

          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.cyan} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.cyan} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.amber} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.amber} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  stroke="#64748b"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(0)}Tr` : `${val.toLocaleString()}`}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Doanh thu Xuất"
                  stroke={CHART_COLORS.emerald}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  name="Chi phí Nhập"
                  stroke={CHART_COLORS.cyan}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCost)"
                />
                {canViewCost && (
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Lợi nhuận Gộp"
                    stroke={CHART_COLORS.amber}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#colorProfit)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 4. INFLOW/OUTFLOW VOLUME & INVENTORY STRUCTURE */}
      {(analyticsTab === 'overview' || analyticsTab === 'inventory') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inflow vs Outflow Volume (BarChart) */}
          <div className="lg:col-span-2 bg-[#11141b] border border-white/5 rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    Lưu chuyển Hàng hóa: Nhập vs Xuất ({volumeMetric === 'qty' ? 'Số lượng Cái' : 'Giá trị Tiền VNĐ'})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">So sánh lưu lượng xuất nhập kho để cân đối lượng hàng tồn</p>
                </div>
                {/* Metric toggle */}
                <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/10 text-[10px] font-semibold">
                  <button
                    onClick={() => setVolumeMetric('qty')}
                    className={`px-2 py-0.5 rounded ${volumeMetric === 'qty' ? 'bg-cyan-500 text-white font-bold' : 'text-slate-400'}`}
                  >
                    Số lượng (PCS)
                  </button>
                  <button
                    onClick={() => setVolumeMetric('value')}
                    className={`px-2 py-0.5 rounded ${volumeMetric === 'value' ? 'bg-cyan-500 text-white font-bold' : 'text-slate-400'}`}
                  >
                    Giá trị (VNĐ)
                  </button>
                </div>
              </div>

              <div className="h-[240px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeSeriesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="displayDate" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickLine={false}
                      tickFormatter={(val) => volumeMetric === 'value' && val >= 1000000 ? `${(val / 1000000).toFixed(0)}Tr` : `${val}`}
                    />
                    <Tooltip content={volumeMetric === 'qty' ? <CustomQtyTooltip /> : <CustomChartTooltip />} />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                    />
                    <Bar
                      dataKey={volumeMetric === 'qty' ? 'inQty' : 'inValue'}
                      name={volumeMetric === 'qty' ? 'SL Nhập (+)' : 'Giá trị Nhập'}
                      fill={CHART_COLORS.blue}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey={volumeMetric === 'qty' ? 'outQty' : 'outValue'}
                      name={volumeMetric === 'qty' ? 'SL Xuất (-)' : 'Giá trị Xuất'}
                      fill={CHART_COLORS.emerald}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-white/5">
                <span className="text-slate-400">Tổng nhập kỳ này:</span>
                <span className="font-mono font-bold text-blue-400">
                  {volumeMetric === 'qty'
                    ? `+${timeSeriesData.reduce((s, i) => s + i.inQty, 0)} Cái`
                    : `+${timeSeriesData.reduce((s, i) => s + i.inValue, 0).toLocaleString()}đ`}
                </span>
              </div>
              <div className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-white/5">
                <span className="text-slate-400">Tổng xuất kỳ này:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {volumeMetric === 'qty'
                    ? `-${timeSeriesData.reduce((s, i) => s + i.outQty, 0)} Cái`
                    : `-${timeSeriesData.reduce((s, i) => s + i.outValue, 0).toLocaleString()}đ`}
                </span>
              </div>
            </div>
          </div>

          {/* Donut Chart Inventory Structure */}
          <div className="bg-[#11141b] border border-white/5 rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-amber-400" />
                  Cơ cấu Phân bổ Tồn kho
                </h3>
                <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10 text-[10px] font-semibold">
                  <button
                    onClick={() => setDonutView('category')}
                    className={`px-2 py-0.5 rounded ${donutView === 'category' ? 'bg-amber-500 text-white font-bold' : 'text-slate-400'}`}
                  >
                    Danh mục
                  </button>
                  <button
                    onClick={() => setDonutView('warehouse')}
                    className={`px-2 py-0.5 rounded ${donutView === 'warehouse' ? 'bg-amber-500 text-white font-bold' : 'text-slate-400'}`}
                  >
                    Kho
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-2">
                {donutView === 'category' ? 'Tỷ trọng theo nhóm hàng hóa' : 'Tỷ trọng hoạt động theo kho'}
              </p>

              <div className="h-[180px] w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutView === 'category' ? categoryDistributionData : warehouseDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {(donutView === 'category' ? categoryDistributionData : warehouseDistributionData).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#11141b" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        canViewCost && donutView === 'category' ? `${val.toLocaleString()}đ` : `${val} Đơn vị`,
                        name
                      ]}
                      contentStyle={{ backgroundColor: '#141824', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Cơ cấu</span>
                  <span className="text-sm font-bold text-white font-mono">
                    {donutView === 'category' ? `${categoryDistributionData.length} Nhóm` : `${warehouseDistributionData.length} Kho`}
                  </span>
                </div>
              </div>

              {/* List breakdown */}
              <div className="space-y-1.5 mt-2 max-h-[110px] overflow-y-auto pr-1">
                {(donutView === 'category' ? categoryDistributionData : warehouseDistributionData).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-300 truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-white text-[11px]">
                      {canViewCost && 'totalValue' in item ? `${item.totalValue.toLocaleString()}đ` : `${item.value} ĐV`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setTab('categories')}
              className="w-full mt-3 text-center text-xs font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-500/5 border border-amber-500/10 py-1.5 rounded-xl transition"
            >
              Quản lý Danh mục & Hàng hóa →
            </button>
          </div>
        </div>
      )}

      {/* 5. DEBT AGING & TOP PRODUCTS */}
      {(analyticsTab === 'overview' || analyticsTab === 'financial' || analyticsTab === 'products') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Debt Aging Analysis */}
          {(analyticsTab === 'overview' || analyticsTab === 'financial') && (
            <div className="bg-[#11141b] border border-white/5 rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    Phân tích Tuổi nợ: Phải thu (131) vs Phải trả (331)
                  </h3>
                  <button
                    onClick={() => setTab('debt')}
                    className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
                  >
                    Chi tiết →
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Cơ cấu thời hạn công nợ để đánh giá rủi ro dòng tiền và kế hoạch thanh khoản
                </p>

                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={debtAgingData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickLine={false}
                        tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(0)}Tr` : `${val}`}
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }} />
                      <Bar dataKey="AR" name="Phải thu KH (131)" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="AP" name="Phải trả NCC (331)" fill={CHART_COLORS.rose} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span>Tổng nợ Quá hạn nghiêm trọng (&gt;30d):</span>
                <span className="font-mono font-bold text-rose-400">
                  {debtAgingData[3] ? ((debtAgingData[3].AP || 0) + (debtAgingData[3].AR || 0)).toLocaleString() : 0}đ
                </span>
              </div>
            </div>
          )}

          {/* Top Selling Products */}
          {(analyticsTab === 'overview' || analyticsTab === 'products') && (
            <div className="bg-[#11141b] border border-white/5 rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Top 5 Sản phẩm Hiệu suất Cao (Pareto 80/20)
                  </h3>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                    Xếp theo Doanh số
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">Các mặt hàng đóng góp dòng tiền và lưu chuyển hàng hóa chủ lực</p>

                <div className="space-y-3">
                  {topProducts.map((item, index) => {
                    const maxRevenue = topProducts[0]?.totalRevenue || 1;
                    const percentage = Math.round((item.totalRevenue / maxRevenue) * 100);
                    return (
                      <div key={item.product.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-white/5 text-slate-400 text-[10px] font-bold flex items-center justify-center font-mono">
                              {index + 1}
                            </span>
                            <span className="font-semibold text-white truncate max-w-[200px]">{item.product.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-emerald-400">{item.totalRevenue.toLocaleString()}đ</span>
                            <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({item.totalQty} Cái)</span>
                          </div>
                        </div>
                        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span>Sản phẩm tồn kho thấp cần nhập:</span>
                <span className="font-bold text-amber-400 font-mono">{lowStockProducts.length} mặt hàng</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. PRODUCT MATRIX TABLE FOR 'PRODUCTS' TAB */}
      {analyticsTab === 'products' && (
        <div className="bg-[#11141b] border border-white/5 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div>
              <h3 className="font-bold text-white text-sm">Ma trận Sản phẩm & Trạng thái Tồn kho Toàn bộ</h3>
              <p className="text-xs text-slate-400">Bảng chi tiết số lượng tồn, giá vốn bình quân và định mức cảnh báo</p>
            </div>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm SKU hoặc tên sản phẩm..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-slate-400 uppercase font-bold bg-black/20">
                  <th className="p-3">Mã SKU</th>
                  <th className="p-3">Tên sản phẩm</th>
                  <th className="p-3">Danh mục</th>
                  <th className="p-3 text-right">Tồn kho hiện tại</th>
                  {canViewCost && <th className="p-3 text-right">Giá vốn BQ</th>}
                  {canViewCost && <th className="p-3 text-right">Tổng giá trị tồn</th>}
                  <th className="p-3 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03] text-slate-300 text-xs">
                {filteredProductsList.map((prod) => {
                  const cat = db.categories.find((c) => c.id === prod.categoryId);
                  return (
                    <tr key={prod.id} className="hover:bg-white/[0.01]">
                      <td className="p-3 font-mono font-bold text-emerald-400">{prod.sku}</td>
                      <td className="p-3 font-semibold text-white">{prod.name}</td>
                      <td className="p-3 text-slate-400">{cat?.name || 'Khác'}</td>
                      <td className="p-3 text-right font-mono font-bold text-white">{prod.currentQty} Cái</td>
                      {canViewCost && (
                        <td className="p-3 text-right font-mono text-slate-300">{prod.averageCost.toLocaleString()}đ</td>
                      )}
                      {canViewCost && (
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          {(prod.currentQty * prod.averageCost).toLocaleString()}đ
                        </td>
                      )}
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          prod.currentQty <= 0
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : prod.currentQty <= 10
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {prod.currentQty <= 0 ? 'Hết hàng' : prod.currentQty <= 10 ? 'Cảnh báo ít' : 'Đủ định mức'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. AUTOMATIC DEBT & CRITICAL INVENTORY ALERTS */}
      {(overdueDebts.length > 0 || nearDueDebts.length > 0 || lowStockProducts.length > 0) && (
        <div className="bg-[#11141b] border border-white/5 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 animate-pulse" />
              </span>
              <div>
                <h3 className="font-bold text-white text-sm">Cảnh báo Vận hành & Công nợ Tự động</h3>
                <p className="text-[11px] text-slate-400">Quét tự động ngưỡng tồn kho an toàn và kỳ hạn chứng từ kế toán thực tế</p>
              </div>
            </div>
            <button
              onClick={() => setTab('debt')}
              className="text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
            >
              Xem sổ công nợ tất toán ngay
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Alert 1: Overdue Debts */}
            <div className="space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                Công nợ Quá hạn thanh toán ({overdueDebts.length})
              </span>
              {overdueDebts.length === 0 ? (
                <div className="bg-black/10 border border-white/5 rounded-xl p-3 text-center text-xs text-slate-500">
                  Không có khoản nợ quá hạn.
                </div>
              ) : (
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {overdueDebts.slice(0, 3).map((d) => {
                    const partnerName = d.type === 'AP'
                      ? db.suppliers.find((s) => s.id === d.partnerId)?.name
                      : db.customers.find((c) => c.id === d.partnerId)?.name || 'Khách vãng lai';
                    const remaining = d.amount - d.paidAmount;
                    return (
                      <div key={d.id} className="bg-black/20 border border-rose-500/10 rounded-xl p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-slate-200 line-clamp-1 text-[11px]">{partnerName}</p>
                          <p className="text-[10px] text-rose-400 font-mono">Hạn: {d.dueDate}</p>
                        </div>
                        <span className="font-bold text-rose-400 font-mono text-[11px]">{remaining.toLocaleString()}đ</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Alert 2: Near Due Debts */}
            <div className="space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Công nợ Sắp đến hạn trong 7 ngày ({nearDueDebts.length})
              </span>
              {nearDueDebts.length === 0 ? (
                <div className="bg-black/10 border border-white/5 rounded-xl p-3 text-center text-xs text-slate-500">
                  Không có khoản nợ sắp đến hạn.
                </div>
              ) : (
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {nearDueDebts.slice(0, 3).map((d) => {
                    const partnerName = d.type === 'AP'
                      ? db.suppliers.find((s) => s.id === d.partnerId)?.name
                      : db.customers.find((c) => c.id === d.partnerId)?.name || 'Khách vãng lai';
                    const remaining = d.amount - d.paidAmount;
                    return (
                      <div key={d.id} className="bg-black/20 border border-amber-500/10 rounded-xl p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-slate-200 line-clamp-1 text-[11px]">{partnerName}</p>
                          <p className="text-[10px] text-amber-400 font-mono">Hạn: {d.dueDate}</p>
                        </div>
                        <span className="font-bold text-amber-400 font-mono text-[11px]">{remaining.toLocaleString()}đ</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Alert 3: Low Stock Warning */}
            <div className="space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                Tồn kho thấp &lt;= 10 ({lowStockProducts.length})
              </span>
              {lowStockProducts.length === 0 ? (
                <div className="bg-black/10 border border-white/5 rounded-xl p-3 text-center text-xs text-slate-500">
                  Tất cả sản phẩm đều đủ tồn kho an toàn.
                </div>
              ) : (
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {lowStockProducts.slice(0, 3).map((p) => (
                    <div key={p.id} className="bg-black/20 border border-blue-500/10 rounded-xl p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-200 line-clamp-1 text-[11px]">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.currentQty <= 0
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                      }`}>
                        {p.currentQty} Cái
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. RECENT TRANSACTIONS STREAM */}
      <div className="bg-[#11141b] border border-white/5 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-white text-sm">Nhật ký Giao dịch Kho Gần đây</h3>
            <p className="text-xs text-slate-400">Các phiếu xuất nhập kho vừa được phát sinh trong hệ thống</p>
          </div>
          <button
            onClick={() => setTab('transactions')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            Vào Sổ Kho & Chứng từ →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] text-slate-400 uppercase font-bold bg-black/20">
                <th className="p-3">Ngày lập</th>
                <th className="p-3">Số chứng từ</th>
                <th className="p-3">Loại phiếu</th>
                <th className="p-3">Kho lưu trữ</th>
                <th className="p-3 text-right">Tổng giá trị</th>
                <th className="p-3 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03] text-slate-300 text-xs">
              {latestTransactions.map((tx) => {
                const wh = db.warehouses.find((w) => w.id === tx.warehouseId);
                return (
                  <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="p-3 font-mono text-slate-400">{formatDate(tx.date)}</td>
                    <td className="p-3 font-bold text-white font-mono">{tx.referenceNo}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        tx.type === 'IN'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {tx.type === 'IN' ? 'NHẬP KHO' : 'XUẤT KHO'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">{wh?.name || 'Kho chính'}</td>
                    <td className="p-3 text-right font-bold text-white font-mono">
                      {tx.totalAmount.toLocaleString()}đ
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.isConfirmed
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {tx.isConfirmed ? 'Đã duyệt' : 'Nháp'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
