'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
  FaUser,
  FaEdit,
  FaTrash,
  FaPlus,
  FaSearch,
  FaFilter,
  FaTimes,
  FaCheck,
  FaBan,
  FaUserShield,
  FaKey,
  FaEnvelope,
  FaPhone,
  FaCalendar,
  FaMapMarkerAlt,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
  FaSave,
  FaUserPlus,
  FaExclamationTriangle,
  FaLock
} from 'react-icons/fa';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'guest' | 'host' | 'admin';
  phone?: string;
  avatar?: string;
  isActive: boolean;
  isBlocked: boolean;
  blockReason?: string;
  isEmailVerified: boolean;
  dateOfBirth?: string;
  gender?: string;
  address?: {
    city?: string;
    state?: string;
    country?: string;
  };
  stats?: {
    totalBookings: number;
    totalListings: number;
    totalReviews: number;
    averageRating: number;
  };
  createdAt: string;
  lastLogin?: string;
}

interface Stats {
  total: number;
  guests: number;
  hosts: number;
  admins: number;
  active: number;
  blocked: number;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { state } = useApp();
  const user = state.user;
  const t = useTranslation('users');

  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    guests: 0,
    hosts: 0,
    admins: 0,
    active: 0,
    blocked: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState('-createdAt');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'guest',
    phone: '',
    dateOfBirth: '',
    gender: '',
    city: '',
    state: '',
    country: 'Algeria'
  });

  // Reset password form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Block user form
  const [blockReason, setBlockReason] = useState('');

  // Helper function to get avatar URL
  const getAvatarUrl = (avatar: string | undefined) => {
    if (!avatar) return '/uploads/users/default-avatar.png';
    if (avatar.startsWith('http')) return avatar;

    // Remove /api from the URL for static files
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${avatar}`;
  };

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error((t as any)?.toast?.accessDenied || 'Access denied. Admin only.');
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sort: sortBy
      });

      if (searchTerm) params.append('search', searchTerm);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter === 'active') params.append('isActive', 'true');
      if (statusFilter === 'inactive') params.append('isActive', 'false');
      if (statusFilter === 'blocked') params.append('isBlocked', 'true');

      const response = await axios.get(
        `${API_BASE_URL}/admin/users?${params.toString()}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.status === 'success') {
        setUsers(response.data.data.users);
        setStats(response.data.stats);
        setTotalPages(response.data.pagination.pages);
        setTotalResults(response.data.pagination.total);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 403) {
        toast.error((t as any)?.toast?.accessDenied || 'Access denied');
        router.push('/dashboard');
      } else {
        toast.error((t as any)?.toast?.failedToLoad || 'Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [currentPage, roleFilter, statusFilter, sortBy]);

  // Handle search with debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (currentPage === 1) {
        fetchUsers();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Create user
  const handleCreateUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const userData = {
        ...formData,
        address: {
          city: formData.city,
          state: formData.state,
          country: formData.country
        }
      };

      const response = await axios.post(
        `${API_BASE_URL}/admin/users`,
        userData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success((t as any)?.toast?.userCreated || 'User created successfully');
        setShowModal(false);
        resetForm();
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.failedToCreate || 'Failed to create user');
    }
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        address: {
          city: formData.city,
          state: formData.state,
          country: formData.country
        }
      };

      const response = await axios.put(
        `${API_BASE_URL}/admin/users/${selectedUser._id}`,
        userData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success((t as any)?.toast?.userUpdated || 'User updated successfully');
        setShowModal(false);
        resetForm();
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.failedToUpdate || 'Failed to update user');
    }
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!selectedUser) return;

    if (!newPassword || newPassword.length < 6) {
      toast.error((t as any)?.toast?.passwordMinLength || 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error((t as any)?.toast?.passwordMismatch || 'Passwords do not match');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const response = await axios.patch(
        `${API_BASE_URL}/admin/users/${selectedUser._id}/reset-password`,
        { newPassword },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success((t as any)?.toast?.passwordReset || 'Password reset successfully');
        closeResetPasswordModal();
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.failedToReset || 'Failed to reset password');
    }
  };

  // Block user
  const handleBlockUser = async () => {
    if (!selectedUser) return;

    if (!blockReason.trim()) {
      toast.error((t as any)?.toast?.provideBlockReason || 'Please provide a reason for blocking');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const response = await axios.patch(
        `${API_BASE_URL}/admin/users/${selectedUser._id}/block`,
        { isBlocked: true, blockReason: blockReason },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success((t as any)?.toast?.userBlocked || 'User blocked successfully');
        closeBlockModal();
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error blocking user:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.failedToBlock || 'Failed to block user');
    }
  };

  // Unblock user
  const handleUnblockUser = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const response = await axios.patch(
        `${API_BASE_URL}/admin/users/${userId}/block`,
        { isBlocked: false },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success((t as any)?.toast?.userUnblocked || 'User unblocked successfully');
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error unblocking user:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.failedToUnblock || 'Failed to unblock user');
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const response = await axios.delete(
        `${API_BASE_URL}/admin/users/${selectedUser._id}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.status === 'success') {
        toast.success((t as any)?.toast?.userDeleted || 'User deleted successfully');
        closeDeleteModal();
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.failedToDelete || 'Failed to delete user');
    }
  };

  // Update user role
  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const response = await axios.patch(
        `${API_BASE_URL}/admin/users/${userId}/role`,
        { role: newRole },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success((t as any)?.toast?.roleUpdated ? `${(t as any).toast.roleUpdated} ${newRole}` : `User role updated to ${newRole}`);
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.failedToUpdateRole || 'Failed to update role');
    }
  };

  // Verify email
  const handleVerifyEmail = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const response = await axios.patch(
        `${API_BASE_URL}/admin/users/${userId}/verify-email`,
        {},
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.status === 'success') {
        toast.success((t as any)?.toast?.emailVerified || 'Email verified successfully');
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error verifying email:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.failedToVerify || 'Failed to verify email');
    }
  };

  // Open modals
  const openModal = (mode: 'create' | 'edit' | 'view', user: User | null = null) => {
    setModalMode(mode);
    setSelectedUser(user);

    if (user && (mode === 'edit' || mode === 'view')) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: '',
        role: user.role,
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        gender: user.gender || '',
        city: user.address?.city || '',
        state: user.address?.state || '',
        country: user.address?.country || 'Algeria'
      });
    }

    setShowModal(true);
  };

  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowResetPasswordModal(true);
  };

  const openBlockModal = (user: User) => {
    setSelectedUser(user);
    setBlockReason('');
    setShowBlockModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // Close modals
  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const closeResetPasswordModal = () => {
    setShowResetPasswordModal(false);
    setSelectedUser(null);
    setNewPassword('');
    setConfirmPassword('');
  };

  const closeBlockModal = () => {
    setShowBlockModal(false);
    setSelectedUser(null);
    setBlockReason('');
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedUser(null);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'guest',
      phone: '',
      dateOfBirth: '',
      gender: '',
      city: '',
      state: '',
      country: 'Algeria'
    });
    setSelectedUser(null);
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35] mx-auto"></div>
          <p className="mt-4 text-gray-600">{(t as any)?.toast?.loadingUsers || 'Loading users...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{(t as any)?.header?.title || 'User Management'}</h1>
          <p className="text-gray-600 mt-1">{(t as any)?.header?.subtitle || 'Manage all users in the system'}</p>
        </div>
        <button
          onClick={() => openModal('create')}
          className="bg-[#FF6B35] text-white px-6 py-3 rounded-lg hover:bg-[#ff8255] transition-colors flex items-center space-x-2"
        >
          <FaUserPlus />
          <span>{(t as any)?.header?.addButton || 'Add New User'}</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.totalUsers || 'Total Users'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <FaUser className="text-blue-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.guests || 'Guests'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.guests}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <FaUser className="text-green-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.hosts || 'Hosts'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.hosts}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <FaUserShield className="text-purple-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.admins || 'Admins'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.admins}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <FaUserShield className="text-red-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.active || 'Active'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <FaCheck className="text-green-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.blocked || 'Blocked'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.blocked}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <FaBan className="text-red-600 text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={(t as any)?.filters?.searchPlaceholder || 'Search by name or email...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            >
              <option value="all">{(t as any)?.filters?.allRoles || 'All Roles'}</option>
              <option value="guest">{(t as any)?.filters?.roleGuest || 'Guests'}</option>
              <option value="host">{(t as any)?.filters?.roleHost || 'Hosts'}</option>
              <option value="admin">{(t as any)?.filters?.roleAdmin || 'Admins'}</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            >
              <option value="all">{(t as any)?.filters?.allStatus || 'All Status'}</option>
              <option value="active">{(t as any)?.filters?.statusActive || 'Active'}</option>
              <option value="inactive">{(t as any)?.filters?.statusInactive || 'Inactive'}</option>
              <option value="blocked">{(t as any)?.filters?.statusBlocked || 'Blocked'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {(t as any)?.table?.headers?.user || 'User'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {(t as any)?.table?.headers?.email || 'Email'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {(t as any)?.table?.headers?.role || 'Role'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {(t as any)?.table?.headers?.status || 'Status'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {(t as any)?.table?.headers?.joined || 'Joined'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {(t as any)?.table?.headers?.actions || 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        {u.avatar ? (
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={getAvatarUrl(u.avatar)}
                            alt={`${u.firstName} ${u.lastName}`}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              if (target.nextElementSibling) {
                                (target.nextElementSibling as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div className={`h-10 w-10 rounded-full bg-[#FF6B35] flex items-center justify-center ${u.avatar ? 'hidden' : ''}`}>
                          <span className="text-white font-medium">
                            {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {u.firstName} {u.lastName}
                        </div>
                        {u.phone && (
                          <div className="text-sm text-gray-500">{u.phone}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{u.email}</div>
                    {u.isEmailVerified ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        {(t as any)?.table?.content?.verified || 'Verified'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        {(t as any)?.table?.content?.notVerified || 'Not Verified'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateRole(u._id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      disabled={u._id === user?.id}
                    >
                      <option value="guest">{(t as any)?.table?.content?.guest || 'Guest'}</option>
                      <option value="host">{(t as any)?.table?.content?.host || 'Host'}</option>
                      <option value="admin">{(t as any)?.table?.content?.admin || 'Admin'}</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      {u.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          {(t as any)?.table?.content?.active || 'Active'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {(t as any)?.table?.content?.inactive || 'Inactive'}
                        </span>
                      )}
                      {u.isBlocked && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          {(t as any)?.table?.content?.blocked || 'Blocked'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openModal('view', u)}
                        className="text-blue-600 hover:text-blue-900"
                        title={(t as any)?.actions?.viewDetails || 'View Details'}
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => openModal('edit', u)}
                        className="text-green-600 hover:text-green-900"
                        title={(t as any)?.actions?.editUser || 'Edit User'}
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => openResetPasswordModal(u)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title={(t as any)?.actions?.resetPassword || 'Reset Password'}
                      >
                        <FaKey />
                      </button>
                      {u.isBlocked ? (
                        <button
                          onClick={() => handleUnblockUser(u._id)}
                          className="text-green-600 hover:text-green-900"
                          title={(t as any)?.actions?.unblockUser || 'Unblock User'}
                          disabled={u._id === user?.id}
                        >
                          <FaCheck />
                        </button>
                      ) : (
                        <button
                          onClick={() => openBlockModal(u)}
                          className="text-orange-600 hover:text-orange-900"
                          title={(t as any)?.actions?.blockUser || 'Block User'}
                          disabled={u._id === user?.id}
                        >
                          <FaBan />
                        </button>
                      )}
                      <button
                        onClick={() => openDeleteModal(u)}
                        className="text-red-600 hover:text-red-900"
                        title={(t as any)?.actions?.deleteUser || 'Delete User'}
                        disabled={u._id === user?.id}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(t as any)?.pagination?.previous || 'Previous'}
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(t as any)?.pagination?.next || 'Next'}
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  {(t as any)?.pagination?.showing || 'Showing'} <span className="font-medium">{(currentPage - 1) * 20 + 1}</span> {(t as any)?.pagination?.to || 'to'}{' '}
                  <span className="font-medium">{Math.min(currentPage * 20, totalResults)}</span> {(t as any)?.pagination?.of || 'of'}{' '}
                  <span className="font-medium">{totalResults}</span> {(t as any)?.pagination?.results || 'results'}
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaChevronLeft />
                  </button>
                  {[...Array(totalPages)].map((_, index) => {
                    const page = index + 1;
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === currentPage
                              ? 'z-10 bg-[#FF6B35] border-[#FF6B35] text-white'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span
                          key={page}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                        >
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaChevronRight />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View/Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={closeModal}
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              {/* Header */}
              <div className="bg-[#FF6B35] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">
                    {modalMode === 'create' && ((t as any)?.modal?.createTitle || 'Create New User')}
                    {modalMode === 'edit' && ((t as any)?.modal?.editTitle || 'Edit User')}
                    {modalMode === 'view' && ((t as any)?.modal?.viewTitle || 'User Details')}
                  </h3>
                  <button
                    onClick={closeModal}
                    className="text-white hover:text-gray-200"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-4 max-h-96 overflow-y-auto">
                {modalMode === 'view' && selectedUser ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.firstName || 'First Name'}</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedUser.firstName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.lastName || 'Last Name'}</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedUser.lastName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.email || 'Email'}</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.phone || 'Phone'}</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedUser.phone || ((t as any)?.modal?.na || 'N/A')}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.role || 'Role'}</label>
                        <p className="mt-1 text-sm text-gray-900 capitalize">{selectedUser.role}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.status || 'Status'}</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedUser.isActive ? ((t as any)?.modal?.active || 'Active') : ((t as any)?.modal?.inactive || 'Inactive')}
                          {selectedUser.isBlocked && ` (${(t as any)?.modal?.blocked || 'Blocked'})`}
                        </p>
                      </div>
                      {selectedUser.address?.city && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.city || 'City'}</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedUser.address.city}</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.joined || 'Joined'}</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(selectedUser.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {selectedUser.stats && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium text-gray-900 mb-2">{(t as any)?.modal?.statistics || 'Statistics'}</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.totalBookings || 'Total Bookings'}</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedUser.stats.totalBookings}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.totalListings || 'Total Listings'}</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedUser.stats.totalListings}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.totalReviews || 'Total Reviews'}</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedUser.stats.totalReviews}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.averageRating || 'Average Rating'}</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedUser.stats.averageRating.toFixed(1)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.firstNameRequired || 'First Name *'}</label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.lastNameRequired || 'Last Name *'}</label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.emailRequired || 'Email *'}</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                          required
                        />
                      </div>
                      {modalMode === 'create' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.passwordRequired || 'Password *'}</label>
                          <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                            required
                            minLength={6}
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.phone || 'Phone'}</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                        />
                      </div>
                      {modalMode === 'create' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.role || 'Role'}</label>
                          <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                          >
                            <option value="guest">{(t as any)?.modal?.guest || 'Guest'}</option>
                            <option value="host">{(t as any)?.modal?.host || 'Host'}</option>
                            <option value="admin">{(t as any)?.modal?.admin || 'Admin'}</option>
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.dateOfBirth || 'Date of Birth'}</label>
                        <input
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                          className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.gender || 'Gender'}</label>
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                        >
                          <option value="">{(t as any)?.modal?.selectGender || 'Select Gender'}</option>
                          <option value="male">{(t as any)?.modal?.male || 'Male'}</option>
                          <option value="female">{(t as any)?.modal?.female || 'Female'}</option>
                          <option value="other">{(t as any)?.modal?.other || 'Other'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.city || 'City'}</label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.state || 'State'}</label>
                        <input
                          type="text"
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.modal?.country || 'Country'}</label>
                        <input
                          type="text"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {modalMode === 'view' ? ((t as any)?.modal?.close || 'Close') : ((t as any)?.modal?.cancel || 'Cancel')}
                </button>
                {modalMode !== 'view' && (
                  <button
                    onClick={modalMode === 'create' ? handleCreateUser : handleUpdateUser}
                    className="px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#ff8255] transition-colors flex items-center space-x-2"
                  >
                    <FaSave />
                    <span>{modalMode === 'create' ? ((t as any)?.modal?.createUser || 'Create User') : ((t as any)?.modal?.saveChanges || 'Save Changes')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeResetPasswordModal}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-[#FF6B35] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white flex items-center space-x-2">
                    <FaLock />
                    <span>{(t as any)?.resetPassword?.title || 'Reset Password'}</span>
                  </h3>
                  <button onClick={closeResetPasswordModal} className="text-white hover:text-gray-200">
                    <FaTimes />
                  </button>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    {(t as any)?.resetPassword?.resetPasswordFor || 'Reset password for:'} <span className="font-semibold">{selectedUser.firstName} {selectedUser.lastName}</span>
                  </p>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{(t as any)?.resetPassword?.newPassword || 'New Password *'}</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      placeholder={(t as any)?.resetPassword?.newPasswordPlaceholder || 'Enter new password (min 6 characters)'}
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{(t as any)?.resetPassword?.confirmPassword || 'Confirm Password *'}</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      placeholder={(t as any)?.resetPassword?.confirmPasswordPlaceholder || 'Confirm new password'}
                      minLength={6}
                    />
                  </div>
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-sm text-red-600">{(t as any)?.resetPassword?.passwordsDoNotMatch || 'Passwords do not match'}</p>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={closeResetPasswordModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {(t as any)?.modal?.cancel || 'Cancel'}
                </button>
                <button
                  onClick={handleResetPassword}
                  className="px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#ff8255] transition-colors flex items-center space-x-2"
                  disabled={!newPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                >
                  <FaKey />
                  <span>{(t as any)?.resetPassword?.resetButton || 'Reset Password'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block User Modal */}
      {showBlockModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeBlockModal}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-6 py-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <FaBan className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{(t as any)?.blockUser?.title || 'Block User'}</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {(t as any)?.blockUser?.message || 'You are about to block:'} <span className="font-semibold">{selectedUser.firstName} {selectedUser.lastName}</span>
                    </p>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">{(t as any)?.blockUser?.reasonLabel || 'Reason for blocking *'}</label>
                      <textarea
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        rows={4}
                        className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                        placeholder={(t as any)?.blockUser?.reasonPlaceholder || 'Enter reason for blocking this user...'}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={closeBlockModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {(t as any)?.modal?.cancel || 'Cancel'}
                </button>
                <button
                  onClick={handleBlockUser}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                  disabled={!blockReason.trim()}
                >
                  <FaBan />
                  <span>{(t as any)?.blockUser?.blockButton || 'Block User'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeDeleteModal}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-6 py-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <FaExclamationTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{(t as any)?.deleteUser?.title || 'Delete User'}</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {(t as any)?.deleteUser?.message || 'Are you sure you want to delete'} <span className="font-semibold">{selectedUser.firstName} {selectedUser.lastName}</span>?
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{selectedUser.email}</p>
                    <p className="mt-2 text-sm text-red-600 font-medium">
                      {(t as any)?.deleteUser?.warning || 'This action cannot be undone.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={closeDeleteModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {(t as any)?.modal?.cancel || 'Cancel'}
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  <FaTrash />
                  <span>{(t as any)?.deleteUser?.deleteButton || 'Delete User'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
