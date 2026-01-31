'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Users,
  Wallet,
  TrendingUp,
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface StripeHost {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  stripeConnect: {
    accountId: string;
    onboardingStatus: 'not_started' | 'pending' | 'completed' | 'restricted';
    payoutsEnabled: boolean;
    chargesEnabled: boolean;
    detailsSubmitted: boolean;
    onboardingCompletedAt?: string;
  };
}

interface StripeBalance {
  available: Array<{ amount: number; currency: string }>;
  pending: Array<{ amount: number; currency: string }>;
}

interface Stats {
  total: number;
  completed: number;
  pending: number;
  restricted: number;
  not_started: number;
}

export default function StripeConnectAdmin() {
  const { token } = useAuth();
  const [hosts, setHosts] = useState<StripeHost[]>([]);
  const [balance, setBalance] = useState<StripeBalance | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch hosts
  const fetchHosts = useCallback(async () => {
    try {
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/admin/stripe-connect/hosts?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur');
      }

      setHosts(data.data.hosts);
      setStats(data.data.stats);
      setTotalPages(data.data.pagination.pages);
    } catch (err: any) {
      setError(err.message);
    }
  }, [token, page, statusFilter]);

  // Fetch platform balance
  const fetchBalance = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/stripe-connect/balance', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setBalance(data.data);
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  }, [token]);

  // Initial fetch
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchHosts(), fetchBalance()]);
      setLoading(false);
    };
    fetchAll();
  }, [fetchHosts, fetchBalance]);

  // Refetch when filters change
  useEffect(() => {
    if (!loading) {
      fetchHosts();
    }
  }, [page, statusFilter]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { icon: any; color: string; label: string }> = {
      completed: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Actif' },
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-700', label: 'En cours' },
      restricted: { icon: AlertCircle, color: 'bg-red-100 text-red-700', label: 'Restreint' },
      not_started: { icon: XCircle, color: 'bg-gray-100 text-gray-700', label: 'Non demarre' }
    };

    const badge = badges[status] || badges.not_started;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {badge.label}
      </span>
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  };

  // Filter hosts by search query
  const filteredHosts = hosts.filter(host => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      host.firstName.toLowerCase().includes(query) ||
      host.lastName.toLowerCase().includes(query) ||
      host.email.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-[#FF6B35]" />
        <p className="mt-4 text-gray-600">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Stripe Connect</h2>
          <p className="text-gray-500 text-sm mt-1">
            Gerez les comptes Stripe des hosts
          </p>
        </div>
        <button
          onClick={() => {
            fetchHosts();
            fetchBalance();
          }}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Platform balance */}
        {balance && (
          <div className="bg-gradient-to-br from-[#FF6B35] to-[#e55a2b] rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 opacity-80" />
              <span className="text-sm opacity-80">Solde disponible</span>
            </div>
            {balance.available.map((b, i) => (
              <p key={i} className="text-2xl font-bold">
                {formatCurrency(b.amount, b.currency)}
              </p>
            ))}
            {balance.pending.length > 0 && (
              <p className="text-sm opacity-80 mt-1">
                + {formatCurrency(balance.pending[0]?.amount || 0, balance.pending[0]?.currency || 'EUR')} en attente
              </p>
            )}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2 text-gray-500">
                <Users className="w-5 h-5" />
                <span className="text-sm">Total hosts Stripe</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm">Comptes actifs</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-sm text-gray-500 mt-1">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% des hosts
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2 text-yellow-600">
                <Clock className="w-5 h-5" />
                <span className="text-sm">En cours</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              {stats.restricted > 0 && (
                <p className="text-sm text-red-500 mt-1">
                  {stats.restricted} restreint(s)
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35]"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] appearance-none bg-white min-w-[160px]"
          >
            <option value="">Tous les statuts</option>
            <option value="completed">Actifs</option>
            <option value="pending">En cours</option>
            <option value="restricted">Restreints</option>
          </select>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Hosts table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Host
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Paiements
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Virements
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date activation
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredHosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    Aucun host trouve
                  </td>
                </tr>
              ) : (
                filteredHosts.map((host) => (
                  <tr key={host._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {host.firstName} {host.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{host.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(host.stripeConnect.onboardingStatus)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 text-sm ${
                        host.stripeConnect.chargesEnabled ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {host.stripeConnect.chargesEnabled ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Actifs
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            Inactifs
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 text-sm ${
                        host.stripeConnect.payoutsEnabled ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {host.stripeConnect.payoutsEnabled ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Actifs
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            Inactifs
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {host.stripeConnect.onboardingCompletedAt
                        ? new Date(host.stripeConnect.onboardingCompletedAt).toLocaleDateString('fr-FR')
                        : '-'
                      }
                    </td>
                    <td className="px-4 py-4 text-right">
                      <a
                        href={`https://dashboard.stripe.com/connect/accounts/${host.stripeConnect.accountId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-[#FF6B35] hover:text-[#e55a2b] font-medium"
                      >
                        Voir sur Stripe
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {page} sur {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Precedent
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
