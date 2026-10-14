/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MockDatabase } from '../db/mockDb';
import { User, Role } from '../types';
import { ALL_PERMISSIONS, PERMISSION_MODULES, canViewPurchaseCost } from '../utils/rbac';
import { generateTemporaryPassword } from '../utils/password';
import {
  isServerAuth,
  serverListUsers,
  serverCreateUser,
} from '../utils/authClient';
import {
  ShieldCheck,
  Users,
  KeyRound,
  Shield,
  Search,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Check,
  X,
  AlertCircle,
  Eye,
  DollarSign,
  Layers,
  Sparkles,
  Info,
  ShieldAlert,
  UserCheck,
  UserX,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'motion/react';

interface UserManagementProps {
  db: MockDatabase;
  currentUser?: User | null;
  onUpdate: () => void;
  onSwitchUser?: (user: User) => void;
}

export default function UserManagement({
  db,
  currentUser,
  onUpdate,
  onSwitchUser,
}: UserManagementProps) {
  const [activeTab, setActiveTab] = useState<'matrix' | 'users' | 'roles'>('matrix');

  // Filter state for users
  const [userSearch, setUserSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    roleId: 'WAREHOUSE',
    status: 'ACTIVE' as 'ACTIVE' | 'LOCKED',
  });

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
  });

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const isCurrentAdmin = currentUser?.roleId === 'ADMIN';

  React.useEffect(() => {
    if (typeof isServerAuth === 'function' ? isServerAuth() : Boolean(isServerAuth)) {
      serverListUsers()
        .then((remoteUsers) => {
          if (remoteUsers && remoteUsers.length > 0) {
            db.users = remoteUsers;
            db.save('users' as any);
            onUpdate();
          }
        })
        .catch(() => {});
    }
  }, []);

  // --- MATRIX PERMISSION TOGGLE ---
  const handleTogglePermission = (roleId: string, permKey: string) => {
    if (roleId === 'ADMIN') {
      showToast('Vai trò Admin luôn giữ toàn bộ quyền cao nhất để bảo vệ hệ thống.', 'info');
      return;
    }

    const roleIndex = db.roles.findIndex((r) => r.id === roleId);
    if (roleIndex === -1) return;

    const role = db.roles[roleIndex];
    const exists = role.permissions.includes(permKey);

    let newPermissions: string[];
    if (exists) {
      newPermissions = role.permissions.filter((k) => k !== permKey);
    } else {
      newPermissions = [...role.permissions, permKey];
    }

    db.roles[roleIndex] = {
      ...role,
      permissions: newPermissions,
    };

    db.save('roles' as any);
    onUpdate();
    showToast(`Đã ${exists ? 'gỡ' : 'cấp'} quyền "${ALL_PERMISSIONS.find((p) => p.key === permKey)?.name}" cho vai trò ${role.name}.`);
  };

  // --- USER ACTIONS ---
  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUserForm({
      username: '',
      fullName: '',
      email: '',
      phone: '',
      password: '123',
      roleId: db.roles.find((r) => r.id !== 'ADMIN')?.id || 'WAREHOUSE',
      status: 'ACTIVE',
    });
    setShowUserModal(true);
  };

  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setUserForm({
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone || '',
      password: u.password || '123',
      roleId: u.roleId,
      status: u.status,
    });
    setShowUserModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username.trim() || !userForm.fullName.trim()) {
      alert('Vui lòng nhập đầy đủ tên đăng nhập và họ tên.');
      return;
    }

    if (editingUser) {
      // Edit
      const idx = db.users.findIndex((u) => u.id === editingUser.id);
      if (idx !== -1) {
        db.users[idx] = {
          ...db.users[idx],
          fullName: userForm.fullName,
          email: userForm.email,
          phone: userForm.phone,
          password: userForm.password || db.users[idx].password,
          roleId: userForm.roleId,
          status: userForm.status,
        };
        db.save('users' as any);
        // If updating current user, refresh
        if (currentUser?.id === editingUser.id) {
          db.setCurrentUser(db.users[idx]);
        }
        showToast(`Đã cập nhật thông tin người dùng ${userForm.fullName}`);
      }
    } else {
      // Check duplicate username
      if (db.users.some((u) => u.username.toLowerCase() === userForm.username.trim().toLowerCase())) {
        alert('Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.');
        return;
      }

      const newUser: User = {
        id: `u-${Date.now()}`,
        username: userForm.username.trim().toLowerCase(),
        fullName: userForm.fullName.trim(),
        email: userForm.email.trim(),
        phone: userForm.phone.trim(),
        password: userForm.password || '123',
        roleId: userForm.roleId,
        status: userForm.status,
        createdAt: new Date().toISOString().split('T')[0],
        lastLogin: 'Chưa đăng nhập',
      };
      db.users.push(newUser);
      db.save('users' as any);
      if (typeof isServerAuth === 'function' ? isServerAuth() : Boolean(isServerAuth)) {
        serverCreateUser(newUser).catch(() => {});
      }
      showToast(`Đã tạo mới tài khoản "${newUser.fullName}"`);
    }

    setShowUserModal(false);
    onUpdate();
  };

  const handleToggleLockUser = (u: User) => {
    if (u.id === currentUser?.id) {
      alert('Bạn không thể tự khóa tài khoản đang đăng nhập.');
      return;
    }
    if (u.roleId === 'ADMIN' && db.users.filter((usr) => usr.roleId === 'ADMIN' && usr.status === 'ACTIVE').length <= 1) {
      alert('Không thể khóa tài khoản Admin duy nhất đang hoạt động.');
      return;
    }

    const idx = db.users.findIndex((usr) => usr.id === u.id);
    if (idx !== -1) {
      const newStatus = db.users[idx].status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
      db.users[idx].status = newStatus;
      db.save('users' as any);
      onUpdate();
      showToast(`Đã ${newStatus === 'LOCKED' ? 'khóa' : 'mở khóa'} tài khoản ${u.fullName}.`);
    }
  };

  const handleDeleteUser = (u: User) => {
    if (u.id === currentUser?.id) {
      alert('Bạn không thể xóa tài khoản của chính mình.');
      return;
    }
    if (u.roleId === 'ADMIN') {
      alert('Không thể xóa tài khoản Quản trị viên (Admin).');
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa tài khoản "${u.fullName}" (@${u.username}) không?`)) {
      db.users = db.users.filter((usr) => usr.id !== u.id);
      db.save('users' as any);
      onUpdate();
      showToast(`Đã xóa người dùng ${u.fullName}`);
    }
  };

  const handleChangeUserRoleQuick = (u: User, newRoleId: string) => {
    const idx = db.users.findIndex((usr) => usr.id === u.id);
    if (idx !== -1) {
      db.users[idx].roleId = newRoleId;
      db.save('users' as any);
      if (currentUser?.id === u.id) {
        db.setCurrentUser(db.users[idx]);
      }
      onUpdate();
      showToast(`Đã cập nhật vai trò của ${u.fullName} sang ${db.roles.find((r) => r.id === newRoleId)?.name}`);
    }
  };

  // --- ROLE ACTIONS ---
  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name.trim()) {
      alert('Vui lòng nhập tên vai trò.');
      return;
    }

    if (editingRole) {
      const idx = db.roles.findIndex((r) => r.id === editingRole.id);
      if (idx !== -1) {
        db.roles[idx].name = roleForm.name.trim();
        db.roles[idx].description = roleForm.description.trim();
        db.roles[idx].color = roleForm.color;
        db.save('roles' as any);
        showToast(`Đã cập nhật vai trò ${roleForm.name}`);
      }
    } else {
      const newRole: Role = {
        id: `ROLE_${Date.now()}`,
        name: roleForm.name.trim(),
        description: roleForm.description.trim(),
        color: roleForm.color,
        isSystem: false,
        permissions: ['VIEW_DIRECTORIES'], // Default minimum
      };
      db.roles.push(newRole);
      db.save('roles' as any);
      showToast(`Đã tạo vai trò mới "${newRole.name}". Bây giờ bạn có thể phân quyền trên Ma trận!`);
    }

    setShowRoleModal(false);
    onUpdate();
  };

  const handleDeleteRole = (role: Role) => {
    if (role.isSystem || role.id === 'ADMIN') {
      alert('Không thể xóa vai trò mặc định của hệ thống.');
      return;
    }
    const userCount = db.users.filter((u) => u.roleId === role.id).length;
    if (userCount > 0) {
      alert(`Vai trò này đang được gán cho ${userCount} người dùng. Vui lòng chuyển vai trò của họ trước khi xóa.`);
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa vai trò "${role.name}"?`)) {
      db.roles = db.roles.filter((r) => r.id !== role.id);
      db.save('roles' as any);
      onUpdate();
      showToast(`Đã xóa vai trò ${role.name}`);
    }
  };

  // Filtered users
  const filteredUsers = db.users.filter((u) => {
    const matchSearch =
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = filterRole === 'ALL' || u.roleId === filterRole;
    const matchStatus = filterStatus === 'ALL' || u.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-[#131722] border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Phân quyền & Quản lý Người dùng (RBAC Matrix)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Mô hình phân quyền đa cấp <strong>User → Role → Permission</strong>. Thiết lập quyền xem giá vốn và phân quyền chi tiết cho từng vị trí.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          {activeTab === 'users' && (
            <button
              onClick={handleOpenCreateUser}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-500/10"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm người dùng</span>
            </button>
          )}
          {activeTab === 'matrix' && (
            <button
              onClick={() => {
                setEditingRole(null);
                setRoleForm({ name: '', description: '', color: '#8b5cf6' });
                setShowRoleModal(true);
              }}
              className="bg-white/10 hover:bg-white/15 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 transition border border-white/10"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Thêm vai trò mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex items-center border-b border-white/5 gap-2 pb-1">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition ${
            activeTab === 'matrix'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Ma trận phân quyền (RBAC Matrix)</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition ${
            activeTab === 'users'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Danh sách người dùng ({db.users.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition ${
            activeTab === 'roles'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Danh mục vai trò ({db.roles.length})</span>
        </button>
      </div>

      {/* TAB 1: PERMISSION MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {/* Informational Callout */}
          <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/15 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl mt-0.5">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white">Chính sách bảo mật dữ liệu nhạy cảm (Giá vốn & Tiền mua)</h4>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                  Chỉ có vai trò <strong>Admin</strong> hoặc vai trò được kích hoạt quyền <strong>"Xem giá mua, tiền mua vào & giá trị tồn kho"</strong> mới nhìn thấy các số liệu giá mua, thành tiền đơn hàng mua và tổng giá trị tồn kho. Các vai trò khác sẽ tự động bị ẩn hoặc hiển thị `***`.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-[#0a0c10] px-3 py-1.5 rounded-xl border border-white/5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Chạm vào ô để Bật / Tắt quyền</span>
            </div>
          </div>

          {/* The Matrix Table */}
          <div className="bg-[#11141b] border border-white/5 rounded-2xl shadow-2xl overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0c0e14] border-b border-white/10 text-slate-300">
                  <th className="p-4 font-bold sticky left-0 bg-[#0c0e14] z-20 min-w-[280px] border-r border-white/5">
                    Chức năng & Quyền hạn
                  </th>
                  {db.roles.map((role) => {
                    const assignedUsersCount = db.users.filter((u) => u.roleId === role.id).length;
                    return (
                      <th
                        key={role.id}
                        className="p-3.5 text-center min-w-[150px] border-r border-white/5 last:border-r-0"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className="text-xs font-bold px-2.5 py-0.5 rounded-lg"
                            style={{
                              backgroundColor: `${role.color}15`,
                              color: role.color,
                              border: `1px solid ${role.color}30`,
                            }}
                          >
                            {role.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {assignedUsersCount} người dùng
                          </span>
                          {role.id === 'ADMIN' && (
                            <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 mt-0.5">
                              Cố định (Full)
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {PERMISSION_MODULES.map((mod) => {
                  const modulePermissions = ALL_PERMISSIONS.filter((p) => p.module === mod.id);
                  if (modulePermissions.length === 0) return null;

                  return (
                    <React.Fragment key={mod.id}>
                      {/* Module group header */}
                      <tr className="bg-[#141824]/60">
                        <td
                          colSpan={db.roles.length + 1}
                          className="p-3 px-4 font-bold text-slate-300 uppercase tracking-wider text-[11px] bg-[#141824]/70 border-y border-white/5"
                        >
                          <div className="flex items-center gap-2">
                            {mod.id === 'COST_PRICING' ? (
                              <DollarSign className="w-3.5 h-3.5 text-rose-400" />
                            ) : (
                              <Layers className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                            <span className={mod.id === 'COST_PRICING' ? 'text-rose-300' : 'text-slate-200'}>
                              {mod.name}
                            </span>
                            {mod.id === 'COST_PRICING' && (
                              <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold uppercase">
                                Nhạy cảm tài chính
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Permissions in module */}
                      {modulePermissions.map((perm) => {
                        const isCostPerm = perm.key === 'VIEW_PURCHASE_COST';
                        return (
                          <tr
                            key={perm.key}
                            className={`hover:bg-white/[0.02] transition ${
                              isCostPerm ? 'bg-rose-500/[0.03]' : ''
                            }`}
                          >
                            {/* Permission label */}
                            <td className="p-3.5 px-4 sticky left-0 bg-[#11141b] z-10 border-r border-white/5">
                              <div className="flex items-start gap-2">
                                {isCostPerm ? (
                                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0 mt-1.5" />
                                )}
                                <div>
                                  <span className={`font-semibold ${isCostPerm ? 'text-rose-300 font-bold' : 'text-slate-200'}`}>
                                    {perm.name}
                                  </span>
                                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                                    {perm.description}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Role checkboxes */}
                            {db.roles.map((role) => {
                              const hasPerm = role.id === 'ADMIN' || role.permissions.includes(perm.key);
                              const isAdmin = role.id === 'ADMIN';

                              return (
                                <td
                                  key={role.id}
                                  className="p-3 text-center border-r border-white/5 last:border-r-0"
                                >
                                  <div className="flex justify-center">
                                    <button
                                      type="button"
                                      disabled={isAdmin}
                                      onClick={() => handleTogglePermission(role.id, perm.key)}
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                                        hasPerm
                                          ? isAdmin
                                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 cursor-not-allowed'
                                            : isCostPerm
                                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                                          : 'bg-white/5 text-slate-600 border border-white/10 hover:border-white/20 hover:text-slate-400'
                                      }`}
                                      title={
                                        isAdmin
                                          ? 'Admin luôn có toàn quyền'
                                          : hasPerm
                                          ? 'Nhấn để gỡ bỏ quyền'
                                          : 'Nhấn để cấp quyền'
                                      }
                                    >
                                      {hasPerm ? (
                                        <Check className="w-4 h-4" />
                                      ) : (
                                        <X className="w-3 h-3 opacity-40" />
                                      )}
                                    </button>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-[#11141b] border border-white/5 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Tìm theo tên, username, email..."
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Role filter */}
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">Tất cả vai trò</option>
                {db.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="LOCKED">Đã khóa</option>
              </select>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Hiển thị {filteredUsers.length} / {db.users.length} người dùng
            </div>
          </div>

          {/* User Table */}
          <div className="bg-[#11141b] border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0c0e14] border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="p-3.5 px-4 font-bold">Người dùng</th>
                    <th className="p-3.5 font-bold">Liên hệ</th>
                    <th className="p-3.5 font-bold">Vai trò (Role)</th>
                    <th className="p-3.5 font-bold">Quyền giá vốn</th>
                    <th className="p-3.5 font-bold text-center">Trạng thái</th>
                    <th className="p-3.5 font-bold">Đăng nhập cuối</th>
                    <th className="p-3.5 font-bold text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                        Không tìm thấy người dùng nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const role = db.roles.find((r) => r.id === u.roleId);
                      const isCostAllowed = canViewPurchaseCost(u, db.roles);
                      const isMe = u.id === currentUser?.id;

                      return (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition">
                          {/* User info */}
                          <td className="p-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs"
                                style={{
                                  backgroundColor: `${role?.color || '#10b981'}20`,
                                  color: role?.color || '#10b981',
                                }}
                              >
                                {u.fullName.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-white text-xs">{u.fullName}</span>
                                  {isMe && (
                                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold">
                                      Bạn
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono">@{u.username}</span>
                              </div>
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="p-3.5">
                            <div className="text-slate-300">{u.email}</div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">{u.phone || 'Chưa cập nhật'}</div>
                          </td>

                          {/* Role select */}
                          <td className="p-3.5">
                            <select
                              value={u.roleId}
                              disabled={u.id === currentUser?.id && u.roleId === 'ADMIN'}
                              onChange={(e) => handleChangeUserRoleQuick(u, e.target.value)}
                              className="bg-[#0a0c10] border border-white/10 rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                              style={{ color: role?.color || '#ffffff' }}
                            >
                              {db.roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Purchase Cost Visibility */}
                          <td className="p-3.5">
                            {isCostAllowed ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                                <Check className="w-3 h-3" />
                                <span>Thấy giá mua</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-lg">
                                <Lock className="w-3 h-3" />
                                <span>Bị ẩn (***)</span>
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="p-3.5 text-center">
                            {u.status === 'ACTIVE' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                <UserCheck className="w-3 h-3" />
                                <span>Hoạt động</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                                <UserX className="w-3 h-3" />
                                <span>Đã khóa</span>
                              </span>
                            )}
                          </td>

                          {/* Last login */}
                          <td className="p-3.5 text-slate-400 text-[11px] font-mono">
                            {u.lastLogin || 'Chưa đăng nhập'}
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Switch user test */}
                              {onSwitchUser && (
                                <button
                                  type="button"
                                  onClick={() => onSwitchUser(u)}
                                  className="p-1.5 bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 text-slate-400 rounded-lg transition"
                                  title={`Đăng nhập nhanh với tư cách ${u.fullName}`}
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenEditUser(u)}
                                className="p-1.5 bg-white/5 hover:bg-blue-500/10 hover:text-blue-400 text-slate-400 rounded-lg transition"
                                title="Sửa thông tin"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleLockUser(u)}
                                disabled={isMe}
                                className={`p-1.5 bg-white/5 rounded-lg transition ${
                                  u.status === 'ACTIVE'
                                    ? 'hover:bg-amber-500/10 hover:text-amber-400 text-slate-400'
                                    : 'hover:bg-emerald-500/10 hover:text-emerald-400 text-amber-400'
                                } ${isMe ? 'opacity-30 cursor-not-allowed' : ''}`}
                                title={u.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa'}
                              >
                                {u.status === 'ACTIVE' ? (
                                  <Lock className="w-3.5 h-3.5" />
                                ) : (
                                  <Unlock className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                disabled={isMe || u.roleId === 'ADMIN'}
                                className={`p-1.5 bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 rounded-lg transition ${
                                  isMe || u.roleId === 'ADMIN' ? 'opacity-30 cursor-not-allowed' : ''
                                }`}
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

      {/* TAB 3: ROLES MANAGEMENT */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {db.roles.map((role) => {
              const userCount = db.users.filter((u) => u.roleId === role.id).length;
              const hasCost = role.id === 'ADMIN' || role.permissions.includes('VIEW_PURCHASE_COST');

              return (
                <div
                  key={role.id}
                  className="bg-[#11141b] border border-white/5 hover:border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col justify-between transition"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                        <h3 className="font-bold text-white text-sm">{role.name}</h3>
                      </div>
                      {role.isSystem ? (
                        <span className="text-[10px] bg-white/5 border border-white/10 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                          Mặc định
                        </span>
                      ) : (
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-mono">
                          Tùy chỉnh
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mt-2.5 leading-relaxed min-h-[36px]">
                      {role.description}
                    </p>

                    <div className="mt-4 pt-3 border-t border-white/5 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Số lượng quyền hạn:</span>
                        <span className="font-bold text-white">
                          {role.id === 'ADMIN' ? ALL_PERMISSIONS.length : role.permissions.length} / {ALL_PERMISSIONS.length} quyền
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Thành viên đang gán:</span>
                        <span className="font-bold text-emerald-400">{userCount} người dùng</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Quyền xem giá vốn:</span>
                        {hasCost ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Cho phép
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                            Bị ẩn (***)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveTab('matrix')}
                      className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Cấu hình quyền hạn</span>
                    </button>

                    {!role.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(role)}
                        className="text-xs text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-lg transition"
                        title="Xóa vai trò tùy chỉnh"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT USER */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#11141b] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-bold text-white text-base">
                {editingUser ? 'Chỉnh sửa thông tin người dùng' : 'Thêm tài khoản người dùng mới'}
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Tên đăng nhập *</label>
                  <input
                    type="text"
                    disabled={!!editingUser}
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    placeholder="thukho2, nhanvien1..."
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold block text-sm">Mật khẩu</label>
                    <button
                      type="button"
                      onClick={() => setUserForm((prev) => ({ ...prev, password: generateTemporaryPassword(8) }))}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                      title="Tạo mật khẩu ngẫu nhiên an toàn"
                    >
                      <RefreshCw size={11} />
                      Tạo ngẫu nhiên
                    </button>
                  </div>
                  <input
                    type="text"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder="Mặc định: 123"
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Họ và tên đầy đủ *</label>
                <input
                  type="text"
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  placeholder="Nguyễn Văn A..."
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="user@verp.vn"
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    placeholder="0912 345 678"
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Vai trò hệ thống</label>
                  <select
                    value={userForm.roleId}
                    onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {db.roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Trạng thái tài khoản</label>
                  <select
                    value={userForm.status}
                    onChange={(e) => setUserForm({ ...userForm, status: e.target.value as any })}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ACTIVE">Hoạt động (Active)</option>
                    <option value="LOCKED">Đã khóa (Locked)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/10"
                >
                  {editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: ADD / EDIT ROLE */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#11141b] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-bold text-white text-base">
                {editingRole ? 'Chỉnh sửa vai trò' : 'Thêm vai trò người dùng mới'}
              </h3>
              <button
                onClick={() => setShowRoleModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Tên vai trò *</label>
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  placeholder="Ví dụ: Nhân viên kho ca đêm, Trưởng phòng..."
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Mô tả chức năng</label>
                <textarea
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  rows={3}
                  placeholder="Mô tả phạm vi quyền hạn và trách nhiệm..."
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Màu sắc nhận diện (Badge)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={roleForm.color}
                    onChange={(e) => setRoleForm({ ...roleForm, color: e.target.value })}
                    className="w-10 h-10 rounded-xl border border-white/10 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-slate-400">{roleForm.color}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/10"
                >
                  {editingRole ? 'Lưu thay đổi' : 'Tạo vai trò'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
