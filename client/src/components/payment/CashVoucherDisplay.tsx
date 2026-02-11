'use client';

import React, { useState, useEffect } from 'react';
import {
  Banknote,
  Clock,
  MapPin,
  Copy,
  CheckCircle,
  AlertTriangle,
  Phone,
  QrCode,
  Download,
  Calendar,
  User
} from 'lucide-react';

interface CashVoucherDisplayProps {
  voucher: {
    voucherNumber: string;
    amount: number;
    currency: string;
    expiresAt: string;
    status: 'pending' | 'paid' | 'expired' | 'cancelled';
    qrCode?: string;
    guestInfo: {
      fullName: string;
      phone: string;
    };
    instructions?: {
      fr?: string;
      ar?: string;
      en?: string;
    };
  };
  booking: {
    id: string;
    listing: {
      title: string;
    };
    startDate: string;
    endDate: string;
  };
  onDownloadPDF?: () => void;
}

export default function CashVoucherDisplay({
  voucher,
  booking,
  onDownloadPDF
}: CashVoucherDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copyVoucherNumber = async () => {
    try {
      await navigator.clipboard.writeText(voucher.voucherNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'EUR' || currency === 'eur') {
      return `€${price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;
    }
    return `${price.toLocaleString('fr-FR')} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRemaining = () => {
    const expires = new Date(voucher.expiresAt).getTime();
    const now = Date.now();
    const remaining = expires - now;

    if (remaining <= 0) return null;

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes, total: remaining };
  };

  // Live countdown timer (P1 #28)
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());
  useEffect(() => {
    if (voucher.status !== 'pending') return;
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [voucher.expiresAt, voucher.status]);

  const isUrgent = timeRemaining && timeRemaining.hours < 6;

  const getStatusBadge = () => {
    switch (voucher.status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            <Clock className="w-4 h-4" />
            En attente de paiement
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Payé
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            Expiré
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
            Annulé
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FF6B35] to-[#e55a2b] rounded-t-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Banknote className="w-6 h-6" />
            <span className="font-bold text-lg">Nord Express</span>
          </div>
          {getStatusBadge()}
        </div>
        <h2 className="text-2xl font-bold mb-2">Bon de Paiement</h2>
        <p className="text-white/80 text-sm">
          Présentez ce bon dans une agence Nord Express pour effectuer votre paiement
        </p>
      </div>

      {/* Main content */}
      <div className="bg-white border border-t-0 border-gray-200 rounded-b-2xl p-6 space-y-6">
        {/* Voucher number */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">Numéro de référence</p>
          <div className="flex items-center justify-center gap-2">
            <code className="text-2xl font-mono font-bold text-gray-900 bg-gray-100 px-4 py-2 rounded-lg">
              {voucher.voucherNumber}
            </code>
            <button
              onClick={copyVoucherNumber}
              className="p-2 text-gray-500 hover:text-[#FF6B35] transition-colors"
              title="Copier le numéro"
            >
              {copied ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* QR Code */}
        {voucher.qrCode && voucher.status === 'pending' && (
          <div className="flex flex-col items-center py-4 border-y border-gray-100">
            <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
              <QrCode className="w-4 h-4" />
              Scanner en agence
            </p>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200">
              <img
                src={voucher.qrCode}
                alt="QR Code du voucher"
                className="w-40 h-40"
              />
            </div>
          </div>
        )}

        {/* Amount */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Montant à payer</span>
            <span className="text-2xl font-bold text-gray-900">
              {formatPrice(voucher.amount, voucher.currency)}
            </span>
          </div>
        </div>

        {/* Time remaining */}
        {voucher.status === 'pending' && timeRemaining && (
          <div className={`rounded-xl p-4 ${isUrgent ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="flex items-start gap-3">
              <Clock className={`w-5 h-5 mt-0.5 ${isUrgent ? 'text-red-600' : 'text-yellow-600'}`} />
              <div>
                <p className={`font-medium ${isUrgent ? 'text-red-800' : 'text-yellow-800'}`}>
                  Temps restant pour payer
                </p>
                <p className={`text-lg font-bold ${isUrgent ? 'text-red-900' : 'text-yellow-900'}`}>
                  {timeRemaining.hours}h {timeRemaining.minutes}min
                </p>
                <p className={`text-sm mt-1 ${isUrgent ? 'text-red-700' : 'text-yellow-700'}`}>
                  Expire le {formatDate(voucher.expiresAt)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Booking info */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Détails de la réservation</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <span className="text-gray-600">{booking.listing.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                {new Date(booking.startDate).toLocaleDateString('fr-FR')} - {new Date(booking.endDate).toLocaleDateString('fr-FR')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{voucher.guestInfo.fullName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{voucher.guestInfo.phone}</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {voucher.status === 'pending' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Instructions</h3>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Rendez-vous dans une agence Nord Express</li>
              <li>Présentez ce bon (imprimé ou sur votre téléphone)</li>
              <li>Payez le montant indiqué en espèces</li>
              <li>Conservez votre reçu de paiement</li>
              <li>Votre réservation sera confirmée automatiquement</li>
            </ol>
          </div>
        )}

        {/* Download PDF button */}
        {onDownloadPDF && voucher.status === 'pending' && (
          <button
            onClick={onDownloadPDF}
            className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Télécharger le bon en PDF
          </button>
        )}

        {/* Agency locator link */}
        {voucher.status === 'pending' && (
          <div className="text-center">
            <a
              href="https://nordexpress.dz/agences"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#FF6B35] hover:text-[#e55a2b] text-sm font-medium"
            >
              <MapPin className="w-4 h-4" />
              Trouver une agence Nord Express
            </a>
          </div>
        )}

        {/* Success message for paid vouchers */}
        {voucher.status === 'paid' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Paiement confirmé</p>
                <p className="text-sm text-green-700 mt-1">
                  Votre réservation a été confirmée. Vous recevrez un email avec tous les détails.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error message for expired vouchers */}
        {voucher.status === 'expired' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Bon expiré</p>
                <p className="text-sm text-red-700 mt-1">
                  Ce bon de paiement a expiré. Veuillez effectuer une nouvelle réservation.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
