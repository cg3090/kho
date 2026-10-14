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
  WebshopCustomerAccount,
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
  Menu,
  UserRound,
  ListFilter,
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
  Heart,
  LogIn,
  LogOut,
  UserPlus,
  History,
  Save,
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
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

  // Customer account: session, auth modal, account modal
  const [shopAccount, setShopAccount] = useState<WebshopCustomerAccount | null>(() =>
    db.getCurrentWebshopCustomer()
  );
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountTab, setAccountTab] = useState<'profile' | 'orders' | 'wishlist'>('profile');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authUsername, setAuthUsername] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authAddress, setAuthAddress] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirm, setAuthConfirm] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

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

  // Logged-in customer derived data
  const wishlistProducts = useMemo(() => {
    if (!shopAccount || shopAccount.wishlist.length === 0) return [];
    return shopAccount.wishlist
      .map((pid) => db.products.find((p) => p.id === pid))
      .filter(Boolean) as Product[];
  }, [shopAccount, db.products]);

  const accountOrders = useMemo(() => {
    if (!shopAccount) return [];
    return db.webshopOrders.filter(
      (o) =>
        (shopAccount.id && o.accountId === shopAccount.id) ||
        (shopAccount.phone && o.customerPhone === shopAccount.phone)
    );
  }, [db.webshopOrders, shopAccount]);

  const isWishlisted = (productId: string) =>
    !!shopAccount && shopAccount.wishlist.includes(productId);

  const refreshAccount = () => setShopAccount(db.getCurrentWebshopCustomer());

  const openCheckout = () => {
    if (shopAccount) {
      if (!customerName.trim()) setCustomerName(shopAccount.fullName);
      if (!customerPhone.trim()) setCustomerPhone(shopAccount.phone);
      if (!customerEmail.trim() && shopAccount.email) setCustomerEmail(shopAccount.email);
      if (!customerAddress.trim() && shopAccount.address) setCustomerAddress(shopAccount.address);
    }
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (authMode === 'login') {
      const res = db.loginWebshopCustomer(authUsername, authPassword);
      if (!res.success || !res.account) {
        setAuthError(res.message || 'Đăng nhập thất bại.');
        return;
      }
      setShopAccount(res.account);
      setIsAuthModalOpen(false);
      setAuthPassword('');
      alert(res.message);
      return;
    }
    if (authPassword !== authConfirm) {
      setAuthError('Mật khẩu xác nhận không khớp. Vui lòng nhập lại.');
      return;
    }
    const res = db.registerWebshopCustomer({
      username: authUsername,
      email: authEmail,
      phone: authPhone,
      fullName: authFullName,
      address: authAddress,
      password: authPassword,
    });
    if (!res.success || !res.account) {
      setAuthError(res.message || 'Đăng ký thất bại.');
      return;
    }
    setShopAccount(res.account);
    setIsAuthModalOpen(false);
    setAuthPassword('');
    setAuthConfirm('');
    alert(res.message);
  };

  const openAuthModal = (mode: 'login' | 'register', notice?: string) => {
    setAuthMode(mode);
    setAuthError(notice || null);
    setIsAuthModalOpen(true);
  };

  const handleLogout = () => {
    db.logoutWebshopCustomer();
    setShopAccount(null);
    setIsAccountModalOpen(false);
    setIsCartOpen(false);
    setIsCheckoutOpen(false);
    alert('Đã đăng xuất tài khoản khách hàng.');
  };

  const handleToggleWishlist = (productId: string) => {
    if (!shopAccount) {
      openAuthModal('login', 'Vui lòng đăng nhập để lưu sản phẩm yêu thích.');
      return;
    }
    const res = db.toggleWishlistProduct(productId);
    refreshAccount();
    if (!res.success) {
      openAuthModal('login', res.message);
      return;
    }
    alert(res.message);
  };

  const openAccountModal = (tab: 'profile' | 'orders' | 'wishlist') => {
    if (!shopAccount) {
      openAuthModal('login');
      return;
    }
    setAccountTab(tab);
    setProfileName(shopAccount.fullName);
    setProfileEmail(shopAccount.email);
    setProfilePhone(shopAccount.phone);
    setProfileAddress(shopAccount.address || '');
    setProfileNewPassword('');
    setProfileMessage(null);
    setIsAccountModalOpen(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopAccount) return;
    setProfileMessage(null);
    const res = db.updateWebshopCustomerProfile(shopAccount.id, {
      fullName: profileName,
      email: profileEmail,
      phone: profilePhone,
      address: profileAddress,
      password: profileNewPassword || undefined,
    });
    if (!res.success || !res.account) {
      setProfileMessage(res.message || 'Cập nhật thất bại.');
      return;
    }
    setShopAccount(res.account);
    setProfileNewPassword('');
    setProfileMessage(res.message);
    alert(res.message);
  };

  const openOrderInTracking = (orderCode: string) => {
    setTrackingQuery(orderCode);
    const q = orderCode.toLowerCase();
    setTrackingResults(db.webshopOrders.filter((o) => o.orderCode?.toLowerCase().includes(q)));
    setIsTrackingOpen(true);
  };

  const openTrackingWithAccount = () => {
    if (shopAccount && shopAccount.phone && !trackingQuery.trim()) {
      setTrackingQuery(shopAccount.phone);
    }
    setIsTrackingOpen(true);
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
        accountId: shopAccount?.id,
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
    <div className="min-h-screen min-h-dvh w-full overflow-x-hidden bg-[#07090e] text-slate-100 font-sans flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* 1. TOP NOTICE & STAFF PORTAL BAR */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/70 border-b border-emerald-500/20 px-3 sm:px-5 xl:px-8 2xl:px-10 py-1.5 text-xs">
        <div className="w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{storeConfig.storeSlogan || 'Online Store'}</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 text-slate-400">
            <a
              href={`tel:${storeConfig.hotline || '19008888'}`}
              className="hover:text-emerald-400 transition flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-500" />
              <span>Hotline: <strong className="text-white">{storeConfig.hotline || '1900 8888'}</strong></span>
            </a>

            <button
              onClick={openTrackingWithAccount}
              className="hidden sm:flex hover:text-emerald-400 transition items-center gap-1 text-slate-300 font-medium"
            >
              <Package className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tra cứu đơn hàng</span>
            </button>
{/*
            <button
              onClick={onOpenAdmin}
              className="bg-slate-800/90 hover:bg-emerald-600 hover:text-white text-emerald-400 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-emerald-500/30 transition flex items-center gap-1.5 shadow-sm"
              title="Truy cập Hệ thống Quản trị Kho & Đơn Hàng"
            >
              <Lock className="w-3 h-3" />
              <span>Cổng Quản Trị Kho</span>
            </button>
*/}
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER NAVIGATION */}
      <header className="sticky top-0 z-40 bg-[#0d121d]/90 backdrop-blur-md border-b border-slate-800/80 shadow-xl">
        <div className="w-full px-3 sm:px-5 xl:px-8 2xl:px-10 py-3 flex items-center justify-between gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-200 hover:border-emerald-500 hover:text-emerald-400"
            aria-label="Mở danh mục sản phẩm"
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* Logo & Store Name */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-black font-black text-xl shadow-lg shadow-emerald-500/20">
              <ShoppingBag className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base xl:text-lg font-black tracking-tight text-white flex items-center gap-1.5 truncate">
                {storeConfig.storeName || 'V-SMART STORE'}
              </h1>
              <p className="hidden sm:block text-[10px] xl:text-[11px] text-emerald-400/90 font-medium">Bán lẻ trực tuyến & Giao hàng toàn quốc</p>
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
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {/* Customer Account Auth Buttons */}
            {!shopAccount ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-emerald-400 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl transition"
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Đăng nhập</span>
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('register')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 px-3 py-2 rounded-xl transition shadow-md shadow-emerald-500/20"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Đăng ký</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAccountModal('profile')}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200 hover:text-emerald-400 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl transition"
                  title="Tài khoản của tôi"
                >
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold flex items-center justify-center text-[11px]">
                    {shopAccount.fullName.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden md:inline max-w-[110px] truncate">{shopAccount.fullName}</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 bg-slate-900/80 border border-slate-700 hover:border-rose-500/40 transition"
                  title="Đăng xuất"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-black font-bold px-4 py-2 rounded-xl transition shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <ShoppingCart className="w-4 h-4 text-black" />
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

      </header>

      {/* 3. HERO PROMOTIONAL BANNER */}
      <section className="bg-gradient-to-b from-[#0e1626] to-[#07090e] border-b border-slate-800/60 py-8 px-4">
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-center">
          <div className="md:col-span-8 space-y-3">

            <h2 className="text-xl sm:text-2xl xl:text-3xl 2xl:text-4xl font-black text-white tracking-tight leading-tight">
              Mua Sắm Trực Tuyến Tiện Lợi, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                Giao Hàng Nhanh & Hàng Hóa Chính Hãng
              </span>
            </h2>
           
            {/* Value props */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5">
                <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-[11px] leading-tight">
                  <p className="font-bold text-white">Giao Hàng Nhanh</p>
                  
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-[11px] leading-tight">
                  <p className="font-bold text-white">Chính Hãng</p>
                  
                </div>
              </div>
              {/*
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
              */}
            </div>
          </div>

          {/* Right Highlight Card */}
          <div className="md:col-span-4 bg-gradient-to-br from-slate-900/90 to-emerald-950/30 border border-emerald-500/20 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Hỗ trợ khách hàng</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full">
                Hotline: {storeConfig.hotline || '1900 8888'}
              </span>
            </div>
            <p className="text-white font-bold text-sm mb-1">Cần tư vấn đặt hàng hoặc báo giá?</p>

            <div className="flex items-center gap-2">
              <a
                href={`tel:${storeConfig.hotline || '19008888'}`}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black text-center font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Gọi {storeConfig.hotline || '1900 8888'}</span>
              </a>
             {/* 
              <button
                onClick={() => setIsTrackingOpen(true)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3 py-2 rounded-xl transition border border-slate-700"
              >
                Tra cứu đơn
              </button>
              */}
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRODUCT CATEGORIES SIDEBAR & PRODUCT LISTING */}
      <div className="flex w-full flex-1 items-start gap-3 sm:gap-5 xl:gap-6 px-3 sm:px-5 xl:px-8 2xl:px-10 py-5 sm:py-7 xl:py-8">
        {/* Desktop sidebar: categories come from db.categories */}
        <aside className="hidden lg:flex w-56 xl:w-64 2xl:w-72 shrink-0 flex-col self-stretch rounded-2xl border border-slate-800 bg-[#0d121d] p-3 xl:p-4 2xl:p-5">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-800 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <ListFilter className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Danh mục sản phẩm</h3>
              
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Tìm danh mục..."
              className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-emerald-500"
            />
          </div>

          <nav className="space-y-1" aria-label="Danh mục sản phẩm">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${selectedCategory === 'ALL' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/10' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <Package className="h-4 w-4 shrink-0" />
              <span className="flex-1">Tất cả danh mục</span>
              {/*<span className={`rounded-full px-2 py-0.5 text-[10px] ${selectedCategory === 'ALL' ? 'bg-black/10' : 'bg-slate-800 text-slate-400'}`}>{db.products.filter((p) => db.webshopProductConfigs.find((c) => c.productId === p.id)?.isPublished !== false).length}</span> */}
            </button>
            {db.categories
              .map((cat) => ({ cat, count: db.products.filter((p) => p.categoryId === cat.id && db.webshopProductConfigs.find((c) => c.productId === p.id)?.isPublished !== false).length }))
              .filter(({ cat, count }) => count > 0 && cat.name.toLowerCase().includes(categorySearch.trim().toLowerCase()))
              .map(({ cat, count }) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition ${selectedCategory === cat.id ? 'bg-emerald-500/15 font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                >
                  <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${selectedCategory === cat.id ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span className="flex-1 truncate">{cat.name}</span>
                  <span className="text-[10px] text-slate-500">{count}</span>
                </button>
              ))}
          </nav>

          <div className="my-4 border-t border-slate-800" />
          {shopAccount ? (
            <>
              <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Tài khoản của tôi</div>
              <button
                type="button"
                onClick={() => openAccountModal('profile')}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <UserRound className="h-4 w-4 text-emerald-400" />
                <span className="flex-1 truncate">{shopAccount.fullName}</span>
              </button>
              <button
                type="button"
                onClick={() => openAccountModal('orders')}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <History className="h-4 w-4 text-emerald-400" />
                <span className="flex-1">Đơn hàng đã đặt</span>
                {accountOrders.length > 0 && (
                  <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-black">{accountOrders.length}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => openAccountModal('wishlist')}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <Heart className="h-4 w-4 text-rose-400" />
                <span className="flex-1">Sản phẩm yêu thích</span>
                {wishlistProducts.length > 0 && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">{wishlistProducts.length}</span>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Tài khoản khách hàng</div>
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <LogIn className="h-4 w-4 text-emerald-400" />
                <span className="flex-1">Đăng nhập</span>
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('register')}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <UserPlus className="h-4 w-4 text-emerald-400" />
                <span className="flex-1">Đăng ký tài khoản</span>
              </button>
            </>
          )}
          <div className="my-4 border-t border-slate-800" />
          <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Hỗ trợ khách hàng</div>
          <button
            type="button"
            onClick={openTrackingWithAccount}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <Package className="h-4 w-4 text-emerald-400" /> Tra cứu đơn hàng
          </button>
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <ShoppingCart className="h-4 w-4 text-emerald-400" />
            <span className="flex-1">Giỏ hàng</span>
            {cartSummary.totalQty > 0 && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-black">{cartSummary.totalQty}</span>}
          </button>
          {/*<button
            type="button"
            onClick={onOpenAdmin}
            className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <UserRound className="h-4 w-4 text-emerald-400" /> Đăng nhập quản trị
          </button>*/}
        </aside>

        {/* Mobile category drawer */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <button type="button" aria-label="Đóng danh mục" onClick={() => setIsSidebarOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <aside className="relative flex h-full w-[min(86vw,320px)] flex-col overflow-y-auto border-r border-slate-800 bg-[#0d121d] p-4 shadow-2xl">
              <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2"><ListFilter className="h-5 w-5 text-emerald-400" /><h3 className="font-bold text-white">Danh mục sản phẩm</h3></div>
                <button type="button" onClick={() => setIsSidebarOpen(false)} aria-label="Đóng menu" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} placeholder="Tìm danh mục..." className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-emerald-500" />
              </div>
              <nav className="space-y-1">
                <button type="button" onClick={() => { setSelectedCategory('ALL'); setIsSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold ${selectedCategory === 'ALL' ? 'bg-emerald-500 text-black' : 'text-slate-300 hover:bg-slate-800'}`}><Package className="h-4 w-4" /><span className="flex-1">Tất cả danh mục</span></button>
                {db.categories.map((cat) => ({ cat, count: db.products.filter((p) => p.categoryId === cat.id && db.webshopProductConfigs.find((c) => c.productId === p.id)?.isPublished !== false).length })).filter(({ cat, count }) => count > 0 && cat.name.toLowerCase().includes(categorySearch.trim().toLowerCase())).map(({ cat, count }) => (
                  <button type="button" key={cat.id} onClick={() => { setSelectedCategory(cat.id); setIsSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs ${selectedCategory === cat.id ? 'bg-emerald-500/15 font-semibold text-emerald-300' : 'text-slate-300 hover:bg-slate-800'}`}><ChevronRight className="h-3.5 w-3.5" /><span className="flex-1 truncate">{cat.name}</span><span className="text-[10px] text-slate-500">{count}</span></button>
                ))}
              </nav>
              <div className="my-4 border-t border-slate-800" />
              {shopAccount ? (
                <>
                  <button type="button" onClick={() => { openAccountModal('profile'); setIsSidebarOpen(false); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800"><UserRound className="h-4 w-4 text-emerald-400" />Tài khoản của tôi</button>
                  <button type="button" onClick={() => { openAccountModal('orders'); setIsSidebarOpen(false); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800"><History className="h-4 w-4 text-emerald-400" />Đơn hàng đã đặt ({accountOrders.length})</button>
                  <button type="button" onClick={() => { openAccountModal('wishlist'); setIsSidebarOpen(false); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800"><Heart className="h-4 w-4 text-rose-400" />Sản phẩm yêu thích ({wishlistProducts.length})</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => { openAuthModal('login'); setIsSidebarOpen(false); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800"><LogIn className="h-4 w-4 text-emerald-400" />Đăng nhập</button>
                  <button type="button" onClick={() => { openAuthModal('register'); setIsSidebarOpen(false); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800"><UserPlus className="h-4 w-4 text-emerald-400" />Đăng ký tài khoản</button>
                </>
              )}
              <button type="button" onClick={() => { openTrackingWithAccount(); setIsSidebarOpen(false); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800"><Package className="h-4 w-4 text-emerald-400" />Tra cứu đơn hàng</button>
              <button type="button" onClick={() => { setIsCartOpen(true); setIsSidebarOpen(false); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800"><ShoppingCart className="h-4 w-4 text-emerald-400" />Giỏ hàng ({cartSummary.totalQty})</button>
              <button type="button" onClick={() => { onOpenAdmin(); setIsSidebarOpen(false); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800"><UserRound className="h-4 w-4 text-emerald-400" />Đăng nhập quản trị</button>
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1">
        {/* Controls bar */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6 pb-4 border-b border-slate-800/80">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Danh Sách Sản Phẩm</span>
             {/* <span className="text-xs bg-slate-800 text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                {filteredProducts.length} sản phẩm
              </span> */}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full xl:w-auto">
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
          <div className="w-full bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl sm:rounded-3xl p-6 sm:p-10 xl:p-12 text-center">
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
              className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black text-xs font-bold px-4 py-2 rounded-xl transition border border-emerald-500/20"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1600px]:grid-cols-5 min-[1900px]:grid-cols-6 gap-3 sm:gap-4 xl:gap-5">
            {filteredProducts.map((p) => {
              const config = db.webshopProductConfigs.find((c) => c.productId === p.id);
              const uom = db.uoms.find((u) => u.id === p.uomId)?.name || 'Cái';
              const category = db.categories.find((c) => c.id === p.categoryId)?.name || 'Chung';

              const hasRetailPrice = config?.retailPrice && config.retailPrice > 0;
              const retailPrice = hasRetailPrice
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
                  {/* Wishlist toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleWishlist(p.id)}
                    className={`absolute top-2 right-2 z-10 p-1.5 rounded-full backdrop-blur transition ${
                      isWishlisted(p.id)
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/40'
                        : 'bg-slate-900/80 text-slate-400 hover:text-rose-400 border border-slate-700'
                    }`}
                    title={isWishlisted(p.id) ? 'Xóa khỏi sản phẩm yêu thích' : 'Thêm vào sản phẩm yêu thích'}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isWishlisted(p.id) ? 'fill-current' : ''}`} />
                  </button>

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
                        <span className="text-[10px] font-black bg-amber-500 text-black px-1.5 py-0.5 rounded-md">
                          GIẢM {Math.round(((retailPrice - finalPrice) / retailPrice) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Thumbnail & image representation */}
                  <div
                    onClick={() => setSelectedProductModal(p)}
                    className="h-40 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col items-center justify-center p-3 relative cursor-pointer group-hover:border-emerald-500/30 transition overflow-hidden"
                  >
                    {p.imageUrl ? (
                      <div className="w-full h-28 flex items-center justify-center relative">
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-md rounded"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition duration-300">
                        <ShoppingBag className="w-8 h-8" />
                      </div>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono mt-1">{p.sku}</span>

                    {/* Stock indicator ribbon 
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
                        
                    </div> */}
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
                      {hasRetailPrice ? (
                        <>
                          <span className="text-base font-black text-emerald-400">
                            {(finalPrice || 0).toLocaleString('vi-VN')} đ
                          </span>
                          {hasPromo && (
                            <span className="text-xs text-slate-500 line-through">
                              {(retailPrice || 0).toLocaleString('vi-VN')} đ
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-base font-semibold text-amber-400">Liên Hệ</span>
                      )}
                    </div>
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
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-emerald-500/20 active:scale-95'
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
      </div>

      {/* 5. FOOTER */}
      <footer className="bg-[#05070a] border-t border-slate-800/80 py-10 px-4 mt-12 text-xs text-slate-400">
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 text-black flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="font-black text-white text-sm">{storeConfig.storeName || 'V-SMART STORE'}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400 mb-3">
              {storeConfig.storeSlogan || 'Cung cấp hàng hóa chính hãng.'}
            </p>
            <p className="text-[11px] text-slate-500">
              © {new Date().getFullYear()} Bản quyền thuộc về {storeConfig.storeName || 'V-SMART'}.
            </p>
          </div>
        {/*
          <div>
            <h5 className="font-bold text-white text-xs mb-3 uppercase tracking-wider">Chính Sách & Hỗ Trợ</h5>
            <ul className="space-y-2 text-[11px]">
              <li>• Chính sách bảo hành chính hãng</li>
              <li>• Chính sách đổi trả 7 ngày</li>
              <li>• Phương thức thanh toán COD & VietQR</li>
              <li>• Tra cứu hành trình đơn hàng online</li>
            </ul>
          </div>
         */}
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
            <h5 className="font-bold text-white text-xs mb-3 uppercase tracking-wider">Dành Cho Quản lý</h5>
          {/*}  <p className="text-[11px] leading-relaxed text-slate-400 mb-3">
              Khu vực bảo mật dành cho ban quản lý doanh nghiệp, thủ kho và kế toán để duyệt phiếu xuất kho, theo dõi công nợ và kế toán nhật ký chung.
            </p>
            */}
            <button
              onClick={onOpenAdmin}
              className="w-full bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 font-bold py-2 rounded-xl transition border border-emerald-500/30 flex items-center justify-center gap-1.5 text-xs shadow-md"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Đăng nhập Hệ thống</span>
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
                      <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shrink-0 overflow-hidden">
                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-full h-full object-contain p-1"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <ShoppingBag className="w-6 h-6" />
                        )}
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
                  onClick={openCheckout}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-sm py-3 rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-98"
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
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-400" />
                  <span>Xác Nhận Đặt Hàng & Thanh Toán</span>
                </h3>
                <p className="text-xs text-slate-400">Đơn hàng sẽ được chuyển trực tiếp vào hệ thống điều phối kho</p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {shopAccount && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-2.5 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Đã đăng nhập: <strong>{shopAccount.fullName}</strong> ({shopAccount.username}) - Đơn hàng sẽ được lưu vào tài khoản để theo dõi.
                  </span>
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
                      <p className="text-[11px] text-slate-400">Quét mã QR, xác nhận tự động</p>
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
            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition"
              >
                Quay lại giỏ hàng
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handlePlaceOrder}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs px-6 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/25 flex items-center gap-2 disabled:opacity-50"
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
          <div className="bg-[#0b101c] border border-emerald-500/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
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
                <span className="text-slate-300 truncate max-w-[240px]">{placedOrder.customerAddress}</span>
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

            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
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
                  setPlacedOrder(null);
                  openOrderInTracking(placedOrder.orderCode);
                }}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs py-2.5 rounded-xl transition shadow-md shadow-emerald-500/20"
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
          <div className="bg-[#0c111c] border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Tra Cứu Tình Trạng Đơn Hàng</h3>
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
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs px-4 py-2 rounded-xl transition"
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
          <div className="bg-[#0d121d] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                  {db.categories.find((c) => c.id === selectedProductModal.categoryId)?.name || 'Chung'}
                </span>
                <h3 className="text-lg font-black text-white mt-1.5">{selectedProductModal.name}</h3>
                <p className="text-xs font-mono text-emerald-400">SKU: {selectedProductModal.sku}</p>
              </div>
              <button
                onClick={() => setSelectedProductModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Image Display */}
            <div className="w-full h-52 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-center p-4 mb-4 overflow-hidden relative shadow-inner">
              {selectedProductModal.imageUrl ? (
                <img
                  src={selectedProductModal.imageUrl}
                  alt={selectedProductModal.name}
                  className="max-h-full max-w-full object-contain drop-shadow-xl"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShoppingBag className="w-10 h-10" />
                </div>
              )}
            </div>

            {(() => {
              const modalConfig = db.webshopProductConfigs.find((c) => c.productId === selectedProductModal.id);
              const modalHasRetail = modalConfig?.retailPrice && modalConfig.retailPrice > 0;
              const modalRetail = modalHasRetail
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
                        {modalHasRetail ? (
                          <>
                            <span className="text-xl font-black text-emerald-400">
                              {(modalPrice || 0).toLocaleString('vi-VN')} đ
                            </span>
                            {modalHasPromo && (
                              <span className="text-xs text-slate-500 line-through">
                                {(modalRetail || 0).toLocaleString('vi-VN')} đ
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xl font-semibold text-amber-400">Liên Hệ</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">Đơn vị tính: {modalUom}</span>
                    </div>

                  {/*  <div className="text-right">
                      <span className="text-slate-400">Tồn kho khả dụng:</span>
                      <div className={`font-bold text-sm mt-0.5 ${selectedProductModal.currentQty > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {selectedProductModal.currentQty > 0 ? `${selectedProductModal.currentQty} ${modalUom}` : 'Hết hàng'}
                      </div>
                    </div>*/}
                  </div>

                  <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/80">
                    <h5 className="font-bold text-slate-300 mb-1">Cam kết:</h5>
                    <ul className="space-y-1 text-slate-400 text-[11px]">
                      <li>• Sản phẩm mới 100%.</li>
             
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
              {selectedProductModal && (
                <button
                  type="button"
                  onClick={() => handleToggleWishlist(selectedProductModal.id)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    isWishlisted(selectedProductModal.id)
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                  }`}
                  title="Sản phẩm yêu thích"
                >
                  <Heart className={`w-3.5 h-3.5 ${isWishlisted(selectedProductModal.id) ? 'fill-current' : ''}`} />
                </button>
              )}
              <button
                disabled={selectedProductModal.currentQty <= 0 && !storeConfig.allowOrderWhenOutOfStock}
                onClick={() => {
                  handleAddToCart(selectedProductModal, 1);
                  setSelectedProductModal(null);
                }}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                Thêm Vào Giỏ Hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. CUSTOMER AUTH MODAL (LOGIN / REGISTER) */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c101a] border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <UserRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Tài Khoản Khách Hàng</h3>
                  <p className="text-[11px] text-slate-400">
                    {authMode === 'login' ? 'Đăng nhập để theo dõi đơn hàng & danh sách yêu thích' : 'Tạo tài khoản mua sắm nhanh chóng'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="grid grid-cols-2 p-4 pb-0 gap-2">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthError(null); }}
                className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  authMode === 'login'
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" /> Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setAuthError(null); }}
                className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  authMode === 'register'
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" /> Đăng ký
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="p-5 space-y-3.5">
              {authError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Họ và tên <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {authMode === 'register' ? (
                    <>Tên đăng nhập <span className="text-rose-400">*</span></>
                  ) : (
                    <>Tài khoản (tên đăng nhập / email / SĐT) <span className="text-rose-400">*</span></>
                  )}
                </label>
                <input
                  type="text"
                  placeholder={authMode === 'register' ? 'VD: khachhang01' : 'Tên đăng nhập, email hoặc số điện thoại'}
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Email <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="khachhang@gmail.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
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
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Địa chỉ nhận hàng</label>
                    <input
                      type="text"
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                      value={authAddress}
                      onChange={(e) => setAuthAddress(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mật khẩu <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  placeholder="Tối thiểu 6 ký tự"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Xác nhận mật khẩu <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    value={authConfirm}
                    onChange={(e) => setAuthConfirm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs py-3 rounded-xl transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
              >
                {authMode === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" /> Đăng Nhập
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Tạo Tài Khoản
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-slate-500">
                {authMode === 'login' ? (
                  <>Chưa có tài khoản?{' '}
                    <button
                      type="button"
                      onClick={() => { setAuthMode('register'); setAuthError(null); }}
                      className="text-emerald-400 font-bold hover:underline"
                    >
                      Đăng ký ngay
                    </button>
                  </>
                ) : (
                  <>Đã có tài khoản?{' '}
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setAuthError(null); }}
                      className="text-emerald-400 font-bold hover:underline"
                    >
                      Đăng nhập
                    </button>
                  </>
                )}
              </p>
            </form>
          </div>
        </div>
      )}

      {/* 12. CUSTOMER ACCOUNT MODAL (PROFILE / ORDERS / WISHLIST) */}
      {isAccountModalOpen && shopAccount && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c101a] border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-black font-black text-lg flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                  {shopAccount.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-sm truncate">{shopAccount.fullName}</h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    @{shopAccount.username} • {shopAccount.email} • {shopAccount.phone}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-3 p-4 pb-0 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setAccountTab('profile')}
                className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  accountTab === 'profile'
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <UserRound className="w-3.5 h-3.5" /> Thông tin
              </button>
              <button
                type="button"
                onClick={() => setAccountTab('orders')}
                className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  accountTab === 'orders'
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <History className="w-3.5 h-3.5" /> Đơn hàng ({accountOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setAccountTab('wishlist')}
                className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  accountTab === 'wishlist'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Heart className="w-3.5 h-3.5" /> Yêu thích ({wishlistProducts.length})
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {accountTab === 'profile' && (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {profileMessage && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{profileMessage}</span>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Họ và tên</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Số điện thoại</label>
                      <input
                        type="tel"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Địa chỉ nhận hàng</label>
                    <input
                      type="text"
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-emerald-400" /> Đổi mật khẩu (bỏ trống để giữ nguyên)
                    </p>
                    <input
                      type="password"
                      placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                      value={profileNewPassword}
                      onChange={(e) => setProfileNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-[10px] text-slate-500">
                      Thành viên từ {new Date(shopAccount.createdAt).toLocaleDateString('vi-VN')}
                      {shopAccount.lastLogin ? ` • Đăng nhập gần nhất: ${new Date(shopAccount.lastLogin).toLocaleString('vi-VN')}` : ''}
                    </p>
                    <button
                      type="submit"
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs px-5 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/25 flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" /> Lưu thay đổi
                    </button>
                  </div>
                </form>
              )}

              {accountTab === 'orders' && (
                <div className="space-y-3">
                  {accountOrders.length === 0 ? (
                    <div className="py-14 text-center">
                      <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="font-bold text-white text-sm">Chưa có đơn hàng nào</p>
                      <p className="text-xs text-slate-500 mt-1">Đơn hàng bạn đặt sẽ hiển thị tại đây để tra cứu trạng thái.</p>
                    </div>
                  ) : (
                    accountOrders.map((order) => {
                      const statusStyle =
                        order.orderStatus === 'PENDING'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : order.orderStatus === 'SHIPPED'
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          : order.orderStatus === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                      const statusLabel =
                        order.orderStatus === 'PENDING'
                          ? 'Chờ shop xác nhận'
                          : order.orderStatus === 'SHIPPED'
                          ? 'Đang giao hàng'
                          : order.orderStatus === 'COMPLETED'
                          ? 'Giao thành công'
                          : 'Đã hủy';
                      return (
                        <div key={order.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-mono font-black text-emerald-400 text-sm">{order.orderCode}</span>
                            <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${statusStyle}`}>
                              {statusLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Ngày đặt: <span className="text-white font-medium">{order.date}</span> • Thanh toán:{' '}
                            <span className="text-white font-medium">
                              {order.paymentMethod === 'COD' ? 'COD khi nhận hàng' : order.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản VietQR' : 'Tiền mặt'}
                            </span>
                            {order.shippingMethod === 'EXPRESS' ? ' • Hỏa tốc' : order.shippingMethod === 'STORE_PICKUP' ? ' • Nhận tại kho' : ' • Giao tiêu chuẩn'}
                          </p>
                          <div className="text-[11px] text-slate-300 space-y-0.5 bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/60">
                            {order.items.map((it) => (
                              <p key={it.id}>
                                <span className="font-bold text-white">{it.qty}x</span> {it.productName}{' '}
                                <span className="text-slate-500">({(it.unitPrice || 0).toLocaleString('vi-VN')} đ)</span>
                              </p>
                            ))}
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="text-xs font-bold text-white">
                              Tổng: <span className="text-emerald-400 font-black">{(order.totalAmount || 0).toLocaleString('vi-VN')} đ</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => openOrderInTracking(order.orderCode)}
                              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                            >
                              <Package className="w-3 h-3" /> Tra cứu đơn
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {accountTab === 'wishlist' && (
                <div>
                  {wishlistProducts.length === 0 ? (
                    <div className="py-14 text-center">
                      <Heart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="font-bold text-white text-sm">Chưa có sản phẩm yêu thích</p>
                      <p className="text-xs text-slate-500 mt-1">Nhấn biểu tượng trái tim trên sản phẩm để lưu lại mua sau.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {wishlistProducts.map((prod) => {
                        const config = db.webshopProductConfigs.find((c) => c.productId === prod.id);
                        const retailPrice = config?.retailPrice && config.retailPrice > 0
                          ? config.retailPrice
                          : (prod.averageCost && prod.averageCost > 0 ? Math.round(prod.averageCost * 1.3) : 100000);
                        const hasPromo = !!(config?.promoPrice && config.promoPrice > 0 && config.promoPrice < retailPrice);
                        const finalPrice = hasPromo && config?.promoPrice ? config.promoPrice : retailPrice;
                        const isOutOfStock = prod.currentQty <= 0;
                        return (
                          <div key={prod.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex gap-3">
                            <div
                              onClick={() => setSelectedProductModal(prod)}
                              className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shrink-0 overflow-hidden cursor-pointer"
                            >
                              {prod.imageUrl ? (
                                <img
                                  src={prod.imageUrl}
                                  alt={prod.name}
                                  className="w-full h-full object-contain p-1"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <ShoppingBag className="w-6 h-6" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                onClick={() => setSelectedProductModal(prod)}
                                className="text-xs font-bold text-white line-clamp-2 cursor-pointer hover:text-emerald-400 transition"
                                title={prod.name}
                              >
                                {prod.name}
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {prod.sku} • Còn {prod.currentQty}
                              </p>
                              <div className="flex items-center justify-between gap-2 mt-1.5">
                                <div>
                                  <span className="text-sm font-black text-emerald-400">
                                    {finalPrice.toLocaleString('vi-VN')} đ
                                  </span>
                                  {hasPromo && (
                                    <span className="text-[10px] text-slate-500 line-through ml-1.5">
                                      {retailPrice.toLocaleString('vi-VN')} đ
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={isOutOfStock && !storeConfig.allowOrderWhenOutOfStock}
                                    onClick={() => handleAddToCart(prod, 1)}
                                    className="text-[10px] font-bold bg-emerald-500 hover:bg-emerald-400 text-black px-2.5 py-1.5 rounded-lg transition disabled:opacity-40 flex items-center gap-1"
                                  >
                                    <ShoppingCart className="w-3 h-3" /> Thêm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleWishlist(prod.id)}
                                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                                    title="Xóa khỏi yêu thích"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => { openTrackingWithAccount(); setIsAccountModalOpen(false); }}
                className="text-[11px] font-bold text-slate-300 hover:text-emerald-400 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl transition flex items-center gap-1.5 border border-slate-700"
              >
                <Package className="w-3.5 h-3.5 text-emerald-400" /> Tra cứu đơn hàng
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="text-[11px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-2 rounded-xl transition flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" /> Đăng xuất
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
