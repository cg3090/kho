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

  const groups = [
    {
      label: 'Bảng Điều Khiển',
      items: [
        { id: 'dashboard', name: 'Tổng quan', icon: LayoutDashboard },
       // { id: 'webshop', name: 'Webshop Bán hàng', icon: ShoppingBag }, 
        { id: 'directories', name: 'Danh mục', icon: FolderTree },
      ],
    },
    {
      label: 'Giao dịch & Chứng từ',
      items: [
        { id: 'transactions', name: 'Chứng từ', icon: ArrowLeftRight },
        { id: 'debt', name: 'Quản lý Công nợ', icon: CreditCard },
      ],
    },
    {
      label: 'Sổ sách & Báo cáo',
      items: [
        { id: 'accounting', name: 'Nhật ký chung', icon: BookOpen },
        { id: 'vat-ledger', name: 'Sổ Thuế VAT', icon: Receipt },
        { id: 'reports', name: 'Báo cáo quản trị', icon: BarChart3 },
      ],
    },
    {
      label: 'Hệ thống & Phân quyền',
      items: [
        { id: 'users', name: 'Quản trị & Phân quyền', icon: ShieldCheck },
        { id: 'settings', name: 'Cấu hình hệ thống', icon: Settings },
      ],
    },
  ]
    .map((g) => ({ ...g, items: g.items.filter((m) => canAccessTab(m.id, currentUser, roles)) }))
    .filter((g) => g.items.length > 0);

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
          fixed inset-y-0 left-0 lg:static lg:h-dvh
          ${isMobileOpen ? 'translate-x-0 w-72 max-w-[85vw] shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        {/* Brand area */}
        <div className="p-4 h-14 sm:h-16 border-b border-white/5 flex items-center justify-between overflow-hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-white" />
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

        {/* Navigation Links - compact layout, no visible scrollbar */}
        <nav className="no-scrollbar flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-3">
          {/* Quick Launch Standalone Webshop Button */}
          {onOpenStorefront && (
            <button
              onClick={() => {
                onOpenStorefront();
                if (setIsMobileOpen) setIsMobileOpen(false);
              }}
              title="Mở giao diện Webshop"
              className={`w-full flex items-center transition rounded-lg bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 hover:border-emerald-400 text-emerald-400 hover:text-emerald-300 py-1.5 ${
                isCollapsed && !isMobileOpen ? 'justify-center px-1' : 'gap-2.5 px-3'
              } shadow-sm group`}
            >
              <ShoppingBag className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition shrink-0" />
              {(!isCollapsed || isMobileOpen) && (
                <span className="text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                  Webshop Online
                </span>
              )}
            </button>
          )}

          {groups.map((group, gi) => (
            <div key={group.label}>
              {(!isCollapsed || isMobileOpen) && (
                <div className="mb-2 flex items-center gap-2 px-3">
                  <p className="text-slate-500 text-[9px] uppercase tracking-[0.18em] font-semibold whitespace-nowrap">
                    {group.label}
                  </p>
                  {gi > 0 && <span className="flex-1 h-px bg-white/[0.07]" />}
                </div>
              )}
              <ul className="space-y-0.5">
                {group.items.map((m) => {
                  const Icon = m.icon;
                  const isActive = currentTab === m.id;
                  return (
                    <li key={m.id}>
                      <button
                        id={`sidebar-link-${m.id}`}
                        onClick={() => handleNavClick(m.id)}
                        title={isCollapsed && !isMobileOpen ? m.name : undefined}
                        className={`w-full cursor-pointer flex items-center transition-all duration-150 border-l-2 py-2 rounded-r-md ${
                          isCollapsed && !isMobileOpen ? 'justify-center px-1' : 'gap-2.5 px-3'
                        } ${
                          isActive
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500 font-bold'
                            : 'text-slate-400 border-transparent hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                        {(!isCollapsed || isMobileOpen) && (
                          <span className="text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap truncate">
                            {m.name}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      
     </aside>
    </>
  );
}
