'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface TwoFactorVerifyProps {
  onSuccess: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
}

export default function TwoFactorVerify({
  onSuccess,
  onCancel,
  title = 'Vérification 2FA',
  description = 'Entrez le code depuis votre app d\'authentification'
}: TwoFactorVerifyProps) {
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!useBackupCode && code.length !== 6) {
      toast.error('Le code doit contenir 6 chiffres');
      return;
    }

    if (useBackupCode && !code.includes('-')) {
      toast.error('Format de code de secours invalide (XXXX-XXXX)');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          token: code,
          useBackupCode
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Code vérifié!');

        // Si backup code utilisé, avertir sur codes restants
        if (data.usedBackupCode && data.remainingBackupCodes < 3) {
          toast('⚠️ Il vous reste ' + data.remainingBackupCodes + ' code(s) de secours', {
            duration: 5000,
            icon: '⚠️'
          });
        }

        onSuccess();
      } else {
        toast.error(data.message || 'Code incorrect');
        setCode('');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
              type="button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Mode selector */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(false);
                setCode('');
              }}
              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                !useBackupCode
                  ? 'bg-green-50 border-green-500 text-green-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="text-xs font-semibold">Code Authenticator</div>
              <div className="text-xs opacity-75">6 chiffres</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(true);
                setCode('');
              }}
              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                useBackupCode
                  ? 'bg-green-50 border-green-500 text-green-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="text-xs font-semibold">Code de secours</div>
              <div className="text-xs opacity-75">XXXX-XXXX</div>
            </button>
          </div>

          {/* Input field */}
          <div className="mb-6">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                if (useBackupCode) {
                  // Format backup code (XXXX-XXXX)
                  const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                  setCode(val.slice(0, 9));
                } else {
                  // Only numbers for TOTP
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                }
              }}
              placeholder={useBackupCode ? 'XXXX-XXXX' : '123456'}
              className="w-full px-4 py-4 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500"
              maxLength={useBackupCode ? 9 : 6}
              autoFocus
            />
            {!useBackupCode && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Le code change toutes les 30 secondes
              </p>
            )}
          </div>

          {/* Backup code help */}
          {useBackupCode && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4">
              <p className="text-sm text-blue-700">
                <strong>Code de secours :</strong> Utilisez un des codes que vous avez sauvegardés
                lors de la configuration de la 2FA. Chaque code ne peut être utilisé qu'une seule fois.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Annuler
              </button>
            )}
            <button
              type="submit"
              disabled={loading || code.length === 0}
              className="flex-1 bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Vérification...' : 'Vérifier'}
            </button>
          </div>
        </form>

        {/* Toggle link */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setCode('');
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {useBackupCode
              ? '← Utiliser mon app d\'authentification'
              : 'Perdu votre téléphone? Utilisez un code de secours →'}
          </button>
        </div>

        {/* Help link */}
        <div className="mt-4 pt-4 border-t text-center">
          <a
            href="/help/2fa"
            target="_blank"
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Besoin d'aide avec la 2FA?
          </a>
        </div>
      </div>
    </div>
  );
}
