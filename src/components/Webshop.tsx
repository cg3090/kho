/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { MockDatabase } from '../db/mockDb';
import {
  User,
  WebshopOrder,
  WebshopOrderItem,
  WebshopProductConfig,
  WebshopStoreConfig,
  WebshopOrderStatus,
  WebshopPaymentMethod,
  WebshopCustomerAccount,
  Product,
} from '../types';
import {
  ShoppingBag,
  ShoppingCart,
  PackageCheck,
  Store,
  SlidersHorizontal,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Truck,
  XCircle,
  Printer,
  ChevronRight,
  Plus,
  Minus,
  Trash2,
  Building2,
  Phone,
  MapPin,
  CreditCard,
  QrCode,
  Eye,
  FileText,
  TrendingUp,
  Tag,
  ShieldCheck,
  RefreshCw,
  Boxes,
  ArrowRight,
  Headphones,
  MessageSquare,
  Users,
  KeyRound,
  Heart,
} from 'lucide-react';
import { formatOrMaskCost } from '../utils/rbac';

interface WebshopProps {
  db: MockDatabase;
  onUpdate: () => void;
  currentUser?: User | null;
  setTab?: (tab: string) => void;
  onOpenStorefront?: () => void;
}

interface CartItem {
  productId: string;
  qty: number;
  unitPrice: number;
}

export default function Webshop({ db, onUpdate, currentUser, setTab, onOpenStorefront }: WebshopProps) {
  const [activeSubTab, setActiveSubTab] = useState<'storefront' | 'orders' | 'config' | 'customers'>('orders');

  // Storefront states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null);

  // Checkout form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [shippingMethod, setShippingMethod] = useState<'STANDARD' | 'EXPRESS' | 'STORE_PICKUP'>('STANDARD');
  const [paymentMethod, setPaymentMethod] = useState<WebshopPaymentMethod>('COD');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    db.webshopStoreConfig.defaultWarehouseId || db.warehouses[0]?.id || 'wh-1'
  );
  const [orderNotes, setOrderNotes] = useState('');
  const [instantFulfill, setInstantFulfill] = useState(true);

  // Order management states
  const [orderFilterStatus, setOrderFilterStatus] = useState<string>('ALL');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [viewingOrder, setViewingOrder] = useState<WebshopOrder | null>(null);
  const [printingOrder, setPrintingOrder] = useState<WebshopOrder | null>(null);

  // Store Config editing
  const [editingStoreConfig, setEditingStoreConfig] = useState<WebshopStoreConfig>({
    ...db.webshopStoreConfig,
  });

  // Editing product configs state
  const [editingProductConfig, setEditingProductConfig] = useState<WebshopProductConfig | null>(null);

  // Customer account management states
  const [customerSearch, setCustomerSearch] = useState('');
  const [viewingCustomer, setViewingCustomer] = useState<WebshopCustomerAccount | null>(null);
  const [resetPwTarget, setResetPwTarget] = useState<WebshopCustomerAccount | null>(null);
  const [resetPwValue, setResetPwValue] = useState('');
  const [resetPwConfirm, setResetPwConfirm] = useState('');
  const [resetPwMessage, setResetPwMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return db.webshopCustomerAccounts;
    return db.webshopCustomerAccounts.filter(
      (a) =>
        a.username.toLowerCase().includes(q) ||
        a.fullName.toLowerCase().includes(q) ||
        a.phone.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q)
    );
  }, [db.webshopCustomerAccounts, customerSearch]);

  const countOrdersByAccount = (acc: WebshopCustomerAccount) =>
    db.webshopOrders.filter((o) => o.accountId === acc.id || (acc.phone && o.customerPhone === acc.phone)).length;

  const getAccountOrders = (acc: WebshopCustomerAccount) =>
    db.webshopOrders
      .filter((o) => o.accountId === acc.id || (acc.phone && o.customerPhone === acc.phone))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  // Quick fill customer if existing phone entered
  const handlePhoneBlur = (phone: string) => {
    const existing = db.customers.find((c) => c.phone?.trim() === phone.trim());
    if (existing) {
      if (!customerName) setCustomerName(existing.name);
      if (!customerAddress && existing.address) setCustomerAddress(existing.address);
    }
  };

  // Published products for storefront
  const storefrontProducts = useMemo(() => {
    return db.products.filter((p) => {
      const config = db.webshopProductConfigs.find((c) => c.productId === p.id);
      const isPub = config ? config.isPublished : true;
      if (!isPub) return false;

      if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) return false;
      if (inStockOnly && p.currentQty <= 0) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = p.name.toLowerCase().includes(term);
        const matchSku = p.sku.toLowerCase().includes(term);
        if (!matchName && !matchSku) return false;
      }
      return true;
    });
  }, [db.products, db.webshopProductConfigs, selectedCategory, inStockOnly, searchTerm]);

  // Cart calculation
  const cartSummary = useMemo(() => {
    let subtotal = 0;
    const itemsWithDetails = cart.map((ci) => {
      const prod = db.products.find((p) => p.id === ci.productId);
      const config = db.webshopProductConfigs.find((c) => c.productId === ci.productId);
      const price = ci.unitPrice;
      const total = price * ci.qty;
      subtotal += total;
      return {
        ...ci,
        product: prod,
        config,
        lineTotal: total,
      };
    });

    const shippingFee = shippingMethod === 'EXPRESS' ? 45000 : shippingMethod === 'STORE_PICKUP' ? 0 : 30000;
    const vatRate = db.systemConfig.defaultVatRate || 10;
    const vatAmount = Math.round(subtotal * (vatRate / 100));
    const grandTotal = subtotal + vatAmount + shippingFee;

    return {
      items: itemsWithDetails,
      totalCount: cart.reduce((s, i) => s + i.qty, 0),
      subtotal,
      shippingFee,
      vatRate,
      vatAmount,
      grandTotal,
    };
  }, [cart, db.products, db.webshopProductConfigs, shippingMethod, db.systemConfig]);

  // Cart operations
  const addToCart = (productId: string, qtyToAdd = 1) => {
    const prod = db.products.find((p) => p.id === productId);
    if (!prod) return;

    const config = db.webshopProductConfigs.find((c) => c.productId === productId);
    const unitPrice = config?.promoPrice || config?.retailPrice || Math.round((prod.averageCost || 10000000) * 1.25);

    const existingIndex = cart.findIndex((i) => i.productId === productId);
    const currentCartQty = existingIndex >= 0 ? cart[existingIndex].qty : 0;
    const newQty = currentCartQty + qtyToAdd;

    if (!db.webshopStoreConfig.allowOrderWhenOutOfStock && !db.systemConfig.allowNegativeStock) {
      if (newQty > prod.currentQty) {
        alert(`Số lượng tồn kho chỉ còn ${prod.currentQty} ${db.uoms.find((u) => u.id === prod.uomId)?.name || 'Cái'}. Không thể thêm quá tồn khả dụng!`);
        return;
      }
    }

    if (existingIndex >= 0) {
      const nextCart = [...cart];
      nextCart[existingIndex].qty = newQty;
      setCart(nextCart);
    } else {
      setCart([...cart, { productId, qty: qtyToAdd, unitPrice }]);
    }
  };

  const updateCartQty = (productId: string, delta: number) => {
    const existingIndex = cart.findIndex((i) => i.productId === productId);
    if (existingIndex < 0) return;

    const prod = db.products.find((p) => p.id === productId);
    const targetQty = cart[existingIndex].qty + delta;

    if (targetQty <= 0) {
      setCart(cart.filter((i) => i.productId !== productId));
      return;
    }

    if (prod && !db.webshopStoreConfig.allowOrderWhenOutOfStock && !db.systemConfig.allowNegativeStock) {
      if (targetQty > prod.currentQty) {
        alert(`Kho hiện chỉ còn ${prod.currentQty} sản phẩm.`);
        return;
      }
    }

    const next = [...cart];
    next[existingIndex].qty = targetQty;
    setCart(next);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((i) => i.productId !== productId));
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Giỏ hàng đang trống!');
      return;
    }

    const res = db.createWebshopOrder({
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      warehouseId: selectedWarehouseId,
      shippingMethod,
      paymentMethod,
      items: cart.map((c) => ({
        productId: c.productId,
        qty: c.qty,
        unitPrice: c.unitPrice,
      })),
      notes: orderNotes,
    });

    if (!res.success || !res.order) {
      alert(`Lỗi: ${res.message}`);
      return;
    }

    const createdOrder = res.order;

    // If instant fulfillment is checked, fulfill immediately
    if (instantFulfill) {
      const fulfillRes = db.fulfillWebshopOrder(createdOrder.id, selectedWarehouseId);
      if (fulfillRes.success) {
        alert(`Tạo đơn hàng ${createdOrder.orderCode} và xuất kho thành công!\nPhiếu xuất: ${fulfillRes.stockTxId ? 'Đã tạo chứng từ' : 'Thành công'}\nTồn kho và kế toán đã được hạch toán.`);
      } else {
        alert(`Tạo đơn hàng thành công, nhưng xuất kho tự động gặp cảnh báo: ${fulfillRes.message}\nĐơn hàng đã được lưu ở trạng thái Chờ duyệt.`);
      }
    } else {
      alert(`Đặt hàng thành công! Mã đơn: ${createdOrder.orderCode}. Đơn hàng đang ở trạng thái Chờ duyệt.`);
    }

    // Reset checkout form and cart
    setCart([]);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setOrderNotes('');
    onUpdate();
    setActiveSubTab('orders');
  };

  // Orders table data
  const filteredOrders = useMemo(() => {
    return db.webshopOrders.filter((o) => {
      if (orderFilterStatus !== 'ALL' && o.orderStatus !== orderFilterStatus) return false;
      if (orderSearchTerm.trim()) {
        const term = orderSearchTerm.toLowerCase();
        const matchCode = o.orderCode?.toLowerCase().includes(term);
        const matchName = o.customerName?.toLowerCase().includes(term);
        const matchPhone = o.customerPhone?.toLowerCase().includes(term);
        if (!matchCode && !matchName && !matchPhone) return false;
      }
      return true;
    });
  }, [db.webshopOrders, orderFilterStatus, orderSearchTerm]);

  // Order summary statistics
  const orderStats = useMemo(() => {
    const all = db.webshopOrders;
    const completed = all.filter((o) => o.orderStatus === 'COMPLETED');
    const pending = all.filter((o) => o.orderStatus === 'PENDING');
    const shipped = all.filter((o) => o.orderStatus === 'SHIPPED');
    const totalSales = all
      .filter((o) => o.orderStatus !== 'CANCELLED')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return {
      totalSales,
      totalCount: all.length,
      pendingCount: pending.length,
      shippedCount: shipped.length,
      completedCount: completed.length,
    };
  }, [db.webshopOrders]);

  return (
    <div className="space-y-6">
      {/* Header banner & module navigation */}
      <div className="bg-[#0f141c] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          {/* Store name and slogan 
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {db.webshopStoreConfig.storeName || 'V-SMART STORE'}
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              {db.webshopStoreConfig.storeSlogan || ''}
            </p>
          </div>
            */}
          {/* Sub tabs and Cart Button */}
          <div className="flex flex-wrap items-center gap-3">
            {onOpenStorefront && (
              <button
                id="btn-open-storefront-standalone"
                onClick={onOpenStorefront}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-500/25 active:scale-95"
                title="Mở giao diện Webshop bán lẻ dành riêng cho khách hàng online"
              >
                <ShoppingBag className="w-4 h-4 text-black" />
                <span>Mở Gian Hàng Khách (Độc Lập)</span>
              </button>
            )}

            <div className="bg-black/40 p-1 rounded-xl border border-white/10 flex items-center gap-1">
              <button
                id="tab-btn-storefront"
                onClick={() => setActiveSubTab('storefront')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide flex items-center gap-2 transition ${
                  activeSubTab === 'storefront'
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Store className="w-4 h-4" />
                Gian Hàng Bán Lẻ
              </button>

              <button
                id="tab-btn-orders"
                onClick={() => setActiveSubTab('orders')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide flex items-center gap-2 transition relative ${
                  activeSubTab === 'orders'
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <PackageCheck className="w-4 h-4" />
                Quản Lý Đơn Hàng
                {orderStats.pendingCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {orderStats.pendingCount}
                  </span>
                )}
              </button>

              <button
                id="tab-btn-customers"
                onClick={() => setActiveSubTab('customers')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide flex items-center gap-2 transition ${
                  activeSubTab === 'customers'
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users className="w-4 h-4" />
                Khách Hàng ({db.webshopCustomerAccounts.length})
              </button>

              <button
                id="tab-btn-config"
                onClick={() => setActiveSubTab('config')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide flex items-center gap-2 transition ${
                  activeSubTab === 'config'
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Cấu Hình & Bảng Giá
              </button>
            </div>

            {/* Cart Button */}
            <button
              id="webshop-open-cart-btn"
              onClick={() => setIsCartOpen(true)}
              className="relative px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold text-xs flex items-center gap-2.5 transition"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Giỏ hàng</span>
              {cartSummary.totalCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black font-bold text-[11px]">
                  {cartSummary.totalCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: STOREFRONT & POS */}
      {activeSubTab === 'storefront' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-[#0f141c] border border-white/10 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedCategory === 'ALL'
                    ? 'bg-emerald-500 text-black font-semibold'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                Tất cả danh mục
              </button>
              {db.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-500 text-black font-semibold'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {/* In Stock toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-500/20"
                />
                Chỉ xem còn hàng trong kho
              </label>

              {/* Search input */}
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm sản phẩm, SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {storefrontProducts.length === 0 ? (
            <div className="bg-[#0f141c] border border-white/10 rounded-2xl p-12 text-center">
              <PackageCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-white font-semibold">Không tìm thấy sản phẩm nào phù hợp</p>
              <p className="text-xs text-slate-500 mt-1">Thử thay đổi từ khóa hoặc bộ lọc danh mục</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {storefrontProducts.map((prod) => {
                const config = db.webshopProductConfigs.find((c) => c.productId === prod.id);
                const retailPrice = config?.retailPrice || Math.round((prod.averageCost || 10000000) * 1.25);
                const promoPrice = config?.promoPrice;
                const hasPromo = promoPrice && promoPrice < retailPrice;
                const activePrice = hasPromo ? promoPrice : retailPrice;
                const uom = db.uoms.find((u) => u.id === prod.uomId);
                const isOutOfStock = prod.currentQty <= 0;
                const badge = config?.badge;

                const inCartItem = cart.find((i) => i.productId === prod.id);

                return (
                  <div
                    key={prod.id}
                    className="bg-[#0f141c] border border-white/10 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/40 transition-all duration-200 group relative"
                  >
                    {/* Badge */}
                    {badge && (
                      <span className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                        {badge}
                      </span>
                    )}

                    {/* Stock status tag */}
                    <div className="flex justify-end mb-2">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isOutOfStock
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : prod.currentQty <= 5
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOutOfStock ? 'bg-rose-400' : prod.currentQty <= 5 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                        />
                        {isOutOfStock ? 'Hết hàng' : `Còn ${prod.currentQty} ${uom?.name || 'Cái'}`}
                      </span>
                    </div>

                    {/* Product visual mock & Category */}
                    <div className="py-4 text-center">
                      <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-inner overflow-hidden p-2">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="max-h-full max-w-full object-contain drop-shadow"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <ShoppingBag className="w-10 h-10 text-emerald-400/80" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-3">SKU: {prod.sku}</p>
                      <h3 className="text-sm font-semibold text-white mt-1 line-clamp-2 min-h-[40px]">
                        {prod.name}
                      </h3>
                      {config?.shortDescription && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                          {config.shortDescription}
                        </p>
                      )}
                    </div>

                    {/* Pricing */}
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="text-lg font-bold text-emerald-400">
                            {activePrice.toLocaleString()}đ
                          </div>
                          {hasPromo && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-slate-500 line-through">
                                {retailPrice.toLocaleString()}đ
                              </span>
                              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1 rounded">
                                -{Math.round(((retailPrice - promoPrice) / retailPrice) * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">/{uom?.name || 'Cái'}</span>
                      </div>

                      {/* Add to Cart Actions */}
                      <div className="mt-4 flex items-center gap-2">
                        {inCartItem ? (
                          <div className="w-full flex items-center justify-between bg-black/40 border border-white/10 rounded-xl p-1">
                            <button
                              onClick={() => updateCartQty(prod.id, -1)}
                              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center transition"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-bold text-white">
                              {inCartItem.qty} {uom?.name || ''}
                            </span>
                            <button
                              onClick={() => updateCartQty(prod.id, 1)}
                              disabled={isOutOfStock && !db.webshopStoreConfig.allowOrderWhenOutOfStock}
                              className="w-8 h-8 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 flex items-center justify-center transition disabled:opacity-30"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            id={`add-to-cart-btn-${prod.id}`}
                            onClick={() => addToCart(prod.id, 1)}
                            disabled={isOutOfStock && !db.webshopStoreConfig.allowOrderWhenOutOfStock}
                            className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
                              isOutOfStock && !db.webshopStoreConfig.allowOrderWhenOutOfStock
                                ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-lg shadow-emerald-500/10'
                            }`}
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            {isOutOfStock && !db.webshopStoreConfig.allowOrderWhenOutOfStock
                              ? 'Hết hàng'
                              : 'Thêm vào giỏ'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: ORDER MANAGEMENT */}
      {activeSubTab === 'orders' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0f141c] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase font-medium">Doanh số Webshop</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-bold text-white mt-2">
                {orderStats.totalSales.toLocaleString()}đ
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{orderStats.totalCount} đơn hàng đã phát sinh</p>
            </div>

            <div className="bg-[#0f141c] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase font-medium">Chờ duyệt xuất kho</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-bold text-amber-400 mt-2">
                {orderStats.pendingCount} đơn
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Cần duyệt để trừ kho và xuất hàng</p>
            </div>

            <div className="bg-[#0f141c] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase font-medium">Đang giao / Đã xuất kho</span>
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-bold text-sky-400 mt-2">
                {orderStats.shippedCount} đơn
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Đã sinh phiếu xuất kho PX</p>
            </div>

            <div className="bg-[#0f141c] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase font-medium">Hoàn tất thành công</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-bold text-emerald-400 mt-2">
                {orderStats.completedCount} đơn
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Đã thu tiền và giao khách</p>
            </div>
          </div>

          {/* Filter and search bar */}
          <div className="bg-[#0f141c] border border-white/10 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'PENDING', label: 'Chờ duyệt' },
                { id: 'SHIPPED', label: 'Đã xuất kho' },
                { id: 'COMPLETED', label: 'Hoàn thành' },
                { id: 'CANCELLED', label: 'Đã hủy' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setOrderFilterStatus(st.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    orderFilterStatus === st.id
                      ? 'bg-emerald-500 text-black font-semibold'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm mã đơn, tên, SĐT khách..."
                value={orderSearchTerm}
                onChange={(e) => setOrderSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-[#0f141c] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-black/40 border-b border-white/10 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="p-4">Mã Đơn / Ngày</th>
                    <th className="p-4">Khách Hàng</th>
                    <th className="p-4">Sản Phẩm</th>
                    <th className="p-4">Kho Xuất</th>
                    <th className="p-4">Tổng Tiền</th>
                    <th className="p-4">Thanh Toán</th>
                    <th className="p-4">Trạng Thái Đơn</th>
                    <th className="p-4 text-center">Phiếu Xuất Kho</th>
                    <th className="p-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-500">
                        Chưa có đơn hàng nào phù hợp với điều kiện tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const warehouse = db.warehouses.find((w) => w.id === order.warehouseId);
                      const linkedTx = order.stockTxId ? db.stockTransactions.find((t) => t.id === order.stockTxId) : null;

                      return (
                        <tr key={order.id} className="hover:bg-white/[0.02] transition">
                          {/* Code & Date */}
                          <td className="p-4">
                            <span className="font-mono font-bold text-white block">
                              {order.orderCode}
                            </span>
                            <span className="text-[11px] text-slate-500">{order.date}</span>
                          </td>

                          {/* Customer */}
                          <td className="p-4">
                            <div className="font-semibold text-slate-200">{order.customerName}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-500" />
                              {order.customerPhone}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-[180px] mt-0.5" title={order.customerAddress}>
                              {order.customerAddress}
                            </div>
                          </td>

                          {/* Items summary */}
                          <td className="p-4">
                            <div className="space-y-1">
                              {order.items.slice(0, 2).map((item) => (
                                <div key={item.id} className="text-slate-300">
                                  <span className="font-semibold">{item.qty}x</span> {item.productName}
                                </div>
                              ))}
                              {order.items.length > 2 && (
                                <span className="text-[10px] text-emerald-400 font-semibold">
                                  +{order.items.length - 2} sản phẩm khác
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Warehouse */}
                          <td className="p-4 text-slate-300">
                            {warehouse ? warehouse.name : 'Kho mặc định'}
                          </td>

                          {/* Total amount */}
                          <td className="p-4">
                            <span className="font-bold text-emerald-400 text-sm block">
                              {order.totalAmount.toLocaleString()}đ
                            </span>
                            <span className="text-[10px] text-slate-500">
                              (VAT: {order.vatAmount?.toLocaleString()}đ)
                            </span>
                          </td>

                          {/* Payment status */}
                          <td className="p-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold block w-max ${
                                order.paymentStatus === 'PAID'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {order.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-1">
                              {order.paymentMethod === 'COD'
                                ? 'Thu hộ COD'
                                : order.paymentMethod === 'BANK_TRANSFER'
                                ? 'Chuyển khoản'
                                : 'Tiền mặt'}
                            </span>
                          </td>

                          {/* Order Status */}
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 ${
                                order.orderStatus === 'PENDING'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : order.orderStatus === 'SHIPPED'
                                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                  : order.orderStatus === 'COMPLETED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {order.orderStatus === 'PENDING' && <Clock className="w-3 h-3" />}
                              {order.orderStatus === 'SHIPPED' && <Truck className="w-3 h-3" />}
                              {order.orderStatus === 'COMPLETED' && <CheckCircle2 className="w-3 h-3" />}
                              {order.orderStatus === 'CANCELLED' && <XCircle className="w-3 h-3" />}
                              {order.orderStatus === 'PENDING'
                                ? 'Chờ duyệt'
                                : order.orderStatus === 'SHIPPED'
                                ? 'Đã xuất kho'
                                : order.orderStatus === 'COMPLETED'
                                ? 'Hoàn thành'
                                : 'Đã hủy'}
                            </span>
                          </td>

                          {/* Stock Transaction Link */}
                          <td className="p-4 text-center">
                            {linkedTx ? (
                              <div className="space-y-0.5">
                                <span className="font-mono text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                  {linkedTx.referenceNo}
                                </span>
                                <span className="text-[10px] text-slate-500 block">
                                  {linkedTx.isConfirmed ? 'Đã trừ kho' : 'Chưa confirm'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px] italic">Chưa tạo PX</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Fulfill action for pending order */}
                              {order.orderStatus === 'PENDING' && (
                                <button
                                  id={`fulfill-btn-${order.id}`}
                                  onClick={() => {
                                    if (confirm(`Xác nhận duyệt đơn ${order.orderCode} và xuất kho ngay bây giờ?`)) {
                                      const res = db.fulfillWebshopOrder(order.id);
                                      alert(res.message);
                                      onUpdate();
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1 transition"
                                  title="Duyệt đơn và tự động xuất kho trừ tồn kho"
                                >
                                  <PackageCheck className="w-3.5 h-3.5" />
                                  Duyệt & Xuất Kho
                                </button>
                              )}

                              {/* Complete action for shipped order */}
                              {order.orderStatus === 'SHIPPED' && (
                                <button
                                  id={`complete-btn-${order.id}`}
                                  onClick={() => {
                                    if (confirm(`Đánh dấu đơn hàng ${order.orderCode} đã giao thành công và hoàn tất thanh toán?`)) {
                                      const res = db.completeWebshopOrder(order.id);
                                      alert(res.message);
                                      onUpdate();
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-semibold text-xs flex items-center gap-1 transition"
                                  title="Đã giao và hoàn tất đơn"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Hoàn Tất
                                </button>
                              )}

                              {/* Print button */}
                              <button
                                onClick={() => setPrintingOrder(order)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                                title="In hóa đơn bán lẻ Webshop"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* View detail */}
                              <button
                                onClick={() => setViewingOrder(order)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                                title="Xem chi tiết đơn hàng"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Cancel action */}
                              {order.orderStatus !== 'CANCELLED' && order.orderStatus !== 'COMPLETED' && (
                                <button
                                  onClick={() => {
                                    const reason = prompt('Nhập lý do hủy đơn hàng:');
                                    if (reason !== null) {
                                      const res = db.cancelWebshopOrder(order.id, reason || undefined);
                                      alert(res.message);
                                      onUpdate();
                                    }
                                  }}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                                  title="Hủy đơn và hoàn kho tự động"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: CUSTOMER ACCOUNTS */}
      {activeSubTab === 'customers' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#0f141c] border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">{db.webshopCustomerAccounts.length}</div>
                <div className="text-[11px] text-slate-500">Tài khoản khách hàng</div>
              </div>
            </div>
            <div className="bg-[#0f141c] border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center">
                <PackageCheck className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">
                  {db.webshopOrders.filter((o) => o.accountId).length}
                </div>
                <div className="text-[11px] text-slate-500">Đơn hàng có tài khoản</div>
              </div>
            </div>
            <div className="bg-[#0f141c] border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
                <Heart className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">
                  {db.webshopCustomerAccounts.reduce((sum, a) => sum + (a.wishlist?.length || 0), 0)}
                </div>
                <div className="text-[11px] text-slate-500">SP yêu thích đã lưu</div>
              </div>
            </div>
            <div className="bg-[#0f141c] border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">
                  {db.webshopCustomerAccounts.filter((a) => a.customerId).length}
                </div>
                <div className="text-[11px] text-slate-500">Đã liên kết KH ERP</div>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="bg-[#0f141c] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                id="customer-search-input"
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Tìm username, tên, SĐT hoặc email khách hàng..."
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <span className="text-[11px] text-slate-500">
              Hiển thị {filteredCustomers.length} / {db.webshopCustomerAccounts.length} tài khoản
            </span>
          </div>

          {/* Customers Table */}
          <div className="bg-[#0f141c] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-black/40 border-b border-white/10 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="p-4">Tài Khoản</th>
                    <th className="p-4">Khách Hàng</th>
                    <th className="p-4">Liên Hệ</th>
                    <th className="p-4">Địa Chỉ</th>
                    <th className="p-4 text-center">KH ERP</th>
                    <th className="p-4 text-center">Đơn Hàng</th>
                    <th className="p-4 text-center">Yêu Thích</th>
                    <th className="p-4">Thời Gian</th>
                    <th className="p-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-500">
                        {db.webshopCustomerAccounts.length === 0
                          ? 'Chưa có tài khoản khách hàng nào. Khách tự đăng ký từ gian hàng.'
                          : 'Không tìm thấy tài khoản phù hợp với từ khóa tìm kiếm.'}
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((acc) => {
                      const orderCount = countOrdersByAccount(acc);
                      const linkedCustomer = acc.customerId
                        ? db.customers.find((c) => c.id === acc.customerId)
                        : null;
                      return (
                        <tr key={acc.id} className="hover:bg-white/[0.02] transition">
                          <td className="p-4">
                            <span className="font-mono font-bold text-emerald-400 block">{acc.username}</span>
                            <span className="text-[10px] text-slate-600 font-mono">{acc.id}</span>
                          </td>
                          <td className="p-4 font-semibold text-slate-200">{acc.fullName}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-slate-300">
                              <Phone className="w-3 h-3 text-slate-500" />
                              {acc.phone}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[200px]">{acc.email}</div>
                          </td>
                          <td className="p-4 text-[11px] text-slate-500 truncate max-w-[220px]" title={acc.address || ''}>
                            {acc.address || '—'}
                          </td>
                          <td className="p-4 text-center">
                            {linkedCustomer ? (
                              <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 text-[10px] font-semibold" title={linkedCustomer.name}>
                                {linkedCustomer.name}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`font-bold ${orderCount > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {orderCount}
                            </span>
                          </td>
                          <td className="p-4 text-center text-slate-300">{acc.wishlist?.length || 0}</td>
                          <td className="p-4">
                            <div className="text-[11px] text-slate-400">Tạo: {acc.createdAt?.slice(0, 10) || '—'}</div>
                            <div className="text-[11px] text-slate-500">Đăng nhập: {acc.lastLogin?.slice(0, 16).replace('T', ' ') || 'chưa bao giờ'}</div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                id={`btn-view-customer-${acc.id}`}
                                onClick={() => setViewingCustomer(acc)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition"
                                title="Xem chi tiết & đơn hàng"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`btn-resetpw-customer-${acc.id}`}
                                onClick={() => {
                                  setResetPwTarget(acc);
                                  setResetPwValue('');
                                  setResetPwConfirm('');
                                  setResetPwMessage(null);
                                }}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 transition"
                                title="Đặt lại mật khẩu"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`btn-delete-customer-${acc.id}`}
                                onClick={() => {
                                  if (window.confirm(`Xóa tài khoản "${acc.username}"?\n\nLịch sử đơn hàng vẫn được giữ lại (bỏ liên kết tài khoản).`)) {
                                    const res = db.deleteWebshopCustomer(acc.id);
                                    alert(res.message);
                                    onUpdate();
                                    if (viewingCustomer?.id === acc.id) setViewingCustomer(null);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                                title="Xóa tài khoản"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: CONFIG & PRICING */}
      {activeSubTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Store Settings Panel */}
          <div className="bg-[#0f141c] border border-white/10 rounded-2xl p-6 space-y-5 lg:col-span-1">
            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
              <Store className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Cấu Hình Gian Hàng</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Tên gian hàng</label>
                <input
                  type="text"
                  value={editingStoreConfig.storeName}
                  onChange={(e) =>
                    setEditingStoreConfig({ ...editingStoreConfig, storeName: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Khẩu hiệu / Slogan</label>
                <input
                  type="text"
                  value={editingStoreConfig.storeSlogan}
                  onChange={(e) =>
                    setEditingStoreConfig({ ...editingStoreConfig, storeSlogan: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Hotline tư vấn</label>
                  <input
                    type="text"
                    value={editingStoreConfig.hotline}
                    onChange={(e) =>
                      setEditingStoreConfig({ ...editingStoreConfig, hotline: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Kho xuất mặc định</label>
                  <select
                    value={editingStoreConfig.defaultWarehouseId}
                    onChange={(e) =>
                      setEditingStoreConfig({ ...editingStoreConfig, defaultWarehouseId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {db.warehouses.map((w) => (
                      <option key={w.id} value={w.id} className="bg-[#11141b]">
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Customer Support Widget Configuration (Hotline, Zalo, Live Chat) */}
              <div className="p-4 bg-black/30 border border-white/5 rounded-xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5" />
                    Cấu Hình Widget Hỗ Trợ Khách Hàng (Hotline, Zalo, Chat)
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={editingStoreConfig.enableSupportWidget !== false}
                      onChange={(e) =>
                        setEditingStoreConfig({
                          ...editingStoreConfig,
                          enableSupportWidget: e.target.checked,
                        })
                      }
                      className="rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-500/20"
                    />
                    <span className="font-semibold text-emerald-400 text-[11px]">Bật Widget nổi</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Số điện thoại Zalo CSKH</label>
                    <input
                      type="text"
                      value={editingStoreConfig.zaloNumber || ''}
                      placeholder="VD: 0901888999"
                      onChange={(e) =>
                        setEditingStoreConfig({ ...editingStoreConfig, zaloNumber: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Khung giờ hỗ trợ</label>
                    <input
                      type="text"
                      value={editingStoreConfig.supportHours || ''}
                      placeholder="VD: 8:00 - 21:30 (Thứ 2 - CN)"
                      onChange={(e) =>
                        setEditingStoreConfig({ ...editingStoreConfig, supportHours: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">Lời chào tự động khi mở Chat</label>
                  <textarea
                    rows={2}
                    value={editingStoreConfig.chatWelcomeMessage || ''}
                    placeholder="Lời chào khách hàng..."
                    onChange={(e) =>
                      setEditingStoreConfig({ ...editingStoreConfig, chatWelcomeMessage: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Bank Transfer Config */}
              <div className="p-4 bg-black/30 border border-white/5 rounded-xl space-y-3">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  Tài Khoản Nhận Chuyển Khoản
                </span>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">Ngân hàng</label>
                  <input
                    type="text"
                    value={editingStoreConfig.bankName}
                    onChange={(e) =>
                      setEditingStoreConfig({ ...editingStoreConfig, bankName: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">Số tài khoản</label>
                  <input
                    type="text"
                    value={editingStoreConfig.bankAccount}
                    onChange={(e) =>
                      setEditingStoreConfig({ ...editingStoreConfig, bankAccount: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">Chủ tài khoản</label>
                  <input
                    type="text"
                    value={editingStoreConfig.bankOwner}
                    onChange={(e) =>
                      setEditingStoreConfig({ ...editingStoreConfig, bankOwner: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white uppercase"
                  />
                </div>
              </div>

              {/* Warehouse Automation Checkboxes */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editingStoreConfig.autoCreateStockOut}
                    onChange={(e) =>
                      setEditingStoreConfig({
                        ...editingStoreConfig,
                        autoCreateStockOut: e.target.checked,
                      })
                    }
                    className="mt-0.5 rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-500/20"
                  />
                  <span>
                    <strong className="block text-white">Tự động xuất kho khi duyệt đơn</strong>
                    <span className="text-[11px] text-slate-400">
                      Tự động tạo phiếu PX và trừ tồn kho ngay khi nhân viên bấm duyệt.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editingStoreConfig.allowOrderWhenOutOfStock}
                    onChange={(e) =>
                      setEditingStoreConfig({
                        ...editingStoreConfig,
                        allowOrderWhenOutOfStock: e.target.checked,
                      })
                    }
                    className="mt-0.5 rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-500/20"
                  />
                  <span>
                    <strong className="block text-white">Cho phép đặt hàng khi hết tồn kho</strong>
                    <span className="text-[11px] text-slate-400">
                      Cho phép khách đặt trước (Backorder) ngay cả khi tồn kho = 0.
                    </span>
                  </span>
                </label>
              </div>

              <button
                id="save-store-config-btn"
                onClick={() => {
                  db.saveWebshopStoreConfig(editingStoreConfig);
                  alert('Lưu cấu hình gian hàng Webshop thành công!');
                  onUpdate();
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 transition"
              >
                Lưu Thay Đổi Cấu Hình
              </button>
            </div>
          </div>

          {/* Product Retail Catalog Pricing */}
          <div className="bg-[#0f141c] border border-white/10 rounded-2xl p-6 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-bold text-white">Bảng Giá & Danh Mục Bán Lẻ</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Quản lý hiển thị sản phẩm, giá bán niêm yết, khuyến mãi và biên độ lợi nhuận
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-black/40 border-b border-white/10 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="p-3">Hiển Thị</th>
                    <th className="p-3">Sản Phẩm</th>
                    <th className="p-3">Tồn Kho</th>
                    <th className="p-3">Giá Vốn (COGS)</th>
                    <th className="p-3">Giá Niêm Yết</th>
                    <th className="p-3">Giá Khuyến Mãi</th>
                    <th className="p-3">Nhãn</th>
                    <th className="p-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {db.products.map((prod) => {
                    const config = db.webshopProductConfigs.find((c) => c.productId === prod.id);
                    const isPub = config ? config.isPublished : true;
                    const retail = config?.retailPrice || Math.round((prod.averageCost || 10000000) * 1.25);
                    const promo = config?.promoPrice;
                    const uom = db.uoms.find((u) => u.id === prod.uomId);

                    return (
                      <tr key={prod.id} className="hover:bg-white/[0.02] transition">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={isPub}
                            onChange={(e) => {
                              db.saveWebshopProductConfig({
                                productId: prod.id,
                                isPublished: e.target.checked,
                                retailPrice: retail,
                                promoPrice: promo,
                                isFeatured: config?.isFeatured ?? true,
                                badge: config?.badge,
                                shortDescription: config?.shortDescription,
                              });
                              onUpdate();
                            }}
                            className="rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer"
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-white">{prod.name}</div>
                          <span className="text-[11px] font-mono text-slate-500">{prod.sku}</span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`font-semibold ${
                              prod.currentQty <= 0 ? 'text-rose-400' : 'text-slate-300'
                            }`}
                          >
                            {prod.currentQty} {uom?.name || ''}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-400">
                          {formatOrMaskCost(prod.averageCost, true)}
                        </td>
                        <td className="p-3 font-semibold text-emerald-400">
                          {retail.toLocaleString()}đ
                        </td>
                        <td className="p-3 font-semibold text-amber-400">
                          {promo ? `${promo.toLocaleString()}đ` : '-'}
                        </td>
                        <td className="p-3">
                          {config?.badge ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white">
                              {config.badge}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() =>
                              setEditingProductConfig({
                                productId: prod.id,
                                isPublished: isPub,
                                retailPrice: retail,
                                promoPrice: promo,
                                isFeatured: config?.isFeatured ?? true,
                                badge: config?.badge || '',
                                shortDescription: config?.shortDescription || prod.description || '',
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition font-medium"
                          >
                            Sửa giá
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-[#11141b] border-l border-white/10 h-full flex flex-col p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Giỏ Hàng Mua Sắm</h2>
                <span className="text-xs text-slate-400 font-mono">({cartSummary.totalCount} món)</span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <p className="font-semibold text-white">Giỏ hàng của bạn đang trống</p>
                  <p className="text-xs mt-1">Hãy thêm sản phẩm từ gian hàng để đặt đơn</p>
                </div>
              ) : (
                cartSummary.items.map((item) => (
                  <div
                    key={item.productId}
                    className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate">
                        {item.product?.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Đơn giá: {item.unitPrice.toLocaleString()}đ
                      </p>
                      <p className="text-xs font-bold text-emerald-400 mt-1">
                        {item.lineTotal.toLocaleString()}đ
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateCartQty(item.productId, -1)}
                        className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-bold text-xs text-white">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateCartQty(item.productId, 1)}
                        className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition ml-1"
                        title="Xóa món"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer Calculation */}
            {cart.length > 0 && (
              <div className="border-t border-white/10 pt-4 space-y-3">
                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Tạm tính tiền hàng</span>
                    <span className="text-white font-mono">{cartSummary.subtotal.toLocaleString()}đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Thuế VAT ({cartSummary.vatRate}%)</span>
                    <span className="text-white font-mono">{cartSummary.vatAmount.toLocaleString()}đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phí vận chuyển</span>
                    <span className="text-white font-mono">{cartSummary.shippingFee.toLocaleString()}đ</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/5">
                    <span>Tổng thanh toán</span>
                    <span className="text-emerald-400 font-mono text-base">
                      {cartSummary.grandTotal.toLocaleString()}đ
                    </span>
                  </div>
                </div>

                <button
                  id="cart-proceed-checkout-btn"
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition"
                >
                  Tiến Hành Thanh Toán & Đặt Hàng
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CHECKOUT DIALOG */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#11141b] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Xác Nhận Đặt Hàng & Xuất Kho</h2>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs">
              {/* Customer Info Group */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  1. Thông tin người nhận
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Số điện thoại <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="09xx xxx xxx"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      onBlur={(e) => handlePhoneBlur(e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Họ và tên khách hàng <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    Địa chỉ giao hàng chi tiết <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Warehouse & Shipping Group */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  2. Kho xuất & Vận chuyển
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Kho xuất hàng thực tế</label>
                    <select
                      value={selectedWarehouseId}
                      onChange={(e) => setSelectedWarehouseId(e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    >
                      {db.warehouses.map((w) => (
                        <option key={w.id} value={w.id} className="bg-[#11141b]">
                          {w.name} ({w.location})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Phương thức vận chuyển</label>
                    <select
                      value={shippingMethod}
                      onChange={(e) => setShippingMethod(e.target.value as any)}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="STANDARD" className="bg-[#11141b]">Giao tiêu chuẩn (30.000đ)</option>
                      <option value="EXPRESS" className="bg-[#11141b]">Giao hỏa tốc 2h (45.000đ)</option>
                      <option value="STORE_PICKUP" className="bg-[#11141b]">Nhận tại cửa hàng (Miễn phí)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Method Group */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  3. Phương thức thanh toán
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'COD', label: 'Thanh toán khi nhận (COD)', icon: Truck },
                    { id: 'BANK_TRANSFER', label: 'Chuyển khoản Ngân hàng (QR)', icon: QrCode },
                    { id: 'CASH', label: 'Tiền mặt tại quầy', icon: CreditCard },
                  ].map((pm) => {
                    const Icon = pm.icon;
                    return (
                      <button
                        type="button"
                        key={pm.id}
                        onClick={() => setPaymentMethod(pm.id as any)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition ${
                          paymentMethod === pm.id
                            ? 'bg-emerald-500/10 border-emerald-500 text-white'
                            : 'bg-black/30 border-white/10 text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-[11px] leading-snug">{pm.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Bank QR info box if bank transfer */}
                {paymentMethod === 'BANK_TRANSFER' && (
                  <div className="p-3 bg-black/40 border border-white/10 rounded-xl flex items-center gap-4">
                    <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center p-1 shrink-0">
                      <QrCode className="w-12 h-12 text-black" />
                    </div>
                    <div className="text-[11px] text-slate-300">
                      <p className="font-bold text-white">{db.webshopStoreConfig.bankName}</p>
                      <p className="font-mono text-emerald-400 font-bold">
                        STK: {db.webshopStoreConfig.bankAccount}
                      </p>
                      <p className="uppercase text-slate-400">{db.webshopStoreConfig.bankOwner}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Nội dung CK: [Họ tên] [SĐT] Mua Webshop
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Notes & Instant Fulfill Toggle */}
              <div>
                <label className="block text-slate-400 mb-1">Ghi chú giao hàng</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white"
                />
              </div>

              {/* Instant Fulfill Option */}
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={instantFulfill}
                    onChange={(e) => setInstantFulfill(e.target.checked)}
                    className="rounded border-emerald-500/30 bg-black/40 text-emerald-500 focus:ring-emerald-500/20"
                  />
                  <span className="font-semibold text-white text-xs">
                    Tự động tạo Phiếu Xuất Kho & trừ tồn kho ngay sau khi tạo đơn
                  </span>
                </label>
              </div>

              {/* Price total calculation */}
              <div className="bg-black/50 p-4 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Tiền hàng ({cartSummary.totalCount} sản phẩm):</span>
                  <span className="font-mono text-white">{cartSummary.subtotal.toLocaleString()}đ</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Thuế VAT ({cartSummary.vatRate}%):</span>
                  <span className="font-mono text-white">{cartSummary.vatAmount.toLocaleString()}đ</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Phí giao hàng:</span>
                  <span className="font-mono text-white">{cartSummary.shippingFee.toLocaleString()}đ</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                  <span>Tổng tiền thanh toán:</span>
                  <span className="text-emerald-400 font-mono text-base">
                    {cartSummary.grandTotal.toLocaleString()}đ
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold"
                >
                  Hủy
                </button>
                <button
                  id="checkout-confirm-order-btn"
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-lg shadow-emerald-500/20 transition"
                >
                  Xác Nhận Đặt Đơn Hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PRODUCT WEBSHOP PRICING */}
      {editingProductConfig && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#11141b] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-sm">Điều Chỉnh Giá Bán Lẻ & Webshop</h3>
              <button
                onClick={() => setEditingProductConfig(null)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Giá bán lẻ niêm yết (VNĐ)</label>
                <input
                  type="number"
                  value={editingProductConfig.retailPrice}
                  onChange={(e) =>
                    setEditingProductConfig({
                      ...editingProductConfig,
                      retailPrice: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Giá khuyến mãi (để trống nếu không giảm)</label>
                <input
                  type="number"
                  placeholder="Ví dụ: 29000000"
                  value={editingProductConfig.promoPrice || ''}
                  onChange={(e) =>
                    setEditingProductConfig({
                      ...editingProductConfig,
                      promoPrice: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Nhãn nổi bật (Badge)</label>
                <select
                  value={editingProductConfig.badge || ''}
                  onChange={(e) =>
                    setEditingProductConfig({
                      ...editingProductConfig,
                      badge: e.target.value || undefined,
                    })
                  }
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white"
                >
                  <option value="" className="bg-[#11141b]">Không gắn nhãn</option>
                  <option value="HOT" className="bg-[#11141b]">HOT</option>
                  <option value="MỚI" className="bg-[#11141b]">MỚI</option>
                  <option value="BÁN CHẠY" className="bg-[#11141b]">BÁN CHẠY</option>
                  <option value="GIẢM GIÁ" className="bg-[#11141b]">GIẢM GIÁ</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Mô tả ngắn hiển thị trên thẻ sản phẩm</label>
                <textarea
                  rows={2}
                  value={editingProductConfig.shortDescription || ''}
                  onChange={(e) =>
                    setEditingProductConfig({
                      ...editingProductConfig,
                      shortDescription: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="pub-check"
                  checked={editingProductConfig.isPublished}
                  onChange={(e) =>
                    setEditingProductConfig({
                      ...editingProductConfig,
                      isPublished: e.target.checked,
                    })
                  }
                  className="rounded border-white/20 bg-black/40 text-emerald-500"
                />
                <label htmlFor="pub-check" className="text-slate-300 font-medium cursor-pointer">
                  Hiển thị bán công khai trên Webshop
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingProductConfig(null)}
                className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:text-white"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  db.saveWebshopProductConfig(editingProductConfig);
                  setEditingProductConfig(null);
                  onUpdate();
                }}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
              >
                Lưu Bảng Giá
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW CUSTOMER ACCOUNT */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#11141b] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Tài Khoản Khách Hàng: {viewingCustomer.username}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{viewingCustomer.fullName}</p>
              </div>
              <button onClick={() => setViewingCustomer(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-black/40 rounded-xl border border-white/5 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Email:</span>
                <span className="text-slate-200">{viewingCustomer.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Điện thoại:</span>
                <span className="text-slate-200">{viewingCustomer.phone}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Địa chỉ:</span>
                <span className="text-slate-200">{viewingCustomer.address || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Liên kết KH ERP:</span>
                <span className="text-slate-200">
                  {viewingCustomer.customerId
                    ? db.customers.find((c) => c.id === viewingCustomer.customerId)?.name || viewingCustomer.customerId
                    : '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Ngày tạo:</span>
                <span className="text-slate-200">{viewingCustomer.createdAt || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Đăng nhập gần nhất:</span>
                <span className="text-slate-200">{viewingCustomer.lastLogin || 'chưa bao giờ'}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Lịch sử đơn hàng ({getAccountOrders(viewingCustomer).length})
              </h4>
              {getAccountOrders(viewingCustomer).length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-black/30 rounded-xl border border-white/5">
                  Khách hàng chưa đặt đơn hàng nào.
                </div>
              ) : (
                <div className="space-y-2">
                  {getAccountOrders(viewingCustomer).slice(0, 20).map((o) => (
                    <button
                      key={o.id}
                      onClick={() => {
                        setViewingCustomer(null);
                        setActiveSubTab('orders');
                        setViewingOrder(o);
                      }}
                      className="w-full text-left p-3 bg-black/30 hover:bg-emerald-500/10 rounded-xl border border-white/5 transition flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="font-mono font-bold text-emerald-400 text-xs">{o.orderCode}</span>
                        <span className="text-[11px] text-slate-500 ml-2">{o.date}</span>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {o.items.reduce((s, it) => s + it.qty, 0)} sản phẩm · {o.customerName}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-400 text-xs">
                          {new Intl.NumberFormat('vi-VN').format(o.totalAmount)} ₫
                        </span>
                        <span className={`block text-[10px] font-semibold ${
                          o.orderStatus === 'PENDING' ? 'text-amber-400' :
                          o.orderStatus === 'CANCELLED' ? 'text-rose-400' : 'text-sky-400'
                        }`}>{o.orderStatus}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {(viewingCustomer.wishlist?.length || 0) > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Sản phẩm yêu thích ({viewingCustomer.wishlist?.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(viewingCustomer.wishlist || []).map((pid) => {
                    const prod = db.products.find((p) => p.id === pid);
                    return (
                      <span key={pid} className="px-2 py-1 rounded-lg bg-violet-500/10 text-violet-300 text-[11px] border border-violet-500/20">
                        {prod ? prod.name : pid}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: RESET CUSTOMER PASSWORD */}
      {resetPwTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#11141b] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Đặt Lại Mật Khẩu</h3>
                <p className="text-xs text-slate-400 mt-0.5">Tài khoản: {resetPwTarget.username} ({resetPwTarget.fullName})</p>
              </div>
              <button onClick={() => setResetPwTarget(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Mật khẩu mới (tối thiểu 6 ký tự):</label>
                <input
                  id="resetpw-new-input"
                  type="password"
                  value={resetPwValue}
                  onChange={(e) => setResetPwValue(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                  placeholder="Nhập mật khẩu mới"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Xác nhận mật khẩu:</label>
                <input
                  id="resetpw-confirm-input"
                  type="password"
                  value={resetPwConfirm}
                  onChange={(e) => setResetPwConfirm(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                  placeholder="Nhập lại mật khẩu mới"
                />
              </div>

              {resetPwMessage && (
                <div className={`p-2.5 rounded-xl text-xs font-semibold ${resetPwMessage.ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                  {resetPwMessage.text}
                </div>
              )}

              <button
                id="resetpw-submit-btn"
                onClick={() => {
                  if (!resetPwValue) {
                    setResetPwMessage({ ok: false, text: 'Vui lòng nhập mật khẩu mới.' });
                    return;
                  }
                  if (resetPwValue !== resetPwConfirm) {
                    setResetPwMessage({ ok: false, text: 'Mật khẩu xác nhận không khớp.' });
                    return;
                  }
                  const res = db.resetWebshopCustomerPassword(resetPwTarget.id, resetPwValue);
                  setResetPwMessage({ ok: res.success, text: res.message });
                  if (res.success) {
                    onUpdate();
                    setTimeout(() => setResetPwTarget(null), 600);
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition"
              >
                Xác Nhận Đặt Lại Mật Khẩu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW ORDER DETAILS */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#11141b] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Chi Tiết Đơn Hàng {viewingOrder.orderCode}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Ngày đặt: {viewingOrder.date}</p>
              </div>
              <button onClick={() => setViewingOrder(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-black/40 rounded-xl border border-white/5">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Khách hàng:</span>
                  <span className="font-semibold text-white block">{viewingOrder.customerName}</span>
                  <span className="text-slate-400">{viewingOrder.customerPhone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Địa chỉ giao:</span>
                  <span className="text-slate-300 block">{viewingOrder.customerAddress}</span>
                </div>
              </div>

              {/* Items */}
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase block mb-2">
                  Danh sách sản phẩm
                </span>
                <div className="space-y-1.5 border border-white/5 rounded-xl p-3 bg-black/30">
                  {viewingOrder.items.map((it) => (
                    <div key={it.id} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
                      <div>
                        <span className="font-semibold text-white">{it.productName}</span>
                        <span className="text-[11px] text-slate-500 block">
                          SKU: {it.productSku} | SL: {it.qty} {it.uomName} x {it.unitPrice.toLocaleString()}đ
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">
                        {it.totalPrice.toLocaleString()}đ
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accounting & Inventory Link Status */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Liên kết Quản lý Kho & Kế toán
                </span>
                <p className="text-[11px] text-slate-300">
                  Phiếu Xuất Kho: {viewingOrder.stockTxId ? (
                    <strong className="font-mono text-emerald-300">
                      {db.stockTransactions.find((t) => t.id === viewingOrder.stockTxId)?.referenceNo || viewingOrder.stockTxId}
                    </strong>
                  ) : (
                    'Chưa xuất kho (Chờ duyệt)'
                  )}
                </p>
                <p className="text-[11px] text-slate-400">
                  {viewingOrder.stockTxId
                    ? 'Đã hạch toán giá vốn hàng bán (632/1561) và doanh thu bán hàng (511/3331/131) tự động.'
                    : 'Nhấn "Duyệt & Xuất kho" trên danh sách đơn để hoàn tất hạch toán.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => setViewingOrder(null)}
                className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRINT WEBSHOP INVOICE / RECEIPT */}
      {printingOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white text-slate-900 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="text-center border-b border-gray-200 pb-4">
              <h2 className="text-lg font-bold text-gray-800 tracking-tight">
                {db.webshopStoreConfig.storeName || 'V-SMART STORE'}
              </h2>
              <p className="text-xs text-gray-500">{db.webshopStoreConfig.address}</p>
              <p className="text-xs text-gray-500">Hotline: {db.webshopStoreConfig.hotline}</p>
              <h3 className="text-base font-bold text-gray-900 uppercase mt-3">HÓA ĐƠN BÁN HÀNG WEBSHOP</h3>
              <p className="text-xs font-mono text-gray-600">
                Mã đơn: {printingOrder.orderCode} | Ngày: {printingOrder.date}
              </p>
            </div>

            <div className="text-xs space-y-1 text-gray-700">
              <p><strong>Khách hàng:</strong> {printingOrder.customerName}</p>
              <p><strong>Điện thoại:</strong> {printingOrder.customerPhone}</p>
              <p><strong>Địa chỉ:</strong> {printingOrder.customerAddress}</p>
              <p><strong>Hình thức TT:</strong> {printingOrder.paymentMethod} ({printingOrder.paymentStatus})</p>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-y border-gray-300 font-bold bg-gray-50">
                  <th className="py-2">Mặt hàng</th>
                  <th className="py-2 text-center">SL</th>
                  <th className="py-2 text-right">Đơn giá</th>
                  <th className="py-2 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {printingOrder.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 font-medium">{item.productName}</td>
                    <td className="py-2 text-center">{item.qty}</td>
                    <td className="py-2 text-right">{item.unitPrice.toLocaleString()}đ</td>
                    <td className="py-2 text-right font-semibold">{item.totalPrice.toLocaleString()}đ</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-gray-300 pt-3 space-y-1 text-xs text-right">
              <div className="flex justify-between">
                <span>Tiền hàng:</span>
                <span>{printingOrder.subtotal.toLocaleString()}đ</span>
              </div>
              <div className="flex justify-between">
                <span>Thuế VAT ({printingOrder.vatRate}%):</span>
                <span>{printingOrder.vatAmount.toLocaleString()}đ</span>
              </div>
              <div className="flex justify-between">
                <span>Phí vận chuyển:</span>
                <span>{printingOrder.shippingFee.toLocaleString()}đ</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-gray-900 pt-1 border-t border-gray-200">
                <span>TỔNG CỘNG:</span>
                <span>{printingOrder.totalAmount.toLocaleString()}đ</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={() => setPrintingOrder(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                In Hóa Đơn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
