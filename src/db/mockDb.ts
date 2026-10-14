/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Category,
  Uom,
  Warehouse,
  Supplier,
  Customer,
  Product,
  AccountMapping,
  ChartOfAccount,
  StockTransaction,
  StockTransactionDetail,
  JournalEntry,
  JournalEntryLine,
  Debt,
  Payment,
  VatLedgerEntry,
  Quotation,
  QuotationDetail,
  CompanyInfo,
  SystemConfig,
  SequenceConfig,
  PrintTemplate,
  User,
  Role,
  WebshopOrder,
  WebshopOrderItem,
  WebshopProductConfig,
  WebshopStoreConfig,
  WebshopOrderStatus,
  WebshopPaymentMethod,
  WebshopPaymentStatus,
  WebshopCustomerAccount,
  OpeningStockItemSnapshot,
  FiscalYearClosing,
  InventoryNxtRow,
} from '../types';
import { DEFAULT_ROLES, DEFAULT_USERS, normalizeRoleId } from '../utils/rbac';
import {
  hashPassword,
  isHashedPassword,
  verifyPassword,
  toStoredPassword,
  shortFingerprint,
  validatePassword,
} from '../utils/password';
import { broadcastNewOrder } from '../utils/orderNotifications';
import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { firestore } from './firebaseDb';

// Default Chart of Accounts compliant with Circular 133/200
const DEFAULT_COA: ChartOfAccount[] = [
  { code: '111', name: 'Tiền mặt (Cash)', type: 'ASSET' },
  { code: '112', name: 'Tiền gửi Ngân hàng (Bank Deposit)', type: 'ASSET' },
  { code: '131', name: 'Phải thu của khách hàng (Accounts Receivable)', type: 'ASSET' },
  { code: '1331', name: 'Thuế GTGT được khấu trừ (VAT Input 1331)', type: 'ASSET' },
  { code: '1561', name: 'Giá mua hàng hóa (Inventory 1561)', type: 'ASSET' },
  { code: '331', name: 'Phải trả cho người bán (Accounts Payable)', type: 'LIABILITY' },
  { code: '3331', name: 'Thuế GTGT phải nộp (VAT Output 3331)', type: 'LIABILITY' },
  { code: '411', name: 'Vốn góp của chủ sở hữu (Owner Equity)', type: 'EQUITY' },
  { code: '421', name: 'Lợi nhuận sau thuế chưa phân phối (Retained Earnings)', type: 'EQUITY' },
  { code: '511', name: 'Doanh thu bán hàng và cung cấp dịch vụ (Revenue)', type: 'REVENUE' },
  { code: '632', name: 'Giá vốn hàng bán (Cost of Goods Sold - COGS)', type: 'EXPENSE' },
  { code: '642', name: 'Chi phí quản lý doanh nghiệp (Admin Expense)', type: 'EXPENSE' },
  { code: '911', name: 'Xác định kết quả kinh doanh (P&L Summary)', type: 'OFF_BALANCE' },
];

// Default Account Mappings
const DEFAULT_MAPPING: AccountMapping[] = [
  { key: 'STOCK_IN', accountCode: '1561', description: 'Tài khoản hàng hóa trong kho' },
  { key: 'AR_PAYMENT', accountCode: '131', description: 'Tài khoản phải thu khách hàng' },
  { key: 'AP_PAYMENT', accountCode: '331', description: 'Tài khoản phải trả nhà cung cấp' },
  { key: 'SALE', accountCode: '511', description: 'Tài khoản doanh thu bán hàng' },
  { key: 'COGS', accountCode: '632', description: 'Tài khoản giá vốn hàng bán' },
  { key: 'VAT_INPUT', accountCode: '1331', description: 'Tài khoản thuế GTGT đầu vào được khấu trừ' },
  { key: 'VAT_OUTPUT', accountCode: '3331', description: 'Tài khoản thuế GTGT đầu ra phải nộp' },
  { key: 'CASH', accountCode: '111', description: 'Tài khoản tiền mặt' },
  { key: 'BANK', accountCode: '112', description: 'Tài khoản ngân hàng' },
];

export class MockDatabase {
  categories: Category[] = [];
  uoms: Uom[] = [];
  warehouses: Warehouse[] = [];
  suppliers: Supplier[] = [];
  customers: Customer[] = [];
  products: Product[] = [];
  accountMapping: AccountMapping[] = [];
  coa: ChartOfAccount[] = [];
  stockTransactions: StockTransaction[] = [];
  stockTransactionDetails: StockTransactionDetail[] = [];
  journalEntries: JournalEntry[] = [];
  journalLines: JournalEntryLine[] = [];
  debts: Debt[] = [];
  payments: Payment[] = [];
  vatLedger: VatLedgerEntry[] = [];
  quotations: Quotation[] = [];
  quotationDetails: QuotationDetail[] = [];
  webshopOrders: WebshopOrder[] = [];
  webshopProductConfigs: WebshopProductConfig[] = [];
  webshopCustomerAccounts: WebshopCustomerAccount[] = [];
  fiscalClosings: FiscalYearClosing[] = [];
  webshopStoreConfig: WebshopStoreConfig = {
    storeName: 'V-SMART STORE',
    storeSlogan: 'Hệ thống bán lẻ',
    hotline: '1900 6868 - 0901 888 999',
    email: 'sales@verp.vn',
    address: 'Toà nhà Viettel Tower, 285 Cách Mạng Tháng Tám, Quận 10, TP. Hồ Chí Minh',
    defaultWarehouseId: 'wh-1',
    autoCreateStockOut: true,
    allowOrderWhenOutOfStock: false,
    bankName: 'Techcombank - CN Sài Gòn',
    bankAccount: '19034567891012',
    bankOwner: 'CÔNG TY TNHH V-ERP SMART SOLUTIONS',
    bannerTitle: 'SIÊU HỘI MUA SẮM CÔNG NGHỆ CHÍNH HÃNG 2026',
    bannerSubtitle: 'Đồng bộ kho thực tế 100% - Bảo hành chính hãng - Giao hàng toàn quốc',
    zaloNumber: '0901888999',
    supportHours: '8:00 - 21:30 (Thứ 2 - Chủ Nhật)',
    chatWelcomeMessage: 'Xin chào Quý khách! Smart WMS Store sẵn sàng hỗ trợ kiểm tra tồn kho, tư vấn sản phẩm và giải đáp đơn hàng.',
    enableSupportWidget: true,
  };

  companyInfo: CompanyInfo = {
    name: 'CÔNG TY TNHH V-ERP SMART SOLUTIONS',
    taxCode: '0315894123',
    address: 'Toà nhà Viettel Tower, 285 Cách Mạng Tháng Tám, Quận 10, TP. Hồ Chí Minh',
    bankAccount: '19034567891012',
    bankName: 'Techcombank - CN Sài Gòn',
    logoUrl: ''
  };
  systemConfig: SystemConfig = {
    allowNegativeStock: false,
    defaultVatRate: 10,
    autoApproveQuotation: false,
    themeColor: '#10b981'
  };
  sequenceConfig: SequenceConfig[] = [];
  printTemplates: PrintTemplate[] = [];
  users: User[] = [];
  roles: Role[] = [];
  currentUser: User | null = null;

  // Real database connection tracking
  dataSource: 'postgres' | 'firebase' | 'local' | 'd1' = 'local';
  isRealDatabaseConnected: boolean = false;
  postgresConnectionInfo: {
    connected: boolean;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    error?: string;
  } = { connected: false };

  private uniqBy<T>(arr: T[], key: keyof T): T[] {
    if (!Array.isArray(arr)) return [];
    const seen = new Set();
    return arr.filter((item) => {
      if (!item) return false;
      const k = item[key];
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  private deduplicateCollection(key: keyof MockDatabase, val: any) {
    if (!Array.isArray(val)) {
      (this as any)[key] = val;
      return;
    }
    if (key === 'accountMapping') {
      (this as any)[key] = this.uniqBy(val, 'key');
    } else if (key === 'coa') {
      (this as any)[key] = this.uniqBy(val, 'code');
    } else if (key === 'sequenceConfig') {
      (this as any)[key] = this.uniqBy(val, 'type');
    } else if (key === 'printTemplates') {
      (this as any)[key] = this.uniqBy(val, 'type');
    } else if (key === 'webshopProductConfigs') {
      (this as any)[key] = this.uniqBy(val, 'productId');
    } else {
      (this as any)[key] = this.uniqBy(val, 'id');
    }
  }

  constructor() {
    this.loadFromStorage();
    // Never auto-seed mock business data in constructor; strip any residual mock records
    this.purgeMockRecords();
    this.ensureBaseCatalogs();
  }

  public ensureBaseCatalogs() {
    if (this.categories.length === 0) {
      this.categories = [
        { id: 'cat-1', name: 'Điện thoại & Tablet', description: 'Các dòng điện thoại thông minh, máy tính bảng' },
        { id: 'cat-2', name: 'Máy tính & Laptop', description: 'Máy tính để bàn, laptop văn phòng & gaming' },
        { id: 'cat-3', name: 'Phụ kiện & Thiết bị', description: 'Cáp sạc, tai nghe, pin dự phòng, linh kiện' },
      ];
    }
    if (this.uoms.length === 0) {
      this.uoms = [
        { id: 'uom-1', name: 'Cái' },
        { id: 'uom-2', name: 'Hộp' },
        { id: 'uom-3', name: 'Bộ' },
        { id: 'uom-4', name: 'Kg' },
        { id: 'uom-5', name: 'Thùng' },
      ];
    }
    if (this.warehouses.length === 0) {
      this.warehouses = [
        { id: 'wh-1', name: 'Kho Chính Quận 1', location: 'Toà nhà Viettel Tower, 285 Cách Mạng Tháng Tám, Quận 10, TP. HCM' },
      ];
    }
  }

  /**
   * Purges all hardcoded mock records generated by seedData() so that when connected
   * to a real database (PostgreSQL or Cloud Firestore), only genuine user data exists.
   */
  public purgeMockRecords(): boolean {
    const mockProductIds = new Set(['prod-1', 'prod-2', 'prod-3']);
    const mockProductSkus = new Set(['IPHONE15PRO', 'SAMS24ULTRA', 'MACAIRM3']);
    const mockSupplierIds = new Set(['sup-1', 'sup-2']);
    const mockSupplierTaxCodes = new Set(['0101234567', '0309876543']);
    const mockCustomerIds = new Set(['cus-1', 'cus-2']);
    const mockCustomerTaxCodes = new Set(['0303217456', '0311609355']);
    const mockTxIds = new Set(['tx-init-stock', 'tx-out-init']);
    const mockTxDetailIds = new Set(['txd-1', 'txd-2', 'txd-3', 'txd-out-1', 'txd-out-2']);
    const mockJeIds = new Set([
      'je-init',
      'je-in-init',
      'je-pay-init',
      'je-rev-init',
      'je-cogs-init',
      'je-cus-pay-init',
    ]);
    const mockJlIds = new Set([
      'jl-init-1',
      'jl-init-2',
      'jl-in-1',
      'jl-in-2',
      'jl-in-3',
      'jl-pay-1',
      'jl-pay-2',
      'jl-rev-1',
      'jl-rev-2',
      'jl-rev-3',
      'jl-cogs-1',
      'jl-cogs-2',
      'jl-cus-pay-1',
      'jl-cus-pay-2',
    ]);
    const mockDebtIds = new Set(['debt-init', 'debt-cus-init']);
    const mockPaymentIds = new Set(['pay-init', 'pay-cus-init']);
    const mockVatIds = new Set(['vat-in-init', 'vat-out-init']);
    const mockQuotationIds = new Set(['bg-init-1']);
    const mockQuotationDetailIds = new Set(['bgd-init-1']);
    const mockWebshopOrderIds = new Set(['order-ws-init-1', 'order-ws-init-2']);

    let changed = false;

    const filterTracked = <T>(arr: T[], predicate: (item: T) => boolean): T[] => {
      const next = arr.filter(predicate);
      if (next.length !== arr.length) changed = true;
      return next;
    };

    this.products = filterTracked(
      this.products,
      (p) => !(mockProductIds.has(p.id) && mockProductSkus.has(p.sku))
    );
    this.suppliers = filterTracked(
      this.suppliers,
      (s) => !(mockSupplierIds.has(s.id) && mockSupplierTaxCodes.has(s.taxCode))
    );
    this.customers = filterTracked(
      this.customers,
      (c) => !(mockCustomerIds.has(c.id) && mockCustomerTaxCodes.has(c.taxCode))
    );
    this.stockTransactions = filterTracked(this.stockTransactions, (t) => !mockTxIds.has(t.id));
    this.stockTransactionDetails = filterTracked(
      this.stockTransactionDetails,
      (d) => !mockTxDetailIds.has(d.id) && !mockTxIds.has(d.txId)
    );
    this.journalEntries = filterTracked(this.journalEntries, (j) => !mockJeIds.has(j.id));
    this.journalLines = filterTracked(
      this.journalLines,
      (l) => !mockJlIds.has(l.id) && !mockJeIds.has(l.entryId)
    );
    this.debts = filterTracked(this.debts, (d) => !mockDebtIds.has(d.id) && !mockTxIds.has(d.txId));
    this.payments = filterTracked(this.payments, (p) => !mockPaymentIds.has(p.id));
    this.vatLedger = filterTracked(
      this.vatLedger,
      (v) => !mockVatIds.has(v.id) && !mockTxIds.has(v.txId)
    );
    this.quotations = filterTracked(this.quotations, (q) => !mockQuotationIds.has(q.id));
    this.quotationDetails = filterTracked(
      this.quotationDetails,
      (qd) => !mockQuotationDetailIds.has(qd.id) && !mockQuotationIds.has(qd.quotationId)
    );
    this.webshopOrders = filterTracked(this.webshopOrders, (o) => !mockWebshopOrderIds.has(o.id));

    const validProductIds = new Set(this.products.map((p) => p.id));
    this.webshopProductConfigs = filterTracked(
      this.webshopProductConfigs,
      (cfg) => !mockProductIds.has(cfg.productId) && validProductIds.has(cfg.productId)
    );

    // Preserve user categories, UOMs, and warehouses
    if (this.categories.length === 0 || this.uoms.length === 0 || this.warehouses.length === 0) {
      this.ensureBaseCatalogs();
    }

    // Remove fake demo staff accounts
    const mockStaffUserIds = new Set(['u-thukho', 'u-ketoan', 'u-sales']);
    const mockStaffEmails = new Set(['thukho@verp.vn', 'ketoan@verp.vn', 'sales@verp.vn']);
    this.users = filterTracked(
      this.users,
      (u) => !(mockStaffUserIds.has(u.id) && mockStaffEmails.has(u.email || ''))
    );

    // Normalize role IDs across roles and users so legacy 'role-admin'/'admin' never breaks RBAC
    if (Array.isArray(this.roles)) {
      const seenRoleIds = new Set<string>();
      const normalizedRoles: Role[] = [];
      for (const r of this.roles) {
        if (!r || !r.id) continue;
        const normId = normalizeRoleId(r.id);
        if (normId !== r.id) changed = true;
        if (!seenRoleIds.has(normId)) {
          seenRoleIds.add(normId);
          const defRole = DEFAULT_ROLES.find((dr) => dr.id === normId);
          normalizedRoles.push({
            ...r,
            id: normId,
            permissions:
              Array.isArray(r.permissions) && r.permissions.length > 0
                ? r.permissions
                : defRole?.permissions || [],
          });
        }
      }
      for (const defRole of DEFAULT_ROLES) {
        if (!seenRoleIds.has(defRole.id)) {
          normalizedRoles.push(JSON.parse(JSON.stringify(defRole)));
          changed = true;
        }
      }
      this.roles = normalizedRoles;
    }

    if (Array.isArray(this.users)) {
      for (const u of this.users) {
        if (!u) continue;
        const normRole = normalizeRoleId(u.roleId);
        if (u.id === 'u-admin' || u.username?.toLowerCase() === 'admin') {
          if (u.roleId !== 'ADMIN') {
            u.roleId = 'ADMIN';
            changed = true;
          }
        } else if (normRole && normRole !== u.roleId) {
          u.roleId = normRole;
          changed = true;
        }
      }
      if (this.users.length === 0) {
        this.users = JSON.parse(JSON.stringify(DEFAULT_USERS));
        changed = true;
      }
    }

    if (this.currentUser) {
      if (mockStaffUserIds.has(this.currentUser.id)) {
        this.currentUser = this.users[0] || null;
        changed = true;
      } else {
        const normCurrentRole =
          this.currentUser.id === 'u-admin' || this.currentUser.username?.toLowerCase() === 'admin'
            ? 'ADMIN'
            : normalizeRoleId(this.currentUser.roleId);
        if (normCurrentRole && normCurrentRole !== this.currentUser.roleId) {
          this.currentUser = { ...this.currentUser, roleId: normCurrentRole };
          changed = true;
        }
        const matchedUser = this.users.find(
          (u) =>
            u.id === this.currentUser?.id ||
            u.username?.toLowerCase() === this.currentUser?.username?.toLowerCase()
        );
        if (matchedUser) {
          this.currentUser = { ...matchedUser };
        }
      }
      if (this.currentUser) {
        localStorage.setItem('wms_current_user', JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem('wms_current_user');
      }
    }

    return changed;
  }

  private loadFromStorage() {
    try {
      this.deduplicateCollection('categories', JSON.parse(localStorage.getItem('wms_categories') || '[]'));
      this.deduplicateCollection('uoms', JSON.parse(localStorage.getItem('wms_uoms') || '[]'));
      this.deduplicateCollection('warehouses', JSON.parse(localStorage.getItem('wms_warehouses') || '[]'));
      this.deduplicateCollection('suppliers', JSON.parse(localStorage.getItem('wms_suppliers') || '[]'));
      this.deduplicateCollection('customers', JSON.parse(localStorage.getItem('wms_customers') || '[]'));
      this.deduplicateCollection('products', JSON.parse(localStorage.getItem('wms_products') || '[]'));
      this.deduplicateCollection('accountMapping', JSON.parse(localStorage.getItem('wms_account_mapping') || '[]'));
      this.deduplicateCollection('coa', JSON.parse(localStorage.getItem('wms_coa') || '[]'));
      this.deduplicateCollection('stockTransactions', JSON.parse(localStorage.getItem('wms_stock_transactions') || '[]'));
      this.deduplicateCollection('stockTransactionDetails', JSON.parse(localStorage.getItem('wms_stock_transaction_details') || '[]'));
      this.deduplicateCollection('journalEntries', JSON.parse(localStorage.getItem('wms_journal_entries') || '[]'));
      this.deduplicateCollection('journalLines', JSON.parse(localStorage.getItem('wms_journal_lines') || '[]'));
      this.deduplicateCollection('debts', JSON.parse(localStorage.getItem('wms_debts') || '[]'));
      this.deduplicateCollection('payments', JSON.parse(localStorage.getItem('wms_payments') || '[]'));
      this.deduplicateCollection('vatLedger', JSON.parse(localStorage.getItem('wms_vat_ledger') || '[]'));
      this.deduplicateCollection('quotations', JSON.parse(localStorage.getItem('wms_quotations') || '[]'));
      this.deduplicateCollection('quotationDetails', JSON.parse(localStorage.getItem('wms_quotation_details') || '[]'));
      this.deduplicateCollection('webshopOrders', JSON.parse(localStorage.getItem('wms_webshop_orders') || '[]'));
      this.deduplicateCollection('webshopProductConfigs', JSON.parse(localStorage.getItem('wms_webshop_product_configs') || '[]'));
      this.deduplicateCollection('webshopCustomerAccounts', JSON.parse(localStorage.getItem('wms_webshop_customer_accounts') || '[]'));
      this.deduplicateCollection('fiscalClosings', JSON.parse(localStorage.getItem('wms_fiscal_closings') || '[]'));
      
      const savedStoreConfig = localStorage.getItem('wms_webshop_store_config');
      if (savedStoreConfig) {
        try {
          this.webshopStoreConfig = { ...this.webshopStoreConfig, ...JSON.parse(savedStoreConfig) };
        } catch {
          // Keep defaults
        }
      }
      
      this.companyInfo = JSON.parse(localStorage.getItem('wms_company_info') || 'null') || {
        name: 'CÔNG TY TNHH V-ERP SMART SOLUTIONS',
        taxCode: '0315894123',
        address: 'Toà nhà Viettel Tower, 285 Cách Mạng Tháng Tám, Quận 10, TP. Hồ Chí Minh',
        bankAccount: '19034567891012',
        bankName: 'Techcombank - CN Sài Gòn',
        logoUrl: ''
      };
      this.systemConfig = JSON.parse(localStorage.getItem('wms_system_config') || 'null') || {
        allowNegativeStock: false,
        defaultVatRate: 10,
        autoApproveQuotation: false,
        themeColor: '#10b981'
      };
      this.sequenceConfig = JSON.parse(localStorage.getItem('wms_sequence_config') || '[]');
      this.printTemplates = JSON.parse(localStorage.getItem('wms_print_templates') || '[]');
      this.deduplicateCollection('users', JSON.parse(localStorage.getItem('wms_users') || '[]'));
      this.deduplicateCollection('roles', JSON.parse(localStorage.getItem('wms_roles') || '[]'));
      const savedCurrentUser = localStorage.getItem('wms_current_user');
      if (savedCurrentUser) {
        try {
          this.currentUser = JSON.parse(savedCurrentUser);
        } catch {
          this.currentUser = null;
        }
      }
    } catch (e) {
      console.error('Lỗi khi tải dữ liệu từ LocalStorage, đang dùng dữ liệu trống.', e);
    }

    // Set statutory accounting & system defaults in memory if empty
    if (this.coa.length === 0) {
      this.coa = [...DEFAULT_COA];
    }
    if (this.accountMapping.length === 0) {
      this.accountMapping = [...DEFAULT_MAPPING];
    }
    
    if (this.sequenceConfig.length === 0) {
      this.sequenceConfig = [
        { type: 'PN', prefix: 'PN', digits: 4, currentNumber: 1 },
        { type: 'PX', prefix: 'PX', digits: 4, currentNumber: 1 },
        { type: 'BG', prefix: 'BG', digits: 4, currentNumber: 1 },
        { type: 'PT', prefix: 'PT', digits: 4, currentNumber: 1 },
        { type: 'PC', prefix: 'PC', digits: 4, currentNumber: 1 },
      ];
    }
    
    if (this.printTemplates.length === 0) {
      this.printTemplates = [
        {
          type: 'PN',
          name: 'Mẫu in Phiếu Nhập Kho tiêu chuẩn',
          title: 'PHIẾU NHẬP KHO',
          headerHtml: `<div class="text-center mb-6">
  <h1 class="text-2xl font-bold text-gray-800 tracking-tight">{TEMPLATE_TITLE}</h1>
  <p class="text-xs text-gray-500 font-mono mt-1">Số: {VOUCHER_NO} | Ngày: {VOUCHER_DATE}</p>
</div>`,
          footerHtml: `<div class="mt-8 grid grid-cols-3 gap-4 text-center text-xs text-gray-700">
  <div>
    <p class="font-bold">Người lập phiếu</p>
    <p class="text-gray-400 mt-12">(Ký, họ tên)</p>
  </div>
  <div>
    <p class="font-bold">Thủ kho</p>
    <p class="text-gray-400 mt-12">(Ký, họ tên)</p>
  </div>
  <div>
    <p class="font-bold">Giám đốc</p>
    <p class="text-gray-400 mt-12">(Ký, đóng dấu)</p>
  </div>
</div>`
        },
        {
          type: 'PX',
          name: 'Mẫu in Phiếu Xuất Kho tiêu chuẩn',
          title: 'PHIẾU XUẤT KHO',
          headerHtml: `<div class="text-center mb-6">
  <h1 class="text-2xl font-bold text-gray-800 tracking-tight">{TEMPLATE_TITLE}</h1>
  <p class="text-xs text-gray-500 font-mono mt-1">Số: {VOUCHER_NO} | Ngày: {VOUCHER_DATE}</p>
</div>`,
          footerHtml: `<div class="mt-8 grid grid-cols-3 gap-4 text-center text-xs text-gray-700">
  <div>
    <p class="font-bold">Người nhận hàng</p>
    <p class="text-gray-400 mt-12">(Ký, họ tên)</p>
  </div>
  <div>
    <p class="font-bold">Thủ kho</p>
    <p class="text-gray-400 mt-12">(Ký, họ tên)</p>
  </div>
  <div>
    <p class="font-bold">Người lập phiếu</p>
    <p class="text-gray-400 mt-12">(Ký, họ tên)</p>
  </div>
</div>`
        },
        {
          type: 'BG',
          name: 'Mẫu in Báo Giá tiêu chuẩn',
          title: 'BẢNG BÁO GIÁ HÀNG HÓA',
          headerHtml: `<div class="text-center mb-6">
  <h1 class="text-2xl font-bold text-gray-800 tracking-tight">{TEMPLATE_TITLE}</h1>
  <p class="text-xs text-gray-500 font-mono mt-1">Số báo giá: {VOUCHER_NO} | Ngày: {VOUCHER_DATE}</p>
</div>`,
          footerHtml: `<div class="mt-8 flex justify-between text-xs text-gray-700 px-6">
  <div>
    <p class="italic">Trân trọng cảm ơn Quý khách hàng!</p>
  </div>
  <div class="text-center">
    <p class="font-bold">Đại diện Công ty</p>
    <p class="text-gray-400 mt-12">(Ký, ghi rõ họ tên và đóng dấu)</p>
  </div>
</div>`
        },
        {
          type: 'PT',
          name: 'Mẫu in Phiếu Thu tiêu chuẩn',
          title: 'PHIẾU THU TIỀN',
          headerHtml: `<div class="text-center mb-4">
  <h1 class="text-xl font-bold text-gray-800 tracking-tight">{TEMPLATE_TITLE}</h1>
  <p class="text-xs text-gray-500 font-mono">Số: {VOUCHER_NO} | Ngày: {VOUCHER_DATE}</p>
</div>`,
          footerHtml: `<div class="mt-6 grid grid-cols-4 gap-2 text-center text-[10px] text-gray-700">
  <div>
    <p class="font-bold">Giám đốc</p>
    <p class="text-gray-400 mt-8">(Ký, đóng dấu)</p>
  </div>
  <div>
    <p class="font-bold">Kế toán trưởng</p>
    <p class="text-gray-400 mt-8">(Ký, họ tên)</p>
  </div>
  <div>
    <p class="font-bold">Người nộp tiền</p>
    <p class="text-gray-400 mt-8">(Ký, họ tên)</p>
  </div>
  <div>
    <p class="font-bold">Người lập phiếu</p>
    <p class="text-gray-400 mt-8">(Ký, họ tên)</p>
  </div>
</div>`
        },
        {
          type: 'PC',
          name: 'Mẫu in Phiếu Chi tiêu chuẩn',
          title: 'PHIẾU CHI TIỀN',
          headerHtml: `<div class="text-center mb-4">
  <h1 class="text-xl font-bold text-gray-800 tracking-tight">{TEMPLATE_TITLE}</h1>
  <p class="text-xs text-gray-500 font-mono">Số: {VOUCHER_NO} | Ngày: {VOUCHER_DATE}</p>
</div>`,
          footerHtml: `<div class="mt-6 grid grid-cols-4 gap-2 text-center text-[10px] text-gray-700">
  <div>
    <p class="font-bold">Giám đốc</p>
    <p class="text-gray-400 mt-8">(Ký, đóng dấu)</p>
  </div>
  <div>
    <p class="font-bold">Kế toán trưởng</p>
    <p class="text-gray-400 mt-8">(Ký, họ tên)</p>
  </div>
  <div>
    <p class="font-bold">Người nhận tiền</p>
    <p class="text-gray-400 mt-8">(Ký, họ tên)</p>
  </div>
  <div>
    <p class="font-bold">Người lập phiếu</p>
    <p class="text-gray-400 mt-8">(Ký, họ tên)</p>
  </div>
</div>`
        }
      ];
    }

    if (this.roles.length === 0) {
      this.roles = JSON.parse(JSON.stringify(DEFAULT_ROLES));
    }
    if (this.users.length === 0) {
      this.users = JSON.parse(JSON.stringify(DEFAULT_USERS));
    }

    this.purgeMockRecords();
  }

  save(key: keyof MockDatabase) {
    if (Array.isArray(this[key])) {
      (this as any)[key] = [...(this[key] as any[])];
    }
    const storageKey = `wms_${this.camelToSnake(key)}`;
    localStorage.setItem(storageKey, JSON.stringify(this[key]));
    if (this.dataSource === 'postgres') {
      this.saveToPostgres(key);
    } else {
      this.saveToFirebase(key);
    }
    this.notifyListeners();
  }

  private changeListeners: Set<() => void> = new Set();
  public version: number = 0;

  public subscribe(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  public notifyListeners(): void {
    this.version += 1;
    const arrayKeys: (keyof MockDatabase)[] = [
      'categories',
      'uoms',
      'warehouses',
      'suppliers',
      'customers',
      'products',
      'accountMapping',
      'coa',
      'stockTransactions',
      'stockTransactionDetails',
      'journalEntries',
      'journalLines',
      'debts',
      'payments',
      'vatLedger',
      'quotations',
      'quotationDetails',
      'webshopOrders',
      'webshopProductConfigs',
      'webshopCustomerAccounts',
      'fiscalClosings' as any,
      'sequenceConfig' as any,
      'printTemplates' as any,
      'users' as any,
      'roles' as any,
    ];
    for (const k of arrayKeys) {
      if (Array.isArray(this[k])) {
        (this as any)[k] = [...(this[k] as any[])];
      }
    }
    this.changeListeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.warn('Listener error:', e);
      }
    });
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  private async saveToPostgres(key: keyof MockDatabase) {
    try {
      const val = this[key];
      if (val === undefined || typeof val === 'function') return;
      await fetch(`/api/db/collection/${String(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: val }),
      });
    } catch (e) {
      console.warn(`Lưu PostgreSQL (${String(key)}) thất bại:`, e);
    }
  }

  async saveAllToPostgres() {
    const keys: (keyof MockDatabase)[] = [
      'categories', 'uoms', 'warehouses', 'suppliers', 'customers', 'products',
      'accountMapping', 'coa', 'stockTransactions', 'stockTransactionDetails',
      'journalEntries', 'journalLines', 'debts', 'payments', 'vatLedger',
      'quotations', 'quotationDetails', 'webshopOrders', 'webshopProductConfigs',
      'fiscalClosings' as any,
      'companyInfo' as any, 'systemConfig' as any, 'sequenceConfig' as any,
      'printTemplates' as any, 'users' as any, 'roles' as any, 'webshopStoreConfig' as any
    ];
    const collections: Record<string, any> = {};
    for (const key of keys) {
      const val = this[key];
      if (val === undefined || typeof val === 'function') continue;
      collections[String(key)] = val;
    }
    try {
      await fetch('/api/db/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collections }),
      });
    } catch (e) {
      console.warn('Đồng bộ hàng loạt lên PostgreSQL chưa hoàn tất:', e);
    }
  }

  private clearBusinessCollections() {
    this.categories = [];
    this.uoms = [];
    this.warehouses = [];
    this.suppliers = [];
    this.customers = [];
    this.products = [];
    this.stockTransactions = [];
    this.stockTransactionDetails = [];
    this.journalEntries = [];
    this.journalLines = [];
    this.debts = [];
    this.payments = [];
    this.vatLedger = [];
    this.quotations = [];
    this.quotationDetails = [];
    this.webshopOrders = [];
    this.webshopProductConfigs = [];
    this.fiscalClosings = [];
  }

  private hydrateFromStateMap(state: Record<string, any>) {
    this.clearBusinessCollections();
    for (const [rawKey, val] of Object.entries(state || {})) {
      const key = rawKey as keyof MockDatabase;
      if (val && typeof val === 'object' && 'items' in val && Array.isArray(val.items)) {
        this.deduplicateCollection(key, val.items);
      } else if (val !== undefined && val !== null) {
        this.deduplicateCollection(key, val);
      }
    }
    if (this.coa.length === 0) this.coa = [...DEFAULT_COA];
    if (this.accountMapping.length === 0) this.accountMapping = [...DEFAULT_MAPPING];
    if (this.roles.length === 0) this.roles = JSON.parse(JSON.stringify(DEFAULT_ROLES));
    if (this.users.length === 0) this.users = JSON.parse(JSON.stringify(DEFAULT_USERS));
    this.purgeMockRecords();
  }

  async loadFromPostgres(): Promise<boolean> {
    try {
      const statusRes = await fetch('/api/db/status');
      if (!statusRes.ok) return false;
      const statusJson = await statusRes.json();
      this.postgresConnectionInfo = statusJson;
      if (!statusJson.connected) return false;

      const stateRes = await fetch('/api/db/state');
      if (!stateRes.ok) return false;
      const stateJson = await stateRes.json();
      if (!stateJson.connected && !stateJson.success) return false;

      this.hydrateFromStateMap(stateJson.data || stateJson || {});
      return true;
    } catch {
      return false;
    }
  }

  async connectToPostgres(params: {
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    ssl?: boolean;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/db/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const json = await res.json();
      if (!res.ok || !json.connected) {
        return {
          success: false,
          message: json.error || 'Không thể kết nối tới cơ sở dữ liệu PostgreSQL.',
        };
      }

      this.dataSource = 'postgres';
      this.isRealDatabaseConnected = true;
      this.postgresConnectionInfo = {
        connected: true,
        host: json.host,
        port: json.port,
        database: json.database,
        user: json.user,
      };

      this.hydrateFromStateMap(json.data || {});
      this.purgeMockRecords();
      this.ensureDefaultWebshopConfigs();
      this.saveAllToLocalStorage();
      await this.saveAllToPostgres();
      this.notifyListeners();

      return {
        success: true,
        message: `Đã kết nối thành công tới PostgreSQL (${json.host}:${json.port}/${json.database}) qua Prisma ORM (${json.tableCount || 29} bảng)! Đã đọc toàn bộ dữ liệu hiện có và ngắt Mock Data.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Lỗi kết nối máy chủ PostgreSQL.',
      };
    }
  }

  async introspectPostgresWithPrisma(): Promise<{
    success: boolean;
    message: string;
    cliOutput?: string;
    schemaPrisma?: string;
    tables?: any[];
    totalTables?: number;
    totalRows?: number;
  }> {
    try {
      const res = await fetch('/api/prisma/introspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return {
          success: false,
          message: json.error || json.message || 'Khảo sát ngược (Prisma Introspection) thất bại.',
        };
      }
      if (json.data) {
        this.hydrateFromStateMap(json.data);
        this.purgeMockRecords();
        this.ensureDefaultWebshopConfigs();
        this.saveAllToLocalStorage();
        this.notifyListeners();
      }
      return {
        success: true,
        message: json.message,
        cliOutput: json.cliOutput,
        schemaPrisma: json.schemaPrisma,
        tables: json.tables || [],
        totalTables: json.totalTables || 0,
        totalRows: json.totalRows || 0,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Không thể thực thi khảo sát ngược Prisma.',
      };
    }
  }

  async disconnectPostgres(): Promise<void> {
    try {
      await fetch('/api/db/disconnect', { method: 'POST' });
    } catch {
      // ignore
    }
    this.postgresConnectionInfo = { connected: false };
    this.dataSource = 'local';
    await this.syncWithFirebase();
    this.notifyListeners();
  }

  private async saveToFirebase(key: keyof MockDatabase) {
    try {
      const val = this[key];
      if (val === undefined || val === null || typeof val === 'function') return;
      const ref = doc(firestore, 'erp_collections', key as string);
      if (Array.isArray(val)) {
        await setDoc(ref, { items: val });
      } else if (typeof val === 'object') {
        await setDoc(ref, val as Record<string, any>);
      }
    } catch (e) {
      console.warn(`Lưu Firebase (${key}): Hoạt động ở chế độ Offline/Local`, e);
    }
  }

  async loadFromFirebase(): Promise<{ connected: boolean; hasDocs: boolean }> {
    try {
      // Timeout promise at 4 seconds to prevent 10s hanging when offline or unstable
      const fetchPromise = getDocs(collection(firestore, 'erp_collections'));
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firebase connection timeout')), 4000)
      );

      const querySnapshot = await Promise.race([fetchPromise, timeoutPromise]);
      if (querySnapshot.empty) {
        return { connected: true, hasDocs: false };
      }
      const singletonKeys = new Set(['companyInfo', 'systemConfig', 'webshopStoreConfig']);
      querySnapshot.forEach((docSnap) => {
        const key = docSnap.id as keyof MockDatabase;
        const data = docSnap.data();
        if (data && 'items' in data && Array.isArray(data.items)) {
          this.deduplicateCollection(key, data.items);
        } else if (data && singletonKeys.has(String(key))) {
          (this as any)[key] = { ...(this as any)[key], ...data };
        }
      });
      return { connected: true, hasDocs: true };
    } catch (e) {
      console.warn('Không thể tải từ Firestore (tiếp tục sử dụng dữ liệu cục bộ):', e);
      return { connected: false, hasDocs: false };
    }
  }

  saveAllToLocalStorage() {
    const keys: (keyof MockDatabase)[] = [
      'categories', 'uoms', 'warehouses', 'suppliers', 'customers', 'products',
      'accountMapping', 'coa', 'stockTransactions', 'stockTransactionDetails',
      'journalEntries', 'journalLines', 'debts', 'payments', 'vatLedger',
      'quotations', 'quotationDetails', 'webshopOrders', 'webshopProductConfigs',
      'webshopCustomerAccounts',
      'fiscalClosings' as any,
      'companyInfo' as any, 'systemConfig' as any, 'sequenceConfig' as any,
      'printTemplates' as any, 'users' as any, 'roles' as any, 'webshopStoreConfig' as any
    ];
    for (const key of keys) {
      const storageKey = `wms_${this.camelToSnake(key)}`;
      localStorage.setItem(storageKey, JSON.stringify(this[key]));
    }
    if (this.currentUser) {
      localStorage.setItem('wms_current_user', JSON.stringify(this.currentUser));
    } else {
      localStorage.removeItem('wms_current_user');
    }
  }

  async saveAllToFirebase() {
    const keys: (keyof MockDatabase)[] = [
      'categories', 'uoms', 'warehouses', 'suppliers', 'customers', 'products',
      'accountMapping', 'coa', 'stockTransactions', 'stockTransactionDetails',
      'journalEntries', 'journalLines', 'debts', 'payments', 'vatLedger',
      'quotations', 'quotationDetails', 'webshopOrders', 'webshopProductConfigs',
      'webshopCustomerAccounts',
      'fiscalClosings' as any,
      'companyInfo' as any, 'systemConfig' as any, 'sequenceConfig' as any,
      'printTemplates' as any, 'users' as any, 'roles' as any, 'webshopStoreConfig' as any
    ];
    try {
      const batch = writeBatch(firestore);
      for (const key of keys) {
        const val = this[key];
        if (val === undefined || val === null || typeof val === 'function') continue;
        const ref = doc(firestore, 'erp_collections', key as string);
        if (Array.isArray(val)) {
          batch.set(ref, { items: val });
        } else if (typeof val === 'object') {
          batch.set(ref, val as Record<string, any>);
        }
      }
      const commitPromise = batch.commit();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firebase batch commit timeout')), 5000)
      );
      await Promise.race([commitPromise, timeoutPromise]);
      console.log('Đã đồng bộ thành công toàn bộ dữ liệu lên Firebase.');
    } catch (e) {
      console.warn('Đồng bộ hàng loạt lên Firebase chưa hoàn tất (lưu trữ cục bộ bảo đảm an toàn):', e);
    }
  }

  async loadFromD1(): Promise<boolean> {
    try {
      const statusRes = await fetch('/api/db/status');
      if (!statusRes.ok) return false;
      const statusJson = await statusRes.json();
      if (!statusJson.connected) return false;

      const stateRes = await fetch('/api/db/state');
      if (!stateRes.ok) return false;
      const stateJson = await stateRes.json();
      if (!stateJson.connected && !stateJson.success) return false;

      this.hydrateFromStateMap(stateJson.data || stateJson || {});
      return true;
    } catch {
      return false;
    }
  }

  async syncWithFirebase(onStatusChange?: (status: 'loading' | 'synced' | 'error') => void): Promise<void> {
    if (onStatusChange) onStatusChange('loading');
    try {
      // 0. Detect Cloudflare Workers + D1 environment (auto-detect)
      const d1Connected = await this.loadFromD1();
      if (d1Connected) {
        this.dataSource = 'd1';
        this.isRealDatabaseConnected = true;
        const hadMock = this.purgeMockRecords();
        this.ensureDefaultWebshopConfigs();
        this.saveAllToLocalStorage();
        if (hadMock) {
          await this.saveAllToD1();
        }
        if (onStatusChange) onStatusChange('synced');
        return;
      }

      // 1. Prioritize Real PostgreSQL Connection if configured
      const pgConnected = await this.loadFromPostgres();
      if (pgConnected) {
        this.dataSource = 'postgres';
        this.isRealDatabaseConnected = true;
        const hadMock = this.purgeMockRecords();
        this.ensureDefaultWebshopConfigs();
        this.saveAllToLocalStorage();
        if (hadMock) {
          await this.saveAllToPostgres();
        }
        if (onStatusChange) onStatusChange('synced');
        return;
      }

      // 2. Connect to Real Cloud Firestore Database
      const fbResult = await this.loadFromFirebase();
      if (fbResult.connected) {
        this.dataSource = 'firebase';
        this.isRealDatabaseConnected = true;
        // CRITICAL: When connected to real database, purge all mock records and NEVER run seedData()
        const hadMock = this.purgeMockRecords();
        this.ensureDefaultWebshopConfigs();
        this.saveAllToLocalStorage();
        if (hadMock || !fbResult.hasDocs) {
          await this.saveAllToFirebase();
        }
        if (onStatusChange) onStatusChange('synced');
        return;
      }

      // 3. Offline Local Fallback (still purge mock records so no fake data pollutes real work)
      this.dataSource = 'local';
      this.isRealDatabaseConnected = false;
      this.purgeMockRecords();
      this.saveAllToLocalStorage();
      if (onStatusChange) onStatusChange('synced');
    } catch (err) {
      console.warn('Lỗi trong quá trình đồng bộ Database:', err);
      if (onStatusChange) onStatusChange('synced');
    }
  }

  saveAll() {
    this.saveAllToLocalStorage();
    if (this.dataSource === 'postgres') {
      this.saveAllToPostgres();
    } else if (this.dataSource === 'd1') {
      this.saveAllToD1();
    } else {
      this.saveAllToFirebase();
    }
    this.notifyListeners();
  }

  async saveAllToD1() {
    const tableMap: Record<string, string> = {
      company_info: 'companyInfo',
      system_config: 'systemConfig',
      categories: 'categories',
      uoms: 'uoms',
      warehouses: 'warehouses',
      suppliers: 'suppliers',
      customers: 'customers',
      products: 'products',
      stock_transactions: 'stockTransactions',
      stock_transaction_details: 'stockTransactionDetails',
      chart_of_accounts: 'coa',
      account_mappings: 'accountMapping',
      quotations: 'quotations',
      quotation_details: 'quotationDetails',
      journal_entries: 'journalEntries',
      journal_entry_lines: 'journalLines',
      debts: 'debts',
      payments: 'payments',
      vat_ledger: 'vatLedger',
      fiscal_closings: 'fiscalClosings',
      webshop_store_config: 'webshopStoreConfig',
      webshop_product_configs: 'webshopProductConfigs',
      webshop_orders: 'webshopOrders',
      webshop_customer_accounts: 'webshopCustomerAccounts',
      sequence_configs: 'sequenceConfig',
      print_templates: 'printTemplates',
      roles: 'roles',
      users: 'users',
    };

    const errors: string[] = [];

    for (const [tableName, mockKey] of Object.entries(tableMap)) {
      const val = (this as any)[mockKey];
      if (val === undefined || typeof val === 'function') continue;
      
      try {
        const data = Array.isArray(val) ? val : [val];
        await fetch(`/api/db/table/${tableName}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } catch (e: any) {
        errors.push(`${tableName}: ${e.message}`);
      }
    }
    
    if (errors.length > 0) {
      console.warn('Đồng bộ D1 một số bảng thất bại:', errors);
    } else {
      console.log('Đồng bộ D1 thành công tất cả bảng');
    }
  }

  login(username: string, password?: string): { success: boolean; user?: User; message?: string } {
    const user = this.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (!user) {
      return { success: false, message: 'Tên đăng nhập không tồn tại trong hệ thống.' };
    }
    if (user.status === 'LOCKED') {
      return { success: false, message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.' };
    }
    if (password !== undefined && password !== '' && user.password) {
      if (!verifyPassword(password, user.password)) {
        return { success: false, message: 'Mật khẩu không chính xác.' };
      }
    }
    user.lastLogin = 'Vừa xong';
    this.currentUser = user;
    this.save('users' as any);
    localStorage.setItem('wms_current_user', JSON.stringify(user));
    return { success: true, user };
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('wms_current_user');
  }

  setCurrentUser(user: User | null) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem('wms_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('wms_current_user');
    }
  }

  updateUser(id: string, updates: Partial<User>): User | null {
    const idx = this.users.findIndex(
      (u) => u.id === id || u.username?.toLowerCase() === id.toLowerCase()
    );
    if (idx === -1) return null;

    const merged = { ...this.users[idx], ...updates };
    if (updates.password) {
      merged.password = toStoredPassword(updates.password);
    }
    this.users[idx] = merged;

    if (
      this.currentUser &&
      (this.currentUser.id === id ||
        this.currentUser.username?.toLowerCase() === id.toLowerCase())
    ) {
      this.currentUser = { ...merged };
      localStorage.setItem('wms_current_user', JSON.stringify(this.currentUser));
    }

    this.save('users' as any);
    this.notifyListeners();
    return merged;
  }

  resetDatabase() {
    localStorage.clear();
    this.clearBusinessCollections();
    this.accountMapping = [...DEFAULT_MAPPING];
    this.coa = [...DEFAULT_COA];
    this.users = JSON.parse(JSON.stringify(DEFAULT_USERS));
    this.roles = JSON.parse(JSON.stringify(DEFAULT_ROLES));
    this.currentUser = this.users[0];
    
    this.companyInfo = {
      name: 'CÔNG TY TNHH V-ERP SMART SOLUTIONS',
      taxCode: '0315894123',
      address: 'Toà nhà Viettel Tower, 285 Cách Mạng Tháng Tám, Quận 10, TP. Hồ Chí Minh',
      bankAccount: '19034567891012',
      bankName: 'Techcombank - CN Sài Gòn',
      logoUrl: ''
    };
    this.systemConfig = {
      allowNegativeStock: false,
      defaultVatRate: 10,
      autoApproveQuotation: false,
      themeColor: '#10b981'
    };
    this.sequenceConfig = [
      { type: 'PN', prefix: 'PN', digits: 4, currentNumber: 1 },
      { type: 'PX', prefix: 'PX', digits: 4, currentNumber: 1 },
      { type: 'BG', prefix: 'BG', digits: 4, currentNumber: 1 },
      { type: 'PT', prefix: 'PT', digits: 4, currentNumber: 1 },
      { type: 'PC', prefix: 'PC', digits: 4, currentNumber: 1 },
    ];
    this.printTemplates = [];
    // Never seed mock business data when resetting; keep clean empty state for real data
    this.saveAll();
  }

  // --- WEBSHOP & SMART INVENTORY METHODS ---

  ensureDefaultWebshopConfigs() {
    let hasChanges = false;
    for (const prod of this.products) {
      const config = this.webshopProductConfigs.find((c) => c.productId === prod.id);
      if (!config) {
        const cost = prod.averageCost || 0;
        const retail = cost > 0 ? Math.round((cost * 1.2) / 1000) * 1000 : 0;
        this.webshopProductConfigs.push({
          productId: prod.id,
          isPublished: true,
          retailPrice: retail,
          isFeatured: false,
          shortDescription: prod.description || '',
        });
        hasChanges = true;
      }
    }
    if (hasChanges) {
      this.save('webshopProductConfigs' as any);
    }
  }

  getCurrentWebshopCustomer(): WebshopCustomerAccount | null {
    try {
      const id = localStorage.getItem('wms_shop_customer_session');
      if (!id) return null;
      const acc = this.webshopCustomerAccounts.find((a) => a.id === id);
      if (!acc) return null;
      return { ...acc, password: '' };
    } catch {
      return null;
    }
  }

  setCurrentWebshopCustomer(account: WebshopCustomerAccount | null) {
    try {
      if (account) {
        localStorage.setItem('wms_shop_customer_session', account.id);
      } else {
        localStorage.removeItem('wms_shop_customer_session');
      }
    } catch {
      // Session storage unavailable
    }
  }

  registerWebshopCustomer(input: {
    username: string;
    email: string;
    phone: string;
    fullName: string;
    address?: string;
    password: string;
  }): { success: boolean; account?: WebshopCustomerAccount; message: string } {
    const username = input.username.trim();
    const email = input.email.trim().toLowerCase();
    const phone = input.phone.trim();
    const fullName = input.fullName.trim();

    if (!username || !email || !phone || !fullName) {
      return { success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc (*).' };
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return { success: false, message: 'Định dạng email không hợp lệ.' };
    }
    if (!/^[0-9\s+\-().]{7,15}$/.test(phone)) {
      return { success: false, message: 'Số điện thoại không hợp lệ.' };
    }
    const pwCheck = validatePassword(input.password);
    if (!pwCheck.valid) {
      return { success: false, message: pwCheck.message || 'Mật khẩu không hợp lệ.' };
    }

    if (this.webshopCustomerAccounts.some((a) => a.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, message: 'Tên đăng nhập đã được sử dụng. Vui lòng chọn tên khác.' };
    }
    if (this.webshopCustomerAccounts.some((a) => a.email === email)) {
      return { success: false, message: 'Email đã được đăng ký. Vui lòng dùng email khác hoặc đăng nhập.' };
    }
    if (this.webshopCustomerAccounts.some((a) => a.phone === phone)) {
      return { success: false, message: 'Số điện thoại đã được đăng ký. Vui lòng đăng nhập.' };
    }

    let customer = this.customers.find((c) => c.phone?.trim() === phone);
    if (!customer) {
      customer = {
        id: `cus-ws-${Date.now()}`,
        name: fullName,
        phone,
        address: input.address?.trim() || '',
        taxCode: '',
      };
      this.customers.push(customer);
      this.save('customers');
    } else if (!customer.address && input.address?.trim()) {
      customer.address = input.address.trim();
      this.save('customers');
    }

    const account: WebshopCustomerAccount = {
      id: `ws-acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      username,
      email,
      phone,
      fullName,
      address: input.address?.trim() || '',
      password: toStoredPassword(input.password),
      createdAt: new Date().toISOString(),
      wishlist: [],
      customerId: customer.id,
    };
    this.webshopCustomerAccounts.push(account);
    this.save('webshopCustomerAccounts');
    this.setCurrentWebshopCustomer(account);
    return {
      success: true,
      account: { ...account, password: '' },
      message: `Đăng ký thành công! Chào mừng ${fullName} đến với ${this.webshopStoreConfig.storeName}.`,
    };
  }

  loginWebshopCustomer(loginKey: string, password: string): { success: boolean; account?: WebshopCustomerAccount; message: string } {
    const key = loginKey.trim().toLowerCase();
    if (!key || !password) {
      return { success: false, message: 'Vui lòng nhập tài khoản và mật khẩu.' };
    }
    const account = this.webshopCustomerAccounts.find(
      (a) =>
        a.username.toLowerCase() === key ||
        a.email.toLowerCase() === key ||
        a.phone === loginKey.trim()
    );
    if (!account) {
      return { success: false, message: 'Tài khoản không tồn tại. Vui lòng đăng ký tài khoản mới.' };
    }
    if (!verifyPassword(password, account.password)) {
      return { success: false, message: 'Mật khẩu không chính xác. Vui lòng thử lại.' };
    }
    account.lastLogin = new Date().toISOString();
    this.save('webshopCustomerAccounts');
    this.setCurrentWebshopCustomer(account);
    return {
      success: true,
      account: { ...account, password: '' },
      message: `Đăng nhập thành công! Chào mừng ${account.fullName}.`,
    };
  }

  logoutWebshopCustomer() {
    this.setCurrentWebshopCustomer(null);
  }

  updateWebshopCustomerProfile(
    accountId: string,
    updates: { fullName?: string; email?: string; phone?: string; address?: string; password?: string }
  ): { success: boolean; account?: WebshopCustomerAccount; message: string } {
    const idx = this.webshopCustomerAccounts.findIndex((a) => a.id === accountId);
    if (idx < 0) return { success: false, message: 'Không tìm thấy tài khoản khách hàng.' };
    const acc = this.webshopCustomerAccounts[idx];
    const next: WebshopCustomerAccount = { ...acc };

    if (updates.fullName !== undefined) {
      next.fullName = updates.fullName.trim();
      if (!next.fullName) return { success: false, message: 'Họ và tên không được để trống.' };
    }
    if (updates.email !== undefined) {
      const email = updates.email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return { success: false, message: 'Định dạng email không hợp lệ.' };
      }
      if (email !== acc.email && this.webshopCustomerAccounts.some((a) => a.id !== accountId && a.email === email)) {
        return { success: false, message: 'Email đã được tài khoản khác sử dụng.' };
      }
      next.email = email;
    }
    if (updates.phone !== undefined) {
      const phone = updates.phone.trim();
      if (!/^[0-9\s+\-().]{7,15}$/.test(phone)) {
        return { success: false, message: 'Số điện thoại không hợp lệ.' };
      }
      if (phone !== acc.phone && this.webshopCustomerAccounts.some((a) => a.id !== accountId && a.phone === phone)) {
        return { success: false, message: 'Số điện thoại đã được tài khoản khác sử dụng.' };
      }
      next.phone = phone;
    }
    if (updates.address !== undefined) {
      next.address = updates.address.trim();
    }
    if (updates.password) {
      const pwCheck = validatePassword(updates.password);
      if (!pwCheck.valid) {
        return { success: false, message: pwCheck.message || 'Mật khẩu không hợp lệ.' };
      }
      next.password = toStoredPassword(updates.password);
    }

    this.webshopCustomerAccounts[idx] = next;
    if (next.customerId) {
      const cus = this.customers.find((c) => c.id === next.customerId);
      if (cus) {
        cus.name = next.fullName;
        cus.phone = next.phone;
        if (next.address) cus.address = next.address;
        this.save('customers');
      }
    }
    this.save('webshopCustomerAccounts');
    this.setCurrentWebshopCustomer(next);
    return { success: true, account: { ...next, password: '' }, message: 'Cập nhật thông tin tài khoản thành công!' };
  }

  toggleWishlistProduct(productId: string): { success: boolean; liked: boolean; message: string } {
    const acc = this.getCurrentWebshopCustomer();
    if (!acc) {
      return { success: false, liked: false, message: 'Vui lòng đăng nhập để lưu sản phẩm yêu thích.' };
    }
    const idx = this.webshopCustomerAccounts.findIndex((a) => a.id === acc.id);
    if (idx < 0) return { success: false, liked: false, message: 'Không tìm thấy tài khoản khách hàng.' };
    const list = [...(this.webshopCustomerAccounts[idx].wishlist || [])];
    const pos = list.indexOf(productId);
    let liked = false;
    if (pos >= 0) {
      list.splice(pos, 1);
    } else {
      list.push(productId);
      liked = true;
    }
    this.webshopCustomerAccounts[idx].wishlist = list;
    this.save('webshopCustomerAccounts');
    return {
      success: true,
      liked,
      message: liked ? 'Đã thêm vào Sản phẩm yêu thích.' : 'Đã xóa khỏi Sản phẩm yêu thích.',
    };
  }

  deleteWebshopCustomer(accountId: string): { success: boolean; message: string } {
    const idx = this.webshopCustomerAccounts.findIndex((a) => a.id === accountId);
    if (idx < 0) return { success: false, message: 'Không tìm thấy tài khoản khách hàng.' };
    const acc = this.webshopCustomerAccounts[idx];
    for (const o of this.webshopOrders) {
      if (o.accountId === accountId) o.accountId = undefined;
    }
    this.webshopCustomerAccounts.splice(idx, 1);
    try {
      if (localStorage.getItem('wms_shop_customer_session') === accountId) {
        localStorage.removeItem('wms_shop_customer_session');
      }
    } catch {
      // Session storage unavailable
    }
    this.save('webshopCustomerAccounts');
    this.save('webshopOrders');
    return { success: true, message: `Đã xóa tài khoản "${acc.username}". Lịch sử đơn hàng vẫn được giữ lại.` };
  }

  resetWebshopCustomerPassword(accountId: string, newPassword: string): { success: boolean; message: string } {
    const acc = this.webshopCustomerAccounts.find((a) => a.id === accountId);
    if (!acc) return { success: false, message: 'Không tìm thấy tài khoản khách hàng.' };
    const check = validatePassword(newPassword);
    if (!check.valid) return { success: false, message: check.message || 'Mật khẩu không hợp lệ.' };
    acc.password = toStoredPassword(newPassword);
    this.save('webshopCustomerAccounts');
    return { success: true, message: `Đặt lại mật khẩu cho "${acc.username}" thành công.` };
  }

  createWebshopOrder(input: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    customerAddress: string;
    warehouseId?: string;
    shippingMethod?: 'STANDARD' | 'EXPRESS' | 'STORE_PICKUP';
    paymentMethod: WebshopPaymentMethod;
    paymentStatus?: WebshopPaymentStatus;
    accountId?: string;
    items: {
      productId: string;
      qty: number;
      unitPrice: number;
    }[];
    notes?: string;
  }): { success: boolean; order?: WebshopOrder; message: string } {
    if (!input.items || input.items.length === 0) {
      return { success: false, message: 'Giỏ hàng đang trống! Vui lòng chọn ít nhất 1 sản phẩm.' };
    }
    if (!input.customerName.trim() || !input.customerPhone.trim() || !input.customerAddress.trim()) {
      return { success: false, message: 'Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng.' };
    }

    const warehouseId = input.warehouseId || this.webshopStoreConfig.defaultWarehouseId || this.warehouses[0]?.id || 'wh-1';

    // Verify stock availability if allowOrderWhenOutOfStock is false
    if (!this.webshopStoreConfig.allowOrderWhenOutOfStock && !this.systemConfig.allowNegativeStock) {
      for (const item of input.items) {
        const prod = this.products.find((p) => p.id === item.productId);
        if (!prod) {
          return { success: false, message: `Sản phẩm mã ${item.productId} không tồn tại trong hệ thống!` };
        }
        if (prod.currentQty < item.qty) {
          return {
            success: false,
            message: `Sản phẩm "${prod.name}" chỉ còn ${prod.currentQty} trong kho, không đủ số lượng ${item.qty} để đặt hàng!`,
          };
        }
      }
    }

    // Auto-create or link customer
    let customer = this.customers.find(
      (c) => c.phone?.trim() === input.customerPhone.trim() || c.name.toLowerCase() === input.customerName.toLowerCase().trim()
    );
    if (!customer) {
      const newCusId = `cus-ws-${Date.now()}`;
      customer = {
        id: newCusId,
        name: input.customerName.trim(),
        phone: input.customerPhone.trim(),
        address: input.customerAddress.trim(),
        taxCode: '',
      };
      this.customers.push(customer);
      this.save('customers');
    }

    // Link logged-in customer account with the order and keep profile synced
    let linkedCustomerId = customer.id;
    if (input.accountId) {
      const acc = this.webshopCustomerAccounts.find((a) => a.id === input.accountId);
      if (acc) {
        if (!acc.customerId) {
          acc.customerId = customer.id;
          this.save('webshopCustomerAccounts' as any);
        } else {
          linkedCustomerId = acc.customerId;
        }
        if (!acc.address && input.customerAddress?.trim()) {
          acc.address = input.customerAddress.trim();
          this.save('webshopCustomerAccounts' as any);
        }
      }
    }

    // Generate Order Code: WS-YYMMDD-XXX
    const now = new Date();
    const yy = String(now.getFullYear()).substring(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${mm}-${dd}`;
    const prefix = `WS-${yy}${mm}${dd}`;
    const countToday = this.webshopOrders.filter((o) => o.orderCode?.startsWith(prefix)).length + 1;
    const orderCode = `${prefix}-${String(countToday).padStart(3, '0')}`;

    // Build order items
    const orderItems: WebshopOrderItem[] = [];
    let subtotal = 0;
    for (const item of input.items) {
      const prod = this.products.find((p) => p.id === item.productId);
      if (!prod) continue;
      const uom = this.uoms.find((u) => u.id === prod.uomId);
      const lineTotal = item.qty * item.unitPrice;
      subtotal += lineTotal;
      orderItems.push({
        id: `wsi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: prod.id,
        productSku: prod.sku,
        productName: prod.name,
        qty: item.qty,
        uomId: prod.uomId,
        uomName: uom?.name || 'Cái',
        unitPrice: item.unitPrice,
        totalPrice: lineTotal,
      });
    }

    const shippingFee = input.shippingMethod === 'EXPRESS' ? 45000 : input.shippingMethod === 'STORE_PICKUP' ? 0 : 30000;
    const vatRate = this.systemConfig.defaultVatRate || 10;
    const vatAmount = Math.round(subtotal * (vatRate / 100));
    const totalAmount = subtotal + vatAmount + shippingFee;

    const orderId = `order-ws-${Date.now()}`;
    const newOrder: WebshopOrder = {
      id: orderId,
      orderCode,
      date: dateStr,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      customerEmail: input.customerEmail?.trim(),
      customerAddress: input.customerAddress.trim(),
      customerId: linkedCustomerId,
      accountId: input.accountId,
      shippingMethod: input.shippingMethod || 'STANDARD',
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentStatus || (input.paymentMethod === 'BANK_TRANSFER' ? 'PAID' : 'UNPAID'),
      orderStatus: 'PENDING',
      warehouseId,
      items: orderItems,
      subtotal,
      discountAmount: 0,
      shippingFee,
      vatRate,
      vatAmount,
      totalAmount,
      notes: input.notes?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    this.webshopOrders.unshift(newOrder);
    this.save('webshopOrders' as any);

    try {
      broadcastNewOrder(newOrder);
    } catch (e) {
      console.error('Lỗi phát tín hiệu đơn hàng mới:', e);
    }

    return {
      success: true,
      order: newOrder,
      message: `Tạo đơn hàng ${orderCode} thành công!`,
    };
  }

  fulfillWebshopOrder(orderId: string, customWarehouseId?: string): { success: boolean; message: string; stockTxId?: string } {
    const order = this.webshopOrders.find((o) => o.id === orderId);
    if (!order) return { success: false, message: 'Không tìm thấy đơn hàng Webshop!' };
    if (order.orderStatus === 'CANCELLED') return { success: false, message: 'Đơn hàng này đã bị hủy, không thể xuất kho!' };
    if (order.stockTxId) {
      const existingTx = this.stockTransactions.find((t) => t.id === order.stockTxId);
      if (existingTx && existingTx.isConfirmed && !existingTx.isReversed) {
        return { success: false, message: `Đơn hàng đã được liên kết với phiếu xuất kho ${existingTx.referenceNo} trước đó!` };
      }
    }

    const warehouseId = customWarehouseId || order.warehouseId || this.warehouses[0]?.id || 'wh-1';

    // 1. Check stock availability for all items in order
    if (!this.systemConfig.allowNegativeStock) {
      for (const item of order.items) {
        const prod = this.products.find((p) => p.id === item.productId);
        if (!prod) return { success: false, message: `Sản phẩm ${item.productName} không còn trong hệ thống!` };
        if (prod.currentQty < item.qty) {
          return {
            success: false,
            message: `Không đủ tồn kho để xuất đơn! Sản phẩm "${prod.name}" chỉ còn ${prod.currentQty}, cần xuất ${item.qty}.`,
          };
        }
      }
    }

    // 2. Prepare StockTransaction of type OUT
    const txId = `tx-ws-out-${Date.now()}`;
    const now = new Date();
    const dateStr = order.date || now.toISOString().split('T')[0];

    // Generate Voucher reference using sequence config for PX
    const yy = String(now.getFullYear()).substring(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const seqConf = this.sequenceConfig.find((s) => s.type === 'PX');
    const prefix = seqConf?.prefix || 'PX';
    const digits = seqConf?.digits || 4;
    const currentNum = seqConf?.currentNumber || 1;
    const referenceNo = `${prefix}-${yy}${mm}${dd}-WS${String(currentNum).padStart(digits - 1, '0')}`;
    if (seqConf) {
      seqConf.currentNumber = currentNum + 1;
      this.save('sequenceConfig' as any);
    }

    const stockTx: StockTransaction = {
      id: txId,
      type: 'OUT',
      date: dateStr,
      warehouseId,
      customerId: order.customerId,
      referenceNo,
      vatRate: order.vatRate,
      vatType: 'ITEMIZED',
      subtotal: order.subtotal,
      vatAmount: order.vatAmount,
      totalAmount: order.totalAmount,
      isConfirmed: false,
      isReversed: false,
      notes: `Xuất kho đơn hàng Webshop [${order.orderCode}] - KH: ${order.customerName} - ĐT: ${order.customerPhone}`,
      prepaidAmount: order.paymentStatus === 'PAID' ? order.totalAmount : 0,
      prepaidMethod: order.paymentMethod === 'BANK_TRANSFER' ? 'BANK' : 'CASH',
    };

    const txDetails: StockTransactionDetail[] = order.items.map((item, idx) => {
      const itemVat = Math.round(item.totalPrice * ((order.vatRate || 10) / 100));
      return {
        id: `txd-ws-${txId}-${idx + 1}`,
        txId,
        productId: item.productId,
        qty: item.qty,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        vatRate: order.vatRate || 10,
        vatAmount: itemVat,
      };
    });

    // 3. Register transaction into db
    this.stockTransactions.push(stockTx);
    this.stockTransactionDetails.push(...txDetails);

    // 4. Call confirmStockOut to execute continuous weighted average deduction, double-entry accounting, debt & VAT!
    const confirmResult = this.confirmStockOut(txId);
    if (!confirmResult.success) {
      // Rollback newly inserted draft transaction
      this.stockTransactions = this.stockTransactions.filter((t) => t.id !== txId);
      this.stockTransactionDetails = this.stockTransactionDetails.filter((d) => d.txId !== txId);
      return { success: false, message: `Thất bại khi duyệt xuất kho: ${confirmResult.message}` };
    }

    // 5. Link stockTxId and advance order status to SHIPPED
    order.stockTxId = txId;
    order.orderStatus = 'SHIPPED';
    order.warehouseId = warehouseId;
    order.updatedAt = new Date().toISOString();
    this.save('webshopOrders' as any);

    return {
      success: true,
      message: `Đã duyệt đơn và xuất kho thành công với phiếu ${referenceNo}! Tồn kho và sổ sách kế toán đã được cập nhật tự động.`,
      stockTxId: txId,
    };
  }

  cancelWebshopOrder(orderId: string, reason?: string): { success: boolean; message: string } {
    const order = this.webshopOrders.find((o) => o.id === orderId);
    if (!order) return { success: false, message: 'Không tìm thấy đơn hàng!' };
    if (order.orderStatus === 'CANCELLED') return { success: false, message: 'Đơn hàng này đã được hủy trước đó.' };

    // If order was already fulfilled with a stock transaction, reverse it
    if (order.stockTxId) {
      const revRes = this.reverseTransaction(order.stockTxId);
      if (!revRes.success) {
        return { success: false, message: `Không thể hoàn kho tự động: ${revRes.message}` };
      }
    }

    order.orderStatus = 'CANCELLED';
    order.notes = (order.notes ? order.notes + ' | ' : '') + `Đã hủy: ${reason || 'Khách hủy đơn'}`;
    order.updatedAt = new Date().toISOString();
    this.save('webshopOrders' as any);

    return {
      success: true,
      message: order.stockTxId
        ? 'Đã hủy đơn hàng và tự động hoàn trả số lượng vào kho, đồng thời đảo bút toán kế toán & công nợ!'
        : 'Đã hủy đơn hàng thành công!',
    };
  }

  completeWebshopOrder(orderId: string): { success: boolean; message: string } {
    const order = this.webshopOrders.find((o) => o.id === orderId);
    if (!order) return { success: false, message: 'Không tìm thấy đơn hàng!' };
    if (order.orderStatus === 'CANCELLED') return { success: false, message: 'Đơn hàng đã hủy, không thể hoàn thành.' };

    order.orderStatus = 'COMPLETED';
    order.paymentStatus = 'PAID';
    order.updatedAt = new Date().toISOString();

    // If order has an open debt in debts list, record payment receipt
    if (order.stockTxId) {
      const openDebt = this.debts.find((d) => d.txId === order.stockTxId && d.status !== 'PAID' && !d.isReversed);
      if (openDebt) {
        const remaining = openDebt.amount - openDebt.paidAmount;
        if (remaining > 0) {
          const pRef = `PT-WS-${Date.now().toString().slice(-4)}`;
          this.recordPayment(
            'RECEIVE',
            openDebt.id,
            openDebt.partnerId,
            'CUSTOMER',
            remaining,
            order.paymentMethod === 'BANK_TRANSFER' ? 'BANK' : 'CASH',
            pRef,
            `Thu tiền hoàn tất đơn hàng Webshop ${order.orderCode}`
          );
        }
      }
    }

    this.save('webshopOrders' as any);
    return { success: true, message: `Đơn hàng ${order.orderCode} đã hoàn tất và thanh toán thành công!` };
  }

  updateWebshopOrderStatus(
    orderId: string,
    status: WebshopOrderStatus,
    paymentStatus?: WebshopPaymentStatus
  ): { success: boolean; message: string } {
    const order = this.webshopOrders.find((o) => o.id === orderId);
    if (!order) return { success: false, message: 'Không tìm thấy đơn hàng!' };

    if (status === 'CANCELLED') {
      return this.cancelWebshopOrder(orderId, 'Hủy từ danh sách đơn hàng');
    }
    if (status === 'COMPLETED') {
      return this.completeWebshopOrder(orderId);
    }
    if (status === 'SHIPPED' && !order.stockTxId) {
      return this.fulfillWebshopOrder(orderId);
    }

    order.orderStatus = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    order.updatedAt = new Date().toISOString();
    this.save('webshopOrders' as any);
    return { success: true, message: 'Cập nhật trạng thái đơn hàng thành công!' };
  }

  saveWebshopProductConfig(config: WebshopProductConfig) {
    const idx = this.webshopProductConfigs.findIndex((c) => c.productId === config.productId);
    if (idx >= 0) {
      this.webshopProductConfigs[idx] = { ...config };
    } else {
      this.webshopProductConfigs.push({ ...config });
    }
    this.save('webshopProductConfigs' as any);
  }

  saveWebshopStoreConfig(config: WebshopStoreConfig) {
    this.webshopStoreConfig = { ...config };
    localStorage.setItem('wms_webshop_store_config', JSON.stringify(this.webshopStoreConfig));
    this.save('webshopStoreConfig' as any);
  }

  // --- BUSINESS LOGIC TRANSACTIONS ---

  /**
   * CONFIRM STOCK IN
   * In 1 Single Transaction:
   * 1. Update Inventory and Recalculate Average Cost (Weighted Average Cost Method)
   * 2. Create Journal Entry (Debit 1561/STOCK_IN, Debit 1331/VAT_INPUT, Credit 331/AP_PAYMENT)
   *    Verify Debit = Credit
   * 3. Create AP Debt record
   * 4. Create VAT input ledger record
   */
  confirmStockIn(txId: string): { success: boolean; message: string } {
    const tx = this.stockTransactions.find((t) => t.id === txId);
    if (!tx) return { success: false, message: 'Không tìm thấy giao dịch!' };
    if (tx.isConfirmed) return { success: false, message: 'Giao dịch đã được xác nhận trước đó.' };

    const lockCheck = this.isDateInLockedYear(tx.date);
    if (lockCheck.locked) {
      return {
        success: false,
        message: `Kỳ kế toán năm ${lockCheck.year} đã được khóa sổ cuối năm! Không thể xác nhận chứng từ thuộc năm đã khóa.`,
      };
    }

    const details = this.stockTransactionDetails.filter((d) => d.txId === txId);
    if (details.length === 0) return { success: false, message: 'Giao dịch không có sản phẩm nào!' };

    // --- TRANSACTION START ---
    // Keep snapshots of current products in case we need to rollback on error (simulating SQL transactional integrity)
    const productSnapshots = JSON.parse(JSON.stringify(this.products));

    try {
      // 1. Update Inventory and Recalculate Continuous Weighted Average Cost
      for (const d of details) {
        const prod = this.products.find((p) => p.id === d.productId);
        if (!prod) throw new Error(`Không tìm thấy sản phẩm ID ${d.productId}`);

        const Q_old = prod.currentQty;
        const C_old = prod.averageCost;
        const Q_new = d.qty;
        const P_new = d.unitPrice;

        // Formula handling negative stock gracefully
        const Q_old_pos = Math.max(0, Q_old);
        const numerator = (Q_old_pos * C_old) + (Q_new * P_new);
        const denominator = Q_old_pos + Q_new;

        const C_new = denominator > 0 ? Math.round(numerator / denominator) : P_new;

        // Apply new metrics
        prod.currentQty = Q_old + Q_new;
        prod.averageCost = C_new;
      }

      // Get account codes from mapping
      const stockInAccount = this.getAccountForMapping('STOCK_IN');
      const apAccount = this.getAccountForMapping('AP_PAYMENT');
      const vatInputAccount = this.getAccountForMapping('VAT_INPUT');

      // 2. Create Journal Entry
      const entryId = `je-in-${txId}`;
      const newEntry: JournalEntry = {
        id: entryId,
        date: tx.date,
        referenceNo: tx.referenceNo,
        description: tx.notes || `Nhập kho theo chứng từ ${tx.referenceNo}`,
        isReversed: false,
      };

      const lines: JournalEntryLine[] = [];

      // Debit STOCK_IN for Subtotal (excluding VAT)
      lines.push({
        id: `jl-in-${txId}-stock`,
        entryId,
        accountCode: stockInAccount,
        debit: tx.subtotal,
        credit: 0,
      });

      // Debit VAT_INPUT if vatAmount > 0
      if (tx.vatAmount > 0) {
        lines.push({
          id: `jl-in-${txId}-vat`,
          entryId,
          accountCode: vatInputAccount,
          debit: tx.vatAmount,
          credit: 0,
        });
      }

      // Credit AP_PAYMENT for Total Amount (including VAT)
      lines.push({
        id: `jl-in-${txId}-ap`,
        entryId,
        accountCode: apAccount,
        debit: 0,
        credit: tx.totalAmount,
        partnerId: tx.supplierId,
        partnerType: 'SUPPLIER',
      });

      // Verify double-entry balancing
      const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
      if (Math.abs(totalDebit - totalCredit) > 1) {
        throw new Error(`Bút toán kế toán không cân bằng! Debit: ${totalDebit}, Credit: ${totalCredit}`);
      }

      // Commit Accounting
      this.journalEntries.push(newEntry);
      this.journalLines.push(...lines);

      // 3. Create AP Debt record
      const debtId = `debt-in-${txId}`;
      const supplier = this.suppliers.find((s) => s.id === tx.supplierId);
      this.debts.push({
        id: debtId,
        type: 'AP',
        partnerId: tx.supplierId || '',
        txId: tx.id,
        referenceNo: tx.referenceNo,
        date: tx.date,
        amount: tx.totalAmount,
        paidAmount: 0,
        status: 'UNPAID',
        isReversed: false,
        dueDate: tx.dueDate,
      });

      // Handle prepayment if specified
      if (tx.prepaidAmount && tx.prepaidAmount > 0) {
        const payType = 'PAY';
        const partnerType = 'SUPPLIER';
        const payMethod = tx.prepaidMethod || 'CASH';
        const pRef = `PC-${tx.referenceNo.split('-').slice(1).join('-') || Date.now().toString()}`;
        this.recordPayment(
          payType,
          debtId,
          tx.supplierId || '',
          partnerType,
          tx.prepaidAmount,
          payMethod,
          pRef,
          `Thanh toán trả trước cho chứng từ ${tx.referenceNo}`
        );
      }

      // 4. Create VAT input ledger record
      if (tx.vatAmount > 0 && supplier) {
        this.vatLedger.push({
          id: `vat-ledger-in-${txId}`,
          type: 'INPUT',
          date: tx.date,
          txId: tx.id,
          invoiceNo: tx.referenceNo,
          partnerName: supplier.name,
          partnerTaxCode: supplier.taxCode,
          amountBeforeVat: tx.subtotal,
          vatRate: tx.vatRate,
          vatAmount: tx.vatAmount,
          accountCode: vatInputAccount,
          isReversed: false,
        });
      }

      // Set confirmed
      tx.isConfirmed = true;
      this.saveAll();

      return { success: true, message: 'Nhập kho và hạch toán kế toán hoàn tất thành công!' };
    } catch (err: any) {
      // ROLLBACK Local State if any error happens (Transaction Simulation)
      this.products = productSnapshots;
      return { success: false, message: `Thất bại khi thực hiện giao dịch: ${err.message}` };
    }
  }

  /**
   * CONFIRM STOCK OUT
   * In 1 Single Transaction:
   * 1. Validate Stock (Allow but track continuous average cost)
   * 2. Reduce Inventory
   * 3. Create Revenue Journal Entry (Debit 131/AR_PAYMENT, Credit 511/SALE, Credit 3331/VAT_OUTPUT)
   * 4. Create COGS Journal Entry (Debit 632/COGS, Credit 1561/STOCK_IN)
   *    Verify Debit = Credit for both entries
   * 5. Create AR Debt record
   * 6. Create VAT output ledger record
   */
  confirmStockOut(txId: string): { success: boolean; message: string } {
    const tx = this.stockTransactions.find((t) => t.id === txId);
    if (!tx) return { success: false, message: 'Không tìm thấy giao dịch!' };
    if (tx.isConfirmed) return { success: false, message: 'Giao dịch đã được xác nhận trước đó.' };

    const lockCheck = this.isDateInLockedYear(tx.date);
    if (lockCheck.locked) {
      return {
        success: false,
        message: `Kỳ kế toán năm ${lockCheck.year} đã được khóa sổ cuối năm! Không thể xác nhận chứng từ thuộc năm đã khóa.`,
      };
    }

    const details = this.stockTransactionDetails.filter((d) => d.txId === txId);
    if (details.length === 0) return { success: false, message: 'Giao dịch không có sản phẩm nào!' };

    // --- TRANSACTION START ---
    const productSnapshots = JSON.parse(JSON.stringify(this.products));

    try {
      let calculatedTotalCogs = 0;

      // 1 & 2. Validate, Reduce Inventory & Calculate COGS at the current continuous average cost
      for (const d of details) {
        const prod = this.products.find((p) => p.id === d.productId);
        if (!prod) throw new Error(`Không tìm thấy sản phẩm ID ${d.productId}`);

        // Continuous average cost method cost matching
        const cogsUnit = prod.averageCost;
        const cogsTotal = d.qty * cogsUnit;

        d.cogsUnitCost = cogsUnit;
        d.cogsTotal = cogsTotal;
        calculatedTotalCogs += cogsTotal;

        // Reduce inventory
        prod.currentQty = prod.currentQty - d.qty;
      }

      // Get account codes
      const arAccount = this.getAccountForMapping('AR_PAYMENT');
      const saleAccount = this.getAccountForMapping('SALE');
      const vatOutputAccount = this.getAccountForMapping('VAT_OUTPUT');
      const cogsAccount = this.getAccountForMapping('COGS');
      const stockAccount = this.getAccountForMapping('STOCK_IN');

      // 3. Create Revenue & Debt Journal Entry
      const revEntryId = `je-rev-out-${txId}`;
      const revEntry: JournalEntry = {
        id: revEntryId,
        date: tx.date,
        referenceNo: tx.referenceNo,
        description: `Doanh thu bán lẻ/sỉ xuất kho ${tx.referenceNo}`,
        isReversed: false,
      };

      const revLines: JournalEntryLine[] = [];

      // Debit AR_PAYMENT (Total including VAT)
      revLines.push({
        id: `jl-rev-out-${txId}-ar`,
        entryId: revEntryId,
        accountCode: arAccount,
        debit: tx.totalAmount,
        credit: 0,
        partnerId: tx.customerId,
        partnerType: 'CUSTOMER',
      });

      // Credit SALE (Subtotal before VAT)
      revLines.push({
        id: `jl-rev-out-${txId}-sale`,
        entryId: revEntryId,
        accountCode: saleAccount,
        debit: 0,
        credit: tx.subtotal,
      });

      // Credit VAT_OUTPUT if exists
      if (tx.vatAmount > 0) {
        revLines.push({
          id: `jl-rev-out-${txId}-vat`,
          entryId: revEntryId,
          accountCode: vatOutputAccount,
          debit: 0,
          credit: tx.vatAmount,
        });
      }

      // Validate Revenue Entry
      const revDebitSum = revLines.reduce((sum, l) => sum + l.debit, 0);
      const revCreditSum = revLines.reduce((sum, l) => sum + l.credit, 0);
      if (Math.abs(revDebitSum - revCreditSum) > 1) {
        throw new Error(`Bút toán doanh thu không cân bằng! Debit: ${revDebitSum}, Credit: ${revCreditSum}`);
      }

      // 4. Create COGS Journal Entry (Only if there is value to hạch toán)
      const cogsEntryId = `je-cogs-out-${txId}`;
      const cogsEntry: JournalEntry = {
        id: cogsEntryId,
        date: tx.date,
        referenceNo: tx.referenceNo,
        description: `Giá vốn hàng bán xuất kho ${tx.referenceNo}`,
        isReversed: false,
      };

      const cogsLines: JournalEntryLine[] = [
        {
          id: `jl-cogs-${txId}-dr`,
          entryId: cogsEntryId,
          accountCode: cogsAccount,
          debit: calculatedTotalCogs,
          credit: 0,
        },
        {
          id: `jl-cogs-${txId}-cr`,
          entryId: cogsEntryId,
          accountCode: stockAccount,
          debit: 0,
          credit: calculatedTotalCogs,
        },
      ];

      // Validate COGS Entry
      const cogsDebitSum = cogsLines.reduce((sum, l) => sum + l.debit, 0);
      const cogsCreditSum = cogsLines.reduce((sum, l) => sum + l.credit, 0);
      if (Math.abs(cogsDebitSum - cogsCreditSum) > 1) {
        throw new Error(`Bút toán giá vốn không cân bằng! Debit: ${cogsDebitSum}, Credit: ${cogsCreditSum}`);
      }

      // Commit Accounting
      this.journalEntries.push(revEntry, cogsEntry);
      this.journalLines.push(...revLines, ...cogsLines);

      // 5. Create AR Debt record
      const debtId = `debt-out-${txId}`;
      const customer = this.customers.find((c) => c.id === tx.customerId);
      this.debts.push({
        id: debtId,
        type: 'AR',
        partnerId: tx.customerId || '',
        txId: tx.id,
        referenceNo: tx.referenceNo,
        date: tx.date,
        amount: tx.totalAmount,
        paidAmount: 0,
        status: 'UNPAID',
        isReversed: false,
        dueDate: tx.dueDate,
      });

      // Handle prepayment if specified
      if (tx.prepaidAmount && tx.prepaidAmount > 0) {
        const payType = 'RECEIVE';
        const partnerType = 'CUSTOMER';
        const payMethod = tx.prepaidMethod || 'CASH';
        const pRef = `PT-${tx.referenceNo.split('-').slice(1).join('-') || Date.now().toString()}`;
        this.recordPayment(
          payType,
          debtId,
          tx.customerId || '',
          partnerType,
          tx.prepaidAmount,
          payMethod,
          pRef,
          `Khách hàng trả trước cho chứng từ ${tx.referenceNo}`
        );
      }

      // 6. Create VAT output ledger record
      if (tx.vatAmount > 0 && customer) {
        this.vatLedger.push({
          id: `vat-ledger-out-${txId}`,
          type: 'OUTPUT',
          date: tx.date,
          txId: tx.id,
          invoiceNo: tx.referenceNo,
          partnerName: customer.name,
          partnerTaxCode: customer.taxCode,
          amountBeforeVat: tx.subtotal,
          vatRate: tx.vatRate,
          vatAmount: tx.vatAmount,
          accountCode: vatOutputAccount,
          isReversed: false,
        });
      }

      // Set confirmed
      tx.isConfirmed = true;
      this.saveAll();

      return { success: true, message: 'Xuất kho và hạch toán Doanh thu, Giá vốn thành công!' };
    } catch (err: any) {
      this.products = productSnapshots;
      return { success: false, message: `Thất bại khi thực hiện giao dịch: ${err.message}` };
    }
  }

  /**
   * REVERSAL LOGIC (HỦY CONFIRM)
   * Must:
   * 1. Rollback Inventory quantities (Add back for OUT, Subtract for IN)
   *    Average cost is recalculable or we can restore snapshot if possible. Let's adjust inventory quantities back.
   *    For STOCK_IN reversal, we reduce stock and recalculate average cost by rolling back.
   * 2. Rollback Accounting: Do NOT delete. Create mirror reversal Journal Entries with negative value or swapped sides.
   *    Mark original journal entries as `isReversed = true` and point to reversal reference.
   * 3. Rollback Debt: Mark Debt as reversed.
   * 4. Rollback VAT: Mark VAT ledger entries as reversed.
   */
  reverseTransaction(txId: string): { success: boolean; message: string } {
    const tx = this.stockTransactions.find((t) => t.id === txId);
    if (!tx) return { success: false, message: 'Không tìm thấy giao dịch!' };
    if (!tx.isConfirmed) return { success: false, message: 'Giao dịch chưa được xác nhận, không thể đảo hủy.' };
    if (tx.isReversed) return { success: false, message: 'Giao dịch này đã được đảo hủy trước đó.' };

    const lockCheck = this.isDateInLockedYear(tx.date);
    if (lockCheck.locked) {
      return {
        success: false,
        message: `Kỳ kế toán năm ${lockCheck.year} đã được khóa sổ cuối năm! Không thể đảo hủy chứng từ thuộc năm đã khóa.`,
      };
    }

    const details = this.stockTransactionDetails.filter((d) => d.txId === txId);
    const productSnapshots = JSON.parse(JSON.stringify(this.products));

    try {
      // 1. Rollback Inventory Quantities
      for (const d of details) {
        const prod = this.products.find((p) => p.id === d.productId);
        if (!prod) continue;

        if (tx.type === 'IN' || (tx.type === 'OPENING' && !tx.isCarryForward)) {
          // Reversing STOCK_IN or initial OPENING means we subtract the added stock
          prod.currentQty = prod.currentQty - d.qty;
        } else if (tx.type === 'OUT') {
          // Reversing STOCK_OUT means we add the stock back
          prod.currentQty = prod.currentQty + d.qty;
        }
      }

      // 2. Rollback Accounting Journal Entries
      const originalEntries = this.journalEntries.filter((je) => je.referenceNo === tx.referenceNo && !je.isReversed);

      for (const origJe of originalEntries) {
        const reversalJeId = `rev-je-${origJe.id}`;

        // Create Reversal Journal Entry
        const revJe: JournalEntry = {
          id: reversalJeId,
          date: new Date().toISOString().split('T')[0], // Current rollback date
          referenceNo: `ĐẢO-${origJe.referenceNo}`,
          description: `BÚT TOÁN ĐẢO: Hủy ${origJe.description}`,
          isReversed: false,
          reversalReference: origJe.id,
        };

        const origLines = this.journalLines.filter((jl) => jl.entryId === origJe.id);
        const revLines: JournalEntryLine[] = origLines.map((line) => ({
          id: `rev-jl-${line.id}`,
          entryId: reversalJeId,
          accountCode: line.accountCode,
          // Swap Debit and Credit or write negative numbers.
          // Swapping is highly compatible and represents neat reversal.
          debit: line.credit,
          credit: line.debit,
          partnerId: line.partnerId,
          partnerType: line.partnerType,
        }));

        // Push reversal entries
        this.journalEntries.push(revJe);
        this.journalLines.push(...revLines);

        // Mark original as reversed
        origJe.isReversed = true;
        origJe.reversalReference = reversalJeId;
      }

      // 3. Rollback Debt AP/AR
      const targetDebts = this.debts.filter((d) => d.txId === txId && !d.isReversed);
      for (const debt of targetDebts) {
        debt.isReversed = true;
        debt.reversalReference = `rev-debt-${debt.id}`;
      }

      // 4. Rollback VAT
      const targetVats = this.vatLedger.filter((v) => v.txId === txId && !v.isReversed);
      for (const vat of targetVats) {
        vat.isReversed = true;
      }

      // Mark the transaction itself as reversed
      tx.isReversed = true;
      tx.reversalReference = `rev-tx-${txId}`;

      this.saveAll();
      return { success: true, message: 'Đảo hủy giao dịch kho, kế toán, công nợ và VAT hoàn tất thành công!' };
    } catch (err: any) {
      this.products = productSnapshots;
      return { success: false, message: `Thất bại khi đảo hủy: ${err.message}` };
    }
  }

  // --- COA AND ACCOUNT UTILS ---
  public getAccountForMapping(key: string): string {
    const map = this.accountMapping.find((m) => m.key === key);
    if (!map) {
      // Fallbacks
      if (key === 'STOCK_IN') return '1561';
      if (key === 'AR_PAYMENT') return '131';
      if (key === 'AP_PAYMENT') return '331';
      if (key === 'SALE') return '511';
      if (key === 'COGS') return '632';
      if (key === 'VAT_INPUT') return '1331';
      if (key === 'VAT_OUTPUT') return '3331';
      if (key === 'CASH') return '111';
      if (key === 'BANK') return '112';
      return '111';
    }
    return map.accountCode;
  }

  // Add customized account code
  addAccount(code: string, name: string, type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'OFF_BALANCE', parentCode?: string): { success: boolean; message: string } {
    if (this.coa.some((a) => a.code === code)) {
      return { success: false, message: 'Mã tài khoản này đã tồn tại!' };
    }
    this.coa.push({ code, name, type, parentCode, isCustom: true });
    this.coa.sort((a, b) => a.code.localeCompare(b.code));
    this.save('coa');
    return { success: true, message: 'Thêm tài khoản mới thành công!' };
  }

  // --- RECORD DEBT PAYMENTS ---
  recordPayment(
    type: 'RECEIVE' | 'PAY',
    debtId: string | undefined,
    partnerId: string,
    partnerType: 'SUPPLIER' | 'CUSTOMER',
    amount: number,
    method: 'CASH' | 'BANK' | 'OTHER',
    referenceNo: string,
    notes?: string
  ): { success: boolean; message: string } {
    if (amount <= 0) return { success: false, message: 'Số tiền thanh toán phải lớn hơn 0!' };

    try {
      // 1. Update Debt record if specified
      if (debtId) {
        const debt = this.debts.find((d) => d.id === debtId);
        if (debt) {
          const remaining = debt.amount - debt.paidAmount;
          if (amount > remaining + 100) { // Tiny rounding threshold
            return { success: false, message: `Số tiền thanh toán (${amount.toLocaleString()}đ) lớn hơn dư nợ còn lại (${remaining.toLocaleString()}đ)!` };
          }
          debt.paidAmount += amount;
          if (debt.paidAmount >= debt.amount - 10) {
            debt.status = 'PAID';
          } else {
            debt.status = 'PARTIAL';
          }
        }
      }

      // 2. Insert Payment record
      const paymentId = `pay-${Date.now()}`;
      const newPayment: Payment = {
        id: paymentId,
        type,
        debtId,
        partnerId,
        partnerType,
        date: new Date().toISOString().split('T')[0],
        amount,
        method,
        referenceNo,
        notes,
      };
      this.payments.push(newPayment);

      // 3. Create Journal Entry automatically for payment
      const entryId = `je-pay-${paymentId}`;
      const paymentJe: JournalEntry = {
        id: entryId,
        date: newPayment.date,
        referenceNo,
        description: notes || (type === 'RECEIVE' ? `Thu tiền công nợ bán hàng` : `Chi trả tiền hàng cho nhà cung cấp`),
        isReversed: false,
      };

      const payLines: JournalEntryLine[] = [];

      // Determine debit / credit accounts based on payment direction
      const liquidAccount = this.getAccountForMapping(method === 'BANK' ? 'BANK' : 'CASH');
      const partnerAccount = this.getAccountForMapping(partnerType === 'SUPPLIER' ? 'AP_PAYMENT' : 'AR_PAYMENT');

      if (type === 'RECEIVE') {
        // Customer paid us (Receivable)
        // Debit CASH/BANK (increase money)
        payLines.push({
          id: `jl-p1-${paymentId}`,
          entryId,
          accountCode: liquidAccount,
          debit: amount,
          credit: 0,
        });
        // Credit AR_PAYMENT (decrease receivable)
        payLines.push({
          id: `jl-p2-${paymentId}`,
          entryId,
          accountCode: partnerAccount,
          debit: 0,
          credit: amount,
          partnerId,
          partnerType: 'CUSTOMER',
        });
      } else {
        // We paid Supplier (Payable)
        // Debit AP_PAYMENT (decrease liability)
        payLines.push({
          id: `jl-p1-${paymentId}`,
          entryId,
          accountCode: partnerAccount,
          debit: amount,
          credit: 0,
          partnerId,
          partnerType: 'SUPPLIER',
        });
        // Credit CASH/BANK (decrease money)
        payLines.push({
          id: `jl-p2-${paymentId}`,
          entryId,
          accountCode: liquidAccount,
          debit: 0,
          credit: amount,
        });
      }

      // Verify Double-Entry balances
      const dSum = payLines.reduce((s, l) => s + l.debit, 0);
      const cSum = payLines.reduce((s, l) => s + l.credit, 0);
      if (Math.abs(dSum - cSum) > 1) {
        throw new Error(`Bút toán thanh toán không cân bằng!`);
      }

      this.journalEntries.push(paymentJe);
      this.journalLines.push(...payLines);

      this.saveAll();
      return { success: true, message: 'Ghi nhận thanh toán và tạo bút toán sổ cái thành công!' };
    } catch (err: any) {
      return { success: false, message: `Lỗi khi xử lý thanh toán: ${err.message}` };
    }
  }

  // --- REPORT GENERATORS ---

  // 1. TRIAL BALANCE (Bảng Cân đối phát sinh)
  getTrialBalance(startDate?: string, endDate?: string): {
    code: string;
    name: string;
    openingDebit: number;
    openingCredit: number;
    periodDebit: number;
    periodCredit: number;
    closingDebit: number;
    closingCredit: number;
  }[] {
    const trialBalanceMap: Record<string, {
      name: string;
      openingDebit: number;
      openingCredit: number;
      periodDebit: number;
      periodCredit: number;
      type: string;
    }> = {};

    // Initialize all COA accounts
    for (const a of this.coa) {
      trialBalanceMap[a.code] = {
        name: a.name,
        openingDebit: 0,
        openingCredit: 0,
        periodDebit: 0,
        periodCredit: 0,
        type: a.type,
      };
    }

    // Process all journal lines
    for (const entry of this.journalEntries) {
      const isBefore = startDate ? entry.date < startDate : false;
      const isDuring = (!startDate || entry.date >= startDate) && (!endDate || entry.date <= endDate);

      const lines = this.journalLines.filter((l) => l.entryId === entry.id);

      for (const line of lines) {
        const act = trialBalanceMap[line.accountCode];
        if (!act) continue;

        if (isBefore) {
          act.openingDebit += line.debit;
          act.openingCredit += line.credit;
        } else if (isDuring) {
          act.periodDebit += line.debit;
          act.periodCredit += line.credit;
        }
      }
    }

    // Calculate trial balance entries
    return Object.keys(trialBalanceMap).map((code) => {
      const item = trialBalanceMap[code];

      // Safe Netting Opening Balance
      let openingDebit = 0;
      let openingCredit = 0;
      const netOpening = item.openingDebit - item.openingCredit;

      if (['ASSET', 'EXPENSE'].includes(item.type)) {
        if (netOpening > 0) openingDebit = netOpening;
        else openingCredit = Math.abs(netOpening);
      } else {
        if (netOpening < 0) openingCredit = Math.abs(netOpening);
        else openingDebit = netOpening;
      }

      // Closing calculations
      const netTotal = (openingDebit - openingCredit) + (item.periodDebit - item.periodCredit);
      let closingDebit = 0;
      let closingCredit = 0;

      if (['ASSET', 'EXPENSE'].includes(item.type)) {
        if (netTotal > 0) closingDebit = netTotal;
        else closingCredit = Math.abs(netTotal);
      } else {
        if (netTotal < 0) closingCredit = Math.abs(netTotal);
        else closingDebit = netTotal;
      }

      return {
        code,
        name: item.name,
        openingDebit,
        openingCredit,
        periodDebit: item.periodDebit,
        periodCredit: item.periodCredit,
        closingDebit,
        closingCredit,
      };
    });
  }

  // 2. INCOME STATEMENT (Báo cáo Kết quả Hoạt động Kinh doanh)
  getIncomeStatement(startDate?: string, endDate?: string) {
    // Compute operational revenue & expenses excluding year-end closing transfer entries (KC-...)
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalAdminExpense = 0;

    for (const entry of this.journalEntries) {
      if (entry.isClosingEntry || entry.referenceNo.startsWith('KC-')) continue;
      const isDuring = (!startDate || entry.date >= startDate) && (!endDate || entry.date <= endDate);
      if (!isDuring) continue;

      const lines = this.journalLines.filter((l) => l.entryId === entry.id);
      for (const line of lines) {
        if (line.accountCode.startsWith('5')) {
          totalRevenue += line.credit - line.debit;
        } else if (line.accountCode.startsWith('632')) {
          totalCOGS += line.debit - line.credit;
        } else if (line.accountCode.startsWith('642') || line.accountCode.startsWith('641')) {
          totalAdminExpense += line.debit - line.credit;
        }
      }
    }

    const grossProfit = totalRevenue - totalCOGS;
    const netProfitBeforeTax = grossProfit - totalAdminExpense;
    const taxAmount = Math.max(0, Math.round(netProfitBeforeTax * 0.20)); // Simulating 20% CIT
    const netProfit = netProfitBeforeTax - taxAmount;

    return {
      totalRevenue,
      totalCOGS,
      grossProfit,
      totalAdminExpense,
      netProfitBeforeTax,
      taxAmount,
      netProfit,
    };
  }

  // 3. BALANCE SHEET (Bảng Cân đối Kế toán - Simulating main lines)
  getBalanceSheet(dateString?: string) {
    const tb = this.getTrialBalance(undefined, dateString);

    const cashAndBank = tb.filter((a) => a.code === '111' || a.code === '112').reduce((s, a) => s + (a.closingDebit - a.closingCredit), 0);
    const receivables = tb.filter((a) => a.code === '131').reduce((s, a) => s + (a.closingDebit - a.closingCredit), 0);
    const inventory = tb.filter((a) => a.code.startsWith('156')).reduce((s, a) => s + (a.closingDebit - a.closingCredit), 0);
    const vatInput = tb.filter((a) => a.code === '1331').reduce((s, a) => s + (a.closingDebit - a.closingCredit), 0);

    const totalAssets = cashAndBank + receivables + inventory + vatInput;

    const payables = tb.filter((a) => a.code === '331').reduce((s, a) => s + (a.closingCredit - a.closingDebit), 0);
    const vatOutput = tb.filter((a) => a.code === '3331').reduce((s, a) => s + (a.closingCredit - a.closingDebit), 0);
    const totalLiabilities = payables + vatOutput;

    const ownerEquity = tb.filter((a) => a.code === '411').reduce((s, a) => s + (a.closingCredit - a.closingDebit), 0);
    // Retained Earnings from 421 + any unclosed P&L balance remaining in 5xx/6xx
    const closedRetainedEarnings = tb.filter((a) => a.code.startsWith('421')).reduce((s, a) => s + (a.closingCredit - a.closingDebit), 0);
    const unclosedRevenue = tb.filter((a) => a.code.startsWith('5')).reduce((s, a) => s + (a.closingCredit - a.closingDebit), 0);
    const unclosedExpense = tb.filter((a) => a.code.startsWith('6')).reduce((s, a) => s + (a.closingDebit - a.closingCredit), 0);
    const currentProfit = closedRetainedEarnings + (unclosedRevenue - unclosedExpense);
    const totalEquity = ownerEquity + currentProfit;

    const totalResources = totalLiabilities + totalEquity;

    return {
      cashAndBank,
      receivables,
      inventory,
      vatInput,
      totalAssets,
      payables,
      vatOutput,
      totalLiabilities,
      ownerEquity,
      currentProfit,
      totalEquity,
      totalResources,
    };
  }

  // ============================================================================
  // 4. OPENING STOCK BALANCE, NXT REPORT & YEAR-END CLOSING ENGINE
  // ============================================================================

  /**
   * Checks if a given YYYY-MM-DD date falls within a LOCKED fiscal year.
   */
  isDateInLockedYear(dateStr: string): { locked: boolean; year?: number; closingRecord?: FiscalYearClosing } {
    if (!dateStr) return { locked: false };
    const year = Number(dateStr.split('-')[0]);
    if (!year || isNaN(year)) return { locked: false };
    const found = (this.fiscalClosings || []).find((c) => c.fiscalYear === year && c.status === 'LOCKED');
    if (found) {
      return { locked: true, year, closingRecord: found };
    }
    return { locked: false };
  }

  /**
   * Determines whether an OPENING transaction should be included when replaying cumulative stock from the beginning.
   * If an OPENING transaction has `isCarryForward === true` AND there are already prior transactions before its fiscal year
   * in that warehouse, we skip it during cumulative replay because the prior transactions already sum to that exact balance.
   */
  public shouldIncludeOpeningTxInCumulativeReplay(tx: StockTransaction): boolean {
    if (tx.type !== 'OPENING') return true;
    if (!tx.isCarryForward) return true;
    const txYear = tx.fiscalYear || Number(tx.date.split('-')[0]);
    const priorCutoff = `${txYear - 1}-12-31`;
    const hasPriorMovements = this.stockTransactions.some(
      (other) =>
        other.id !== tx.id &&
        other.isConfirmed &&
        !other.isReversed &&
        !other.isCarryForward &&
        other.warehouseId === tx.warehouseId &&
        other.date <= priorCutoff
    );
    return !hasPriorMovements;
  }

  /**
   * Replays all confirmed, non-reversed transactions in chronological order to guarantee
   * 100% accurate currentQty and continuous weighted averageCost for all products.
   */
  public recalculateAllProductsStock(): void {
    const typePriority: Record<string, number> = { OPENING: 0, IN: 1, OUT: 2 };
    const validTxs = this.stockTransactions
      .filter((t) => t.isConfirmed && !t.isReversed && this.shouldIncludeOpeningTxInCumulativeReplay(t))
      .sort((a, b) => {
        const cmp = a.date.localeCompare(b.date);
        if (cmp !== 0) return cmp;
        return (typePriority[a.type] ?? 1) - (typePriority[b.type] ?? 1);
      });

    for (const prod of this.products) {
      let qty = 0;
      let avgCost = 0;

      for (const tx of validTxs) {
        const lines = this.stockTransactionDetails.filter((d) => d.txId === tx.id && d.productId === prod.id);
        for (const d of lines) {
          if (tx.type === 'OPENING' || tx.type === 'IN') {
            const qOldPos = Math.max(0, qty);
            const num = qOldPos * avgCost + d.qty * d.unitPrice;
            const den = qOldPos + d.qty;
            avgCost = den > 0 ? Math.round(num / den) : d.unitPrice;
            qty += d.qty;
          } else if (tx.type === 'OUT') {
            if (!d.cogsUnitCost) d.cogsUnitCost = avgCost;
            if (d.cogsTotal === undefined) d.cogsTotal = d.qty * d.cogsUnitCost;
            qty -= d.qty;
          }
        }
      }

      prod.currentQty = qty;
      if (qty > 0 || avgCost > 0) {
        prod.averageCost = avgCost;
      }
    }
  }

  /**
   * 3. BẢNG BÁO CÁO NHẬP - XUẤT - TỒN (NXT) CÓ FILTER THEO THỜI GIAN, KHO, DANH MỤC
   * Ensures exact identity:
   *   Closing(Y-1, 31/12) === Opening(Y, 01/01)
   *   ClosingQty === OpeningQty + InQty - OutQty
   *   ClosingValue === OpeningValue + InValue - OutValue
   */
  getInventoryMovementReport(
    startDate?: string,
    endDate?: string,
    warehouseId?: string,
    categoryId?: string
  ): InventoryNxtRow[] {
    const typePriority: Record<string, number> = { OPENING: 0, IN: 1, OUT: 2 };
    const filterWh = warehouseId && warehouseId !== 'ALL' ? warehouseId : undefined;
    const filterCat = categoryId && categoryId !== 'ALL' ? categoryId : undefined;

    const validTxs = this.stockTransactions
      .filter(
        (t) =>
          t.isConfirmed &&
          !t.isReversed &&
          (!filterWh || t.warehouseId === filterWh) &&
          this.shouldIncludeOpeningTxInCumulativeReplay(t)
      )
      .sort((a, b) => {
        const cmp = a.date.localeCompare(b.date);
        if (cmp !== 0) return cmp;
        return (typePriority[a.type] ?? 1) - (typePriority[b.type] ?? 1);
      });

    const targetProducts = this.products.filter((p) => !filterCat || p.categoryId === filterCat);
    const whName = filterWh
      ? this.warehouses.find((w) => w.id === filterWh)?.name || filterWh
      : 'Tất cả kho';

    return targetProducts.map((prod) => {
      const catName = this.categories.find((c) => c.id === prod.categoryId)?.name || 'Chưa phân loại';
      const uomName = this.uoms.find((u) => u.id === prod.uomId)?.name || 'Đơn vị';
      const altUomName = prod.altUomId ? this.uoms.find((u) => u.id === prod.altUomId)?.name : undefined;

      let runningQty = 0;
      let runningAvgCost = 0;

      let openingQty = 0;
      let openingValue = 0;
      let inQty = 0;
      let inValue = 0;
      let outQty = 0;
      let outValue = 0;
      let outRevenue = 0;

      for (const tx of validTxs) {
        if (endDate && tx.date > endDate) continue;

        const lines = this.stockTransactionDetails.filter(
          (d) => d.txId === tx.id && d.productId === prod.id
        );
        if (lines.length === 0) continue;

        // Determine if transaction belongs to Opening Balance vs Period Movement:
        // - Any transaction strictly before startDate is part of Opening Balance.
        // - Any transaction of type 'OPENING' dated on or before startDate (or initial OPENING if no startDate) is Opening Balance.
        const isOpeningBucket =
          tx.type === 'OPENING'
            ? !startDate || tx.date <= startDate || !tx.isCarryForward
            : Boolean(startDate && tx.date < startDate);

        for (const d of lines) {
          if (tx.type === 'OPENING' || tx.type === 'IN') {
            const qOldPos = Math.max(0, runningQty);
            const lineVal = d.totalPrice !== undefined ? d.totalPrice : Math.round(d.qty * d.unitPrice);
            const num = qOldPos * runningAvgCost + lineVal;
            const den = qOldPos + d.qty;
            runningAvgCost = den > 0 ? Math.round(num / den) : d.unitPrice;
            runningQty += d.qty;

            if (isOpeningBucket) {
              openingQty += d.qty;
              openingValue += lineVal;
            } else {
              inQty += d.qty;
              inValue += lineVal;
            }
          } else if (tx.type === 'OUT') {
            const cogsVal =
              d.cogsTotal !== undefined && d.cogsTotal > 0
                ? d.cogsTotal
                : Math.round(d.qty * (d.cogsUnitCost || runningAvgCost || prod.averageCost));
            runningQty -= d.qty;

            if (isOpeningBucket) {
              openingQty -= d.qty;
              openingValue -= cogsVal;
            } else {
              outQty += d.qty;
              outValue += cogsVal;
              outRevenue += d.totalPrice || 0;
            }
          }
        }
      }

      if (openingQty <= 0) {
        openingValue = 0;
      } else {
        openingValue = Math.max(0, openingValue);
      }
      const openingUnitCost = openingQty > 0 ? Math.round(openingValue / openingQty) : 0;

      const closingQty = openingQty + inQty - outQty;
      let closingValue = openingValue + inValue - outValue;
      if (closingQty <= 0) {
        closingValue = 0;
      } else if (closingValue < 0) {
        closingValue = Math.round(closingQty * (runningAvgCost || prod.averageCost));
      }
      const closingUnitCost =
        closingQty > 0 ? Math.round(closingValue / closingQty) : runningAvgCost || prod.averageCost || 0;

      return {
        productId: prod.id,
        sku: prod.sku,
        productName: prod.name,
        categoryId: prod.categoryId,
        categoryName: catName,
        uomId: prod.uomId,
        uomName,
        altUomId: prod.altUomId,
        altUomName,
        uomConversionRate: prod.uomConversionRate,
        warehouseId: filterWh || 'ALL',
        warehouseName: whName,
        openingQty,
        openingUnitCost,
        openingValue,
        inQty,
        inValue,
        outQty,
        outValue,
        outRevenue,
        closingQty,
        closingUnitCost,
        closingValue,
      };
    });
  }

  /**
   * Checks whether the prior fiscal year (currentYear - 1) has any locked closing record
   * or any confirmed stock transactions on or before (currentYear - 1)-12-31.
   */
  hasPriorYearData(currentYear: number, warehouseId?: string): boolean {
    const priorYear = currentYear - 1;
    const lockedPrior = (this.fiscalClosings || []).find(
      (c) => c.fiscalYear === priorYear && c.status === 'LOCKED'
    );
    if (lockedPrior) return true;

    const priorEndDate = `${priorYear}-12-31`;
    const filterWh = warehouseId && warehouseId !== 'ALL' ? warehouseId : undefined;
    return this.stockTransactions.some(
      (t) =>
        t.isConfirmed &&
        !t.isReversed &&
        (!filterWh || t.warehouseId === filterWh) &&
        t.date <= priorEndDate
    );
  }

  /**
   * Returns the exact Closing Stock of `fiscalYear` (at `YYYY-12-31`) for each product.
   * Uses the locked FiscalYearClosing snapshot if available, otherwise computes via NXT up to `YYYY-12-31`.
   */
  getYearClosingStock(fiscalYear: number, warehouseId?: string): OpeningStockItemSnapshot[] {
    const filterWh = warehouseId && warehouseId !== 'ALL' ? warehouseId : undefined;
    const lockedClosing = (this.fiscalClosings || []).find(
      (c) => c.fiscalYear === fiscalYear && c.status === 'LOCKED'
    );

    if (lockedClosing && lockedClosing.stockSnapshots && lockedClosing.stockSnapshots.length > 0) {
      if (filterWh) {
        return lockedClosing.stockSnapshots.filter((s) => s.warehouseId === filterWh);
      }
      // Aggregate across warehouses if ALL
      return this.products.map((p) => {
        const matches = lockedClosing.stockSnapshots.filter((s) => s.productId === p.id);
        const qty = matches.reduce((sum, m) => sum + m.qty, 0);
        const totalValue = matches.reduce((sum, m) => sum + m.totalValue, 0);
        const unitCost = qty > 0 ? Math.round(totalValue / qty) : p.averageCost;
        return {
          productId: p.id,
          sku: p.sku,
          productName: p.name,
          uomId: p.uomId,
          warehouseId: 'ALL',
          qty,
          unitCost,
          totalValue,
        };
      });
    }

    const nxt = this.getInventoryMovementReport(
      `${fiscalYear}-01-01`,
      `${fiscalYear}-12-31`,
      filterWh
    );
    return nxt.map((row) => ({
      productId: row.productId,
      sku: row.sku,
      productName: row.productName,
      uomId: row.uomId,
      warehouseId: filterWh || 'ALL',
      qty: row.closingQty,
      unitCost: row.closingUnitCost,
      totalValue: row.closingValue,
    }));
  }

  /**
   * Retrieves the existing OPENING stock transaction & details for a given (fiscalYear, warehouseId).
   */
  getOpeningStockVoucher(
    fiscalYear: number,
    warehouseId: string
  ): { tx?: StockTransaction; details: StockTransactionDetail[] } {
    const tx = this.stockTransactions.find(
      (t) =>
        t.type === 'OPENING' &&
        !t.isReversed &&
        t.warehouseId === warehouseId &&
        (t.fiscalYear === fiscalYear || t.date.startsWith(`${fiscalYear}-`))
    );
    if (!tx) return { details: [] };
    const details = this.stockTransactionDetails.filter((d) => d.txId === tx.id);
    return { tx, details };
  }

  /**
   * 1. NHẬP SỐ DƯ TỒN ĐẦU KỲ (Kiểm tra bắt buộc: Số dư tồn đầu kỳ năm nay phải khớp chính xác với số dư cuối kỳ năm trước)
   */
  saveOpeningStockBalance(params: {
    fiscalYear: number;
    warehouseId: string;
    lines: {
      productId: string;
      qty: number;
      unitCost: number;
    }[];
    notes?: string;
  }): {
    success: boolean;
    message: string;
    discrepancies?: {
      productId: string;
      sku: string;
      productName: string;
      expectedQty: number;
      enteredQty: number;
      expectedUnitCost: number;
      enteredUnitCost: number;
      expectedValue: number;
      enteredValue: number;
    }[];
  } {
    const { fiscalYear, warehouseId, lines, notes } = params;
    if (!warehouseId) {
      return { success: false, message: 'Vui lòng chọn kho hàng cần nhập số dư tồn đầu kỳ!' };
    }

    // 1. Check if current fiscalYear is locked
    const lockCheck = this.isDateInLockedYear(`${fiscalYear}-01-01`);
    if (lockCheck.locked) {
      return {
        success: false,
        message: `Năm tài chính ${fiscalYear} đã khóa sổ cuối năm! Không thể chỉnh sửa số dư đầu kỳ của năm đã khóa.`,
      };
    }

    // 2. Check if prior year (fiscalYear - 1) has data -> Enforce strict 100% matching rule!
    const priorYear = fiscalYear - 1;
    const priorHasData = this.hasPriorYearData(fiscalYear, warehouseId);

    if (priorHasData) {
      const priorClosing = this.getYearClosingStock(priorYear, warehouseId);
      const discrepancies: {
        productId: string;
        sku: string;
        productName: string;
        expectedQty: number;
        enteredQty: number;
        expectedUnitCost: number;
        enteredUnitCost: number;
        expectedValue: number;
        enteredValue: number;
      }[] = [];

      for (const prod of this.products) {
        const expected = priorClosing.find((c) => c.productId === prod.id);
        const entered = lines.find((l) => l.productId === prod.id);

        const expectedQty = expected?.qty || 0;
        const expectedUnitCost = expected?.unitCost || 0;
        const expectedValue = expected?.totalValue || 0;

        const enteredQty = entered ? Number(entered.qty) || 0 : 0;
        const enteredUnitCost = entered ? Number(entered.unitCost) || 0 : 0;
        const enteredValue = Math.round(enteredQty * enteredUnitCost);

        const qtyMismatch = enteredQty !== expectedQty;
        const valMismatch =
          expectedQty > 0 && Math.abs(enteredValue - expectedValue) > Math.max(10, expectedQty);

        if (qtyMismatch || valMismatch) {
          discrepancies.push({
            productId: prod.id,
            sku: prod.sku,
            productName: prod.name,
            expectedQty,
            enteredQty,
            expectedUnitCost,
            enteredUnitCost,
            expectedValue,
            enteredValue,
          });
        }
      }

      if (discrepancies.length > 0) {
        const sample = discrepancies
          .slice(0, 3)
          .map(
            (d) =>
              `${d.sku} (Cuối kỳ ${priorYear}: ${d.expectedQty.toLocaleString()} x ${d.expectedUnitCost.toLocaleString()}đ = ${d.expectedValue.toLocaleString()}đ ≠ Đầu kỳ ${fiscalYear}: ${d.enteredQty.toLocaleString()} x ${d.enteredUnitCost.toLocaleString()}đ = ${d.enteredValue.toLocaleString()}đ)`
          )
          .join('; ');
        return {
          success: false,
          message: `LỖI ĐỐI CHIẾU LIÊN KỲ: Số dư tồn đầu kỳ năm ${fiscalYear} phải khớp chính xác 100% với số dư cuối kỳ năm ${priorYear}! Phát hiện ${discrepancies.length} mặt hàng lệch số dư: ${sample}. Vui lòng nhấn "Đồng bộ từ cuối kỳ ${priorYear}" hoặc điều chỉnh lại cho khớp chính xác.`,
          discrepancies,
        };
      }
    }

    // 3. Remove any previous OPENING voucher for this (fiscalYear, warehouseId)
    const existing = this.getOpeningStockVoucher(fiscalYear, warehouseId);
    if (existing.tx) {
      const oldTxId = existing.tx.id;
      this.stockTransactions = this.stockTransactions.filter((t) => t.id !== oldTxId);
      this.stockTransactionDetails = this.stockTransactionDetails.filter((d) => d.txId !== oldTxId);
      const oldJeId = `je-open-${oldTxId}`;
      this.journalEntries = this.journalEntries.filter((je) => je.id !== oldJeId);
      this.journalLines = this.journalLines.filter((jl) => jl.entryId !== oldJeId);
    }

    // 4. Create new OPENING StockTransaction & Details
    const nonZeroLines = lines.filter((l) => l.productId && Number(l.qty) > 0);
    const txId = `tx-open-${fiscalYear}-${warehouseId}`;
    const whCode = warehouseId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const referenceNo = `SDDK-${fiscalYear}-${whCode}`;
    const openingDate = `${fiscalYear}-01-01`;

    let subtotal = 0;
    const detailsToInsert: StockTransactionDetail[] = nonZeroLines.map((l, idx) => {
      const qty = Number(l.qty) || 0;
      const unitPrice = Number(l.unitCost) || 0;
      const totalPrice = Math.round(qty * unitPrice);
      subtotal += totalPrice;
      return {
        id: `txd-open-${fiscalYear}-${warehouseId}-${idx + 1}`,
        txId,
        productId: l.productId,
        qty,
        unitPrice,
        totalPrice,
        vatRate: 0,
        vatAmount: 0,
      };
    });

    const newTx: StockTransaction = {
      id: txId,
      type: 'OPENING',
      date: openingDate,
      warehouseId,
      referenceNo,
      vatRate: 0,
      vatType: 'GROUPED',
      subtotal,
      vatAmount: 0,
      totalAmount: subtotal,
      isConfirmed: true,
      isReversed: false,
      fiscalYear,
      isCarryForward: priorHasData,
      linkedClosingYear: priorHasData ? priorYear : undefined,
      notes:
        notes ||
        (priorHasData
          ? `Số dư tồn đầu kỳ năm ${fiscalYear} (Khớp 100% với số dư cuối kỳ 31/12/${priorYear})`
          : `Khai báo số dư tồn kho đầu kỳ năm ${fiscalYear}`),
    };

    this.stockTransactions.push(newTx);
    this.stockTransactionDetails.push(...detailsToInsert);

    // 5. If this is an initial Opening Balance (!priorHasData) and subtotal > 0, record accounting entry (Debit 1561 / Credit 411)
    if (!priorHasData && subtotal > 0) {
      const stockAccount = this.getAccountForMapping('STOCK_IN');
      const jeId = `je-open-${txId}`;
      this.journalEntries.push({
        id: jeId,
        date: openingDate,
        referenceNo,
        description: `Khai báo giá trị hàng tồn kho đầu kỳ năm ${fiscalYear} (${referenceNo})`,
        isReversed: false,
        fiscalYear,
      });
      this.journalLines.push(
        {
          id: `jl-open-dr-${txId}`,
          entryId: jeId,
          accountCode: stockAccount,
          debit: subtotal,
          credit: 0,
        },
        {
          id: `jl-open-cr-${txId}`,
          entryId: jeId,
          accountCode: '411',
          debit: 0,
          credit: subtotal,
        }
      );
    }

    // 6. Recalculate all products' currentQty and weighted averageCost chronologically
    this.recalculateAllProductsStock();
    this.saveAll();

    return {
      success: true,
      message: priorHasData
        ? `Đã lưu & xác nhận Số dư tồn đầu kỳ năm ${fiscalYear} (${referenceNo}) khớp chính xác 100% với số dư cuối kỳ năm ${priorYear}!`
        : `Đã lưu & hạch toán Số dư tồn đầu kỳ năm ${fiscalYear} (${referenceNo}) thành công! Tổng giá trị tồn đầu kỳ: ${subtotal.toLocaleString()}đ.`,
    };
  }

  /**
   * Pre-closing checklist inspection for a fiscal year before running Year-End Closing.
   */
  getPreClosingChecklist(fiscalYear: number) {
    const startDate = `${fiscalYear}-01-01`;
    const endDate = `${fiscalYear}-12-31`;

    const draftTransactions = this.stockTransactions.filter(
      (t) => !t.isReversed && !t.isConfirmed && t.date >= startDate && t.date <= endDate
    );

    const tb = this.getTrialBalance(startDate, endDate);
    const totalPeriodDebit = tb.reduce((s, r) => s + r.periodDebit, 0);
    const totalPeriodCredit = tb.reduce((s, r) => s + r.periodCredit, 0);
    const isTrialBalanced = Math.abs(totalPeriodDebit - totalPeriodCredit) <= 1;

    const nxt = this.getInventoryMovementReport(startDate, endDate);
    const negativeStockItems = nxt.filter((r) => r.closingQty < 0);

    // Check if Opening Balance of `fiscalYear` matches `fiscalYear - 1` Closing Balance
    const priorYear = fiscalYear - 1;
    const hasPrior = this.hasPriorYearData(fiscalYear);
    let isOpeningMatchedWithPrior = true;
    if (hasPrior) {
      const priorClosing = this.getYearClosingStock(priorYear);
      for (const row of nxt) {
        const exp = priorClosing.find((p) => p.productId === row.productId);
        if ((exp?.qty || 0) !== row.openingQty) {
          isOpeningMatchedWithPrior = false;
          break;
        }
      }
    }

    const is = this.getIncomeStatement(startDate, endDate);
    const totalClosingStockQty = nxt.reduce((s, r) => s + r.closingQty, 0);
    const totalClosingStockValue = nxt.reduce((s, r) => s + r.closingValue, 0);

    const existingLock = (this.fiscalClosings || []).find(
      (c) => c.fiscalYear === fiscalYear && c.status === 'LOCKED'
    );

    return {
      fiscalYear,
      isAlreadyLocked: Boolean(existingLock),
      existingLock,
      draftTransactions,
      isTrialBalanced,
      totalPeriodDebit,
      totalPeriodCredit,
      negativeStockItems,
      hasPriorYearData: hasPrior,
      isOpeningMatchedWithPrior,
      revenueToClose: is.totalRevenue,
      cogsToClose: is.totalCOGS,
      expenseToClose: is.totalAdminExpense,
      netProfitToClose: is.netProfitBeforeTax,
      totalClosingStockQty,
      totalClosingStockValue,
      closingStockRows: nxt,
      canClose:
        !existingLock &&
        draftTransactions.length === 0 &&
        isTrialBalanced &&
        isOpeningMatchedWithPrior,
    };
  }

  /**
   * 2. KẾT CHUYỂN CUỐI NĂM & KHÓA SỔ KỲ KẾ TOÁN NĂM (Year-End Closing)
   * Executes:
   *  - Pre-closing validation (no draft vouchers, trial balance balanced, opening stock matched)
   *  - Double-entry P&L closing entries on 31/12/YYYY (511 -> 911, 911 -> 632/642, 911 -> 421)
   *  - Snapshots closing inventory at 31/12/YYYY per warehouse
   *  - Automatically creates/updates next year's Opening Stock Balance vouchers (01/01/(YYYY+1)) matching 100% with 31/12/YYYY
   *  - Locks the fiscal year against unauthorized modifications
   */
  performYearEndClosing(
    fiscalYear: number,
    notes?: string
  ): { success: boolean; message: string; closingRecord?: FiscalYearClosing } {
    const check = this.getPreClosingChecklist(fiscalYear);

    if (check.isAlreadyLocked) {
      return {
        success: false,
        message: `Kỳ kế toán năm ${fiscalYear} đã được kết chuyển và khóa sổ trước đó!`,
      };
    }

    if (check.draftTransactions.length > 0) {
      return {
        success: false,
        message: `Không thể khóa sổ năm ${fiscalYear}! Còn ${check.draftTransactions.length} chứng từ kho (${check.draftTransactions.map((d) => d.referenceNo).join(', ')}) đang ở trạng thái Nháp (Chưa xác nhận). Vui lòng xác nhận hoặc hủy các chứng từ nháp trước khi khóa sổ.`,
      };
    }

    if (!check.isTrialBalanced) {
      return {
        success: false,
        message: `Không thể khóa sổ năm ${fiscalYear}! Bảng cân đối phát sinh trong năm đang lệch (Tổng Nợ: ${check.totalPeriodDebit.toLocaleString()}đ ≠ Tổng Có: ${check.totalPeriodCredit.toLocaleString()}đ).`,
      };
    }

    if (!check.isOpeningMatchedWithPrior) {
      return {
        success: false,
        message: `Không thể khóa sổ năm ${fiscalYear}! Số dư tồn đầu kỳ năm ${fiscalYear} chưa khớp với số dư cuối kỳ năm ${fiscalYear - 1}.`,
      };
    }

    const closingDate = `${fiscalYear}-12-31`;
    const closingJeId = `je-closing-${fiscalYear}`;
    const closingRef = `KC-${fiscalYear}-1231`;

    // Remove any previous unlocked closing entry for this year
    this.journalEntries = this.journalEntries.filter((je) => je.id !== closingJeId);
    this.journalLines = this.journalLines.filter((jl) => jl.entryId !== closingJeId);

    const closingLines: JournalEntryLine[] = [];

    // 1. Transfer Revenue (511 -> 911)
    if (check.revenueToClose > 0) {
      const saleAcc = this.getAccountForMapping('SALE');
      closingLines.push(
        {
          id: `jl-kc-${fiscalYear}-511-dr`,
          entryId: closingJeId,
          accountCode: saleAcc,
          debit: check.revenueToClose,
          credit: 0,
        },
        {
          id: `jl-kc-${fiscalYear}-911-cr`,
          entryId: closingJeId,
          accountCode: '911',
          debit: 0,
          credit: check.revenueToClose,
        }
      );
    }

    // 2. Transfer COGS (911 -> 632)
    if (check.cogsToClose > 0) {
      const cogsAcc = this.getAccountForMapping('COGS');
      closingLines.push(
        {
          id: `jl-kc-${fiscalYear}-911-cogs-dr`,
          entryId: closingJeId,
          accountCode: '911',
          debit: check.cogsToClose,
          credit: 0,
        },
        {
          id: `jl-kc-${fiscalYear}-632-cr`,
          entryId: closingJeId,
          accountCode: cogsAcc,
          debit: 0,
          credit: check.cogsToClose,
        }
      );
    }

    // 3. Transfer Admin Expenses (911 -> 642)
    if (check.expenseToClose > 0) {
      closingLines.push(
        {
          id: `jl-kc-${fiscalYear}-911-exp-dr`,
          entryId: closingJeId,
          accountCode: '911',
          debit: check.expenseToClose,
          credit: 0,
        },
        {
          id: `jl-kc-${fiscalYear}-642-cr`,
          entryId: closingJeId,
          accountCode: '642',
          debit: 0,
          credit: check.expenseToClose,
        }
      );
    }

    // 4. Transfer Net Profit/Loss (911 <-> 421)
    const netProfit = check.netProfitToClose;
    if (netProfit > 0) {
      closingLines.push(
        {
          id: `jl-kc-${fiscalYear}-911-profit-dr`,
          entryId: closingJeId,
          accountCode: '911',
          debit: netProfit,
          credit: 0,
        },
        {
          id: `jl-kc-${fiscalYear}-421-profit-cr`,
          entryId: closingJeId,
          accountCode: '421',
          debit: 0,
          credit: netProfit,
        }
      );
    } else if (netProfit < 0) {
      const loss = Math.abs(netProfit);
      closingLines.push(
        {
          id: `jl-kc-${fiscalYear}-421-loss-dr`,
          entryId: closingJeId,
          accountCode: '421',
          debit: loss,
          credit: 0,
        },
        {
          id: `jl-kc-${fiscalYear}-911-loss-cr`,
          entryId: closingJeId,
          accountCode: '911',
          debit: 0,
          credit: loss,
        }
      );
    }

    if (closingLines.length > 0) {
      this.journalEntries.push({
        id: closingJeId,
        date: closingDate,
        referenceNo: closingRef,
        description:
          notes ||
          `Bút toán kết chuyển doanh thu, giá vốn, chi phí và xác định KQKD khóa sổ cuối năm ${fiscalYear}`,
        isReversed: false,
        isClosingEntry: true,
        fiscalYear,
      });
      this.journalLines.push(...closingLines);
    }

    // 5. Snapshot Closing Stock per Warehouse at 31/12/fiscalYear and carry forward to (fiscalYear + 1)-01-01
    const nextYear = fiscalYear + 1;
    const stockSnapshots: OpeningStockItemSnapshot[] = [];
    const nextYearOpeningTxIds: string[] = [];

    const activeWarehouses =
      this.warehouses.length > 0
        ? this.warehouses
        : [{ id: 'wh-1', name: 'Kho Chính' }];

    for (const wh of activeWarehouses) {
      const whNxt = this.getInventoryMovementReport(
        `${fiscalYear}-01-01`,
        `${fiscalYear}-12-31`,
        wh.id
      );

      const whLines: { productId: string; qty: number; unitCost: number }[] = [];

      for (const r of whNxt) {
        stockSnapshots.push({
          productId: r.productId,
          sku: r.sku,
          productName: r.productName,
          uomId: r.uomId,
          warehouseId: wh.id,
          qty: r.closingQty,
          unitCost: r.closingUnitCost,
          totalValue: r.closingValue,
        });
        if (r.closingQty > 0) {
          whLines.push({
            productId: r.productId,
            qty: r.closingQty,
            unitCost: r.closingUnitCost,
          });
        }
      }

      // Create/update official Opening Stock Transaction for nextYear (01/01/nextYear)
      const existingNext = this.getOpeningStockVoucher(nextYear, wh.id);
      if (existingNext.tx) {
        const oldId = existingNext.tx.id;
        this.stockTransactions = this.stockTransactions.filter((t) => t.id !== oldId);
        this.stockTransactionDetails = this.stockTransactionDetails.filter((d) => d.txId !== oldId);
      }

      const nextTxId = `tx-open-${nextYear}-${wh.id}`;
      const whCode = wh.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const nextRef = `SDDK-${nextYear}-${whCode}`;
      let nextSubtotal = 0;

      const nextDetails: StockTransactionDetail[] = whLines.map((l, idx) => {
        const lineTotal = Math.round(l.qty * l.unitCost);
        nextSubtotal += lineTotal;
        return {
          id: `txd-open-${nextYear}-${wh.id}-${idx + 1}`,
          txId: nextTxId,
          productId: l.productId,
          qty: l.qty,
          unitPrice: l.unitCost,
          totalPrice: lineTotal,
          vatRate: 0,
          vatAmount: 0,
        };
      });

      this.stockTransactions.push({
        id: nextTxId,
        type: 'OPENING',
        date: `${nextYear}-01-01`,
        warehouseId: wh.id,
        referenceNo: nextRef,
        vatRate: 0,
        vatType: 'GROUPED',
        subtotal: nextSubtotal,
        vatAmount: 0,
        totalAmount: nextSubtotal,
        isConfirmed: true,
        isReversed: false,
        fiscalYear: nextYear,
        isCarryForward: true,
        linkedClosingYear: fiscalYear,
        notes: `Kết chuyển tự động số dư tồn kho cuối kỳ 31/12/${fiscalYear} sang đầu kỳ 01/01/${nextYear} (${wh.name})`,
      });
      this.stockTransactionDetails.push(...nextDetails);
      nextYearOpeningTxIds.push(nextTxId);
    }

    const closingRecord: FiscalYearClosing = {
      id: `closing-${fiscalYear}`,
      fiscalYear,
      closingDate,
      closedAt: new Date().toISOString(),
      closedBy: this.currentUser?.fullName || 'Quản trị viên (Admin)',
      status: 'LOCKED',
      closingJournalEntryId: closingJeId,
      nextYearOpeningTxIds,
      totalRevenueTransferred: check.revenueToClose,
      totalCogsTransferred: check.cogsToClose,
      totalExpenseTransferred: check.expenseToClose,
      taxAmountTransferred: Math.max(0, Math.round(check.netProfitToClose * 0.2)),
      netProfitTransferred: check.netProfitToClose,
      totalClosingStockQty: check.totalClosingStockQty,
      totalClosingStockValue: check.totalClosingStockValue,
      stockSnapshots,
      notes:
        notes ||
        `Khóa sổ kế toán & kết chuyển tồn kho cuối năm ${fiscalYear} sang đầu kỳ năm ${nextYear}`,
    };

    this.fiscalClosings = (this.fiscalClosings || []).filter((c) => c.fiscalYear !== fiscalYear);
    this.fiscalClosings.push(closingRecord);
    this.fiscalClosings.sort((a, b) => b.fiscalYear - a.fiscalYear);

    this.recalculateAllProductsStock();
    this.saveAll();

    return {
      success: true,
      message: `Đã hoàn tất Kết chuyển cuối năm & Khóa sổ năm ${fiscalYear}! Toàn bộ số dư tồn cuối kỳ ${fiscalYear} (${check.totalClosingStockQty.toLocaleString()} ĐVT - ${check.totalClosingStockValue.toLocaleString()}đ) đã được tự động chuyển sang Số dư tồn đầu kỳ năm ${nextYear} (01/01/${nextYear}).`,
      closingRecord,
    };
  }

  /**
   * Unlocks a closed fiscal year (Admin action) and rolls back the closing journal entry
   * so adjustments can be made and the year re-closed.
   */
  unlockFiscalYear(fiscalYear: number): { success: boolean; message: string } {
    const nextYearLocked = (this.fiscalClosings || []).find(
      (c) => c.fiscalYear === fiscalYear + 1 && c.status === 'LOCKED'
    );
    if (nextYearLocked) {
      return {
        success: false,
        message: `Không thể mở khóa năm ${fiscalYear} vì năm kế tiếp (${fiscalYear + 1}) đã khóa sổ! Vui lòng mở khóa năm ${fiscalYear + 1} trước.`,
      };
    }

    const closingRecord = (this.fiscalClosings || []).find((c) => c.fiscalYear === fiscalYear);
    if (!closingRecord || closingRecord.status !== 'LOCKED') {
      return { success: false, message: `Năm tài chính ${fiscalYear} hiện đang mở, không cần mở khóa.` };
    }

    // Remove closing journal entry
    const closingJeId = closingRecord.closingJournalEntryId || `je-closing-${fiscalYear}`;
    this.journalEntries = this.journalEntries.filter((je) => je.id !== closingJeId);
    this.journalLines = this.journalLines.filter((jl) => jl.entryId !== closingJeId);

    // Update status to UNLOCKED
    closingRecord.status = 'UNLOCKED';
    this.saveAll();

    return {
      success: true,
      message: `Đã mở khóa sổ năm tài chính ${fiscalYear} và gỡ bút toán kết chuyển cuối năm ${fiscalYear}. Sau khi điều chỉnh xong chứng từ, vui lòng thực hiện Kết chuyển & Khóa sổ lại.`,
    };
  }
}
