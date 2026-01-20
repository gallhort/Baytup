'use client';

import { useState, useEffect } from 'react';
import {
  FaDollarSign, FaCalendarAlt, FaMoneyBillWave, FaHourglassHalf,
  FaCheckCircle, FaTimesCircle, FaFilter, FaChevronLeft, FaChevronRight,
  FaMapMarkerAlt, FaBed, FaCar, FaTimes, FaEye, FaWallet,
  FaUser, FaClock, FaFileInvoiceDollar, FaChartLine, FaDownload,
  FaInfoCircle, FaUniversity, FaHistory, FaExclamationTriangle
} from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import moment from 'moment';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import { formatPrice } from '@/utils/priceUtils';
interface Listing {
  _id: string;
  title: string;
  category: string;
  images: { url: string }[];
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
  };
}

interface Guest {
  _id: string;
  firstName: string;
  lastName: string;
  avatar: string;
}

interface Transaction {
  _id: string;
  bookingDates: {
    startDate: string;
    endDate: string;
    nights: number;
  };
  listing: Listing;
  guest: Guest;
  earnings: {
    subtotal: number;
    cleaningFee: number;
    hostEarning: number;
    platformFee: number;
    totalAmount: number;
    currency: string;
  };
  payment: {
    method: string;
    status: string;
    paidAt: string;
    transactionId: string;
  };
  status: string;
  createdAt: string;
}

interface EarningsOverview {
  totalEarnings: number;
  monthlyEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  totalTransactions: number;
  paidTransactions: number;
  pendingTransactions: number;
  averageEarningPerBooking: number;
  currency: string;
}

interface ListingEarnings {
  listingId: string;
  listingTitle: string;
  totalEarnings: number;
  bookingCount: number;
  averageEarning: number;
}

interface BankAccount {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  rib: string;
  iban?: string;
  swiftCode?: string;
}

interface Payout {
  _id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  bankAccount: BankAccount;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  transactionId?: string;
  hostNotes?: string;
  adminNotes?: string;
  rejectionReason?: string;
  finalAmount: number;
}

export default function EarningsPage() {
  const t = useTranslation('earnings');
  const { state } = useApp();
  const user = state.user;
  const [overview, setOverview] = useState<EarningsOverview | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [listingEarnings, setListingEarnings] = useState<ListingEarnings[]>([]);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [listingFilter, setListingFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Payout states
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showBankAccountModal, setShowBankAccountModal] = useState(false);
  const [showPayoutsHistory, setShowPayoutsHistory] = useState(false);
  const [bankAccount, setBankAccount] = useState<BankAccount>({
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    rib: '',
    iban: '',
    swiftCode: ''
  });
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [hostNotes, setHostNotes] = useState('');
  const [processingWithdraw, setProcessingWithdraw] = useState(false);

  useEffect(() => {
    // ✅ FIX BQ-55: Wait for user to be loaded before fetching data
    if (!user) return;

    fetchEarningsData();
    fetchMyListings();
    fetchPayouts();
    fetchAvailableBalance();
    fetchBankAccount();
  }, [user]);

  useEffect(() => {
    // ✅ FIX BQ-55: Wait for user to be loaded before fetching data
    if (!user) return;

    fetchTransactions();
  }, [user, statusFilter, listingFilter, dateRange, currentPage]);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [overviewRes, listingEarningsRes] = await Promise.all([
        axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/earnings/overview`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/earnings/by-listing`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      ]);

      setOverview(overviewRes.data.data);
      setListingEarnings(listingEarningsRes.data.data.earnings);
    } catch (error: any) {
      console.error('Error fetching earnings data:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.loadEarningsFailed || 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const params: any = {
        page: currentPage,
        limit: 10
      };

      if (statusFilter !== 'all') {
        params.paymentStatus = statusFilter;
      }

      if (listingFilter !== 'all') {
        params.listingId = listingFilter;
      }

      if (dateRange.startDate) {
        params.startDate = dateRange.startDate;
      }

      if (dateRange.endDate) {
        params.endDate = dateRange.endDate;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/earnings/transactions`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params
        }
      );

      setTransactions(response.data.data.transactions);
      setTotalPages(response.data.pagination.pages);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.loadTransactionsFailed || 'Failed to load transactions');
    }
  };

  const fetchMyListings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/listings/my/listings`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 100 }
        }
      );
      setMyListings(response.data.data.listings);
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  const fetchPayouts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/payouts/my-payouts`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPayouts(response.data.data.payouts);
    } catch (error: any) {
      console.error('Error fetching payouts:', error);
    }
  };

  const fetchAvailableBalance = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/payouts/available-balance`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAvailableBalance(response.data.data.availableBalance);
    } catch (error: any) {
      console.error('Error fetching available balance:', error);
    }
  };

  const fetchBankAccount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/payouts/bank-account`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.data.bankAccount) {
        setBankAccount(response.data.data.bankAccount);
      }
    } catch (error: any) {
      console.error('Error fetching bank account:', error);
    }
  };

  const handleSaveBankAccount = async () => {
    try {
      if (!bankAccount.bankName || !bankAccount.accountHolderName ||
          !bankAccount.accountNumber || !bankAccount.rib) {
        toast.error((t as any)?.payout?.validation?.requiredFields || 'Please fill all required fields');
        return;
      }

      if (!/^\d{20}$/.test(bankAccount.rib)) {
        toast.error((t as any)?.payout?.validation?.ribFormat || 'RIB must be exactly 20 digits');
        return;
      }

      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/payouts/bank-account`,
        bankAccount,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success((t as any)?.payout?.toast?.bankAccountSaved || 'Bank account saved successfully');
      setShowBankAccountModal(false);
    } catch (error: any) {
      console.error('Error saving bank account:', error);
      toast.error(error.response?.data?.message || (t as any)?.payout?.toast?.bankAccountFailed || 'Failed to save bank account');
    }
  };

  const handleWithdrawRequest = async () => {
    try {
      const amount = parseFloat(withdrawAmount);

      if (!amount || amount <= 0) {
        toast.error((t as any)?.payout?.validation?.invalidAmount || 'Please enter a valid amount');
        return;
      }

      if (amount > availableBalance) {
        toast.error((t as any)?.payout?.validation?.insufficientBalance || 'Insufficient balance');
        return;
      }

      if (amount < 1000) {
        toast.error((t as any)?.payout?.validation?.minimumAmount || 'Minimum withdrawal amount is 1000 DZD');
        return;
      }

      if (!bankAccount.rib) {
        toast.error((t as any)?.payout?.validation?.noBankAccount || 'Please add your bank account details first');
        setShowWithdrawModal(false);
        setShowBankAccountModal(true);
        return;
      }

      setProcessingWithdraw(true);

      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/payouts/request`,
        {
          amount,
          bankAccount,
          hostNotes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success((t as any)?.payout?.toast?.withdrawSuccess || 'Withdrawal request submitted successfully');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setHostNotes('');

      // Refresh data
      fetchPayouts();
      fetchAvailableBalance();
    } catch (error: any) {
      console.error('Error requesting withdrawal:', error);
      toast.error(error.response?.data?.message || (t as any)?.payout?.toast?.withdrawFailed || 'Failed to submit withdrawal request');
    } finally {
      setProcessingWithdraw(false);
    }
  };

  const handleCancelPayout = async (payoutId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/payouts/${payoutId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success((t as any)?.payout?.toast?.cancelSuccess || 'Payout cancelled successfully');
      fetchPayouts();
      fetchAvailableBalance();
    } catch (error: any) {
      console.error('Error cancelling payout:', error);
      toast.error(error.response?.data?.message || (t as any)?.payout?.toast?.cancelFailed || 'Failed to cancel payout');
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const badges: any = {
      'completed': { bg: 'bg-green-100', text: 'text-green-800', icon: FaCheckCircle, label: (t as any)?.status?.completed || 'Completed' },
      'paid': { bg: 'bg-green-100', text: 'text-green-800', icon: FaCheckCircle, label: (t as any)?.status?.paid || 'Paid' },
      'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: FaHourglassHalf, label: (t as any)?.status?.pending || 'Pending' },
      'processing': { bg: 'bg-blue-100', text: 'text-blue-800', icon: FaClock, label: (t as any)?.status?.processing || 'Processing' },
      'failed': { bg: 'bg-red-100', text: 'text-red-800', icon: FaTimesCircle, label: (t as any)?.status?.failed || 'Failed' }
    };
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: FaInfoCircle, label: status };
  };

  const getPayoutStatusBadge = (status: string) => {
    const badges: any = {
      'completed': { bg: 'bg-green-100', text: 'text-green-800', icon: FaCheckCircle, label: (t as any)?.payout?.status?.completed || 'Completed' },
      'processing': { bg: 'bg-blue-100', text: 'text-blue-800', icon: FaClock, label: (t as any)?.payout?.status?.processing || 'Processing' },
      'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: FaHourglassHalf, label: (t as any)?.payout?.status?.pending || 'Pending' },
      'rejected': { bg: 'bg-red-100', text: 'text-red-800', icon: FaTimesCircle, label: (t as any)?.payout?.status?.rejected || 'Rejected' },
      'cancelled': { bg: 'bg-gray-100', text: 'text-gray-800', icon: FaTimes, label: (t as any)?.payout?.status?.cancelled || 'Cancelled' }
    };
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: FaInfoCircle, label: status };
  };

  const formatDate = (date: string) => {
    return moment(date).format('MMM D, YYYY');
  };



  const clearFilters = () => {
    setStatusFilter('all');
    setListingFilter('all');
    setDateRange({ startDate: '', endDate: '' });
    setSearchQuery('');
    setCurrentPage(1);
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      (transaction.listing?.title?.toLowerCase().includes(search)) ||
      `${transaction.guest.firstName} ${transaction.guest.lastName}`.toLowerCase().includes(search) ||
      (transaction.listing?.address?.city?.toLowerCase().includes(search))
    );
  });

  // ✅ FIX BQ-55: Show loading while user or data is loading
  if (!user || (loading && !overview)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-500">{(t as any)?.loading?.earnings || 'Loading earnings...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{(t as any)?.header?.title || 'My Earnings'}</h1>
          <p className="text-gray-500 mt-1">{(t as any)?.header?.subtitle || 'Track your earnings and payouts'}</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <button
            onClick={() => setShowPayoutsHistory(!showPayoutsHistory)}
            className="px-5 py-2.5 rounded-lg font-medium transition-all duration-200 bg-white border-2 border-[#FF6B35] text-[#FF6B35] hover:bg-[#FF6B35] hover:text-white shadow-md hover:shadow-lg flex items-center"
          >
            <FaHistory className="mr-2" />
            {(t as any)?.payout?.viewHistory || 'Payout History'}
          </button>
          <button
            onClick={() => setShowBankAccountModal(true)}
            className="px-5 py-2.5 rounded-lg font-medium transition-all duration-200 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 shadow-md hover:shadow-lg flex items-center"
          >
            <FaUniversity className="mr-2" />
            {(t as any)?.payout?.bankAccount || 'Bank Account'}
          </button>
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={availableBalance <= 0}
            className="px-5 py-2.5 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-[#FF6B35] to-[#ff8255] text-white shadow-lg hover:shadow-xl flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaMoneyBillWave className="mr-2" />
            {(t as any)?.payout?.withdraw || 'Withdraw'}
          </button>
        </div>
      </div>

      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{(t as any)?.stats?.totalEarnings || 'Total Earnings'}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatPrice(overview.totalEarnings, overview.currency)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{overview.totalTransactions} {overview.totalTransactions === 1 ? (t as any)?.stats?.transaction || 'transaction' : (t as any)?.stats?.transactions || 'transactions'}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <FaChartLine className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{(t as any)?.stats?.monthlyEarnings || 'Monthly Earnings'}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatPrice(overview.monthlyEarnings, overview.currency)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{(t as any)?.stats?.currentMonth || 'This month'}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <FaCalendarAlt className="text-yellow-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{(t as any)?.stats?.available || 'Available Balance'}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatPrice(overview.availableBalance, overview.currency)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{overview.paidTransactions} {(t as any)?.stats?.paidOut || 'paid out'}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <FaWallet className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{(t as any)?.stats?.pending || 'Pending Balance'}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatPrice(overview.pendingBalance, overview.currency)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{overview.pendingTransactions} {(t as any)?.stats?.pendingCount || 'pending'}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <FaHourglassHalf className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>
        </div>
      )}

      {listingEarnings.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{(t as any)?.listingEarnings?.title || 'Earnings by Listing'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listingEarnings.slice(0, 6).map((listing) => (
              <div key={listing.listingId} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2 truncate">{listing.listingTitle}</h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{(t as any)?.listingEarnings?.totalEarned || 'Total Earned'}</span>
                    <span className="font-bold text-[#FF6B35]">
                      {formatPrice(listing.totalEarnings, overview?.currency || 'DZD')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{(t as any)?.listingEarnings?.bookings || 'Bookings'}</span>
                    <span className="font-semibold text-gray-900">{listing.bookingCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{(t as any)?.listingEarnings?.avgPerBooking || 'Avg per Booking'}</span>
                    <span className="font-semibold text-gray-900">
                      {formatPrice(listing.averageEarning, overview?.currency || 'DZD')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center space-x-4 mb-4">
          <FaFilter className="text-gray-400 text-lg" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder={(t as any)?.filters?.searchPlaceholder || 'Search...'}
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
              <option value="completed">{(t as any)?.filters?.statusOptions?.completed || 'Completed'}</option>
              <option value="paid">{(t as any)?.filters?.statusOptions?.paid || 'Paid'}</option>
              <option value="pending">{(t as any)?.filters?.statusOptions?.pending || 'Pending'}</option>
              <option value="processing">{(t as any)?.filters?.statusOptions?.processing || 'Processing'}</option>
            </select>

            {myListings.length > 0 && (
              <select
                value={listingFilter}
                onChange={(e) => {
                  setListingFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all"
              >
                <option value="all">{(t as any)?.filters?.allListings || 'All Listings'}</option>
                {myListings.map(listing => (
                  <option key={listing._id} value={listing._id}>
                    {listing.title}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={clearFilters}
              className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
            >
              {(t as any)?.filters?.clearFilters || 'Clear Filters'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{(t as any)?.filters?.startDate || 'Start Date'}</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => {
                setDateRange({ ...dateRange, startDate: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{(t as any)?.filters?.endDate || 'End Date'}</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => {
                setDateRange({ ...dateRange, endDate: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-yellow-100 mb-4">
              <FaMoneyBillWave className="text-[#FF6B35] text-3xl" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{(t as any)?.emptyState?.title || 'No Transactions Found'}</h3>
            <p className="text-gray-500 mb-6">
              {(t as any)?.emptyState?.message || 'You have no earnings yet. Start hosting to see your transactions here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-[#FF6B35] to-[#ff8255] text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any)?.table?.headers?.listing || 'Listing'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any)?.table?.headers?.guest || 'Guest'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any)?.table?.headers?.bookingDates || 'Booking Dates'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any)?.table?.headers?.amountEarned || 'Amount Earned'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any)?.table?.headers?.platformFee || 'Platform Fee'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any)?.table?.headers?.status || 'Status'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any)?.table?.headers?.actions || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map((transaction) => {
                  const statusBadge = getPaymentStatusBadge(transaction.payment.status);

                  return (
                    <tr key={transaction._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm">
                            {transaction.listing?.images?.[0] ? (
                              <img
                                src={transaction.listing.images[0].url}
                                alt={transaction.listing.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                {transaction.listing?.category === 'vehicle' ? (
                                  <FaCar size={24} />
                                ) : (
                                  <FaBed size={24} />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            {transaction.listing ? (
                              <>
                                <Link
                                  href={`/listing/${transaction.listing._id}`}
                                  className="font-semibold text-gray-900 hover:text-[#FF6B35] transition-colors block truncate"
                                >
                                  {transaction.listing.title}
                                </Link>
                                <p className="text-sm text-gray-500 flex items-center mt-1">
                                  <FaMapMarkerAlt className="mr-1 flex-shrink-0" />
                                  <span className="truncate">
                                    {transaction.listing.address.city}, {transaction.listing.address.country}
                                  </span>
                                </p>
                              </>
                            ) : (
                              <div>
                                <p className="font-semibold text-gray-400 truncate">
                                  Listing Deleted
                                </p>
                                <p className="text-sm text-gray-400">
                                  No longer available
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-orange-200 to-yellow-200 flex-shrink-0">
                            {transaction.guest.avatar ? (
                              <img
                                src={transaction.guest.avatar}
                                alt={transaction.guest.firstName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#FF6B35] font-bold text-sm">
                                {transaction.guest.firstName[0]}{transaction.guest.lastName[0]}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {transaction.guest.firstName} {transaction.guest.lastName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="flex items-center text-gray-900 font-medium">
                            <FaCalendarAlt className="mr-1.5 text-[#FF6B35] flex-shrink-0" />
                            {formatDate(transaction.bookingDates.startDate)}
                          </div>
                          <div className="text-gray-500 mt-1 flex items-center">
                            <FaClock className="mr-1.5 flex-shrink-0" />
                            {transaction.bookingDates.nights} {transaction.bookingDates.nights === 1 ? (t as any)?.table?.night || 'night' : (t as any)?.table?.nights || 'nights'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-lg font-bold text-[#FF6B35]">
                            {formatPrice(transaction.earnings.hostEarning, transaction.earnings.currency)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {(t as any)?.table?.subtotal || 'Subtotal'} {formatPrice(transaction.earnings.subtotal, transaction.earnings.currency)}
                          </p>
                          {transaction.earnings.cleaningFee > 0 && (
                            <p className="text-xs text-gray-500">
                              {(t as any)?.table?.cleaning || 'Cleaning'} {formatPrice(transaction.earnings.cleaningFee, transaction.earnings.currency)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-base font-semibold text-gray-700">
                            {formatPrice(transaction.earnings.platformFee, transaction.earnings.currency)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                          <statusBadge.icon className="mr-1" />
                          {statusBadge.label}
                        </span>
                        {transaction.payment.paidAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            {(t as any)?.table?.paid || 'Paid'} {formatDate(transaction.payment.paidAt)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setShowDetailsModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={(t as any)?.table?.viewDetails || 'View Details'}
                        >
                          <FaEye size={16} />
                        </button>
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

      {showPayoutsHistory && payouts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <FaHistory className="mr-2 text-[#FF6B35]" />
            {(t as any)?.payout?.historyTitle || 'Payout History'}
          </h2>
          <div className="space-y-4">
            {payouts.map((payout) => {
              const statusBadge = getPayoutStatusBadge(payout.status);
              return (
                <div key={payout._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <p className="text-2xl font-bold text-[#FF6B35]">
                          {formatPrice(payout.amount, payout.currency)}
                        </p>
                        <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                          <statusBadge.icon className="mr-1" />
                          {statusBadge.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        <FaCalendarAlt className="inline mr-1" />
                        {(t as any)?.payout?.requested || 'Requested'}: {formatDate(payout.requestedAt)}
                      </p>
                      {payout.completedAt && (
                        <p className="text-sm text-green-600 mt-1">
                          <FaCheckCircle className="inline mr-1" />
                          {(t as any)?.payout?.completed || 'Completed'}: {formatDate(payout.completedAt)}
                        </p>
                      )}
                    </div>
                    {payout.status === 'pending' && (
                      <button
                        onClick={() => handleCancelPayout(payout._id)}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        {(t as any)?.payout?.cancel || 'Cancel'}
                      </button>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">{(t as any)?.payout?.bankName || 'Bank Name'}</p>
                        <p className="font-semibold text-gray-900">{payout.bankAccount.bankName}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">{(t as any)?.payout?.accountHolder || 'Account Holder'}</p>
                        <p className="font-semibold text-gray-900">{payout.bankAccount.accountHolderName}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">{(t as any)?.payout?.accountNumber || 'Account Number'}</p>
                        <p className="font-semibold text-gray-900">{payout.bankAccount.accountNumber}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">RIB</p>
                        <p className="font-semibold text-gray-900 font-mono">{payout.bankAccount.rib}</p>
                      </div>
                    </div>
                    {payout.transactionId && (
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500">{(t as any)?.payout?.transactionId || 'Transaction ID'}</p>
                        <p className="text-sm font-mono text-gray-900">{payout.transactionId}</p>
                      </div>
                    )}
                    {payout.hostNotes && (
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500">{(t as any)?.payout?.yourNotes || 'Your Notes'}</p>
                        <p className="text-sm text-gray-700">{payout.hostNotes}</p>
                      </div>
                    )}
                    {payout.adminNotes && (
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500">{(t as any)?.payout?.adminNotes || 'Admin Notes'}</p>
                        <p className="text-sm text-gray-700">{payout.adminNotes}</p>
                      </div>
                    )}
                    {payout.rejectionReason && (
                      <div className="pt-2 border-t border-gray-200 bg-red-50 rounded p-2">
                        <p className="text-xs text-red-600 font-semibold">{(t as any)?.payout?.rejectionReason || 'Rejection Reason'}</p>
                        <p className="text-sm text-red-700">{payout.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
            <div className="bg-gradient-to-r from-[#FF6B35] to-[#ff8255] text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">{(t as any)?.payout?.withdrawTitle || 'Withdraw Earnings'}</h3>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-semibold mb-1">{(t as any)?.payout?.availableBalance || 'Available Balance'}</p>
                <p className="text-3xl font-bold text-blue-700">{formatPrice(availableBalance, overview?.currency || 'DZD')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {(t as any)?.payout?.withdrawAmount || 'Withdrawal Amount'} *
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">{(t as any)?.payout?.minimumAmount || 'Minimum withdrawal: 1000 DZD'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {(t as any)?.payout?.notes || 'Notes'} ({(t as any)?.payout?.optional || 'optional'})
                </label>
                <textarea
                  value={hostNotes}
                  onChange={(e) => setHostNotes(e.target.value)}
                  rows={3}
                  placeholder={(t as any)?.payout?.notesPlaceholder || 'Add any notes for the admin...'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent resize-none"
                />
              </div>

              {bankAccount.rib ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <FaCheckCircle className="text-green-600 mt-1 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-900">
                        {(t as any)?.payout?.bankAccountConfigured || 'Bank account configured'}
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        {bankAccount.bankName} - {bankAccount.accountNumber}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <FaExclamationTriangle className="text-yellow-600 mt-1 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-900">
                        {(t as any)?.payout?.noBankAccount || 'No bank account configured'}
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        {(t as any)?.payout?.addBankAccountFirst || 'Please add your bank account details first'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  {(t as any)?.payout?.cancelButton || 'Cancel'}
                </button>
                <button
                  onClick={handleWithdrawRequest}
                  disabled={processingWithdraw}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#FF6B35] to-[#ff8255] text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingWithdraw ? (t as any)?.payout?.processing || 'Processing...' : (t as any)?.payout?.submitRequest || 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBankAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-[#FF6B35] to-[#ff8255] text-white p-6 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">{(t as any)?.payout?.bankAccountTitle || 'Bank Account Details'}</h3>
                <button
                  onClick={() => setShowBankAccountModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <FaInfoCircle className="text-blue-600 mt-1 mr-2 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">{(t as any)?.payout?.bankInfo?.title || 'Important'}</p>
                    <p>{(t as any)?.payout?.bankInfo?.message || 'Please provide accurate bank account information. This will be used for all future payouts.'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any)?.payout?.bankNameLabel || 'Bank Name'} *
                  </label>
                  <input
                    type="text"
                    value={bankAccount.bankName}
                    onChange={(e) => setBankAccount({ ...bankAccount, bankName: e.target.value })}
                    placeholder={(t as any)?.payout?.bankNamePlaceholder || 'e.g., CPA, BNA, BEA'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any)?.payout?.accountHolderLabel || 'Account Holder Name'} *
                  </label>
                  <input
                    type="text"
                    value={bankAccount.accountHolderName}
                    onChange={(e) => setBankAccount({ ...bankAccount, accountHolderName: e.target.value })}
                    placeholder={(t as any)?.payout?.accountHolderPlaceholder || 'Full name as on bank account'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any)?.payout?.accountNumberLabel || 'Account Number'} *
                  </label>
                  <input
                    type="text"
                    value={bankAccount.accountNumber}
                    onChange={(e) => setBankAccount({ ...bankAccount, accountNumber: e.target.value })}
                    placeholder={(t as any)?.payout?.accountNumberPlaceholder || 'Account number'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RIB * ({(t as any)?.payout?.ribDigits || '20 digits'})
                  </label>
                  <input
                    type="text"
                    value={bankAccount.rib}
                    onChange={(e) => setBankAccount({ ...bankAccount, rib: e.target.value.replace(/\D/g, '') })}
                    placeholder="00799999001234567890"
                    maxLength={20}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">{(bankAccount.rib || '').length}/20 {(t as any)?.payout?.digits || 'digits'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IBAN ({(t as any)?.payout?.optional || 'optional'})
                  </label>
                  <input
                    type="text"
                    value={bankAccount.iban || ''}
                    onChange={(e) => setBankAccount({ ...bankAccount, iban: e.target.value })}
                    placeholder="DZ00 0001 0000 0012 3456 7890"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any)?.payout?.swiftCodeLabel || 'SWIFT/BIC Code'} ({(t as any)?.payout?.optional || 'optional'})
                  </label>
                  <input
                    type="text"
                    value={bankAccount.swiftCode || ''}
                    onChange={(e) => setBankAccount({ ...bankAccount, swiftCode: e.target.value })}
                    placeholder="CPABDZAL"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent font-mono"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowBankAccountModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  {(t as any)?.payout?.cancelButton || 'Cancel'}
                </button>
                <button
                  onClick={handleSaveBankAccount}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#FF6B35] to-[#ff8255] text-white rounded-lg font-medium hover:shadow-lg transition-all"
                >
                  {(t as any)?.payout?.saveButton || 'Save Bank Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-[#FF6B35] to-[#ff8255] text-white p-6 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">{(t as any)?.detailsModal?.title || 'Transaction Details'}</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start space-x-4 pb-6 border-b">
                <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-100 shadow-lg flex-shrink-0">
                  {selectedTransaction.listing?.images?.[0] && (
                    <img
                      src={selectedTransaction.listing.images[0].url}
                      alt={selectedTransaction.listing.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-gray-900 mb-2">
                    {selectedTransaction.listing.title}
                  </h4>
                  <p className="text-gray-600 flex items-center mb-2">
                    <FaMapMarkerAlt className="mr-2 text-[#FF6B35]" />
                    {selectedTransaction.listing.address.street}, {selectedTransaction.listing.address.city}
                  </p>
                  <div className={`inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-full ${
                    getPaymentStatusBadge(selectedTransaction.payment.status).bg
                  } ${getPaymentStatusBadge(selectedTransaction.payment.status).text}`}>
                    {getPaymentStatusBadge(selectedTransaction.payment.status).label}
                  </div>
                </div>
              </div>

              <div className="pb-6 border-b">
                <h5 className="font-bold text-gray-900 mb-4">{(t as any)?.detailsModal?.guestInformation || 'Guest Information'}</h5>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-orange-200 to-yellow-200 shadow-md">
                    {selectedTransaction.guest.avatar && (
                      <img
                        src={selectedTransaction.guest.avatar}
                        alt={selectedTransaction.guest.firstName}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">
                      {selectedTransaction.guest.firstName} {selectedTransaction.guest.lastName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pb-6 border-b">
                <h5 className="font-bold text-gray-900 mb-4">{(t as any)?.detailsModal?.bookingPeriod || 'Booking Period'}</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{(t as any)?.detailsModal?.checkIn || 'Check-In'}</p>
                    <p className="font-bold text-gray-900">
                      {formatDate(selectedTransaction.bookingDates.startDate)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{(t as any)?.detailsModal?.checkOut || 'Check-Out'}</p>
                    <p className="font-bold text-gray-900">
                      {formatDate(selectedTransaction.bookingDates.endDate)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center text-sm text-gray-700">
                  <FaClock className="mr-2 text-[#FF6B35]" />
                  <span className="font-semibold">{selectedTransaction.bookingDates.nights}</span>
                  <span className="mx-1">
                    {selectedTransaction.bookingDates.nights === 1 ? (t as any)?.detailsModal?.night || 'night' : (t as any)?.detailsModal?.nights || 'nights'}
                  </span>
                </div>
              </div>

              <div className="pb-6 border-b">
                <h5 className="font-bold text-gray-900 mb-4">{(t as any)?.detailsModal?.earningsBreakdown || 'Earnings Breakdown'}</h5>
                <div className="space-y-3 bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex justify-between text-gray-700">
                    <span>{(t as any)?.detailsModal?.subtotal || 'Subtotal'} ({selectedTransaction.bookingDates.nights} {selectedTransaction.bookingDates.nights === 1 ? (t as any)?.detailsModal?.night || 'night' : (t as any)?.detailsModal?.nights || 'nights'})</span>
                    <span className="font-semibold">
                      {formatPrice(selectedTransaction.earnings.subtotal, selectedTransaction.earnings.currency)}
                    </span>
                  </div>
                  {selectedTransaction.earnings.cleaningFee > 0 && (
                    <div className="flex justify-between text-gray-700">
                      <span>{(t as any)?.detailsModal?.cleaningFee || 'Cleaning Fee'}</span>
                      <span className="font-semibold">
                        {formatPrice(selectedTransaction.earnings.cleaningFee, selectedTransaction.earnings.currency)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-green-800 pt-3 border-t-2 border-green-300">
                    <span>{(t as any)?.detailsModal?.yourEarnings || 'Your Earnings'}</span>
                    <span>
                      {formatPrice(selectedTransaction.earnings.hostEarning, selectedTransaction.earnings.currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pb-6 border-b">
                <h5 className="font-bold text-gray-900 mb-4">{(t as any)?.detailsModal?.platformFees || 'Platform Fees'}</h5>
                <div className="space-y-3 bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="flex justify-between text-lg font-bold text-red-800">
                    <span>{(t as any)?.detailsModal?.totalPlatformFee || 'Total Platform Fee'}</span>
                    <span>
                      {formatPrice(selectedTransaction.earnings.platformFee, selectedTransaction.earnings.currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pb-6 border-b">
                <h5 className="font-bold text-gray-900 mb-4">{(t as any)?.detailsModal?.guestPaidTotal || 'Guest Paid (Total)'}</h5>
                <div className="space-y-3 bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex justify-between text-lg font-bold text-blue-800">
                    <span>{(t as any)?.detailsModal?.totalAmount || 'Total Amount'}</span>
                    <span>
                      {formatPrice(selectedTransaction.earnings.totalAmount, selectedTransaction.earnings.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {selectedTransaction.payment.paidAt && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-sm text-gray-700">
                    <FaCalendarAlt className="mr-2 text-[#FF6B35]" />
                    <span>{(t as any)?.detailsModal?.payoutDate || 'Payout Date'} <span className="font-semibold">{formatDate(selectedTransaction.payment.paidAt)}</span></span>
                  </div>
                </div>
              )}

              <div className="flex items-start space-x-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <FaInfoCircle className="text-blue-600 mt-1 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">{(t as any)?.detailsModal?.payoutInfo?.title || 'Payout Information'}</p>
                  <p>{(t as any)?.detailsModal?.payoutInfo?.message || 'Earnings are released 24 hours after guest check-in and transferred to your account within 3-5 business days.'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}