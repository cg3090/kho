/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MockDatabase } from '../db/mockDb';
import { User } from '../types';
import { isServerAuth, serverChangePassword } from '../utils/authClient';
import { validatePassword, checkPasswordStrength } from '../utils/password';
import { ShieldAlert, Lock, Eye, EyeOff, CheckCircle2, ArrowRight, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';

interface ForceChangePasswordProps {
  user: User;
  onPasswordChanged: (updatedUser?: User) => void;
  onCancel?: () => void;
  db?: MockDatabase;
}

export const ForceChangePassword: React.FC<ForceChangePasswordProps> = ({
  user,
  onPasswordChanged,
  onCancel,
  db,
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = checkPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword) {
      setError('Vui lòng nhập mật khẩu mới');
      return;
    }

    const val = validatePassword(newPassword);
    if (!val.valid) {
      setError(val.message || 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (oldPassword && newPassword === oldPassword) {
      setError('Mật khẩu mới không được trùng với mật khẩu cũ');
      return;
    }

    setLoading(true);

    try {
      // 1. Thực hiện đổi mật khẩu qua hệ thống xác thực máy chủ / database
      const res = await serverChangePassword({
        userId: user.id,
        oldPassword,
        newPassword,
      });

      if (!res.success) {
        setError(res.error || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại.');
        setLoading(false);
        return;
      }

      // 2. Đồng bộ trạng thái user trong bộ nhớ / database instance nếu có
      let updatedUser: User = res.user || {
        ...user,
        mustChangePassword: false,
        isTemporaryPassword: false,
      };

      if (db) {
        const synced = db.updateUser(user.id, {
          password: newPassword,
          mustChangePassword: false,
          isTemporaryPassword: false,
        });
        if (synced) {
          updatedUser = synced;
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onPasswordChanged(updatedUser);
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />

        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Yêu cầu đổi mật khẩu</h2>
            <p className="text-xs text-slate-400">
              Tài khoản <span className="text-amber-400 font-semibold">{user.username}</span> cần cập nhật mật khẩu mới để tiếp tục.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Đổi mật khẩu thành công! Đang chuyển hướng...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Mật khẩu hiện tại / tạm thời
            </label>
            <div className="relative">
              <input
                type={showOldPass ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Nhập mật khẩu cũ..."
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowOldPass(!showOldPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Mật khẩu mới
            </label>
            <div className="relative">
              <input
                type={showNewPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự..."
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword && (
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>Độ mạnh:</span>
                <span
                  className={
                    strength === 'strong'
                      ? 'text-emerald-400 font-medium'
                      : strength === 'medium'
                      ? 'text-amber-400 font-medium'
                      : 'text-rose-400 font-medium'
                  }
                >
                  {strength === 'strong' ? 'Mạnh' : strength === 'medium' ? 'Trung bình' : 'Yếu'}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Xác nhận mật khẩu mới
            </label>
            <div className="relative">
              <input
                type={showConfirmPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới..."
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center space-x-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition"
              >
                Hủy
              </button>
            )}
            <button
              type="submit"
              disabled={loading || success}
              className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-sm font-bold rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Cập nhật mật khẩu</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ForceChangePassword;
