'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaUsers, FaBed, FaCar, FaChartLine, FaMoneyBillWave,
  FaClipboardCheck, FaStar, FaEye, FaArrowUp, FaArrowDown,
  FaPlus, FaEdit, FaTrash, FaTimes, FaCheck, FaBan,
  FaHome, FaUserShield, FaExclamationCircle, FaClipboardList,
  FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendar, FaSave,
  FaUserPlus, FaListAlt, FaSync, FaClock, FaCheckCircle,
  FaTimesCircle, FaHotel, FaCogs, FaChartBar, FaBoxOpen,
  FaFileAlt, FaFlag, FaShieldAlt, FaInfoCircle, FaDownload, FaFilePdf,
  FaFilter, FaSearch, FaBuilding, FaGlobe, FaTrophy, FaHeart, FaUser
} from 'react-icons/fa';
import axios from 'axios';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface QuickAction {
  label: string;
  icon: any;
  color: string;
  action: string;
  count?: number;
}

interface DetailModal {
  type: 'user' | 'booking' | 'listing' | 'application' | null;
  data: any;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { state } = useApp();
  const user = state.user;
  const t = useTranslation('admin-dashboard');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [showQuickUserModal, setShowQuickUserModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<DetailModal>({ type: null, data: null });
  const [showReportModal, setShowReportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfOptions, setPdfOptions] = useState({
    dateRange: 'month',
    category: 'all',
    sections: {
      bookingsStats: true,
      listingsAnalysis: true,
      usersStats: false,
      revenueBreakdown: true
    },
    branding: {
      includeLogo: true,
      includeCompanyInfo: true,
      addWatermark: false
    }
  });

  // Quick user form
  const [quickUserForm, setQuickUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'guest'
  });

  // Report filters
  const [reportFilters, setReportFilters] = useState({
    type: 'revenue',
    dateRange: 'month',
    category: 'all'
  });

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      refreshDashboardData();
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/dashboard/admin`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const refreshDashboardData = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/dashboard/admin`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setDashboardData(response.data.data);
      toast.success('Dashboard refreshed');
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleQuickCreateUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const response = await axios.post(
        `${API_BASE_URL}/admin/users`,
        quickUserForm,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success('User created successfully');
        setShowQuickUserModal(false);
        setQuickUserForm({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          role: 'guest'
        });
        refreshDashboardData();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  };

  const navigateToSection = (path: string) => {
    router.push(path);
  };

  const openDetailModal = (type: 'user' | 'booking' | 'listing' | 'application', data: any) => {
    setShowDetailModal({ type, data });
  };

  const closeDetailModal = () => {
    setShowDetailModal({ type: null, data: null });
  };

  // ✅ FIXED BQ-47/49: Implement real export functionality
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Handle nested objects, arrays, and special characters
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvContent += values.join(',') + '\n';
    });

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportData = async (format: 'csv' | 'excel', type: 'users' | 'bookings' | 'listings' | 'all' = 'all') => {
    setShowExportModal(false);
    toast.loading('Preparing export...');

    try {
      const token = localStorage.getItem('token');
      
      // Prepare data to export
      let exportData: any = {};

      if (type === 'all' || type === 'users') {
        // Fetch users
        const usersResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/admin/users`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        exportData.users = usersResponse.data.data?.users || usersResponse.data.users || [];
      }

      if (type === 'all' || type === 'bookings') {
        // Fetch bookings
        const bookingsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/bookings/admin/all?limit=1000`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        exportData.bookings = bookingsResponse.data.data?.bookings || bookingsResponse.data.bookings || [];
      }

      if (type === 'all' || type === 'listings') {
        // Fetch listings
        const listingsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/listings?limit=1000`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        exportData.listings = listingsResponse.data.data?.listings || listingsResponse.data.listings || [];
      }

      toast.dismiss();

      // Flatten data for export
      const flattenObject = (obj: any, prefix = '') => {
        return Object.keys(obj).reduce((acc: any, key) => {
          const value = obj[key];
          const newKey = prefix ? `${prefix}_${key}` : key;
          
          if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            Object.assign(acc, flattenObject(value, newKey));
          } else if (Array.isArray(value)) {
            acc[newKey] = JSON.stringify(value);
          } else {
            acc[newKey] = value;
          }
          
          return acc;
        }, {});
      };

      if (format === 'csv') {
        // Export each type as separate CSV with delays to prevent browser blocking
        const downloads: Array<{ data: any[], filename: string }> = [];
        
        if (exportData.users && exportData.users.length > 0) {
          const flatUsers = exportData.users.map((u: any) => flattenObject(u));
          downloads.push({ data: flatUsers, filename: `baytup_users_${new Date().toISOString().split('T')[0]}.csv` });
        }
        if (exportData.bookings && exportData.bookings.length > 0) {
          const flatBookings = exportData.bookings.map((b: any) => flattenObject(b));
          downloads.push({ data: flatBookings, filename: `baytup_bookings_${new Date().toISOString().split('T')[0]}.csv` });
        }
        if (exportData.listings && exportData.listings.length > 0) {
          const flatListings = exportData.listings.map((l: any) => flattenObject(l));
          downloads.push({ data: flatListings, filename: `baytup_listings_${new Date().toISOString().split('T')[0]}.csv` });
        }

        // Download files one by one with 500ms delay to prevent browser blocking
        for (let i = 0; i < downloads.length; i++) {
          setTimeout(() => {
            exportToCSV(downloads[i].data, downloads[i].filename);
            if (i === downloads.length - 1) {
              toast.success(`${downloads.length} CSV files downloaded!`);
            }
          }, i * 500);
        }
      } else if (format === 'excel') {
        // Export all types in one Excel file with multiple sheets
        try {
          const XLSX = await import('xlsx');
          const wb = XLSX.utils.book_new();

          if (exportData.users && exportData.users.length > 0) {
            const flatUsers = exportData.users.map((u: any) => flattenObject(u));
            const wsUsers = XLSX.utils.json_to_sheet(flatUsers);
            XLSX.utils.book_append_sheet(wb, wsUsers, 'Users');
          }
          if (exportData.bookings && exportData.bookings.length > 0) {
            const flatBookings = exportData.bookings.map((b: any) => flattenObject(b));
            const wsBookings = XLSX.utils.json_to_sheet(flatBookings);
            XLSX.utils.book_append_sheet(wb, wsBookings, 'Bookings');
          }
          if (exportData.listings && exportData.listings.length > 0) {
            const flatListings = exportData.listings.map((l: any) => flattenObject(l));
            const wsListings = XLSX.utils.json_to_sheet(flatListings);
            XLSX.utils.book_append_sheet(wb, wsListings, 'Listings');
          }

          XLSX.writeFile(wb, `baytup_export_${new Date().toISOString().split('T')[0]}.xlsx`);
          toast.success('Excel export completed!');
        } catch (error) {
          console.error('Excel export error:', error);
          toast.error('Failed to export Excel file');
        }
      }

    } catch (error: any) {
      console.error('Export error:', error);
      toast.dismiss();
      toast.error(error.response?.data?.message || 'Failed to export data');
    }
  };

  // ✅ FIXED: Real Report Generation Function
  const handleGenerateReport = async () => {
    setShowReportModal(false);
    toast.loading('Generating report...');

    try {
      const token = localStorage.getItem('token');
      
      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      switch (reportFilters.dateRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      let reportData: any[] = [];
      let reportName = '';

      // Fetch data based on report type
      if (reportFilters.type === 'revenue') {
        // Fetch bookings with revenue data
        console.log('🔍 [Revenue Report] Fetching bookings...');
        console.log('   Start Date:', startDate.toISOString());
        console.log('   Now:', now.toISOString());
        
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/bookings/admin/all?limit=1000`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const bookings = response.data.data?.bookings || response.data.bookings || [];
        
        console.log('📊 [Revenue Report] Total bookings from API:', bookings.length);
        console.log('📊 [Revenue Report] Sample booking statuses:', bookings.slice(0, 5).map((b: any) => b.status));
        
        // Filter by date and category
        reportData = bookings.filter((b: any) => {
          const bookingDate = new Date(b.createdAt);
          const matchesDate = bookingDate >= startDate && bookingDate <= now;
          // ✅ FIXED: Only include bookings without listing if category is 'all'
          const matchesCategory = reportFilters.category === 'all' || 
            (b.listing && b.listing.category === reportFilters.category);
          const matchesStatus = b.status === 'completed' || b.status === 'active';
          
          // Debug first booking
          if (bookings.indexOf(b) === 0) {
            console.log('🔍 [First Booking Debug]');
            console.log('   Created:', bookingDate.toISOString());
            console.log('   Status:', b.status);
            console.log('   Has Listing:', !!b.listing);
            console.log('   Category:', b.listing?.category || 'N/A');
            console.log('   Filter Category:', reportFilters.category);
            console.log('   Matches Date:', matchesDate);
            console.log('   Matches Category:', matchesCategory);
            console.log('   Matches Status:', matchesStatus);
          }
          
          return matchesDate && matchesCategory && matchesStatus;
        }).map((b: any) => ({
          'Booking ID': b._id,
          'Date': new Date(b.createdAt).toLocaleDateString(),
          'Guest': `${b.guest?.firstName || ''} ${b.guest?.lastName || ''}`,
          'Host': `${b.host?.firstName || ''} ${b.host?.lastName || ''}`,
          'Listing': b.listing?.title || 'N/A',
          'Category': b.listing?.category || 'N/A',
          'Check-in': new Date(b.startDate).toLocaleDateString(),
          'Check-out': new Date(b.endDate).toLocaleDateString(),
          'Total Amount (DZD)': b.pricing?.totalAmount || 0,
          'Platform Fee (DZD)': b.pricing?.platformFee || 0,
          'Host Earnings (DZD)': (b.pricing?.totalAmount || 0) - (b.pricing?.platformFee || 0),
          'Status': b.status
        }));
        reportName = `revenue_report_${reportFilters.dateRange}`;
        
        console.log('✅ [Revenue Report] Filtered bookings:', reportData.length);
        if (reportData.length === 0) {
          console.warn('⚠️ [Revenue Report] No bookings match filters!');
          console.log('   Start Date:', startDate.toISOString());
          console.log('   End Date:', now.toISOString());
          console.log('   Category:', reportFilters.category);
        }
        
      } else if (reportFilters.type === 'bookings') {
        // Fetch all bookings
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/bookings/admin/all?limit=1000`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const bookings = response.data.data?.bookings || response.data.bookings || [];
        
        reportData = bookings.filter((b: any) => {
          const bookingDate = new Date(b.createdAt);
          const matchesDate = bookingDate >= startDate && bookingDate <= now;
          // ✅ FIXED: If no listing, ignore category filter
          const matchesCategory = !b.listing || reportFilters.category === 'all' || 
            (b.listing?.category === reportFilters.category);
          return matchesDate && matchesCategory;
        }).map((b: any) => ({
          'Booking ID': b._id,
          'Created': new Date(b.createdAt).toLocaleDateString(),
          'Guest': `${b.guest?.firstName || ''} ${b.guest?.lastName || ''}`,
          'Host': `${b.host?.firstName || ''} ${b.host?.lastName || ''}`,
          'Listing': b.listing?.title || 'N/A',
          'Category': b.listing?.category || 'N/A',
          'Check-in': new Date(b.startDate).toLocaleDateString(),
          'Check-out': new Date(b.endDate).toLocaleDateString(),
          'Guests': (b.guestCount?.adults || 0) + (b.guestCount?.children || 0),
          'Total Amount (DZD)': b.pricing?.totalAmount || 0,
          'Status': b.status,
          'Payment': b.payment?.status || 'pending'
        }));
        reportName = `bookings_report_${reportFilters.dateRange}`;
        
      } else if (reportFilters.type === 'users') {
        // Fetch users
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/admin/users`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const users = response.data.data?.users || response.data.users || [];
        
        reportData = users.filter((u: any) => {
          const userDate = new Date(u.createdAt);
          return userDate >= startDate && userDate <= now;
        }).map((u: any) => ({
          'User ID': u._id,
          'Name': `${u.firstName} ${u.lastName}`,
          'Email': u.email,
          'Phone': u.phone || 'N/A',
          'Role': u.role,
          'Status': u.isActive ? 'Active' : 'Inactive',
          'Verified': u.isVerified ? 'Yes' : 'No',
          'Joined': new Date(u.createdAt).toLocaleDateString(),
          'Last Login': u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'
        }));
        reportName = `users_report_${reportFilters.dateRange}`;
        
      } else if (reportFilters.type === 'listings') {
        // Fetch listings
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/listings?limit=1000`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const listings = response.data.data?.listings || response.data.listings || [];
        
        reportData = listings.filter((l: any) => {
          const listingDate = new Date(l.createdAt);
          const matchesDate = listingDate >= startDate && listingDate <= now;
          const matchesCategory = reportFilters.category === 'all' || 
            (l.category === reportFilters.category);
          return matchesDate && matchesCategory;
        }).map((l: any) => ({
          'Listing ID': l._id,
          'Title': l.title,
          'Category': l.category,
          'Subcategory': l.subcategory || 'N/A',
          'Host': `${l.host?.firstName || ''} ${l.host?.lastName || ''}`,
          'Location': `${l.address?.city || ''}, ${l.address?.state || ''}`,
          'Price (DZD)': l.pricing?.basePrice || 0,
          'Pricing Type': l.pricing?.pricingType || 'per_night',
          'Status': l.status,
          'Views': l.stats?.totalViews || 0,
          'Bookings': l.stats?.totalBookings || 0,
          'Rating': l.stats?.averageRating?.toFixed(1) || 'N/A',
          'Created': new Date(l.createdAt).toLocaleDateString()
        }));
        reportName = `listings_report_${reportFilters.dateRange}`;
      }

      toast.dismiss();

      if (!reportData || reportData.length === 0) {
        toast.error('No data found for the selected filters');
        return;
      }

      // ✅ Calculate totals for revenue report
      let totalsRow: any = null;
      if (reportFilters.type === 'revenue') {
        const totalAmount = reportData.reduce((sum, row) => sum + (row['Total Amount (DZD)'] || 0), 0);
        const totalPlatformFee = reportData.reduce((sum, row) => sum + (row['Platform Fee (DZD)'] || 0), 0);
        const totalHostEarnings = reportData.reduce((sum, row) => sum + (row['Host Earnings (DZD)'] || 0), 0);

        totalsRow = {
          'Booking ID': '',
          'Date': '',
          'Guest': '',
          'Host': '',
          'Listing': '',
          'Category': '',
          'Check-in': '',
          'Check-out': '',
          'Total Amount (DZD)': totalAmount,
          'Platform Fee (DZD)': totalPlatformFee,
          'Host Earnings (DZD)': totalHostEarnings,
          'Status': `TOTAL (${reportData.length} bookings)`
        };
      }

      // Generate Excel report
      const XLSX = await import('xlsx');
      
      // Add totals row if revenue report
      const dataWithTotals = totalsRow ? [...reportData, totalsRow] : reportData;
      
      const ws = XLSX.utils.json_to_sheet(dataWithTotals);
      
      // ✅ Style the totals row (make it bold)
      if (totalsRow) {
        const lastRowIndex = dataWithTotals.length; // +1 because header row
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        
        // Make totals row bold
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: lastRowIndex, c: col });
          if (ws[cellAddress]) {
            ws[cellAddress].s = {
              font: { bold: true },
              fill: { fgColor: { rgb: "FFFF00" } } // Yellow background
            };
          }
        }
      }
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      
      XLSX.writeFile(wb, `baytup_${reportName}_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      // ✅ Show totals in success message for revenue reports
      if (totalsRow) {
        toast.success(
          `Report generated! ${reportData.length} bookings | Total: ${totalsRow['Total Amount (DZD)'].toLocaleString()} DZD`,
          { duration: 5000 }
        );
      } else {
        toast.success(`Report generated! ${reportData.length} records exported.`);
      }

    } catch (error: any) {
      console.error('Report generation error:', error);
      toast.dismiss();
      toast.error(error.response?.data?.message || 'Failed to generate report');
    }
  };

  // ===================================
  // GENERATE PDF REPORT WITH CHARTS
  // ===================================
  const generatePDFReport = async () => {
    setShowPdfModal(false);
    toast.loading('Generating PDF report with charts...');

    try {
      const token = localStorage.getItem('token');
      
      // Calculate date range
      const now = new Date();
      const startDate = new Date(now);
      
      switch (pdfOptions.dateRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Fetch data
      const bookingsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/admin/all?limit=1000`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const bookings = bookingsResponse.data.data?.bookings || bookingsResponse.data.bookings || [];

      // Filter bookings
      const filteredBookings = bookings.filter((b: any) => {
        const bookingDate = new Date(b.createdAt);
        const matchesDate = bookingDate >= startDate && bookingDate <= now;
        const matchesCategory = pdfOptions.category === 'all' || 
          (!b.listing || b.listing?.category === pdfOptions.category);
        const matchesStatus = b.status === 'completed' || b.status === 'active';
        return matchesDate && matchesCategory && matchesStatus;
      });

      if (filteredBookings.length === 0) {
        toast.dismiss();
        toast.error('No bookings found for the selected period');
        return;
      }

      // Calculate metrics
      const totalRevenue = filteredBookings.reduce((sum: number, b: any) => sum + (b.pricing?.totalAmount || 0), 0);
      const platformFees = Math.floor(totalRevenue * 0.1);
      const hostEarnings = totalRevenue - platformFees;
      
      const completedCount = filteredBookings.filter((b: any) => b.status === 'completed').length;
      const activeCount = filteredBookings.filter((b: any) => b.status === 'active').length;

      // Group by category
      const stayCount = filteredBookings.filter((b: any) => b.listing?.category === 'stay').length;
      const vehicleCount = filteredBookings.filter((b: any) => b.listing?.category === 'vehicle').length;

      toast.dismiss();
      toast.loading('Creating PDF pages...');

      // Create PDF
      const pdf = new jsPDF();
      let yPosition = 20;

      // ===================================
      // PAGE 1: COVER PAGE
      // ===================================
      
      // Logo (if enabled)
      if (pdfOptions.branding.includeLogo) {
        pdf.setFontSize(28);
        pdf.setTextColor(255, 107, 53); // Orange Baytup
        pdf.text('BAYTUP', 105, yPosition, { align: 'center' });
        yPosition += 15;
      }

      // Title
      pdf.setFontSize(24);
      pdf.setTextColor(44, 62, 80);
      pdf.text('REVENUE REPORT', 105, yPosition, { align: 'center' });
      yPosition += 15;

      // Period
      pdf.setFontSize(14);
      pdf.setTextColor(100, 100, 100);
      const periodText = `${startDate.toLocaleDateString()} - ${now.toLocaleDateString()}`;
      pdf.text(periodText, 105, yPosition, { align: 'center' });
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 105, yPosition, { align: 'center' });
      yPosition += 30;

      // Summary Box
      pdf.setDrawColor(255, 107, 53);
      pdf.setLineWidth(0.5);
      pdf.rect(20, yPosition, 170, 60);
      
      yPosition += 10;
      pdf.setFontSize(16);
      pdf.setTextColor(44, 62, 80);
      pdf.text('EXECUTIVE SUMMARY', 30, yPosition);
      
      yPosition += 12;
      pdf.setFontSize(12);
      pdf.text(`Total Revenue: ${totalRevenue.toLocaleString()} DZD`, 30, yPosition);
      yPosition += 8;
      pdf.text(`Total Bookings: ${filteredBookings.length}`, 30, yPosition);
      yPosition += 8;
      pdf.text(`Completed: ${completedCount} | Active: ${activeCount}`, 30, yPosition);
      yPosition += 8;
      pdf.text(`Stay: ${stayCount} | Vehicle: ${vehicleCount}`, 30, yPosition);

      // ===================================
      // PAGE 2: REVENUE OVERVIEW
      // ===================================
      
      pdf.addPage();
      yPosition = 20;

      pdf.setFontSize(18);
      pdf.setTextColor(255, 107, 53);
      pdf.text('REVENUE OVERVIEW', 20, yPosition);
      yPosition += 15;

      // Revenue metrics
      pdf.setFontSize(14);
      pdf.setTextColor(44, 62, 80);
      pdf.text(`Total Revenue: ${totalRevenue.toLocaleString()} DZD`, 20, yPosition);
      yPosition += 10;
      pdf.text(`Platform Fees (10%): ${platformFees.toLocaleString()} DZD`, 20, yPosition);
      yPosition += 10;
      pdf.text(`Host Earnings: ${hostEarnings.toLocaleString()} DZD`, 20, yPosition);
      yPosition += 20;

      // Generate Pie Chart if data available
      if (stayCount > 0 || vehicleCount > 0) {
        toast.dismiss();
        toast.loading('Generating charts...');
        
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          new ChartJS(ctx, {
            type: 'pie',
            data: {
              labels: ['Stays', 'Vehicles'],
              datasets: [{
                data: [stayCount, vehicleCount],
                backgroundColor: ['#FF6B35', '#4A90E2']
              }]
            },
            options: {
              responsive: false,
              plugins: {
                legend: { position: 'bottom' },
                title: {
                  display: true,
                  text: 'Bookings Distribution',
                  font: { size: 16 }
                }
              }
            }
          });

          // Wait for chart to render
          await new Promise(resolve => setTimeout(resolve, 500));

          // Convert to image
          const imgData = canvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', 20, yPosition, 170, 120);
        }
      }

      // ===================================
      // PAGE 3: BOOKINGS STATISTICS (If selected)
      // ===================================
      
      if (pdfOptions.sections.bookingsStats) {
        pdf.addPage();
        yPosition = 20;

        pdf.setFontSize(18);
        pdf.setTextColor(255, 107, 53);
        pdf.text('BOOKINGS STATISTICS', 20, yPosition);
        yPosition += 15;

        // Stats
        pdf.setFontSize(12);
        pdf.setTextColor(44, 62, 80);
        pdf.text(`Total Bookings: ${filteredBookings.length}`, 20, yPosition);
        yPosition += 8;
        const completedPerc = Math.round(completedCount/filteredBookings.length*100);
        pdf.text(`Completed: ${completedCount} (${completedPerc}%)`, 20, yPosition);
        yPosition += 8;
        const activePerc = Math.round(activeCount/filteredBookings.length*100);
        pdf.text(`Active: ${activeCount} (${activePerc}%)`, 20, yPosition);
        yPosition += 20;

        // Status distribution bar chart
        const canvas2 = document.createElement('canvas');
        canvas2.width = 400;
        canvas2.height = 250;
        const ctx2 = canvas2.getContext('2d');

        if (ctx2) {
          new ChartJS(ctx2, {
            type: 'bar',
            data: {
              labels: ['Completed', 'Active'],
              datasets: [{
                label: 'Bookings',
                data: [completedCount, activeCount],
                backgroundColor: ['#2ECC71', '#F39C12']
              }]
            },
            options: {
              responsive: false,
              plugins: {
                legend: { display: false },
                title: {
                  display: true,
                  text: 'Bookings by Status',
                  font: { size: 14 }
                }
              },
              scales: {
                y: { beginAtZero: true }
              }
            }
          });

          await new Promise(resolve => setTimeout(resolve, 500));
          const imgData2 = canvas2.toDataURL('image/png');
          pdf.addImage(imgData2, 'PNG', 20, yPosition, 170, 100);
        }
      }

      // ===================================
      // PAGE 4: LISTINGS ANALYSIS (If selected)
      // ===================================
      
      if (pdfOptions.sections.listingsAnalysis) {
        pdf.addPage();
        yPosition = 20;

        pdf.setFontSize(18);
        pdf.setTextColor(255, 107, 53);
        pdf.text('LISTINGS ANALYSIS', 20, yPosition);
        yPosition += 15;

        // Fetch listings data
        const listingsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/listings?limit=1000`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const listings = listingsResponse.data.data?.listings || listingsResponse.data.listings || [];

        // Group by subcategory
        const subcategoryCounts: {[key: string]: number} = {};
        listings.forEach((l: any) => {
          const sub = l.subcategory || 'Other';
          subcategoryCounts[sub] = (subcategoryCounts[sub] || 0) + 1;
        });

        const subcategories = Object.keys(subcategoryCounts);
        const counts = Object.values(subcategoryCounts);

        // Stats
        pdf.setFontSize(12);
        pdf.setTextColor(44, 62, 80);
        pdf.text(`Total Listings: ${listings.length}`, 20, yPosition);
        yPosition += 8;
        const activeListings = listings.filter((l: any) => l.status === 'active').length;
        const activeListPerc = Math.round(activeListings/listings.length*100);
        pdf.text(`Active: ${activeListings} (${activeListPerc}%)`, 20, yPosition);
        yPosition += 20;

        // Horizontal bar chart
        if (subcategories.length > 0) {
          const canvas3 = document.createElement('canvas');
          canvas3.width = 400;
          canvas3.height = 300;
          const ctx3 = canvas3.getContext('2d');

          if (ctx3) {
            new ChartJS(ctx3, {
              type: 'bar',
              data: {
                labels: subcategories,
                datasets: [{
                  label: 'Count',
                  data: counts,
                  backgroundColor: '#4A90E2'
                }]
              },
              options: {
                indexAxis: 'y',
                responsive: false,
                plugins: {
                  legend: { display: false },
                  title: {
                    display: true,
                    text: 'Listings by Type',
                    font: { size: 14 }
                  }
                },
                scales: {
                  x: { beginAtZero: true }
                }
              }
            });

            await new Promise(resolve => setTimeout(resolve, 500));
            const imgData3 = canvas3.toDataURL('image/png');
            pdf.addImage(imgData3, 'PNG', 20, yPosition, 170, 120);
          }
        }
      }

      // ===================================
      // FOOTER ON ALL PAGES
      // ===================================
      
      const pageCount = (pdf as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
        
        if (pdfOptions.branding.includeCompanyInfo) {
          pdf.text('Baytup - Booking Platform', 20, 285);
          pdf.text('www.baytup.com', 190, 285, { align: 'right' });
        }
      }

      // Save PDF
      toast.dismiss();
      pdf.save(`baytup_report_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success('PDF report generated successfully!');

    } catch (error: any) {
      console.error('PDF generation error:', error);
      toast.dismiss();
      toast.error(error.response?.data?.message || 'Failed to generate PDF report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#FF6B35] mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">{(t as any)?.loading?.message || 'Loading dashboard...'}</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <FaExclamationCircle className="mx-auto text-gray-400 text-5xl mb-4" />
        <p className="text-gray-500 text-lg">{(t as any)?.errors?.noData || 'No data available'}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 px-6 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#ff8255] transition-colors"
        >
          {(t as any)?.actions?.retry || 'Retry'}
        </button>
      </div>
    );
  }

  const { overview, revenue, topListings, recentActivities, analytics } = dashboardData;

  // Chart data with Baytup orange theme
  const revenueChartData = {
    labels: revenue.monthlyTrend?.map((item: any) =>
      `${item._id.month}/${item._id.year}`
    ) || [],
    datasets: [
      {
        label: (t as any)?.charts?.revenue?.label || 'Revenue (DZD)',
        data: revenue.monthlyTrend?.map((item: any) => item.revenue) || [],
        borderColor: '#FF6B35',
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const categoryChartData = {
    labels: analytics.categoryDistribution?.map((item: any) => item._id) || [],
    datasets: [
      {
        data: analytics.categoryDistribution?.map((item: any) => item.count) || [],
        backgroundColor: [
          'rgba(255, 107, 53, 0.8)',
          'rgba(52, 211, 153, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(236, 72, 153, 0.8)'
        ],
        borderColor: [
          '#FF6B35',
          '#34D399',
          '#3B82F6',
          '#A855F7',
          '#EC4899'
        ],
        borderWidth: 2
      }
    ]
  };

  const locationChartData = {
    labels: analytics.locationDistribution?.slice(0, 5).map((item: any) => item._id) || [],
    datasets: [
      {
        label: (t as any)?.charts?.locations?.label || 'Listings by City',
        data: analytics.locationDistribution?.slice(0, 5).map((item: any) => item.count) || [],
        backgroundColor: 'rgba(255, 107, 53, 0.8)',
        borderColor: '#FF6B35',
        borderWidth: 2
      }
    ]
  };

  const statCards = [
    {
      icon: FaUsers,
      label: (t as any)?.stats?.totalUsers?.label || 'Total Users',
      value: overview.totalUsers,
      subStats: [
        { label: (t as any)?.stats?.totalUsers?.hosts || 'Hosts', value: overview.activeHosts },
        { label: (t as any)?.stats?.totalUsers?.guests || 'Guests', value: overview.activeGuests }
      ],
      change: overview.newUsersThisMonth,
      changeLabel: (t as any)?.stats?.totalUsers?.newThisMonth || 'new this month',
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      action: () => navigateToSection('/dashboard/users')
    },
    {
      icon: FaBed,
      label: (t as any)?.stats?.listings?.label || 'Listings',
      value: overview.totalListings,
      subStats: [
        { label: (t as any)?.stats?.listings?.active || 'Active', value: overview.activeListings },
        { label: (t as any)?.stats?.listings?.pending || 'Pending', value: overview.pendingListings }
      ],
      change: overview.pendingListings,
      changeLabel: (t as any)?.stats?.listings?.pendingApproval || 'pending approval',
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      action: () => navigateToSection('/dashboard/listings')
    },
    {
      icon: FaClipboardCheck,
      label: (t as any)?.stats?.bookings?.label || 'Bookings',
      value: overview.totalBookings,
      subStats: [
        { label: (t as any)?.stats?.bookings?.active || 'Active', value: overview.activeBookings },
        { label: (t as any)?.stats?.bookings?.completed || 'Completed', value: overview.completedBookings }
      ],
      change: overview.activeBookings,
      changeLabel: (t as any)?.stats?.bookings?.currentlyActive || 'currently active',
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      action: () => navigateToSection('/dashboard/bookings')
    },
    {
      icon: FaMoneyBillWave,
      label: (t as any)?.stats?.revenue?.label || 'Revenue',
      value: `${(revenue.totalRevenue / 1000).toFixed(1)}k`,
      subValue: (t as any)?.stats?.revenue?.currency || 'DZD',
      subStats: [
        { label: (t as any)?.stats?.revenue?.commission || 'Commission', value: `${(revenue.totalCommission / 1000).toFixed(1)}k` }
      ],
      change: `${(revenue.totalCommission / 1000).toFixed(1)}k`,
      changeLabel: (t as any)?.stats?.revenue?.commissionEarned || 'commission earned',
      color: 'bg-gradient-to-br from-[#FF6B35] to-[#ff8255]',
      action: () => setShowReportModal(true)
    }
  ];

  const quickActions: QuickAction[] = [
    {
      label: (t as any)?.quickActions?.addUser || 'Add User',
      icon: FaUserPlus,
      color: 'bg-blue-500',
      action: 'create-user'
    },
    {
      label: (t as any)?.quickActions?.viewUsers || 'View Users',
      icon: FaUserShield,
      color: 'bg-indigo-500',
      action: 'view-users',
      count: overview.totalUsers
    },
    {
      label: (t as any)?.quickActions?.listings || 'Listings',
      icon: FaListAlt,
      color: 'bg-green-500',
      action: 'manage-listings',
      count: overview.totalListings
    },
    {
      label: (t as any)?.quickActions?.applications || 'Applications',
      icon: FaClipboardList,
      color: 'bg-purple-500',
      action: 'host-applications',
      count: overview.pendingListings
    },
    {
      label: (t as any)?.quickActions?.bookings || 'Bookings',
      icon: FaClipboardCheck,
      color: 'bg-pink-500',
      action: 'view-bookings',
      count: overview.activeBookings
    },
    {
      label: (t as any)?.quickActions?.reports || 'Reports',
      icon: FaChartBar,
      color: 'bg-yellow-500',
      action: 'reports'
    },
    {
      label: (t as any)?.quickActions?.exportData || 'Export Data',
      icon: FaDownload,
      color: 'bg-teal-500',
      action: 'export'
    },
    {
      label: (t as any)?.quickActions?.systemSettings || 'Paramètres Système',
      icon: FaCogs,
      color: 'bg-gray-500',
      action: 'settings'
    }
  ];

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'create-user':
        setShowQuickUserModal(true);
        break;
      case 'view-users':
        navigateToSection('/dashboard/users');
        break;
      case 'manage-listings':
        navigateToSection('/dashboard/listings');
        break;
      case 'host-applications':
        navigateToSection('/dashboard/host-applications');
        break;
      case 'view-bookings':
        navigateToSection('/dashboard/bookings');
        break;
      case 'reports':
        setShowReportModal(true);
        break;
      case 'export':
        setShowExportModal(true);
        break;
      case 'settings':
        navigateToSection('/dashboard/admin/settings');
        break;
      default:
        break;
    }
  };

  const getAvatarUrl = (avatar: string | undefined) => {
    if (!avatar) return '/uploads/users/default-avatar.png';
    if (avatar.startsWith('http')) return avatar;

    // Remove /api from the URL for static files
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${avatar}`;
  };

  const getListingImageUrl = (imageUrl: string | undefined) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    if (!imageUrl) return `${baseUrl}/uploads/listings/default-listing.jpg`;
    if (imageUrl.startsWith('http')) return imageUrl;

    return `${baseUrl}${imageUrl}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-6">
            {/* Profile Picture */}
            <Link href="/dashboard/admin/settings" className="group relative flex-shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-xl ring-4 ring-primary-400 group-hover:ring-primary-300 transition-all duration-300">
                {user?.avatar ? (
                  <Image
                    src={getAvatarUrl(user.avatar)}
                    alt={`${user.firstName} ${user.lastName}`}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-white flex items-center justify-center">
                    <FaUserShield className="text-primary-500 text-4xl" />
                  </div>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="text-xs font-semibold bg-white text-primary-600 px-2 py-1 rounded">Edit</span>
              </div>
            </Link>

            {/* Header Text */}
            <div>
              <h1 className="text-3xl font-bold">{(t as any)?.header?.title || 'Admin Dashboard'}</h1>
              <p className="text-primary-100 mt-1">{(t as any)?.header?.subtitle || 'Complete overview of Baytup platform'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-white text-primary-600 rounded-lg hover:bg-primary-50 transition-colors shadow-md"
            >
              <FaDownload />
              <span>{(t as any)?.actions?.export || 'Export'}</span>
            </button>
            <button
              onClick={refreshDashboardData}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50 shadow-md"
            >
              <FaSync className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? ((t as any)?.actions?.refreshing || 'Refreshing...') : ((t as any)?.actions?.refresh || 'Refresh')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FaBoxOpen className="mr-2 text-[#FF6B35]" />
          {(t as any)?.sections?.quickActions || 'Quick Actions'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleQuickAction(action.action)}
              className="relative p-4 rounded-lg border-2 border-gray-200 hover:border-[#FF6B35] hover:shadow-md transition-all group"
            >
              <div className={`${action.color} w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-md`}>
                <action.icon className="text-white text-xl" />
              </div>
              <p className="text-sm font-medium text-gray-700 text-center">{action.label}</p>
              {action.count !== undefined && (
                <span className="absolute top-2 right-2 bg-[#FF6B35] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
                  {action.count > 99 ? '99+' : action.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div
            key={index}
            onClick={stat.action}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`${stat.color} p-4 rounded-xl text-white group-hover:scale-110 transition-transform shadow-lg`}>
                <stat.icon size={28} />
              </div>
              {stat.change && (
                <div className="flex flex-col items-end">
                  <span className="text-green-500 text-sm font-semibold flex items-center">
                    <FaArrowUp className="mr-1" />
                    +{stat.change}
                  </span>
                  {stat.changeLabel && (
                    <span className="text-xs text-gray-400 mt-1">{stat.changeLabel}</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-baseline space-x-2 mb-3">
              <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
              {stat.subValue && (
                <span className="text-sm font-medium text-gray-500">{stat.subValue}</span>
              )}
            </div>
            <p className="text-sm text-gray-600 font-medium mb-3">{stat.label}</p>
            {stat.subStats && (
              <div className="flex items-center space-x-4 pt-3 border-t border-gray-100">
                {stat.subStats.map((subStat, idx) => (
                  <div key={idx} className="flex-1">
                    <p className="text-xs text-gray-500">{subStat.label}</p>
                    <p className="text-lg font-semibold text-gray-700">{subStat.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100 h-[420px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <FaChartLine className="mr-2 text-[#FF6B35]" />
                {(t as any)?.charts?.revenue?.title || 'Revenue Trend'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{(t as any)?.charts?.revenue?.subtitle || 'Last 6 months performance'}</p>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full bg-[#FF6B35]"></div>
                <span className="text-gray-600">Revenue</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <Line
              data={revenueChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    backgroundColor: '#1F2937',
                    padding: 12,
                    titleColor: '#FFFFFF',
                    bodyColor: '#FFFFFF',
                    borderColor: '#FF6B35',
                    borderWidth: 1
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                      callback: function(value) {
                        return value + ' DZD';
                      }
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 h-[420px] flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FaChartBar className="mr-2 text-green-500" />
              {(t as any)?.charts?.categories?.title || 'Categories'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{(t as any)?.charts?.categories?.subtitle || 'Listings by category'}</p>
          </div>
          <div className="flex-1 min-h-0">
            <Doughnut
              data={categoryChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      padding: 15,
                      font: {
                        size: 11
                      }
                    }
                  },
                  tooltip: {
                    backgroundColor: '#1F2937',
                    padding: 12,
                    titleColor: '#FFFFFF',
                    bodyColor: '#FFFFFF'
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Location Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 h-[350px] flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FaMapMarkerAlt className="mr-2 text-red-500" />
            {(t as any)?.charts?.locations?.title || 'Top Cities'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{(t as any)?.charts?.locations?.subtitle || 'Most popular destinations'}</p>
        </div>
        <div className="flex-1 min-h-0">
          <Bar
            data={locationChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  backgroundColor: '#1F2937',
                  padding: 12,
                  titleColor: '#FFFFFF',
                  bodyColor: '#FFFFFF',
                  borderColor: '#FF6B35',
                  borderWidth: 1
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                  }
                },
                x: {
                  grid: {
                    display: false
                  }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Listings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-[520px] flex flex-col">
          <div className="bg-gradient-to-r from-[#FF6B35] to-[#ff8255] p-6">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <FaTrophy className="mr-2" />
              {(t as any)?.sections?.topListings?.title || 'Top Performing Listings'}
            </h3>
            <p className="text-white/80 text-sm mt-1">{(t as any)?.sections?.topListings?.subtitle || 'Best rated and most booked'}</p>
          </div>
          <div className="divide-y divide-gray-100 flex-1 overflow-y-auto">
            {topListings?.slice(0, 5).map((listing: any, index: number) => (
              <div
                key={index}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => openDetailModal('listing', listing)}
              >
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm">
                      {listing.images?.[0] ? (
                        <img
                          src={getListingImageUrl(listing.images[0].url)}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            if (target.nextElementSibling) {
                              (target.nextElementSibling as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-100 to-gray-200" style={{ display: listing.images?.[0] ? 'none' : 'flex' }}>
                        <FaBed size={24} />
                      </div>
                    </div>
                    <div className="absolute -top-2 -right-2 bg-[#FF6B35] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow">
                      #{index + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{listing.title}</h4>
                    <p className="text-sm text-gray-500 capitalize">{listing.category}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-xs text-gray-600 flex items-center bg-yellow-50 px-2 py-1 rounded">
                        <FaStar className="mr-1 text-yellow-400" />
                        {listing.stats?.averageRating?.toFixed(1) || '0.0'}
                      </span>
                      <span className="text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded">
                        {listing.stats?.bookings || 0} bookings
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#FF6B35] text-lg">
                      {listing.pricing?.basePrice}
                    </p>
                    <p className="text-xs text-gray-500">
                      {listing.pricing.currency || 'DZD'}/{
                        listing.pricing?.pricingType === 'per_day' ? 'jour' :
                        listing.pricing?.pricingType === 'per_night' ? 'nuit' :
                        listing.pricing?.pricingType === 'per_hour' ? 'heure' :
                        listing.pricing?.pricingType === 'per_week' ? 'semaine' :
                        listing.pricing?.pricingType === 'per_month' ? 'mois' :
                        (listing.category === 'vehicle' ? 'jour' : 'nuit')
                      }
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <button
              onClick={() => navigateToSection('/dashboard/listings')}
              className="w-full text-center text-[#FF6B35] hover:text-[#ff8255] font-medium text-sm transition-colors"
            >
              {(t as any)?.actions?.viewAllListings || 'View All Listings'} →
            </button>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-[520px] flex flex-col">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <FaClipboardCheck className="mr-2" />
              {(t as any)?.sections?.recentBookings?.title || 'Recent Bookings'}
            </h3>
            <p className="text-white/80 text-sm mt-1">{(t as any)?.sections?.recentBookings?.subtitle || 'Latest reservations'}</p>
          </div>
          <div className="divide-y divide-gray-100 flex-1 overflow-y-auto">
            {recentActivities?.bookings?.slice(0, 5).map((booking: any, index: number) => (
              <div
                key={index}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => openDetailModal('booking', booking)}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[#FF6B35] to-[#ff8255] flex-shrink-0 shadow-sm">
                    {booking.guest?.avatar ? (
                      <img
                        src={booking.guest.avatar}
                        alt={booking.guest.firstName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                        {booking.guest?.firstName?.[0]}{booking.guest?.lastName?.[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">
                      {booking.guest?.firstName} {booking.guest?.lastName}
                    </h4>
                    <p className="text-sm text-gray-500 truncate">
                      {booking.listing?.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{booking.totalPrice} DZD</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <button
              onClick={() => navigateToSection('/dashboard/bookings')}
              className="w-full text-center text-purple-600 hover:text-purple-700 font-medium text-sm transition-colors"
            >
              {(t as any)?.actions?.viewAllBookings || 'View All Bookings'} →
            </button>
          </div>
        </div>
      </div>

      {/* User Growth Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 h-[350px] flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FaUsers className="mr-2 text-blue-500" />
            {(t as any)?.charts?.userGrowth?.title || 'User Growth'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{(t as any)?.charts?.userGrowth?.subtitle || 'New user registrations in the last 30 days'}</p>
        </div>
        <div className="flex-1 min-h-0">
          <Line
            data={{
              labels: analytics.userGrowth?.map((item: any) => {
                const date = new Date(item._id);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }) || [],
              datasets: [
                {
                  label: 'New Users',
                  data: analytics.userGrowth?.map((item: any) => item.count) || [],
                  borderColor: '#34D399',
                  backgroundColor: 'rgba(52, 211, 153, 0.1)',
                  fill: true,
                  tension: 0.4
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  backgroundColor: '#1F2937',
                  padding: 12,
                  titleColor: '#FFFFFF',
                  bodyColor: '#FFFFFF',
                  borderColor: '#34D399',
                  borderWidth: 1
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1
                  },
                  grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                  }
                },
                x: {
                  grid: {
                    display: false
                  }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* System Status */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-green-500 p-3 rounded-lg text-white">
              <FaCheckCircle size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{(t as any)?.info?.systemStatus?.title || 'System Status'}</h3>
              <p className="text-sm text-gray-600">{(t as any)?.info?.systemStatus?.subtitle || 'All systems operational'}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{(t as any)?.info?.systemStatus?.apiStatus || 'API Status'}</span>
              <span className="text-green-600 font-semibold">{(t as any)?.info?.systemStatus?.active || 'Active'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{(t as any)?.info?.systemStatus?.database || 'Database'}</span>
              <span className="text-green-600 font-semibold">{(t as any)?.info?.systemStatus?.connected || 'Connected'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{(t as any)?.info?.systemStatus?.paymentGateway || 'Payment Gateway'}</span>
              <span className="text-green-600 font-semibold">{(t as any)?.info?.systemStatus?.online || 'Online'}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-blue-500 p-3 rounded-lg text-white">
              <FaChartLine size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Quick Stats</h3>
              <p className="text-sm text-gray-600">Platform metrics</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Avg. Booking Value</span>
              <span className="text-blue-600 font-semibold">{revenue.averageBookingValue?.toFixed(0)} DZD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Featured Listings</span>
              <span className="text-blue-600 font-semibold">{overview.featuredListings}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cancelled Bookings</span>
              <span className="text-blue-600 font-semibold">{overview.cancelledBookings}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-[#FF6B35] p-3 rounded-lg text-white">
              <FaClock size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Activity</h3>
              <p className="text-sm text-gray-600">Recent platform activity</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">New Reviews</span>
              <span className="text-[#FF6B35] font-semibold">{recentActivities?.reviews?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">New Bookings Today</span>
              <span className="text-[#FF6B35] font-semibold">{recentActivities?.bookings?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">New Users Today</span>
              <span className="text-[#FF6B35] font-semibold">{overview.newUsersThisMonth}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Create User Modal */}
      {showQuickUserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowQuickUserModal(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-gradient-to-r from-[#FF6B35] to-[#ff8255] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white flex items-center space-x-2">
                    <FaUserPlus />
                    <span>{(t as any)?.modals?.createUser?.title || 'Quick Create User'}</span>
                  </h3>
                  <button
                    onClick={() => setShowQuickUserModal(false)}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{(t as any)?.modals?.createUser?.firstName || 'First Name'} *</label>
                    <input
                      type="text"
                      value={quickUserForm.firstName}
                      onChange={(e) => setQuickUserForm({ ...quickUserForm, firstName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={quickUserForm.lastName}
                      onChange={(e) => setQuickUserForm({ ...quickUserForm, lastName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={quickUserForm.email}
                    onChange={(e) => setQuickUserForm({ ...quickUserForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                    placeholder="john.doe@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input
                    type="password"
                    value={quickUserForm.password}
                    onChange={(e) => setQuickUserForm({ ...quickUserForm, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                    placeholder="Min 6 characters"
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={quickUserForm.role}
                    onChange={(e) => setQuickUserForm({ ...quickUserForm, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  >
                    <option value="guest">Guest</option>
                    <option value="host">Host</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={() => setShowQuickUserModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {(t as any)?.actions?.cancel || 'Cancel'}
                </button>
                <button
                  onClick={handleQuickCreateUser}
                  className="px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#ff8255] transition-colors flex items-center space-x-2"
                >
                  <FaSave />
                  <span>{(t as any)?.modals?.createUser?.submitButton || 'Create User'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal.type && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeDetailModal}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-gradient-to-r from-[#FF6B35] to-[#ff8255] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white flex items-center space-x-2">
                    <FaInfoCircle />
                    <span>Details</span>
                  </h3>
                  <button
                    onClick={closeDetailModal}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 max-h-96 overflow-y-auto">
                {/* ✅ FIXED BQ-50/51: Formatted interface instead of raw JSON */}
                {showDetailModal.type === 'user' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Name</label>
                        <p className="text-gray-900">{showDetailModal.data.firstName} {showDetailModal.data.lastName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-gray-900">{showDetailModal.data.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <p className="text-gray-900">{showDetailModal.data.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Role</label>
                        <p className="text-gray-900 capitalize">{showDetailModal.data.role}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <p className={`inline-block px-2 py-1 rounded text-sm ${showDetailModal.data.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {showDetailModal.data.isActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Verified</label>
                        <p className={`inline-block px-2 py-1 rounded text-sm ${showDetailModal.data.isVerified ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {showDetailModal.data.isVerified ? 'Verified' : 'Not Verified'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Joined</label>
                        <p className="text-gray-900">{new Date(showDetailModal.data.createdAt).toLocaleDateString()}</p>
                      </div>
                      {showDetailModal.data.address && (
                        <div className="col-span-2">
                          <label className="text-sm font-medium text-gray-500">Address</label>
                          <p className="text-gray-900">{showDetailModal.data.address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {showDetailModal.type === 'booking' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Booking ID</label>
                        <p className="text-gray-900 font-mono text-sm">{showDetailModal.data._id}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <p className="text-gray-900 capitalize">{showDetailModal.data.status}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Guest</label>
                        <p className="text-gray-900">{showDetailModal.data.guest?.firstName} {showDetailModal.data.guest?.lastName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Host</label>
                        <p className="text-gray-900">{showDetailModal.data.host?.firstName} {showDetailModal.data.host?.lastName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Check-in</label>
                        <p className="text-gray-900">{new Date(showDetailModal.data.startDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Check-out</label>
                        <p className="text-gray-900">{new Date(showDetailModal.data.endDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Total Amount</label>
                        <p className="text-gray-900 font-semibold">{showDetailModal.data.pricing?.totalAmount} DZD</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Payment Status</label>
                        <p className={`inline-block px-2 py-1 rounded text-sm ${showDetailModal.data.payment?.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {showDetailModal.data.payment?.status || 'Pending'}
                        </p>
                      </div>
                      {showDetailModal.data.listing && (
                        <div className="col-span-2">
                          <label className="text-sm font-medium text-gray-500">Listing</label>
                          <p className="text-gray-900">{showDetailModal.data.listing.title}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {showDetailModal.type === 'listing' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-gray-500">Title</label>
                        <p className="text-gray-900 font-semibold">{showDetailModal.data.title}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Category</label>
                        <p className="text-gray-900 capitalize">{showDetailModal.data.category}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Subcategory</label>
                        <p className="text-gray-900 capitalize">{showDetailModal.data.subcategory}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Price</label>
                        <p className="text-gray-900 font-semibold">
                          {showDetailModal.data.pricing?.basePrice} {showDetailModal.data.pricing?.currency || 'DZD'}/{
                            showDetailModal.data.pricing?.pricingType === 'per_day' ? 'jour' :
                            showDetailModal.data.pricing?.pricingType === 'per_night' ? 'nuit' :
                            showDetailModal.data.pricing?.pricingType === 'per_hour' ? 'heure' :
                            showDetailModal.data.pricing?.pricingType === 'per_week' ? 'semaine' :
                            showDetailModal.data.pricing?.pricingType === 'per_month' ? 'mois' :
                            (showDetailModal.data.category === 'vehicle' ? 'jour' : 'nuit')
                          }
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <p className={`inline-block px-2 py-1 rounded text-sm ${showDetailModal.data.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {showDetailModal.data.status}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Host</label>
                        <p className="text-gray-900">{showDetailModal.data.host?.firstName} {showDetailModal.data.host?.lastName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Location</label>
                        <p className="text-gray-900">{showDetailModal.data.address?.city}, {showDetailModal.data.address?.state}</p>
                      </div>
                      {showDetailModal.data.stats && (
                        <>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Rating</label>
                            <p className="text-gray-900">⭐ {showDetailModal.data.stats.averageRating?.toFixed(1) || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Total Bookings</label>
                            <p className="text-gray-900">{showDetailModal.data.stats.totalBookings || 0}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {showDetailModal.type === 'application' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Applicant</label>
                        <p className="text-gray-900">{showDetailModal.data.user?.firstName} {showDetailModal.data.user?.lastName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-gray-900">{showDetailModal.data.user?.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <p className="text-gray-900 capitalize">{showDetailModal.data.status}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Applied</label>
                        <p className="text-gray-900">{new Date(showDetailModal.data.createdAt).toLocaleDateString()}</p>
                      </div>
                      {showDetailModal.data.notes && (
                        <div className="col-span-2">
                          <label className="text-sm font-medium text-gray-500">Notes</label>
                          <p className="text-gray-900">{showDetailModal.data.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!showDetailModal.type && (
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(showDetailModal.data, null, 2)}
                  </pre>
                )}
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end">
                <button
                  onClick={closeDetailModal}
                  className="px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#ff8255] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowReportModal(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-gradient-to-r from-[#FF6B35] to-[#ff8255] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white flex items-center space-x-2">
                    <FaChartBar />
                    <span>Generate Report</span>
                  </h3>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                  <select
                    value={reportFilters.type}
                    onChange={(e) => setReportFilters({ ...reportFilters, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  >
                    <option value="revenue">Revenue Report</option>
                    <option value="bookings">Bookings Report</option>
                    <option value="users">Users Report</option>
                    <option value="listings">Listings Report</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                  <select
                    value={reportFilters.dateRange}
                    onChange={(e) => setReportFilters({ ...reportFilters, dateRange: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  >
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                    <option value="quarter">Last Quarter</option>
                    <option value="year">Last Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={reportFilters.category}
                    onChange={(e) => setReportFilters({ ...reportFilters, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  >
                    <option value="all">All Categories</option>
                    <option value="stay">Stays / Properties</option>
                    <option value="vehicle">Vehicles</option>
                  </select>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateReport}
                  className="px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#ff8255] transition-colors flex items-center space-x-2"
                >
                  <FaFileAlt />
                  <span>Generate</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowExportModal(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-gradient-to-r from-[#FF6B35] to-[#ff8255] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white flex items-center space-x-2">
                    <FaDownload />
                    <span>Export Data</span>
                  </h3>
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
              <div className="px-6 py-4">
                <p className="text-sm text-gray-600 mb-4">Choose export format:</p>
                <div className="space-y-3">
                  {/* ✅ FIXED BQ-47/49: Real export functionality */}
                  <button
                    onClick={() => handleExportData('csv', 'all')}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-[#FF6B35] hover:bg-gray-50 transition-colors text-left flex items-center space-x-3"
                  >
                    <FaFileAlt className="text-green-500 text-xl" />
                    <div>
                      <p className="font-medium text-gray-900">CSV Format</p>
                      <p className="text-xs text-gray-500">Export all data as separate CSV files</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExportData('excel', 'all')}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-[#FF6B35] hover:bg-gray-50 transition-colors text-left flex items-center space-x-3"
                  >
                    <FaFileAlt className="text-green-600 text-xl" />
                    <div>
                      <p className="font-medium text-gray-900">Excel Format</p>
                      <p className="text-xs text-gray-500">Export all data in one Excel workbook with multiple sheets</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowExportModal(false);
                      setShowPdfModal(true);
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-[#FF6B35] hover:bg-gray-50 transition-colors text-left flex items-center space-x-3"
                  >
                    <FaFilePdf className="text-red-500 text-xl" />
                    <div>
                      <p className="font-medium text-gray-900">PDF Report with Charts</p>
                      <p className="text-xs text-gray-500">Professional report with graphs and statistics</p>
                    </div>
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================
          PDF EXPORT MODAL WITH CHARTS
          =================================== */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowPdfModal(false)}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#FF6B35] to-[#ff8255] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white flex items-center space-x-2">
                    <FaFilePdf />
                    <span>Export PDF Report</span>
                  </h3>
                  <button
                    onClick={() => setShowPdfModal(false)}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                {/* Date Range */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📅 Date Range
                  </label>
                  <select
                    value={pdfOptions.dateRange}
                    onChange={(e) => setPdfOptions({...pdfOptions, dateRange: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  >
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                    <option value="quarter">Last Quarter</option>
                    <option value="year">Last Year</option>
                  </select>
                </div>

                {/* Category */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🏷️ Category
                  </label>
                  <select
                    value={pdfOptions.category}
                    onChange={(e) => setPdfOptions({...pdfOptions, category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    <option value="stay">Stays / Properties</option>
                    <option value="vehicle">Vehicles</option>
                  </select>
                </div>

                {/* Sections */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    📊 Include in Report
                  </label>
                  
                  <div className="space-y-3">
                    {/* Always included */}
                    <div className="flex items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="mt-1 h-4 w-4 text-[#FF6B35] border-gray-300 rounded"
                      />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">Revenue Overview</p>
                        <p className="text-xs text-gray-500">Always included • Total revenue, fees, earnings</p>
                      </div>
                    </div>

                    {/* Bookings Stats */}
                    <div 
                      className="flex items-start p-3 bg-white rounded-lg border border-gray-200 hover:border-[#FF6B35] cursor-pointer"
                      onClick={() => setPdfOptions({
                        ...pdfOptions,
                        sections: {...pdfOptions.sections, bookingsStats: !pdfOptions.sections.bookingsStats}
                      })}
                    >
                      <input
                        type="checkbox"
                        checked={pdfOptions.sections.bookingsStats}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 text-[#FF6B35] border-gray-300 rounded"
                      />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">Bookings Statistics</p>
                        <p className="text-xs text-gray-500">📈 Per month • 🥧 Stay vs Vehicle • 📊 Status distribution</p>
                      </div>
                    </div>

                    {/* Listings Analysis */}
                    <div 
                      className="flex items-start p-3 bg-white rounded-lg border border-gray-200 hover:border-[#FF6B35] cursor-pointer"
                      onClick={() => setPdfOptions({
                        ...pdfOptions,
                        sections: {...pdfOptions.sections, listingsAnalysis: !pdfOptions.sections.listingsAnalysis}
                      })}
                    >
                      <input
                        type="checkbox"
                        checked={pdfOptions.sections.listingsAnalysis}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 text-[#FF6B35] border-gray-300 rounded"
                      />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">Listings Analysis</p>
                        <p className="text-xs text-gray-500">🏠 By type • 💰 Avg price • 📊 Occupancy rate</p>
                      </div>
                    </div>

                    {/* Users Stats */}
                    <div 
                      className="flex items-start p-3 bg-white rounded-lg border border-gray-200 hover:border-[#FF6B35] cursor-pointer"
                      onClick={() => setPdfOptions({
                        ...pdfOptions,
                        sections: {...pdfOptions.sections, usersStats: !pdfOptions.sections.usersStats}
                      })}
                    >
                      <input
                        type="checkbox"
                        checked={pdfOptions.sections.usersStats}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 text-[#FF6B35] border-gray-300 rounded"
                      />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">Users Statistics</p>
                        <p className="text-xs text-gray-500">👥 New per month • 🎭 Guests vs Hosts • ✅ Verification</p>
                      </div>
                    </div>

                    {/* Revenue Breakdown */}
                    <div 
                      className="flex items-start p-3 bg-white rounded-lg border border-gray-200 hover:border-[#FF6B35] cursor-pointer"
                      onClick={() => setPdfOptions({
                        ...pdfOptions,
                        sections: {...pdfOptions.sections, revenueBreakdown: !pdfOptions.sections.revenueBreakdown}
                      })}
                    >
                      <input
                        type="checkbox"
                        checked={pdfOptions.sections.revenueBreakdown}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 text-[#FF6B35] border-gray-300 rounded"
                      />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">Revenue Breakdown</p>
                        <p className="text-xs text-gray-500">💵 By category • 📈 Trend • 🌍 By city</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Branding Options */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    🎨 Branding Options
                  </label>
                  
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pdfOptions.branding.includeLogo}
                        onChange={(e) => setPdfOptions({
                          ...pdfOptions,
                          branding: {...pdfOptions.branding, includeLogo: e.target.checked}
                        })}
                        className="h-4 w-4 text-[#FF6B35] border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Include logo</span>
                    </label>
                    
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pdfOptions.branding.includeCompanyInfo}
                        onChange={(e) => setPdfOptions({
                          ...pdfOptions,
                          branding: {...pdfOptions.branding, includeCompanyInfo: e.target.checked}
                        })}
                        className="h-4 w-4 text-[#FF6B35] border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Include company info</span>
                    </label>
                    
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pdfOptions.branding.addWatermark}
                        onChange={(e) => setPdfOptions({
                          ...pdfOptions,
                          branding: {...pdfOptions.branding, addWatermark: e.target.checked}
                        })}
                        className="h-4 w-4 text-[#FF6B35] border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Add watermark</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={generatePDFReport}
                  className="px-4 py-2 bg-gradient-to-r from-[#FF6B35] to-[#ff8255] text-white rounded-lg hover:shadow-lg transition-all flex items-center space-x-2"
                >
                  <FaFilePdf />
                  <span>Generate PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}