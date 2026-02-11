'use client';

import { useState } from 'react';
import { X, AlertTriangle, User as UserIcon } from 'lucide-react';
import { FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';
import EvidenceUpload from './EvidenceUpload';

interface Booking {
  _id: string;
  listing: {
    title: string;
  };
  guest?: {
    firstName: string;
    lastName: string;
  };
  host?: {
    firstName: string;
    lastName: string;
  };
}

interface ReportDisputeModalProps {
  booking: Booking;
  userRole: 'guest' | 'host';
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ReportDisputeModal({
  booking,
  userRole,
  onClose,
  onSuccess
}: ReportDisputeModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    reason: '',
    description: ''
  });
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  // Raisons selon le rôle
  const guestReasons = [
    { value: 'dirty_arrival', label: 'Logement sale à l\'arrivée' },
    { value: 'amenities_missing', label: 'Équipements manquants ou non fonctionnels' },
    { value: 'safety_issue', label: 'Problème de sécurité (serrure, détecteur, etc.)' },
    { value: 'misleading_listing', label: 'Annonce trompeuse (photos/description)' },
    { value: 'no_access', label: 'Problème d\'accès (codes, clés introuvables)' },
    { value: 'host_unresponsive', label: 'Hôte injoignable ou non coopératif' },
    { value: 'noise_disturbance', label: 'Nuisances sonores non mentionnées' },
    { value: 'cancellation_host', label: 'Annulation par l\'hôte' },
    { value: 'payment', label: 'Problème de paiement' },
    { value: 'other', label: 'Autre' }
  ];

  const hostReasons = [
    { value: 'property_damage', label: 'Dégâts causés par le voyageur' },
    { value: 'excessive_mess', label: 'Saleté excessive laissée' },
    { value: 'guest_behavior', label: 'Comportement inapproprié du voyageur' },
    { value: 'unauthorized_guests', label: 'Nombre de personnes non respecté' },
    { value: 'noise_party', label: 'Bruit excessif / Fête non autorisée' },
    { value: 'rule_violation', label: 'Non-respect des règles du logement' },
    { value: 'early_late', label: 'Arrivée/Départ non respecté' },
    { value: 'smoking', label: 'Fumer dans le logement (interdit)' },
    { value: 'payment', label: 'Problème de paiement' },
    { value: 'other', label: 'Autre' }
  ];

  const reasons = userRole === 'guest' ? guestReasons : hostReasons;

  const handleSubmit = async () => {
    // Validation
    if (!formData.reason) {
      toast.error('Veuillez sélectionner une raison');
      return;
    }

    if (!formData.description || formData.description.length < 20) {
      toast.error('La description doit contenir au moins 20 caractères');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Créer la dispute
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/disputes`,
        {
          bookingId: booking._id,
          reason: formData.reason,
          description: formData.description
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const disputeId = response.data.data.dispute._id;

      // Upload evidence si présent
      if (evidenceFiles.length > 0) {
        const formDataUpload = new FormData();
        evidenceFiles.forEach(file => {
          formDataUpload.append('files', file);
        });
        formDataUpload.append('description', 'Preuves initiales');

        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/disputes/${disputeId}/evidence`,
          formDataUpload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      }

      toast.success('Problème signalé avec succès');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error creating dispute:', error);
      toast.error(error.response?.data?.message || 'Erreur lors du signalement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label="Report dispute">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-t-xl sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center">
              <FaExclamationTriangle className="mr-3" />
              Signaler un Problème
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Booking info */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Réservation concernée</h3>
            <p className="font-semibold text-gray-900">{booking.listing?.title}</p>
            {userRole === 'host' && booking.guest && (
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                <UserIcon className="w-4 h-4" />
                Voyageur : {booking.guest.firstName} {booking.guest.lastName}
              </p>
            )}
            {userRole === 'guest' && booking.host && (
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                <UserIcon className="w-4 h-4" />
                Hôte : {booking.host.firstName} {booking.host.lastName}
              </p>
            )}
          </div>

          {/* Warning banner */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Avant de signaler :</p>
              <ul className="list-disc list-inside space-y-1 text-yellow-700">
                <li>Avez-vous essayé de contacter {userRole === 'guest' ? 'l\'hôte' : 'le voyageur'} ?</li>
                <li>Le problème peut-il être résolu à l'amiable ?</li>
                <li>Préparez des preuves (photos, messages, etc.)</li>
              </ul>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Raison du problème <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Sélectionner une raison</option>
              {reasons.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description détaillée <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={6}
              placeholder="Décrivez le problème en détail (minimum 20 caractères)..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length} / 20 caractères minimum
            </p>
          </div>

          {/* Evidence upload */}
          <EvidenceUpload
            onFilesChange={setEvidenceFiles}
            maxFiles={5}
          />

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Que se passe-t-il ensuite ?</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
              <li>Notre équipe examine votre signalement sous 48-72h</li>
              <li>{userRole === 'guest' ? 'L\'hôte' : 'Le voyageur'} sera notifié·e et pourra répondre</li>
              <li>Vous pouvez ajouter des preuves supplémentaires plus tard</li>
              <li>Nous vous tiendrons informé·e par email et notifications</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-6 rounded-b-xl flex items-center justify-between border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.reason || formData.description.length < 20}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Envoi en cours...
              </>
            ) : (
              <>
                <FaExclamationTriangle />
                Signaler le problème
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
