'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
  FaClipboardList,
  FaEdit,
  FaTrash,
  FaTimes,
  FaCheck,
  FaBan,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
  FaSave,
  FaClock,
  FaExclamationCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaUser,
  FaIdCard,
  FaHome,
  FaUniversity,
  FaExclamationTriangle,
  FaSync
} from 'react-icons/fa';

interface HostApplication {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'resubmission_required';
  personalInfo: {
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    dateOfBirth: string;
    nationalIdNumber: string;
  };
  hostIntent: {
    propertyTypes: string[];
    vehicleTypes: string[];
    numberOfListings: number;
    experienceLevel: string;
    motivation: string;
  };
  bankingInfo: {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    rib: string;
    swift: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  documents: {
    nationalId?: {
      front?: { url: string; uploadedAt: string };
      back?: { url: string; uploadedAt: string };
      verified: boolean;
    };
    proofOfAddress?: { url: string; uploadedAt: string; verified: boolean };
    businessLicense?: { url: string; uploadedAt: string; verified: boolean };
  };
  completionPercentage: number;
  submittedAt?: string;
  createdAt: string;
  review?: {
    reviewedBy?: {
      firstName: string;
      lastName: string;
    };
    reviewedAt?: string;
    comments?: string;
  };
}

interface Stats {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  resubmissionRequired: number;
}

export default function AdminHostApplicationsPage() {
  const router = useRouter();
  const { state } = useApp();
  const user = state.user;
  const t = useTranslation('host-applications');

  const [applications, setApplications] = useState<HostApplication[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    resubmissionRequired: 0
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<HostApplication | null>(null);

  // Form states
  const [rejectReason, setRejectReason] = useState('');
  const [resubmitNotes, setResubmitNotes] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  const [editFormData, setEditFormData] = useState({
    phone: '',
    city: '',
    state: '',
    street: '',
    postalCode: '',
    dateOfBirth: '',
    nationalIdNumber: '',
    propertyTypes: [] as string[],
    vehicleTypes: [] as string[],
    numberOfListings: 1,
    experienceLevel: 'first_time',
    motivation: '',
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    rib: '',
    swift: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: ''
  });

  // Helper function to get avatar URL
  const getAvatarUrl = (avatar: string | undefined) => {
    if (!avatar) return '/uploads/users/default-avatar.png';
    if (avatar.startsWith('http')) return avatar;

    // Remove /api from the URL for static files
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${avatar}`;
  };

  // Helper function to get document URL
  const getDocumentUrl = (docUrl: string | undefined) => {
    if (!docUrl) return '';
    if (docUrl.startsWith('http')) return docUrl;

    // Remove /api from the URL for static files
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${docUrl}`;
  };

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error((t as any)?.toast?.accessDenied || 'Access denied. Admin only.');
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch applications
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sort: '-createdAt'
      });

      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await axios.get(
        `${API_BASE_URL}/admin/host-applications?${params.toString()}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.status === 'success') {
        setApplications(response.data.data.applications);
        setTotalPages(response.data.pagination.pages);
        setTotalResults(response.data.pagination.total);

        // Calculate stats
        const allApps = response.data.data.applications;
        setStats({
          total: response.data.pagination.total,
          pending: allApps.filter((app: HostApplication) => app.status === 'pending').length,
          underReview: allApps.filter((app: HostApplication) => app.status === 'under_review').length,
          approved: allApps.filter((app: HostApplication) => app.status === 'approved').length,
          rejected: allApps.filter((app: HostApplication) => app.status === 'rejected').length,
          resubmissionRequired: allApps.filter((app: HostApplication) => app.status === 'resubmission_required').length
        });
      }
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      if (error.response?.status === 403) {
        toast.error((t as any)?.toast?.accessDenied || 'Access denied');
        router.push('/dashboard');
      } else {
        toast.error((t as any)?.toast?.failedToLoad || 'Failed to load applications');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchApplications();
    }
  }, [currentPage, statusFilter]);

  // Open modals
  const openViewModal = (application: HostApplication) => {
    setSelectedApplication(application);
    setShowViewModal(true);
  };

  const openEditModal = (application: HostApplication) => {
    setSelectedApplication(application);
    setEditFormData({
      phone: application.personalInfo?.phone || '',
      city: application.personalInfo?.address?.city || '',
      state: application.personalInfo?.address?.state || '',
      street: application.personalInfo?.address?.street || '',
      postalCode: application.personalInfo?.address?.postalCode || '',
      dateOfBirth: application.personalInfo?.dateOfBirth ? new Date(application.personalInfo.dateOfBirth).toISOString().split('T')[0] : '',
      nationalIdNumber: application.personalInfo?.nationalIdNumber || '',
      propertyTypes: application.hostIntent?.propertyTypes || [],
      vehicleTypes: application.hostIntent?.vehicleTypes || [],
      numberOfListings: application.hostIntent?.numberOfListings || 1,
      experienceLevel: application.hostIntent?.experienceLevel || 'first_time',
      motivation: application.hostIntent?.motivation || '',
      bankName: application.bankingInfo?.bankName || '',
      accountHolderName: application.bankingInfo?.accountHolderName || '',
      accountNumber: application.bankingInfo?.accountNumber || '',
      rib: application.bankingInfo?.rib || '',
      swift: application.bankingInfo?.swift || '',
      emergencyContactName: application.emergencyContact?.name || '',
      emergencyContactRelationship: application.emergencyContact?.relationship || '',
      emergencyContactPhone: application.emergencyContact?.phone || ''
    });
    setShowEditModal(true);
  };

  const openApproveModal = (application: HostApplication) => {
    setSelectedApplication(application);
    setShowApproveModal(true);
  };

  const openRejectModal = (application: HostApplication) => {
    setSelectedApplication(application);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const openResubmitModal = (application: HostApplication) => {
    setSelectedApplication(application);
    setResubmitNotes('');
    setShowResubmitModal(true);
  };

  const openDeleteModal = (application: HostApplication) => {
    setSelectedApplication(application);
    setShowDeleteModal(true);
  };

  const openStatusModal = (application: HostApplication) => {
    setSelectedApplication(application);
    setNewStatus(application.status);
    setShowStatusModal(true);
  };

  // Close all modals
  const closeAllModals = () => {
    setShowViewModal(false);
    setShowEditModal(false);
    setShowApproveModal(false);
    setShowRejectModal(false);
    setShowResubmitModal(false);
    setShowDeleteModal(false);
    setShowStatusModal(false);
    setSelectedApplication(null);
    setRejectReason('');
    setResubmitNotes('');
    setNewStatus('');
  };

  // Approve application
  const handleApprove = async () => {
    if (!selectedApplication) return;

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const response = await axios.put(
        `${API_BASE_URL}/admin/host-applications/${selectedApplication._id}/approve`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success((t as any)?.toast?.approveSuccess || 'Application approved successfully');
        closeAllModals();
        fetchApplications();
      }
    } catch (error: any) {
      console.error('Error approving application:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.approveFailed || 'Failed to approve application');
    }
  };

  // Reject application
  const handleReject = async () => {
    if (!selectedApplication || !rejectReason.trim()) {
      toast.error((t as any)?.toast?.provideRejectionReason || 'Please provide a rejection reason');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const response = await axios.put(
        `${API_BASE_URL}/admin/host-applications/${selectedApplication._id}/reject`,
        { reason: rejectReason },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success((t as any)?.toast?.rejectSuccess || 'Application rejected');
        closeAllModals();
        fetchApplications();
      }
    } catch (error: any) {
      console.error('Error rejecting application:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.rejectFailed || 'Failed to reject application');
    }
  };

  // Request resubmission
  const handleRequestResubmission = async () => {
    if (!selectedApplication || !resubmitNotes.trim()) {
      toast.error((t as any)?.toast?.provideResubmissionNotes || 'Please provide resubmission notes');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const response = await axios.put(
        `${API_BASE_URL}/admin/host-applications/${selectedApplication._id}/request-resubmission`,
        { notes: resubmitNotes },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success((t as any)?.toast?.resubmissionSuccess || 'Resubmission requested');
        closeAllModals();
        fetchApplications();
      }
    } catch (error: any) {
      console.error('Error requesting resubmission:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.resubmissionFailed || 'Failed to request resubmission');
    }
  };

  // Delete application
  const handleDelete = async () => {
    if (!selectedApplication) return;

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const response = await axios.delete(
        `${API_BASE_URL}/admin/host-applications/${selectedApplication._id}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.status === 'success') {
        toast.success((t as any)?.toast?.deleteSuccess || 'Application deleted successfully');
        closeAllModals();
        fetchApplications();
      }
    } catch (error: any) {
      console.error('Error deleting application:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.deleteFailed || 'Failed to delete application');
    }
  };

  // Update application
  const handleUpdate = async () => {
    if (!selectedApplication) return;

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const updateData = {
        personalInfo: {
          phone: editFormData.phone,
          address: {
            street: editFormData.street,
            city: editFormData.city,
            state: editFormData.state,
            postalCode: editFormData.postalCode,
            country: 'Algeria'
          },
          dateOfBirth: editFormData.dateOfBirth,
          nationalIdNumber: editFormData.nationalIdNumber
        },
        hostIntent: {
          propertyTypes: editFormData.propertyTypes,
          vehicleTypes: editFormData.vehicleTypes,
          numberOfListings: editFormData.numberOfListings,
          experienceLevel: editFormData.experienceLevel,
          motivation: editFormData.motivation
        },
        bankingInfo: {
          bankName: editFormData.bankName,
          accountHolderName: editFormData.accountHolderName,
          accountNumber: editFormData.accountNumber,
          rib: editFormData.rib,
          swift: editFormData.swift
        },
        emergencyContact: {
          name: editFormData.emergencyContactName,
          relationship: editFormData.emergencyContactRelationship,
          phone: editFormData.emergencyContactPhone
        }
      };

      const response = await axios.put(
        `${API_BASE_URL}/admin/host-applications/${selectedApplication._id}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success((t as any)?.toast?.updateSuccess || 'Application updated successfully');
        closeAllModals();
        fetchApplications();
      }
    } catch (error: any) {
      console.error('Error updating application:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.updateFailed || 'Failed to update application');
    }
  };

  // Change status
  const handleStatusChange = async () => {
    if (!selectedApplication || !newStatus) {
      toast.error((t as any)?.toast?.selectStatus || 'Please select a status');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const response = await axios.put(
        `${API_BASE_URL}/admin/host-applications/${selectedApplication._id}/status`,
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success(response.data.message || (t as any)?.toast?.statusUpdateSuccess || 'Status updated successfully');
        closeAllModals();
        fetchApplications();
      }
    } catch (error: any) {
      console.error('Error changing status:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.statusUpdateFailed || 'Failed to change status');
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: <FaClock />, label: (t as any)?.status?.pending || 'Pending' },
      under_review: { color: 'bg-blue-100 text-blue-800', icon: <FaExclamationCircle />, label: (t as any)?.status?.underReview || 'Under Review' },
      approved: { color: 'bg-green-100 text-green-800', icon: <FaCheckCircle />, label: (t as any)?.status?.approved || 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', icon: <FaTimesCircle />, label: (t as any)?.status?.rejected || 'Rejected' },
      resubmission_required: { color: 'bg-orange-100 text-orange-800', icon: <FaExclamationCircle />, label: (t as any)?.status?.resubmissionRequired || 'Resubmission Required' }
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        <span className="ml-1">{badge.label}</span>
      </span>
    );
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (loading && applications.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35] mx-auto"></div>
          <p className="mt-4 text-gray-600">{(t as any)?.toast?.loadingApplications || 'Loading applications...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{(t as any)?.header?.title || 'Host Applications'}</h1>
          <p className="text-gray-600 mt-1">{(t as any)?.header?.subtitle || 'Manage all host applications'}</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.total || 'Total'}</p>
              <p className="text-2xl font-bold text-gray-900">{totalResults}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <FaClipboardList className="text-blue-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.pending || 'Pending'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <FaClock className="text-yellow-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.underReview || 'Under Review'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.underReview}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <FaExclamationCircle className="text-blue-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.approved || 'Approved'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <FaCheckCircle className="text-green-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.rejected || 'Rejected'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <FaTimesCircle className="text-red-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.resubmit || 'Resubmit'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.resubmissionRequired}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <FaExclamationCircle className="text-orange-600 text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{(t as any)?.filters?.filterByStatus || 'Filter by Status'}</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            >
              <option value="all">{(t as any)?.filters?.allStatus || 'All Status'}</option>
              <option value="pending">{(t as any)?.filters?.pending || 'Pending'}</option>
              <option value="under_review">{(t as any)?.filters?.underReview || 'Under Review'}</option>
              <option value="approved">{(t as any)?.filters?.approved || 'Approved'}</option>
              <option value="rejected">{(t as any)?.filters?.rejected || 'Rejected'}</option>
              <option value="resubmission_required">{(t as any)?.filters?.resubmissionRequired || 'Resubmission Required'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {(t as any)?.table?.applicant || 'Applicant'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {(t as any)?.table?.contact || 'Contact'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {(t as any)?.table?.status || 'Status'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {(t as any)?.table?.completion || 'Completion'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {(t as any)?.table?.submitted || 'Submitted'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {(t as any)?.table?.actions || 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.map((app) => (
                <tr key={app._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        {app.user?.avatar ? (
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={getAvatarUrl(app.user.avatar)}
                            alt={`${app.user?.firstName || 'User'} ${app.user?.lastName || ''}`}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              if (target.nextElementSibling) {
                                (target.nextElementSibling as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div className={`h-10 w-10 rounded-full bg-[#FF6B35] flex items-center justify-center ${app.user?.avatar ? 'hidden' : ''}`}>
                          <span className="text-white font-medium">
                            {app.user?.firstName?.charAt(0) || 'U'}{app.user?.lastName?.charAt(0) || 'N'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {app.user?.firstName || (t as any)?.table?.unknown || 'Unknown'} {app.user?.lastName || (t as any)?.table?.user || 'User'}
                        </div>
                        <div className="text-sm text-gray-500">{app.user?.email || (t as any)?.table?.na || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{app.personalInfo?.phone || (t as any)?.table?.na || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{app.personalInfo?.address?.city || (t as any)?.table?.na || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(app.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-[#FF6B35] h-2 rounded-full"
                          style={{ width: `${app.completionPercentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{app.completionPercentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : (t as any)?.table?.notSubmitted || 'Not submitted'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openViewModal(app)}
                        className="text-blue-600 hover:text-blue-900"
                        title={(t as any)?.actions?.viewDetails || 'View Details'}
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => openEditModal(app)}
                        className="text-green-600 hover:text-green-900"
                        title={(t as any)?.actions?.editApplication || 'Edit Application'}
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => openStatusModal(app)}
                        className="text-purple-600 hover:text-purple-900"
                        title={(t as any)?.actions?.changeStatus || 'Change Status'}
                      >
                        <FaSync />
                      </button>
                      {app.status === 'pending' && (
                        <>
                          <button
                            onClick={() => openApproveModal(app)}
                            className="text-green-600 hover:text-green-900"
                            title={(t as any)?.actions?.approve || 'Approve'}
                          >
                            <FaCheck />
                          </button>
                          <button
                            onClick={() => openRejectModal(app)}
                            className="text-red-600 hover:text-red-900"
                            title={(t as any)?.actions?.reject || 'Reject'}
                          >
                            <FaBan />
                          </button>
                        </>
                      )}
                      {app.status !== 'approved' && (
                        <button
                          onClick={() => openResubmitModal(app)}
                          className="text-orange-600 hover:text-orange-900"
                          title={(t as any)?.actions?.requestResubmission || 'Request Resubmission'}
                        >
                          <FaExclamationCircle />
                        </button>
                      )}
                      {app.status !== 'approved' && (
                        <button
                          onClick={() => openDeleteModal(app)}
                          className="text-red-600 hover:text-red-900"
                          title={(t as any)?.actions?.delete || 'Delete'}
                        >
                          <FaTrash />
                        </button>
                      )}
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

      {/* View Modal */}
      {showViewModal && selectedApplication && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeAllModals}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-[#FF6B35] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">{(t as any)?.viewModal?.title || 'Application Details'}</h3>
                  <button onClick={closeAllModals} className="text-white hover:text-gray-200">
                    <FaTimes />
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 max-h-96 overflow-y-auto">
                <div className="space-y-6">
                  {/* User Info */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <FaUser className="mr-2 text-[#FF6B35]" />
                      {(t as any)?.viewModal?.applicantInfo || 'Applicant Information'}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.name || 'Name'}</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedApplication.user?.firstName || (t as any)?.table?.unknown || 'Unknown'} {selectedApplication.user?.lastName || (t as any)?.table?.user || 'User'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.email || 'Email'}</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedApplication.user?.email || (t as any)?.table?.na || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Personal Info */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <FaIdCard className="mr-2 text-[#FF6B35]" />
                      {(t as any)?.viewModal?.personalInfo || 'Personal Information'}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.phone || 'Phone'}</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedApplication.personalInfo?.phone || (t as any)?.table?.na || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.nationalId || 'National ID'}</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedApplication.personalInfo?.nationalIdNumber || (t as any)?.table?.na || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.dateOfBirth || 'Date of Birth'}</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedApplication.personalInfo?.dateOfBirth ? new Date(selectedApplication.personalInfo.dateOfBirth).toLocaleDateString() : (t as any)?.table?.na || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.city || 'City'}</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedApplication.personalInfo?.address?.city || (t as any)?.table?.na || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Host Intent */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <FaHome className="mr-2 text-[#FF6B35]" />
                      {(t as any)?.viewModal?.hostIntent || 'Host Intent'}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.propertyTypes || 'Property Types'}</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedApplication.hostIntent?.propertyTypes?.join(', ') || (t as any)?.viewModal?.none || 'None'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.vehicleTypes || 'Vehicle Types'}</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedApplication.hostIntent?.vehicleTypes?.join(', ') || (t as any)?.viewModal?.none || 'None'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.expectedListings || 'Expected Listings'}</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedApplication.hostIntent?.numberOfListings || 0}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.experienceLevel || 'Experience Level'}</label>
                        <p className="mt-1 text-sm text-gray-900 capitalize">
                          {selectedApplication.hostIntent?.experienceLevel?.replace('_', ' ') || (t as any)?.table?.na || 'N/A'}
                        </p>
                      </div>
                      {selectedApplication.hostIntent?.motivation && (
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.motivation || 'Motivation'}</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedApplication.hostIntent.motivation}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Banking Info */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <FaUniversity className="mr-2 text-[#FF6B35]" />
                      {(t as any)?.viewModal?.bankingInfo || 'Banking Information'}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.bankName || 'Bank Name'}</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedApplication.bankingInfo?.bankName || (t as any)?.table?.na || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.accountHolder || 'Account Holder'}</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedApplication.bankingInfo?.accountHolderName || (t as any)?.table?.na || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.rib || 'RIB'}</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedApplication.bankingInfo?.rib || (t as any)?.table?.na || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end">
                <button
                  onClick={closeAllModals}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {(t as any)?.viewModal?.close || 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedApplication && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeAllModals}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-[#FF6B35] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">{(t as any)?.editModal?.title || 'Edit Application'}</h3>
                  <button onClick={closeAllModals} className="text-white hover:text-gray-200">
                    <FaTimes />
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{(t as any)?.editModal?.phone || 'Phone'}</label>
                      <input
                        type="tel"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{(t as any)?.editModal?.city || 'City'}</label>
                      <input
                        type="text"
                        value={editFormData.city}
                        onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                        className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{(t as any)?.editModal?.nationalIdNumber || 'National ID Number'}</label>
                      <input
                        type="text"
                        value={editFormData.nationalIdNumber}
                        onChange={(e) => setEditFormData({ ...editFormData, nationalIdNumber: e.target.value })}
                        className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{(t as any)?.editModal?.numberOfListings || 'Number of Listings'}</label>
                      <input
                        type="number"
                        min="1"
                        value={editFormData.numberOfListings}
                        onChange={(e) => setEditFormData({ ...editFormData, numberOfListings: parseInt(e.target.value) || 1 })}
                        className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{(t as any)?.editModal?.bankName || 'Bank Name'}</label>
                      <input
                        type="text"
                        value={editFormData.bankName}
                        onChange={(e) => setEditFormData({ ...editFormData, bankName: e.target.value })}
                        className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{(t as any)?.editModal?.rib || 'RIB'}</label>
                      <input
                        type="text"
                        value={editFormData.rib}
                        onChange={(e) => setEditFormData({ ...editFormData, rib: e.target.value })}
                        className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={closeAllModals}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {(t as any)?.editModal?.cancel || 'Cancel'}
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#ff8255] transition-colors flex items-center space-x-2"
                >
                  <FaSave />
                  <span>{(t as any)?.editModal?.saveChanges || 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedApplication && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeAllModals}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-6 py-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <FaCheck className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{(t as any)?.approveModal?.title || 'Approve Application'}</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {(t as any)?.approveModal?.message || 'Are you sure you want to approve this application? This will upgrade the user to host status.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={closeAllModals}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {(t as any)?.approveModal?.cancel || 'Cancel'}
                </button>
                <button
                  onClick={handleApprove}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {(t as any)?.approveModal?.approve || 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedApplication && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeAllModals}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-6 py-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <FaBan className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{(t as any)?.rejectModal?.title || 'Reject Application'}</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {(t as any)?.rejectModal?.message || 'Please provide a reason for rejecting this application:'}
                    </p>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={4}
                      className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      placeholder={(t as any)?.rejectModal?.placeholder || 'Enter rejection reason...'}
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={closeAllModals}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {(t as any)?.rejectModal?.cancel || 'Cancel'}
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  disabled={!rejectReason.trim()}
                >
                  {(t as any)?.rejectModal?.reject || 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Resubmission Modal */}
      {showResubmitModal && selectedApplication && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeAllModals}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-6 py-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-orange-100">
                    <FaExclamationCircle className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{(t as any)?.resubmitModal?.title || 'Request Resubmission'}</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {(t as any)?.resubmitModal?.message || 'Please provide notes for what needs to be corrected:'}
                    </p>
                    <textarea
                      value={resubmitNotes}
                      onChange={(e) => setResubmitNotes(e.target.value)}
                      rows={4}
                      className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      placeholder={(t as any)?.resubmitModal?.placeholder || 'Enter resubmission notes...'}
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={closeAllModals}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {(t as any)?.resubmitModal?.cancel || 'Cancel'}
                </button>
                <button
                  onClick={handleRequestResubmission}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  disabled={!resubmitNotes.trim()}
                >
                  {(t as any)?.resubmitModal?.requestResubmission || 'Request Resubmission'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedApplication && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeAllModals}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-6 py-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <FaExclamationTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{(t as any)?.deleteModal?.title || 'Delete Application'}</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {(t as any)?.deleteModal?.message || 'Are you sure you want to delete this application? This action cannot be undone.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={closeAllModals}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {(t as any)?.deleteModal?.cancel || 'Cancel'}
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  {(t as any)?.deleteModal?.delete || 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {showStatusModal && selectedApplication && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeAllModals}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-[#FF6B35] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">{(t as any)?.statusModal?.title || 'Change Application Status'}</h3>
                  <button onClick={closeAllModals} className="text-white hover:text-gray-200">
                    <FaTimes />
                  </button>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    {(t as any)?.statusModal?.currentStatus || 'Current Status'}: <span className="font-semibold capitalize">{selectedApplication.status.replace('_', ' ')}</span>
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    {(t as any)?.statusModal?.applicant || 'Applicant'}: {selectedApplication.user?.firstName || (t as any)?.table?.unknown || 'Unknown'} {selectedApplication.user?.lastName || (t as any)?.table?.user || 'User'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{(t as any)?.statusModal?.newStatus || 'New Status'}</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  >
                    <option value="pending">{(t as any)?.statusModal?.pending || 'Pending'}</option>
                    <option value="under_review">{(t as any)?.statusModal?.underReview || 'Under Review'}</option>
                    <option value="approved">{(t as any)?.statusModal?.approved || 'Approved (Guest → Host)'}</option>
                    <option value="rejected">{(t as any)?.statusModal?.rejected || 'Rejected'}</option>
                    <option value="resubmission_required">{(t as any)?.statusModal?.resubmissionRequired || 'Resubmission Required'}</option>
                  </select>
                  {newStatus === 'approved' && (
                    <p className="mt-2 text-sm text-green-600 font-medium">
                      {(t as any)?.statusModal?.warningApproved || '⚠️ This will upgrade the user to host status!'}
                    </p>
                  )}
                  {newStatus === 'rejected' && (
                    <p className="mt-2 text-sm text-red-600">
                      {(t as any)?.statusModal?.noteRejected || 'Note: Consider using the Reject button to add a reason.'}
                    </p>
                  )}
                  {newStatus === 'resubmission_required' && (
                    <p className="mt-2 text-sm text-orange-600">
                      {(t as any)?.statusModal?.noteResubmission || 'Note: Consider using the Request Resubmission button to add notes.'}
                    </p>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={closeAllModals}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {(t as any)?.statusModal?.cancel || 'Cancel'}
                </button>
                <button
                  onClick={handleStatusChange}
                  className="px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#ff8255] transition-colors flex items-center space-x-2"
                  disabled={!newStatus || newStatus === selectedApplication.status}
                >
                  <FaSync />
                  <span>{(t as any)?.statusModal?.updateStatus || 'Update Status'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
