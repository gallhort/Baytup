'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface CommissionStats {
  overview: {
    totalBookings: number;
    totalGuestFees: number;
    totalHostCommissions: number;
    totalCommissions: number;
    averageBookingValue: number;
    currencies: string[];
  };
  byCurrency: Array<{
    _id: string;
    count: number;
    guestFees: number;
    hostCommissions: number;
    totalCommissions: number;
  }>;
  byPeriod: Array<{
    _id: { year: number; month: number; week?: number };
    count: number;
    guestFees: number;
    hostCommissions: number;
    totalCommissions: number;
  }>;
  recentBookings: Array<{
    _id: string;
    createdAt: string;
    pricing: any;
    status: string;
    guest: { firstName: string; lastName: string; email: string };
    host: { firstName: string; lastName: string; email: string };
    listing: { title: string };
  }>;
  topHosts: Array<{
    _id: { firstName: string; lastName: string; email: string };
    bookingsCount: number;
    totalCommissions: number;
  }>;
}

const COLORS = ['#FF6B35', '#004E89', '#1B998B', '#F46036', '#5F0F40'];

export default function AdminCommissionsPage() {
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    currency: '',
    period: 'month'
  });

  useEffect(() => {
    fetchStats();
  }, [filters]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();

      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.currency) params.append('currency', filters.currency);
      if (filters.period) params.append('period', filters.period);

      const res = await axios.get(`${API_URL}/admin/commissions/stats?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStats(res.data.data);
    } catch (error: any) {
      toast.error('Erreur chargement statistiques');
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPeriodLabel = (period: any) => {
    if (period.week) {
      return `S${period.week} ${period.year}`;
    }
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    return `${months[period.month - 1]} ${period.year}`;
  };

  const exportToCSV = () => {
    if (!stats) return;

    const csvData = stats.recentBookings.map(b => ({
      Date: new Date(b.createdAt).toLocaleDateString('fr-FR'),
      Guest: `${b.guest.firstName} ${b.guest.lastName}`,
      Host: `${b.host.firstName} ${b.host.lastName}`,
      Listing: b.listing.title,
      Total: b.pricing.total,
      'Frais Guest': b.pricing.serviceFee,
      'Commission Host': b.pricing.hostCommission,
      'Commission Totale': b.pricing.serviceFee + b.pricing.hostCommission,
      Devise: b.pricing.currency,
      Statut: b.status
    }));

    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35]"></div>
      </div>
    );
  }

  if (!stats) return null;

  const chartDataByPeriod = stats.byPeriod.map(p => ({
    name: formatPeriodLabel(p._id),
    'Frais Guest': p.guestFees,
    'Commissions Host': p.hostCommissions,
    Total: p.totalCommissions
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-[#FF6B35]" />
          Tracking des Commissions
        </h1>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">Filtres</h2>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="px-4 py-2 border rounded-lg"
            placeholder="Date début"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="px-4 py-2 border rounded-lg"
            placeholder="Date fin"
          />
          <select
            value={filters.currency}
            onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">Toutes devises</option>
            <option value="DZD">DZD</option>
            <option value="EUR">EUR</option>
          </select>
          <select
            value={filters.period}
            onChange={(e) => setFilters({ ...filters, period: e.target.value })}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="month">Par mois</option>
            <option value="week">Par semaine</option>
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg shadow border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Total Commissions</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">
                {stats.overview.totalCommissions.toLocaleString()}
              </p>
              <p className="text-xs text-orange-600 mt-1">
                {stats.overview.currencies.join(' + ')}
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-orange-500 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg shadow border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Frais Guest (8%)</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {stats.overview.totalGuestFees.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg shadow border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Commission Host (3%)</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {stats.overview.totalHostCommissions.toLocaleString()}
              </p>
            </div>
            <Users className="w-10 h-10 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg shadow border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Réservations</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {stats.overview.totalBookings}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Moy: {Math.round(stats.overview.averageBookingValue)}
              </p>
            </div>
            <Calendar className="w-10 h-10 text-purple-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Evolution par période */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-bold mb-4">Évolution des Commissions</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartDataByPeriod}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Frais Guest" stroke="#004E89" strokeWidth={2} />
              <Line type="monotone" dataKey="Commissions Host" stroke="#1B998B" strokeWidth={2} />
              <Line type="monotone" dataKey="Total" stroke="#FF6B35" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Par devise */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-bold mb-4">Répartition par Devise</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.byCurrency}
                dataKey="totalCommissions"
                nameKey="_id"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry._id}: ${entry.totalCommissions.toLocaleString()}`}
              >
                {stats.byCurrency.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Hosts */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-lg font-bold mb-4">Top 10 Hôtes (Commissions)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hôte</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Réservations</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commissions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.topHosts.map((host, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{index + 1}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {host._id.firstName} {host._id.lastName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{host._id.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{host.bookingsCount}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-green-600">
                    {host.totalCommissions.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Réservations Récentes */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-4">20 Dernières Réservations</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Host</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Annonce</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frais Guest</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comm. Host</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Comm.</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.recentBookings.map((booking) => (
                <tr key={booking._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(booking.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {booking.guest.firstName} {booking.guest.lastName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {booking.host.firstName} {booking.host.lastName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-xs">
                    {booking.listing.title}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {booking.pricing.total} {booking.pricing.currency}
                  </td>
                  <td className="px-6 py-4 text-sm text-blue-600">
                    {booking.pricing.serviceFee}
                  </td>
                  <td className="px-6 py-4 text-sm text-green-600">
                    {booking.pricing.hostCommission}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-orange-600">
                    {booking.pricing.serviceFee + booking.pricing.hostCommission}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
