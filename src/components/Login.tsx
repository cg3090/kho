/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MockDatabase } from '../db/mockDb';
import { User } from '../types';
import { initAuth, isServerAuth, serverLogin } from '../utils/authClient';
import { ShieldCheck, Lock, User as UserIcon, LogIn, ShieldAlert, Eye, EyeOff, Building2 } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  db: MockDatabase;
  onLoginSuccess: (user: User) => void;
  onBackToShop?: () => void;
  notice?: string | null;
}

export default function Login({ db, onLoginSuccess, onBackToShop, notice }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const serverManaged = isServerAuth();

const attemptLogin = async (loginUser: string, loginPass: string) => {
    setLoading(true);
    try {
      // Re-probe before every attempt: a previous failed probe (server restarting,
      // transient network error) must not silently downgrade the app to local auth.
      if (!isServerAuth()) {
        await initAuth();
      }

      const res = isServerAuth()
        ? await serverLogin(loginUser, loginPass)
        : await db.login(loginUser, loginPass);
      if (res.success && res.user) {
        db.setCurrentUser(res.user);
        await db.syncWithFirebase();
        if (import.meta.env.PROD && !db.isRealDatabaseConnected) {
          db.setCurrentUser(null);
          setErrorMsg('Đăng nhập thành công nhưng không tải được dữ liệu PostgreSQL. Vui lòng kiểm tra cấu hình Supabase.');
          return;
        }
        onLoginSuccess(res.user);
      } else {
        const msg = (res as any).message || (res as any).error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
        setErrorMsg(msg);
      }
    } catch {
      setErrorMsg('Không thể xác thực. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (!username.trim()) {
      setErrorMsg('Vui lòng nhập tên đăng nhập');
      return;
    }
    if (!password) {
      setErrorMsg('Vui lòng nhập mật khẩu');
      return;
    }

    void attemptLogin(username.trim(), password);
  };

  return (
    <div className="min-h-dvh w-full bg-[#0a0c10] flex flex-col justify-center items-center px-4 py-8 relative overflow-x-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-blue-500/5 blur-[90px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#11141b] border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10 p-5 sm:p-8 flex flex-col justify-between"
      >
        <div className="max-w-md w-full mx-auto"> {/* Thêm class bọc nếu cần, hoặc giữ nguyên thẻ <div> */}
  {/* Header / Brand */}
  <div className="flex items-center gap-3 mb-8">
    <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
      <Building2 className="w-6 h-6" />
    </div>
    <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
      V-ERP SOLUTIONS
    </h1>
  </div>

  <div className="mb-6">
    <h2 className="text-lg font-bold text-white tracking-tight">Đăng nhập tài khoản</h2>
  </div>

  {/* Thông báo hệ thống */}
  {notice && (
    <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200">
      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <span>{notice}</span>
    </div>
  )}

  {!serverManaged && (
    <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-[11px] text-amber-200">
      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <span>
        Máy chủ xác thực không khả dụng: hệ thống đang chạy ở chế độ dự phòng, phiên đăng nhập lưu trong
        trình duyệt. Hãy chạy ứng dụng qua <strong>npm start</strong> để kích hoạt bảo mật đầy đủ.
      </span>
    </div>
  )}

  {errorMsg && (
    <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-xs text-rose-300">
      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
      <span>{errorMsg}</span>
    </div>
  )}

  {/* Form đăng nhập */}
  <form onSubmit={handleLogin} className="space-y-4">
    <div>
      <label className="text-xs font-semibold text-slate-300 block mb-1.5">
        Tên đăng nhập
      </label>
      <div className="relative">
        <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Tên đăng nhập"
          className="w-full bg-[#0a0c10] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          autoFocus
        />
      </div>
    </div>

    <div>
      <label className="text-xs font-semibold text-slate-300 block mb-1.5">
        Mật khẩu
      </label>
      <div className="relative">
        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          className="w-full bg-[#0a0c10] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>

    <div className="flex items-center justify-between text-xs pt-1">
      <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
        <input
          type="checkbox"
          defaultChecked
          className="rounded bg-black/40 border-white/10 text-emerald-500 focus:ring-emerald-500/20"
        />
        <span>Ghi nhớ đăng nhập</span>
      </label>
    </div>

    <button
      type="submit"
      disabled={loading}
      className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/10 cursor-pointer"
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          <LogIn className="w-4 h-4" />
          <span>Đăng nhập</span>
        </>
      )}
    </button>
  </form>

  {/* Footer hệ thống */}
  <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
    <span>Phiên bản v2.6.4</span>
    <span className="text-emerald-500/80 font-medium">Bảo mật</span>
  </div>
</div>
      </motion.div>
    </div>
  );
}
