'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface BackupCodesProps {
  codes: string[];
  onRegenerate?: () => void;
  showUsedCodes?: boolean;
}

export default function BackupCodes({ codes, onRegenerate, showUsedCodes = false }: BackupCodesProps) {
  const [showCodes, setShowCodes] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const downloadCodes = () => {
    const content = `Baytup - Codes de secours 2FA
Générés le: ${new Date().toLocaleString('fr-FR')}

⚠️ IMPORTANT: Conservez ces codes en lieu sûr
   Chaque code ne peut être utilisé qu'une seule fois

${codes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

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
    toast.success('Codes téléchargés');
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copié!');
  };

  const copyAllCodes = () => {
    const text = codes.join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Tous les codes copiés!');
  };

  const handleRegenerate = async () => {
    if (!onRegenerate) return;

    const confirmed = confirm(
      'Régénérer les codes de secours?\n\nTous vos codes actuels seront invalidés et remplacés par de nouveaux codes.'
    );

    if (!confirmed) return;

    setRegenerating(true);
    try {
      onRegenerate();
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold mb-1">Codes de secours</h3>
          <p className="text-sm text-gray-600">
            {codes.length} codes disponibles • Utilisez-les si vous perdez votre téléphone
          </p>
        </div>
        <button
          onClick={() => setShowCodes(!showCodes)}
          className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
        >
          {showCodes ? 'Masquer' : 'Afficher'}
        </button>
      </div>

      {/* Warning */}
      {showCodes && (
        <>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Important :</strong> Chaque code ne peut être utilisé qu'une seule fois.
                  Sauvegardez-les en lieu sûr (pas dans votre téléphone).
                </p>
              </div>
            </div>
          </div>

          {/* Codes grid */}
          <div className="grid grid-cols-2 gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
            {codes.map((code, index) => (
              <div
                key={index}
                onClick={() => copyCode(code)}
                className="bg-white p-3 rounded border border-gray-200 hover:border-green-500 cursor-pointer transition-colors group"
                title="Cliquer pour copier"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Code {index + 1}</span>
                    <code className="font-mono font-semibold text-sm">{code}</code>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={downloadCodes}
              className="flex-1 min-w-[200px] bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Télécharger (TXT)
            </button>
            <button
              onClick={copyAllCodes}
              className="flex-1 min-w-[200px] bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copier tout
            </button>
            {onRegenerate && (
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="flex-1 min-w-[200px] border border-red-300 text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-red-50 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {regenerating ? 'Régénération...' : 'Régénérer'}
              </button>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            💡 Conseil : Imprimez ces codes et rangez-les dans un endroit sûr
          </p>
        </>
      )}

      {/* Hidden state */}
      {!showCodes && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
          </svg>
          <p className="text-gray-500">Codes masqués pour votre sécurité</p>
          <p className="text-sm text-gray-400 mt-1">Cliquez sur "Afficher" pour les voir</p>
        </div>
      )}
    </div>
  );
}
