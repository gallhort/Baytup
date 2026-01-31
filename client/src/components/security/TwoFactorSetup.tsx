'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface TwoFactorSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface SetupData {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export default function TwoFactorSetup({ onComplete, onCancel }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Générer QR code
  const handleStartSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      const data = await res.json();

      if (res.ok) {
        setSetupData(data);
        setStep('verify');
      } else {
        toast.error(data.message || 'Erreur lors de la génération du QR code');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Vérifier code et activer 2FA
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (verificationCode.length !== 6) {
      toast.error('Le code doit contenir 6 chiffres');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: verificationCode })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('2FA activée avec succès!');
        setStep('backup');
      } else {
        toast.error(data.message || 'Code incorrect');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Télécharger backup codes
  const downloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;

    const content = `Baytup - Codes de secours 2FA
Générés le: ${new Date().toLocaleString('fr-FR')}

⚠️ IMPORTANT: Conservez ces codes en lieu sûr
   Chaque code ne peut être utilisé qu'une seule fois

${setupData.backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

---
Si vous perdez votre téléphone, utilisez un de ces codes
pour accéder à votre compte et désactiver/régénérer la 2FA.
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baytup-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Code copié!');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Step 1: Instructions */}
      {step === 'setup' && (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-4">
            Activer l'authentification à 2 facteurs
          </h2>

          <div className="space-y-4 mb-6">
            <p className="text-gray-600">
              L'authentification à 2 facteurs renforce la sécurité de votre compte
              en nécessitant un code depuis votre téléphone en plus de votre mot de passe.
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
              <p className="font-semibold mb-2">Vous aurez besoin de:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Google Authenticator, Authy, ou Microsoft Authenticator</li>
                <li>5 minutes pour la configuration</li>
              </ul>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Étapes:</strong></p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Scannez le QR code avec votre app</li>
                <li>Entrez le code à 6 chiffres affiché</li>
                <li>Sauvegardez vos codes de secours</li>
              </ol>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleStartSetup}
              disabled={loading}
              className="flex-1 bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Génération...' : 'Commencer la configuration'}
            </button>
            <button
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Step 2: QR Code & Verification */}
      {step === 'verify' && setupData && (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Scannez le QR code</h2>

          <div className="space-y-6">
            {/* QR Code */}
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <img
                  src={setupData.qrCode}
                  alt="QR Code 2FA"
                  className="w-64 h-64"
                />
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Scannez avec votre app d'authentification
              </p>
            </div>

            {/* Manual entry option */}
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">
                Impossible de scanner? Saisissez ce code manuellement:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 px-4 py-2 rounded font-mono text-sm">
                  {setupData.secret}
                </code>
                <button
                  onClick={() => copyToClipboard(setupData.secret)}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                >
                  Copier
                </button>
              </div>
            </div>

            {/* Verification form */}
            <form onSubmit={handleVerifyCode} className="border-t pt-6">
              <label className="block mb-2 font-semibold">
                Code de vérification
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Entrez le code à 6 chiffres affiché dans votre app:
              </p>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full px-4 py-3 border rounded-lg text-center text-2xl font-mono tracking-widest"
                maxLength={6}
                autoFocus
              />

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className="flex-1 bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
                >
                  {loading ? 'Vérification...' : 'Vérifier et activer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('setup');
                    setSetupData(null);
                    setVerificationCode('');
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Retour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step 3: Backup Codes */}
      {step === 'backup' && setupData && (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">
              2FA activée avec succès!
            </h2>
            <p className="text-gray-600">
              Sauvegardez vos codes de secours avant de continuer
            </p>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
            <p className="font-semibold text-yellow-800 mb-2">
              ⚠️ Codes de secours importants
            </p>
            <p className="text-sm text-yellow-700">
              Si vous perdez votre téléphone, ces codes vous permettront d'accéder à votre compte.
              Chaque code ne peut être utilisé qu'une seule fois.
            </p>
          </div>

          {/* Backup codes grid */}
          <div className="grid grid-cols-2 gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
            {setupData.backupCodes.map((code, index) => (
              <div
                key={index}
                className="bg-white p-3 rounded border border-gray-200 hover:border-green-500 cursor-pointer"
                onClick={() => copyToClipboard(code)}
                title="Cliquer pour copier"
              >
                <span className="text-xs text-gray-500 block mb-1">Code {index + 1}</span>
                <code className="font-mono font-semibold text-sm">{code}</code>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={downloadBackupCodes}
              className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Télécharger les codes
            </button>
            <button
              onClick={onComplete}
              className="flex-1 bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600"
            >
              Terminer
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Vous pourrez régénérer ces codes depuis vos paramètres de sécurité
          </p>
        </div>
      )}
    </div>
  );
}
