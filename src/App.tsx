/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { MockDatabase } from './db/mockDb';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Categories from './components/Categories';
import StockTransactions from './components/StockTransactions';
import Accounting from './components/Accounting';
import DebtAndVat from './components/DebtAndVat';
import VatLedger from './components/VatLedger';
import Reports from './components/Reports';
import Settings from './components/Settings';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import Webshop from './components/Webshop';
import WebshopStorefront from './components/WebshopStorefront';
import ExcelImportModal from './components/ExcelImportModal';
import { ExcelImportType, exportDataToExcel } from './utils/excelHelper';
import { AnimatePresence } from 'motion/react';
import {
  Calendar,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Users,
  UserCheck,
  LayoutDashboard,
  FolderTree,
  ArrowLeftRight,
  CreditCard,
  BookOpen,
  Receipt,
  BarChart3,
  ShoppingBag,
  Settings as SettingsIcon,
  Bell,
  ExternalLink,
  CheckCircle2,
  X,
  Truck,
  Sparkles,
  ArrowRight,
  Clock,
  Menu,
  FileSpreadsheet,
} from 'lucide-react';
import { applyThemeColor } from './utils/theme';
import { canViewPurchaseCost, canAccessTab, getDefaultTabForUser } from './utils/rbac';
import { subscribeToNewOrders } from './utils/orderNotifications';
import { WebshopOrder } from './types';
import { serverLogout } from './utils/authClient';

// Tự động lấy Tháng / Năm hiện tại của hệ thống
const now = new Date();
const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
const currentYear = now.getFullYear();

const TAB_CONFIG: Record<string, { title: string; icon: React.ComponentType<{ className?: string }> }> = {
  'dashboard': { title: 'Tổng quan', icon: LayoutDashboard },
  'webshop': { title: 'Webshop Bán hàng', icon: ShoppingBag },
  'directories': { title: 'Danh mục', icon: FolderTree },
  'transactions': { title: 'Chứng từ', icon: ArrowLeftRight },
  'debt': { title: 'Quản lý Công nợ', icon: CreditCard },
  'accounting': { title: 'Nhật ký chung', icon: BookOpen },
  'vat-ledger': { title: 'Sổ Thuế VAT', icon: Receipt },
  'reports': { title: 'Báo cáo quản trị', icon: BarChart3 },
  'users': { title: 'Quản lý & Ma trận Phân quyền', icon: ShieldCheck },
  'settings': { title: 'Cấu hình hệ thống', icon: SettingsIcon }
};

export default function App() {
  const dbRef = useRef(new MockDatabase());
  
  // App view mode: 'admin' (Hệ thống Quản trị Kho WMS/ERP) vs 'shop' (Giao diện Webshop Khách Hàng Độc Lập)
  const [viewMode, setViewMode] = useState<'admin' | 'shop'>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('mode') === 'shop' || window.location.hash === '#shop') {
        return 'shop';
      }
      const saved = localStorage.getItem('wms_active_view_mode');
      if (saved === 'shop') return 'shop';
    }
    return 'admin';
  });

  const [activeTab, setActiveTabState] = useState<string>(() => {
    try {
      return sessionStorage.getItem('wms_active_tab') || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    try {
      sessionStorage.setItem('wms_active_tab', tab);
    } catch {
      // ignore
    }
  };
  const [updateTrigger, setUpdateTrigger] = useState<number>(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'loading' | 'synced' | 'error'>('loading');
  const [showSwitchUserModal, setShowSwitchUserModal] = useState<boolean>(false);

  // Auto-switch to an allowed tab if the activeTab is restricted for the current user's role
  useEffect(() => {
    const user = dbRef.current.currentUser;
    if (user && !canAccessTab(activeTab, user, dbRef.current.roles)) {
      const allowedTab = getDefaultTabForUser(user, dbRef.current.roles);
      setActiveTab(allowedTab);
    }
  }, [activeTab, updateTrigger]);

  // Notifications for incoming orders
  const [orderToast, setOrderToast] = useState<WebshopOrder | null>(null);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState<boolean>(false);
  const [showGlobalExcelModal, setShowGlobalExcelModal] = useState<boolean>(false);

  const getDefaultExcelTypeForTab = (tab: string): ExcelImportType => {
    if (tab === 'transactions') return 'vouchers';
    if (tab === 'debt') return 'debts';
    if (tab === 'accounting') return 'coa';
    return 'products';
  };

  const currentTabConfig = TAB_CONFIG[activeTab] || TAB_CONFIG['dashboard'];
  const TabIcon = currentTabConfig.icon;
  const forceUpdate = () => {
    setUpdateTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const unsub = dbRef.current.subscribe(() => {
      setUpdateTrigger((prev) => prev + 1);
    });
    dbRef.current.syncWithFirebase((status) => {
      setSyncStatus(status);
      forceUpdate();
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const currentTheme = dbRef.current.systemConfig?.themeColor || '#10b981';
    applyThemeColor(currentTheme);
  }, [updateTrigger]);

  // Realtime listener for incoming customer orders (audio + visual alert)
  useEffect(() => {
    const unsubscribe = subscribeToNewOrders((order) => {
      setOrderToast(order);
      forceUpdate();
    });
    return () => unsubscribe();
  }, []);

  // Auto-dismiss order toast after 14 seconds
  useEffect(() => {
    if (orderToast) {
      const timer = setTimeout(() => {
        setOrderToast(null);
      }, 14000);
      return () => clearTimeout(timer);
    }
  }, [orderToast]);

  const handleResetDb = () => {
    if (import.meta.env.PROD) {
      alert('Không hỗ trợ đặt lại cơ sở dữ liệu production từ trình duyệt.');
      return;
    }
    dbRef.current.resetDatabase();
    forceUpdate();
    setActiveTab('dashboard');
    alert('Dữ liệu hệ thống đã được thiết lập lại về trạng thái mặc định.');
  };

  const handleLogout = () => {
    if (import.meta.env.PROD) void serverLogout();
    dbRef.current.logout();
    forceUpdate();
  };

  const handleSwitchUser = (username: string) => {
    // Only the local development simulator may switch accounts without credentials.
    if (import.meta.env.PROD) {
      setShowSwitchUserModal(false);
      alert('Để đổi người dùng, hãy đăng xuất và đăng nhập lại bằng tài khoản trên Supabase.');
      return;
    }
    dbRef.current.login(username, '');
    setShowSwitchUserModal(false);
    forceUpdate();
  };

  const handleSwitchToShop = () => {
    setViewMode('shop');
    try {
      localStorage.setItem('wms_active_view_mode', 'shop');
    } catch {
      // ignore
    }
  };

  const handleSwitchToAdmin = () => {
    setViewMode('admin');
    try {
      localStorage.setItem('wms_active_view_mode', 'admin');
    } catch {
      // ignore
    }
  };

  const handleOpenShopNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open('?mode=shop#shop', '_blank');
    }
  };

  const db = dbRef.current;
  const currentUser = db.currentUser;
  const pendingOrders = db.webshopOrders.filter((o) => o.orderStatus === 'PENDING');

  // 1. STANDALONE CUSTOMER WEBSHOP MODE
  // When in 'shop' mode, render purely the isolated online e-commerce storefront.
  // No warehouse sidebar, no admin nav, no internal accounting elements!
  if (viewMode === 'shop') {
    return (
      <WebshopStorefront
        db={db}
        onOpenAdmin={handleSwitchToAdmin}
        onUpdate={forceUpdate}
      />
    );
  }

  // 2. WAREHOUSE MANAGEMENT SYSTEM (ADMIN / ERP) MODE
  // If not authenticated, render Login screen with button to return to Webshop
  if (!currentUser) {
    return (
      <Login
        db={db}
        onLoginSuccess={() => {
          setSyncStatus('synced');
          forceUpdate();
        }}
        onBackToShop={handleSwitchToShop}
      />
    );
  }

  return (
    <div className="flex bg-[#08090a] text-slate-300 h-screen w-full font-sans relative overflow-hidden">
      {/* Realtime Floating Notification Toast for incoming customer orders */}
      <AnimatePresence>
        {orderToast && (
          <div
            id="new-order-toast-alert"
            className="fixed top-5 right-5 z-50 max-w-md w-full bg-gradient-to-br from-[#0c121f] via-[#0d1627] to-[#0a101d] border-2 border-emerald-500/50 rounded-2xl shadow-2xl p-4 text-white animate-in slide-in-from-top-4 duration-300 ring-4 ring-emerald-500/10"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 animate-bounce text-emerald-400" />
                  <span>CÓ ĐƠN HÀNG MỚI TỪ WEBSHOP!</span>
                </span>
              </div>
              <button
                onClick={() => setOrderToast(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-900/90 rounded-xl p-3 border border-emerald-500/20 text-xs space-y-1.5 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Mã đơn:</span>
                <span className="font-mono font-black text-emerald-400">{orderToast.orderCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Khách hàng:</span>
                <span className="font-bold text-white truncate max-w-[200px]">
                  {orderToast.customerName} ({orderToast.customerPhone})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Số lượng:</span>
                <span className="text-slate-300 font-semibold">{orderToast.items?.length || 1} sản phẩm</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-800 text-sm font-bold">
                <span className="text-slate-300">Tổng giá trị:</span>
                <span className="text-emerald-400 font-black">
                  {(orderToast.totalAmount || 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const res = db.fulfillWebshopOrder(orderToast.id);
                  if (res.success) {
                    alert(`Đã duyệt & xuất kho tự động cho đơn ${orderToast.orderCode}!`);
                  } else {
                    alert(`Cảnh báo: ${res.message}`);
                  }
                  setOrderToast(null);
                  setActiveTab('webshop');
                  forceUpdate();
                }}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs py-2 rounded-xl transition shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Duyệt & Xuất Kho Ngay</span>
              </button>

              <button
                onClick={() => {
                  setOrderToast(null);
                  setActiveTab('webshop');
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-3 py-2 rounded-xl transition border border-slate-700"
              >
                Xem chi tiết
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar - Persistent left navigation panel */}
      <Sidebar
        currentTab={activeTab}
        setTab={setActiveTab}
        onResetDb={handleResetDb}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenStorefront={handleSwitchToShop}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        roles={db.roles}
      />

      {/* Main viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="bg-[#0d1117]/80 backdrop-blur-md h-16 border-b border-white/5 flex items-center justify-between px-3 sm:px-6 lg:px-8 shadow-2xl relative z-30 shrink-0">
          {/* Khu vực hiển thị Tên và Icon đồng bộ với Sidebar */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {/* Mobile Hamburger Toggle Button */}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition active:scale-95 shrink-0"
              title="Mở menu quản trị kho"
              aria-label="Mở menu điều hướng kho"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-emerald-400 border-r border-white/10 pr-2 sm:pr-4 truncate">
              <TabIcon className="w-5 h-5 shrink-0" />
              <h1 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
                {currentTabConfig.title}
              </h1>
            </div>

            {/* Quick Standalone Webshop Launcher in Header */}
            <div className="hidden lg:flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-1 shadow-sm">
              <button
                onClick={handleSwitchToShop}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-emerald-500/20 transition"
                title="Chuyển sang giao diện Webshop bán lẻ dành riêng cho khách hàng"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Gian Hàng Khách Hàng</span>
              </button>
              <button
                onClick={handleOpenShopNewTab}
                className="text-emerald-400 hover:text-white p-1 rounded-lg hover:bg-emerald-500/20 transition"
                title="Mở Webshop khách hàng ở tab trình duyệt mới (để test đặt hàng và nhận thông báo chuông tức thì)"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sync status */}
          <div className="hidden md:flex items-center gap-3">
            {syncStatus === 'loading' && (
              <span className="text-xs bg-amber-500/10 text-amber-400 font-bold px-2.5 py-1 rounded-full border border-amber-500/20 flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                Đang kết nối Database...
              </span>
            )}
            {syncStatus === 'synced' && (() => {
              const engine = typeof window !== 'undefined' ? localStorage.getItem('wms_active_db_engine') : 'supabase';
              const isD1 = engine === 'd1';

              const badge = !isD1
                ? {
                    label: '⚡ Supabase Cloud (PostgreSQL)',
                    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25',
                    dotClass: 'bg-emerald-400',
                  }
                : {
                    label: '☁️ Cloudflare D1 Database (Edge SQL)',
                    className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25',
                    dotClass: 'bg-cyan-400',
                  };

              return (
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  title="Nhấn để xem cấu hình Cơ sở dữ liệu Supabase Cloud (PostgreSQL)"
                  className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 transition cursor-pointer ${badge.className}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${badge.dotClass}`}></span>
                  {badge.label}
                </button>
              );
            })()}
            {syncStatus === 'error' && (
              <span className="text-xs bg-rose-500/10 text-rose-400 font-bold px-2.5 py-1 rounded-full border border-rose-500/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-rose-400 rounded-full"></span>
                ⚠️ Lỗi kết nối đám mây
              </span>
            )}
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Global Quick Excel Import Button */}
            <button
              id="header-global-excel-import-btn"
              type="button"
              onClick={() => setShowGlobalExcelModal(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition shadow-sm"
              title="Nhập dữ liệu hàng loạt từ file Excel (.xlsx, .xls, .csv) cho mọi danh mục, tồn đầu kỳ, chứng từ, công nợ"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Import Excel</span>
            </button>

            {/* Notification Bell with Badge & Dropdown */}
            <div className="relative">
              <button
                id="header-notification-bell-btn"
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className="relative p-2 rounded-xl bg-[#11141b] border border-white/10 hover:border-emerald-500/40 text-slate-300 hover:text-white transition shadow-sm"
                title="Thông báo đơn hàng Webshop"
              >
                <Bell className={`w-4 h-4 ${pendingOrders.length > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
                {pendingOrders.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-bounce">
                    {pendingOrders.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {showNotificationDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-[#0e131f] border border-slate-700/80 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Đơn Hàng Webshop ({pendingOrders.length} chờ duyệt)</span>
                    </span>
                    <button
                      onClick={() => setShowNotificationDropdown(false)}
                      className="text-slate-500 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {pendingOrders.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-1 text-emerald-500/50" />
                        <p>Hiện không có đơn hàng nào chờ duyệt.</p>
                      </div>
                    ) : (
                      pendingOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="bg-slate-900/80 hover:bg-slate-800/80 p-2.5 rounded-xl border border-slate-800 transition text-xs space-y-1 cursor-pointer"
                          onClick={() => {
                            setShowNotificationDropdown(false);
                            setActiveTab('webshop');
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-mono font-black text-emerald-400">{ord.orderCode}</span>
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                              Chờ duyệt
                            </span>
                          </div>
                          <p className="text-white font-semibold truncate">{ord.customerName} - {ord.customerPhone}</p>
                          <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                            <span>{ord.date}</span>
                            <span className="font-bold text-emerald-400">
                              {(ord.totalAmount || 0).toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800 mt-2">
                    <button
                      onClick={() => {
                        setShowNotificationDropdown(false);
                        setActiveTab('webshop');
                      }}
                      className="w-full py-1.5 text-center text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 rounded-lg transition"
                    >
                      Xem toàn bộ danh sách đơn hàng
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Date Tag */}
            <div className="hidden sm:flex items-center gap-2 bg-[#11141b] px-3.5 py-1.5 rounded-xl border border-white/5 text-xs font-semibold text-slate-400 shadow-2xl">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Tháng {currentMonth}/{currentYear}</span>
            </div>

            {/* Current user badge with logout */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-[#11141b] pl-1.5 sm:pl-2 pr-2 sm:pr-3 py-1 rounded-xl border border-white/5 text-xs">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 text-black font-bold flex items-center justify-center text-xs shadow-md shrink-0">
                {currentUser.fullName.charAt(0)}
              </div>
              <div className="hidden sm:flex flex-col text-left truncate max-w-[100px] md:max-w-[140px]">
                <span className="font-bold text-white leading-tight truncate">{currentUser.fullName}</span>
                <span className="text-[10px] text-slate-400 capitalize truncate">{currentUser.roleId}</span>
              </div>
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="ml-1 p-1 text-slate-400 hover:text-rose-400 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Content canvas - Fluid responsive padding and RBAC protection */}
        <main className="flex-1 overflow-y-auto overflow-x-auto p-3.5 sm:p-5 md:p-6 lg:p-7 w-full min-w-0 scrollbar-thin">
          {!canAccessTab(activeTab, currentUser, db.roles) ? (
            <div className="bg-[#11141b] border border-rose-500/20 rounded-2xl p-6 sm:p-8 text-center max-w-lg mx-auto my-12">
              <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white mb-2">Giới Hạn Quyền Truy Cập (RBAC)</h2>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Tài khoản <span className="text-white font-semibold">{currentUser.fullName}</span> thuộc vai trò{' '}
                <span className="text-rose-400 font-semibold">{currentUser.roleId}</span> không có quyền truy cập vào phân hệ này.
              </p>
              <button
                onClick={() => setActiveTab(getDefaultTabForUser(currentUser, db.roles))}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl text-xs transition"
              >
                Về Phân Hệ Được Phân Quyền
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <div key="dashboard" className="w-full min-w-0">
                  <Dashboard db={db} setTab={setActiveTab} currentUser={currentUser} />
                </div>
              )}
              {activeTab === 'webshop' && (
                <div key="webshop" className="w-full min-w-0">
                  <Webshop
                    db={db}
                    onUpdate={forceUpdate}
                    currentUser={currentUser}
                    setTab={setActiveTab}
                    onOpenStorefront={handleSwitchToShop}
                  />
                </div>
              )}
              {activeTab === 'directories' && (
                <div key="directories" className="w-full min-w-0">
                  <Categories db={db} onUpdate={forceUpdate} updateTrigger={updateTrigger} currentUser={currentUser} />
                </div>
              )}
              {activeTab === 'transactions' && (
                <div key="transactions" className="w-full min-w-0">
                  <StockTransactions db={db} onUpdate={forceUpdate} updateTrigger={updateTrigger} currentUser={currentUser} />
                </div>
              )}
              {activeTab === 'accounting' && (
                <div key="accounting" className="w-full min-w-0">
                  <Accounting db={db} onUpdate={forceUpdate} updateTrigger={updateTrigger} currentUser={currentUser} />
                </div>
              )}
              {activeTab === 'debt' && (
                <div key="debt" className="w-full min-w-0">
                  <DebtAndVat db={db} onUpdate={forceUpdate} updateTrigger={updateTrigger} />
                </div>
              )}
              {activeTab === 'vat-ledger' && (
                <div key="vat-ledger" className="w-full min-w-0">
                  <VatLedger db={db} onUpdate={forceUpdate} />
                </div>
              )}
              {activeTab === 'reports' && (
                <div key="reports" className="w-full min-w-0">
                  <Reports db={db} currentUser={currentUser} />
                </div>
              )}
              {activeTab === 'users' && (
                <div key="users" className="w-full min-w-0">
                  <UserManagement
                    db={db}
                    currentUser={currentUser}
                    onUpdate={forceUpdate}
                    onSwitchUser={(u) => handleSwitchUser(u.username)}
                  />
                </div>
              )}
              {activeTab === 'settings' && (
                <div key="settings" className="w-full min-w-0">
                  <Settings db={db} onUpdate={forceUpdate} updateTrigger={updateTrigger} />
                </div>
              )}
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* Quick Switch User Modal */}
      {showSwitchUserModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141b] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <UserCheck className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">Chuyển đổi tài khoản người dùng</h3>
              </div>
              <button
                onClick={() => setShowSwitchUserModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Chọn nhanh một tài khoản bất kỳ để kiểm thử ngay cơ chế phân quyền (RBAC) và kiểm tra tính năng bảo mật che giấu giá mua:
            </p>

            <div className="space-y-2">
              {db.users.map((u) => {
                const isSelected = u.id === currentUser.id;
                const roleObj = db.roles.find((r) => r.id === u.roleId);
                const roleName = roleObj?.name || u.roleId;
                const isAdmin = u.roleId === 'admin';

                return (
                  <button
                    key={u.id}
                    onClick={() => handleSwitchUser(u.username)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                        : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isAdmin ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {u.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white">{u.fullName}</p>
                          {isSelected && (
                            <span className="text-[9px] bg-emerald-500 text-black font-extrabold px-1.5 py-0.2 rounded">
                              Đang dùng
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">@{u.username} • {roleName}</p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isAdmin ? 'bg-rose-500/20 text-rose-300' : 'bg-white/5 text-slate-400'
                    }`}>
                      {isAdmin ? 'Xem giá mua' : 'Ẩn giá mua'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSwitchUserModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Excel Import Modal accessible from anywhere */}
      <ExcelImportModal
        isOpen={showGlobalExcelModal}
        onClose={() => setShowGlobalExcelModal(false)}
        db={db}
        defaultType={getDefaultExcelTypeForTab(activeTab)}
        onUpdate={forceUpdate}
      />
    </div>
  );
}
