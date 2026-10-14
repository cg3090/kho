/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  LayoutDashboard,
  FolderTree,
  ArrowLeftRight,
  BookOpen,
  CreditCard,
  BarChart3,
  Database,
  ChevronLeft,
  ChevronRight,
  Settings,
  Receipt,
  ShieldCheck,
  LogOut,
  UserCheck,
  ShoppingBag,
  X,
} from 'lucide-react';
import { User, Role } from '../types';
import { canAccessTab, DEFAULT_ROLES } from '../utils/rbac';

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  onResetDb: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  currentUser?: User | null;
  onLogout?: () => void;
  onOpenStorefront?: () => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  roles?: Role[];
}

export default function Sidebar({
  currentTab,
  setTab,
  onResetDb,
  isCollapsed,
  setIsCollapsed,
  currentUser,
  onLogout,
  onOpenStorefront,
  isMobileOpen,
  setIsMobileOpen,
  roles = DEFAULT_ROLES,
}: SidebarProps) {
  const handleNavClick = (tabId: string) => {
    setTab(tabId);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  // Group 1: Dashboard, Webshop & Directories
  const group1Items = [
    { id: 'dashboard', name: 'Tổng quan', icon: LayoutDashboard },
    { id: 'webshop', name: 'Đơn Hàng Webshop', icon: ShoppingBag },
    { id: 'directories', name: 'Danh mục', icon: FolderTree },
  ].filter((m) => canAccessTab(m.id, currentUser, roles));

  // Group 2: Transactions & Debt
  const group2Items = [
    { id: 'transactions', name: 'Chứng từ', icon: ArrowLeftRight },
    { id: 'debt', name: 'Quản lý Công nợ', icon: CreditCard },
  ].filter((m) => canAccessTab(m.id, currentUser, roles));

  // Group 3: Accounting & Reports
  const group3Items = [
    { id: 'accounting', name: 'Nhật ký chung', icon: BookOpen },
    { id: 'vat-ledger', name: 'Sổ Thuế VAT', icon: Receipt },
    { id: 'reports', name: 'Báo cáo quản trị', icon: BarChart3 },
  ].filter((m) => canAccessTab(m.id, currentUser, roles));

  // Group 4: System & RBAC
  const group4Items = [
    { id: 'users', name: 'Quản trị & Phân quyền', icon: ShieldCheck },
    { id: 'settings', name: 'Cấu hình hệ thống', icon: Settings },
  ].filter((m) => canAccessTab(m.id, currentUser, roles));

  // Role display details
  const currentRole = roles.find((r) => r.id === currentUser?.roleId);
  const roleName = currentRole?.name || currentUser?.roleId || 'Nhân viên';

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen?.(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Element (Drawer on mobile, left column on desktop) */}
      <aside
        id="main-sidebar"
        className={`bg-[#0d1117] text-slate-300 flex flex-col border-r border-white/5 shrink-0 transition-all duration-300 ease-in-out z-50
          fixed inset-y-0 left-0 lg:static lg:h-full lg:min-h-0
          ${isMobileOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        {/* Brand area */}
        <div className="p-4 h-16 border-b border-white/5 flex items-center justify-between overflow-hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-black" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <span className="text-md font-bold tracking-tight text-white whitespace-nowrap animate-fade-in">
                V-<span className="text-emerald-500">SMART</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Mobile close button */}
            <button
              onClick={() => setIsMobileOpen?.(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
              title="Đóng menu"
              aria-label="Đóng menu"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Desktop collapse toggle button */}
            <button
              id="sidebar-toggle-btn"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:block p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
              title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-hidden">
          {/* Quick Launch Standalone Webshop Button */}
          {onOpenStorefront && (
            <div className="mb-3">
              <button
                onClick={() => {
                  onOpenStorefront();
                  if (setIsMobileOpen) setIsMobileOpen(false);
                }}
                title="Mở giao diện Webshop bán hàng online"
                className={`w-full flex items-center transition rounded-xl bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 hover:border-emerald-400 text-emerald-400 hover:text-emerald-300 py-2.5 ${
                  isCollapsed && !isMobileOpen ? 'justify-center px-1' : 'gap-2.5 px-3'
                } shadow-sm group`}
              >
                <ShoppingBag className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition shrink-0" />
                {(!isCollapsed || isMobileOpen) && (
                  <div className="text-left">
                    <p className="text-xs font-bold leading-tight text-white">Webshop Online</p>
                    <p className="text-[10px] text-emerald-400/80">Trang mua hàng</p>
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Menu Group 1: Dashboard, Webshop, Directories */}
          {group1Items.length > 0 && (
            <div>
              {(!isCollapsed || isMobileOpen) && (
                <p className="text-slate-500 mb-2 px-3 text-[10px] uppercase tracking-widest font-semibold whitespace-nowrap">
                  Bảng điều khiển
                </p>
              )}
              <ul className="space-y-1">
                {group1Items.map((m) => {
                  const Icon = m.icon;
                  const isActive = currentTab === m.id;
                  return (
                    <li key={m.id}>
                      <button
                        id={`sidebar-link-${m.id}`}
                        onClick={() => handleNavClick(m.id)}
                        title={isCollapsed && !isMobileOpen ? m.name : undefined}
                        className={`w-full flex items-center transition-all duration-150 border-l-2 py-2.5 rounded-r-lg ${
                          isCollapsed && !isMobileOpen ? 'justify-center px-1' : 'gap-3 px-3'
                        } ${
                          isActive
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500 font-bold'
                            : 'text-slate-400 border-transparent hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {(!isCollapsed || isMobileOpen) && (
                          <span className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                            {m.name}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Menu Group 2: Transactions & Debt */}
          {group2Items.length > 0 && (
            <div>
              {(!isCollapsed || isMobileOpen) && (
                <p className="text-slate-500 mb-2 px-3 text-[10px] uppercase tracking-widest font-semibold whitespace-nowrap">
                  Giao dịch & Chứng từ
                </p>
              )}
              <ul className="space-y-1">
                {group2Items.map((m) => {
                  const Icon = m.icon;
                  const isActive = currentTab === m.id;
                  return (
                    <li key={m.id}>
                      <button
                        id={`sidebar-link-${m.id}`}
                        onClick={() => handleNavClick(m.id)}
                        title={isCollapsed && !isMobileOpen ? m.name : undefined}
                        className={`w-full flex items-center transition-all duration-150 border-l-2 py-2.5 rounded-r-lg ${
                          isCollapsed && !isMobileOpen ? 'justify-center px-1' : 'gap-3 px-3'
                        } ${
                          isActive
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500 font-bold'
                            : 'text-slate-400 border-transparent hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {(!isCollapsed || isMobileOpen) && (
                          <span className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                            {m.name}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Menu Group 3: Accounting & Reports */}
          {group3Items.length > 0 && (
            <div>
              {(!isCollapsed || isMobileOpen) && (
                <p className="text-slate-500 mb-2 px-3 text-[10px] uppercase tracking-widest font-semibold whitespace-nowrap">
                  Sổ sách & Báo cáo
                </p>
              )}
              <ul className="space-y-1">
                {group3Items.map((m) => {
                  const Icon = m.icon;
                  const isActive = currentTab === m.id;
                  return (
                    <li key={m.id}>
                      <button
                        id={`sidebar-link-${m.id}`}
                        onClick={() => handleNavClick(m.id)}
                        title={isCollapsed && !isMobileOpen ? m.name : undefined}
                        className={`w-full flex items-center transition-all duration-150 border-l-2 py-2.5 rounded-r-lg ${
                          isCollapsed && !isMobileOpen ? 'justify-center px-1' : 'gap-3 px-3'
                        } ${
                          isActive
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500 font-bold'
                            : 'text-slate-400 border-transparent hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {(!isCollapsed || isMobileOpen) && (
                          <span className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                            {m.name}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Menu Group 4: Users & Settings */}
          {group4Items.length > 0 && (
            <div>
              {(!isCollapsed || isMobileOpen) && (
                <p className="text-slate-500 mb-2 px-3 text-[10px] uppercase tracking-widest font-semibold whitespace-nowrap">
                  Hệ thống & Phân quyền
                </p>
              )}
              <ul className="space-y-1">
                {group4Items.map((m) => {
                  const Icon = m.icon;
                  const isActive = currentTab === m.id;
                  return (
                    <li key={m.id}>
                      <button
                        id={`sidebar-link-${m.id}`}
                        onClick={() => handleNavClick(m.id)}
                        title={isCollapsed && !isMobileOpen ? m.name : undefined}
                        className={`w-full flex items-center transition-all duration-150 border-l-2 py-2.5 rounded-r-lg ${
                          isCollapsed && !isMobileOpen ? 'justify-center px-1' : 'gap-3 px-3'
                        } ${
                          isActive
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500 font-bold'
                            : 'text-slate-400 border-transparent hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {(!isCollapsed || isMobileOpen) && (
                          <span className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                            {m.name}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </nav>

      {/* Sidebar Footer: User profile & Logout 
        <div className="p-3 border-t border-white/5 bg-[#0a0c10] flex flex-col gap-2.5 overflow-hidden shrink-0">
          {currentUser && (!isCollapsed || isMobileOpen) && (
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
                  style={{
                    backgroundColor: `${currentRole?.color || '#10b981'}25`,
                    color: currentRole?.color || '#10b981',
                  }}
                >
                  {currentUser.fullName.charAt(0)}
                </div>
                <div className="truncate min-w-0">
                  <p className="text-xs font-bold text-white truncate">{currentUser.fullName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border truncate"
                      style={{
                        backgroundColor: `${currentRole?.color || '#10b981'}15`,
                        color: currentRole?.color || '#10b981',
                        borderColor: `${currentRole?.color || '#10b981'}30`,
                      }}
                    >
                      {roleName}
                    </span>
                  </div>
                </div>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Đăng xuất khỏi hệ thống"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0 ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
       
          {!isCollapsed || isMobileOpen ? (
            <>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] text-slate-400 font-mono">Bảo mật RBAC Active</span>
                </div>
              </div>
        
              <button
                id="sidebar-reset-db-btn"
                onClick={() => {
                  if (confirm('Bạn có chắc muốn đặt lại dữ liệu của ứng dụng về trạng thái ban đầu?')) {
                    onResetDb();
                  }
                }}
                className="w-full py-1 text-center text-[9px] font-bold text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/5 border border-rose-500/10 rounded-lg transition uppercase tracking-wider"
              >
                Đặt lại dữ liệu
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="System online"></div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Đăng xuất"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
        */} 
      </aside>
    </>
  );
}
