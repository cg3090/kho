import React, { useState, useRef } from 'react';
import { MockDatabase } from '../db/mockDb';
import {
  ExcelImportType,
  EXCEL_IMPORT_METADATA,
  parseExcelFileToRows,
  parsePastedTextToRows,
  executeExcelRowsImport,
  downloadExcelTemplate,
  downloadCsvTemplate,
  exportDataToExcel,
} from '../utils/excelHelper';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
  ClipboardPaste,
  Table,
  RefreshCw,
} from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: MockDatabase;
  defaultType: ExcelImportType;
  onUpdate: () => void;
  onImportSuccess?: (summaryText: string) => void;
}

export default function ExcelImportModal({
  isOpen,
  onClose,
  db,
  defaultType,
  onUpdate,
  onImportSuccess,
}: ExcelImportModalProps) {
  const [selectedType, setSelectedType] = useState<ExcelImportType>(defaultType);
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<any[][]>([]);
  const [pasteText, setPasteText] = useState<string>('');
  const [autoConfirmVouchers, setAutoConfirmVouchers] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultLogs, setResultLogs] = useState<{ type: 'success' | 'error' | 'info'; text: string }[]>([]);
  const [resultErrors, setResultErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedType(defaultType);
      setFileName('');
      setParsedRows([]);
      setPasteText('');
      setResultLogs([]);
      setResultErrors([]);
    }
  }, [isOpen, defaultType]);

  if (!isOpen) return null;

  const meta = EXCEL_IMPORT_METADATA[selectedType];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setResultLogs([]);
    setResultErrors([]);
    try {
      const rows = await parseExcelFileToRows(file);
      setFileName(file.name);
      setParsedRows(rows);
    } catch (err: any) {
      setResultErrors([`Không thể đọc file Excel: ${err?.message || String(err)}`]);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePasteChange = (val: string) => {
    setPasteText(val);
    const rows = parsePastedTextToRows(val);
    setParsedRows(rows);
  };

  const handleExecuteImport = () => {
    const rowsToImport = inputMode === 'paste' ? parsePastedTextToRows(pasteText) : parsedRows;
    if (!rowsToImport || rowsToImport.length === 0) {
      setResultErrors(['Vui lòng chọn file Excel (.xlsx, .xls, .csv) hoặc dán dữ liệu trước khi nhấn Lưu.']);
      return;
    }

    setIsProcessing(true);
    try {
      const res = executeExcelRowsImport(db, selectedType, rowsToImport, {
        autoConfirmVouchers,
      });
      setResultLogs(res.logs);
      setResultErrors(res.errors);

      if (res.successCount > 0) {
        onUpdate();
        if (onImportSuccess) {
          onImportSuccess(`Đã import thành công ${res.successCount} dòng vào ${meta.label}!`);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#11141b]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Nhập Dữ Liệu Hàng Loạt Từ Excel (.xlsx, .xls, .csv)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Dữ liệu sau khi lưu sẽ được đồng bộ và hiển thị ngay lập tức trên giao diện mà không cần tải lại trang (F5).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Top Selector & Template Download Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161a23] border border-white/10 rounded-xl p-4">
            <div className="space-y-1 flex-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Phân hệ dữ liệu cần Import:
              </label>
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value as ExcelImportType);
                  setParsedRows([]);
                  setFileName('');
                  setResultLogs([]);
                  setResultErrors([]);
                }}
                className="w-full md:max-w-md text-xs font-bold bg-[#0d1117] border border-white/15 rounded-lg px-3 py-2 text-white focus:border-emerald-500/50 outline-none"
              >
                {Object.values(EXCEL_IMPORT_METADATA).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 pt-1">{meta.description}</p>
              {selectedType === 'vouchers' && (
                <label className="inline-flex items-center gap-2 pt-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoConfirmVouchers}
                    onChange={(e) => setAutoConfirmVouchers(e.target.checked)}
                    className="rounded border-white/20 bg-black text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-emerald-400">
                    Tự động Xác nhận (Confirm) &amp; Hạch toán Tồn kho / Sổ cái ngay sau khi Import
                  </span>
                </label>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  downloadExcelTemplate(selectedType);
                  setResultLogs([
                    {
                      type: 'info',
                      text: `Đã tải xuống file mẫu Mau_Import_${selectedType.toUpperCase()}.xlsx (${meta.columns.length} cột chuẩn).`,
                    },
                  ]);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Mẫu</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  downloadCsvTemplate(selectedType);
                  setResultLogs([
                    {
                      type: 'info',
                      text: `Đã tải xuống file mẫu Mau_Import_${selectedType.toUpperCase()}.csv (UTF-8).`,
                    },
                  ]);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 text-xs font-bold transition"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tải Mẫu (.csv)</span>
              </button>
              <button
                type="button"
                onClick={() => exportDataToExcel(db, selectedType)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Xuất Excel Hiện Tại</span>
              </button>
            </div>
          </div>

          {/* Expected Columns Guide */}
          <div className="bg-[#11141b] border border-white/5 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">Cấu trúc cột chuẩn trong File Excel ({meta.columns.length} cột):</span>
              <span className="text-[11px] text-slate-400">Hàng đầu tiên là tiêu đề cột</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-emerald-400 font-mono">
              {meta.columns.map((col, idx) => (
                <React.Fragment key={col}>
                  <span className="bg-[#161a23] border border-white/10 px-2.5 py-1 rounded text-slate-200">
                    <strong className="text-emerald-400 mr-1">{idx + 1}.</strong>
                    {col}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Mode Switcher: Upload Excel File vs Copy-Paste from Excel */}
          <div className="flex items-center gap-1.5 bg-[#161a23] p-1 rounded-lg border border-white/10 w-fit">
            <button
              type="button"
              onClick={() => setInputMode('file')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition ${
                inputMode === 'file' ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Chọn File Excel (.xlsx, .xls, .csv)</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('paste')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition ${
                inputMode === 'paste' ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Copy &amp; Dán Trực Tiếp Từ Bảng Excel</span>
            </button>
          </div>

          {inputMode === 'file' ? (
            <div className="border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/60 bg-[#161a23]/60 rounded-xl p-6 text-center transition">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="excel-modal-file-input"
              />
              <label
                htmlFor="excel-modal-file-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">
                    {fileName ? `Đã nạp file: ${fileName}` : 'Nhấn vào đây để chọn file Excel (.xlsx, .xls, .csv) từ máy tính'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Hỗ trợ đọc trực tiếp Sheet đầu tiên của file Microsoft Excel (.xlsx, .xls) hoặc CSV UTF-8
                  </p>
                </div>
                <span className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition">
                  <FileSpreadsheet className="w-4 h-4" />
                  Chọn File Excel Từ Máy Tính
                </span>
              </label>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">
                Bôi đen các dòng trong bảng Excel (Ctrl+C) và dán (Ctrl+V) vào ô bên dưới:
              </label>
              <textarea
                rows={6}
                value={pasteText}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder={
                  meta.columns.join('\t') +
                  '\n' +
                  meta.sampleRows.map((r) => r.join('\t')).join('\n')
                }
                className="w-full font-mono text-xs border border-white/10 rounded-xl p-3 bg-[#161a23] text-white focus:border-emerald-500/50 outline-none"
              />
            </div>
          )}

          {/* Live Preview of Parsed Rows */}
          {parsedRows.length > 0 && (
            <div className="bg-[#161a23] border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Table className="w-4 h-4" />
                  <span>Xem trước dữ liệu đọc từ Excel ({parsedRows.length} dòng)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setParsedRows([]);
                    setFileName('');
                    setPasteText('');
                  }}
                  className="text-xs text-slate-400 hover:text-rose-400 font-semibold"
                >
                  Xóa dữ liệu xem trước
                </button>
              </div>
              <div className="overflow-x-auto max-h-48 border border-white/5 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0d1117] border-b border-white/10 text-slate-300">
                      <th className="p-2 font-mono text-[10px] text-slate-500">#</th>
                      {meta.columns.map((col, i) => (
                        <th key={i} className="p-2 font-bold whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                    {parsedRows.slice(0, 15).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-white/[0.02]">
                        <td className="p-2 text-slate-500">{rIdx + 1}</td>
                        {meta.columns.map((_, cIdx) => (
                          <td key={cIdx} className="p-2 text-slate-200 whitespace-nowrap max-w-[200px] truncate">
                            {String(row[cIdx] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result Logs & Errors */}
          {(resultLogs.length > 0 || resultErrors.length > 0) && (
            <div className="bg-[#161a23] border border-white/10 rounded-xl p-4 space-y-2 max-h-52 overflow-y-auto">
              {resultErrors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Cảnh báo ({resultErrors.length}):</span>
                  </p>
                  {resultErrors.map((err, i) => (
                    <p key={i} className="text-xs font-mono text-rose-300 pl-5">
                      • {err}
                    </p>
                  ))}
                </div>
              )}
              {resultLogs.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đã nhập &amp; cập nhật tức thì ({resultLogs.length} bản ghi):</span>
                  </p>
                  {resultLogs.map((l, i) => (
                    <p key={i} className="text-xs font-mono text-emerald-300 pl-5">
                      ✓ {l.text}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#11141b] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={isProcessing || (parsedRows.length === 0 && !pasteText.trim())}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400 text-black font-extrabold text-xs uppercase tracking-wider transition"
          >
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Lưu &amp; Cập Nhật Ngay ({parsedRows.length > 0 ? `${parsedRows.length} dòng` : 'Import'})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
