/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { MockDatabase } from '../db/mockDb';
import { User } from '../types';
import { canViewPurchaseCost } from '../utils/rbac';
import { BarChart3, TrendingUp, PieChart, Users2, ShieldCheck, DollarSign, ArrowUpRight, Lock, FileSpreadsheet } from 'lucide-react';
import { motion } from 'motion/react';
import InventoryMovementReport from './InventoryMovementReport';

interface ReportsProps {
  db: MockDatabase;
  currentUser?: User | null;
}

export default function Reports({ db, currentUser }: ReportsProps) {
  const canViewCost = canViewPurchaseCost(currentUser, db.roles);
  const [reportTab, setReportTab] = useState<'nxt' | 'pnl' | 'inventory' | 'partners'>('nxt');

  // Math variables
  const products = db.products;
  const is = db.getIncomeStatement();

  // Top products by current stock value
  const sortedByVal = [...products].sort((a, b) => {
    return (b.currentQty * b.averageCost) - (a.currentQty * a.averageCost);
  });

  const totalInvValue = products.reduce((sum, p) => sum + (p.currentQty * p.averageCost), 0);

  // Top Customers (Revenue generated)
  // Let's compute actual revenues by Customer
  const customerRevenues: Record<string, number> = {};
  const confirmedSales = db.stockTransactions.filter((t) => t.type === 'OUT' && t.isConfirmed && !t.isReversed);

  for (const s of confirmedSales) {
    if (s.customerId) {
      customerRevenues[s.customerId] = (customerRevenues[s.customerId] || 0) + s.subtotal;
    }
  }

  const topCustomers = Object.keys(customerRevenues).map((id) => {
    const cust = db.customers.find((c) => c.id === id);
    return {
      name: cust?.name || 'Khách vãng lai',
      taxCode: cust?.taxCode || '-',
      amount: customerRevenues[id],
    };
  }).sort((a, b) => b.amount - a.amount);

  // Top Suppliers (Purchase volume)
  const supplierPurchases: Record<string, number> = {};
  const confirmedPurchases = db.stockTransactions.filter((t) => t.type === 'IN' && t.isConfirmed && !t.isReversed);

  for (const p of confirmedPurchases) {
    if (p.supplierId) {
      supplierPurchases[p.supplierId] = (supplierPurchases[p.supplierId] || 0) + p.subtotal;
    }
  }

  const topSuppliers = Object.keys(supplierPurchases).map((id) => {
    const sup = db.suppliers.find((s) => s.id === id);
    return {
      name: sup?.name || 'Nhà cung cấp',
      taxCode: sup?.taxCode || '-',
      amount: supplierPurchases[id],
    };
  }).sort((a, b) => b.amount - a.amount);

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
          <h2 className="text-2xl font-bold text-white tracking-tight">Trung tâm phân tích & Báo cáo quản trị</h2>
          <p className="text-sm text-slate-400">Trực quan hóa cấu trúc chi phí, tỷ trọng tồn kho tài sản và đóng góp doanh thu của khách hàng/NCC</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-white/5 gap-1.5 pb-0.5">
        <button
          onClick={() => setReportTab('nxt')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition ${
            reportTab === 'nxt' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Bảng báo cáo Nhập - Xuất - Tồn</span>
        </button>
        <button
          onClick={() => setReportTab('pnl')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition ${
            reportTab === 'pnl' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Phân tích Lợi nhuận (P&L)</span>
        </button>
        <button
          onClick={() => setReportTab('inventory')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition ${
            reportTab === 'inventory' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Cấu trúc Giá trị tồn kho</span>
        </button>
        <button
          onClick={() => setReportTab('partners')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition ${
            reportTab === 'partners' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          <Users2 className="w-4 h-4" />
          <span>Đóng góp SP / KH / NCC</span>
        </button>
      </div>

      {/* NXT Report tab */}
      {reportTab === 'nxt' && (
        <InventoryMovementReport db={db} currentUser={currentUser} />
      )}

      {/* P&L tab */}
      {reportTab === 'pnl' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Key margin ratios */}
          <div className="md:col-span-2 bg-[#11141b] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-6">
            <h3 className="font-bold text-white text-sm">Chỉ số biên lợi nhuận (Profitability Margins)</h3>

            {/* Margin 1 */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-1 text-slate-300">
                <span>Biên Lợi nhuận gộp (Gross Profit Margin)</span>
                <span className="font-bold text-emerald-400">
                  {is.totalRevenue > 0 ? Math.round((is.grossProfit / is.totalRevenue) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-black/40 h-3 rounded-full overflow-hidden border border-white/5">
                <div
                  className="bg-emerald-500 h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  style={{ width: `${is.totalRevenue > 0 ? (is.grossProfit / is.totalRevenue) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Đo lường hiệu quả quản trị giá gốc mua hàng & tính giá bình quân gia quyền liên hoàn.</p>
            </div>

            {/* Margin 2 */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-1 text-slate-300">
                <span>Biên Lợi nhuận ròng sau thuế (Net Profit Margin)</span>
                <span className="font-bold text-emerald-400">
                  {is.totalRevenue > 0 ? Math.round((is.netProfit / is.totalRevenue) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-black/40 h-3 rounded-full overflow-hidden border border-white/5">
                <div
                  className="bg-emerald-600 h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  style={{ width: `${is.totalRevenue > 0 ? (is.netProfit / is.totalRevenue) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Biên lợi nhuận ròng sau khi khấu trừ thuế CIT 20% và chi phí quản lý doanh nghiệp (642).</p>
            </div>
          </div>

          {/* Quick audit metrics card */}
          <div className="bg-[#11141b] text-slate-300 rounded-2xl p-6 border border-white/5 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Đánh giá & tuân thủ</span>
              </div>
              <h4 className="text-white font-bold text-sm mb-3">Thông tư 133/200 </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hệ thống tuân thủ toàn diện các quy tắc đối ứng tài khoản kép (Debit = Credit). Mọi giao dịch hạch toán đều được ghi sổ trực tiếp vào Nhật ký chung thời gian thực.
              </p>
            </div>

            <div className="border-t border-white/5 pt-4 mt-4 flex items-center justify-between text-xs">
              <span className="text-slate-400">Phương pháp tính giá:</span>
              <span className="font-bold text-white">Bình quân</span>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Valuation Tab */}
      {reportTab === 'inventory' && (
        !canViewCost ? (
          <div className="bg-[#11141b] border border-rose-500/20 rounded-2xl p-10 shadow-2xl text-center space-y-4 max-w-xl mx-auto my-8">
            <div className="w-14 h-14 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Bảo mật Dữ liệu Giá trị Tồn kho Mua vào</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Theo chính sách phân quyền hệ thống (RBAC), các báo cáo liên quan đến giá mua vào, cơ cấu vốn lưu động và tổng giá trị kho tính theo giá vốn chỉ được phép truy cập bởi tài khoản <strong className="text-rose-400 font-semibold">Quản trị viên (Admin)</strong>.
            </p>
            <div className="pt-2">
              <span className="text-[11px] bg-white/5 text-slate-400 border border-white/10 px-3 py-1.5 rounded-lg">
                Tài khoản hiện tại: <span className="text-emerald-400 font-bold">{currentUser?.fullName || 'Nhân viên'}</span> ({currentUser?.roleId || 'Non-Admin'})
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-[#11141b] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4">
              <h3 className="font-bold text-white text-sm">Phân bổ tỷ trọng giá trị tài sản tồn kho</h3>
              <p className="text-xs text-slate-400 mb-4">Danh sách sản phẩm được sắp xếp theo tổng giá trị vốn lưu động đang nắm giữ</p>

              <div className="space-y-4">
                {sortedByVal.map((p) => {
                  const prodVal = p.currentQty * p.averageCost;
                  const ratio = totalInvValue > 0 ? (prodVal / totalInvValue) * 100 : 0;
                  return (
                    <div key={p.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>{p.name} ({p.sku})</span>
                        <span className="text-slate-100">{prodVal.toLocaleString()}đ <span className="text-emerald-400">({Math.round(ratio)}%)</span></span>
                      </div>
                      <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${ratio}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Side card */}
            <div className="bg-[#11141b] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4">
              <h3 className="font-bold text-white text-sm">Tổng kết vốn lưu động</h3>
              <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Hàng tồn kho hiện thời</span>
                <h4 className="text-2xl font-black text-white mt-1">{totalInvValue.toLocaleString()}đ</h4>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Tỷ trọng tồn kho giúp bạn tối ưu hóa dòng tiền, tránh đọng vốn quá lâu vào các sản phẩm tiêu thụ chậm.
              </p>
            </div>
          </div>
        )
      )}

      {/* Top SP / KH / NCC contributions */}
      {reportTab === 'partners' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customers revenue contribution */}
          <div className="bg-[#11141b] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-slate-300 border-b border-white/5 pb-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">Phân tích đóng góp Doanh thu của Khách hàng</h3>
            </div>

            {topCustomers.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Chưa ghi nhận doanh thu bán hàng thực tế nào.</p>
            ) : (
              <div className="space-y-3">
                {topCustomers.map((c, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5">
                    <div>
                      <h4 className="text-xs font-bold text-white">{c.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">MST: {c.taxCode}</p>
                    </div>
                    <span className="text-xs font-black text-emerald-400">
                      {c.amount.toLocaleString()}đ
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Suppliers volume purchase */}
          <div className="bg-[#11141b] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-slate-300 border-b border-white/5 pb-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">Phân tích chi tiêu mua sắm với Nhà cung cấp</h3>
            </div>

            {topSuppliers.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Chưa ghi nhận giao dịch nhập hàng thực tế nào.</p>
            ) : (
              <div className="space-y-3">
                {topSuppliers.map((s, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5">
                    <div>
                      <h4 className="text-xs font-bold text-white">{s.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">MST: {s.taxCode}</p>
                    </div>
                    <span className="text-xs font-black text-slate-200">
                      {canViewCost ? (
                        `${s.amount.toLocaleString()}đ`
                      ) : (
                        <span className="text-slate-500 font-mono text-xs italic">*** (Bảo mật)</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
