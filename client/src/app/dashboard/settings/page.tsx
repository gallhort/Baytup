'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import moment from 'moment';
import { useTranslation } from '@/hooks/useTranslation';

interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  bio: string;
  avatar: string;
}

interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface Preferences {
  language: string;
  currency: string;
  theme: string;
}

interface Notifications {
  email: {
    bookingUpdates: boolean;
    messages: boolean;
    promotions: boolean;
    newsletter: boolean;
  };
  push: {
    bookingUpdates: boolean;
    messages: boolean;
    promotions: boolean;
  };
}

interface Privacy {
  showEmail: boolean;
  showPhone: boolean;
  profileVisibility: string;
}

interface AccountInfo {
  isEmailVerified: boolean;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const t = useTranslation('settings');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Personal Info State - Initialize with empty strings to avoid uncontrolled input warning
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    bio: '',
    avatar: ''
  });

  // Address State - Initialize with empty strings
  const [address, setAddress] = useState<Address>({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Algeria'
  });

  // Preferences State
  const [preferences, setPreferences] = useState<Preferences>({
    language: 'en',
    currency: 'DZD',
    theme: 'light'
  });

  // Notifications State
  const [notifications, setNotifications] = useState<Notifications>({
    email: {
      bookingUpdates: true,
      messages: true,
      promotions: true,
      newsletter: true
    },
    push: {
      bookingUpdates: true,
      messages: true,
      promotions: false
    }
  });

  // Privacy State
  const [privacy, setPrivacy] = useState<Privacy>({
    showEmail: false,
    showPhone: false,
    profileVisibility: 'public'
  });

  // Account Info
  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    isEmailVerified: false,
    role: 'guest',
    isActive: true,
    createdAt: '',
    lastLogin: ''
  });

  // Security State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [emailForm, setEmailForm] = useState({
    email: '',
    password: ''
  });

  // Delete Account State
  const [deleteForm, setDeleteForm] = useState({
    password: '',
    reason: ''
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        toast.error((t as any)?.messages?.error?.pleaseLogin || 'Please login to view settings');
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/settings`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const { settings } = response.data.data;

      // Set personal info with fallback to empty strings
      setPersonalInfo({
        firstName: settings.personalInfo.firstName || '',
        lastName: settings.personalInfo.lastName || '',
        email: settings.personalInfo.email || '',
        phone: settings.personalInfo.phone || '',
        dateOfBirth: settings.personalInfo.dateOfBirth || '',
        gender: settings.personalInfo.gender || '',
        bio: settings.personalInfo.bio || '',
        avatar: settings.personalInfo.avatar || '/uploads/users/default-avatar.png'
      });

      // Set address with fallback to empty strings
      setAddress({
        street: settings.address?.street || '',
        city: settings.address?.city || '',
        state: settings.address?.state || '',
        postalCode: settings.address?.postalCode || '',
        country: settings.address?.country || 'Algeria'
      });

      setPreferences(settings.preferences);
      setNotifications(settings.notifications);
      setPrivacy(settings.privacy);
      setAccountInfo(settings.account);
      setImageError(false);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      if (error.response?.status === 401) {
        toast.error((t as any)?.messages?.error?.pleaseLogin || 'Please login to view settings');
        router.push('/login');
      } else {
        toast.error((t as any)?.messages?.error?.loadFailed || 'Failed to load settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error((t as any)?.messages?.error?.imageSizeExceeded || 'Image size should be less than 5MB');
        return;
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        toast.error((t as any)?.messages?.error?.invalidImageType || 'Please upload a valid image file (JPG, PNG, or GIF)');
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/settings/avatar`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      toast.success((t as any)?.messages?.success?.avatarUploaded || 'Avatar uploaded successfully');
      setAvatarPreview(null);
      setAvatarFile(null);
      await fetchSettings();
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error(error.response?.data?.message || (t as any)?.messages?.error?.avatarUploadFailed || 'Failed to upload avatar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/settings/avatar`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success((t as any)?.messages?.success?.avatarDeleted || 'Avatar deleted successfully');
      await fetchSettings();
    } catch (error: any) {
      console.error('Avatar delete error:', error);
      toast.error(error.response?.data?.message || (t as any)?.messages?.error?.avatarDeleteFailed || 'Failed to delete avatar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      // Only send non-email fields
      const updateData = {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        phone: personalInfo.phone,
        dateOfBirth: personalInfo.dateOfBirth,
        gender: personalInfo.gender,
        bio: personalInfo.bio
      };

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/settings/personal-info`,
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success((t as any)?.messages?.success?.personalInfoUpdated || 'Personal information updated successfully');
      await fetchSettings();
    } catch (error: any) {
      console.error('Personal info update error:', error);
      toast.error(error.response?.data?.message || (t as any)?.messages?.error?.personalInfoUpdateFailed || 'Failed to update personal information');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/settings/address`,
        address,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success((t as any)?.messages?.success?.addressUpdated || 'Address updated successfully');
    } catch (error: any) {
      console.error('Address update error:', error);
      toast.error(error.response?.data?.message || (t as any)?.messages?.error?.addressUpdateFailed || 'Failed to update address');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePreferences = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/settings/preferences`,
        preferences,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success((t as any)?.messages?.success?.preferencesUpdated || 'Preferences updated successfully');
    } catch (error: any) {
      console.error('Preferences update error:', error);
      toast.error(error.response?.data?.message || (t as any)?.messages?.error?.preferencesUpdateFailed || 'Failed to update preferences');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateNotifications = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/settings/notifications`,
        { notifications },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success((t as any)?.messages?.success?.notificationsUpdated || 'Notification settings updated successfully');
    } catch (error: any) {
      console.error('Notifications update error:', error);
      toast.error(error.response?.data?.message || (t as any)?.messages?.error?.notificationsUpdateFailed || 'Failed to update notifications');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/settings/privacy`,
        { privacy },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success((t as any)?.messages?.success?.privacyUpdated || 'Privacy settings updated successfully');
    } catch (error: any) {
      console.error('Privacy update error:', error);
      toast.error(error.response?.data?.message || (t as any)?.messages?.error?.privacyUpdateFailed || 'Failed to update privacy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error((t as any)?.messages?.error?.passwordMismatch || 'New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error((t as any)?.messages?.error?.passwordTooShort || 'Password must be at least 6 characters');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/settings/password`,
        passwordForm,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success((t as any)?.messages?.success?.passwordChanged || 'Password changed successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Password change error:', error);
      toast.error(error.response?.data?.message || (t as any)?.messages?.error?.passwordChangeFailed || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(emailForm.email)) {
      toast.error((t as any)?.messages?.error?.invalidEmail || 'Please enter a valid email address');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/settings/email`,
        emailForm,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success((t as any)?.messages?.success?.emailChanged || 'Email changed successfully. Please verify your new email.');
      setEmailForm({ email: '', password: '' });
      await fetchSettings();
    } catch (error: any) {
      console.error('Email change error:', error);
      toast.error(error.response?.data?.message || (t as any)?.messages?.error?.emailChangeFailed || 'Failed to change email');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateAccount = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const password = prompt('Please enter your password to confirm:');

      if (!password) {
        setSubmitting(false);
        return;
      }

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/settings/deactivate`,
        { password },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success((t as any)?.messages?.success?.accountDeactivated || 'Account deactivated successfully');
      localStorage.removeItem('token');
      router.push('/');
    } catch (error: any) {
      console.error('Account deactivation error:', error);
      toast.error(error.response?.data?.message || (t as any)?.messages?.error?.accountDeactivateFailed || 'Failed to deactivate account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteForm.password) {
      toast.error((t as any)?.messages?.error?.enterPassword || 'Please enter your password');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/settings/account`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: deleteForm
        }
      );

      toast.success((t as any)?.messages?.success?.accountDeleted || 'Account deleted successfully');
      localStorage.removeItem('token');
      router.push('/');
    } catch (error: any) {
      console.error('Account deletion error:', error);
      toast.error(error.response?.data?.message || (t as any)?.messages?.error?.accountDeleteFailed || 'Failed to delete account');
    } finally {
      setSubmitting(false);
    }
  };

  const getImageUrl = (url: string) => {
    if (!url) return '/uploads/users/default-avatar.png';
    if (url.startsWith('http')) return url;

    // Remove /api from the URL for static files
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${url}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35] mx-auto"></div>
          <p className="mt-4 text-gray-600">{(t as any)?.header?.loading || 'Loading settings...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{(t as any)?.header?.title || 'Settings'}</h1>
          <p className="mt-2 text-gray-600">
            {(t as any)?.header?.subtitle || 'Manage your account settings and preferences'}
          </p>
        </div>

        {/* Settings Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <nav className="space-y-1">
                {[
                  { id: 'personal', label: (t as any)?.tabs?.personal || 'Personal Info', icon: '👤' },
                  { id: 'address', label: (t as any)?.tabs?.address || 'Address', icon: '📍' },
                  { id: 'preferences', label: (t as any)?.tabs?.preferences || 'Preferences', icon: '⚙️' },
                  { id: 'notifications', label: (t as any)?.tabs?.notifications || 'Notifications', icon: '🔔' },
                  { id: 'privacy', label: (t as any)?.tabs?.privacy || 'Privacy', icon: '🔒' },
                  { id: 'security', label: (t as any)?.tabs?.security || 'Security', icon: '🛡️' },
                  { id: 'account', label: (t as any)?.tabs?.account || 'Account', icon: '⚠️' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                      activeTab === tab.id
                        ? 'bg-[#FF6B35] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">{tab.icon}</span>
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:w-3/4">
            <div className="bg-white rounded-lg shadow-md p-6">
              {/* Personal Info Tab */}
              {activeTab === 'personal' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">{(t as any)?.personal?.title || 'Personal Information'}</h2>

                  {/* Avatar Section */}
                  <div className="mb-8 pb-8 border-b">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{(t as any)?.personal?.avatar?.title || 'Profile Picture'}</h3>
                    <div className="flex items-center gap-6">
                      <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200">
                        <Image
                          src={avatarPreview || getImageUrl(personalInfo.avatar)}
                          alt="Avatar"
                          fill
                          className="object-cover"
                          onError={() => setImageError(true)}
                          unoptimized={imageError}
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          id="avatar"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                          disabled={submitting}
                        />
                        <label
                          htmlFor="avatar"
                          className={`inline-block px-4 py-2 bg-[#FF6B35] text-white rounded-lg cursor-pointer hover:bg-[#ff5722] transition-colors ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {(t as any)?.personal?.avatar?.chooseImage || 'Choose Image'}
                        </label>
                        {avatarPreview && (
                          <button
                            onClick={handleUploadAvatar}
                            disabled={submitting}
                            className="ml-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {submitting ? ((t as any)?.personal?.avatar?.uploading || 'Uploading...') : ((t as any)?.personal?.avatar?.upload || 'Upload')}
                          </button>
                        )}
                        {!avatarPreview && personalInfo.avatar !== '/uploads/users/default-avatar.png' && (
                          <button
                            onClick={handleDeleteAvatar}
                            disabled={submitting}
                            className="ml-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {submitting ? ((t as any)?.personal?.avatar?.removing || 'Removing...') : ((t as any)?.personal?.avatar?.remove || 'Remove')}
                          </button>
                        )}
                        <p className="text-sm text-gray-500 mt-2">
                          {(t as any)?.personal?.avatar?.sizeHint || 'JPG, PNG or GIF. Max size 5MB'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Personal Info Form */}
                  <form onSubmit={handleUpdatePersonalInfo}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {(t as any)?.personal?.firstName?.label || 'First Name'} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={personalInfo.firstName}
                          onChange={(e) =>
                            setPersonalInfo({ ...personalInfo, firstName: e.target.value })
                          }
                          required
                          disabled={submitting}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {(t as any)?.personal?.lastName?.label || 'Last Name'} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={personalInfo.lastName}
                          onChange={(e) =>
                            setPersonalInfo({ ...personalInfo, lastName: e.target.value })
                          }
                          required
                          disabled={submitting}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {(t as any)?.personal?.email?.label || 'Email'} <span className="text-gray-500">({(t as any)?.personal?.email?.readonly || 'Read-only'})</span>
                        </label>
                        <input
                          type="email"
                          value={personalInfo.email}
                          readOnly
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {(t as any)?.personal?.email?.hint || 'To change your email, use the Security tab'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {(t as any)?.personal?.phone?.label || 'Phone Number'}
                        </label>
                        <input
                          type="tel"
                          value={personalInfo.phone}
                          onChange={(e) =>
                            setPersonalInfo({ ...personalInfo, phone: e.target.value })
                          }
                          placeholder={(t as any)?.personal?.phone?.placeholder || '+213 XXX XXX XXX'}
                          disabled={submitting}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {(t as any)?.personal?.dateOfBirth?.label || 'Date of Birth'}
                        </label>
                        <input
                          type="date"
                          value={personalInfo.dateOfBirth ? moment(personalInfo.dateOfBirth).format('YYYY-MM-DD') : ''}
                          onChange={(e) =>
                            setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })
                          }
                          disabled={submitting}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {(t as any)?.personal?.gender?.label || 'Gender'}
                        </label>
                        <select
                          value={personalInfo.gender}
                          onChange={(e) =>
                            setPersonalInfo({ ...personalInfo, gender: e.target.value })
                          }
                          disabled={submitting}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">{(t as any)?.personal?.gender?.placeholder || 'Select Gender'}</option>
                          <option value="male">{(t as any)?.personal?.gender?.options?.male || 'Male'}</option>
                          <option value="female">{(t as any)?.personal?.gender?.options?.female || 'Female'}</option>
                          <option value="other">{(t as any)?.personal?.gender?.options?.other || 'Other'}</option>
                        </select>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {(t as any)?.personal?.bio?.label || 'Bio'}
                      </label>
                      <textarea
                        value={personalInfo.bio}
                        onChange={(e) =>
                          setPersonalInfo({ ...personalInfo, bio: e.target.value })
                        }
                        rows={4}
                        maxLength={500}
                        placeholder={(t as any)?.personal?.bio?.placeholder || 'Tell us about yourself...'}
                        disabled={submitting}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        {(personalInfo.bio || '').length}/500 {(t as any)?.personal?.bio?.characters || 'characters'}
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-3 bg-[#FF6B35] text-white rounded-lg font-medium hover:bg-[#ff5722] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? ((t as any)?.personal?.buttons?.saving || 'Saving...') : ((t as any)?.personal?.buttons?.save || 'Save Changes')}
                    </button>
                  </form>
                </div>
              )}

              {/* Address Tab */}
              {activeTab === 'address' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">{(t as any)?.address?.title || 'Address'}</h2>

                  <form onSubmit={handleUpdateAddress}>
                    <div className="grid grid-cols-1 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {(t as any)?.address?.street?.label || 'Street Address'}
                        </label>
                        <input
                          type="text"
                          value={address.street}
                          onChange={(e) =>
                            setAddress({ ...address, street: e.target.value })
                          }
                          disabled={submitting}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {(t as any)?.address?.city?.label || 'City'}
                          </label>
                          <input
                            type="text"
                            value={address.city}
                            onChange={(e) =>
                              setAddress({ ...address, city: e.target.value })
                            }
                            disabled={submitting}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {(t as any)?.address?.state?.label || 'State/Province'}
                          </label>
                          <input
                            type="text"
                            value={address.state}
                            onChange={(e) =>
                              setAddress({ ...address, state: e.target.value })
                            }
                            disabled={submitting}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {(t as any)?.address?.postalCode?.label || 'Postal Code'}
                          </label>
                          <input
                            type="text"
                            value={address.postalCode}
                            onChange={(e) =>
                              setAddress({ ...address, postalCode: e.target.value })
                            }
                            disabled={submitting}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {(t as any)?.address?.country?.label || 'Country'}
                          </label>
                          <select
                            value={address.country}
                            onChange={(e) =>
                              setAddress({ ...address, country: e.target.value })
                            }
                            disabled={submitting}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="Algeria">{(t as any)?.address?.country?.options?.algeria || 'Algeria'}</option>
                            <option value="France">{(t as any)?.address?.country?.options?.france || 'France'}</option>
                            <option value="Tunisia">{(t as any)?.address?.country?.options?.tunisia || 'Tunisia'}</option>
                            <option value="Morocco">{(t as any)?.address?.country?.options?.morocco || 'Morocco'}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-3 bg-[#FF6B35] text-white rounded-lg font-medium hover:bg-[#ff5722] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? ((t as any)?.address?.buttons?.saving || 'Saving...') : ((t as any)?.address?.buttons?.save || 'Save Address')}
                    </button>
                  </form>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">{(t as any)?.preferences?.title || 'Preferences'}</h2>

                  <form onSubmit={handleUpdatePreferences}>
                    <div className="space-y-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {(t as any)?.preferences?.language?.label || 'Language'}
                        </label>
                        <select
                          value={preferences.language}
                          onChange={(e) =>
                            setPreferences({ ...preferences, language: e.target.value })
                          }
                          disabled={submitting}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="en">{(t as any)?.preferences?.language?.options?.en || 'English'}</option>
                          <option value="fr">{(t as any)?.preferences?.language?.options?.fr || 'Français'}</option>
                          <option value="ar">{(t as any)?.preferences?.language?.options?.ar || 'العربية'}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {(t as any)?.preferences?.currency?.label || 'Currency'}
                        </label>
                        <select
                          value={preferences.currency}
                          onChange={(e) =>
                            setPreferences({ ...preferences, currency: e.target.value })
                          }
                          disabled={submitting}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="DZD">{(t as any)?.preferences?.currency?.options?.dzd || 'DZD - Algerian Dinar'}</option>
                          <option value="EUR">{(t as any)?.preferences?.currency?.options?.eur || 'EUR - Euro'}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {(t as any)?.preferences?.theme?.label || 'Theme'}
                        </label>
                        <select
                          value={preferences.theme}
                          onChange={(e) =>
                            setPreferences({ ...preferences, theme: e.target.value })
                          }
                          disabled={submitting}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="light">{(t as any)?.preferences?.theme?.options?.light || 'Light'}</option>
                          <option value="dark">{(t as any)?.preferences?.theme?.options?.dark || 'Dark'}</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-3 bg-[#FF6B35] text-white rounded-lg font-medium hover:bg-[#ff5722] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? ((t as any)?.preferences?.buttons?.saving || 'Saving...') : ((t as any)?.preferences?.buttons?.save || 'Save Preferences')}
                    </button>
                  </form>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">{(t as any)?.notifications?.title || 'Notifications'}</h2>

                  <form onSubmit={handleUpdateNotifications}>
                    <div className="space-y-8 mb-6">
                      {/* Email Notifications */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{(t as any)?.notifications?.email?.title || 'Email Notifications'}</h3>
                        <div className="space-y-4">
                          {[
                            { key: 'bookingUpdates', label: (t as any)?.notifications?.email?.bookingUpdates?.label || 'Booking Updates', desc: (t as any)?.notifications?.email?.bookingUpdates?.description || 'Receive emails about your booking status' },
                            { key: 'messages', label: (t as any)?.notifications?.email?.messages?.label || 'Messages', desc: (t as any)?.notifications?.email?.messages?.description || 'Get notified when you receive new messages' },
                            { key: 'promotions', label: (t as any)?.notifications?.email?.promotions?.label || 'Promotions', desc: (t as any)?.notifications?.email?.promotions?.description || 'Special offers and discounts' },
                            { key: 'newsletter', label: (t as any)?.notifications?.email?.newsletter?.label || 'Newsletter', desc: (t as any)?.notifications?.email?.newsletter?.description || 'Monthly newsletter with tips and updates' }
                          ].map((item) => (
                            <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900">{item.label}</p>
                                <p className="text-sm text-gray-500">{item.desc}</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notifications.email[item.key as keyof typeof notifications.email]}
                                  onChange={(e) =>
                                    setNotifications({
                                      ...notifications,
                                      email: {
                                        ...notifications.email,
                                        [item.key]: e.target.checked
                                      }
                                    })
                                  }
                                  disabled={submitting}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6B35] peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Push Notifications */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{(t as any)?.notifications?.push?.title || 'Push Notifications'}</h3>
                        <div className="space-y-4">
                          {[
                            { key: 'bookingUpdates', label: (t as any)?.notifications?.push?.bookingUpdates?.label || 'Booking Updates', desc: (t as any)?.notifications?.push?.bookingUpdates?.description || 'Get push notifications about bookings' },
                            { key: 'messages', label: (t as any)?.notifications?.push?.messages?.label || 'Messages', desc: (t as any)?.notifications?.push?.messages?.description || 'Instant notifications for new messages' },
                            { key: 'promotions', label: (t as any)?.notifications?.push?.promotions?.label || 'Promotions', desc: (t as any)?.notifications?.push?.promotions?.description || 'Special deals and offers' }
                          ].map((item) => (
                            <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900">{item.label}</p>
                                <p className="text-sm text-gray-500">{item.desc}</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notifications.push[item.key as keyof typeof notifications.push]}
                                  onChange={(e) =>
                                    setNotifications({
                                      ...notifications,
                                      push: {
                                        ...notifications.push,
                                        [item.key]: e.target.checked
                                      }
                                    })
                                  }
                                  disabled={submitting}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6B35] peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-3 bg-[#FF6B35] text-white rounded-lg font-medium hover:bg-[#ff5722] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? ((t as any)?.notifications?.buttons?.saving || 'Saving...') : ((t as any)?.notifications?.buttons?.save || 'Save Notifications')}
                    </button>
                  </form>
                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === 'privacy' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">{(t as any)?.privacy?.title || 'Privacy Settings'}</h2>

                  <form onSubmit={handleUpdatePrivacy}>
                    <div className="space-y-6 mb-6">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{(t as any)?.privacy?.showEmail?.label || 'Show Email on Profile'}</p>
                          <p className="text-sm text-gray-500">{(t as any)?.privacy?.showEmail?.description || 'Allow others to see your email address'}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={privacy.showEmail}
                            onChange={(e) =>
                              setPrivacy({ ...privacy, showEmail: e.target.checked })
                            }
                            disabled={submitting}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6B35] peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{(t as any)?.privacy?.showPhone?.label || 'Show Phone on Profile'}</p>
                          <p className="text-sm text-gray-500">{(t as any)?.privacy?.showPhone?.description || 'Allow others to see your phone number'}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={privacy.showPhone}
                            onChange={(e) =>
                              setPrivacy({ ...privacy, showPhone: e.target.checked })
                            }
                            disabled={submitting}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6B35] peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {(t as any)?.privacy?.profileVisibility?.label || 'Profile Visibility'}
                        </label>
                        <select
                          value={privacy.profileVisibility}
                          onChange={(e) =>
                            setPrivacy({ ...privacy, profileVisibility: e.target.value })
                          }
                          disabled={submitting}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="public">{(t as any)?.privacy?.profileVisibility?.options?.public || 'Public - Anyone can see your profile'}</option>
                          <option value="private">{(t as any)?.privacy?.profileVisibility?.options?.private || 'Private - Only you can see your profile'}</option>
                          <option value="contacts">{(t as any)?.privacy?.profileVisibility?.options?.contacts || 'Contacts Only - Only people you\'ve messaged'}</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-3 bg-[#FF6B35] text-white rounded-lg font-medium hover:bg-[#ff5722] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? ((t as any)?.privacy?.buttons?.saving || 'Saving...') : ((t as any)?.privacy?.buttons?.save || 'Save Privacy Settings')}
                    </button>
                  </form>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">{(t as any)?.security?.title || 'Security'}</h2>

                  {/* Change Password */}
                  <div className="mb-8 pb-8 border-b">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{(t as any)?.security?.password?.title || 'Change Password'}</h3>
                    <form onSubmit={handleChangePassword}>
                      <div className="space-y-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {(t as any)?.security?.password?.currentPassword?.label || 'Current Password'}
                          </label>
                          <input
                            type="password"
                            value={passwordForm.currentPassword}
                            onChange={(e) =>
                              setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                            }
                            required
                            disabled={submitting}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {(t as any)?.security?.password?.newPassword?.label || 'New Password'}
                          </label>
                          <input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(e) =>
                              setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                            }
                            required
                            minLength={6}
                            disabled={submitting}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {(t as any)?.security?.password?.confirmPassword?.label || 'Confirm New Password'}
                          </label>
                          <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) =>
                              setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                            }
                            required
                            minLength={6}
                            disabled={submitting}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-3 bg-[#FF6B35] text-white rounded-lg font-medium hover:bg-[#ff5722] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? ((t as any)?.security?.password?.buttons?.saving || 'Changing...') : ((t as any)?.security?.password?.buttons?.save || 'Change Password')}
                      </button>
                    </form>
                  </div>

                  {/* Change Email */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{(t as any)?.security?.email?.title || 'Change Email'}</h3>
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        {(t as any)?.security?.email?.currentEmail || 'Current Email:'} <span className="font-medium">{personalInfo.email}</span>
                        {accountInfo.isEmailVerified ? (
                          <span className="ml-2 text-green-600">{(t as any)?.security?.email?.verified || '✓ Verified'}</span>
                        ) : (
                          <span className="ml-2 text-red-600">{(t as any)?.security?.email?.notVerified || '✗ Not Verified'}</span>
                        )}
                      </p>
                    </div>

                    <form onSubmit={handleChangeEmail}>
                      <div className="space-y-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {(t as any)?.security?.email?.newEmail?.label || 'New Email Address'}
                          </label>
                          <input
                            type="email"
                            value={emailForm.email}
                            onChange={(e) =>
                              setEmailForm({ ...emailForm, email: e.target.value })
                            }
                            required
                            disabled={submitting}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {(t as any)?.security?.email?.password?.label || 'Password'}
                          </label>
                          <input
                            type="password"
                            value={emailForm.password}
                            onChange={(e) =>
                              setEmailForm({ ...emailForm, password: e.target.value })
                            }
                            required
                            disabled={submitting}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-3 bg-[#FF6B35] text-white rounded-lg font-medium hover:bg-[#ff5722] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? ((t as any)?.security?.email?.buttons?.saving || 'Changing...') : ((t as any)?.security?.email?.buttons?.save || 'Change Email')}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Account Tab */}
              {activeTab === 'account' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">{(t as any)?.account?.title || 'Account Management'}</h2>

                  {/* Account Info */}
                  <div className="mb-8 pb-8 border-b">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{(t as any)?.account?.info?.title || 'Account Information'}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">{(t as any)?.account?.info?.role || 'Account Role'}</span>
                        <span className="font-medium capitalize">{accountInfo.role}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">{(t as any)?.account?.info?.emailVerified || 'Email Verified'}</span>
                        <span className={`font-medium ${accountInfo.isEmailVerified ? 'text-green-600' : 'text-red-600'}`}>
                          {accountInfo.isEmailVerified ? ((t as any)?.account?.info?.yes || 'Yes') : ((t as any)?.account?.info?.no || 'No')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">{(t as any)?.account?.info?.status || 'Account Status'}</span>
                        <span className={`font-medium ${accountInfo.isActive ? 'text-green-600' : 'text-red-600'}`}>
                          {accountInfo.isActive ? ((t as any)?.account?.info?.active || 'Active') : ((t as any)?.account?.info?.inactive || 'Inactive')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">{(t as any)?.account?.info?.memberSince || 'Member Since'}</span>
                        <span className="font-medium">
                          {moment(accountInfo.createdAt).format('MMM DD, YYYY')}
                        </span>
                      </div>
                      {accountInfo.lastLogin && (
                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                          <span className="text-gray-700">{(t as any)?.account?.info?.lastLogin || 'Last Login'}</span>
                          <span className="font-medium">
                            {moment(accountInfo.lastLogin).fromNow()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Deactivate Account */}
                  <div className="mb-8 pb-8 border-b">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{(t as any)?.account?.deactivate?.title || 'Deactivate Account'}</h3>
                    <p className="text-gray-600 mb-4">
                      {(t as any)?.account?.deactivate?.description || 'Temporarily disable your account. You can reactivate it anytime by logging back in.'}
                    </p>
                    <button
                      onClick={() => setShowDeactivateModal(true)}
                      disabled={submitting}
                      className="px-6 py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {(t as any)?.account?.deactivate?.button || 'Deactivate Account'}
                    </button>
                  </div>

                  {/* Delete Account */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 text-red-600">{(t as any)?.account?.delete?.title || 'Delete Account'}</h3>
                    <p className="text-gray-600 mb-4">
                      {(t as any)?.account?.delete?.description || 'Permanently delete your account and all associated data. This action cannot be undone.'}
                    </p>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      disabled={submitting}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {(t as any)?.account?.delete?.button || 'Delete Account Permanently'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Deactivate Confirmation Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 text-center">
                {(t as any)?.modals?.deactivate?.title || 'Deactivate Account'}
              </h3>
              <p className="mt-2 text-sm text-gray-500 text-center">
                {(t as any)?.modals?.deactivate?.description || 'Are you sure you want to deactivate your account? You can reactivate it anytime by logging back in.'}
              </p>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-4 rounded-b-xl">
              <button
                onClick={() => setShowDeactivateModal(false)}
                disabled={submitting}
                className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(t as any)?.modals?.deactivate?.cancel || 'Cancel'}
              </button>
              <button
                onClick={() => {
                  setShowDeactivateModal(false);
                  handleDeactivateAccount();
                }}
                disabled={submitting}
                className="px-6 py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? ((t as any)?.modals?.deactivate?.confirming || 'Deactivating...') : ((t as any)?.modals?.deactivate?.confirm || 'Deactivate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 text-center">
                {(t as any)?.modals?.delete?.title || 'Delete Account Permanently'}
              </h3>
              <p className="mt-2 text-sm text-gray-500 text-center">
                {(t as any)?.modals?.delete?.description || 'This action cannot be undone. All your data will be permanently deleted.'}
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any)?.modals?.delete?.password?.label || 'Password'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={deleteForm.password}
                    onChange={(e) =>
                      setDeleteForm({ ...deleteForm, password: e.target.value })
                    }
                    required
                    disabled={submitting}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any)?.modals?.delete?.reason?.label || 'Reason for leaving (Optional)'}
                  </label>
                  <textarea
                    value={deleteForm.reason}
                    onChange={(e) =>
                      setDeleteForm({ ...deleteForm, reason: e.target.value })
                    }
                    rows={3}
                    disabled={submitting}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder={(t as any)?.modals?.delete?.reason?.placeholder || 'Help us improve...'}
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-4 rounded-b-xl">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteForm({ password: '', reason: '' });
                }}
                disabled={submitting}
                className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(t as any)?.modals?.delete?.cancel || 'Cancel'}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={submitting}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? ((t as any)?.modals?.delete?.confirming || 'Deleting...') : ((t as any)?.modals?.delete?.confirm || 'Delete Permanently')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

