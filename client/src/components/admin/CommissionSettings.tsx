'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Percent,
  Info,
  History,
  ChevronDown,
  ChevronUp,
  Building2,
  Home,
  Car,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface CommissionRate {
  key: string;
  value: number;
  valueType: string;
  description: string;
  minValue: number;
  maxValue: number;
  updatedAt: string;
  updatedBy?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface CommissionRates {
  default: number;
  stay: number;
  vehicle: number;
  luxury: number;
}

interface HistoryEntry {
  previousValue: number;
  newValue: number;
  changedBy?: {
    firstName: string;
    lastName: string;
  };
  changedAt: string;
  reason?: string;
}

const categoryIcons: Record<string, any> = {
  default: Building2,
  stay: Home,
  vehicle: Car,
  luxury: Sparkles
};

const categoryLabels: Record<string, string> = {
  default: 'Par defaut',
  stay: 'Hebergements',
  vehicle: 'Vehicules',
  luxury: 'Luxe (>500EUR/nuit)'
};

const categoryColors: Record<string, string> = {
  default: 'bg-gray-100 text-gray-700',
  stay: 'bg-blue-100 text-blue-700',
  vehicle: 'bg-green-100 text-green-700',
  luxury: 'bg-purple-100 text-purple-700'
};

export default function CommissionSettings() {
  const { token } = useAuth();
  const [rates, setRates] = useState<CommissionRates>({
    default: 20,
    stay: 20,
    vehicle: 15,
    luxury: 25
  });
  const [originalRates, setOriginalRates] = useState<CommissionRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, HistoryEntry[]>>({});
  const [reason, setReason] = useState('');

  // Fetch current commission rates
  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/settings/commissions', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la recuperation');
      }

      const fetchedRates = {
        default: Math.round(data.data.rates.default * 100),
        stay: Math.round(data.data.rates.stay * 100),
        vehicle: Math.round(data.data.rates.vehicle * 100),
        luxury: Math.round(data.data.rates.luxury * 100)
      };

      setRates(fetchedRates);
      setOriginalRates(fetchedRates);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch history for a specific rate
  const fetchHistory = async (category: string) => {
    if (history[category]) {
      setShowHistory(showHistory === category ? null : category);
      return;
    }

    try {
      const response = await fetch(`/api/admin/settings/commission_${category}/history`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setHistory(prev => ({
          ...prev,
          [category]: data.data.history || []
        }));
      }

      setShowHistory(category);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  // Save commission rates
  const saveRates = async () => {
    try {
      setSaving(true);
      setError(null);

      // Convert to decimal (0.20 instead of 20)
      const ratesPayload = {
        default: rates.default / 100,
        stay: rates.stay / 100,
        vehicle: rates.vehicle / 100,
        luxury: rates.luxury / 100
      };

      const response = await fetch('/api/admin/settings/commissions', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rates: ratesPayload,
          reason: reason || 'Mise a jour des commissions'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la sauvegarde');
      }

      setOriginalRates(rates);
      setReason('');
      setHistory({}); // Clear history cache
      toast.success('Commissions mises a jour avec succes');
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Check if rates have changed
  const hasChanges = originalRates && (
    rates.default !== originalRates.default ||
    rates.stay !== originalRates.stay ||
    rates.vehicle !== originalRates.vehicle ||
    rates.luxury !== originalRates.luxury
  );

  // Initial fetch
  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-[#FF6B35]" />
        <p className="mt-4 text-gray-600">Chargement des parametres...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Configuration des commissions</h2>
          <p className="text-gray-500 text-sm mt-1">
            Definissez les taux de commission Baytup par categorie de bien
          </p>
        </div>
        <button
          onClick={fetchRates}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium">Erreur</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Commission cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(rates).map(([category, rate]) => {
          const Icon = categoryIcons[category];
          const label = categoryLabels[category];
          const colorClass = categoryColors[category];

          return (
            <div
              key={category}
              className="bg-white border border-gray-200 rounded-xl p-4 space-y-4"
            >
              {/* Category header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{label}</h3>
                    <p className="text-xs text-gray-500">commission_{category}</p>
                  </div>
                </div>
                <button
                  onClick={() => fetchHistory(category)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Voir l'historique"
                >
                  <History className="w-4 h-4" />
                </button>
              </div>

              {/* Rate input */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={rate}
                    onChange={(e) => setRates(prev => ({
                      ...prev,
                      [category]: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                    }))}
                    className="w-full pl-4 pr-12 py-3 text-2xl font-bold text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center text-gray-400">
                    <Percent className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Quick presets */}
              <div className="flex gap-2">
                {[10, 15, 20, 25].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setRates(prev => ({ ...prev, [category]: preset }))}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      rate === preset
                        ? 'bg-[#FF6B35] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>

              {/* History dropdown */}
              {showHistory === category && history[category] && (
                <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <History className="w-4 h-4" />
                    <span>Historique des modifications</span>
                  </div>
                  {history[category].length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-2">
                      Aucune modification
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {history[category].map((entry, index) => (
                        <div
                          key={index}
                          className="text-xs p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {Math.round(entry.previousValue * 100)}% &rarr; {Math.round(entry.newValue * 100)}%
                            </span>
                            <span className="text-gray-400">
                              {new Date(entry.changedAt).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          {entry.changedBy && (
                            <p className="text-gray-500 mt-1">
                              Par {entry.changedBy.firstName} {entry.changedBy.lastName}
                            </p>
                          )}
                          {entry.reason && (
                            <p className="text-gray-400 mt-1 italic">
                              "{entry.reason}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Comment ca fonctionne</p>
            <ul className="space-y-1 text-blue-600">
              <li>- La commission est prelevee sur le montant total paye par le guest</li>
              <li>- Le host recoit (100% - commission) apres le checkout + 24h</li>
              <li>- Les biens de luxe (&gt;500EUR/nuit) utilisent le taux "Luxe" si defini</li>
              <li>- Si aucune categorie ne correspond, le taux par defaut est utilise</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Save section */}
      {hasChanges && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Modifications non sauvegardees</p>
              <p className="text-sm text-yellow-700 mt-1">
                Vous avez modifie les taux de commission. N'oubliez pas de sauvegarder.
              </p>
            </div>
          </div>

          {/* Reason input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Raison de la modification (optionnel)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Ajustement saisonnier, nouvelle politique..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35]"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (originalRates) {
                  setRates(originalRates);
                  setReason('');
                }
              }}
              className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={saveRates}
              disabled={saving}
              className="flex-1 py-2.5 px-4 bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Sauvegarde...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Sauvegarder</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="p-4 bg-gray-50 rounded-xl">
        <h4 className="font-medium text-gray-900 mb-3">Apercu du split pour une reservation de 1000 EUR</h4>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Guest paie</p>
            <p className="text-xl font-bold text-gray-900">1000 EUR</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Commission Baytup ({rates.stay}%)</p>
            <p className="text-xl font-bold text-[#FF6B35]">{(1000 * rates.stay / 100).toFixed(0)} EUR</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Host recoit</p>
            <p className="text-xl font-bold text-green-600">{(1000 * (100 - rates.stay) / 100).toFixed(0)} EUR</p>
          </div>
        </div>
      </div>
    </div>
  );
}
