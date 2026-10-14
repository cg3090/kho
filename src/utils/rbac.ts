/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Permission, Role, User } from '../types';

export const PERMISSION_MODULES = [
  { id: 'COST_PRICING', name: 'Giá vốn & Mua hàng (Bảo mật)' },
  { id: 'WEBSHOP', name: 'Webshop & Bán hàng Online' },
  { id: 'DIRECTORIES', name: 'Quản lý Danh mục' },
  { id: 'TRANSACTIONS', name: 'Chứng từ & Kho hàng' },
  { id: 'DEBT', name: 'Quản lý Công nợ & Thanh toán' },
  { id: 'ACCOUNTING', name: 'Kế toán & Sổ sách' },
  { id: 'REPORTS', name: 'Báo cáo & Phân tích' },
  { id: 'SYSTEM', name: 'Hệ thống & Phân quyền' },
] as const;

export const ALL_PERMISSIONS: Permission[] = [
  // WEBSHOP
  {
    key: 'VIEW_WEBSHOP',
    name: 'Xem Cửa hàng Webshop & Gian hàng',
    module: 'WEBSHOP',
    description: 'Truy cập giao diện cửa hàng trực tuyến, tra cứu giỏ hàng và danh mục bán lẻ',
  },
  {
    key: 'MANAGE_WEBSHOP_ORDERS',
    name: 'Quản lý đơn hàng & Duyệt xuất kho Webshop',
    module: 'WEBSHOP',
    description: 'Xử lý xác nhận đơn hàng, duyệt xuất kho tự động và cập nhật trạng thái giao hàng',
  },
  {
    key: 'CONFIG_WEBSHOP',
    name: 'Cấu hình gian hàng & Giá bán lẻ Webshop',
    module: 'WEBSHOP',
    description: 'Bật/tắt sản phẩm trên Webshop, điều chỉnh giá bán niêm yết, khuyến mãi và thông tin gian hàng',
  },

  // COST_PRICING - Highly sensitive
  {
    key: 'VIEW_PURCHASE_COST',
    name: 'Xem giá mua, tiền mua vào & giá trị tồn kho',
    module: 'COST_PRICING',
    description: 'Quyền xem đơn giá mua (PN), tổng tiền mua, giá vốn bình quân gia quyền và tổng giá trị tồn kho vốn lưu động (Chỉ Quản trị viên)',
  },
  {
    key: 'EDIT_PRODUCT_COST',
    name: 'Điều chỉnh giá vốn định mức sản phẩm',
    module: 'COST_PRICING',
    description: 'Quyền thiết lập đơn giá vốn ban đầu khi tạo sản phẩm mới hoặc kiểm kê giá trị',
  },

  // DIRECTORIES
  {
    key: 'VIEW_DIRECTORIES',
    name: 'Xem danh mục',
    module: 'DIRECTORIES',
    description: 'Xem danh sách sản phẩm, khách hàng, nhà cung cấp, kho bãi, đơn vị tính',
  },
  {
    key: 'MANAGE_DIRECTORIES',
    name: 'Thêm, sửa, xóa danh mục',
    module: 'DIRECTORIES',
    description: 'Tạo mới, chỉnh sửa thông tin hoặc xóa các bản ghi trong danh mục hàng hóa, đối tác',
  },

  // TRANSACTIONS
  {
    key: 'VIEW_STOCK_IN',
    name: 'Xem danh sách phiếu nhập kho (PN)',
    module: 'TRANSACTIONS',
    description: 'Xem lịch sử các phiếu nhập kho từ nhà cung cấp',
  },
  {
    key: 'CREATE_STOCK_IN',
    name: 'Lập phiếu nhập kho (PN)',
    module: 'TRANSACTIONS',
    description: 'Tạo phiếu nhập hàng về kho (số lượng, hàng hóa)',
  },
  {
    key: 'VIEW_STOCK_OUT',
    name: 'Xem danh sách phiếu xuất kho (PX)',
    module: 'TRANSACTIONS',
    description: 'Xem các phiếu xuất bán hàng và bàn giao sản phẩm',
  },
  {
    key: 'CREATE_STOCK_OUT',
    name: 'Lập phiếu xuất kho (PX)',
    module: 'TRANSACTIONS',
    description: 'Tạo phiếu xuất bán hàng và xuất giao sản phẩm',
  },
  {
    key: 'CONFIRM_TRANSACTIONS',
    name: 'Xác nhận & Đảo hủy chứng từ kho',
    module: 'TRANSACTIONS',
    description: 'Quyền duyệt chính thức phiếu xuất/nhập vào kho hoặc hủy bút toán',
  },
  {
    key: 'VIEW_QUOTATIONS',
    name: 'Xem danh sách báo giá (BG)',
    module: 'TRANSACTIONS',
    description: 'Xem danh sách bảng báo giá gửi khách hàng',
  },
  {
    key: 'CREATE_QUOTATIONS',
    name: 'Lập & duyệt báo giá (BG)',
    module: 'TRANSACTIONS',
    description: 'Tạo bảng chào giá mới và chuyển trạng thái chốt hợp đồng',
  },

  // DEBT
  {
    key: 'VIEW_DEBT',
    name: 'Xem công nợ khách hàng (AR) & nhà cung cấp (AP)',
    module: 'DEBT',
    description: 'Theo dõi sổ theo dõi công nợ, hạn thanh toán và nợ quá hạn',
  },
  {
    key: 'CREATE_PAYMENTS',
    name: 'Lập phiếu thu (PT) & phiếu chi (PC)',
    module: 'DEBT',
    description: 'Ghi nhận thanh toán thu tiền khách hàng hoặc thanh toán nợ cho nhà cung cấp',
  },

  // ACCOUNTING
  {
    key: 'VIEW_ACCOUNTING',
    name: 'Xem Nhật ký chung & Sổ cái tài khoản',
    module: 'ACCOUNTING',
    description: 'Truy cập sổ nhật ký chung, bảng cân đối số phát sinh và định khoản đối ứng kép',
  },
  {
    key: 'VIEW_VAT_LEDGER',
    name: 'Xem Bảng kê thuế VAT đầu vào & đầu ra',
    module: 'ACCOUNTING',
    description: 'Kiểm tra và đối chiếu các hóa đơn thuế GTGT mua vào / bán ra',
  },

  // REPORTS
  {
    key: 'VIEW_REPORTS',
    name: 'Xem Báo cáo quản trị & P&L',
    module: 'REPORTS',
    description: 'Xem báo cáo kết quả hoạt động kinh doanh, tỷ trọng tài sản và doanh số đối tác',
  },

  // SYSTEM
  {
    key: 'MANAGE_USERS',
    name: 'Quản lý người dùng hệ thống',
    module: 'SYSTEM',
    description: 'Tạo tài khoản, phân vai trò và cấp lại mật khẩu người dùng',
  },
  {
    key: 'MANAGE_ROLES',
    name: 'Quản lý vai trò & Ma trận phân quyền (RBAC)',
    module: 'SYSTEM',
    description: 'Tùy chỉnh phân quyền chi tiết cho các vai trò trong doanh nghiệp',
  },
  {
    key: 'MANAGE_SETTINGS',
    name: 'Cấu hình hệ thống & mẫu in',
    module: 'SYSTEM',
    description: 'Thiết lập tham số phần mềm, màu sắc giao diện và biểu mẫu chứng từ',
  },
];

export const DEFAULT_ROLES: Role[] = [
  {
    id: 'ADMIN',
    name: 'Quản trị viên (Admin)',
    description: 'Toàn quyền điều hành cao nhất hệ thống, xem toàn bộ giá mua, giá vốn, doanh thu, lợi nhuận và cấu hình RBAC',
    color: '#10b981', // Emerald
    isSystem: true,
    permissions: ALL_PERMISSIONS.map((p) => p.key),
  },
  {
    id: 'ACCOUNTANT',
    name: 'Kế toán tổng hợp',
    description: 'Quản lý công nợ, sổ sách kế toán, bảng kê thuế VAT, báo cáo tài chính và giá vốn hạch toán',
    color: '#3b82f6', // Blue
    isSystem: true,
    permissions: [
      'VIEW_WEBSHOP',
      'MANAGE_WEBSHOP_ORDERS',
      'VIEW_PURCHASE_COST',
      'VIEW_DIRECTORIES',
      'VIEW_STOCK_IN',
      'VIEW_STOCK_OUT',
      'VIEW_QUOTATIONS',
      'VIEW_DEBT',
      'CREATE_PAYMENTS',
      'VIEW_ACCOUNTING',
      'VIEW_VAT_LEDGER',
      'VIEW_REPORTS',
    ],
  },
  {
    id: 'WAREHOUSE',
    name: 'Thủ kho / Quản lý kho',
    description: 'Chuyên trách xuất - nhập vật lý, theo dõi số lượng tồn kho và thẻ kho. KHÔNG THẤY giá mua, tiền mua và giá trị tiền tồn kho',
    color: '#f59e0b', // Amber
    isSystem: true,
    permissions: [
      'VIEW_WEBSHOP',
      'MANAGE_WEBSHOP_ORDERS',
      'VIEW_DIRECTORIES',
      'MANAGE_DIRECTORIES',
      'VIEW_STOCK_IN',
      'CREATE_STOCK_IN',
      'VIEW_STOCK_OUT',
      'CREATE_STOCK_OUT',
      'CONFIRM_TRANSACTIONS',
      'VIEW_QUOTATIONS',
    ], // NOTE: NO VIEW_PURCHASE_COST
  },
  {
    id: 'SALES',
    name: 'Nhân viên kinh doanh (Sales)',
    description: 'Lập báo giá cho khách hàng, tạo phiếu xuất bán hàng và thu tiền khách. KHÔNG THẤY giá mua hoặc giá vốn nhập vào',
    color: '#ec4899', // Pink
    isSystem: true,
    permissions: [
      'VIEW_WEBSHOP',
      'MANAGE_WEBSHOP_ORDERS',
      'CONFIG_WEBSHOP',
      'VIEW_DIRECTORIES',
      'VIEW_STOCK_OUT',
      'CREATE_STOCK_OUT',
      'VIEW_QUOTATIONS',
      'CREATE_QUOTATIONS',
      'VIEW_DEBT',
    ], // NOTE: NO VIEW_PURCHASE_COST
  },
  {
    id: 'VIEWER',
    name: 'Nhân viên thực tập / Xem',
    description: 'Chỉ có quyền xem thông tin cơ bản danh mục và phiếu xuất. Không được thao tác sửa hay xem giá vốn',
    color: '#8b5cf6', // Purple
    isSystem: false,
    permissions: [
      'VIEW_WEBSHOP',
      'VIEW_DIRECTORIES',
      'VIEW_STOCK_OUT',
    ],
  },
];

export const DEFAULT_USERS: User[] = [
  {
    id: 'u-admin',
    username: 'admin',
    password: '123',
    fullName: 'Quản trị viên hệ thống (Admin)',
    email: 'admin@verp.vn',
    phone: '0901 888 999',
    roleId: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-01-01',
    lastLogin: 'Vừa xong',
  },
];

export function normalizeRoleId(roleId: string | undefined | null): string {
  if (!roleId) return '';
  const r = String(roleId).trim().toLowerCase();
  if (r === 'admin' || r === 'role-admin' || r === 'administrator') return 'ADMIN';
  if (r === 'warehouse' || r === 'role-warehouse' || r === 'thukho') return 'WAREHOUSE';
  if (r === 'accountant' || r === 'role-accountant' || r === 'ketoan') return 'ACCOUNTANT';
  if (r === 'sales' || r === 'role-sales') return 'SALES';
  if (r === 'viewer' || r === 'role-viewer') return 'VIEWER';
  return String(roleId).trim();
}

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user || user.status === 'LOCKED') return false;
  if (normalizeRoleId(user.roleId) === 'ADMIN') return true;
  if (user.id === 'u-admin' || user.username?.trim().toLowerCase() === 'admin') return true;
  return false;
}

/**
 * Checks whether a user possesses a specific permission key.
 * Admin role automatically possesses all permissions.
 */
export function hasPermission(
  user: User | null | undefined,
  permissionKey: string,
  roles: Role[] = DEFAULT_ROLES
): boolean {
  if (!user || user.status === 'LOCKED') return false;
  if (isAdminUser(user)) return true;

  const targetRoleId = normalizeRoleId(user.roleId);
  const safeRoles = Array.isArray(roles) && roles.length > 0 ? roles : DEFAULT_ROLES;
  const role =
    safeRoles.find((r) => normalizeRoleId(r.id) === targetRoleId || r.id === user.roleId) ||
    DEFAULT_ROLES.find((r) => normalizeRoleId(r.id) === targetRoleId);
  if (!role || !Array.isArray(role.permissions)) return false;

  return role.permissions.includes(permissionKey);
}

/**
 * Specifically checks whether the user is allowed to view purchase costs,
 * purchase amounts, and stock valuation (Constraint 3).
 * Returns true strictly if Admin or if granted VIEW_PURCHASE_COST.
 */
export function canViewPurchaseCost(
  user: User | null | undefined,
  roles: Role[] = DEFAULT_ROLES
): boolean {
  if (!user || user.status === 'LOCKED') return false;
  if (isAdminUser(user)) return true;
  return hasPermission(user, 'VIEW_PURCHASE_COST', roles);
}

/**
 * Returns formatted money string or masked string if user is unauthorized.
 */
export function formatOrMaskCost(
  amount: number | undefined | null,
  canView: boolean,
  suffix = 'đ'
): string {
  if (!canView) return '***';
  if (amount === undefined || amount === null) return `0${suffix}`;
  return `${amount.toLocaleString()}${suffix}`;
}

/**
 * Checks whether a user possesses permission to view and access a specific navigation tab.
 * Ensures strict enforcement of RBAC security policy across the warehouse ERP portal.
 */
export function canAccessTab(
  tabId: string,
  user: User | null | undefined,
  roles: Role[] = DEFAULT_ROLES
): boolean {
  if (!user || user.status === 'LOCKED') return false;
  if (isAdminUser(user)) return true;

  const normRole = normalizeRoleId(user.roleId);

  switch (tabId) {
    case 'dashboard':
      return true; // All authenticated staff can access the dashboard (sensitive cost figures are masked)
    case 'webshop':
      // Accessible if role has VIEW_WEBSHOP or is Sales, Warehouse, or Admin
      return (
        normRole === 'SALES' ||
        normRole === 'WAREHOUSE' ||
        hasPermission(user, 'VIEW_WEBSHOP', roles) ||
        hasPermission(user, 'MANAGE_WEBSHOP_ORDERS', roles)
      );
    case 'directories':
      return hasPermission(user, 'VIEW_DIRECTORIES', roles) || normRole === 'WAREHOUSE' || normRole === 'SALES';
    case 'transactions':
      return (
        hasPermission(user, 'VIEW_STOCK_IN', roles) ||
        hasPermission(user, 'VIEW_STOCK_OUT', roles) ||
        hasPermission(user, 'VIEW_INTERNAL_TRANSFERS', roles) ||
        normRole === 'WAREHOUSE' ||
        normRole === 'SALES'
      );
    case 'debt':
      return hasPermission(user, 'VIEW_DEBT', roles) || normRole === 'ACCOUNTANT' || normRole === 'SALES';
    case 'accounting':
      return hasPermission(user, 'VIEW_ACCOUNTING', roles) || normRole === 'ACCOUNTANT';
    case 'vat-ledger':
      return hasPermission(user, 'VIEW_VAT_LEDGER', roles) || normRole === 'ACCOUNTANT';
    case 'reports':
      return hasPermission(user, 'VIEW_REPORTS', roles) || normRole === 'ACCOUNTANT';
    case 'users':
      return hasPermission(user, 'MANAGE_USERS', roles) || hasPermission(user, 'MANAGE_ROLES', roles);
    case 'settings':
      return hasPermission(user, 'MANAGE_SETTINGS', roles);
    default:
      return true;
  }
}

/**
 * Returns the recommended landing tab for a user based on their role and permissions.
 */
export function getDefaultTabForUser(
  user: User | null | undefined,
  roles: Role[] = DEFAULT_ROLES
): string {
  if (!user) return 'dashboard';
  const normRole = normalizeRoleId(user.roleId);
  if (isAdminUser(user) || normRole === 'ADMIN') return 'dashboard';
  if (normRole === 'WAREHOUSE') return 'transactions';
  if (normRole === 'SALES') return 'webshop';
  if (normRole === 'ACCOUNTANT') return 'accounting';

  // Check fallback priority
  const candidates = ['dashboard', 'webshop', 'transactions', 'directories', 'debt', 'accounting', 'reports'];
  for (const tab of candidates) {
    if (canAccessTab(tab, user, roles)) return tab;
  }
  return 'dashboard';
}

