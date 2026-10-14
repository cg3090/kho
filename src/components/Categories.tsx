/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MockDatabase } from '../db/mockDb';
import { User } from '../types';
import { canViewPurchaseCost } from '../utils/rbac';
import { Plus, Edit2, Trash2, Package, Tag, Layers, Home, Users, CheckSquare, UserCheck, Eye, Camera, Upload, X, Coins, TrendingUp, Lock, FileSpreadsheet, Download, CheckCircle2 } from 'lucide-react';
import AdvancedFilter from './AdvancedFilter';
import AdvancedTable from './AdvancedTable';
import SearchableSelect from './SearchableSelect';
import ExcelImportModal from './ExcelImportModal';
import { downloadExcelTemplate, exportDataToExcel, ExcelImportType } from '../utils/excelHelper';
import { motion } from 'motion/react';
import { formatDate } from '../utils/dateUtils';

interface CategoriesProps {
  db: MockDatabase;
  onUpdate: () => void;
  updateTrigger?: number;
  currentUser?: User | null;
}

export default function Categories({ db, onUpdate, updateTrigger, currentUser }: CategoriesProps) {
  const canViewCost = canViewPurchaseCost(currentUser, db.roles);
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'suppliers' | 'customers' | 'warehouses' | 'categories' | 'uoms'>('products');

  // Creation State managers
  const [showForm, setShowForm] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // General fields
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [uomId, setUomId] = useState('');
  const [altUomId, setAltUomId] = useState('');
  const [uomConversionRate, setUomConversionRate] = useState<number>(1);
  const [initialQty, setInitialQty] = useState<number>(0);
  const [initialCost, setInitialCost] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [location, setLocation] = useState('');

  const syncProductOpeningStockIfDirect = (prodId: string, qty: number, cost: number) => {
    const hasConfirmedInOut = db.stockTransactions.some(
      (t) =>
        t.isConfirmed &&
        !t.isReversed &&
        (t.type === 'IN' || t.type === 'OUT') &&
        db.stockTransactionDetails.some((d) => d.txId === t.id && d.productId === prodId)
    );
    if (hasConfirmedInOut) return;

    let defaultWh = db.warehouses[0];
    if (!defaultWh) {
      defaultWh = { id: `wh-${Date.now()}`, name: 'Kho Chính', location: 'Kho mặc định' };
      db.warehouses.push(defaultWh);
    }
    const currentYear = new Date().getFullYear();
    const existingOpening = db.getOpeningStockVoucher(currentYear, defaultWh.id);
    const mergedMap = new Map<string, { qty: number; unitCost: number }>();
    for (const d of existingOpening.details) {
      mergedMap.set(d.productId, { qty: d.qty, unitCost: d.unitPrice });
    }
    mergedMap.set(prodId, { qty: Math.max(0, qty), unitCost: Math.max(0, cost) });
    const allLines = Array.from(mergedMap.entries()).map(([productId, val]) => ({
      productId,
      qty: val.qty,
      unitCost: val.unitCost,
    }));
    db.saveOpeningStockBalance({
      fiscalYear: currentYear,
      warehouseId: defaultWh.id,
      lines: allLines,
      notes: `Tự động đồng bộ Tồn đầu kỳ từ Danh mục Hàng hóa`,
    });
  };

  // Image Upload and Details Modal states
  const [imageUrl, setImageUrl] = useState('');
  const [logoLoading, setLogoLoading] = useState(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState<any | null>(null);
  const [detailsSubTab, setDetailsSubTab] = useState<'warehouses' | 'transactions' | 'prices'>('warehouses');

  // Editing state
  const [editingItem, setEditingItem] = useState<{ type: string; data: any } | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const startEdit = (type: string, item: any) => {
    setEditingItem({ type, data: item });
    setEditForm({ ...item });
  };

  const handleEditProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const compressed = await compressProductImage(base64);
        setEditForm((prev: any) => ({ ...prev, imageUrl: compressed }));
      } catch (err) {
        setEditForm((prev: any) => ({ ...prev, imageUrl: base64 }));
      } finally {
        setLogoLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const { type, data: originalItem } = editingItem;

    // Validation
    if (type === 'products') {
      if (!editForm.sku || !editForm.name || !editForm.categoryId || !editForm.uomId) {
        return showToast('Vui lòng nhập đủ thông tin bắt buộc (SKU, Tên, Danh mục, ĐVT).');
      }
      // Check duplicate SKU (excluding original item's SKU)
      const duplicateSku = db.products.some(
        (p) => p.id !== originalItem.id && p.sku.toUpperCase() === editForm.sku.toUpperCase()
      );
      if (duplicateSku) {
        return showToast('Mã SKU đã tồn tại!');
      }
    } else {
      if (!editForm.name) {
        return showToast('Vui lòng nhập tên.');
      }
    }

    // Direct mutative update or array replacement
    if (type === 'products') {
      const idx = db.products.findIndex((p) => p.id === originalItem.id);
      if (idx !== -1) {
        const nextQty = editForm.currentQty !== undefined ? Number(editForm.currentQty) : db.products[idx].currentQty;
        const nextCost = editForm.averageCost !== undefined ? Number(editForm.averageCost) : db.products[idx].averageCost;
        const qtyOrCostChanged = nextQty !== db.products[idx].currentQty || nextCost !== db.products[idx].averageCost;

        db.products[idx] = {
          ...db.products[idx],
          sku: editForm.sku.toUpperCase().trim(),
          name: editForm.name.trim(),
          categoryId: editForm.categoryId,
          uomId: editForm.uomId,
          altUomId: editForm.altUomId || undefined,
          uomConversionRate: editForm.altUomId ? Number(editForm.uomConversionRate) : undefined,
          description: editForm.description || '',
          imageUrl: editForm.imageUrl || undefined,
          currentQty: nextQty,
          averageCost: nextCost,
        };

        if (qtyOrCostChanged) {
          syncProductOpeningStockIfDirect(originalItem.id, nextQty, nextCost);
        }
      }
    } else if (type === 'suppliers') {
      const idx = db.suppliers.findIndex((s) => s.id === originalItem.id);
      if (idx !== -1) {
        db.suppliers[idx] = {
          ...db.suppliers[idx],
          name: editForm.name.trim(),
          taxCode: editForm.taxCode?.trim() || '',
          phone: editForm.phone || '',
          address: editForm.address || '',
        };
      }
    } else if (type === 'customers') {
      const idx = db.customers.findIndex((c) => c.id === originalItem.id);
      if (idx !== -1) {
        db.customers[idx] = {
          ...db.customers[idx],
          name: editForm.name.trim(),
          taxCode: editForm.taxCode?.trim() || '',
          phone: editForm.phone || '',
          address: editForm.address || '',
        };
      }
    } else if (type === 'warehouses') {
      const idx = db.warehouses.findIndex((w) => w.id === originalItem.id);
      if (idx !== -1) {
        db.warehouses[idx] = {
          ...db.warehouses[idx],
          name: editForm.name.trim(),
          location: editForm.location || '',
        };
      }
    } else if (type === 'categories') {
      const idx = db.categories.findIndex((c) => c.id === originalItem.id);
      if (idx !== -1) {
        db.categories[idx] = {
          ...db.categories[idx],
          name: editForm.name.trim(),
          description: editForm.description || '',
        };
      }
    } else if (type === 'uoms') {
      const idx = db.uoms.findIndex((u) => u.id === originalItem.id);
      if (idx !== -1) {
        db.uoms[idx] = {
          ...db.uoms[idx],
          name: editForm.name.trim(),
        };
      }
    }

    db.ensureDefaultWebshopConfigs();
    db.saveAll();
    onUpdate();
    setEditingItem(null);
    setFilteredProducts(applyProductFilters(productFilters, db.products));
    showToast('Đã lưu cập nhật dữ liệu thành công!');
  };

  // Filtering products state & logic
  const [productFilters, setProductFilters] = useState<Record<string, any>>({});
  const [filteredProducts, setFilteredProducts] = useState(db.products);

  const applyProductFilters = (filters: Record<string, any>, sourceProducts = db.products) => {
    let result = [...sourceProducts];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    if (filters.categoryId) {
      result = result.filter((p) => p.categoryId === filters.categoryId);
    }
    if (filters.uomId) {
      result = result.filter((p) => p.uomId === filters.uomId);
    }
    if (filters.qtyRange) {
      const { min, max } = filters.qtyRange;
      if (min !== undefined && min !== '') {
        result = result.filter((p) => p.currentQty >= Number(min));
      }
      if (max !== undefined && max !== '') {
        result = result.filter((p) => p.currentQty <= Number(max));
      }
    }

    return result;
  };

  // Synchronize filteredProducts while strictly preserving any active filters
  useEffect(() => {
    setFilteredProducts(applyProductFilters(productFilters, db.products));
  }, [updateTrigger, db.products, db.products.length, productFilters]);

  const handleFilterChange = (filters: Record<string, any>) => {
    setProductFilters(filters);
    setFilteredProducts(applyProductFilters(filters, db.products));
  };

  const handleResetFilter = () => {
    setProductFilters({});
    setFilteredProducts(db.products);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeSubTab === 'products') {
      const finalCatId = categoryId || db.categories[0]?.id || 'cat-default';
      const finalUomId = uomId || db.uoms[0]?.id || 'uom-default';
      if (!sku || !name) return showToast('Vui lòng nhập Mã SKU và Tên hàng hóa.');
      if (db.products.some((p) => p.sku.toUpperCase() === sku.toUpperCase())) {
        return showToast('Mã SKU đã tồn tại!');
      }
      if (!db.categories.some((c) => c.id === finalCatId)) {
        db.categories.push({ id: finalCatId, name: 'Hàng hóa chung', description: 'Mặc định' });
      }
      if (!db.uoms.some((u) => u.id === finalUomId)) {
        db.uoms.push({ id: finalUomId, name: 'Cái' });
      }

      const newProdId = `prod-${Date.now()}`;
      db.products.push({
        id: newProdId,
        sku: sku.toUpperCase().trim(),
        name: name.trim(),
        categoryId: finalCatId,
        uomId: finalUomId,
        altUomId: altUomId || undefined,
        uomConversionRate: altUomId ? Number(uomConversionRate) : undefined,
        description,
        currentQty: Number(initialQty) || 0,
        averageCost: Number(initialCost) || 0,
        imageUrl: imageUrl || undefined,
      });

      if (Number(initialQty) > 0) {
        syncProductOpeningStockIfDirect(newProdId, Number(initialQty), Number(initialCost) || 0);
      }
    } else if (activeSubTab === 'suppliers') {
      if (!name || !taxCode) return showToast('Tên và Mã số thuế là bắt buộc.');
      db.suppliers.push({
        id: `sup-${Date.now()}`,
        name: name.trim(),
        taxCode: taxCode.trim(),
        phone,
        address,
      });
    } else if (activeSubTab === 'customers') {
      if (!name || !taxCode) return showToast('Tên và Mã số thuế là bắt buộc.');
      db.customers.push({
        id: `cus-${Date.now()}`,
        name: name.trim(),
        taxCode: taxCode.trim(),
        phone,
        address,
      });
    } else if (activeSubTab === 'warehouses') {
      if (!name) return showToast('Tên kho là bắt buộc.');
      db.warehouses.push({
        id: `wh-${Date.now()}`,
        name: name.trim(),
        location,
      });
    } else if (activeSubTab === 'categories') {
      if (!name) return showToast('Tên danh mục là bắt buộc.');
      db.categories.push({
        id: `cat-${Date.now()}`,
        name: name.trim(),
        description,
      });
    } else if (activeSubTab === 'uoms') {
      if (!name) return showToast('Tên đơn vị tính là bắt buộc.');
      db.uoms.push({
        id: `uom-${Date.now()}`,
        name: name.trim(),
      });
    }

    db.ensureDefaultWebshopConfigs();
    db.saveAll();
    onUpdate();
    setShowForm(false);
    resetFormFields();
    // Refresh filters immediately while preserving active filter criteria
    setFilteredProducts(applyProductFilters(productFilters, db.products));
    showToast('Đã thêm mới và cập nhật dữ liệu ngay lập tức!');
  };

  const generateAutoSku = () => {
    if (!categoryId) {
      showToast('Vui lòng chọn danh mục trước khi sinh mã SKU!');
      return;
    }
    const cat = db.categories.find((c) => c.id === categoryId);
    if (!cat) return;
    // Map words to first letters
    const words = cat.name.split(' ');
    let prefix = words.map(w => w.charAt(0).toUpperCase()).join('');
    // Remove Vietnamese accents
    prefix = prefix.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D');
    // Get product count to form SKU, e.g., DT001
    const count = db.products.filter(p => p.categoryId === categoryId).length + 1;
    const generatedSku = `${prefix}${String(count).padStart(3, '0')}`;
    setSku(generatedSku);
  };

  const compressProductImage = (base64Str: string, maxWidth = 600, maxHeight = 600): Promise<string> => {
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
        resolve(canvas.toDataURL('image/jpeg', 0.88)); // 88% Quality JPEG
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const compressed = await compressProductImage(base64);
        setImageUrl(compressed);
      } catch (err) {
        setImageUrl(base64);
      } finally {
        setLogoLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const getQtyInWarehouse = (prodId: string, whId: string): number => {
    let qty = 0;
    db.stockTransactions.forEach((tx) => {
      if (tx.isConfirmed && !tx.isReversed && tx.warehouseId === whId && !tx.isCarryForward) {
        const details = db.stockTransactionDetails.filter((d) => d.txId === tx.id && d.productId === prodId);
        details.forEach((d) => {
          if (tx.type === 'IN' || tx.type === 'OPENING') {
            qty += d.qty;
          } else if (tx.type === 'OUT') {
            qty -= d.qty;
          }
        });
      }
    });
    return qty;
  };

  const getProductTxHistory = (prodId: string) => {
    const history: {
      txId: string;
      referenceNo: string;
      date: string;
      type: string;
      partnerName: string;
      qty: number;
      unitPrice: number;
      totalPrice: number;
    }[] = [];

    db.stockTransactions.forEach((tx) => {
      if (tx.isConfirmed && !tx.isReversed) {
        const line = db.stockTransactionDetails.find((d) => d.txId === tx.id && d.productId === prodId);
        if (line) {
          let partnerName = 'Nội bộ / Khác';
          if (tx.type === 'OPENING') {
            partnerName = tx.isCarryForward
              ? `Kết chuyển từ năm ${tx.linkedClosingYear || ''}`
              : `Số dư tồn đầu kỳ ${tx.fiscalYear || ''}`;
          } else if (tx.type === 'IN' && tx.supplierId) {
            partnerName = db.suppliers.find((s) => s.id === tx.supplierId)?.name || tx.supplierId;
          } else if (tx.type === 'OUT' && tx.customerId) {
            partnerName = db.customers.find((c) => c.id === tx.customerId)?.name || tx.customerId;
          }

          history.push({
            txId: tx.id,
            referenceNo: tx.referenceNo,
            date: tx.date,
            type: tx.type,
            partnerName,
            qty: line.qty,
            unitPrice: line.unitPrice,
            totalPrice: line.totalPrice,
          });
        }
      }
    });

    return history.sort((a, b) => b.date.localeCompare(a.date));
  };

  const resetFormFields = () => {
    setSku('');
    setName('');
    setCategoryId(db.categories[0]?.id || '');
    setUomId(db.uoms[0]?.id || '');
    setAltUomId('');
    setUomConversionRate(1);
    setInitialQty(0);
    setInitialCost(0);
    setDescription('');
    setPhone('');
    setAddress('');
    setTaxCode('');
    setLocation('');
    setImageUrl('');
  };

  const deleteItem = (id: string) => {
    if (activeSubTab === 'products') {
      db.products = db.products.filter((p) => p.id !== id);
    } else if (activeSubTab === 'suppliers') {
      db.suppliers = db.suppliers.filter((s) => s.id !== id);
    } else if (activeSubTab === 'customers') {
      db.customers = db.customers.filter((c) => c.id !== id);
    } else if (activeSubTab === 'warehouses') {
      db.warehouses = db.warehouses.filter((w) => w.id !== id);
    } else if (activeSubTab === 'categories') {
      db.categories = db.categories.filter((c) => c.id !== id);
    } else if (activeSubTab === 'uoms') {
      db.uoms = db.uoms.filter((u) => u.id !== id);
    }

    db.saveAll();
    onUpdate();
    setFilteredProducts(applyProductFilters(productFilters, db.products));
    showToast('Đã xóa mục đã chọn.');
  };

  const deleteItemsBulk = (items: any[], clearSelection: () => void) => {
    const ids = items.map((x) => x.id);
    if (activeSubTab === 'products') {
      db.products = db.products.filter((p) => !ids.includes(p.id));
    } else if (activeSubTab === 'suppliers') {
      db.suppliers = db.suppliers.filter((s) => !ids.includes(s.id));
    } else if (activeSubTab === 'customers') {
      db.customers = db.customers.filter((c) => !ids.includes(c.id));
    } else if (activeSubTab === 'warehouses') {
      db.warehouses = db.warehouses.filter((w) => !ids.includes(w.id));
    } else if (activeSubTab === 'categories') {
      db.categories = db.categories.filter((c) => !ids.includes(c.id));
    } else if (activeSubTab === 'uoms') {
      db.uoms = db.uoms.filter((u) => !ids.includes(u.id));
    }

    db.saveAll();
    onUpdate();
    setFilteredProducts(applyProductFilters(productFilters, db.products));
    clearSelection();
    showToast(`Đã xóa ${items.length} mục đã chọn.`);
  };

  // --- Columns Definitions ---
  const productColumns = [
    {
      key: 'sku',
      label: 'SKU Code',
      sortable: true,
      render: (p: any) => (
        <button
          type="button"
          onClick={() => setSelectedProductDetails(p)}
          className="hover:underline text-left text-emerald-400 font-bold font-mono"
        >
          {p.sku}
        </button>
      ),
    },
    {
      key: 'name',
      label: 'Tên hàng hóa',
      sortable: true,
      render: (p: any) => (
        <div className="flex items-center gap-3">
          {p.imageUrl ? (
            <div className="w-11 h-11 shrink-0 rounded-xl bg-slate-900/90 border border-white/10 p-1 flex items-center justify-center shadow-sm overflow-hidden">
              <img
                src={p.imageUrl}
                alt={p.name}
                className="w-full h-full object-contain drop-shadow"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="w-11 h-11 shrink-0 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-center text-slate-500 shadow-sm">
              <Package className="w-5 h-5 text-slate-500" />
            </div>
          )}
          <div>
            <button
              type="button"
              onClick={() => setSelectedProductDetails(p)}
              className="font-semibold text-slate-200 hover:text-emerald-400 hover:underline text-left"
            >
              {p.name}
            </button>
            
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Danh mục',
      sortable: true,
      render: (p: any) => {
        const cat = db.categories.find((c) => c.id === p.categoryId)?.name || 'Chưa phân loại';
        return <span className="text-slate-400">{cat}</span>;
      },
    },
    {
      key: 'uom',
      label: 'Đơn vị',
      sortable: true,
      render: (p: any) => {
        const uom = db.uoms.find((u) => u.id === p.uomId)?.name || 'Cái';
        return (
          <div className="text-slate-400">
            <span className="font-semibold text-slate-300">{uom}</span>
            {p.altUomId && p.uomConversionRate && (
              <p className="text-[9px] text-emerald-400 font-bold bg-emerald-500/5 border border-emerald-500/10 px-1 py-0.5 rounded mt-1">
                1 {db.uoms.find((u) => u.id === p.altUomId)?.name} = {p.uomConversionRate} {uom}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'currentQty',
      label: 'Lượng tồn',
      sortable: true,
      align: 'right' as const,
      render: (p: any) => {
        const uom = db.uoms.find((u) => u.id === p.uomId)?.name || 'Cái';
        return (
          <span className={`font-bold ${p.currentQty < 0 ? 'text-rose-400' : 'text-slate-200'}`}>
            {p.currentQty.toLocaleString()} {uom}
          </span>
        );
      },
    },
    {
      key: 'averageCost',
      label: 'Đơn giá gia quyền',
      sortable: true,
      align: 'right' as const,
      render: (p: any) => canViewCost ? (
        <span className="font-semibold text-slate-300">{p.averageCost.toLocaleString()}đ</span>
      ) : (
        <span className="text-slate-500 font-mono text-[11px] italic bg-white/5 px-2 py-0.5 rounded">*** (Chỉ Admin)</span>
      ),
    },
    {
      key: 'totalValue',
      label: 'Tổng giá trị tồn',
      sortable: true,
      align: 'right' as const,
      render: (p: any) => canViewCost ? (
        <span className="font-bold text-white">{(p.currentQty * p.averageCost).toLocaleString()}đ</span>
      ) : (
        <span className="text-slate-500 font-mono text-[11px] italic bg-white/5 px-2 py-0.5 rounded">*** (Bảo mật)</span>
      ),
    },
    {
      key: 'actions',
      label: 'Hành động',
      sortable: false,
      align: 'center' as const,
      render: (p: any) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedProductDetails(p)}
            className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition"
            title="Xem chi tiết tồn & Lịch sử"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => startEdit('products', p)}
            className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
            title="Sửa"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => deleteItem(p.id)}
            className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
            title="Xóa"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const supplierColumns = [
    { key: 'name', label: 'Nhà cung cấp', sortable: true, render: (s: any) => <span className="font-bold text-slate-200">{s.name}</span> },
    { key: 'taxCode', label: 'Mã số thuế', sortable: true, render: (s: any) => <span className="font-mono text-slate-400">{s.taxCode}</span> },
    { key: 'phone', label: 'Số điện thoại', sortable: true, render: (s: any) => <span className="text-slate-400">{s.phone || '-'}</span> },
    { key: 'address', label: 'Địa chỉ chính', sortable: true, render: (s: any) => <span className="text-slate-400 max-w-xs truncate">{s.address || '-'}</span> },
    {
      key: 'actions',
      label: 'Hành động',
      sortable: false,
      align: 'center' as const,
      render: (s: any) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => startEdit('suppliers', s)}
            className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
            title="Sửa"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => deleteItem(s.id)}
            className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
            title="Xóa"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const customerColumns = [
    { key: 'name', label: 'Khách hàng', sortable: true, render: (c: any) => <span className="font-bold text-slate-200">{c.name}</span> },
    { key: 'taxCode', label: 'Mã số thuế', sortable: true, render: (c: any) => <span className="font-mono text-slate-400">{c.taxCode}</span> },
    { key: 'phone', label: 'Số điện thoại', sortable: true, render: (c: any) => <span className="text-slate-400">{c.phone || '-'}</span> },
    { key: 'address', label: 'Địa chỉ giao nhận', sortable: true, render: (c: any) => <span className="text-slate-400 max-w-xs truncate">{c.address || '-'}</span> },
    {
      key: 'actions',
      label: 'Hành động',
      sortable: false,
      align: 'center' as const,
      render: (c: any) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => startEdit('customers', c)}
            className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
            title="Sửa"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => deleteItem(c.id)}
            className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
            title="Xóa"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const warehouseColumns = [
    { key: 'name', label: 'Tên kho hàng', sortable: true, render: (w: any) => <span className="font-bold text-slate-200">{w.name}</span> },
    { key: 'location', label: 'Vị trí địa lý', sortable: true, render: (w: any) => <span className="text-slate-400">{w.location || '-'}</span> },
    {
      key: 'actions',
      label: 'Hành động',
      sortable: false,
      align: 'center' as const,
      render: (w: any) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => startEdit('warehouses', w)}
            className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
            title="Sửa"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => deleteItem(w.id)}
            className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
            title="Xóa"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const categoryColumns = [
    { key: 'name', label: 'Tên danh mục sản phẩm', sortable: true, render: (c: any) => <span className="font-bold text-slate-200">{c.name}</span> },
    { key: 'description', label: 'Mô tả danh mục', sortable: true, render: (c: any) => <span className="text-slate-400">{c.description || '-'}</span> },
    {
      key: 'actions',
      label: 'Hành động',
      sortable: false,
      align: 'center' as const,
      render: (c: any) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => startEdit('categories', c)}
            className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
            title="Sửa"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => deleteItem(c.id)}
            className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
            title="Xóa"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const uomColumns = [
    { key: 'name', label: 'Tên đơn vị tính', sortable: true, render: (u: any) => <span className="font-bold text-slate-200">{u.name}</span> },
    {
      key: 'actions',
      label: 'Hành động',
      sortable: false,
      align: 'center' as const,
      render: (u: any) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => startEdit('uoms', u)}
            className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
            title="Sửa"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => deleteItem(u.id)}
            className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
            title="Xóa"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-black font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              resetFormFields();
              if (!categoryId && db.categories[0]) setCategoryId(db.categories[0].id);
              if (!uomId && db.uoms[0]) setUomId(db.uoms[0].id);
              setShowForm(!showForm);
            }}
            className="flex items-center gap-2 bg-emerald-600 text-white font-bold hover:bg-emerald-500 px-4 py-2.5 rounded-xl text-xs transition shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
          >
            <Plus className="w-4 h-4 font-bold" />
            <span>Thêm mục mới</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExcelModal(true)}
            className="flex items-center gap-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold px-4 py-2.5 rounded-xl text-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Nhập từ Excel</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadExcelTemplate(activeSubTab as ExcelImportType)}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold px-3.5 py-2 rounded-xl text-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tải File Mẫu</span>
          </button>
          <button
            type="button"
            onClick={() => exportDataToExcel(db, activeSubTab as ExcelImportType)}
            className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-semibold px-3.5 py-2 rounded-xl text-xs transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Directory Navigation Buttons */}
      <div className="flex flex-wrap border-b border-white/5 gap-1.5 pb-0.5">
        {[
          { id: 'products', name: 'Hàng hóa', icon: Package },
          { id: 'suppliers', name: 'Nhà cung cấp', icon: Users },
          { id: 'customers', name: 'Khách hàng', icon: UserCheck },
          { id: 'warehouses', name: 'Kho hàng', icon: Home },
          { id: 'categories', name: 'Danh mục SP', icon: Tag },
          { id: 'uoms', name: 'Đơn vị', icon: Layers },
        ].map((sub) => {
          const Icon = sub.icon;
          const isActive = activeSubTab === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => {
                setActiveSubTab(sub.id as any);
                setShowForm(false);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition ${
                isActive
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sub.name}</span>
            </button>
          );
        })}
      </div>

      {/* Add New Item Modal Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-[#11141b] border border-white/5 rounded-2xl p-6 space-y-4 shadow-2xl">
          <h3 className="font-bold text-white text-sm">Thêm dữ liệu mới vào: {activeSubTab.toUpperCase()}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Conditional fields based on selected sub tab */}
            {activeSubTab === 'products' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-400">Mã SKU (Bắt buộc)</label>
                    <button
                      type="button"
                      onClick={generateAutoSku}
                      className="text-[10px] text-emerald-400 font-bold hover:underline"
                      title="Sinh mã tự động theo quy tắc danh mục"
                    >
                      Tự động sinh mã
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: IPHONE15"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Tên sản phẩm (Bắt buộc)</label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập tên sản phẩm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Danh mục sản phẩm</label>
                  <SearchableSelect
                    id="create-product-category"
                    options={db.categories.map((c) => ({ value: c.id, label: c.name }))}
                    value={categoryId}
                    onChange={(val) => setCategoryId(val)}
                    placeholder="-- Chọn danh mục --"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Đơn vị tính cơ bản</label>
                  <SearchableSelect
                    id="create-product-uom"
                    options={db.uoms.map((u) => ({ value: u.id, label: u.name }))}
                    value={uomId}
                    onChange={(val) => setUomId(val)}
                    placeholder="-- Chọn ĐVT --"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Đơn vị tính quy đổi phụ (Tùy chọn)</label>
                  <SearchableSelect
                    id="create-product-alt-uom"
                    options={db.uoms.map((u) => ({ value: u.id, label: u.name }))}
                    value={altUomId}
                    onChange={(val) => setAltUomId(val)}
                    placeholder="-- Không sử dụng quy đổi --"
                    clearable={true}
                  />
                </div>
                {altUomId && (
                  <div className="flex flex-col gap-1.5 animate-fadeIn">
                    <label className="text-xs font-semibold text-slate-400">Tỷ lệ quy đổi (1 ĐV phụ = X ĐV cơ bản)</label>
                    <input
                      type="number"
                      min={1}
                      value={uomConversionRate}
                      onChange={(e) => setUomConversionRate(Number(e.target.value))}
                      className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Số lượng tồn ban đầu (Tùy chọn)</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={initialQty}
                    onChange={(e) => setInitialQty(Number(e.target.value))}
                    className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white font-mono focus:border-emerald-500/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Đơn giá vốn ban đầu (VNĐ)</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={initialCost}
                    onChange={(e) => setInitialCost(Number(e.target.value))}
                    className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white font-mono focus:border-emerald-500/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5 lg:col-span-3">
                  <label className="text-xs font-semibold text-slate-400">Mô tả chi tiết</label>
                  <input
                    type="text"
                    placeholder="Mô tả sản phẩm"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5 lg:col-span-3">
                  <label className="text-xs font-semibold text-slate-400">Hình ảnh hàng hóa (Tùy chọn)</label>
                  <div className="flex items-center gap-4 border border-white/5 bg-[#161a23] rounded-xl p-3">
                    {imageUrl ? (
                      <div className="relative group shrink-0 border border-white/10 p-1 bg-white/5 rounded-xl">
                        <img src={imageUrl} alt="Preview" className="w-16 h-16 object-contain rounded-lg" />
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600 transition shadow"
                          title="Xóa ảnh"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-slate-500 shrink-0 bg-white/[0.02]">
                        <Camera className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition uppercase tracking-wider">
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        {logoLoading ? 'Đang nén...' : 'Chọn ảnh & Nén'}
                        <input type="file" accept="image/*" onChange={handleProductImageUpload} className="hidden" />
                      </label>
                      <p className="text-[10px] text-slate-400 mt-1">Ảnh chuẩn HD (tối đa 600x600 px)</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {(activeSubTab === 'suppliers' || activeSubTab === 'customers') && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Tên đơn vị/đối tác (Bắt buộc)</label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập tên"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Mã số thuế (Bắt buộc)</label>
                  <input
                    type="text"
                    required
                    placeholder="Mã số thuế"
                    value={taxCode}
                    onChange={(e) => setTaxCode(e.target.value)}
                    className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Số điện thoại</label>
                  <input
                    type="text"
                    placeholder="Số điện thoại"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5 lg:col-span-3">
                  <label className="text-xs font-semibold text-slate-400">Địa chỉ giao dịch</label>
                  <input
                    type="text"
                    placeholder="Nhập địa chỉ chi tiết"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                  />
                </div>
              </>
            )}

            {activeSubTab === 'warehouses' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Tên kho hàng (Bắt buộc)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Kho Quận 2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5 lg:col-span-2">
                  <label className="text-xs font-semibold text-slate-400">Vị trí địa lý / Địa chỉ</label>
                  <input
                    type="text"
                    placeholder="Nhập địa chỉ"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                  />
                </div>
              </>
            )}

            {activeSubTab === 'categories' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Tên danh mục sản phẩm (Bắt buộc)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Đồ gia dụng"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5 lg:col-span-2">
                  <label className="text-xs font-semibold text-slate-400">Mô tả thêm</label>
                  <input
                    type="text"
                    placeholder="Nhập mô tả"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                  />
                </div>
              </>
            )}

            {activeSubTab === 'uoms' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Tên đơn vị tính (Bắt buộc)</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chiếc, Hộp, Kg, Mét"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="bg-emerald-600 text-white font-bold px-4 py-2 text-xs rounded-lg hover:bg-emerald-500 transition"
            >
              Lưu dữ liệu
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border border-white/10 text-slate-400 px-4 py-2 text-xs rounded-lg hover:bg-white/[0.03] transition"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* Tables representation for active catalog */}
      <div className="space-y-4">
        {activeSubTab === 'products' && (
          <AdvancedTable
            id="products-table"
            data={filteredProducts}
            columns={productColumns}
            searchableKeys={['sku', 'name', 'description']}
            searchPlaceholder="Tìm mã hàng, tên hàng hóa..."
            filterOptions={[
              {
                key: 'categoryId',
                label: 'Danh mục',
                type: 'select',
                options: db.categories.map((c) => ({ value: c.id, label: c.name })),
              },
              {
                key: 'uomId',
                label: 'Đơn vị tính',
                type: 'select',
                options: db.uoms.map((u) => ({ value: u.id, label: u.name })),
              },
              { key: 'qtyRange', label: 'Số lượng tồn kho', type: 'number-range' },
            ]}
            activeFilters={productFilters}
            onFilterChange={handleFilterChange}
            onFilterReset={handleResetFilter}
            bulkActions={[
              {
                label: 'Xóa hàng loạt',
                icon: <Trash2 className="w-3.5 h-3.5" />,
                variant: 'danger',
                action: (items, clear) => deleteItemsBulk(items, clear),
              },
            ]}
          />
        )}

        {activeSubTab === 'suppliers' && (
          <AdvancedTable
            id="suppliers-table"
            data={db.suppliers}
            columns={supplierColumns}
            searchableKeys={['name', 'taxCode', 'phone', 'address']}
            searchPlaceholder="Tìm tên, MST, sđt nhà cung cấp..."
            bulkActions={[
              {
                label: 'Xóa hàng loạt',
                icon: <Trash2 className="w-3.5 h-3.5" />,
                variant: 'danger',
                action: (items, clear) => deleteItemsBulk(items, clear),
              },
            ]}
          />
        )}

        {activeSubTab === 'customers' && (
          <AdvancedTable
            id="customers-table"
            data={db.customers}
            columns={customerColumns}
            searchableKeys={['name', 'taxCode', 'phone', 'address']}
            searchPlaceholder="Tìm tên, MST, sđt khách hàng..."
            bulkActions={[
              {
                label: 'Xóa hàng loạt',
                icon: <Trash2 className="w-3.5 h-3.5" />,
                variant: 'danger',
                action: (items, clear) => deleteItemsBulk(items, clear),
              },
            ]}
          />
        )}

        {activeSubTab === 'warehouses' && (
          <AdvancedTable
            id="warehouses-table"
            data={db.warehouses}
            columns={warehouseColumns}
            searchableKeys={['name', 'location']}
            searchPlaceholder="Tìm tên, địa chỉ kho..."
            bulkActions={[
              {
                label: 'Xóa hàng loạt',
                icon: <Trash2 className="w-3.5 h-3.5" />,
                variant: 'danger',
                action: (items, clear) => deleteItemsBulk(items, clear),
              },
            ]}
          />
        )}

        {activeSubTab === 'categories' && (
          <AdvancedTable
            id="categories-table"
            data={db.categories}
            columns={categoryColumns}
            searchableKeys={['name', 'description']}
            searchPlaceholder="Tìm tên, mô tả danh mục..."
            bulkActions={[
              {
                label: 'Xóa hàng loạt',
                icon: <Trash2 className="w-3.5 h-3.5" />,
                variant: 'danger',
                action: (items, clear) => deleteItemsBulk(items, clear),
              },
            ]}
          />
        )}

        {activeSubTab === 'uoms' && (
          <AdvancedTable
            id="uoms-table"
            data={db.uoms}
            columns={uomColumns}
            searchableKeys={['name']}
            searchPlaceholder="Tìm tên đơn vị tính..."
            bulkActions={[
              {
                label: 'Xóa hàng loạt',
                icon: <Trash2 className="w-3.5 h-3.5" />,
                variant: 'danger',
                action: (items, clear) => deleteItemsBulk(items, clear),
              },
            ]}
          />
        )}
      </div>

      {/* Edit Item Modal Overlay */}
      {editingItem && (
        <div className="fixed inset-0 bg-[#08090a]/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#11141b] border border-white/5 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Chỉnh sửa thông tin: {editingItem.type.toUpperCase()}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleUpdateSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editingItem.type === 'products' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">Mã SKU (Bắt buộc)</label>
                      <input
                        type="text"
                        required
                        value={editForm.sku || ''}
                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, sku: e.target.value }))}
                        className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">Tên sản phẩm (Bắt buộc)</label>
                      <input
                        type="text"
                        required
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, name: e.target.value }))}
                        className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">Danh mục sản phẩm</label>
                      <SearchableSelect
                        id="edit-product-category"
                        options={db.categories.map((c) => ({ value: c.id, label: c.name }))}
                        value={editForm.categoryId || ''}
                        onChange={(val) => setEditForm((prev: any) => ({ ...prev, categoryId: val }))}
                        placeholder="-- Chọn danh mục --"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">Đơn vị tính cơ bản</label>
                      <SearchableSelect
                        id="edit-product-uom"
                        options={db.uoms.map((u) => ({ value: u.id, label: u.name }))}
                        value={editForm.uomId || ''}
                        onChange={(val) => setEditForm((prev: any) => ({ ...prev, uomId: val }))}
                        placeholder="-- Chọn ĐVT --"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">Đơn vị tính quy đổi phụ (Tùy chọn)</label>
                      <SearchableSelect
                        id="edit-product-alt-uom"
                        options={db.uoms.map((u) => ({ value: u.id, label: u.name }))}
                        value={editForm.altUomId || ''}
                        onChange={(val) => setEditForm((prev: any) => ({ ...prev, altUomId: val }))}
                        placeholder="-- Không sử dụng quy đổi --"
                        clearable={true}
                      />
                    </div>
                    {editForm.altUomId && (
                      <div className="flex flex-col gap-1.5 animate-fadeIn">
                        <label className="text-xs font-semibold text-slate-400">Tỷ lệ quy đổi (1 ĐV phụ = X ĐV cơ bản)</label>
                        <input
                          type="number"
                          min={1}
                          value={editForm.uomConversionRate || 1}
                          onChange={(e) => setEditForm((prev: any) => ({ ...prev, uomConversionRate: Number(e.target.value) }))}
                          className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">Đơn giá bình quân gia quyền (đ)</label>
                      {canViewCost ? (
                        <input
                          type="number"
                          min={0}
                          value={editForm.averageCost || 0}
                          onChange={(e) => setEditForm((prev: any) => ({ ...prev, averageCost: Number(e.target.value) }))}
                          className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50 font-mono"
                        />
                      ) : (
                        <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2.5 flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Giá vốn được bảo mật (Chỉ Admin)</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">Số lượng tồn kho hiện tại</label>
                      <input
                        type="number"
                        value={editForm.currentQty || 0}
                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, currentQty: Number(e.target.value) }))}
                        className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50 font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-400">Mô tả sản phẩm</label>
                      <input
                        type="text"
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, description: e.target.value }))}
                        className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-400">Hình ảnh hàng hóa (Tùy chọn)</label>
                      <div className="flex items-center gap-4 border border-white/5 bg-[#161a23] rounded-xl p-3">
                        {editForm.imageUrl ? (
                          <div className="relative group shrink-0 border border-white/10 p-1 bg-white/5 rounded-xl">
                            <img src={editForm.imageUrl} alt="Preview" className="w-16 h-16 object-contain rounded-lg" />
                            <button
                              type="button"
                              onClick={() => setEditForm((prev: any) => ({ ...prev, imageUrl: '' }))}
                              className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600 transition shadow"
                              title="Xóa ảnh"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-slate-500 shrink-0 bg-white/[0.02]">
                            <Camera className="w-6 h-6" />
                          </div>
                        )}
                        <div className="flex-1">
                          <label className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition uppercase tracking-wider">
                            <Upload className="w-3.5 h-3.5 text-emerald-400" />
                            {logoLoading ? 'Đang nén...' : 'Chọn ảnh & Nén'}
                            <input type="file" accept="image/*" onChange={handleEditProductImageUpload} className="hidden" />
                          </label>
                          <p className="text-[10px] text-slate-400 mt-1">Ảnh chuẩn HD (tối đa 600x600 px)</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {(editingItem.type === 'suppliers' || editingItem.type === 'customers') && (
                  <>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-400">Tên đơn vị/đối tác (Bắt buộc)</label>
                      <input
                        type="text"
                        required
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, name: e.target.value }))}
                        className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">Mã số thuế</label>
                      <input
                        type="text"
                        value={editForm.taxCode || ''}
                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, taxCode: e.target.value }))}
                        className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50 font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">Số điện thoại</label>
                      <input
                        type="text"
                        value={editForm.phone || ''}
                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, phone: e.target.value }))}
                        className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-400">Địa chỉ giao dịch</label>
                      <input
                        type="text"
                        value={editForm.address || ''}
                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, address: e.target.value }))}
                        className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                      />
                    </div>
                  </>
                )}

                {editingItem.type === 'warehouses' && (
                  <>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-400">Tên kho hàng (Bắt buộc)</label>
                      <input
                        type="text"
                        required
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, name: e.target.value }))}
                        className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-400">Vị trí địa lý</label>
                      <input
                        type="text"
                        value={editForm.location || ''}
                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, location: e.target.value }))}
                        className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                      />
                    </div>
                  </>
                )}

                {editingItem.type === 'categories' && (
                  <>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-400">Tên danh mục sản phẩm (Bắt buộc)</label>
                      <input
                        type="text"
                        required
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, name: e.target.value }))}
                        className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-400">Mô tả danh mục</label>
                      <input
                        type="text"
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, description: e.target.value }))}
                        className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                      />
                    </div>
                  </>
                )}

                {editingItem.type === 'uoms' && (
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-400">Tên đơn vị tính (Bắt buộc)</label>
                    <input
                      type="text"
                      required
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm((prev: any) => ({ ...prev, name: e.target.value }))}
                      className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#161a23] text-white focus:border-emerald-500/50"
                    />
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-3 bg-black/5 -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-xs font-bold transition uppercase"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-2 rounded-lg text-xs font-bold transition uppercase"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Product Details & Inventory trace Modal */}
      {selectedProductDetails && (() => {
        const p = selectedProductDetails;
        const catName = db.categories.find((c) => c.id === p.categoryId)?.name || 'Chưa phân loại';
        const baseUomName = db.uoms.find((u) => u.id === p.uomId)?.name || 'Cái';
        const history = getProductTxHistory(p.id);

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col text-slate-200"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/5 flex items-start justify-between bg-black/20 shrink-0">
                <div className="flex gap-4">
                  {p.imageUrl ? (
                    <div className="w-20 h-20 shrink-0 rounded-2xl bg-slate-900/90 border border-white/10 p-2 flex items-center justify-center shadow-md overflow-hidden">
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="max-h-full max-w-full object-contain drop-shadow"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 shrink-0 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500">
                      <Package className="w-10 h-10" />
                    </div>
                  )}
                  <div>
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded">
                      {p.sku}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1.5">{p.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">Danh mục: {catName} | ĐVT cơ sở: {baseUomName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProductDetails(null)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Navigation */}
              <div className="flex border-b border-white/5 px-6 bg-black/10 shrink-0">
                {[
                  { id: 'warehouses', label: 'Tồn kho chi tiết', icon: Home },
                  { id: 'transactions', label: 'Lịch sử giao dịch kho', icon: Layers },
                  { id: 'prices', label: 'Biến động lịch sử giá', icon: Coins }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = detailsSubTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setDetailsSubTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-150 ${
                        isActive
                          ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                          : 'border-transparent text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Modal Body / Scrollable Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {/* SUB TAB 1: Warehouses */}
                {detailsSubTab === 'warehouses' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {db.warehouses.map((w) => {
                        const qty = getQtyInWarehouse(p.id, w.id);
                        return (
                          <div key={w.id} className="border border-white/5 bg-[#161a23] rounded-xl p-4 flex flex-col justify-between">
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{w.name}</p>
                              <p className="text-xs text-slate-500 mt-1 truncate">{w.location || 'Chưa định vị trí'}</p>
                            </div>
                            <div className="mt-4 flex items-baseline gap-1">
                              <span className={`text-xl font-black ${qty < 0 ? 'text-rose-400' : qty === 0 ? 'text-slate-500' : 'text-emerald-400'}`}>
                                {qty.toLocaleString()}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase">{baseUomName}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SUB TAB 2: Stock Transactions */}
                {detailsSubTab === 'transactions' && (
                  <div className="space-y-4 animate-fadeIn">
                    {history.length === 0 ? (
                      <p className="text-xs text-slate-500 italic text-center py-8">Không có lịch sử giao dịch phát sinh cho sản phẩm này.</p>
                    ) : (
                      <div className="overflow-x-auto border border-white/5 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-white/5 bg-black/20 text-slate-400 uppercase text-[10px] tracking-wider">
                              <th className="p-3">Ngày lập</th>
                              <th className="p-3">Số chứng từ</th>
                              <th className="p-3 text-center">Nghiệp vụ</th>
                              <th className="p-3">Khách hàng / NCC</th>
                              <th className="p-3 text-right">Số lượng</th>
                              <th className="p-3 text-right">Đơn giá</th>
                              <th className="p-3 text-right">Thành tiền</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {history.map((h, i) => (
                              <tr key={i} className="hover:bg-white/[0.01]">
                                <td className="p-3 text-slate-400 font-mono">{formatDate(h.date)}</td>
                                <td className="p-3 font-bold text-slate-300 font-mono">{h.referenceNo}</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    h.type === 'OPENING'
                                      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/10'
                                      : h.type === 'IN'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                                  }`}>
                                    {h.type === 'OPENING' ? 'Tồn đầu kỳ' : h.type === 'IN' ? 'Nhập kho' : 'Xuất kho'}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-300 font-semibold">{h.partnerName}</td>
                                <td className={`p-3 text-right font-black ${h.type === 'IN' || h.type === 'OPENING' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {h.type === 'IN' || h.type === 'OPENING' ? '+' : '-'}{h.qty.toLocaleString()}
                                </td>
                                <td className="p-3 text-right text-slate-400 font-mono">
                                  {(h.type === 'IN' || h.type === 'OPENING') && !canViewCost ? (
                                    <span className="text-slate-500 italic">***</span>
                                  ) : (
                                    `${h.unitPrice.toLocaleString()}đ`
                                  )}
                                </td>
                                <td className="p-3 text-right font-bold text-white font-mono">
                                  {(h.type === 'IN' || h.type === 'OPENING') && !canViewCost ? (
                                    <span className="text-slate-500 italic">***</span>
                                  ) : (
                                    `${h.totalPrice.toLocaleString()}đ`
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* SUB TAB 3: Price Traces */}
                {detailsSubTab === 'prices' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Price History Buy */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-200 uppercase flex items-center gap-1.5 border-b border-white/5 pb-2">
                          <Coins className="w-4 h-4 text-emerald-400" />
                          Lịch sử Đơn giá Nhập (Mua vào)
                        </h4>
                        {!canViewCost ? (
                          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                            <Lock className="w-4 h-4 shrink-0" />
                            <span>Dữ liệu giá mua bị khóa đối với nhân viên (Chỉ Admin mới có quyền xem).</span>
                          </div>
                        ) : history.filter(h => h.type === 'IN').length === 0 ? (
                          <p className="text-[10px] text-slate-500 italic">Chưa có lịch sử giá nhập mua.</p>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {history.filter(h => h.type === 'IN').map((h, i) => (
                              <div key={i} className="flex justify-between items-center p-2.5 border border-white/5 bg-[#161a23] rounded-lg">
                                <div>
                                  <p className="text-xs font-bold text-slate-300">{h.unitPrice.toLocaleString()}đ / {baseUomName}</p>
                                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">{formatDate(h.date)} | {h.partnerName}</p>
                                </div>
                                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/5 px-1.5 py-0.5 rounded">{h.referenceNo}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Price History Sell */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-200 uppercase flex items-center gap-1.5 border-b border-white/5 pb-2">
                          <TrendingUp className="w-4 h-4 text-amber-400" />
                          Lịch sử Đơn giá Xuất (Bán ra)
                        </h4>
                        {history.filter(h => h.type === 'OUT').length === 0 ? (
                          <p className="text-[10px] text-slate-500 italic">Chưa có lịch sử giá xuất bán.</p>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {history.filter(h => h.type === 'OUT').map((h, i) => (
                              <div key={i} className="flex justify-between items-center p-2.5 border border-white/5 bg-[#161a23] rounded-lg">
                                <div>
                                  <p className="text-xs font-bold text-slate-300">{h.unitPrice.toLocaleString()}đ / {baseUomName}</p>
                                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">{formatDate(h.date)} | {h.partnerName}</p>
                                </div>
                                <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/5 px-1.5 py-0.5 rounded">{h.referenceNo}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/5 bg-black/20 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedProductDetails(null)}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-5 py-2 rounded-lg transition uppercase"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      <ExcelImportModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        db={db}
        defaultType={activeSubTab as ExcelImportType}
        onUpdate={() => {
          setFilteredProducts([...db.products]);
          onUpdate();
        }}
        onImportSuccess={(msg) => {
          setFilteredProducts([...db.products]);
          showToast(msg);
        }}
      />
    </motion.div>
  );
}
