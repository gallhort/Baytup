'use client';

import { useState, useEffect } from 'react';
import {
  FaDollarSign, FaCalendarAlt, FaMoneyBillWave, FaHourglassHalf,
  FaCheckCircle, FaTimesCircle, FaFilter, FaChevronLeft, FaChevronRight,
  FaTimes, FaEye, FaUniversity, FaClock, FaInfoCircle, FaUser,
  FaCheck, FaBan, FaExclamationTriangle, FaEdit
} from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';
import moment from 'moment';
import { useTranslation } from '@/hooks/useTranslation';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { formatPrice } from '@/utils/priceUtils';

interface BankAccount {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  rib: string;
  iban?: string;
  swiftCode?: string;
}

interface Host {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}

interface Payout {
  _id: string;
  host: Host;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  bankAccount: BankAccount;
  requestedAt: string;
  processedAt?: string;
  processedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  completedAt?: string;
  transactionId?: string;
  hostNotes?: string;
  adminNotes?: string;
  rejectionReason?: string;
  finalAmount: number;
  platformFee: number;
  processingFee: number;
}

interface PayoutStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  rejected: number;
  totalAmount: number;
  completedAmount: number;
  pendingAmount: number;
}

export default function AdminPayoutsPage() {
  const router = useRouter();
  const { state } = useApp();
  const user = state.user;
  const t = useTranslation('payouts');
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'complete'>('approve');
  const [transactionId, setTransactionId] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error((t as any)?.errors?.adminOnly || 'Admin access required');
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchPayouts();
    }
  }, [statusFilter, currentPage, user]);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params: any = {
        page: currentPage,
        limit: 10
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/payouts/admin/all`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params
        }
      );

      setPayouts(response.data.data.payouts);
      setStats(response.data.data.stats);
      setTotalPages(response.data.pagination.pages);
    } catch (error: any) {
      console.error('Error fetching payouts:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.loadFailed || 'Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedPayout) return;

    try {
      if (actionType === 'reject' && !rejectionReason.trim()) {
        toast.error((t as any)?.validation?.rejectionReasonRequired || 'Please provide a rejection reason');
        return;
      }

      if (actionType === 'complete' && !transactionId.trim()) {
        toast.error((t as any)?.validation?.transactionIdRequired || 'Please provide a transaction ID');
        return;
      }

      setProcessing(true);

      const token = localStorage.getItem('token');
      const payload: any = {
        status: actionType === 'approve' ? 'processing' : actionType === 'complete' ? 'completed' : 'rejected'
      };

      if (actionType === 'reject') {
        payload.rejectionReason = rejectionReason;
      }

      if (actionType === 'complete') {
        payload.transactionId = transactionId;
      }

      if (adminNotes.trim()) {
        payload.adminNotes = adminNotes;
      }

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/payouts/admin/${selectedPayout._id}/status`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success((t as any)?.toast?.updateSuccess || 'Payout updated successfully');
      setShowActionModal(false);
      setShowDetailsModal(false);
      setTransactionId('');
      setAdminNotes('');
      setRejectionReason('');
      fetchPayouts();
    } catch (error: any) {
      console.error('Error updating payout:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.updateFailed || 'Failed to update payout');
    } finally {
      setProcessing(false);
    }
  };

  const openActionModal = (payout: Payout, type: 'approve' | 'reject' | 'complete') => {
    setSelectedPayout(payout);
    setActionType(type);
    setShowActionModal(true);
    setAdminNotes(payout.adminNotes || '');
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      'completed': { bg: 'bg-green-100', text: 'text-green-800', icon: FaCheckCircle, label: (t as any)?.status?.completed || 'Completed' },
      'processing': { bg: 'bg-blue-100', text: 'text-blue-800', icon: FaClock, label: (t as any)?.status?.processing || 'Processing' },
      'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: FaHourglassHalf, label: (t as any)?.status?.pending || 'Pending' },
      'rejected': { bg: 'bg-red-100', text: 'text-red-800', icon: FaTimesCircle, label: (t as any)?.status?.rejected || 'Rejected' },
      'cancelled': { bg: 'bg-gray-100', text: 'text-gray-800', icon: FaTimes, label: (t as any)?.status?.cancelled || 'Cancelled' }
    };
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: FaInfoCircle, label: status };
  };

  const formatDate = (date: string) => {
    return moment(date).format('MMM D, YYYY HH:mm');
  };

 

  const clearFilters = () => {
    setStatusFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const filteredPayouts = payouts.filter(payout => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      `${payout.host.firstName} ${payout.host.lastName}`.toLowerCase().includes(search) ||
      payout.host.email.toLowerCase().includes(search) ||
      payout.bankAccount.bankName.toLowerCase().includes(search) ||
      payout.bankAccount.accountHolderName.toLowerCase().includes(search)
    );
  });

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-500">{(t as any)?.loading || 'Loading payouts...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{(t as any)?.header?.title || 'Payout Management'}</h1>
          <p className="text-gray-500 mt-1">{(t as any)?.header?.subtitle || 'Manage host payout requests'}</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{(t as any)?.stats?.total || 'Total Requests'}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <FaMoneyBillWave className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{(t as any)?.stats?.pending || 'Pending'}</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
                <p className="text-xs text-gray-500 mt-1">{formatPrice(stats.pendingAmount, 'DZD')}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <FaHourglassHalf className="text-yellow-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{(t as any)?.stats?.processing || 'Processing'}</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.processing}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <FaClock className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{(t as any)?.stats?.completed || 'Completed'}</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
                <p className="text-xs text-gray-500 mt-1">{formatPrice(stats.completedAmount, 'DZD')}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <FaCheckCircle className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{(t as any)?.stats?.rejected || 'Rejected'}</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <FaTimesCircle className="text-red-600 text-xl" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center space-x-4 mb-4">
          <FaFilter className="text-gray-400 text-lg" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder={(t as any)?.filters?.searchPlaceholder || 'Search by host name, email, or bank...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all"
            />

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all"
            >
              <option value="all">{(t as any)?.filters?.allStatus || 'All Status'}</option>
              <option value="pending">{(t as any)?.filters?.pending || 'Pending'}</option>
              <option value="processing">{(t as any)?.filters?.processing || 'Processing'}</option>
              <option value="completed">{(t as any)?.filters?.completed || 'Completed'}</option>
              <option value="rejected">{(t as any)?.filters?.rejected || 'Rejected'}</option>
            </select>

            <button
              onClick={clearFilters}
              className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
            >
              {(t as any)?.filters?.clearFilters || 'Clear Filters'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredPayouts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-yellow-100 mb-4">
              <FaMoneyBillWave className="text-[#FF6B35] text-3xl" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{(t as any)?.emptyState?.title || 'No Payout Requests'}</h3>
            <p className="text-gray-500">
              {(t as any)?.emptyState?.message || 'No payout requests match your filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-[#FF6B35] to-[#ff8255] text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any)?.table?.host || 'Host'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any)?.table?.amount || 'Amount'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any)?.table?.bankAccount || 'Bank Account'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any)?.table?.requested || 'Requested'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any)?.table?.status || 'Status'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any)?.table?.actions || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayouts.map((payout) => {
                  const statusBadge = getStatusBadge(payout.status);

                  return (
                    <tr key={payout._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-orange-200 to-yellow-200 flex-shrink-0">
                            {payout.host.avatar ? (
                              <img
                                src={payout.host.avatar}
                                alt={payout.host.firstName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#FF6B35] font-bold text-sm">
                                {payout.host.firstName[0]}{payout.host.lastName[0]}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {payout.host.firstName} {payout.host.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{payout.host.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-lg font-bold text-[#FF6B35]">
                          {formatPrice(payout.amount, payout.currency)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(t as any)?.table?.net || 'Net'}: {formatPrice(payout.finalAmount, payout.currency)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="font-semibold text-gray-900">{payout.bankAccount.bankName}</p>
                          <p className="text-gray-600">{payout.bankAccount.accountHolderName}</p>
                          <p className="text-gray-500 font-mono text-xs">{payout.bankAccount.rib}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-gray-900 font-medium">{formatDate(payout.requestedAt)}</p>
                          {payout.completedAt && (
                            <p className="text-green-600 text-xs mt-1">
                              {(t as any)?.table?.completed || 'Completed'}: {formatDate(payout.completedAt)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                          <statusBadge.icon className="mr-1" />
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedPayout(payout);
                              setShowDetailsModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={(t as any)?.actions?.viewDetails || 'View Details'}
                          >
                            <FaEye size={16} />
                          </button>

                          {payout.status === 'pending' && (
                            <>
                              <button
                                onClick={() => openActionModal(payout, 'approve')}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title={(t as any)?.actions?.approve || 'Approve'}
                              >
                                <FaCheck size={16} />
                              </button>
                              <button
                                onClick={() => openActionModal(payout, 'reject')}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title={(t as any)?.actions?.reject || 'Reject'}
                              >
                                <FaBan size={16} />
                              </button>
                            </>
                          )}

                          {payout.status === 'processing' && (
                            <button
                              onClick={() => openActionModal(payout, 'complete')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title={(t as any)?.actions?.complete || 'Mark as Complete'}
                            >
                              <FaCheckCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FaChevronLeft />
          </button>
          <span className="text-gray-700 font-medium">
            {(t as any)?.pagination?.page || 'Page'} {currentPage} {(t as any)?.pagination?.of || 'of'} {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FaChevronRight />
          </button>
        </div>
      )}

      {showActionModal && selectedPayout && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
            <div className={`p-6 rounded-t-2xl ${
              actionType === 'reject' ? 'bg-gradient-to-r from-red-500 to-red-600' :
              actionType === 'complete' ? 'bg-gradient-to-r from-green-500 to-green-600' :
              'bg-gradient-to-r from-blue-500 to-blue-600'
            } text-white`}>
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">
                  {actionType === 'approve' && ((t as any)?.modal?.approve?.title || 'Approve Payout')}
                  {actionType === 'reject' && ((t as any)?.modal?.reject?.title || 'Reject Payout')}
                  {actionType === 'complete' && ((t as any)?.modal?.complete?.title || 'Complete Payout')}
                </h3>
                <button
                  onClick={() => setShowActionModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{(t as any)?.modal?.host || 'Host'}</span>
                  <span className="font-semibold text-gray-900">
                    {selectedPayout.host.firstName} {selectedPayout.host.lastName}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{(t as any)?.modal?.amount || 'Amount'}</span>
                  <span className="font-bold text-[#FF6B35] text-lg">
                    {formatPrice(selectedPayout.amount, selectedPayout.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{(t as any)?.modal?.bank || 'Bank'}</span>
                  <span className="font-semibold text-gray-900">{selectedPayout.bankAccount.bankName}</span>
                </div>
              </div>

              {actionType === 'reject' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any)?.modal?.reject?.reasonLabel || 'Rejection Reason'} *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder={(t as any)?.modal?.reject?.reasonPlaceholder || 'Provide a reason for rejection...'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  />
                </div>
              )}

              {actionType === 'complete' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any)?.modal?.complete?.transactionIdLabel || 'Transaction ID'} *
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder={(t as any)?.modal?.complete?.transactionIdPlaceholder || 'Enter transaction ID...'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {(t as any)?.modal?.adminNotes || 'Admin Notes'} ({(t as any)?.modal?.optional || 'optional'})
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  placeholder={(t as any)?.modal?.adminNotesPlaceholder || 'Add notes visible to the host...'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent resize-none"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowActionModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  {(t as any)?.modal?.cancel || 'Cancel'}
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={processing}
                  className={`flex-1 px-4 py-3 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    actionType === 'reject' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                    actionType === 'complete' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                    'bg-gradient-to-r from-blue-500 to-blue-600'
                  }`}
                >
                  {processing ? ((t as any)?.modal?.processing || 'Processing...') : (
                    actionType === 'approve' ? ((t as any)?.modal?.approve?.button || 'Approve Payout') :
                    actionType === 'reject' ? ((t as any)?.modal?.reject?.button || 'Reject Payout') :
                    ((t as any)?.modal?.complete?.button || 'Mark as Complete')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && selectedPayout && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-[#FF6B35] to-[#ff8255] text-white p-6 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">{(t as any)?.details?.title || 'Payout Details'}</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center space-x-4 pb-6 border-b">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-orange-200 to-yellow-200 flex-shrink-0">
                  {selectedPayout.host.avatar ? (
                    <img
                      src={selectedPayout.host.avatar}
                      alt={selectedPayout.host.firstName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#FF6B35] font-bold text-2xl">
                      {selectedPayout.host.firstName[0]}{selectedPayout.host.lastName[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-gray-900 mb-1">
                    {selectedPayout.host.firstName} {selectedPayout.host.lastName}
                  </h4>
                  <p className="text-gray-600">{selectedPayout.host.email}</p>
                </div>
                <div className={`inline-flex items-center px-4 py-2 text-sm font-semibold rounded-full ${
                  getStatusBadge(selectedPayout.status).bg
                } ${getStatusBadge(selectedPayout.status).text}`}>
                  {getStatusBadge(selectedPayout.status).label}
                </div>
              </div>

              <div className="pb-6 border-b">
                <h5 className="font-bold text-gray-900 mb-4">{(t as any)?.details?.payoutAmount || 'Payout Amount'}</h5>
                <div className="space-y-3 bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex justify-between text-gray-700">
                    <span>{(t as any)?.details?.requestedAmount || 'Requested Amount'}</span>
                    <span className="font-semibold">{formatPrice(selectedPayout.amount, selectedPayout.currency)}</span>
                  </div>
                  {selectedPayout.platformFee > 0 && (
                    <div className="flex justify-between text-gray-700">
                      <span>{(t as any)?.details?.platformFee || 'Platform Fee'}</span>
                      <span className="font-semibold">-{formatPrice(selectedPayout.platformFee, selectedPayout.currency)}</span>
                    </div>
                  )}
                  {selectedPayout.processingFee > 0 && (
                    <div className="flex justify-between text-gray-700">
                      <span>{(t as any)?.details?.processingFee || 'Processing Fee'}</span>
                      <span className="font-semibold">-{formatPrice(selectedPayout.processingFee, selectedPayout.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-blue-800 pt-3 border-t-2 border-blue-300">
                    <span>{(t as any)?.details?.finalAmount || 'Final Amount'}</span>
                    <span>{formatPrice(selectedPayout.finalAmount, selectedPayout.currency)}</span>
                  </div>
                </div>
              </div>

              <div className="pb-6 border-b">
                <h5 className="font-bold text-gray-900 mb-4">{(t as any)?.details?.bankAccount || 'Bank Account Details'}</h5>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">{(t as any)?.details?.bankName || 'Bank Name'}</p>
                      <p className="font-semibold text-gray-900">{selectedPayout.bankAccount.bankName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{(t as any)?.details?.accountHolder || 'Account Holder'}</p>
                      <p className="font-semibold text-gray-900">{selectedPayout.bankAccount.accountHolderName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{(t as any)?.details?.accountNumber || 'Account Number'}</p>
                      <p className="font-semibold text-gray-900">{selectedPayout.bankAccount.accountNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">RIB</p>
                      <p className="font-semibold text-gray-900 font-mono">{selectedPayout.bankAccount.rib}</p>
                    </div>
                    {selectedPayout.bankAccount.iban && (
                      <div>
                        <p className="text-xs text-gray-500">IBAN</p>
                        <p className="font-semibold text-gray-900 font-mono">{selectedPayout.bankAccount.iban}</p>
                      </div>
                    )}
                    {selectedPayout.bankAccount.swiftCode && (
                      <div>
                        <p className="text-xs text-gray-500">{(t as any)?.details?.swiftCode || 'SWIFT Code'}</p>
                        <p className="font-semibold text-gray-900 font-mono">{selectedPayout.bankAccount.swiftCode}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pb-6 border-b">
                <h5 className="font-bold text-gray-900 mb-4">{(t as any)?.details?.timeline || 'Timeline'}</h5>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <FaCalendarAlt className="text-[#FF6B35]" />
                    <div>
                      <p className="text-sm text-gray-500">{(t as any)?.details?.requested || 'Requested'}</p>
                      <p className="font-semibold text-gray-900">{formatDate(selectedPayout.requestedAt)}</p>
                    </div>
                  </div>
                  {selectedPayout.processedAt && (
                    <div className="flex items-center space-x-3">
                      <FaClock className="text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-500">{(t as any)?.details?.processed || 'Processed'}</p>
                        <p className="font-semibold text-gray-900">{formatDate(selectedPayout.processedAt)}</p>
                      </div>
                    </div>
                  )}
                  {selectedPayout.completedAt && (
                    <div className="flex items-center space-x-3">
                      <FaCheckCircle className="text-green-600" />
                      <div>
                        <p className="text-sm text-gray-500">{(t as any)?.details?.completed || 'Completed'}</p>
                        <p className="font-semibold text-gray-900">{formatDate(selectedPayout.completedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedPayout.hostNotes && (
                <div className="pb-6 border-b">
                  <h5 className="font-bold text-gray-900 mb-2">{(t as any)?.details?.hostNotes || 'Host Notes'}</h5>
                  <p className="text-gray-700 bg-gray-50 rounded-lg p-3">{selectedPayout.hostNotes}</p>
                </div>
              )}

              {selectedPayout.adminNotes && (
                <div className="pb-6 border-b">
                  <h5 className="font-bold text-gray-900 mb-2">{(t as any)?.details?.adminNotes || 'Admin Notes'}</h5>
                  <p className="text-gray-700 bg-blue-50 rounded-lg p-3">{selectedPayout.adminNotes}</p>
                </div>
              )}

              {selectedPayout.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <FaExclamationTriangle className="text-red-600 mt-1 mr-2 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-900 mb-1">{(t as any)?.details?.rejectionReason || 'Rejection Reason'}</p>
                      <p className="text-red-700">{selectedPayout.rejectionReason}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedPayout.transactionId && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-700 mb-1">{(t as any)?.details?.transactionId || 'Transaction ID'}</p>
                  <p className="font-mono font-semibold text-green-900">{selectedPayout.transactionId}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
