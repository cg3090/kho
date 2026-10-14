/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Uom {
  id: string;
  name: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location?: string;
}

export interface Supplier {
  id: string;
  name: string;
  taxCode: string;
  phone?: string;
  address?: string;
}

export interface Customer {
  id: string;
  name: string;
  taxCode: string;
  phone?: string;
  address?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  uomId: string; // Base UOM
  altUomId?: string; // Alternative UOM (e.g. Box, Pack)
  uomConversionRate?: number; // e.g. 1 Alt UOM = 12 Base UOMs
  description?: string;
  currentQty: number;
  averageCost: number; // Weighted Average Cost
  imageUrl?: string; // Optional product image as a URL/Base64
}

export interface Quotation {
  id: string;
  referenceNo: string; // BG-YYMMDD-XXX
  date: string;
  customerId: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  notes?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface QuotationDetail {
  id: string;
  quotationId: string;
  productId: string;
  qty: number; // Qty in Alt UOM or Base UOM
  uomId: string; // UOM chosen (either base or alt)
  unitPrice: number; // Unit price for chosen UOM
  totalPrice: number;
  conversionRate: number; // Rate to convert to base (e.g. 1 if base, or rate if alt)
}

export interface AccountMapping {
  key: string; // STOCK_IN, AR_PAYMENT, AP_PAYMENT, SALE, COGS, VAT_INPUT, VAT_OUTPUT
  accountCode: string;
  description: string;
}

export interface ChartOfAccount {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'OFF_BALANCE';
  parentCode?: string;
  isCustom?: boolean;
}

export type TransactionType = 'IN' | 'OUT' | 'OPENING';

export interface StockTransaction {
  id: string;
  type: TransactionType;
  date: string;
  warehouseId: string;
  supplierId?: string; // For IN
  customerId?: string; // For OUT
  referenceNo: string;
  vatRate: number; // e.g. 0.05, 0.08, 0.10, 0
  vatType: 'GROUPED' | 'ITEMIZED';
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  isConfirmed: boolean;
  isReversed: boolean;
  reversalReference?: string;
  notes?: string;
  prepaidAmount?: number; // Prepayment recorded during invoice creation
  prepaidMethod?: 'CASH' | 'BANK'; // Prepayment payment method
  dueDate?: string; // Expected payment due date
  fiscalYear?: number; // Năm tài chính áp dụng (dùng cho chứng từ OPENING)
  isCarryForward?: boolean; // Đánh dấu số dư đầu kỳ được kết chuyển/đối chiếu từ cuối kỳ năm trước (không cộng trùng vào tồn lũy kế)
  linkedClosingYear?: number; // Năm tài chính trước đó đã kết chuyển sang
}

export interface StockTransactionDetail {
  id: string;
  txId: string;
  productId: string;
  qty: number; // Base quantity (converted)
  unitPrice: number; // Base unit price
  totalPrice: number;
  vatRate: number;
  vatAmount: number;
  altUomId?: string; // Optional: Chosen alternative UOM
  altQty?: number; // Optional: Quantity in alternative UOM
  altUnitPrice?: number; // Optional: Unit price for alternative UOM
  cogsUnitCost?: number; // Only for OUT, calculated at confirm
  cogsTotal?: number;   // Only for OUT, calculated at confirm
  cartonQty?: number;   // Optional: "Thùng" (cartons/box) count for PX and printing
}

export interface JournalEntry {
  id: string;
  date: string;
  referenceNo: string;
  description: string;
  isReversed: boolean;
  reversalReference?: string;
  isClosingEntry?: boolean; // Bút toán kết chuyển cuối năm (KC-...)
  fiscalYear?: number;
}

export interface OpeningStockItemSnapshot {
  productId: string;
  sku: string;
  productName: string;
  uomId: string;
  warehouseId: string;
  qty: number;
  unitCost: number;
  totalValue: number;
}

export interface FiscalYearClosing {
  id: string;
  fiscalYear: number;
  closingDate: string; // YYYY-12-31
  closedAt: string;
  closedBy: string;
  status: 'LOCKED' | 'UNLOCKED';
  closingJournalEntryId: string;
  nextYearOpeningTxIds: string[];
  totalRevenueTransferred: number;
  totalCogsTransferred: number;
  totalExpenseTransferred: number;
  taxAmountTransferred: number;
  netProfitTransferred: number;
  totalClosingStockQty: number;
  totalClosingStockValue: number;
  stockSnapshots: OpeningStockItemSnapshot[];
  notes?: string;
}

export interface InventoryNxtRow {
  productId: string;
  sku: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  uomId: string;
  uomName: string;
  altUomId?: string;
  altUomName?: string;
  uomConversionRate?: number;
  warehouseId: string;
  warehouseName: string;
  openingQty: number;
  openingUnitCost: number;
  openingValue: number;
  inQty: number;
  inValue: number;
  outQty: number;
  outValue: number;
  outRevenue: number;
  closingQty: number;
  closingUnitCost: number;
  closingValue: number;
}

export interface JournalEntryLine {
  id: string;
  entryId: string;
  accountCode: string;
  debit: number;
  credit: number;
  partnerId?: string; // Supplier ID or Customer ID
  partnerType?: 'SUPPLIER' | 'CUSTOMER';
}

export interface Debt {
  id: string;
  type: 'AP' | 'AR';
  partnerId: string; // Supplier ID (for AP) or Customer ID (for AR)
  txId: string; // Refers to StockTransaction
  referenceNo: string;
  date: string;
  amount: number;
  paidAmount: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID';
  isReversed: boolean;
  reversalReference?: string;
  dueDate?: string; // Expected payment due date
}

export interface Payment {
  id: string;
  type: 'RECEIVE' | 'PAY';
  debtId?: string; // Opt linking to a debt invoice
  partnerId: string;
  partnerType: 'SUPPLIER' | 'CUSTOMER';
  date: string;
  amount: number;
  method: 'CASH' | 'BANK' | 'OTHER';
  referenceNo: string;
  notes?: string;
}

export interface VatLedgerEntry {
  id: string;
  type: 'INPUT' | 'OUTPUT';
  date: string;
  txId: string;
  invoiceNo: string;
  partnerName: string;
  partnerTaxCode: string;
  amountBeforeVat: number;
  vatRate: number;
  vatAmount: number;
  accountCode: string;
  isReversed: boolean;
}

export interface CompanyInfo {
  name: string;
  taxCode: string;
  address: string;
  bankAccount: string;
  bankName: string;
  logoUrl?: string;
}

export interface SystemConfig {
  allowNegativeStock: boolean;
  defaultVatRate: number;
  autoApproveQuotation: boolean;
  themeColor: string;
}

export interface SequenceConfig {
  type: string; // 'PN', 'PX', 'BG', 'PT', 'PC'
  prefix: string;
  digits: number;
  currentNumber: number;
}

export interface PrintTemplate {
  type: string; // 'PN', 'PX', 'BG', 'PT', 'PC'
  name: string;
  title: string;
  headerHtml: string;
  footerHtml: string;
}

export interface Permission {
  key: string;
  name: string;
  module: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  isSystem?: boolean;
  permissions: string[];
}

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  email: string;
  phone?: string;
  roleId: string;
  status: 'ACTIVE' | 'LOCKED';
  avatarUrl?: string;
  createdAt: string;
  lastLogin?: string;
  mustChangePassword?: boolean;
  isTemporaryPassword?: boolean;
}

export interface WebshopOrderItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  qty: number;
  uomId: string;
  uomName: string;
  unitPrice: number;
  totalPrice: number;
}

export type WebshopOrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
export type WebshopPaymentMethod = 'COD' | 'BANK_TRANSFER' | 'CASH';
export type WebshopPaymentStatus = 'UNPAID' | 'PAID';

export interface WebshopOrder {
  id: string;
  orderCode: string; // WS-YYMMDD-XXX
  date: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress: string;
  customerId?: string; // Liên kết với danh mục khách hàng
  shippingMethod: 'STANDARD' | 'EXPRESS' | 'STORE_PICKUP';
  paymentMethod: WebshopPaymentMethod;
  paymentStatus: WebshopPaymentStatus;
  orderStatus: WebshopOrderStatus;
  warehouseId: string; // Kho xuất hàng thực tế
  items: WebshopOrderItem[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  stockTxId?: string; // ID của Phiếu Xuất Kho (PX) liên kết
  accountId?: string; // ID tài khoản khách hàng đã đặt (nếu đăng nhập)
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WebshopProductConfig {
  productId: string;
  isPublished: boolean;
  retailPrice: number;
  promoPrice?: number;
  isFeatured?: boolean;
  badge?: string; // 'HOT' | 'MỚI' | 'GIẢM GIÁ' | 'BÁN CHẠY'
  shortDescription?: string;
}

export interface WebshopCustomerAccount {
  id: string;
  username: string;
  email: string;
  phone: string;
  fullName: string;
  address?: string;
  password: string; // Hashed via toStoredPassword
  createdAt: string;
  lastLogin?: string;
  wishlist: string[] // Product IDs
  customerId?: string; // Liên kết với danh mục khách hàng
}

export interface WebshopStoreConfig {
  storeName: string;
  storeSlogan: string;
  hotline: string;
  email: string;
  address: string;
  defaultWarehouseId: string;
  autoCreateStockOut: boolean; // Tự động tạo phiếu xuất kho khi duyệt đơn
  allowOrderWhenOutOfStock: boolean; // Cho phép đặt hàng khi tồn = 0
  bankName: string;
  bankAccount: string;
  bankOwner: string;
  bannerTitle?: string;
  bannerSubtitle?: string;
  zaloNumber?: string; // Số điện thoại hoặc link Zalo hỗ trợ
  supportHours?: string; // Khung giờ hỗ trợ khách hàng
  chatWelcomeMessage?: string; // Lời chào tự động khi mở hộp chat
  enableSupportWidget?: boolean; // Bật widget hỗ trợ (Hotline/Zalo/Chat)
}
