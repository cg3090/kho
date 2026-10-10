import ExcelJS from 'exceljs';
import { MockDatabase } from '../db/mockDb';
import {
  Product,
  Supplier,
  Customer,
  Warehouse,
  Category,
  Uom,
  Uom as UOM,
  StockTransaction,
  StockTransactionDetail,
  Debt,
} from '../types';

export type ExcelImportType =
  | 'products'
  | 'suppliers'
  | 'customers'
  | 'warehouses'
  | 'categories'
  | 'uoms'
  | 'opening_stock'
  | 'vouchers'
  | 'debts'
  | 'coa';

export interface ExcelTypeMetadata {
  id: ExcelImportType;
  label: string;
  shortLabel: string;
  description: string;
  columns: string[];
  sampleRows: (string | number)[][];
}

export const EXCEL_IMPORT_METADATA: Record<ExcelImportType, ExcelTypeMetadata> = {
  products: {
    id: 'products',
    label: 'Danh mục Hàng hóa / Sản phẩm',
    shortLabel: 'Hàng hóa (Products)',
    description:
      'Tự động khớp hoặc tạo mới Nhóm hàng & Đơn vị tính nếu chưa tồn tại. Hỗ trợ khai báo luôn Tồn đầu kỳ & Giá vốn.',
    columns: [
      'Mã SKU',
      'Tên hàng hóa',
      'Danh mục',
      'ĐVT cơ bản',
      'ĐVT quy đổi phụ',
      'Tỷ lệ quy đổi',
      'Tồn kho ban đầu',
      'Giá vốn bình quân',
      'Mô tả',
    ],
    sampleRows: [
      ['SP001', 'Xi măng Hà Tiên PCB40 (Bao 50kg)', 'Vật liệu xây dựng', 'Bao', 'Tấn', 20, 100, 85000, 'Xi măng đa dụng'],
      ['SP002', 'Thép Hòa Phát Phi 10', 'Sắt thép', 'Cây', 'Bó', 50, 200, 115000, 'Thép xây dựng tiêu chuẩn'],
    ],
  },
  suppliers: {
    id: 'suppliers',
    label: 'Danh mục Nhà cung cấp',
    shortLabel: 'Nhà cung cấp (Suppliers)',
    description: 'Nhập danh sách Nhà cung cấp hàng loạt. Tự động cập nhật nếu trùng Mã số thuế hoặc Tên.',
    columns: ['Tên nhà cung cấp', 'Mã số thuế', 'Số điện thoại', 'Địa chỉ'],
    sampleRows: [
      ['CÔNG TY TNHH VẬT TƯ XÂY DỰNG MIỀN NAM', '0312345678', '0909123456', 'Quận 7, TP. Hồ Chí Minh'],
      ['CÔNG TY CỔ PHẦN THÉP ĐÔNG Á', '0309876543', '0918222333', 'KCN Sóng Thần, Bình Dương'],
    ],
  },
  customers: {
    id: 'customers',
    label: 'Danh mục Khách hàng',
    shortLabel: 'Khách hàng (Customers)',
    description: 'Nhập danh sách Khách hàng mua sỉ/lẻ. Tự động cập nhật nếu trùng Mã số thuế hoặc SĐT.',
    columns: ['Tên khách hàng', 'Mã số thuế', 'Số điện thoại', 'Địa chỉ'],
    sampleRows: [
      ['CÔNG TY CP XÂY DỰNG HÒA BÌNH', '0301122334', '0903888999', 'Quận 3, TP. Hồ Chí Minh'],
      ['Đại lý Vật liệu Minh Phát', '0315566778', '0988777666', 'TP. Thủ Đức, TP. Hồ Chí Minh'],
    ],
  },
  warehouses: {
    id: 'warehouses',
    label: 'Danh mục Kho hàng',
    shortLabel: 'Kho hàng (Warehouses)',
    description: 'Nhập danh sách Kho chứa hàng và địa điểm lưu kho.',
    columns: ['Tên kho', 'Địa chỉ / Vị trí'],
    sampleRows: [
      ['Kho Trung Tâm TP.HCM', 'KCN Tân Bình, TP. Hồ Chí Minh'],
      ['Kho Chi Nhánh Bình Dương', 'KCN VSIP 1, Thuận An, Bình Dương'],
    ],
  },
  categories: {
    id: 'categories',
    label: 'Danh mục Nhóm hàng hóa',
    shortLabel: 'Nhóm hàng (Categories)',
    description: 'Nhập danh sách phân loại Nhóm hàng hóa / Vật tư.',
    columns: ['Tên danh mục', 'Mô tả'],
    sampleRows: [
      ['Vật liệu xây dựng', 'Xi măng, cát, đá, gạch xây dựng'],
      ['Thiết bị điện nước', 'Ống nhựa, dây cáp điện, phụ kiện'],
    ],
  },
  uoms: {
    id: 'uoms',
    label: 'Danh mục Đơn vị tính (ĐVT)',
    shortLabel: 'Đơn vị tính (UOMs)',
    description: 'Nhập các đơn vị tính cơ bản và đơn vị quy đổi (Cái, Hộp, Thùng, Kg, Tấn...).',
    columns: ['Tên đơn vị tính'],
    sampleRows: [['Cái'], ['Hộp'], ['Thùng'], ['Bao'], ['Kg'], ['Tấn']],
  },
  opening_stock: {
    id: 'opening_stock',
    label: 'Số dư Tồn Kho Đầu Kỳ (01/01)',
    shortLabel: 'Tồn kho đầu kỳ',
    description:
      'Nhập số lượng và đơn giá vốn tồn đầu kỳ theo Kho & Năm tài chính. Tự động tạo Mã hàng mới nếu SKU chưa có.',
    columns: [
      'Mã SKU',
      'Tên hàng hóa',
      'ĐVT',
      'Kho hàng',
      'Năm tài chính',
      'Số lượng tồn đầu kỳ',
      'Đơn giá vốn đầu kỳ',
    ],
    sampleRows: [
      ['SP001', 'Xi măng Hà Tiên PCB40 (Bao 50kg)', 'Bao', 'Kho Trung Tâm TP.HCM', new Date().getFullYear(), 150, 85000],
      ['SP002', 'Thép Hòa Phát Phi 10', 'Cây', 'Kho Trung Tâm TP.HCM', new Date().getFullYear(), 300, 115000],
    ],
  },
  vouchers: {
    id: 'vouchers',
    label: 'Chứng từ Nhập / Xuất Kho (PN / PX)',
    shortLabel: 'Chứng từ Kho (PN-PX)',
    description:
      'Nhập hàng loạt chứng từ Phiếu Nhập (PN) hoặc Phiếu Xuất (PX) từ Excel. Các dòng cùng Số chứng từ sẽ được gom thành 1 phiếu.',
    columns: [
      'Số chứng từ',
      'Loại (PN/PX)',
      'Ngày (YYYY-MM-DD)',
      'Kho hàng',
      'Tên Đối tác (NCC/KH)',
      'Mã SKU',
      'Tên hàng hóa',
      'Số lượng',
      'Đơn giá',
      'VAT (%)',
      'Ghi chú',
    ],
    sampleRows: [
      [
        `PN-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-0001`,
        'PN',
        new Date().toISOString().split('T')[0],
        'Kho Trung Tâm TP.HCM',
        'CÔNG TY TNHH VẬT TƯ XÂY DỰNG MIỀN NAM',
        'SP001',
        'Xi măng Hà Tiên PCB40 (Bao 50kg)',
        100,
        85000,
        10,
        'Nhập kho theo HĐ GTGT',
      ],
    ],
  },
  debts: {
    id: 'debts',
    label: 'Công nợ Phải thu (131) & Phải trả (331)',
    shortLabel: 'Công nợ (AP-AR)',
    description: 'Nhập danh sách công nợ Phải trả Nhà cung cấp (AP) hoặc Phải thu Khách hàng (AR) từ Excel.',
    columns: [
      'Loại (AP/AR)',
      'Số chứng từ gốc',
      'Ngày (YYYY-MM-DD)',
      'Tên Đối tác (NCC/KH)',
      'Mã số thuế',
      'Tổng tiền nợ',
      'Đã thanh toán',
      'Hạn thanh toán (YYYY-MM-DD)',
    ],
    sampleRows: [
      ['AP', 'CN-NCC-001', new Date().toISOString().split('T')[0], 'CÔNG TY TNHH VẬT TƯ XÂY DỰNG MIỀN NAM', '0312345678', 50000000, 10000000, '2026-12-31'],
      ['AR', 'CN-KH-001', new Date().toISOString().split('T')[0], 'CÔNG TY CP XÂY DỰNG HÒA BÌNH', '0301122334', 85000000, 0, '2026-12-31'],
    ],
  },
  coa: {
    id: 'coa',
    label: 'Hệ thống Tài khoản Kế toán (COA)',
    shortLabel: 'Tài khoản Kế toán (COA)',
    description: 'Nhập bổ sung danh mục tài khoản kế toán chuẩn Thông tư 133/200.',
    columns: ['Mã tài khoản', 'Tên tài khoản', 'Tính chất (ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE)', 'Tài khoản mẹ'],
    sampleRows: [
      ['151', 'Hàng mua đi đường', 'ASSET', '15'],
      ['152', 'Nguyên liệu, vật liệu', 'ASSET', '15'],
      ['153', 'Công cụ, dụng cụ', 'ASSET', '15'],
      ['155', 'Thành phẩm', 'ASSET', '15'],
      ['1561', 'Giá mua hàng hóa', 'ASSET', '156'],
      ['1562', 'Chi phí thu mua hàng hóa', 'ASSET', '156'],
      ['157', 'Hàng gửi đi bán', 'ASSET', '15'],
      ['3311', 'Phải trả cho người bán trong nước', 'LIABILITY', '331'],
      ['511', 'Doanh thu bán hàng', 'REVENUE', '51'],
      ['521', 'Doanh thu bán hàng bị giảm trừ', 'REVENUE', '52'],
      ['5213', 'Hàng bán bị trả lại', 'REVENUE', '521'],
      ['621', 'Chi phí sản xuất kinh doanh', 'EXPENSE', '62'],
    ],
  },
};

function cleanNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const cleaned = String(val)
    .replace(/[^\d.-]/g, '')
    .trim();
  const num = Number(cleaned);
  return isNaN(num) ? fallback : num;
}

function cleanDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? new Date().toISOString().split('T')[0] : val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    // Excel serial date
    const utcDays = Math.floor(val - 25569);
    const d = new Date(utcDays * 86400 * 1000);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  const str = String(val).trim();
  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  // Match YYYY-MM-DD
  const ymd = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Parses an uploaded File (.xlsx, .xls, .csv) into an array of row arrays.
 */
export async function parseExcelFileToRows(file: File): Promise<any[][]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];
  const rows: any[][] = [];
  worksheet.eachRow((row) => {
    // exceljs values are 1-based; index 0 is always null
    const rawValues: any[] =
      typeof (row as any).values === 'function'
        ? (row as any).values()
        : ((row as any).values || []);
    const values = rawValues.slice(1).map((cell: any) => {
      if (cell === undefined || cell === null) return '';
      if (typeof cell === 'object' && cell !== null && 'text' in cell) {
        return cell.text;
      }
      return cell;
    });
    if (values.some((c) => String(c ?? '').trim() !== '')) {
      rows.push(values);
    }
  });
  return rows;
}

/**
 * Parses pasted text (either Tab-separated directly from Excel or comma-separated CSV) into row arrays.
 */
export function parsePastedTextToRows(text: string): any[][] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '');
  if (lines.length === 0) return [];

  // Detect if Tab-separated (copied from Excel grid)
  const isTabSeparated = lines[0].includes('\t') || (lines.length > 1 && lines[1].includes('\t'));
  if (isTabSeparated) {
    return lines.map((line) => line.split('\t').map((cell) => cell.trim()));
  }

  // Otherwise parse as CSV
  return lines.map((rowStr) => {
    const result: string[] = [];
    let insideQuotes = false;
    let currentField = '';
    for (let i = 0; i < rowStr.length; i++) {
      const char = rowStr[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        result.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    result.push(currentField.trim());
    return result;
  });
}

function isHeaderRow(row: any[], type: ExcelImportType): boolean {
  if (!row || row.length === 0) return false;
  const firstCell = String(row[0] ?? '')
    .toLowerCase()
    .trim();
  const secondCell = String(row[1] ?? '')
    .toLowerCase()
    .trim();

  const headerKeywords = [
    'mã sku',
    'sku',
    'mã hàng',
    'tên nhà cung cấp',
    'tên ncc',
    'tên khách hàng',
    'tên kh',
    'tên kho',
    'tên danh mục',
    'tên đơn vị',
    'đơn vị tính',
    'số chứng từ',
    'loại (ap/ar)',
    'loại công nợ',
    'mã tài khoản',
    'tên hàng hóa',
    'tên sản phẩm',
  ];

  return headerKeywords.some((kw) => firstCell.includes(kw) || secondCell.includes(kw));
}

function findOrCreateCategory(db: MockDatabase, catInput: string): string {
  const clean = String(catInput || '').trim() || 'Hàng hóa chung';
  const existing = db.categories.find(
    (c) => c.id.toLowerCase() === clean.toLowerCase() || c.name.toLowerCase() === clean.toLowerCase()
  );
  if (existing) return existing.id;

  const newCat: Category = {
    id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: clean,
    description: 'Tự động khởi tạo khi Import Excel',
  };
  db.categories.push(newCat);
  return newCat.id;
}

function findOrCreateUom(db: MockDatabase, uomInput: string): string {
  const clean = String(uomInput || '').trim() || 'Cái';
  const existing = db.uoms.find(
    (u) => u.id.toLowerCase() === clean.toLowerCase() || u.name.toLowerCase() === clean.toLowerCase()
  );
  if (existing) return existing.id;

  const newUom: UOM = {
    id: `uom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: clean,
  };
  db.uoms.push(newUom);
  return newUom.id;
}

function findOrCreateWarehouse(db: MockDatabase, whInput: string): string {
  const clean = String(whInput || '').trim() || db.warehouses[0]?.name || 'Kho Chính';
  const existing = db.warehouses.find(
    (w) => w.id.toLowerCase() === clean.toLowerCase() || w.name.toLowerCase() === clean.toLowerCase()
  );
  if (existing) return existing.id;

  const newWh: Warehouse = {
    id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: clean,
    location: 'Kho mặc định',
  };
  db.warehouses.push(newWh);
  return newWh.id;
}

function findOrCreateSupplier(db: MockDatabase, nameInput: string, taxCodeInput = ''): string {
  const cleanName = String(nameInput || '').trim() || 'Nhà cung cấp mặc định';
  const cleanTax = String(taxCodeInput || '').trim();
  const existing = db.suppliers.find(
    (s) =>
      s.id.toLowerCase() === cleanName.toLowerCase() ||
      s.name.toLowerCase() === cleanName.toLowerCase() ||
      (cleanTax && s.taxCode === cleanTax)
  );
  if (existing) return existing.id;

  const newSup: Supplier = {
    id: `sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    taxCode: cleanTax || `MST-${Date.now().toString().slice(-6)}`,
    phone: '',
    address: '',
  };
  db.suppliers.push(newSup);
  return newSup.id;
}

function findOrCreateCustomer(db: MockDatabase, nameInput: string, taxCodeInput = ''): string {
  const cleanName = String(nameInput || '').trim() || 'Khách hàng mặc định';
  const cleanTax = String(taxCodeInput || '').trim();
  const existing = db.customers.find(
    (c) =>
      c.id.toLowerCase() === cleanName.toLowerCase() ||
      c.name.toLowerCase() === cleanName.toLowerCase() ||
      (cleanTax && c.taxCode === cleanTax)
  );
  if (existing) return existing.id;

  const newCus: Customer = {
    id: `cus-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    taxCode: cleanTax || `KH-${Date.now().toString().slice(-6)}`,
    phone: '',
    address: '',
  };
  db.customers.push(newCus);
  return newCus.id;
}

export interface ExcelImportExecutionResult {
  successCount: number;
  errorCount: number;
  logs: { type: 'success' | 'error' | 'info'; text: string }[];
  errors: string[];
}

/**
 * Executes the import of parsed rows into MockDatabase, saves to LocalStorage + Postgres/Firebase,
 * and returns detailed logs.
 */
export function executeExcelRowsImport(
  db: MockDatabase,
  type: ExcelImportType,
  rawRows: any[][],
  options?: { autoConfirmVouchers?: boolean }
): ExcelImportExecutionResult {
  const autoConfirmVouchers = options?.autoConfirmVouchers ?? true;
  const logs: { type: 'success' | 'error' | 'info'; text: string }[] = [];
  const errors: string[] = [];
  let successCount = 0;

  if (!rawRows || rawRows.length === 0) {
    return {
      successCount: 0,
      errorCount: 1,
      logs: [],
      errors: ['Không tìm thấy dữ liệu trong file Excel / vùng văn bản.'],
    };
  }

  const dataRows = isHeaderRow(rawRows[0], type) ? rawRows.slice(1) : rawRows;
  if (dataRows.length === 0) {
    return {
      successCount: 0,
      errorCount: 1,
      logs: [],
      errors: ['File chỉ có dòng tiêu đề, chưa có dòng dữ liệu nào.'],
    };
  }

  if (type === 'products') {
    const openingStockLines: { productId: string; qty: number; unitCost: number }[] = [];

    dataRows.forEach((cols, idx) => {
      const rowNum = idx + 2;
      const sku = String(cols[0] ?? '').trim().toUpperCase();
      const name = String(cols[1] ?? '').trim();
      const catInput = String(cols[2] ?? '').trim() || 'Hàng hóa chung';
      const uomInput = String(cols[3] ?? '').trim() || 'Cái';
      const altUomInput = String(cols[4] ?? '').trim();
      const convRate = cols[5] !== undefined && cols[5] !== '' ? cleanNumber(cols[5], 1) : undefined;
      const initialQty = cleanNumber(cols[6], 0);
      const avgCost = cleanNumber(cols[7], 0);
      const description = String(cols[8] ?? '').trim();

      if (!sku && !name) return;
      if (!sku || !name) {
        errors.push(`Dòng ${rowNum}: Thiếu Mã SKU hoặc Tên hàng hóa.`);
        return;
      }

      const categoryId = findOrCreateCategory(db, catInput);
      const uomId = findOrCreateUom(db, uomInput);
      const altUomId = altUomInput ? findOrCreateUom(db, altUomInput) : undefined;
      const uomConversionRate = altUomId && convRate && convRate > 0 ? convRate : undefined;

      const dupIdx = db.products.findIndex((p) => p.sku.toLowerCase() === sku.toLowerCase());
      const prodId = dupIdx >= 0 ? db.products[dupIdx].id : `prod-${Date.now()}-${rowNum}`;

      const prodObj: Product = {
        id: prodId,
        sku,
        name,
        categoryId,
        uomId,
        altUomId,
        uomConversionRate,
        description,
        currentQty: initialQty > 0 ? initialQty : dupIdx >= 0 ? db.products[dupIdx].currentQty : 0,
        averageCost: avgCost > 0 ? avgCost : dupIdx >= 0 ? db.products[dupIdx].averageCost : 0,
        imageUrl: dupIdx >= 0 ? db.products[dupIdx].imageUrl : undefined,
      };

      if (dupIdx >= 0) {
        db.products[dupIdx] = prodObj;
        logs.push({ type: 'success', text: `Dòng ${rowNum}: Cập nhật SP "${name}" (SKU: ${sku})` });
      } else {
        db.products.push(prodObj);
        logs.push({ type: 'success', text: `Dòng ${rowNum}: Thêm mới SP "${name}" (SKU: ${sku})` });
      }

      if (initialQty > 0) {
        openingStockLines.push({
          productId: prodId,
          qty: initialQty,
          unitCost: avgCost,
        });
      }
      successCount++;
    });

    // If any imported product had initial stock > 0, record in default warehouse opening stock
    if (openingStockLines.length > 0) {
      const defaultWhId = findOrCreateWarehouse(db, db.warehouses[0]?.name || 'Kho Chính');
      const currentYear = new Date().getFullYear();
      const existingOpening = db.getOpeningStockVoucher(currentYear, defaultWhId);
      const mergedMap = new Map<string, { qty: number; unitCost: number }>();
      for (const d of existingOpening.details) {
        mergedMap.set(d.productId, { qty: d.qty, unitCost: d.unitPrice });
      }
      for (const item of openingStockLines) {
        mergedMap.set(item.productId, { qty: item.qty, unitCost: item.unitCost });
      }
      const allLines = Array.from(mergedMap.entries()).map(([productId, val]) => ({
        productId,
        qty: val.qty,
        unitCost: val.unitCost,
      }));
      db.saveOpeningStockBalance({
        fiscalYear: currentYear,
        warehouseId: defaultWhId,
        lines: allLines,
        notes: `Tự động ghi nhận tồn đầu kỳ khi Import Excel Hàng hóa`,
      });
    }
  } else if (type === 'suppliers') {
    dataRows.forEach((cols, idx) => {
      const rowNum = idx + 2;
      const name = String(cols[0] ?? '').trim();
      const taxCode = String(cols[1] ?? '').trim() || `MST-${Date.now().toString().slice(-6)}-${rowNum}`;
      const phone = String(cols[2] ?? '').trim();
      const address = String(cols[3] ?? '').trim();

      if (!name) {
        errors.push(`Dòng ${rowNum}: Thiếu Tên nhà cung cấp.`);
        return;
      }

      const dupIdx = db.suppliers.findIndex(
        (s) => s.taxCode === taxCode || s.name.toLowerCase() === name.toLowerCase()
      );
      const supObj: Supplier = {
        id: dupIdx >= 0 ? db.suppliers[dupIdx].id : `sup-${Date.now()}-${rowNum}`,
        name,
        taxCode,
        phone,
        address,
      };

      if (dupIdx >= 0) {
        db.suppliers[dupIdx] = supObj;
        logs.push({ type: 'success', text: `Dòng ${rowNum}: Cập nhật NCC "${name}" (${taxCode})` });
      } else {
        db.suppliers.push(supObj);
        logs.push({ type: 'success', text: `Dòng ${rowNum}: Thêm mới NCC "${name}" (${taxCode})` });
      }
      successCount++;
    });
  } else if (type === 'customers') {
    dataRows.forEach((cols, idx) => {
      const rowNum = idx + 2;
      const name = String(cols[0] ?? '').trim();
      const taxCode = String(cols[1] ?? '').trim() || `KH-${Date.now().toString().slice(-6)}-${rowNum}`;
      const phone = String(cols[2] ?? '').trim();
      const address = String(cols[3] ?? '').trim();

      if (!name) {
        errors.push(`Dòng ${rowNum}: Thiếu Tên khách hàng.`);
        return;
      }

      const dupIdx = db.customers.findIndex(
        (c) => c.taxCode === taxCode || c.name.toLowerCase() === name.toLowerCase()
      );
      const cusObj: Customer = {
        id: dupIdx >= 0 ? db.customers[dupIdx].id : `cus-${Date.now()}-${rowNum}`,
        name,
        taxCode,
        phone,
        address,
      };

      if (dupIdx >= 0) {
        db.customers[dupIdx] = cusObj;
        logs.push({ type: 'success', text: `Dòng ${rowNum}: Cập nhật KH "${name}" (${taxCode})` });
      } else {
        db.customers.push(cusObj);
        logs.push({ type: 'success', text: `Dòng ${rowNum}: Thêm mới KH "${name}" (${taxCode})` });
      }
      successCount++;
    });
  } else if (type === 'warehouses') {
    dataRows.forEach((cols, idx) => {
      const rowNum = idx + 2;
      const name = String(cols[0] ?? '').trim();
      const location = String(cols[1] ?? '').trim();

      if (!name) {
        errors.push(`Dòng ${rowNum}: Thiếu Tên kho hàng.`);
        return;
      }

      const dupIdx = db.warehouses.findIndex((w) => w.name.toLowerCase() === name.toLowerCase());
      const whObj: Warehouse = {
        id: dupIdx >= 0 ? db.warehouses[dupIdx].id : `wh-${Date.now()}-${rowNum}`,
        name,
        location,
      };

      if (dupIdx >= 0) {
        db.warehouses[dupIdx] = whObj;
        logs.push({ type: 'success', text: `Dòng ${rowNum}: Cập nhật Kho "${name}"` });
      } else {
        db.warehouses.push(whObj);
        logs.push({ type: 'success', text: `Dòng ${rowNum}: Thêm mới Kho "${name}"` });
      }
      successCount++;
    });
  } else if (type === 'categories') {
    dataRows.forEach((cols, idx) => {
      const rowNum = idx + 2;
      const name = String(cols[0] ?? '').trim();
      const description = String(cols[1] ?? '').trim();

      if (!name) {
        errors.push(`Dòng ${rowNum}: Thiếu Tên danh mục nhóm hàng.`);
        return;
      }

      const dupIdx = db.categories.findIndex((c) => c.name.toLowerCase() === name.toLowerCase());
      const catObj: Category = {
        id: dupIdx >= 0 ? db.categories[dupIdx].id : `cat-${Date.now()}-${rowNum}`,
        name,
        description,
      };

      if (dupIdx >= 0) {
        db.categories[dupIdx] = catObj;
        logs.push({ type: 'success', text: `Dòng ${rowNum}: Cập nhật Nhóm hàng "${name}"` });
      } else {
        db.categories.push(catObj);
        logs.push({ type: 'success', text: `Dòng ${rowNum}: Thêm mới Nhóm hàng "${name}"` });
      }
      successCount++;
    });
  } else if (type === 'uoms') {
    dataRows.forEach((cols, idx) => {
      const rowNum = idx + 2;
      const name = String(cols[0] ?? '').trim();

      if (!name) {
        errors.push(`Dòng ${rowNum}: Thiếu Tên đơn vị tính.`);
        return;
      }

      const dupIdx = db.uoms.findIndex((u) => u.name.toLowerCase() === name.toLowerCase());
      const uomObj: UOM = {
        id: dupIdx >= 0 ? db.uoms[dupIdx].id : `uom-${Date.now()}-${rowNum}`,
        name,
      };

      if (dupIdx >= 0) {
        db.uoms[dupIdx] = uomObj;
        logs.push({ type: 'success', text: `Dòng ${rowNum}: Cập nhật ĐVT "${name}"` });
      } else {
        db.uoms.push(uomObj);
        logs.push({ type: 'success', text: `Dòng ${rowNum}: Thêm mới ĐVT "${name}"` });
      }
      successCount++;
    });
  } else if (type === 'opening_stock') {
    // Group by (fiscalYear, warehouseId)
    const grouped = new Map<string, { fiscalYear: number; warehouseId: string; items: { productId: string; qty: number; unitCost: number }[] }>();

    dataRows.forEach((cols, idx) => {
      const rowNum = idx + 2;
      const sku = String(cols[0] ?? '').trim().toUpperCase();
      const prodName = String(cols[1] ?? '').trim() || sku;
      const uomInput = String(cols[2] ?? '').trim() || 'Cái';
      const whInput = String(cols[3] ?? '').trim() || db.warehouses[0]?.name || 'Kho Chính';
      const fiscalYear = cleanNumber(cols[4], new Date().getFullYear());
      const qty = cleanNumber(cols[5], 0);
      const unitCost = cleanNumber(cols[6], 0);

      if (!sku) {
        errors.push(`Dòng ${rowNum}: Thiếu Mã SKU hàng hóa.`);
        return;
      }

      const warehouseId = findOrCreateWarehouse(db, whInput);
      const uomId = findOrCreateUom(db, uomInput);

      let prod = db.products.find((p) => p.sku.toLowerCase() === sku.toLowerCase());
      if (!prod) {
        const catId = findOrCreateCategory(db, 'Hàng hóa chung');
        prod = {
          id: `prod-${Date.now()}-${rowNum}`,
          sku,
          name: prodName,
          categoryId: catId,
          uomId,
          description: 'Khởi tạo từ Import Tồn đầu kỳ',
          currentQty: qty,
          averageCost: unitCost,
        };
        db.products.push(prod);
      }

      const groupKey = `${fiscalYear}__${warehouseId}`;
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, { fiscalYear, warehouseId, items: [] });
      }
      grouped.get(groupKey)!.items.push({
        productId: prod.id,
        qty,
        unitCost,
      });
      logs.push({
        type: 'success',
        text: `Dòng ${rowNum}: Tồn đầu kỳ ${sku} (${prod.name}) = ${qty.toLocaleString()} x ${unitCost.toLocaleString()}đ`,
      });
      successCount++;
    });

    for (const group of grouped.values()) {
      const existing = db.getOpeningStockVoucher(group.fiscalYear, group.warehouseId);
      const lineMap = new Map<string, { qty: number; unitCost: number }>();
      for (const d of existing.details) {
        lineMap.set(d.productId, { qty: d.qty, unitCost: d.unitPrice });
      }
      for (const item of group.items) {
        lineMap.set(item.productId, { qty: item.qty, unitCost: item.unitCost });
      }
      const lines = Array.from(lineMap.entries()).map(([productId, v]) => ({
        productId,
        qty: v.qty,
        unitCost: v.unitCost,
      }));
      db.saveOpeningStockBalance({
        fiscalYear: group.fiscalYear,
        warehouseId: group.warehouseId,
        lines,
        notes: `Import Tồn kho đầu kỳ năm ${group.fiscalYear} từ Excel`,
      });
    }
  } else if (type === 'vouchers') {
    // Group rows by referenceNo
    const txGroups = new Map<
      string,
      {
        referenceNo: string;
        docType: 'IN' | 'OUT';
        date: string;
        warehouseId: string;
        partnerId: string;
        vatRate: number;
        notes: string;
        lines: { productId: string; qty: number; unitPrice: number }[];
      }
    >();

    dataRows.forEach((cols, idx) => {
      const rowNum = idx + 2;
      const refNo = String(cols[0] ?? '').trim().toUpperCase();
      const rawType = String(cols[1] ?? 'PN').trim().toUpperCase();
      const docType: 'IN' | 'OUT' = rawType === 'PX' || rawType === 'OUT' || rawType === 'XUẤT' ? 'OUT' : 'IN';
      const date = cleanDate(cols[2]);
      const whInput = String(cols[3] ?? '').trim();
      const partnerInput = String(cols[4] ?? '').trim();
      const sku = String(cols[5] ?? '').trim().toUpperCase();
      const prodName = String(cols[6] ?? '').trim() || sku;
      const qty = cleanNumber(cols[7], 0);
      const unitPrice = cleanNumber(cols[8], 0);
      const vatRate = cleanNumber(cols[9], db.systemConfig?.defaultVatRate ?? 10);
      const notes = String(cols[10] ?? '').trim();

      if (!refNo || !sku || qty <= 0) {
        errors.push(`Dòng ${rowNum}: Thiếu Số chứng từ, Mã SKU hoặc Số lượng <= 0.`);
        return;
      }

      const warehouseId = findOrCreateWarehouse(db, whInput);
      const partnerId =
        docType === 'IN'
          ? findOrCreateSupplier(db, partnerInput)
          : findOrCreateCustomer(db, partnerInput);

      let prod = db.products.find((p) => p.sku.toLowerCase() === sku.toLowerCase());
      if (!prod) {
        prod = {
          id: `prod-${Date.now()}-${rowNum}`,
          sku,
          name: prodName,
          categoryId: findOrCreateCategory(db, 'Hàng hóa chung'),
          uomId: findOrCreateUom(db, 'Cái'),
          description: 'Khởi tạo từ Import Chứng từ',
          currentQty: 0,
          averageCost: unitPrice,
        };
        db.products.push(prod);
      }

      if (!txGroups.has(refNo)) {
        txGroups.set(refNo, {
          referenceNo: refNo,
          docType,
          date,
          warehouseId,
          partnerId,
          vatRate,
          notes,
          lines: [],
        });
      }
      txGroups.get(refNo)!.lines.push({
        productId: prod.id,
        qty,
        unitPrice,
      });
      successCount++;
    });

    for (const grp of txGroups.values()) {
      // Remove existing draft/voucher with same referenceNo if re-importing
      const existingTx = db.stockTransactions.find((t) => t.referenceNo === grp.referenceNo);
      const txId = existingTx ? existingTx.id : `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      if (existingTx) {
        db.stockTransactions = db.stockTransactions.filter((t) => t.id !== txId);
        db.stockTransactionDetails = db.stockTransactionDetails.filter((d) => d.txId !== txId);
      }

      let subtotal = 0;
      const details: StockTransactionDetail[] = grp.lines.map((l, idx) => {
        const lineTotal = Math.round(l.qty * l.unitPrice);
        const lineVat = Math.round(lineTotal * (grp.vatRate / 100));
        subtotal += lineTotal;
        return {
          id: `txd-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
          txId,
          productId: l.productId,
          qty: l.qty,
          unitPrice: l.unitPrice,
          totalPrice: lineTotal,
          vatRate: grp.vatRate,
          vatAmount: lineVat,
        };
      });

      const vatAmount = Math.round(subtotal * (grp.vatRate / 100));
      const newTx: StockTransaction = {
        id: txId,
        type: grp.docType,
        date: grp.date,
        warehouseId: grp.warehouseId,
        supplierId: grp.docType === 'IN' ? grp.partnerId : undefined,
        customerId: grp.docType === 'OUT' ? grp.partnerId : undefined,
        referenceNo: grp.referenceNo,
        vatRate: grp.vatRate,
        vatType: 'ITEMIZED',
        subtotal,
        vatAmount,
        totalAmount: subtotal + vatAmount,
        isConfirmed: false,
        isReversed: false,
        notes: grp.notes || `Import từ Excel (${grp.lines.length} mặt hàng)`,
      };

      db.stockTransactions.push(newTx);
      db.stockTransactionDetails.push(...details);

      if (autoConfirmVouchers) {
        const confirmRes =
          grp.docType === 'IN' ? db.confirmStockIn(txId) : db.confirmStockOut(txId);
        if (confirmRes.success) {
          logs.push({
            type: 'success',
            text: `Đã tạo & HẠCH TOÁN NGAY chứng từ ${grp.referenceNo} (${grp.docType === 'IN' ? 'Phiếu Nhập' : 'Phiếu Xuất'}) gồm ${grp.lines.length} dòng hàng — Tổng: ${(subtotal + vatAmount).toLocaleString()}đ`,
          });
        } else {
          logs.push({
            type: 'info',
            text: `Đã lưu nháp chứng từ ${grp.referenceNo} (${confirmRes.message})`,
          });
        }
      } else {
        logs.push({
          type: 'success',
          text: `Đã tạo bản nháp chứng từ ${grp.referenceNo} (${grp.docType === 'IN' ? 'Phiếu Nhập' : 'Phiếu Xuất'}) gồm ${grp.lines.length} dòng hàng — Tổng: ${(subtotal + vatAmount).toLocaleString()}đ`,
        });
      }
    }
  } else if (type === 'debts') {
    dataRows.forEach((cols, idx) => {
      const rowNum = idx + 2;
      const rawType = String(cols[0] ?? 'AP').trim().toUpperCase();
      const debtType: 'AP' | 'AR' = rawType === 'AR' || rawType.includes('THU') ? 'AR' : 'AP';
      const refNo = String(cols[1] ?? '').trim().toUpperCase() || `CN-${Date.now()}-${rowNum}`;
      const date = cleanDate(cols[2]);
      const partnerName = String(cols[3] ?? '').trim();
      const taxCode = String(cols[4] ?? '').trim();
      const amount = cleanNumber(cols[5], 0);
      const paidAmount = cleanNumber(cols[6], 0);
      const dueDate = cols[7] ? cleanDate(cols[7]) : undefined;

      if (!partnerName || amount <= 0) {
        errors.push(`Dòng ${rowNum}: Thiếu Tên đối tác hoặc Tổng tiền nợ <= 0.`);
        return;
      }

      const partnerId =
        debtType === 'AP'
          ? findOrCreateSupplier(db, partnerName, taxCode)
          : findOrCreateCustomer(db, partnerName, taxCode);

      const status: 'UNPAID' | 'PARTIAL' | 'PAID' =
        paidAmount >= amount ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

      const dupIdx = db.debts.findIndex((d) => d.referenceNo === refNo && d.type === debtType);
      const debtObj: Debt = {
        id: dupIdx >= 0 ? db.debts[dupIdx].id : `debt-${Date.now()}-${rowNum}`,
        txId: dupIdx >= 0 ? db.debts[dupIdx].txId : `tx-excel-${refNo}`,
        partnerId,
        type: debtType,
        referenceNo: refNo,
        date,
        dueDate,
        amount,
        paidAmount,
        status,
        isReversed: false,
      };

      if (dupIdx >= 0) {
        db.debts[dupIdx] = debtObj;
        logs.push({ type: 'success', text: `Dòng ${rowNum}: Cập nhật công nợ ${refNo} (${partnerName})` });
      } else {
        db.debts.push(debtObj);
        logs.push({ type: 'success', text: `Dòng ${rowNum}: Thêm mới công nợ ${refNo} (${partnerName}) — ${amount.toLocaleString()}đ` });
      }
      successCount++;
    });
  } else if (type === 'coa') {
    dataRows.forEach((cols, idx) => {
      const rowNum = idx + 2;
      const code = String(cols[0] ?? '').trim();
      const name = String(cols[1] ?? '').trim();
      const rawType = String(cols[2] ?? 'ASSET').trim().toUpperCase();
      const validTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'OFF_BALANCE'];
      const accType = (validTypes.includes(rawType) ? rawType : 'ASSET') as any;
      const parentCode = String(cols[3] ?? '').trim() || undefined;

      if (!code || !name) {
        errors.push(`Dòng ${rowNum}: Thiếu Mã tài khoản hoặc Tên tài khoản.`);
        return;
      }

      const dupIdx = db.coa.findIndex((a) => a.code === code);
      if (dupIdx >= 0) {
        db.coa[dupIdx] = {
          ...db.coa[dupIdx],
          name,
          type: accType,
          parentCode,
        };
        logs.push({ type: 'success', text: `Dòng ${rowNum}: Cập nhật TK ${code} - ${name}` });
      } else {
        db.coa.push({
          code,
          name,
          type: accType,
          parentCode,
          isCustom: true,
        });
        logs.push({ type: 'success', text: `Dòng ${rowNum}: Thêm mới TK ${code} - ${name}` });
      }
      successCount++;
    });
  }

  if (successCount > 0) {
    db.ensureDefaultWebshopConfigs();
    db.saveAll();
  }

  return {
    successCount,
    errorCount: errors.length,
    logs,
    errors,
  };
}

function sanitizeSheetName(rawName: string, fallback = 'Sheet1'): string {
  const cleaned = String(rawName || fallback)
    .replace(/[:\\/?*\[\]]/g, '-')
    .replace(/^'+|'+$/g, '')
    .trim();
  return (cleaned || fallback).slice(0, 31);
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }, 1500);
}

async function writeAndDownloadWorkbook(wb: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer as unknown as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerBlobDownload(blob, filename);
}

/** Builds a workbook from rows of plain values (array-of-arrays). */
function buildWorkbookFromRows(
  sheets: { name: string; rows: (string | number)[][]; widths?: number[] }[]
): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name);
    for (const row of sheet.rows) {
      ws.addRow(row);
    }
    if (sheet.widths && sheet.widths.length > 0) {
      sheet.widths.forEach((w, i) => {
        ws.getColumn(i + 1).width = w;
      });
    }
  }
  return wb;
}

/**
 * Downloads a formatted .xlsx template file for the given import type.
 */
export async function downloadExcelTemplate(type: ExcelImportType): Promise<void> {
  const safeType: ExcelImportType = EXCEL_IMPORT_METADATA[type] ? type : 'products';
  const meta = EXCEL_IMPORT_METADATA[safeType];
  const wb = buildWorkbookFromRows([
    {
      name: sanitizeSheetName(meta.shortLabel, `Mau_${safeType}`),
      rows: [meta.columns, ...meta.sampleRows],
      widths: meta.columns.map((col) => Math.max(col.length + 6, 18)),
    },
  ]);
  await writeAndDownloadWorkbook(wb, `Mau_Import_${safeType.toUpperCase()}.xlsx`);
}

/**
 * Downloads a UTF-8 BOM .csv template file for the given import type.
 */
export function downloadCsvTemplate(type: ExcelImportType): void {
  const safeType: ExcelImportType = EXCEL_IMPORT_METADATA[type] ? type : 'products';
  const meta = EXCEL_IMPORT_METADATA[safeType];
  const escapeCsvCell = (val: string | number) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csvLines = [
    meta.columns.map(escapeCsvCell).join(','),
    ...meta.sampleRows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  const csvContent = csvLines.join('\r\n');
  const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  triggerBlobDownload(blob, `Mau_Import_${safeType.toUpperCase()}.csv`);
}

/**
 * Exports any entity or the entire ERP database to a real .xlsx workbook.
 */
export async function exportDataToExcel(
  db: MockDatabase,
  target: ExcelImportType | 'transactions' | 'all_workbook'
): Promise<void> {
  const dateStr = new Date().toISOString().split('T')[0];
  const sheets: { name: string; rows: (string | number)[][]; widths?: number[] }[] = [];

  const appendSheet = (name: string, headers: string[], rows: (string | number)[][]) => {
    sheets.push({
      name: sanitizeSheetName(name),
      rows: [headers, ...rows],
      widths: headers.map((h) => Math.max(String(h).length + 5, 16)),
    });
  };

  if (target === 'products' || target === 'all_workbook') {
    appendSheet(
      'San_Pham',
      EXCEL_IMPORT_METADATA.products.columns,
      db.products.map((p) => [
        p.sku,
        p.name,
        db.categories.find((c) => c.id === p.categoryId)?.name || p.categoryId,
        db.uoms.find((u) => u.id === p.uomId)?.name || p.uomId,
        p.altUomId ? db.uoms.find((u) => u.id === p.altUomId)?.name || p.altUomId : '',
        p.uomConversionRate || '',
        p.currentQty,
        p.averageCost,
        p.description || '',
      ])
    );
  }

  if (target === 'suppliers' || target === 'all_workbook') {
    appendSheet(
      'Nha_Cung_Cap',
      EXCEL_IMPORT_METADATA.suppliers.columns,
      db.suppliers.map((s) => [s.name, s.taxCode, s.phone, s.address])
    );
  }

  if (target === 'customers' || target === 'all_workbook') {
    appendSheet(
      'Khach_Hang',
      EXCEL_IMPORT_METADATA.customers.columns,
      db.customers.map((c) => [c.name, c.taxCode, c.phone, c.address])
    );
  }

  if (target === 'warehouses' || target === 'all_workbook') {
    appendSheet(
      'Kho_Hang',
      EXCEL_IMPORT_METADATA.warehouses.columns,
      db.warehouses.map((w) => [w.name, w.location])
    );
  }

  if (target === 'categories' || target === 'all_workbook') {
    appendSheet(
      'Nhom_Hang',
      EXCEL_IMPORT_METADATA.categories.columns,
      db.categories.map((c) => [c.name, c.description])
    );
  }

  if (target === 'uoms' || target === 'all_workbook') {
    appendSheet(
      'Don_Vi_Tinh',
      EXCEL_IMPORT_METADATA.uoms.columns,
      db.uoms.map((u) => [u.name])
    );
  }

  if (target === 'transactions' || target === 'vouchers' || target === 'all_workbook') {
    appendSheet(
      'Chung_Tu_Kho',
      ['Số Phiếu', 'Loại', 'Ngày', 'Kho', 'Đối Tác', 'Tiền Chưa Thuế', 'Thuế VAT', 'Tổng Thanh Toán', 'Trạng Thái', 'Ghi Chú'],
      db.stockTransactions.map((t) => {
        const partner =
          t.type === 'IN'
            ? db.suppliers.find((s) => s.id === t.supplierId)?.name || ''
            : db.customers.find((c) => c.id === t.customerId)?.name || '';
        return [
          t.referenceNo,
          t.type === 'IN' ? 'Phiếu Nhập' : t.type === 'OUT' ? 'Phiếu Xuất' : 'Tồn Đầu Kỳ',
          t.date,
          db.warehouses.find((w) => w.id === t.warehouseId)?.name || t.warehouseId,
          partner,
          t.subtotal,
          t.vatAmount,
          t.totalAmount,
          t.isReversed ? 'Đảo Hủy' : t.isConfirmed ? 'Đã Xác Nhận' : 'Bản Nháp',
          t.notes || '',
        ];
      })
    );
  }

  if (target === 'debts' || target === 'all_workbook') {
    appendSheet(
      'Cong_No',
      EXCEL_IMPORT_METADATA.debts.columns,
      db.debts.map((d) => {
        const partnerObj =
          d.type === 'AP'
            ? db.suppliers.find((s) => s.id === d.partnerId)
            : db.customers.find((c) => c.id === d.partnerId);
        return [
          d.type,
          d.referenceNo,
          d.date,
          partnerObj?.name || d.partnerId,
          partnerObj?.taxCode || '',
          d.amount,
          d.paidAmount,
          d.dueDate || '',
        ];
      })
    );
  }

  if (target === 'coa' || target === 'all_workbook') {
    appendSheet(
      'He_Thong_Tai_Khoan',
      EXCEL_IMPORT_METADATA.coa.columns,
      db.coa.map((a) => [a.code, a.name, a.type, a.parentCode || ''])
    );
  }

  if (target === 'opening_stock') {
    const whName = db.warehouses[0]?.name || 'Kho Chính';
    const year = new Date().getFullYear();
    appendSheet(
      'Ton_Kho_Dau_Ky',
      EXCEL_IMPORT_METADATA.opening_stock.columns,
      db.products.map((p) => [
        p.sku,
        p.name,
        db.uoms.find((u) => u.id === p.uomId)?.name || 'Cái',
        whName,
        year,
        p.currentQty,
        p.averageCost,
      ])
    );
  }

  const filename =
    target === 'all_workbook'
      ? `ERP_Full_Database_${dateStr}.xlsx`
      : `Export_${target.toUpperCase()}_${dateStr}.xlsx`;
  const wb = buildWorkbookFromRows(sheets);
  await writeAndDownloadWorkbook(wb, filename);
}
