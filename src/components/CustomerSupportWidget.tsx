/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { MockDatabase } from '../db/mockDb';
import { Product } from '../types';
import {
  MessageCircle,
  Phone,
  PhoneCall,
  Send,
  X,
  ChevronDown,
  Headphones,
  Sparkles,
  Clock,
  ShieldCheck,
  Check,
  Copy,
  ExternalLink,
  Bot,
  User,
  ShoppingBag,
  Eye,
  Truck,
  CreditCard,
  Search,
  MessageSquare,
  AlertCircle
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
  matchedProducts?: Product[];
  matchedOrder?: any;
  quickAction?: {
    type: 'phone_callback' | 'view_order' | 'product_list';
    data?: any;
  };
}

interface CustomerSupportWidgetProps {
  db: MockDatabase;
  onAddToCart?: (product: Product, qty: number) => void;
  onSelectProduct?: (product: Product) => void;
}

export function CustomerSupportWidget({ db, onAddToCart, onSelectProduct }: CustomerSupportWidgetProps) {
  const storeConfig = db.webshopStoreConfig;

  // Don't render if explicitly disabled
  if (storeConfig.enableSupportWidget === false) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'hotline' | 'zalo'>('chat');
  const [showTeaser, setShowTeaser] = useState(true);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedZalo, setCopiedZalo] = useState(false);

  // Callback form state
  const [callbackName, setCallbackName] = useState('');
  const [callbackPhone, setCallbackPhone] = useState('');
  const [callbackNote, setCallbackNote] = useState('');
  const [callbackSubmitted, setCallbackSubmitted] = useState(false);

  // Chat state
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initialWelcome = storeConfig.chatWelcomeMessage ||
    'Xin chào Quý khách! Em là trợ lý trực tuyến của kho Smart WMS. Em có thể hỗ trợ Quý khách kiểm tra tồn kho thực tế, tư vấn giá ưu đãi hoặc tra cứu tiến độ đơn hàng ạ.';

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('wms_customer_support_chat');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return [
      {
        id: 'msg-welcome',
        sender: 'bot',
        text: initialWelcome,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  // Save chat to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('wms_customer_support_chat', JSON.stringify(messages));
    } catch {
      // Ignore
    }
  }, [messages]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping, activeTab]);

  // Teaser auto-hide after 8 seconds if not interacted
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTeaser(false);
    }, 12000);
    return () => clearTimeout(timer);
  }, []);

  const playSoftNotification = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // Audio context might be restricted
    }
  };

  const cleanHotline = (storeConfig.hotline || '1900 6868').replace(/[^0-9]/g, '');
  const cleanZalo = (storeConfig.zaloNumber || storeConfig.hotline || '0901888999').replace(/[^0-9]/g, '');

  const handleCopyHotline = () => {
    navigator.clipboard.writeText(storeConfig.hotline || '1900 6868');
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyZalo = () => {
    navigator.clipboard.writeText(storeConfig.zaloNumber || '0901888999');
    setCopiedZalo(true);
    setTimeout(() => setCopiedZalo(false), 2000);
  };

  const handleSendCallback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!callbackPhone.trim()) return;

    setCallbackSubmitted(true);
    // Add confirmation to chat thread
    const newMsg: ChatMessage = {
      id: `cb-${Date.now()}`,
      sender: 'bot',
      text: `Dạ vâng! Hệ thống đã ghi nhận yêu cầu gọi lại cho anh/chị ${callbackName ? `"${callbackName}"` : ''} qua SĐT ${callbackPhone}. Nhân viên CSKH sẽ liên hệ tư vấn trong 5-10 phút tới ạ!`,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
    playSoftNotification();
  };

  // Bot intelligence to answer questions about products, orders, delivery, and payment
  const handleSendMessage = (textToSend?: string) => {
    const rawText = textToSend !== undefined ? textToSend : inputValue;
    const text = rawText.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (textToSend === undefined) {
      setInputValue('');
    }
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const lower = text.toLowerCase();
      let botReply = '';
      let matchedProds: Product[] | undefined = undefined;
      let matchedOrd: any = undefined;

      // 1. Order Code lookup (WS-...)
      const orderCodeMatch = text.match(/WS-[A-Za-z0-9-]+/i);
      if (orderCodeMatch || lower.includes('đơn hàng') || lower.includes('tra cứu')) {
        if (orderCodeMatch) {
          const found = db.webshopOrders.find((o) => o.orderCode.toLowerCase() === orderCodeMatch[0].toLowerCase());
          if (found) {
            matchedOrd = found;
            const statusLabel =
              found.orderStatus === 'PENDING' ? '⏳ Đang chờ xác nhận' :
              found.orderStatus === 'CONFIRMED' ? '📦 Đã duyệt & chuẩn bị hàng' :
              found.orderStatus === 'SHIPPED' ? '🚚 Đang giao hàng' :
              found.orderStatus === 'COMPLETED' ? '✅ Hoàn tất đơn hàng' : '❌ Đã hủy';
            botReply = `Dạ em đã tìm thấy đơn hàng ${found.orderCode} của Quý khách!\n• Trạng thái: ${statusLabel}\n• Khách nhận: ${found.customerName} (${found.customerPhone})\n• Tổng tiền: ${(found.totalAmount || 0).toLocaleString('vi-VN')} đ\n• Hình thức: ${found.paymentMethod === 'COD' ? 'Thanh toán khi nhận (COD)' : 'Chuyển khoản VietQR'}`;
          } else {
            botReply = `Dạ mã đơn ${orderCodeMatch[0]} chưa khớp với dữ liệu hệ thống. Quý khách vui lòng kiểm tra lại mã đơn hoặc cung cấp Số Điện Thoại để em hỗ trợ tra cứu ạ.`;
          }
        } else {
          botReply = 'Quý khách vui lòng nhập Mã đơn hàng (dạng WS-YYMMDD-XXX) hoặc Số điện thoại đặt hàng để em tra cứu hành trình đơn ngay ạ.';
        }
      }
      // 2. Shipping & Delivery
      else if (lower.includes('giao hàng') || lower.includes('ship') || lower.includes('vận chuyển') || lower.includes('bao lâu')) {
        botReply = `Dạ chính sách giao hàng tại kho của bên em:\n• Giao Tiêu Chuẩn: 1 - 3 ngày làm việc (Đồng giá 30.000đ, Miễn phí đơn từ 5.000.000đ)\n• Giao Hỏa Tốc (Nội thành): Nhận hàng trong 2 - 4 giờ (60.000đ)\n• Nhận trực tiếp tại Kho: Miễn phí tại địa chỉ: ${storeConfig.address || 'Khu Công Nghệ Cao, TP.HCM'}.`;
      }
      // 3. Payment methods (VietQR, COD)
      else if (lower.includes('thanh toán') || lower.includes('vietqr') || lower.includes('chuyển khoản') || lower.includes('cod') || lower.includes('ngân hàng')) {
        botReply = `Dạ cửa hàng hỗ trợ 2 hình thức thanh toán thuận tiện:\n1. Thanh toán khi nhận hàng (COD): Quý khách kiểm tra hàng trước khi gửi tiền cho shipper.\n2. Chuyển khoản VietQR tự động qua ${storeConfig.bankName || 'Techcombank'}:\n• STK: ${storeConfig.bankAccount || '19034567891012'}\n• Chủ TK: ${storeConfig.bankOwner || 'CÔNG TY TNHH V-ERP'}\nHệ thống sẽ tự động xác nhận đơn ngay khi tiền vào tài khoản ạ.`;
      }
      // 4. Warranty & Returns
      else if (lower.includes('bảo hành') || lower.includes('đổi trả') || lower.includes('chính hãng')) {
        botReply = `Dạ cam kết chất lượng của kho:\n• Sản phẩm mới 100%, bảo hành chính hãng từ 12 - 24 tháng.\n• Hỗ trợ 1 đổi 1 trong 30 ngày nếu phát sinh lỗi kỹ thuật từ nhà sản xuất.\n• Quý khách được kiểm tra ngoại quan tem mác kỹ càng trước khi nhận hàng.`;
      }
      // 5. Phone number provided for callback
      else if (/(0[3|5|7|8|9])+([0-9]{8})\b/.test(text)) {
        const phone = text.match(/(0[3|5|7|8|9])+([0-9]{8})\b/)?.[0];
        botReply = `Dạ em đã lưu số điện thoại ${phone} của Quý khách. Chuyên viên tư vấn sản phẩm sẽ gọi lại hỗ trợ giải đáp chi tiết trong ít phút nữa ạ!`;
      }
      // 6. Hotline / Contact request
      else if (lower.includes('hotline') || lower.includes('sđt') || lower.includes('số điện thoại') || lower.includes('gọi')) {
        botReply = `Dạ Quý khách có thể bấm gọi trực tiếp Hotline: ${storeConfig.hotline || '1900 6868'} (Khung giờ: ${storeConfig.supportHours || '8:00 - 21:30'}) hoặc kết nối Zalo qua số ${storeConfig.zaloNumber || '0901888999'} để được phục vụ nhanh nhất ạ!`;
      }
      // 7. Product search in database
      else {
        const keywords = lower.split(' ').filter((w) => w.length >= 2);
        const matched = db.products.filter((p) => {
          const pName = p.name.toLowerCase();
          const pSku = p.sku.toLowerCase();
          return keywords.some((k) => pName.includes(k) || pSku.includes(k));
        }).slice(0, 3);

        if (matched.length > 0) {
          matchedProds = matched;
          botReply = `Dạ em tìm thấy ${matched.length} sản phẩm phù hợp với từ khóa của Quý khách trong kho:`;
        } else {
          botReply = `Dạ em đã ghi nhận thông tin từ Quý khách: "${text}". Em có thể giúp Quý khách tra cứu cụ thể mã sản phẩm, kiểm tra số lượng tồn kho thực tế hoặc hướng dẫn tạo đơn hàng online ạ.`;
        }
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botReply,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        matchedProducts: matchedProds,
        matchedOrder: matchedOrd,
      };

      setMessages((prev) => [...prev, botMsg]);
      playSoftNotification();
    }, 600);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end pointer-events-auto">
      {/* Teaser Bubble (Speech Balloon) */}
      {!isOpen && showTeaser && (
        <div
          onClick={() => {
            setIsOpen(true);
            setShowTeaser(false);
          }}
          className="mb-3 mr-1 bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 text-white rounded-2xl p-3 shadow-2xl shadow-black/60 max-w-xs cursor-pointer hover:border-emerald-400 transition transform hover:-translate-y-0.5 group animate-bounce duration-1000"
          style={{ animationIterationCount: 3 }}
        >
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-black font-bold shrink-0 shadow-md">
              <Headphones className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide">CSKH Trực Tuyến</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTeaser(false);
                  }}
                  className="text-slate-500 hover:text-white p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-slate-200 line-clamp-2 mt-0.5 font-medium leading-relaxed">
                Tư vấn giá hoặc hỗ trợ đơn hàng? Liên hệ ngay với chúng tôi!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Hotline: {storeConfig.hotline?.split('-')[0]?.trim() || '1900 6868'}
            </span>
            <span>•</span>
            <span className="text-teal-400 font-semibold">Zalo</span>
          </div>
        </div>
      )}

      {/* Main Support Window Popup */}
      {isOpen && (
        <div className="mb-3 w-[370px] sm:w-[410px] max-w-[calc(100vw-32px)] h-[560px] max-h-[calc(100vh-120px)] bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 p-4 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-black font-black shadow-lg shadow-emerald-500/20">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                    {storeConfig.storeName || 'Smart WMS Store'}
                    <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Online
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{storeConfig.supportHours || '8:00 - 21:30 (Thứ 2 - CN)'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Đóng widget"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Tabs: Chat | Hotline | Zalo */}
            <div className="flex items-center gap-1.5 mt-3 p-1 bg-slate-900/90 rounded-2xl border border-slate-800">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'chat'
                    ? 'bg-emerald-500 text-black shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Trực Tuyến</span>
              </button>

              <button
                onClick={() => setActiveTab('hotline')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'hotline'
                    ? 'bg-emerald-500 text-black shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Hotline</span>
              </button>

              <button
                onClick={() => setActiveTab('zalo')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'zalo'
                    ? 'bg-emerald-500 text-black shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span className="font-extrabold text-[11px]">Zalo</span>
                <span>Chat</span>
              </button>
            </div>
          </div>

          {/* TAB 1: LIVE CHAT */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
                {messages.map((m) => {
                  const isBot = m.sender === 'bot';
                  return (
                    <div
                      key={m.id}
                      className={`flex gap-2.5 ${isBot ? 'justify-start' : 'justify-end'}`}
                    >
                      {isBot && (
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div className={`max-w-[82%] space-y-2`}>
                        <div
                          className={`p-3 rounded-2xl leading-relaxed whitespace-pre-line shadow-md ${
                            isBot
                              ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                              : 'bg-emerald-500 text-black font-medium rounded-tr-none'
                          }`}
                        >
                          {m.text}
                        </div>

                        {/* Matched Products Card inside chat */}
                        {m.matchedProducts && m.matchedProducts.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {m.matchedProducts.map((p) => {
                              const config = db.webshopProductConfigs.find((c) => c.productId === p.id);
                              const retail = config?.retailPrice || (p.averageCost ? Math.round(p.averageCost * 1.3) : 100000);
                              const promo = config?.promoPrice && config.promoPrice < retail ? config.promoPrice : null;
                              const finalPrice = promo || retail;
                              const uom = db.uoms.find((u) => u.id === p.uomId)?.name || 'Cái';

                              return (
                                <div
                                  key={p.id}
                                  className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between gap-2 hover:border-emerald-500/40 transition"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-white text-[11px] truncate">{p.name}</div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                      <span className="font-mono text-emerald-400 font-bold">
                                        {finalPrice.toLocaleString('vi-VN')} đ
                                      </span>
                                      <span>•</span>
                                      <span>Tồn: <strong className={p.currentQty > 0 ? 'text-emerald-400' : 'text-rose-400'}>{p.currentQty} {uom}</strong></span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {onSelectProduct && (
                                      <button
                                        onClick={() => onSelectProduct(p)}
                                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-[10px] flex items-center gap-1 font-semibold"
                                        title="Xem chi tiết"
                                      >
                                        <Eye className="w-3 h-3" />
                                      </button>
                                    )}
                                    {onAddToCart && (
                                      <button
                                        disabled={p.currentQty <= 0 && !storeConfig.allowOrderWhenOutOfStock}
                                        onClick={() => onAddToCart(p, 1)}
                                        className="py-1 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-bold flex items-center gap-1 disabled:opacity-50"
                                      >
                                        <ShoppingBag className="w-3 h-3" />
                                        <span>Chọn mua</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <span
                          className={`text-[9px] block text-slate-500 px-1 ${
                            isBot ? 'text-left' : 'text-right'
                          }`}
                        >
                          {m.time}
                        </span>
                      </div>

                      {!isBot && (
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-2xl rounded-tl-none flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Chips */}
              <div className="p-2 border-t border-slate-800/80 bg-slate-900/40 shrink-0">
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-[11px]">
                  <button
                    onClick={() => handleSendMessage('Kiểm tra tồn kho & báo giá')}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/90 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 border border-slate-700/60 transition"
                  >
                    📦 Tồn kho & giá
                  </button>
                  <button
                    onClick={() => handleSendMessage('Phí vận chuyển & thời gian giao hàng')}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/90 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 border border-slate-700/60 transition"
                  >
                    🚚 Giao hàng
                  </button>
                  <button
                    onClick={() => handleSendMessage('Hướng dẫn thanh toán VietQR và COD')}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/90 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 border border-slate-700/60 transition"
                  >
                    💳 Thanh toán
                  </button>
                  <button
                    onClick={() => handleSendMessage('Chính sách bảo hành và đổi trả hàng')}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/90 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 border border-slate-700/60 transition"
                  >
                    🛡️ Bảo hành
                  </button>
                </div>

                {/* Input Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2 mt-1.5"
                >
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Hỏi về sản phẩm, mã đơn WS-... hoặc SĐT"
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    className="p-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-bold rounded-xl transition shadow-md shadow-emerald-500/20"
                    title="Gửi tin nhắn"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: HOTLINE & REQUEST CALLBACK */}
          {activeTab === 'hotline' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950 text-xs">
              {/* Direct Calling Box */}
              <div className="p-4 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-2xl text-center space-y-2.5 shadow-xl">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                  <PhoneCall className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-black text-white text-base">Tổng Đài Tư Vấn & Báo Giá</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Hỗ trợ trực tiếp
                  </p>
                </div>

                <div className="py-2">
                  <span className="text-xl font-black text-emerald-400 font-mono tracking-wider">
                    {storeConfig.hotline || '1900 6868 - 0901 888 999'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`tel:${cleanHotline}`}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Gọi Ngay</span>
                  </a>
                  <button
                    onClick={handleCopyHotline}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center justify-center gap-1.5 transition font-semibold"
                  >
                    {copiedPhone ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400 text-[11px]">Đã copy</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="text-[11px]">Sao chép</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-around text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Miễn phí cước</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    <span>Nhấc máy dưới 15s</span>
                  </span>
                </div>
              </div>

              {/* Callback Request Form */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-bold text-white text-xs">Yêu Cầu Chuyên Viên Gọi Lại</h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Để lại số điện thoại, nhân viên tư vấn của Smart WMS sẽ liên hệ tư vấn tồn kho và báo giá trong 5-10 phút.
                </p>

                {callbackSubmitted ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center space-y-1">
                    <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                    <p className="font-bold text-emerald-400 text-xs">Đã ghi nhận yêu cầu gọi lại!</p>
                    <p className="text-[11px] text-slate-300">
                      Chuyên viên sẽ liên hệ Quý khách qua SĐT <strong>{callbackPhone}</strong> sớm nhất.
                    </p>
                    <button
                      onClick={() => {
                        setCallbackSubmitted(false);
                        setCallbackPhone('');
                        setCallbackName('');
                      }}
                      className="mt-2 text-[10px] text-slate-400 underline hover:text-white"
                    >
                      Gửi yêu cầu khác
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSendCallback} className="space-y-2.5">
                    <div>
                      <input
                        type="text"
                        placeholder="Họ và tên của Quý khách"
                        value={callbackName}
                        onChange={(e) => setCallbackName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        required
                        placeholder="Số điện thoại liên hệ (*)"
                        value={callbackPhone}
                        onChange={(e) => setCallbackPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Sản phẩm hoặc nhu cầu cần tư vấn"
                        value={callbackNote}
                        onChange={(e) => setCallbackNote(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-slate-800 hover:bg-emerald-500 hover:text-black text-slate-200 font-bold rounded-xl transition text-xs flex items-center justify-center gap-1.5"
                    >
                      <span>Gửi Yêu Cầu Hỗ Trợ</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ZALO CHAT */}
          {activeTab === 'zalo' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950 text-xs">
              <div className="p-4 bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 rounded-2xl text-center space-y-3 shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white mx-auto flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20">
                  Zalo
                </div>

                <div>
                  <h4 className="font-bold text-white text-sm">Hỗ Trợ Kỹ Thuật & Báo Giá Qua Zalo</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Gửi hình ảnh thực tế sản phẩm trong kho & nhận file báo giá tức thì
                  </p>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[10px] text-slate-500 block">Số Zalo CSKH:</span>
                    <span className="font-mono font-bold text-blue-400 text-sm">
                      {storeConfig.zaloNumber || storeConfig.hotline || '0901 888 999'}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyZalo}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold flex items-center gap-1"
                  >
                    {copiedZalo ? (
                      <span className="text-emerald-400">Đã chép</span>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Chép</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Zalo Action Button */}
                <a
                  href={`https://zalo.me/${cleanZalo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Mở Zalo Chat Ngay</span>
                </a>
              </div>

              {/* Zalo Features */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <h5 className="font-bold text-slate-300 text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Ưu Điểm Khi Chat Zalo Với Kho:</span>
                </h5>
                <ul className="space-y-1.5 text-slate-400 text-[11px]">
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>Chụp ảnh thực tế sản phẩm, bao bì và số Serial/IMEI trước khi xuất kho.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>Gửi file báo giá định dạng PDF/Excel có dấu mộc công ty.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>Lưu trữ lịch sử bảo hành và hóa đơn VAT tiện lợi.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Footer Bar */}
          <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Smart WMS Live Support</span>
            </span>
            <span>Kho hàng chính hãng</span>
          </div>
        </div>
      )}

      {/* Floating Action Trigger Button (FAB) */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setShowTeaser(false);
          }}
          className={`relative group w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-95 ${
            isOpen
              ? 'bg-slate-800 text-white border border-slate-700 rotate-90'
              : 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-black shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105'
          }`}
          title="Hỗ trợ khách hàng"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <Headphones className="w-6 h-6" />
              {/* Online Pulse Dot */}
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-950" />
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
