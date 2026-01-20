'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { useApp } from '@/contexts/AppContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaCar, FaHome, FaSpinner, FaCheckCircle, FaTimesCircle, FaHistory, FaUser } from 'react-icons/fa';
import type { UpdateFeatureRequest, SystemSettingsResponse, ChangeHistoryEntry } from '@/types/featureFlags';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { state } = useApp();
  const { features, loading: flagsLoading, refreshFlags } = useFeatureFlags();
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [changeHistory, setChangeHistory] = useState<ChangeHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (!state.isLoading && state.user && state.user.role !== 'admin') {
      toast.error('Accès non autorisé');
      router.push('/dashboard');
    }
  }, [state.isLoading, state.user, router]);

  // Fetch change history
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const token = localStorage.getItem('token');
      const response = await axios.get<SystemSettingsResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/settings/system-settings`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.status === 'success') {
        setChangeHistory(response.data.data.settings.changeHistory || []);
      }
    } catch (error: any) {
      console.error('Error fetching history:', error);
      toast.error('Impossible de charger l\'historique');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleToggle = async (featureName: string, enabled: boolean) => {
    try {
      setSaving(true);

      const token = localStorage.getItem('token');
      console.log('🔑 Token:', token ? 'exists' : 'missing');
      console.log('👤 User role:', state.user?.role);
      console.log('📧 User email:', state.user?.email);

      const data: UpdateFeatureRequest = {
        enabled,
        reason: `Admin manual toggle via dashboard`
      };

      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/settings/system-settings/features/${featureName}`,
        data,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success(
          `${featureName === 'vehiclesEnabled' ? 'Véhicules' : 'Logements'} ${enabled ? 'activés' : 'désactivés'} avec succès`,
          { duration: 3000 }
        );

        // Refresh flags from context
        await refreshFlags();
      }
    } catch (error: any) {
      console.error('❌ Error updating feature:', error);
      console.error('Response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (state.isLoading || !state.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FaSpinner className="animate-spin text-4xl text-[#FF6B35]" />
      </div>
    );
  }

  if (state.user.role !== 'admin') {
    return null;
  }

  if (flagsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <FaSpinner className="animate-spin text-4xl text-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Paramètres Système</h1>
        <p className="text-gray-600">Gérer les fonctionnalités de la plateforme</p>
      </div>

      {/* Feature Flags Card */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Feature Flags</h2>
          <button
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory && changeHistory.length === 0) {
                fetchHistory();
              }
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-[#FF6B35] hover:bg-gray-50 rounded-lg transition-colors"
          >
            <FaHistory className="w-4 h-4" />
            Historique
          </button>
        </div>

        <div className="space-y-4">
          {/* Vehicles Feature */}
          <FeatureToggle
            icon={<FaCar className="text-2xl" />}
            title="Location de Véhicules"
            description="Activer ou désactiver la fonctionnalité de location de véhicules sur toute la plateforme"
            enabled={features.vehiclesEnabled}
            onToggle={(enabled) => handleToggle('vehiclesEnabled', enabled)}
            saving={saving}
            color="blue"
          />

          {/* Accommodations Feature */}
          <FeatureToggle
            icon={<FaHome className="text-2xl" />}
            title="Location de Logements"
            description="Activer ou désactiver la fonctionnalité de location de logements"
            enabled={features.accommodationsEnabled}
            onToggle={(enabled) => handleToggle('accommodationsEnabled', enabled)}
            saving={saving}
            color="green"
          />
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Les changements prennent effet immédiatement pour tous les utilisateurs.
            Les données en cache seront rafraîchies automatiquement.
          </p>
        </div>
      </div>

      {/* Change History */}
      {showHistory && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Historique des Modifications</h3>

          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <FaSpinner className="animate-spin text-2xl text-gray-400" />
            </div>
          ) : changeHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune modification enregistrée</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {changeHistory.slice().reverse().map((entry, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{entry.field}</span>
                        <span className="text-gray-400">→</span>
                        <span className={`font-medium ${entry.newValue ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.newValue ? 'Activé' : 'Désactivé'}
                        </span>
                      </div>
                      {entry.reason && (
                        <p className="text-sm text-gray-600 mb-2">Raison: {entry.reason}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <FaUser className="w-3 h-3" />
                        <span>Admin</span>
                        <span>•</span>
                        <span>{new Date(entry.changedAt).toLocaleString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface FeatureToggleProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  saving: boolean;
  color?: 'blue' | 'green' | 'purple';
}

function FeatureToggle({ icon, title, description, enabled, onToggle, saving, color = 'blue' }: FeatureToggleProps) {
  const colorClasses = {
    blue: {
      bg: enabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400',
      toggle: enabled ? 'bg-blue-500' : 'bg-gray-300'
    },
    green: {
      bg: enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400',
      toggle: enabled ? 'bg-green-500' : 'bg-gray-300'
    },
    purple: {
      bg: enabled ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400',
      toggle: enabled ? 'bg-purple-500' : 'bg-gray-300'
    }
  };

  return (
    <div className="flex items-center justify-between p-5 border-2 border-gray-200 rounded-xl hover:border-[#FF6B35] hover:shadow-md transition-all duration-200">
      <div className="flex items-start space-x-4 flex-1">
        <div className={`p-3 rounded-lg transition-colors ${colorClasses[color].bg}`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg text-gray-900">{title}</h3>
            {enabled ? (
              <FaCheckCircle className="text-green-500 text-sm" />
            ) : (
              <FaTimesCircle className="text-gray-400 text-sm" />
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">{description}</p>
          <p className="text-xs font-medium text-gray-500">
            Status: <span className={enabled ? 'text-green-600' : 'text-gray-500'}>
              {enabled ? 'Activé' : 'Désactivé'}
            </span>
          </p>
        </div>
      </div>

      <button
        onClick={() => onToggle(!enabled)}
        disabled={saving}
        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:ring-offset-2 ${
          colorClasses[color].toggle
        } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        aria-label={`Toggle ${title}`}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
            enabled ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
