'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface EvidenceFile {
  file: File;
  preview?: string;
  type: 'photo' | 'document';
}

interface EvidenceUploadProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  existingEvidence?: Array<{
    type: 'photo' | 'document';
    url: string;
    description?: string;
  }>;
}

export default function EvidenceUpload({
  onFilesChange,
  maxFiles = 5,
  existingEvidence = []
}: EvidenceUploadProps) {
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (files.length + selectedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} fichiers autorisés`);
      return;
    }

    const newFiles: EvidenceFile[] = [];

    selectedFiles.forEach(file => {
      // Vérifier la taille (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} est trop volumineux (max 10MB)`);
        return;
      }

      // Vérifier le type
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';
      const isDoc = file.type.includes('word') || file.type.includes('document');

      if (!isImage && !isPDF && !isDoc) {
        toast.error(`${file.name} : type de fichier non autorisé`);
        return;
      }

      const evidenceFile: EvidenceFile = {
        file,
        type: isImage ? 'photo' : 'document'
      };

      // Créer preview pour les images
      if (isImage) {
        const reader = new FileReader();
        reader.onloadend = () => {
          evidenceFile.preview = reader.result as string;
          setFiles(prev => {
            const updated = [...prev, evidenceFile];
            onFilesChange(updated.map(f => f.file));
            return updated;
          });
        };
        reader.readAsDataURL(file);
      } else {
        newFiles.push(evidenceFile);
      }
    });

    if (newFiles.length > 0) {
      setFiles(prev => {
        const updated = [...prev, ...newFiles];
        onFilesChange(updated.map(f => f.file));
        return updated;
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const updated = prev.filter((_, i) => i !== index);
      onFilesChange(updated.map(f => f.file));
      return updated;
    });
  };

  const getFileIcon = (file: EvidenceFile) => {
    if (file.type === 'photo') {
      return <ImageIcon className="w-5 h-5 text-blue-500" />;
    }
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Upload button */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Preuves (photos, documents) - Optionnel
        </label>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={files.length >= maxFiles}
          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Upload className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">
            {files.length >= maxFiles
              ? `Maximum ${maxFiles} fichiers atteint`
              : `Ajouter des preuves (${files.length}/${maxFiles})`
            }
          </span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        <p className="text-xs text-gray-500 mt-2">
          Formats acceptés : JPG, PNG, PDF, DOC • Maximum 10MB par fichier
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Fichiers sélectionnés ({files.length})
          </p>
          <div className="grid grid-cols-1 gap-2">
            {files.map((evidenceFile, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                {evidenceFile.preview ? (
                  <img
                    src={evidenceFile.preview}
                    alt={evidenceFile.file.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                    {getFileIcon(evidenceFile)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {evidenceFile.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(evidenceFile.file.size / 1024).toFixed(0)} KB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-red-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing evidence (if any) */}
      {existingEvidence.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Preuves déjà ajoutées ({existingEvidence.length})
          </p>
          <div className="grid grid-cols-2 gap-2">
            {existingEvidence.map((evidence, index) => (
              <div
                key={index}
                className="relative group"
              >
                {evidence.type === 'photo' ? (
                  <img
                    src={evidence.url}
                    alt={evidence.description || 'Evidence'}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                  />
                ) : (
                  <div className="w-full h-24 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                {evidence.description && (
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    {evidence.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info message */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700">
          <p className="font-medium mb-1">Conseils pour vos preuves :</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Photos claires et bien cadrées du problème</li>
            <li>Conversations/emails avec l'hôte (captures d'écran)</li>
            <li>Documents officiels si pertinent</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
