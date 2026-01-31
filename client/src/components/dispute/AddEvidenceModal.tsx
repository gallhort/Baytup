'use client';

import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import EvidenceUpload from './EvidenceUpload';

interface AddEvidenceModalProps {
  disputeId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddEvidenceModal({
  disputeId,
  onClose,
  onSuccess
}: AddEvidenceModalProps) {
  const [loading, setLoading] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  const handleSubmit = async () => {
    if (evidenceFiles.length === 0) {
      toast.error('Veuillez sélectionner au moins un fichier');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const formData = new FormData();
      evidenceFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('description', 'Preuves additionnelles');

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/disputes/${disputeId}/evidence`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      toast.success(`${evidenceFiles.length} preuve(s) ajoutée(s) avec succès`);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error uploading evidence:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de l\'upload des preuves');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 rounded-t-xl sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center">
              <Upload className="mr-3" />
              Ajouter des Preuves
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
          <p className="text-gray-700">
            Ajoutez des preuves supplémentaires pour renforcer votre signalement (photos, documents, captures d'écran, etc.).
          </p>

          <EvidenceUpload
            onFilesChange={setEvidenceFiles}
            maxFiles={5}
          />
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
            disabled={loading || evidenceFiles.length === 0}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Upload en cours...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Ajouter {evidenceFiles.length > 0 && `(${evidenceFiles.length})`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
