'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import TwoFactorSetup from '@/components/security/TwoFactorSetup';
import TwoFactorVerify from '@/components/security/TwoFactorVerify';
import BackupCodes from '@/components/security/BackupCodes';

interface SecurityStatus {
  twoFactorEnabled: boolean;
  backupCodesCount: number;
  shouldEnable: boolean;
  reason: string;
  warning?: string;
}

export default function SecuritySettingsPage() {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Charger le statut 2FA
  const loadStatus = async () => {
    try {
      const res = await fetch('/api/auth/2fa/status', {
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(data);
      }
    } catch (error) {
      console.error('Error loading 2FA status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // Désactiver 2FA
  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!disablePassword) {
      toast.error('Mot de passe requis');
      return;
    }

    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: disablePassword })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('2FA désactivée');
        setShowDisableConfirm(false);
        setDisablePassword('');
        loadStatus();
      } else {
        toast.error(data.message || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    }
  };

  // Régénérer backup codes
  const handleRegenerateBackupCodes = async () => {
    try {
      const res = await fetch('/api/auth/2fa/regenerate-backup-codes', {
        method: 'POST',
        credentials: 'include'
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Nouveaux codes générés!');
        setBackupCodes(data.backupCodes);
        loadStatus();
      } else {
        toast.error(data.message || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Sécurité du compte</h1>
        <p className="text-gray-600">
          Gérez la sécurité et la confidentialité de votre compte Baytup
        </p>
      </div>

      {/* Recommendation banner */}
      {status?.shouldEnable && !status.twoFactorEnabled && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-500 p-6 rounded-lg mb-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Recommandation: Activez la 2FA
              </h3>
              <p className="text-gray-700 mb-4">{status.reason}</p>
              <button
                onClick={() => setShowSetup(true)}
                className="bg-green-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-600 inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Activer maintenant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning about low backup codes */}
      {status?.warning && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">{status.warning}</p>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Status Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold mb-1">Authentification à 2 facteurs (2FA)</h2>
            <p className="text-sm text-gray-600">
              Ajoutez une couche de sécurité supplémentaire à votre compte
            </p>
          </div>
          <div className={`px-4 py-2 rounded-full font-semibold ${
            status?.twoFactorEnabled
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {status?.twoFactorEnabled ? '✅ Activée' : 'Désactivée'}
          </div>
        </div>

        {/* Enabled state */}
        {status?.twoFactorEnabled ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div>
                  <p className="font-semibold text-green-800">Votre compte est protégé</p>
                  <p className="text-sm text-green-700 mt-1">
                    Vous devrez entrer un code depuis votre app lors de la connexion
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDisableConfirm(true)}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-semibold"
              >
                Désactiver la 2FA
              </button>
            </div>
          </div>
        ) : (
          /* Disabled state */
          <div className="space-y-4">
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Comment ça marche?</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Scannez un QR code avec votre app d'authentification</li>
                <li>Entrez le code à 6 chiffres lors de la connexion</li>
                <li>Sauvegardez des codes de secours en cas de perte du téléphone</li>
              </ul>
            </div>

            <button
              onClick={() => setShowSetup(true)}
              className="bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600"
            >
              Activer la 2FA
            </button>
          </div>
        )}
      </div>

      {/* Backup codes section */}
      {status?.twoFactorEnabled && status.backupCodesCount > 0 && (
        <BackupCodes
          codes={backupCodes}
          onRegenerate={handleRegenerateBackupCodes}
        />
      )}

      {/* Setup Modal */}
      {showSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <TwoFactorSetup
            onComplete={() => {
              setShowSetup(false);
              loadStatus();
            }}
            onCancel={() => setShowSetup(false)}
          />
        </div>
      )}

      {/* Disable Confirmation Modal */}
      {showDisableConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Désactiver la 2FA?</h3>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
              <p className="text-sm text-yellow-700">
                <strong>Attention :</strong> Désactiver la 2FA réduit la sécurité de votre compte.
                Tous vos codes de secours seront supprimés.
              </p>
            </div>
            <form onSubmit={handleDisable}>
              <label className="block mb-2 font-semibold">
                Confirmez avec votre mot de passe
              </label>
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Votre mot de passe"
                className="w-full px-4 py-2 border rounded-lg mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDisableConfirm(false);
                    setDisablePassword('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                >
                  Désactiver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
