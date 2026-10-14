import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Building2,
  Settings2,
  FileCode,
  FileText,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Code,
  Eye,
  FileSpreadsheet,
  Plus,
  Trash2,
  Binary,
  HelpCircle,
  Copy,
  Printer,
  Database,
  Server,
  ShieldCheck,
  Unplug,
  Cloud,
  Zap,
  ExternalLink,
  Globe,
  Check,
  BookOpen,
  X
} from 'lucide-react';
import { MockDatabase } from '../db/mockDb';
import { CompanyInfo, SystemConfig, SequenceConfig, PrintTemplate } from '../types';
import { applyThemeColor, buildThemePalette, DEFAULT_THEME_COLOR } from '../utils/theme';
import { authFetch } from '../utils/authClient';
import { sanitizeTemplateHtml } from '../utils/sanitizeHtml';
import {
  ExcelImportType,
  EXCEL_IMPORT_METADATA,
  downloadExcelTemplate,
  downloadCsvTemplate,
  parseExcelFileToRows,
  parsePastedTextToRows,
  executeExcelRowsImport,
  exportDataToExcel,
} from '../utils/excelHelper';

const THEME_PRESETS = [
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Xanh ngọc', hex: '#0d9488' },
  { name: 'Xanh dương', hex: '#3b82f6' },
  { name: 'Xanh thiên', hex: '#0ea5e9' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Tím', hex: '#8b5cf6' },
  { name: 'Hồng', hex: '#ec4899' },
  { name: 'Đỏ', hex: '#f43f5e' },
  { name: 'Cam', hex: '#f97316' },
  { name: 'Hổ phách', hex: '#f59e0b' },
  { name: 'Xám', hex: '#64748b' },
  { name: 'Xám đậm', hex: '#475569' },
];

interface SettingsProps {
  db: MockDatabase;
  onUpdate: () => void;
  updateTrigger?: any;
}

// Client-side canvas-based image compression utility
function compressImage(base64Str: string, maxWidth = 300, maxHeight = 100): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8)); // compressed as JPEG, 80% quality
    };
    img.onerror = () => resolve(base64Str);
  });
}

export default function Settings({ db, onUpdate }: SettingsProps) {
  const [activeSubTab, setActiveSubTabState] = useState<'company' | 'general' | 'sequence' | 'templates' | 'data' | 'database'>(() => {
    try {
      const saved = sessionStorage.getItem('wms_settings_subtab') as any;
      if (saved && ['company', 'general', 'sequence', 'templates', 'data', 'database'].includes(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'company';
  });
  const setActiveSubTab = (sub: 'company' | 'general' | 'sequence' | 'templates' | 'data' | 'database') => {
    setActiveSubTabState(sub);
    try {
      sessionStorage.setItem('wms_settings_subtab', sub);
    } catch {
      // ignore
    }
  };

  // --- 6. PostgreSQL Real Database Connection State ---
  const [pgMode, setPgMode] = useState<'fields' | 'uri'>('fields');
  const [pgHost, setPgHost] = useState<string>(db.postgresConnectionInfo?.host || 'localhost');
  const [pgPort, setPgPort] = useState<number>(db.postgresConnectionInfo?.port || 5432);
  const [pgDatabase, setPgDatabase] = useState<string>(db.postgresConnectionInfo?.database || 'erp_db');
  const [pgUser, setPgUser] = useState<string>(db.postgresConnectionInfo?.user || 'postgres');
  const [pgPassword, setPgPassword] = useState<string>('');
  const [pgSsl, setPgSsl] = useState<boolean>(false);
  const [pgUri, setPgUri] = useState<string>('');
  const [pgConnecting, setPgConnecting] = useState<boolean>(false);
  const [pgStatusMessage, setPgStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [prismaIntrospecting, setPrismaIntrospecting] = useState<boolean>(false);
  const [prismaGenerating, setPrismaGenerating] = useState<boolean>(false);
  const [prismaTables, setPrismaTables] = useState<any[]>([]);
  const [prismaSchemaText, setPrismaSchemaText] = useState<string>('');
  const [prismaCliOutput, setPrismaCliOutput] = useState<string>('');
  const [showPrismaSchemaModal, setShowPrismaSchemaModal] = useState<boolean>(false);
  const [showCloudflareModal, setShowCloudflareModal] = useState<boolean>(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [selectedInspectTable, setSelectedInspectTable] = useState<string | null>(null);
  const [inspectTableRows, setInspectTableRows] = useState<any[]>([]);
  const [loadingTableRows, setLoadingTableRows] = useState<boolean>(false);

  const loadPrismaStatus = async () => {
    try {
      const res = await authFetch('/api/db/status');
      if (!res.ok) return;
      const json = await res.json();
      if (json.tables) {
        // Chuyển đổi format cho UI
        const tables = Object.entries(json.tables).map(([name, count]) => ({
          name,
          count: Number(count),
        }));
        setPrismaTables(tables);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (activeSubTab === 'database') {
      loadPrismaStatus();
    }
  }, [activeSubTab]);

  const handlePrismaGenerate = async () => {
    showToast('Tính năng này chỉ dùng cho Prisma local. Worker dùng Drizzle + D1.');
  };

  const handlePrismaIntrospect = async () => {
    showToast('Tính năng này chỉ dùng cho Prisma local. Worker dùng Drizzle + D1.');
  };

  const handleDownloadPrismaSchema = async () => {
    showToast('Tính năng này chỉ dùng cho Prisma local. Worker dùng Drizzle + D1.');
  };

  const handleInspectTableRows = async (tableName: string) => {
    setSelectedInspectTable(tableName);
    setLoadingTableRows(true);
    try {
      const res = await authFetch(`/api/db/table/${encodeURIComponent(tableName)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.rows)) {
        setInspectTableRows(json.rows);
      } else {
        setInspectTableRows([]);
      }
    } catch {
      setInspectTableRows([]);
    } finally {
      setLoadingTableRows(false);
    }
  };

  const handleConnectPostgres = async (e: React.FormEvent) => {
    e.preventDefault();
    setPgConnecting(true);
    setPgStatusMessage(null);
    try {
      const payload =
        pgMode === 'uri'
          ? { connectionString: pgUri.trim() }
          : {
              host: pgHost.trim(),
              port: Number(pgPort) || 5432,
              database: pgDatabase.trim(),
              user: pgUser.trim(),
              password: pgPassword,
              ssl: pgSsl,
            };
      const result = await db.connectToPostgres(payload);
      setPgStatusMessage({
        type: result.success ? 'success' : 'error',
        text: result.message,
      });
      if (result.success) {
        await loadPrismaStatus();
        onUpdate();
        showToast('Đã kết nối PostgreSQL qua Prisma ORM & ngắt toàn bộ Mock Data!');
      }
    } finally {
      setPgConnecting(false);
    }
  };

  const handleDisconnectPostgres = async () => {
    setPgConnecting(true);
    setPgStatusMessage(null);
    try {
      await db.disconnectPostgres();
      onUpdate();
      showToast('Đã ngắt kết nối PostgreSQL.');
    } finally {
      setPgConnecting(false);
    }
  };

  const handlePurgeMockNow = async () => {
    setPgConnecting(true);
    try {
      const hadMock = db.purgeMockRecords();
      if (db.dataSource === 'postgres') {
        await authFetch('/api/db/purge-mock', { method: 'POST' });
        await db.loadFromPostgres();
      }
      db.saveAll();
      onUpdate();
      showToast(
        hadMock || db.dataSource === 'postgres'
          ? 'Đã quét & xóa sạch 100% dữ liệu mẫu (Mock Data) khỏi hệ thống và PostgreSQL!'
          : 'Hệ thống đã sạch 100%, không có bất kỳ dữ liệu mẫu (Mock Data) nào!'
      );
    } finally {
      setPgConnecting(false);
    }
  };

  const handleSyncWithD1 = async () => {
    setPgConnecting(true);
    try {
      const ok = await db.loadFromPostgres();
      if (ok) {
        db.dataSource = 'postgres';
        db.isRealDatabaseConnected = true;
        db.saveAllToLocalStorage();
        onUpdate();
        showToast(`⚡ Đã kết nối & đồng bộ Cloudflare D1 (${db.products.length} Sản phẩm, ${db.customers.length} Khách hàng)!`);
      } else {
        showToast('⚠️ Không thể tải dữ liệu từ D1. Vui lòng kiểm tra lại D1 binding.');
      }
    } catch (e: any) {
      showToast('Lỗi kết nối D1: ' + (e?.message || 'Không xác định'));
    } finally {
      setPgConnecting(false);
    }
  };

  const handleDownloadSqlSchema = async () => {
    try {
      const res = await authFetch('/api/db/schema-sql');
      if (!res.ok) throw new Error('Không thể tải file SQL');
      const sqlText = await res.text();
      const blob = new Blob([sqlText], { type: 'application/sql;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'database_setup.sql';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Đã tải xuống file database_setup.sql (Đầy đủ 30 bảng chuẩn ERP)!');
    } catch {
      showToast('Không thể tải file database_setup.sql');
    }
  };

  const handleCopySqlSchema = async () => {
    try {
      const res = await authFetch('/api/db/schema-sql');
      if (!res.ok) throw new Error('Không thể tải nội dung SQL');
      const sqlText = await res.text();
      await navigator.clipboard.writeText(sqlText);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
      showToast('Đã sao chép toàn bộ mã SQL (30 bảng ERP) vào Clipboard! Hãy dán vào Supabase SQL Editor.');
    } catch {
      showToast('Không thể sao chép mã SQL.');
    }
  };

  const handleFillSupabaseTemplate = (mode: 'pooler' | 'direct') => {
    setPgMode('uri');
    if (mode === 'pooler') {
      setPgUri('postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres');
      showToast('Đã điền mẫu Supabase Transaction Pooler (Port 6543). Thay thế [YOUR-PROJECT-REF] và [YOUR-PASSWORD]!');
    } else {
      setPgUri('postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres');
      showToast('Đã điền mẫu Supabase Direct Connection (Port 5432). Thay thế [YOUR-PROJECT-REF] và [YOUR-PASSWORD]!');
    }
  };

  // --- 1. Company Info State ---
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ ...(db.companyInfo || { name: '', taxCode: '', address: '', bankAccount: '', bankName: '', logoUrl: '' }) });
  const [logoLoading, setLogoLoading] = useState(false);

  // --- 2. System Config State ---
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({ ...(db.systemConfig || { allowNegativeStock: false, defaultVatRate: 10, autoApproveQuotation: false, themeColor: DEFAULT_THEME_COLOR }) });
  const activeThemeHex = systemConfig.themeColor || DEFAULT_THEME_COLOR;
  const themeRamp = (() => {
    const p = buildThemePalette(activeThemeHex);
    return [p.deepest, p.strong, p.dark, p.hover, p.base, p.light, p.lighter].map((hex) => ({ hex }));
  })();

  // --- 3. Sequence Config State ---
  const [sequences, setSequences] = useState<SequenceConfig[]>(Array.isArray(db.sequenceConfig) ? [...db.sequenceConfig] : []);

  // --- 4. Print Templates State ---
  const [selectedTemplateType, setSelectedTemplateType] = useState<string>('PN');
  const [templates, setTemplates] = useState<PrintTemplate[]>(Array.isArray(db.printTemplates) ? [...db.printTemplates] : []);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);

  // --- 5. Data Importer/Exporter State ---
  const [importType, setImportType] = useState<ExcelImportType>('products');
  const [pasteData, setPasteData] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedRows, setUploadedRows] = useState<any[][]>([]);
  const [importLogs, setImportLogs] = useState<{ type: 'success' | 'error' | 'info'; text: string }[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  // --- Save Actions ---
  const saveCompanyInfo = () => {
    db.companyInfo = { ...companyInfo };
    db.saveAll();
    onUpdate();
    showToast('Đã lưu thông tin công ty thành công!');
  };

  const saveSystemConfig = () => {
    db.systemConfig = { ...systemConfig };
    db.saveAll();
    applyThemeColor(systemConfig.themeColor);
    onUpdate();
    showToast('Đã lưu cấu hình hệ thống thành công!');
  };

  const saveSequences = () => {
    db.sequenceConfig = [...sequences];
    db.saveAll();
    onUpdate();
    showToast('Đã lưu cấu hình số thứ tự chứng từ!');
  };

  const saveTemplate = (type: string, fields: Partial<PrintTemplate>) => {
    const updated = templates.map((t) => (t.type === type ? { ...t, ...fields } : t));
    setTemplates(updated);
    db.printTemplates = updated;
    db.saveAll();
    onUpdate();
    showToast(`Đã cập nhật mẫu in (${type})!`);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const compressed = await compressImage(base64);
        setCompanyInfo((prev) => ({ ...prev, logoUrl: compressed }));
      } catch (err) {
        setCompanyInfo((prev) => ({ ...prev, logoUrl: base64 }));
      } finally {
        setLogoLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Toast UI feedback helper
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Template restoration to default
  const handleRestoreTemplateDefault = (type: string) => {
    let defaultTemplate: PrintTemplate | undefined;
    if (type === 'PN') {
      defaultTemplate = {
        type: 'PN',
        name: 'Mẫu in Phiếu Nhập Kho tiêu chuẩn',
        title: 'PHIẾU NHẬP KHO',
        headerHtml: `<div class="text-center mb-6">\n  <h1 class="text-2xl font-bold text-gray-800 tracking-tight">{TEMPLATE_TITLE}</h1>\n  <p class="text-xs text-gray-500 font-mono mt-1">Số: {VOUCHER_NO} | Ngày: {VOUCHER_DATE}</p>\n</div>`,
        footerHtml: `<div class="mt-8 grid grid-cols-3 gap-4 text-center text-xs text-gray-700">\n  <div>\n    <p class="font-bold">Người lập phiếu</p>\n    <p class="text-gray-400 mt-12">(Ký, họ tên)</p>\n  </div>\n  <div>\n    <p class="font-bold">Thủ kho</p>\n    <p class="text-gray-400 mt-12">(Ký, họ tên)</p>\n  </div>\n  <div>\n    <p class="font-bold">Giám đốc</p>\n    <p class="text-gray-400 mt-12">(Ký, đóng dấu)</p>\n  </div>\n</div>`
      };
    } else if (type === 'PX') {
      defaultTemplate = {
        type: 'PX',
        name: 'Mẫu in Phiếu Xuất Kho tiêu chuẩn',
        title: 'PHIẾU XUẤT KHO',
        headerHtml: `<div class="text-center mb-6">\n  <h1 class="text-2xl font-bold text-gray-800 tracking-tight">{TEMPLATE_TITLE}</h1>\n  <p class="text-xs text-gray-500 font-mono mt-1">Số: {VOUCHER_NO} | Ngày: {VOUCHER_DATE}</p>\n</div>`,
        footerHtml: `<div class="mt-8 grid grid-cols-3 gap-4 text-center text-xs text-gray-700">\n  <div>\n    <p class="font-bold">Người nhận hàng</p>\n    <p class="text-gray-400 mt-12">(Ký, họ tên)</p>\n  </div>\n  <div>\n    <p class="font-bold">Thủ kho</p>\n    <p class="text-gray-400 mt-12">(Ký, họ tên)</p>\n  </div>\n  <div>\n    <p class="font-bold">Người lập phiếu</p>\n    <p class="text-gray-400 mt-12">(Ký, họ tên)</p>\n  </div>\n</div>`
      };
    } else if (type === 'BG') {
      defaultTemplate = {
        type: 'BG',
        name: 'Mẫu in Báo Giá tiêu chuẩn',
        title: 'BẢNG BÁO GIÁ HÀNG HÓA',
        headerHtml: `<div class="text-center mb-6">\n  <h1 class="text-2xl font-bold text-gray-800 tracking-tight">{TEMPLATE_TITLE}</h1>\n  <p class="text-xs text-gray-500 font-mono mt-1">Số báo giá: {VOUCHER_NO} | Ngày: {VOUCHER_DATE}</p>\n</div>`,
        footerHtml: `<div class="mt-8 flex justify-between text-xs text-gray-700 px-6">\n  <div>\n    <p class="italic">Trân trọng cảm ơn Quý khách hàng!</p>\n  </div>\n  <div class="text-center">\n    <p class="font-bold">Đại diện Công ty</p>\n    <p class="text-gray-400 mt-12">(Ký, ghi rõ họ tên và đóng dấu)</p>\n  </div>\n</div>`
      };
    } else if (type === 'PT') {
      defaultTemplate = {
        type: 'PT',
        name: 'Mẫu in Phiếu Thu tiêu chuẩn',
        title: 'PHIẾU THU TIỀN',
        headerHtml: `<div class="text-center mb-4">\n  <h1 class="text-xl font-bold text-gray-800 tracking-tight">{TEMPLATE_TITLE}</h1>\n  <p class="text-xs text-gray-500 font-mono">Số: {VOUCHER_NO} | Ngày: {VOUCHER_DATE}</p>\n</div>`,
        footerHtml: `<div class="mt-6 grid grid-cols-4 gap-2 text-center text-[10px] text-gray-700">\n  <div>\n    <p class="font-bold">Giám đốc</p>\n    <p class="text-gray-400 mt-8">(Ký, đóng dấu)</p>\n  </div>\n  <div>\n    <p class="font-bold">Kế toán trưởng</p>\n    <p class="text-gray-400 mt-8">(Ký, họ tên)</p>\n  </div>\n  <div>\n    <p class="font-bold">Người nộp tiền</p>\n    <p class="text-gray-400 mt-8">(Ký, họ tên)</p>\n  </div>\n  <div>\n    <p class="font-bold">Người lập phiếu</p>\n    <p class="text-gray-400 mt-8">(Ký, họ tên)</p>\n  </div>\n</div>`
      };
    } else if (type === 'PC') {
      defaultTemplate = {
        type: 'PC',
        name: 'Mẫu in Phiếu Chi tiêu chuẩn',
        title: 'PHIẾU CHI TIỀN',
        headerHtml: `<div class="text-center mb-4">\n  <h1 class="text-xl font-bold text-gray-800 tracking-tight">{TEMPLATE_TITLE}</h1>\n  <p class="text-xs text-gray-500 font-mono">Số: {VOUCHER_NO} | Ngày: {VOUCHER_DATE}</p>\n</div>`,
        footerHtml: `<div class="mt-6 grid grid-cols-4 gap-2 text-center text-[10px] text-gray-700">\n  <div>\n    <p class="font-bold">Giám đốc</p>\n    <p class="text-gray-400 mt-8">(Ký, đóng dấu)</p>\n  </div>\n  <div>\n    <p class="font-bold">Kế toán trưởng</p>\n    <p class="text-gray-400 mt-8">(Ký, họ tên)</p>\n  </div>\n  <div>\n    <p class="font-bold">Người nhận tiền</p>\n    <p class="text-gray-400 mt-8">(Ký, họ tên)</p>\n  </div>\n  <div>\n    <p class="font-bold">Người lập phiếu</p>\n    <p class="text-gray-400 mt-8">(Ký, họ tên)</p>\n  </div>\n</div>`
      };
    }

    if (defaultTemplate) {
      saveTemplate(type, defaultTemplate);
    }
  };

  // --- Dynamic Template Live Rendering Preview ---
  const currentTemplate = templates.find((t) => t.type === selectedTemplateType);
  const getRenderedPreviewHtml = () => {
    if (!currentTemplate) return 'Không có mẫu được chọn';
    let html = `
      <div class="p-6 bg-white border border-gray-200 text-gray-800 font-sans text-xs rounded-lg shadow" style="max-width: 600px; margin: 0 auto;">
        <!-- Header -->
        <div class="flex justify-between items-start mb-4 pb-4 border-b border-gray-100">
          <div>
            <h2 class="font-bold text-gray-900 text-sm">{COMPANY_NAME}</h2>
            <p class="text-[10px] text-gray-500 mt-0.5">MST: {COMPANY_TAX}</p>
            <p class="text-[10px] text-gray-500 mt-0.5">Địa chỉ: {COMPANY_ADDRESS}</p>
          </div>
          ${companyInfo.logoUrl ? `<img src="${companyInfo.logoUrl}" alt="Logo" style="max-height: 40px;" />` : `<div class="w-10 h-10 bg-gray-100 border border-dashed border-gray-300 rounded flex items-center justify-center text-[8px] text-gray-400">LOGO</div>`}
        </div>

        <!-- Template Content -->
        ${currentTemplate.headerHtml}

        <!-- Demo voucher details -->
        <div class="my-4 space-y-2 border-t border-b border-gray-100 py-3 text-gray-700">
          <div class="grid grid-cols-2">
            <div><strong>Đối tác:</strong> Công ty TNHH Demo Việt Nam</div>
            <div><strong>Kho:</strong> Kho Chính Quận 1</div>
          </div>
          <div class="grid grid-cols-2">
            <div><strong>Mã số thuế:</strong> 0313456789</div>
            <div><strong>Liên hệ:</strong> 0909123456</div>
          </div>
        </div>

        <!-- Demo Table -->
        <table class="w-full text-left border-collapse text-[10px] mb-4">
          <thead>
            <tr class="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
              <th class="p-1 border-b">STT</th>
              <th class="p-1 border-b">Tên sản phẩm</th>
              <th class="p-1 border-b">Đơn vị</th>
              <th class="p-1 border-b text-right">Số lượng</th>
              <th class="p-1 border-b text-right">Đơn giá</th>
              <th class="p-1 border-b text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-gray-100">
              <td class="p-1">1</td>
              <td class="p-1">Điện thoại iPhone 15 Pro Max</td>
              <td class="p-1">Cái</td>
              <td class="p-1 text-right">2</td>
              <td class="p-1 text-right">30.000.000</td>
              <td class="p-1 text-right">60.000.000</td>
            </tr>
            <tr class="border-b border-gray-100">
              <td class="p-1">2</td>
              <td class="p-1">Tai nghe Airpods Pro 2</td>
              <td class="p-1">Hộp</td>
              <td class="p-1 text-right">5</td>
              <td class="p-1 text-right">5.000.000</td>
              <td class="p-1 text-right">25.000.000</td>
            </tr>
          </tbody>
        </table>

        <div class="space-y-1 text-right text-[10px] text-gray-700 border-t border-gray-100 pt-2 pr-2">
          <p><strong>Cộng tiền hàng:</strong> 85.000.000 VND</p>
          <p><strong>Thuế VAT (10%):</strong> 8.500.000 VND</p>
          <p class="text-sm font-bold text-gray-900 mt-1"><strong>Tổng thanh toán:</strong> 93.500.000 VND</p>
          <p class="text-[9px] text-gray-500 italic mt-1">Bằng chữ: Chín mươi ba triệu năm trăm nghìn đồng chẵn.</p>
        </div>

        <!-- Footer -->
        ${currentTemplate.footerHtml}
      </div>
    `;

    // Replace basic company placeholders
    html = html
      .replace(/{COMPANY_NAME}/g, companyInfo.name)
      .replace(/{COMPANY_TAX}/g, companyInfo.taxCode)
      .replace(/{COMPANY_ADDRESS}/g, companyInfo.address)
      .replace(/{TEMPLATE_TITLE}/g, currentTemplate.title)
      .replace(/{VOUCHER_NO}/g, `${selectedTemplateType}-260626-0001`)
      .replace(/{VOUCHER_DATE}/g, '26/06/2026');

    // Template HTML is DB-configured: sanitize before injection.
    return sanitizeTemplateHtml(html);
  };

  // --- Excel / CSV Template Download, File Upload & Pasting Importer Logics ---
  const getCsvTemplate = () => {
    const meta = EXCEL_IMPORT_METADATA[importType] || EXCEL_IMPORT_METADATA.products;
    return [
      meta.columns.join('\t'),
      ...meta.sampleRows.map((r) => r.join('\t')),
    ].join('\n');
  };

  const copyTemplateToClipboard = () => {
    const text = getCsvTemplate();
    navigator.clipboard.writeText(text);
    setPasteData(text);
    setCopiedStatus(importType);
    showToast(`Đã sao chép & điền mẫu ${EXCEL_IMPORT_METADATA[importType]?.shortLabel || importType}!`);
    setTimeout(() => setCopiedStatus(null), 2000);
  };

  const handleSettingsExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLogs([]);
    setValidationErrors([]);
    try {
      const rows = await parseExcelFileToRows(file);
      setUploadedFileName(file.name);
      setUploadedRows(rows);
      showToast(`Đã đọc ${rows.length} dòng từ file ${file.name}. Nhấn "Xác nhận Import" để lưu!`);
    } catch (err: any) {
      setValidationErrors([`Không thể đọc file Excel: ${err?.message || String(err)}`]);
    } finally {
      e.target.value = '';
    }
  };

  const handleExcelImport = () => {
    setImportLogs([]);
    setValidationErrors([]);
    const rowsToProcess =
      uploadedRows.length > 0 ? uploadedRows : parsePastedTextToRows(pasteData);

    if (!rowsToProcess || rowsToProcess.length === 0) {
      setImportLogs([{ type: 'error', text: 'Vui lòng chọn file Excel (.xlsx, .xls, .csv) hoặc dán dữ liệu trước khi Import!' }]);
      return;
    }

    const res = executeExcelRowsImport(db, importType, rowsToProcess, {
      autoConfirmVouchers: true,
    });

    setImportLogs(res.logs);
    setValidationErrors(res.errors);

    if (res.successCount > 0) {
      onUpdate();
      setPasteData('');
      setUploadedRows([]);
      setUploadedFileName('');
      showToast(`Đã import thành công ${res.successCount} dòng vào ${EXCEL_IMPORT_METADATA[importType]?.label}!`);
    }
  };

  // --- Export Table Utilities ---
  const handleExportDataCsv = (type: ExcelImportType | 'transactions' | 'all_workbook') => {
    exportDataToExcel(db, type);
    showToast(`Đã xuất file Excel (.xlsx) thành công!`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-emerald-500 text-white px-4 py-2.5 rounded-lg shadow-xl font-bold flex items-center gap-2 text-xs animate-slideIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/5 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Settings2 className="w-7 h-7 text-emerald-400" />
            Cấu hình hệ thống
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wider">
            Quản trị công ty, số thứ tự, mẫu in, import & export dữ liệu
          </p>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex flex-wrap border-b border-white/5 gap-1.5 pb-px">
        {[
          { id: 'company', label: 'Thông tin công ty', icon: Building2 },
          { id: 'general', label: 'Cài đặt nghiệp vụ', icon: Settings2 },
          { id: 'sequence', label: 'Số thứ tự chứng từ', icon: Binary },
          { id: 'templates', label: 'Thiết kế mẫu in', icon: FileCode },
          { id: 'data', label: 'Import/Export Excel', icon: FileSpreadsheet },
          { id: 'database', label: 'Database Supabase & Cloudflare', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id as any);
                setImportLogs([]);
                setValidationErrors([]);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-150 border-b-2 rounded-t-lg ${
                isActive
                  ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500'
                  : 'text-slate-400 border-transparent hover:text-white hover:bg-white/[0.01]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="bg-[#0d1117] border border-white/5 rounded-xl p-6 shadow-2xl">
        {/* TAB 1: Company Info */}
        {activeSubTab === 'company' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Input fields */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 border-b border-white/5 pb-2">Thông tin Pháp lý & Tài chính</h3>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400">Tên doanh nghiệp (In hóa đơn)</label>
                  <input
                    type="text"
                    value={companyInfo.name}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                    className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400">Mã số thuế (MST)</label>
                    <input
                      type="text"
                      value={companyInfo.taxCode}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, taxCode: e.target.value })}
                      className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50 outline-none font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400">Tên ngân hàng thụ hưởng</label>
                    <input
                      type="text"
                      value={companyInfo.bankName}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, bankName: e.target.value })}
                      className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400">Số tài khoản ngân hàng (STK)</label>
                    <input
                      type="text"
                      value={companyInfo.bankAccount}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, bankAccount: e.target.value })}
                      className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50 outline-none font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400">Địa chỉ trụ sở chính</label>
                    <input
                      type="text"
                      value={companyInfo.address}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                      className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Logo Upload Card */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-200 border-b border-white/5 pb-2">Logo Doanh nghiệp</h3>
                <div className="border border-white/5 bg-[#161a23] rounded-lg p-6 flex flex-col items-center justify-center text-center gap-4">
                  {companyInfo.logoUrl ? (
                    <div className="relative group border border-white/10 bg-white/[0.07] p-2 rounded-lg">
                      <img src={companyInfo.logoUrl} alt="Logo preview" className="max-h-20 object-contain rounded" />
                      <button
                        onClick={() => setCompanyInfo({ ...companyInfo, logoUrl: '' })}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow hover:bg-rose-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full border border-dashed border-white/10 flex items-center justify-center text-slate-500">
                      <Building2 className="w-8 h-8" />
                    </div>
                  )}

                  <div className="w-full">
                    <label className="w-full flex items-center justify-center gap-2 border border-emerald-500/20 hover:border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 text-xs font-bold py-2.5 rounded-lg cursor-pointer transition uppercase tracking-wider">
                      <Upload className="w-4 h-4" />
                      {logoLoading ? 'Đang nén ảnh...' : 'Tải Logo & Nén'}
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium">Hỗ trợ JPG, PNG. Hệ thống tự động nén kích thước tối ưu hóa hóa đơn</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button
                onClick={saveCompanyInfo}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-6 py-2.5 rounded-lg transition uppercase tracking-wider"
              >
                Lưu thông tin công ty
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: General Config */}
        {activeSubTab === 'general' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-200 border-b border-white/5 pb-2">Cấu hình Quy trình & Nghiệp vụ</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Switch 1: Negative Stock */}
              <div className="border border-white/5 bg-[#161a23] rounded-lg p-5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Cho phép Xuất âm kho</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Cho phép xuất hàng vượt quá tồn kho thực tế hiện tại</p>
                </div>
                <button
                  onClick={() => setSystemConfig({ ...systemConfig, allowNegativeStock: !systemConfig.allowNegativeStock })}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                    systemConfig.allowNegativeStock ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      systemConfig.allowNegativeStock ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Switch 2: Auto approve */}
              <div className="border border-white/5 bg-[#161a23] rounded-lg p-5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tự động duyệt Báo giá</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Hóa đơn báo giá được lưu tự động chuyển sang ACCEPTED</p>
                </div>
                <button
                  onClick={() => setSystemConfig({ ...systemConfig, autoApproveQuotation: !systemConfig.autoApproveQuotation })}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                    systemConfig.autoApproveQuotation ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      systemConfig.autoApproveQuotation ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Input 1: Default VAT */}
              <div className="flex flex-col gap-1.5 border border-white/5 bg-[#161a23] p-5 rounded-lg">
                <label className="text-xs font-bold text-white uppercase tracking-wider">Thuế suất VAT mặc định (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={systemConfig.defaultVatRate}
                  onChange={(e) => setSystemConfig({ ...systemConfig, defaultVatRate: Number(e.target.value) })}
                  className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#0d1117] text-white focus:border-emerald-500/50 outline-none w-full"
                />
                <p className="text-[9px] text-slate-500">Thuế suất áp dụng tự động cho các phiếu nhập xuất mới</p>
              </div>

              {/* Input 2: Theme Color preset */}
              <div className="flex flex-col gap-3 border border-white/5 bg-[#161a23] p-5 rounded-lg lg:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">Màu sắc chủ đạo hệ thống</label>
                  <span className="text-[10px] font-mono font-bold text-slate-200 uppercase">{activeThemeHex}</span>
                </div>

                {/* Dải màu sẽ được áp dụng cho toàn bộ nút / biểu tượng / đường nhấn */}
                <div className="flex h-2.5 w-full rounded-full overflow-hidden ring-1 ring-white/10">
                  {themeRamp.map((step) => (
                    <div key={step.hex} className="flex-1" style={{ backgroundColor: step.hex }} title={step.hex} />
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={activeThemeHex}
                      onChange={(e) => {
                        const newColor = e.target.value;
                        setSystemConfig({ ...systemConfig, themeColor: newColor });
                        applyThemeColor(newColor);
                      }}
                      aria-label="Chọn màu chủ đạo"
                      className="w-11 h-11 border border-white/10 bg-[#0d1117] rounded-lg cursor-pointer shrink-0"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Tự do tinh chỉnh</p>
                      <p className="text-[9px] text-slate-500">Dải sáng/tối tự động giữ đúng độ tương phản</p>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-wrap items-center gap-2 pl-5 border-l border-white/10 min-w-[260px]">
                    <span className="text-[10px] text-slate-400 font-medium uppercase mr-1">Bảng màu:</span>
                    {THEME_PRESETS.map((preset) => {
                      const isActive = activeThemeHex === preset.hex;
                      return (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() => {
                            setSystemConfig({ ...systemConfig, themeColor: preset.hex });
                            applyThemeColor(preset.hex);
                          }}
                          aria-label={preset.name}
                          title={`${preset.name} · ${preset.hex}`}
                          style={{ backgroundColor: preset.hex }}
                          className={`w-7 h-7 rounded-lg border transition-all duration-150 cursor-pointer ${
                            isActive
                              ? 'border-white scale-110 shadow-lg shadow-black/40 ring-2 ring-white/20'
                              : 'border-white/15 opacity-75 hover:opacity-100 hover:scale-105'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button
                onClick={saveSystemConfig}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-6 py-2.5 rounded-lg transition uppercase tracking-wider"
              >
                Lưu cấu hình nghiệp vụ
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Sequence Config */}
        {activeSubTab === 'sequence' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="text-sm font-bold text-slate-200">Cấu hình Quy tắc đánh số chứng từ</h3>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/5 border border-emerald-500/15 px-2 py-0.5 rounded">Auto-Increment Active</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider">
                    <th className="p-3 font-semibold">Loại chứng từ</th>
                    <th className="p-3 font-semibold">Prefix (Tiền tố)</th>
                    <th className="p-3 font-semibold text-center">Số chữ số nhảy</th>
                    <th className="p-3 font-semibold text-center">Số kế tiếp</th>
                    <th className="p-3 font-semibold text-right">Mẫu hiển thị hôm nay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sequences.map((seq, idx) => {
                    // Generate dynamic sample reference
                    const sampleDigits = String(seq.currentNumber).padStart(seq.digits, '0');
                    const sampleRef = `${seq.prefix}-260626-${sampleDigits}`;
                    
                    return (
                      <tr key={seq.type} className="hover:bg-white/[0.01]">
                        <td className="p-3 font-bold text-slate-300">
                          {seq.type === 'PN' && 'Phiếu Nhập Kho (PN)'}
                          {seq.type === 'PX' && 'Phiếu Xuất Kho (PX)'}
                          {seq.type === 'BG' && 'Báo giá Hàng hóa (BG)'}
                          {seq.type === 'PT' && 'Phiếu Thu tiền mặt (PT)'}
                          {seq.type === 'PC' && 'Phiếu Chi tiền mặt (PC)'}
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={seq.prefix}
                            onChange={(e) => {
                              const updated = [...sequences];
                              updated[idx].prefix = e.target.value.toUpperCase();
                              setSequences(updated);
                            }}
                            className="w-16 border border-white/10 rounded px-2 py-1 bg-[#161a23] text-white focus:border-emerald-500/50 outline-none text-center font-bold"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="3"
                            max="8"
                            value={seq.digits}
                            onChange={(e) => {
                              const updated = [...sequences];
                              updated[idx].digits = Number(e.target.value);
                              setSequences(updated);
                            }}
                            className="w-16 border border-white/10 rounded px-2 py-1 bg-[#161a23] text-white focus:border-emerald-500/50 outline-none text-center"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={seq.currentNumber}
                            onChange={(e) => {
                              const updated = [...sequences];
                              updated[idx].currentNumber = Number(e.target.value);
                              setSequences(updated);
                            }}
                            className="w-16 border border-white/10 rounded px-2 py-1 bg-[#161a23] text-white focus:border-emerald-500/50 outline-none text-center font-mono font-bold"
                          />
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          {sampleRef}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button
                onClick={saveSequences}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-6 py-2.5 rounded-lg transition uppercase tracking-wider"
              >
                Lưu cấu hình số chứng từ
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: HTML Print Templates */}
        {activeSubTab === 'templates' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/5 pb-2 gap-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-400 uppercase">Chọn mẫu in cần sửa:</label>
                <select
                  value={selectedTemplateType}
                  onChange={(e) => setSelectedTemplateType(e.target.value)}
                  className="text-sm border border-white/10 rounded-lg px-3 py-1.5 bg-[#161a23] text-white focus:border-emerald-500/50 outline-none font-bold"
                >
                  <option value="PN">Phiếu Nhập Kho (PN)</option>
                  <option value="PX">Phiếu Xuất Kho (PX)</option>
                  <option value="BG">Báo Giá Hàng Hóa (BG)</option>
                  <option value="PT">Phiếu Thu Tiền (PT)</option>
                  <option value="PC">Phiếu Chi Tiền (PC)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition ${
                    isPreviewMode
                      ? 'bg-emerald-500 border-emerald-600 text-white'
                      : 'border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {isPreviewMode ? <Code className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {isPreviewMode ? 'Chuyển sang Mã HTML' : 'Xem trước Mẫu In'}
                </button>
                <button
                  onClick={() => {
                    if (confirm('Bạn có muốn khôi phục thiết kế mẫu in này về mặc định ban đầu không?')) {
                      handleRestoreTemplateDefault(selectedTemplateType);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 border border-rose-500/10 hover:bg-rose-500/5 transition uppercase"
                >
                  <RefreshCw className="w-3 h-3" />
                  Mặc định
                </button>
              </div>
            </div>

            {isPreviewMode ? (
              /* Live preview sandbox iframe style layout */
              <div className="space-y-4">
                <p className="text-[10px] text-slate-400 italic">
                  * Đây là giao diện giả lập in ấn thực tế tích hợp dữ liệu mẫu. Khi thực hiện "In phiếu" tại giao diện chứng từ, hệ thống sẽ gọi hộp thoại máy in hệ điều hành chính xác theo mẫu thiết kế này.
                </p>
                <div
                  className="bg-slate-100 p-6 rounded-xl overflow-auto border border-gray-300"
                  dangerouslySetInnerHTML={{ __html: getRenderedPreviewHtml() }}
                />
              </div>
            ) : (
              /* HTML Text Editors */
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Header HTML */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase">Tiêu đề &amp; Phần trên mẫu in (Header HTML)</span>
                      <span className="text-[9px] text-emerald-400 bg-emerald-500/5 px-1 py-0.5 rounded font-mono">Tailwind Allowed</span>
                    </div>
                    <textarea
                      rows={10}
                      value={currentTemplate?.headerHtml || ''}
                      onChange={(e) => saveTemplate(selectedTemplateType, { headerHtml: e.target.value })}
                      className="font-mono text-xs border border-white/10 rounded-lg p-3 bg-[#161a23] text-white focus:border-emerald-500/50 outline-none leading-relaxed"
                    />
                  </div>

                  {/* Footer HTML */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase">Chữ ký &amp; Phần dưới mẫu in (Footer HTML)</span>
                      <span className="text-[9px] text-emerald-400 bg-emerald-500/5 px-1 py-0.5 rounded font-mono">Dynamic Placeholders</span>
                    </div>
                    <textarea
                      rows={10}
                      value={currentTemplate?.footerHtml || ''}
                      onChange={(e) => saveTemplate(selectedTemplateType, { footerHtml: e.target.value })}
                      className="font-mono text-xs border border-white/10 rounded-lg p-3 bg-[#161a23] text-white focus:border-emerald-500/50 outline-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Placeholders Guide panel */}
                <div className="bg-[#161a23]/50 border border-white/5 rounded-lg p-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-emerald-400" />
                    Bảng tra cứu biến dữ liệu động (Placeholders)
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Sử dụng các thẻ dưới đây trong nội dung HTML. Hệ thống sẽ tự động map và điền thông tin tương ứng khi xuất bản in:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono text-emerald-400 pt-1">
                    <div>{"{COMPANY_NAME}"} - Tên Cty</div>
                    <div>{"{COMPANY_TAX}"} - MST Cty</div>
                    <div>{"{COMPANY_ADDRESS}"} - ĐC Cty</div>
                    <div>{"{TEMPLATE_TITLE}"} - Tên Phiếu</div>
                    <div>{"{VOUCHER_NO}"} - Số Chứng Từ</div>
                    <div>{"{VOUCHER_DATE}"} - Ngày Lập</div>
                    <div>{"{PARTNER_NAME}"} - Khách/NCC</div>
                    <div>{"{TOTAL_AMOUNT_WORDS}"} - Bằng chữ</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Bulk Excel Data Importer / Exporter */}
        {activeSubTab === 'data' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Importer Section (Left) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-3 gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Nhập dữ liệu hàng loạt từ Excel (.xlsx, .xls, .csv)
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {EXCEL_IMPORT_METADATA[importType]?.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={importType}
                      onChange={(e) => {
                        setImportType(e.target.value as ExcelImportType);
                        setUploadedRows([]);
                        setUploadedFileName('');
                        setImportLogs([]);
                        setValidationErrors([]);
                      }}
                      className="text-xs border border-white/15 rounded-lg px-3 py-1.5 bg-[#161a23] text-white focus:border-emerald-500/50 outline-none font-bold"
                    >
                      {Object.values(EXCEL_IMPORT_METADATA).map((meta) => (
                        <option key={meta.id} value={meta.id}>
                          {meta.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Excel (.xlsx) & CSV Template download bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#161a23] rounded-xl p-3.5 border border-white/10">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">
                      Tải File Mẫu Chuẩn ({EXCEL_IMPORT_METADATA[importType]?.shortLabel})
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Tải file mẫu <code className="text-emerald-400">.xlsx</code> hoặc <code className="text-emerald-400">.csv</code> có sẵn tiêu đề cột &amp; dòng mẫu chuẩn
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        downloadExcelTemplate(importType);
                        showToast(`Đã tải xuống file mẫu Mau_Import_${importType.toUpperCase()}.xlsx!`);
                      }}
                      className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-extrabold px-3.5 py-2 rounded-lg transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Tải File Mẫu (.xlsx)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        downloadCsvTemplate(importType);
                        showToast(`Đã tải xuống file mẫu Mau_Import_${importType.toUpperCase()}.csv!`);
                      }}
                      className="flex items-center gap-1.5 bg-white/[0.07] hover:bg-white/10 border border-white/15 text-slate-200 text-xs font-bold px-3 py-2 rounded-lg transition"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      Tải Mẫu (.csv)
                    </button>
                    <button
                      type="button"
                      onClick={copyTemplateToClipboard}
                      className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-2 rounded-lg hover:bg-emerald-500/20 transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedStatus === importType ? 'Đã điền mẫu!' : 'Điền mẫu thử'}
                    </button>
                  </div>
                </div>

                {/* Upload Excel File (.xlsx / .xls / .csv) */}
                <div className="border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/60 bg-[#161a23]/70 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 transition">
                  <div>
                    <div className="text-xs font-bold text-white">
                      {uploadedFileName
                        ? `Đã chọn file: ${uploadedFileName} (${uploadedRows.length} dòng)`
                        : 'Chọn trực tiếp file Excel (.xlsx, .xls, .csv) từ máy tính'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Hỗ trợ đọc trực tiếp file Excel mà không cần đổi sang CSV
                    </div>
                  </div>
                  <label className="cursor-pointer shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition">
                    <Upload className="w-4 h-4" />
                    <span>Chọn File Excel</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleSettingsExcelFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Paste Textbox */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400">
                    Hoặc Copy &amp; Dán trực tiếp vùng bảng từ Excel vào đây:
                  </label>
                  <textarea
                    rows={7}
                    value={pasteData}
                    onChange={(e) => {
                      setPasteData(e.target.value);
                      setUploadedRows([]);
                      setUploadedFileName('');
                    }}
                    placeholder={getCsvTemplate()}
                    className="font-mono text-xs border border-white/10 rounded-lg p-3 bg-[#161a23] text-white focus:border-emerald-500/50 outline-none placeholder:text-slate-600 leading-relaxed"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleExcelImport}
                  disabled={!pasteData.trim() && uploadedRows.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 disabled:bg-slate-700 hover:bg-emerald-600 text-white font-extrabold text-xs py-2.5 rounded-lg transition uppercase tracking-wider"
                >
                  <Upload className="w-4 h-4" />
                  Xác nhận Import &amp; Cập nhật ngay
                </button>

                {/* Validation errors and logs display */}
                {(importLogs.length > 0 || validationErrors.length > 0) && (
                  <div className="border border-white/5 bg-[#161a23] rounded-lg p-4 space-y-3 max-h-60 overflow-y-auto">
                    <h4 className="text-xs font-bold text-slate-300 uppercase">Kết quả xử lý:</h4>
                    
                    {validationErrors.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Lỗi xác thực dữ liệu ({validationErrors.length}):
                        </p>
                        <ul className="list-disc list-inside text-[9px] text-rose-400/80 font-mono pl-2 space-y-0.5">
                          {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-1 pl-1">
                      {importLogs.map((log, i) => (
                        <p
                          key={i}
                          className={`text-[9.5px] font-mono ${
                            log.type === 'error' ? 'text-rose-400' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          {log.type === 'success' ? '✓ ' : log.type === 'error' ? '✗ ' : '• '}
                          {log.text}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Exporter Section (Right) */}
              <div className="lg:col-span-5 space-y-4 border-t lg:border-t-0 lg:border-l border-white/5 pt-6 lg:pt-0 lg:pl-6">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-white/5 pb-2">
                  Xuất dữ liệu hệ thống ra Excel (.xlsx)
                </h3>
                <p className="text-[10px] text-slate-400">
                  Tải dữ liệu đầy đủ từ hệ thống quản trị hiện tại về máy tính định dạng Microsoft Excel (.xlsx):
                </p>

                <div className="space-y-2 pt-2">
                  {[
                    { id: 'all_workbook', name: 'Xuất Toàn Bộ CSDL (Multi-Sheet .xlsx)', desc: 'Tất cả Hàng hóa, NCC, KH, Kho, Chứng từ, Công nợ, TK Kế toán trong 1 file Excel' },
                    { id: 'products', name: 'Xuất danh sách Sản phẩm (.xlsx)', desc: 'SKU, Danh mục, ĐVT, Giá vốn bình quân, Tồn kho thực tế' },
                    { id: 'transactions', name: 'Xuất danh sách Chứng từ Kho (.xlsx)', desc: 'Phiếu Nhập (PN), Phiếu Xuất (PX), Tồn đầu kỳ, VAT, Tổng tiền' },
                    { id: 'debts', name: 'Xuất báo cáo Công nợ (.xlsx)', desc: 'Phải thu (131), Phải trả (331) và trạng thái thanh toán' },
                    { id: 'suppliers', name: 'Xuất danh sách Nhà cung cấp (.xlsx)', desc: 'Tên NCC, Mã số thuế, SĐT, Địa chỉ' },
                    { id: 'customers', name: 'Xuất danh sách Khách hàng (.xlsx)', desc: 'Tên KH, Mã số thuế, SĐT, Địa chỉ' },
                  ].map((exportBtn) => (
                    <button
                      type="button"
                      key={exportBtn.id}
                      onClick={() => handleExportDataCsv(exportBtn.id as any)}
                      className="w-full flex items-center justify-between p-3 border border-white/5 hover:border-emerald-500/20 bg-[#161a23] hover:bg-emerald-500/5 text-slate-300 hover:text-white rounded-lg transition text-left"
                    >
                      <div>
                        <p className="text-xs font-bold">{exportBtn.name}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">{exportBtn.desc}</p>
                      </div>
                      <Download className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: Real Database Connection (PostgreSQL / Cloud No-Mock Policy) */}
        {activeSubTab === 'database' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  Cấu hình Kết nối Cơ sở dữ liệu Thực tế (PostgreSQL / Cloud DB)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Khi hệ thống đã kết nối với dữ liệu thật (PostgreSQL hoặc Cloud Database), chế độ Mock Data tự động bị vô hiệu hóa hoàn toàn.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSyncWithD1}
                  disabled={pgConnecting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 hover:bg-cyan-500/25 text-cyan-300 text-xs font-bold transition shadow-sm"
                  title="Tải lại toàn bộ trạng thái dữ liệu thật từ Cloudflare D1 Database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${pgConnecting ? 'animate-spin' : ''}`} />
                  ⚡ Đồng bộ Cloudflare D1
                </button>
                <button
                  type="button"
                  onClick={() => setShowSupabaseModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold transition shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  ⚡ Kết nối Supabase
                </button>
                <button
                  type="button"
                  onClick={() => setShowCloudflareModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-300 text-xs font-bold transition shadow-sm"
                >
                  <Cloud className="w-3.5 h-3.5 text-amber-400" />
                  ☁️ Deploy Cloudflare
                </button>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  ĐÃ TẮT MOCK DATA (100% DỮ LIỆU THẬT)
                </span>
              </div>
            </div>

            {/* Active Data Source Status Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#161a23] border border-white/10 rounded-xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nguồn Dữ Liệu Đang Hoạt Động</span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-black text-white">
                    {db.dataSource === 'postgres'
                      ? 'Cloudflare D1 Database (Edge SQL)'
                      : db.dataSource === 'firebase'
                      ? 'Cloud Realtime Database'
                      : 'Local Storage (Đã tắt Mock)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {db.dataSource === 'postgres'
                    ? `Cơ sở dữ liệu: Cloudflare D1 (SQLite) • ORM: Drizzle • Chuẩn tiền tệ: VNĐ Integer`
                    : 'Không tự động sinh dữ liệu mẫu khi bảng trống'}
                </p>
              </div>

              <div className="bg-[#161a23] border border-white/10 rounded-xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chính Sách Mock Data</span>
                <div className="mt-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-black text-emerald-400">Vô hiệu hóa hoàn toàn</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Tự động loại bỏ dữ liệu mẫu, chỉ lưu trữ phát sinh thực tế của doanh nghiệp
                </p>
              </div>

              <div className="bg-[#161a23] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Làm Sạch Dữ Liệu Mẫu</span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Kiểm tra và xóa mọi bản ghi mẫu còn sót lại trong bộ nhớ đệm
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePurgeMockNow}
                  className="mt-3 w-full py-2 px-3 rounded-lg bg-white/[0.07] hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/30 text-xs font-bold text-slate-200 hover:text-emerald-400 transition flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Quét &amp; Xóa Sạch Mock Data
                </button>
              </div>
            </div>

            {/* PostgreSQL Direct Connection Form */}
            <form onSubmit={handleConnectPostgres} className="bg-[#161a23] border border-white/10 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Thiết lập Kết nối Trực tiếp PostgreSQL (Node-Postgres Pool)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Hệ thống sẽ tự động khởi tạo cấu trúc bảng chuẩn Thông tư 133/200 và đồng bộ 100% dữ liệu thật với PostgreSQL.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-[#0d1117] p-1 rounded-lg border border-white/10 self-start">
                  <button
                    type="button"
                    onClick={() => setPgMode('fields')}
                    className={`px-3 py-1 rounded text-[11px] font-bold transition ${
                      pgMode === 'fields' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tham số chi tiết
                  </button>
                  <button
                    type="button"
                    onClick={() => setPgMode('uri')}
                    className={`px-3 py-1 rounded text-[11px] font-bold transition ${
                      pgMode === 'uri' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Chuỗi URI (POSTGRES_URL)
                  </button>
                </div>
              </div>

              {pgMode === 'uri' ? (
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-300">
                      Chuỗi kết nối PostgreSQL (Connection URI)
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-semibold mr-1">Mẫu nhanh:</span>
                      <button
                        type="button"
                        onClick={() => handleFillSupabaseTemplate('pooler')}
                        className="px-2.5 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold transition flex items-center gap-1"
                        title="Dùng cho Cloudflare / Serverless kết nối cổng 6543"
                      >
                        <Zap className="w-3 h-3 text-emerald-400" />
                        Supabase Pooler (6543)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFillSupabaseTemplate('direct')}
                        className="px-2.5 py-1 rounded-md bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-[11px] font-bold transition flex items-center gap-1"
                      >
                        <Database className="w-3 h-3 text-blue-400" />
                        Supabase Direct (5432)
                      </button>
                      <button
                        type="button"
                        onClick={handleCopySqlSchema}
                        className="px-2.5 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold transition flex items-center gap-1"
                        title="Sao chép toàn bộ mã SQL 30 bảng để dán vào Supabase SQL Editor"
                      >
                        {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-400" />}
                        {copiedSql ? 'Đã chép SQL' : 'Chép SQL 30 bảng'}
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={pgUri}
                    onChange={(e) => setPgUri(e.target.value)}
                    placeholder="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres hoặc postgresql://postgres:password@localhost:5432/erp_db"
                    className="text-xs font-mono border border-white/10 rounded-lg px-3 py-2.5 bg-[#0d1117] text-white focus:border-emerald-500/50 outline-none w-full"
                  />
                  {(pgUri.includes('supabase.co') || pgUri.includes('supabase.com') || pgUri.includes('pooler.supabase.com')) && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                      <Zap className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                      <span>
                        <strong>Đã nhận diện Supabase Cloud Database:</strong> Tự động kích hoạt mã hóa SSL/TLS và hỗ trợ chuẩn Transaction Pooler Supabase.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-300">Host (Máy chủ PostgreSQL)</label>
                    <input
                      type="text"
                      value={pgHost}
                      onChange={(e) => setPgHost(e.target.value)}
                      placeholder="localhost hoặc IP/Domain"
                      className="text-xs font-mono border border-white/10 rounded-lg px-3 py-2 bg-[#0d1117] text-white focus:border-emerald-500/50 outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-300">Port (Cổng)</label>
                    <input
                      type="number"
                      value={pgPort}
                      onChange={(e) => setPgPort(Number(e.target.value))}
                      placeholder="5432"
                      className="text-xs font-mono border border-white/10 rounded-lg px-3 py-2 bg-[#0d1117] text-white focus:border-emerald-500/50 outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-300">Tên Database</label>
                    <input
                      type="text"
                      value={pgDatabase}
                      onChange={(e) => setPgDatabase(e.target.value)}
                      placeholder="erp_db"
                      className="text-xs font-mono border border-white/10 rounded-lg px-3 py-2 bg-[#0d1117] text-white focus:border-emerald-500/50 outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-300">Username (Tài khoản)</label>
                    <input
                      type="text"
                      value={pgUser}
                      onChange={(e) => setPgUser(e.target.value)}
                      placeholder="postgres"
                      className="text-xs font-mono border border-white/10 rounded-lg px-3 py-2 bg-[#0d1117] text-white focus:border-emerald-500/50 outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-300">Password (Mật khẩu)</label>
                    <input
                      type="password"
                      value={pgPassword}
                      onChange={(e) => setPgPassword(e.target.value)}
                      placeholder="••••••••"
                      className="text-xs font-mono border border-white/10 rounded-lg px-3 py-2 bg-[#0d1117] text-white focus:border-emerald-500/50 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-5">
                    <input
                      id="pg-ssl-toggle"
                      type="checkbox"
                      checked={pgSsl}
                      onChange={(e) => setPgSsl(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                    <label htmlFor="pg-ssl-toggle" className="text-xs font-semibold text-slate-300 cursor-pointer">
                      Sử dụng kết nối bảo mật SSL/TLS
                    </label>
                  </div>
                </div>
              )}

              {pgStatusMessage && (
                <div
                  className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                    pgStatusMessage.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}
                >
                  {pgStatusMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{pgStatusMessage.text}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadSqlSchema}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Tải database_setup.sql
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPrismaSchema}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Tải prisma/schema.prisma
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPrismaSchemaModal(!showPrismaSchemaModal)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/15 bg-white/[0.07] hover:bg-white/10 text-slate-200 text-xs font-bold uppercase tracking-wider transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {showPrismaSchemaModal ? 'Ẩn schema.prisma' : 'Xem schema.prisma'}
                  </button>
                  <button
                    type="button"
                    onClick={handlePrismaGenerate}
                    disabled={prismaGenerating || pgConnecting}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${prismaGenerating ? 'animate-spin' : ''}`} />
                    {prismaGenerating ? 'Đang chạy prisma generate...' : 'Chạy prisma generate'}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {db.dataSource === 'postgres' && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrismaIntrospect}
                        disabled={prismaIntrospecting || pgConnecting}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-extrabold uppercase tracking-wider transition"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${prismaIntrospecting ? 'animate-spin' : ''}`} />
                        {prismaIntrospecting
                          ? 'Đang quét prisma db pull...'
                          : 'Khảo sát ngược DB (prisma db pull)'}
                      </button>
                      <button
                        type="button"
                        onClick={handleDisconnectPostgres}
                        disabled={pgConnecting}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider transition"
                      >
                        <Unplug className="w-3.5 h-3.5" />
                        Ngắt kết nối
                      </button>
                    </>
                  )}
                  <button
                    type="submit"
                    disabled={pgConnecting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-white font-extrabold text-xs uppercase tracking-wider transition"
                  >
                    <Database className="w-4 h-4" />
                    {pgConnecting ? 'Đang kiểm tra & kết nối...' : 'Kết nối PostgreSQL (Prisma ORM)'}
                  </button>
                </div>
              </div>
            </form>

            {/* Prisma ORM Reverse Introspection & Live Table Explorer */}
            <div className="bg-[#161a23] border border-white/10 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div>
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Prisma ORM — Khảo Sát Ngược Tự Động Đọc Database Cũ (Database Introspection)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Sử dụng <code className="text-emerald-300 font-mono">npx prisma db pull</code> &amp; <code className="text-emerald-300 font-mono">npx prisma generate</code> để tự động đọc cấu trúc bảng, khóa ngoại và dữ liệu sẵn có từ PostgreSQL mà không phải viết lại database từ đầu.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-300">
                    Tổng số bảng: <strong className="text-emerald-400">{prismaTables.length || 29}</strong>
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-xs font-mono text-slate-300">
                    Bản ghi thật: <strong className="text-amber-400">{prismaTables.reduce((s, t) => s + (t.rowCount || 0), 0).toLocaleString()}</strong>
                  </span>
                </div>
              </div>

              {prismaCliOutput && (
                <div className="bg-[#0a0d14] border border-emerald-500/20 rounded-lg p-3">
                  <div className="text-[10px] font-mono uppercase text-emerald-400 mb-1 font-bold">
                    Kết quả thực thi Prisma CLI (prisma db pull &amp; prisma generate):
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
                    {prismaCliOutput}
                  </pre>
                </div>
              )}

              {showPrismaSchemaModal && prismaSchemaText && (
                <div className="bg-[#0a0d14] border border-indigo-500/30 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 font-mono">
                      prisma/schema.prisma (Đồng bộ với @prisma/client)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(prismaSchemaText);
                        showToast('Đã sao chép nội dung prisma/schema.prisma!');
                      }}
                      className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Sao chép Schema
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 whitespace-pre overflow-x-auto max-h-80 p-2 bg-black/40 rounded border border-white/5">
                    {prismaSchemaText}
                  </pre>
                </div>
              )}

              {prismaTables.length > 0 && (
                <div className="space-y-3">
                  <div className="text-[11px] font-bold text-slate-300">
                    Danh sách các bảng đã khảo sát trong PostgreSQL (Nhấn vào bảng để xem cột &amp; dữ liệu trực tiếp qua Prisma Client):
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-60 overflow-y-auto pr-1">
                    {prismaTables.map((tb) => (
                      <button
                        key={tb.tableName}
                        type="button"
                        onClick={() => handleInspectTableRows(tb.tableName)}
                        className={`text-left p-2.5 rounded-lg border transition ${
                          selectedInspectTable === tb.tableName
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                            : 'bg-[#0d1117] border-white/5 hover:border-white/20 text-slate-300'
                        }`}
                      >
                        <div className="font-mono text-[11px] font-bold truncate text-emerald-400">
                          {tb.tableName}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                          <span>{tb.columnCount} cột</span>
                          <span className="font-mono font-bold text-white">{tb.rowCount} dòng</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedInspectTable && (
                    <div className="bg-[#0d1117] border border-white/10 rounded-lg p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono">
                          Bảng: <span className="text-emerald-400">{selectedInspectTable}</span> ({inspectTableRows.length} bản ghi hiển thị)
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedInspectTable(null)}
                          className="text-[11px] text-slate-400 hover:text-white"
                        >
                          Đóng
                        </button>
                      </div>
                      {loadingTableRows ? (
                        <div className="text-xs text-slate-400 py-4 text-center">
                          Đang truy vấn dữ liệu qua Prisma Client...
                        </div>
                      ) : inspectTableRows.length === 0 ? (
                        <div className="text-xs text-slate-500 py-3 text-center">
                          Bảng <code className="font-mono text-slate-300">{selectedInspectTable}</code> hiện chưa có bản ghi nào (0 dòng).
                        </div>
                      ) : (
                        <div className="overflow-x-auto max-h-60">
                          <table className="w-full text-left border-collapse text-[11px] font-mono">
                            <thead>
                              <tr className="border-b border-white/10 text-slate-200 bg-white/[0.07]">
                                {Object.keys(inspectTableRows[0]).map((col) => (
                                  <th key={col} className="py-1.5 px-2.5 font-bold whitespace-nowrap">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {inspectTableRows.slice(0, 15).map((row, idx) => (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 text-slate-300">
                                  {Object.keys(inspectTableRows[0]).map((col) => (
                                    <td key={col} className="py-1.5 px-2.5 whitespace-nowrap max-w-[220px] truncate">
                                      {typeof row[col] === 'object' && row[col] !== null
                                        ? JSON.stringify(row[col])
                                        : String(row[col] ?? '')}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 30-Table Schema Summary Card */}
            <div className="bg-[#161a23] border border-white/10 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Kiến trúc PostgreSQL &amp; Prisma ORM Thực Tế 
                </h4>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-300">
                <div className="bg-[#0d1117] border border-white/5 rounded-lg p-3 space-y-1">
                  <div className="font-bold text-white mb-1">1. Danh mục &amp; Kho vận (9 bảng)</div>
                  <div className="font-mono text-[10px] text-slate-400">
                    categories, uoms, warehouses, suppliers, customers, products, stock_transactions (IN/OUT/OPENING), stock_transaction_details, inventory_stock
                  </div>
                </div>
                <div className="bg-[#0d1117] border border-white/5 rounded-lg p-3 space-y-1">
                  <div className="font-bold text-white mb-1">2. Kế toán, Thuế, Công nợ &amp; Khóa sổ (10 bảng)</div>
                  <div className="font-mono text-[10px] text-slate-400">
                    chart_of_accounts, account_mappings, journal_entries, journal_entry_lines, debts, payments, vat_ledger, quotations, quotation_details, fiscal_closings
                  </div>
                </div>
                <div className="bg-[#0d1117] border border-white/5 rounded-lg p-3 space-y-1">
                  <div className="font-bold text-white mb-1">3. Webshop, RBAC &amp; Hệ thống (11 bảng)</div>
                  <div className="font-mono text-[10px] text-slate-400">
                    webshop_store_config, webshop_product_configs, webshop_orders, webshop_order_items, roles, users, company_info, system_config, sequence_configs, print_templates, erp_collections
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Hướng dẫn Kết nối Supabase Cloud */}
      {showSupabaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#12161f] border border-emerald-500/30 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#161b26]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Zap className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Hướng dẫn Kết nối Dữ liệu Supabase Cloud
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                      PostgreSQL
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Đồng bộ 100% dữ liệu kế toán kho vào database đám mây Supabase (Zero-Mock Policy)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSupabaseModal(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
              {/* Step 1 */}
              <div className="bg-[#181d28] border border-white/5 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-300 border border-emerald-500/30">1</span>
                  Tạo Dự Án Supabase & Lấy Chuỗi Kết Nối (Connection URI)
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Đăng ký/đăng nhập <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold inline-flex items-center gap-1">supabase.com <ExternalLink className="w-3 h-3 inline" /></a> và bấm <strong>New Project</strong>. Sau khi khởi tạo xong:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                  <li>Vào <strong>Project Settings</strong> (biểu tượng bánh răng) &gt; chọn mục <strong>Database</strong>.</li>
                  <li>Cuộn xuống mục <strong>Connection string</strong> &gt; chọn tab <strong>URI</strong>.</li>
                  <li>Chọn chế độ <strong>Transaction</strong> (Cổng <code className="text-emerald-300 font-mono">6543</code>) — Đây là chế độ Connection Pooler tối ưu nhất cho cloud/serverless.</li>
                </ul>
              </div>

              {/* Step 2 */}
              <div className="bg-[#181d28] border border-white/5 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-300 border border-emerald-500/30">2</span>
                  Khởi Tạo 30 Bảng ERP Trong Supabase SQL Editor
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Để đảm bảo cấu trúc bảng đầy đủ cho toàn bộ nghiệp vụ (Kho hàng, Bút toán Nợ/Có, VAT, Khóa sổ, Webshop...), bạn chỉ cần dán đoạn mã khởi tạo vào Supabase:
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleCopySqlSchema}
                    className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 transition"
                  >
                    {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedSql ? 'Đã sao chép 30 bảng SQL!' : 'Sao chép mã SQL 30 bảng (database_setup.sql)'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSqlSchema}
                    className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-xs flex items-center gap-2 border border-white/10 transition"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    Tải file database_setup.sql
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 italic mt-1">
                  * Trên Supabase Dashboard, bấm <strong>SQL Editor</strong> ở thanh menu bên trái, dán đoạn mã vừa copy vào và bấm <strong>Run</strong>. Toàn bộ 30 bảng sẽ được tạo ngay lập tức.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-[#181d28] border border-white/5 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-300 border border-emerald-500/30">3</span>
                  Dán Chuỗi Kết Nối Vào Cài Đặt Hệ Thống
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Dán chuỗi kết nối URI vào ô <strong>Chuỗi kết nối PostgreSQL (Connection URI)</strong>. Lưu ý thay thế <code className="text-amber-300 font-mono">[YOUR-PASSWORD]</code> bằng mật khẩu database lúc bạn tạo dự án.
                </p>
                <div className="bg-[#0f131a] p-3 rounded-lg border border-white/5 font-mono text-[11px] text-emerald-300 flex items-center justify-between">
                  <span>postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres</span>
                  <button
                    type="button"
                    onClick={() => {
                      handleFillSupabaseTemplate('pooler');
                      setShowSupabaseModal(false);
                    }}
                    className="ml-3 shrink-0 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded font-sans font-bold text-[10px]"
                  >
                    Áp dụng mẫu ngay
                  </button>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-[#181d28] border border-white/5 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-300 border border-emerald-500/30">4</span>
                  Bấm "Kết nối PostgreSQL" & Xác Nhận 100% Dữ Liệu Thật
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Sau khi kết nối thành công, hệ thống tự động:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                  <li>Kích hoạt mã hóa bảo mật <strong>SSL/TLS</strong>.</li>
                  <li>Tự động vô hiệu hóa toàn bộ Mock Data (dữ liệu mẫu).</li>
                  <li>Đồng bộ tức thì mọi nghiệp vụ mua bán, xuất nhập, hóa đơn, công nợ lên Supabase.</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-[#161b26] flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Chuẩn kết nối: PostgreSQL v15+ / Supabase Transaction Pooler (Cổng 6543)
              </span>
              <button
                type="button"
                onClick={() => setShowSupabaseModal(false)}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition"
              >
                Đã hiểu & Bắt đầu kết nối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Hướng dẫn Deploy lên Cloudflare */}
      {showCloudflareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#12161f] border border-amber-500/30 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#161b26]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Cloud className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Hướng dẫn Triển Khai (Deploy) lên Cloudflare
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                      Pages & Workers
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Triển khai hệ thống WMS ERP với tốc độ cao qua hạ tầng Cloudflare CDN toàn cầu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCloudflareModal(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
              {/* Ready config notice */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-white text-xs">Dự án đã được cấu hình sẵn sàng cho Cloudflare:</div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    1. Đã tạo file <code className="text-emerald-300 font-mono">public/_redirects</code> (<span className="font-mono">/* /index.html 200</span>) để chống lỗi 404 khi tải lại trang (SPA routing).<br />
                    2. Đã tạo file <code className="text-emerald-300 font-mono">wrangler.toml</code> chuẩn định dạng Cloudflare Pages (<span className="font-mono">pages_build_output_dir = "dist"</span>).
                  </p>
                </div>
              </div>

              {/* Step 1 */}
              <div className="bg-[#181d28] border border-white/5 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs text-amber-300 border border-amber-500/30">1</span>
                  Đẩy Mã Nguồn Lên GitHub / GitLab
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Mở terminal và thực thi các câu lệnh sau để đưa mã nguồn lên kho lưu trữ Git:
                </p>
                <div className="bg-[#0f131a] p-3 rounded-lg border border-white/5 font-mono text-[11px] text-amber-200 space-y-1">
                  <div>git add .</div>
                  <div>git commit -m &quot;Configure Cloudflare deployment &amp; Supabase DB&quot;</div>
                  <div>git push origin main</div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-[#181d28] border border-white/5 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs text-amber-300 border border-amber-500/30">2</span>
                  Tạo Dự Án Trên Cloudflare Pages
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-slate-300 pl-1 leading-relaxed">
                  <li>Truy cập <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" className="text-amber-400 underline font-semibold inline-flex items-center gap-1">dash.cloudflare.com <ExternalLink className="w-3 h-3 inline" /></a>.</li>
                  <li>Chọn <strong>Compute (Workers &amp; Pages)</strong> ở menu trái &gt; bấm <strong>Create application</strong>.</li>
                  <li>Chọn tab <strong>Pages</strong> &gt; chọn <strong>Connect to Git</strong>.</li>
                  <li>Chọn kho lưu trữ GitHub của bạn và bấm <strong>Begin setup</strong>.</li>
                </ul>
              </div>

              {/* Step 3 */}
              <div className="bg-[#181d28] border border-white/5 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs text-amber-300 border border-amber-500/30">3</span>
                  Cấu Hình Thiết Lập Bản Dựng (Build Settings)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-[#0f131a] p-3 rounded-lg border border-white/5">
                    <span className="text-[10px] uppercase text-slate-500 font-bold">Framework preset</span>
                    <div className="font-mono text-emerald-400 text-xs mt-1 font-bold">Vite (hoặc None)</div>
                  </div>
                  <div className="bg-[#0f131a] p-3 rounded-lg border border-white/5">
                    <span className="text-[10px] uppercase text-slate-500 font-bold">Build command</span>
                    <div className="font-mono text-emerald-400 text-xs mt-1 font-bold">npm run build</div>
                  </div>
                  <div className="bg-[#0f131a] p-3 rounded-lg border border-white/5">
                    <span className="text-[10px] uppercase text-slate-500 font-bold">Build output directory</span>
                    <div className="font-mono text-emerald-400 text-xs mt-1 font-bold">dist</div>
                  </div>
                  <div className="bg-[#0f131a] p-3 rounded-lg border border-white/5">
                    <span className="text-[10px] uppercase text-slate-500 font-bold">Environment variable</span>
                    <div className="font-mono text-emerald-400 text-xs mt-1 font-bold">NODE_VERSION = 20</div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Bấm <strong>Save and Deploy</strong>. Cloudflare sẽ tự động build và cấp domain miễn phí <code className="text-amber-300 font-mono">*.pages.dev</code> kèm chứng chỉ SSL/TLS miễn phí vĩnh viễn.
                </p>
              </div>

              {/* Step 4 */}
              <div className="bg-[#181d28] border border-white/5 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs text-amber-300 border border-amber-500/30">4</span>
                  Mô Hình Kiến Trúc Kết Nối Supabase
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Để vận hành hoàn chỉnh cả Giao diện (Frontend) và Dịch vụ (Backend):
                </p>
                <div className="space-y-2 text-slate-300 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                    <strong className="text-amber-300">Cách 1 (Tách Frontend &amp; Backend):</strong> Frontend chạy trên <strong>Cloudflare Pages</strong> (siêu nhanh, CDN toàn cầu). Backend Express chạy trên VPS, Docker, Railway, Render hoặc Cloudflare Workers với biến môi trường <code className="text-emerald-300 font-mono">DATABASE_URL</code> trỏ thẳng đến Supabase.
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                    <strong className="text-amber-300">Cách 2 (Fullstack với Cloudflare Tunnel):</strong> Chạy cả cụm Node.js trên máy chủ nội bộ hoặc VPS, sử dụng <strong>Cloudflare Zero Trust / Tunnel</strong> (<code className="text-emerald-300 font-mono">cloudflared</code>) để đưa ứng dụng ra internet an toàn mà không cần mở port.
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-[#161b26] flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Hỗ trợ Cloudflare Pages / Cloudflare Workers / Wrangler CLI
              </span>
              <button
                type="button"
                onClick={() => setShowCloudflareModal(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs transition"
              >
                Đã hiểu & Bắt đầu Deploy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
