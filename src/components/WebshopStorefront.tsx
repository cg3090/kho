/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { MockDatabase } from '../db/mockDb';
import {
  WebshopOrder,
  WebshopPaymentMethod,
  Product,
} from '../types';
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Truck,
  XCircle,
  ChevronRight,
  Plus,
  Minus,
  Trash2,
  Phone,
  MapPin,
  QrCode,
  Eye,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Lock,
  RotateCcw,
  Check,
  CreditCard,
  Building2,
  ExternalLink,
  ChevronLeft,
  X,
  Package,
} from 'lucide-react';
import { broadcastNewOrder } from '../utils/orderNotifications';
import { CustomerSupportWidget } from './CustomerSupportWidget';

interface WebshopStorefrontProps {
  db: MockDatabase;
  onOpenAdmin: () => void;
  onUpdate: () => void;
}

interface CartItem {
  productId: string;
  qty: number;
  unitPrice: number;
}

export default function WebshopStorefront({ db, onOpenAdmin, onUpdate }: WebshopStorefrontProps) {
  // Navigation & filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'POPULAR' | 'PRICE_ASC' | 'PRICE_DESC' | 'NEWEST'>('POPULAR');

  // Modals & Panels
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null);
  const [placedOrder, setPlacedOrder] = useState<WebshopOrder | null>(null);

  // Tracking modal
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackingQuery, setTrackingQuery] = useState('');
  const [trackingResults, setTrackingResults] = useState<WebshopOrder[] | null>(null);

  // Checkout form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [shippingMethod, setShippingMethod] = useState<'STANDARD' | 'EXPRESS' | 'STORE_PICKUP'>('STANDARD');
  const [paymentMethod, setPaymentMethod] = useState<WebshopPaymentMethod>('COD');
  const [orderNotes, setOrderNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const storeConfig = db.webshopStoreConfig;

  // Auto fill previous customer by phone number
  const handlePhoneBlur = (phone: string) => {
    const existing = db.customers.find((c) => c.phone?.trim() === phone.trim());
    if (existing) {
      if (!customerName) setCustomerName(existing.name);
      if (!customerAddress && existing.address) setCustomerAddress(existing.address);
    }
  };

  // Products filtered for storefront
  const filteredProducts = useMemo(() => {
    let prods = db.products.filter((p) => {
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

    // Sorting
    prods = [...prods].sort((a, b) => {
      const configA = db.webshopProductConfigs.find((c) => c.productId === a.id);
      const configB = db.webshopProductConfigs.find((c) => c.productId === b.id);
      const priceA = configA?.retailPrice && configA.retailPrice > 0 ? (configA.promoPrice || configA.retailPrice) : (a.averageCost ? a.averageCost * 1.3 : 100000);
      const priceB = configB?.retailPrice && configB.retailPrice > 0 ? (configB.promoPrice || configB.retailPrice) : (b.averageCost ? b.averageCost * 1.3 : 100000);

      if (sortBy === 'PRICE_ASC') return priceA - priceB;
      if (sortBy === 'PRICE_DESC') return priceB - priceA;
      if (sortBy === 'NEWEST') return b.id.localeCompare(a.id);
      // Popular (featured first, then higher stock)
      const badgeScoreA = configA?.badge ? 10 : 0;
      const badgeScoreB = configB?.badge ? 10 : 0;
      return (badgeScoreB + b.currentQty) - (badgeScoreA + a.currentQty);
    });

    return prods;
  }, [db.products, db.webshopProductConfigs, selectedCategory, inStockOnly, searchTerm, sortBy]);

  // Cart summary calculations
  const cartSummary = useMemo(() => {
    let subtotal = 0;
    const items = cart.map((item) => {
      const prod = db.products.find((p) => p.id === item.productId);
      const config = db.webshopProductConfigs.find((c) => c.productId === item.productId);
      const lineTotal = item.qty * item.unitPrice;
      subtotal += lineTotal;
      return {
        ...item,
        product: prod,
        config,
        lineTotal,
      };
    });

    const shippingFee = shippingMethod === 'EXPRESS' ? 45000 : shippingMethod === 'STORE_PICKUP' ? 0 : 30000;
    const vatRate = db.systemConfig.defaultVatRate || 10;
    const vatAmount = Math.round(subtotal * (vatRate / 100));
    const totalAmount = subtotal + vatAmount + shippingFee;
    const totalQty = cart.reduce((acc, curr) => acc + curr.qty, 0);

    return { items, subtotal, shippingFee, vatRate, vatAmount, totalAmount, totalQty };
  }, [cart, shippingMethod, db.products, db.webshopProductConfigs, db.systemConfig.defaultVatRate]);

  // Add to cart helper
  const handleAddToCart = (product: Product, qtyToAdd = 1) => {
    const config = db.webshopProductConfigs.find((c) => c.productId === product.id);
    const unitPrice = (config?.promoPrice && config.promoPrice > 0)
      ? config.promoPrice
      : (config?.retailPrice && config.retailPrice > 0)
      ? config.retailPrice
      : (product.averageCost ? product.averageCost * 1.3 : 100000);

    if (!storeConfig.allowOrderWhenOutOfStock && product.currentQty <= 0) {
      alert(`Sản phẩm "${product.name}" hiện đang hết hàng.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        const newQty = existing.qty + qtyToAdd;
        if (!storeConfig.allowOrderWhenOutOfStock && newQty > product.currentQty) {
          alert(`Chỉ còn ${product.currentQty} sản phẩm trong kho.`);
          return prev;
        }
        return prev.map((item) => (item.productId === product.id ? { ...item, qty: newQty } : item));
      } else {
        if (!storeConfig.allowOrderWhenOutOfStock && qtyToAdd > product.currentQty) {
          alert(`Chỉ còn ${product.currentQty} sản phẩm trong kho.`);
          return prev;
        }
        return [...prev, { productId: product.id, qty: qtyToAdd, unitPrice }];
      }
    });

    setIsCartOpen(true);
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.productId !== productId) return item;
          const prod = db.products.find((p) => p.id === productId);
          const newQty = item.qty + delta;
          if (newQty <= 0) return null;
          if (!storeConfig.allowOrderWhenOutOfStock && prod && newQty > prod.currentQty) {
            alert(`Kho chỉ còn ${prod.currentQty} sản phẩm.`);
            return item;
          }
          return { ...item, qty: newQty };
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Submit Order
  const handlePlaceOrder = () => {
    if (!customerName.trim()) {
      setFormError('Vui lòng nhập họ và tên người nhận.');
      return;
    }
    if (!customerPhone.trim()) {
      setFormError('Vui lòng nhập số điện thoại liên hệ.');
      return;
    }
    if (!customerAddress.trim() && shippingMethod !== 'STORE_PICKUP') {
      setFormError('Vui lòng nhập địa chỉ giao hàng chi tiết.');
      return;
    }
    if (cart.length === 0) {
      setFormError('Giỏ hàng của bạn đang trống.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const warehouseId = storeConfig.defaultWarehouseId || db.warehouses[0]?.id || 'wh-1';
      const result = db.createWebshopOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerAddress: customerAddress.trim() || 'Nhận tại cửa hàng',
        shippingMethod,
        paymentMethod,
        warehouseId,
        notes: orderNotes.trim(),
        items: cart.map((c) => ({
          productId: c.productId,
          qty: c.qty,
          unitPrice: c.unitPrice,
        })),
      });

      if (result.success && result.order) {
        // If store configured to auto-fulfill immediately upon order creation:
        if (storeConfig.autoCreateStockOut) {
          db.fulfillWebshopOrder(result.order.id, warehouseId);
        }

        // Broadcast order notification to sound alarm and alert warehouse admin!
        broadcastNewOrder(result.order);

        // Reset cart and checkout
        setCart([]);
        setIsCheckoutOpen(false);
        setIsCartOpen(false);
        setPlacedOrder(result.order);
        onUpdate();
      } else {
        setFormError(result.message || 'Không thể tạo đơn hàng. Vui lòng thử lại!');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Có lỗi xảy ra trong quá trình đặt hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle order lookup
  const handleSearchTracking = () => {
    if (!trackingQuery.trim()) {
      setTrackingResults(null);
      return;
    }
    const q = trackingQuery.trim().toLowerCase();
    const found = db.webshopOrders.filter((o) => {
      const matchCode = o.orderCode?.toLowerCase().includes(q);
      const matchPhone = o.customerPhone?.toLowerCase().includes(q);
      const matchName = o.customerName?.toLowerCase().includes(q);
      return matchCode || matchPhone || matchName;
    });
    setTrackingResults(found);
  };

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-[#07090e] text-slate-100 font-sans flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* 1. TOP NOTICE & STAFF PORTAL BAR */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/70 border-b border-emerald-500/20 px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-emerald-400 font-medium min-w-0">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="truncate hidden md:inline">{storeConfig.storeSlogan || 'Hệ thống Bán lẻ Thiết bị Công nghệ - Kết nối Tồn kho Thực tế'}</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-slate-400">
            <a
              href={`tel:${storeConfig.hotline || '19008888'}`}
              className="hover:text-emerald-400 transition flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Hotline: <strong className="text-white">{storeConfig.hotline || '1900 8888'}</strong></span>
            </a>

            <button
              onClick={() => setIsTrackingOpen(true)}
              className="hover:text-emerald-400 transition flex items-center gap-1 text-slate-300 font-medium"
            >
              <Package className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Tra cứu đơn hàng</span>
            </button>

            <button
              onClick={onOpenAdmin}
              className="bg-slate-800/90 hover:bg-emerald-600 hover:text-white text-emerald-400 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-emerald-500/30 transition flex items-center gap-1.5 shadow-sm shrink-0"
              title="Truy cập Hệ thống Quản trị Kho & Đơn Hàng"
            >
              <Lock className="w-3 h-3" />
              <span className="hidden xs:inline sm:inline">Cổng Quản Trị Kho</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER NAVIGATION */}
      <header className="sticky top-0 z-40 bg-[#0d121d]/90 backdrop-blur-md border-b border-slate-800/80 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Logo & Store Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/20 shrink-0">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                {storeConfig.storeName || 'V-SMART DIGITAL STORE'}
              </h1>
              <p className="text-[11px] text-emerald-400/90 font-medium hidden sm:block">Bán lẻ trực tuyến & Giao hàng toàn quốc</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-xl relative hidden md:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên sản phẩm, mã SKU, thông số..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-full pl-10 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition shadow-inner"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Header: Cart & Actions */}
          <div className="flex items-center gap-3">
            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-4 py-2 rounded-xl transition shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <ShoppingCart className="w-4 h-4 text-white" />
              <span className="text-xs hidden sm:inline">Giỏ hàng</span>
              {cartSummary.totalQty > 0 && (
                <span className="bg-black text-emerald-400 text-[11px] font-extrabold px-2 py-0.5 rounded-full">
                  {cartSummary.totalQty}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="px-4 pb-3 md:hidden">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm tên hoặc mã sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills bar */}
        <div className="border-t border-slate-800/80 bg-[#0a0d14]/70 px-4 py-2 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === 'ALL'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              Tất cả danh mục ({db.products.length})
            </button>
            {db.categories.map((cat) => {
              const count = db.products.filter((p) => p.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* 3. HERO PROMOTIONAL BANNER */}
      <section className="bg-gradient-to-b from-[#0e1626] to-[#07090e] border-b border-slate-800/60 py-6 sm:py-8 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8 space-y-3">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Hàng chính hãng 100% • Tồn kho đồng bộ thời gian thực</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
              Mua Sắm Trực Tuyến Tiện Lợi, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                Giao Hỏa Tốc & Bảo Hành Chính Hãng
              </span>
            </h2>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Tất cả sản phẩm trên gian hàng đều được kết nối trực tiếp với kho trung tâm.
              Số lượng hiển thị là số lượng khả dụng thực tế, cam kết giữ hàng ngay khi quý khách gửi đơn.
            </p>

            {/* Value props */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5">
                <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-[11px] leading-tight">
                  <p className="font-bold text-white">Giao Hỏa Tốc</p>
                  <p className="text-slate-400 text-[10px]">Chỉ từ 2 giờ</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-[11px] leading-tight">
                  <p className="font-bold text-white">Chính Hãng</p>
                  <p className="text-slate-400 text-[10px]">Bảo hành 12-24T</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5">
                <RotateCcw className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-[11px] leading-tight">
                  <p className="font-bold text-white">Đổi Trả Dễ</p>
                  <p className="text-slate-400 text-[10px]">Trong vòng 7 ngày</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5">
                <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-[11px] leading-tight">
                  <p className="font-bold text-white">COD / VietQR</p>
                  <p className="text-slate-400 text-[10px]">Thanh toán tiện lợi</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Highlight Card */}
          <div className="md:col-span-4 bg-gradient-to-br from-slate-900/90 to-emerald-950/30 border border-emerald-500/20 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Hỗ trợ khách hàng</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full">
                24/7 Trực tuyến
              </span>
            </div>
            <p className="text-white font-bold text-sm mb-1">Cần tư vấn đặt hàng hoặc báo giá dự án?</p>
            <p className="text-slate-400 text-xs mb-4">
              Gọi ngay hotline hoặc tra cứu tình trạng đơn hàng bằng số điện thoại.
            </p>
            <div className="flex items-center gap-2">
              <a
                href={`tel:${storeConfig.hotline || '19008888'}`}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white text-center font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Gọi {storeConfig.hotline || '1900 8888'}</span>
              </a>
              <button
                onClick={() => setIsTrackingOpen(true)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3 py-2 rounded-xl transition border border-slate-700"
              >
                Tra cứu đơn
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FILTER & PRODUCT LISTING */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">
        {/* Controls bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Danh Sách Sản Phẩm</span>
              <span className="text-xs bg-slate-800 text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                {filteredProducts.length} sản phẩm
              </span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* In stock toggle */}
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 transition">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700 focus:ring-emerald-500"
              />
              <span>Chỉ hiện sản phẩm còn hàng</span>
            </label>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 text-xs font-semibold text-white px-3 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="POPULAR">Bán chạy & Nổi bật</option>
              <option value="PRICE_ASC">Giá tăng dần</option>
              <option value="PRICE_DESC">Giá giảm dần</option>
              <option value="NEWEST">Mới cập nhật</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-12 text-center max-w-lg mx-auto">
            <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h4 className="text-base font-bold text-white mb-1">Không tìm thấy sản phẩm phù hợp</h4>
            <p className="text-xs text-slate-400 mb-4">
              Vui lòng thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc còn hàng.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('ALL');
                setInStockOnly(false);
              }}
              className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white text-xs font-bold px-4 py-2 rounded-xl transition border border-emerald-500/20"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredProducts.map((p) => {
              const config = db.webshopProductConfigs.find((c) => c.productId === p.id);
              const uom = db.uoms.find((u) => u.id === p.uomId)?.name || 'Cái';
              const category = db.categories.find((c) => c.id === p.categoryId)?.name || 'Chung';

              const retailPrice = config?.retailPrice && config.retailPrice > 0
                ? config.retailPrice
                : (p.averageCost && p.averageCost > 0 ? Math.round(p.averageCost * 1.3) : 100000);
              const hasPromo = !!(config?.promoPrice && config.promoPrice > 0 && config.promoPrice < retailPrice);
              const finalPrice = hasPromo && config?.promoPrice ? config.promoPrice : retailPrice;

              const isOutOfStock = p.currentQty <= 0;
              const isLowStock = p.currentQty > 0 && p.currentQty <= 5;

              return (
                <div
                  key={p.id}
                  className="bg-gradient-to-b from-[#0e131f] to-[#0a0e17] border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/5 group relative"
                >
                  {/* Top tags & badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                      {category}
                    </span>

                    <div className="flex items-center gap-1">
                      {config?.badge && (
                        <span className="text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-md shadow-sm">
                          {config.badge}
                        </span>
                      )}
                      {hasPromo && (
                        <span className="text-[10px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-md">
                          GIẢM {Math.round(((retailPrice - finalPrice) / retailPrice) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Thumbnail & icon representation */}
                  <div
                    onClick={() => setSelectedProductModal(p)}
                    className="h-36 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col items-center justify-center p-3 relative cursor-pointer group-hover:border-emerald-500/30 transition overflow-hidden"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition duration-300">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-2">{p.sku}</span>

                    {/* Stock indicator ribbon */}
                    <div className="absolute bottom-2 left-2 right-2">
                      {isOutOfStock ? (
                        <div className="bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-bold py-0.5 px-2 rounded-md flex items-center justify-center gap-1">
                          <XCircle className="w-3 h-3" />
                          <span>Tạm hết hàng</span>
                        </div>
                      ) : isLowStock ? (
                        <div className="bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold py-0.5 px-2 rounded-md flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Chỉ còn {p.currentQty} {uom}</span>
                        </div>
                      ) : (
                        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold py-0.5 px-2 rounded-md flex items-center justify-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Còn hàng ({p.currentQty} {uom})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Product Title */}
                  <div className="mt-3 mb-2 flex-1">
                    <h4
                      onClick={() => setSelectedProductModal(p)}
                      className="text-sm font-bold text-white group-hover:text-emerald-400 transition cursor-pointer line-clamp-2 leading-snug"
                      title={p.name}
                    >
                      {p.name}
                    </h4>
                    {config?.shortDescription && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                        {config.shortDescription}
                      </p>
                    )}
                  </div>

                  {/* Pricing block */}
                  <div className="pt-2 border-t border-slate-800/80 mb-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-black text-emerald-400">
                        {(finalPrice || 0).toLocaleString('vi-VN')} đ
                      </span>
                      {hasPromo && (
                        <span className="text-xs text-slate-500 line-through">
                          {(retailPrice || 0).toLocaleString('vi-VN')} đ
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">Đơn vị: {uom} (Đã có VAT)</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedProductModal(p)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs py-2 rounded-xl transition border border-slate-700 flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem</span>
                    </button>

                    <button
                      disabled={isOutOfStock && !storeConfig.allowOrderWhenOutOfStock}
                      onClick={() => handleAddToCart(p, 1)}
                      className={`flex-1 font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md ${
                        isOutOfStock && !storeConfig.allowOrderWhenOutOfStock
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/20 active:scale-95'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 5. FOOTER */}
      <footer className="bg-[#05070a] border-t border-slate-800/80 py-10 px-4 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="font-black text-white text-sm">{storeConfig.storeName || 'V-SMART STORE'}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400 mb-3">
              {storeConfig.storeSlogan || 'Cung cấp linh kiện, thiết bị và giải pháp công nghệ cao.'}
            </p>
            <p className="text-[11px] text-slate-500">
              © {new Date().getFullYear()} Bản quyền thuộc về {storeConfig.storeName || 'Cửa hàng'}.
            </p>
          </div>

          <div>
            <h5 className="font-bold text-white text-xs mb-3 uppercase tracking-wider">Chính Sách & Hỗ Trợ</h5>
            <ul className="space-y-2 text-[11px]">
              <li>• Chính sách bảo hành chính hãng</li>
              <li>• Chính sách đổi trả 7 ngày</li>
              <li>• Phương thức thanh toán COD & VietQR</li>
              <li>• Tra cứu hành trình đơn hàng online</li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-white text-xs mb-3 uppercase tracking-wider">Thông Tin Liên Hệ</h5>
            <div className="space-y-2 text-[11px]">
              <p className="flex items-center gap-1.5 text-slate-300">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hotline: {storeConfig.hotline || '1900 8888'}</span>
              </p>
              <p className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tổng kho: {storeConfig.address || 'Khu Công Nghệ Cao, TP.HCM'}</span>
              </p>
            </div>
          </div>

          <div>
            <h5 className="font-bold text-white text-xs mb-3 uppercase tracking-wider">Dành Cho Thủ Kho & Kế Toán</h5>
            <p className="text-[11px] leading-relaxed text-slate-400 mb-3">
              Khu vực bảo mật dành cho ban quản lý doanh nghiệp, thủ kho và kế toán để duyệt phiếu xuất kho, theo dõi công nợ và kế toán nhật ký chung.
            </p>
            <button
              onClick={onOpenAdmin}
              className="w-full bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 font-bold py-2 rounded-xl transition border border-emerald-500/30 flex items-center justify-center gap-1.5 text-xs shadow-md"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Đăng nhập Hệ thống Quản trị Kho</span>
            </button>
          </div>
        </div>
      </footer>

      {/* 6. CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-[#0d121d] h-full shadow-2xl border-l border-slate-800 flex flex-col">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Giỏ Hàng Mua Sắm ({cartSummary.totalQty})</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="font-semibold text-white text-sm">Giỏ hàng của bạn đang trống</p>
                  <p className="text-xs text-slate-500 mt-1">Hãy chọn các sản phẩm công nghệ yêu thích để thêm vào giỏ.</p>
                </div>
              ) : (
                cartSummary.items.map((item) => {
                  if (!item.product) return null;
                  return (
                    <div
                      key={item.productId}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex gap-3 items-center"
                    >
                      <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shrink-0">
                        <ShoppingBag className="w-6 h-6" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-xs truncate" title={item.product.name}>
                          {item.product.name}
                        </h4>
                        <p className="text-[11px] text-emerald-400 font-semibold">
                          {(item.unitPrice || 0).toLocaleString('vi-VN')} đ
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center border border-slate-700 rounded-lg bg-slate-800">
                            <button
                              onClick={() => handleUpdateCartQty(item.productId, -1)}
                              className="px-2 py-0.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-l"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2.5 text-xs font-bold text-white">{item.qty}</span>
                            <button
                              onClick={() => handleUpdateCartQty(item.productId, 1)}
                              className="px-2 py-0.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-r"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => handleRemoveFromCart(item.productId)}
                            className="text-slate-500 hover:text-rose-400 p-1 transition"
                            title="Xóa khỏi giỏ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-xs text-white">
                          {(item.lineTotal || 0).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer / Checkout CTA */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-800 bg-slate-900/90 space-y-3">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Tạm tính tiền hàng:</span>
                    <span className="text-white font-semibold">{(cartSummary.subtotal || 0).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Thuế VAT ({cartSummary.vatRate}%):</span>
                    <span className="text-white font-semibold">{(cartSummary.vatAmount || 0).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                    <span>Tổng thanh toán:</span>
                    <span className="text-emerald-400 text-base font-black">
                      {((cartSummary.subtotal || 0) + (cartSummary.vatAmount || 0)).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">* Chưa bao gồm phí ship (tính ở bước tiếp theo)</p>
                </div>

                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-sm py-3 rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>Tiến Hành Đặt Hàng</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c101a] border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-900/60">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white flex items-center gap-2 truncate">
                  <Truck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Xác Nhận Đặt Hàng & Thanh Toán</span>
                </h3>
                <p className="text-xs text-slate-400 hidden sm:block">Đơn hàng sẽ được chuyển trực tiếp vào hệ thống điều phối kho</p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Customer Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>1. Thông Tin Người Nhận</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Họ và tên <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Số điện thoại <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="0912 345 678"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      onBlur={(e) => handlePhoneBlur(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Địa chỉ nhận hàng {shippingMethod !== 'STORE_PICKUP' && <span className="text-rose-400">*</span>}
                    </label>
                    <input
                      type="text"
                      placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Email (nhận hóa đơn điện tử)</label>
                    <input
                      type="email"
                      placeholder="khachhang@gmail.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Ghi chú giao hàng</label>
                    <input
                      type="text"
                      placeholder="Giao giờ hành chính, gọi trước khi đến..."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Method */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  <span>2. Phương Thức Vận Chuyển</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label
                    onClick={() => setShippingMethod('STANDARD')}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col justify-between ${
                      shippingMethod === 'STANDARD'
                        ? 'bg-emerald-500/10 border-emerald-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold mb-1">Tiêu Chuẩn</span>
                    <span className="text-[11px] text-slate-400">2 - 3 ngày giao</span>
                    <span className="font-bold text-emerald-400 mt-2">30.000 đ</span>
                  </label>

                  <label
                    onClick={() => setShippingMethod('EXPRESS')}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col justify-between ${
                      shippingMethod === 'EXPRESS'
                        ? 'bg-emerald-500/10 border-emerald-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold mb-1">Hỏa Tốc 2H</span>
                    <span className="text-[11px] text-slate-400">Nội thành trong ngày</span>
                    <span className="font-bold text-emerald-400 mt-2">45.000 đ</span>
                  </label>

                  <label
                    onClick={() => setShippingMethod('STORE_PICKUP')}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col justify-between ${
                      shippingMethod === 'STORE_PICKUP'
                        ? 'bg-emerald-500/10 border-emerald-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold mb-1">Nhận Tại Kho</span>
                    <span className="text-[11px] text-slate-400">Tự đến lấy hàng</span>
                    <span className="font-bold text-emerald-400 mt-2">Miễn phí (0đ)</span>
                  </label>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>3. Hình Thức Thanh Toán</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    onClick={() => setPaymentMethod('COD')}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-start gap-2.5 ${
                      paymentMethod === 'COD'
                        ? 'bg-emerald-500/10 border-emerald-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full border border-emerald-500 flex items-center justify-center mt-0.5 shrink-0">
                      {paymentMethod === 'COD' && <div className="w-2 h-2 rounded-full bg-emerald-400"></div>}
                    </div>
                    <div>
                      <p className="font-bold text-white">Thanh toán khi nhận hàng (COD)</p>
                      <p className="text-[11px] text-slate-400">Kiểm tra hàng rồi thanh toán tiền mặt cho shipper</p>
                    </div>
                  </label>

                  <label
                    onClick={() => setPaymentMethod('BANK_TRANSFER')}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-start gap-2.5 ${
                      paymentMethod === 'BANK_TRANSFER'
                        ? 'bg-emerald-500/10 border-emerald-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full border border-emerald-500 flex items-center justify-center mt-0.5 shrink-0">
                      {paymentMethod === 'BANK_TRANSFER' && <div className="w-2 h-2 rounded-full bg-emerald-400"></div>}
                    </div>
                    <div>
                      <p className="font-bold text-white">Chuyển khoản VietQR / Ngân hàng</p>
                      <p className="text-[11px] text-slate-400">Quét mã QR 24/7, xác nhận tự động</p>
                    </div>
                  </label>
                </div>

                {/* Bank Transfer guide */}
                {paymentMethod === 'BANK_TRANSFER' && (
                  <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 text-xs space-y-2">
                    <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <QrCode className="w-4 h-4" />
                      <span>Thông tin tài khoản nhận tiền:</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-slate-500">Ngân hàng:</span>
                        <p className="font-bold text-white">{storeConfig.bankName || 'Vietcombank'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Số tài khoản:</span>
                        <p className="font-bold text-emerald-400 font-mono text-sm">{storeConfig.bankAccount || '0123456789'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Chủ tài khoản:</span>
                        <p className="font-bold text-white uppercase">{storeConfig.bankOwner || 'CONG TY TNHH SMART WMS'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Cú pháp chuyển khoản:</span>
                        <p className="font-bold text-amber-400 font-mono">WS [Số điện thoại]</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Final Summary */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                <h4 className="font-bold text-white text-xs uppercase mb-2">Tóm Tắt Đơn Hàng</h4>
                <div className="flex justify-between text-slate-400">
                  <span>Tiền hàng ({cartSummary.totalQty} sản phẩm):</span>
                  <span className="text-white font-medium">{(cartSummary.subtotal || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Thuế VAT ({cartSummary.vatRate}%):</span>
                  <span className="text-white font-medium">{(cartSummary.vatAmount || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Phí vận chuyển:</span>
                  <span className="text-white font-medium">{(cartSummary.shippingFee || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                  <span>Tổng tiền thanh toán:</span>
                  <span className="text-emerald-400 text-lg font-black">
                    {(cartSummary.totalAmount || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition text-center"
              >
                Quay lại giỏ hàng
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handlePlaceOrder}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs px-6 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Đang xử lý đơn...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác Nhận Đặt Hàng ({(cartSummary.totalAmount || 0).toLocaleString('vi-VN')} đ)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. ORDER PLACED SUCCESS MODAL */}
      {placedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b101c] border border-emerald-500/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-4 sm:p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Đặt hàng thành công!
            </span>

            <h3 className="text-xl font-black text-white mt-3 mb-1">
              Cảm Ơn Quý Khách Đã Mua Sắm
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Hệ thống đã ghi nhận đơn hàng và truyền tín hiệu chuẩn bị xuất kho tới bộ phận giao vận.
            </p>

            {/* Order Code Highlight */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400 font-medium">Mã đơn hàng:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">{placedOrder.orderCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Người nhận:</span>
                <span className="font-bold text-white">{placedOrder.customerName} ({placedOrder.customerPhone})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Địa chỉ:</span>
                <span className="text-slate-300 truncate max-w-[150px] sm:max-w-[240px]">{placedOrder.customerAddress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Thanh toán:</span>
                <span className="font-bold text-amber-400">
                  {placedOrder.paymentMethod === 'COD' ? 'Thanh toán khi nhận (COD)' : 'Chuyển khoản VietQR'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800 font-bold text-sm">
                <span className="text-white">Tổng tiền:</span>
                <span className="text-emerald-400 text-base font-black">
                  {(placedOrder.totalAmount || 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setPlacedOrder(null);
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-2.5 rounded-xl transition border border-slate-700"
              >
                Tiếp tục mua sắm
              </button>

              <button
                onClick={() => {
                  setTrackingQuery(placedOrder.orderCode);
                  setPlacedOrder(null);
                  setIsTrackingOpen(true);
                  handleSearchTracking();
                }}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs py-2.5 rounded-xl transition shadow-md shadow-emerald-500/20"
              >
                Theo dõi đơn hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. ORDER TRACKING MODAL */}
      {isTrackingOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c111c] border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <Package className="w-5 h-5 text-emerald-400 shrink-0" />
                <h3 className="font-bold text-white text-base truncate">Tra Cứu Tình Trạng Đơn Hàng</h3>
              </div>
              <button
                onClick={() => {
                  setIsTrackingOpen(false);
                  setTrackingResults(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Nhập số điện thoại đặt hàng hoặc mã đơn (WS-...)"
                value={trackingQuery}
                onChange={(e) => setTrackingQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchTracking()}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleSearchTracking}
                className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
              >
                Tra cứu
              </button>
            </div>

            {/* Results */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {trackingResults === null ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Nhập số điện thoại đã dùng khi đặt hàng để xem danh sách và trạng thái vận chuyển.
                </div>
              ) : trackingResults.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs bg-slate-900/50 rounded-2xl border border-slate-800">
                  Không tìm thấy đơn hàng nào tương ứng với "{trackingQuery}".
                </div>
              ) : (
                trackingResults.map((order) => {
                  const isPending = order.orderStatus === 'PENDING';
                  const isShipped = order.orderStatus === 'SHIPPED';
                  const isCompleted = order.orderStatus === 'COMPLETED';
                  const isCancelled = order.orderStatus === 'CANCELLED';

                  return (
                    <div
                      key={order.id}
                      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="font-mono font-black text-emerald-400">{order.orderCode}</span>
                        <div>
                          {isPending && (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold px-2 py-0.5 rounded-full text-[10px]">
                              ⏳ Chờ shop xác nhận
                            </span>
                          )}
                          {isShipped && (
                            <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold px-2 py-0.5 rounded-full text-[10px]">
                              🚚 Đang giao hàng
                            </span>
                          )}
                          {isCompleted && (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded-full text-[10px]">
                              ✅ Giao thành công
                            </span>
                          )}
                          {isCancelled && (
                            <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold px-2 py-0.5 rounded-full text-[10px]">
                              ❌ Đã hủy
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 space-y-1">
                        <p>Ngày đặt: <span className="text-white font-medium">{order.date}</span></p>
                        <p>Người nhận: <span className="text-white font-medium">{order.customerName} - {order.customerPhone}</span></p>
                        <p>Địa chỉ: <span className="text-white font-medium">{order.customerAddress}</span></p>
                        <p>
                          Sản phẩm: {order.items.map((it) => `${it.productName} (x${it.qty})`).join(', ')}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex justify-between items-center font-bold">
                        <span className="text-slate-400">Tổng thanh toán:</span>
                        <span className="text-emerald-400 font-black">{(order.totalAmount || 0).toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 10. PRODUCT DETAIL MODAL */}
      {selectedProductModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d121d] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-4 sm:p-6">
            <div className="flex justify-between items-start gap-2 mb-4">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                  {db.categories.find((c) => c.id === selectedProductModal.categoryId)?.name || 'Chung'}
                </span>
                <h3 className="text-lg font-black text-white mt-1.5 break-words">{selectedProductModal.name}</h3>
                <p className="text-xs font-mono text-emerald-400">SKU: {selectedProductModal.sku}</p>
              </div>
              <button
                onClick={() => setSelectedProductModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const modalConfig = db.webshopProductConfigs.find((c) => c.productId === selectedProductModal.id);
              const modalRetail = (modalConfig?.retailPrice && modalConfig.retailPrice > 0)
                ? modalConfig.retailPrice
                : (selectedProductModal.averageCost && selectedProductModal.averageCost > 0 ? Math.round(selectedProductModal.averageCost * 1.3) : 100000);
              const modalHasPromo = !!(modalConfig?.promoPrice && modalConfig.promoPrice > 0 && modalConfig.promoPrice < modalRetail);
              const modalPrice = modalHasPromo && modalConfig?.promoPrice ? modalConfig.promoPrice : modalRetail;
              const modalUom = db.uoms.find((u) => u.id === selectedProductModal.uomId)?.name || 'Cái';

              return (
                <div className="space-y-3 text-xs mb-6">
                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400">Giá bán niêm yết:</span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-xl font-black text-emerald-400">
                          {(modalPrice || 0).toLocaleString('vi-VN')} đ
                        </span>
                        {modalHasPromo && (
                          <span className="text-xs text-slate-500 line-through">
                            {(modalRetail || 0).toLocaleString('vi-VN')} đ
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">Đơn vị tính: {modalUom}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400">Tồn kho khả dụng:</span>
                      <div className={`font-bold text-sm mt-0.5 ${selectedProductModal.currentQty > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {selectedProductModal.currentQty > 0 ? `${selectedProductModal.currentQty} ${modalUom}` : 'Hết hàng'}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/80">
                    <h5 className="font-bold text-slate-300 mb-1">Cam kết gian hàng:</h5>
                    <ul className="space-y-1 text-slate-400 text-[11px]">
                      <li>• Sản phẩm mới 100%, bảo hành chính hãng tiêu chuẩn.</li>
                      <li>• Kiểm tra hàng trước khi thanh toán (Áp dụng cho đơn giao COD).</li>
                      <li>• Hỗ trợ kỹ thuật và bảo hành trực tiếp từ hệ thống kho.</li>
                    </ul>
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedProductModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
              >
                Đóng
              </button>
              <button
                disabled={selectedProductModal.currentQty <= 0 && !storeConfig.allowOrderWhenOutOfStock}
                onClick={() => {
                  handleAddToCart(selectedProductModal, 1);
                  setSelectedProductModal(null);
                }}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                Thêm Vào Giỏ Hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Customer Support Widget (Hotline, Zalo, Live Chat) */}
      <CustomerSupportWidget
        db={db}
        onAddToCart={handleAddToCart}
        onSelectProduct={(product) => setSelectedProductModal(product)}
      />
    </div>
  );
}
