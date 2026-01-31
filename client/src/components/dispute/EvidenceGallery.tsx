'use client';

import { useState } from 'react';
import { FileText, Image as ImageIcon, Download, X, ZoomIn, ExternalLink } from 'lucide-react';

interface Evidence {
  type: 'photo' | 'document' | 'message';
  url: string;
  description?: string;
  uploadedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  uploadedAt?: string;
}

interface EvidenceGalleryProps {
  evidence: Evidence[];
  currentUserId?: string;
}

export default function EvidenceGallery({ evidence, currentUserId }: EvidenceGalleryProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  if (!evidence || evidence.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Aucune preuve fournie</p>
      </div>
    );
  }

  const photos = evidence.filter(e => e.type === 'photo');
  const documents = evidence.filter(e => e.type === 'document');

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Photos */}
      {photos.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Photos ({photos.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={photo.url}
                    alt={photo.description || `Preuve ${index + 1}`}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
                    onClick={() => setLightboxImage(photo.url)}
                  />
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => setLightboxImage(photo.url)}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition"
                  >
                    <ZoomIn className="w-5 h-5 text-gray-700" />
                  </button>
                </div>

                {photo.description && (
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    {photo.description}
                  </p>
                )}

                {photo.uploadedBy && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Par {photo.uploadedBy.firstName}
                    {photo.uploadedAt && (
                      <> • {new Date(photo.uploadedAt).toLocaleDateString('fr-FR')}</>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documents ({documents.length})
          </h4>
          <div className="space-y-2">
            {documents.map((doc, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
              >
                <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.description || `Document ${index + 1}`}
                  </p>
                  {doc.uploadedBy && (
                    <p className="text-xs text-gray-500">
                      Par {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}
                      {doc.uploadedAt && (
                        <> • {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}</>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-gray-200 rounded-full transition"
                    title="Ouvrir dans un nouvel onglet"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-600" />
                  </a>
                  <button
                    onClick={() => handleDownload(doc.url, doc.description || `document-${index + 1}.pdf`)}
                    className="p-2 hover:bg-gray-200 rounded-full transition"
                    title="Télécharger"
                  >
                    <Download className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-[100] flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <img
            src={lightboxImage}
            alt="Preuve en grand"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            onClick={() => handleDownload(lightboxImage, 'evidence.jpg')}
            className="absolute bottom-4 right-4 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition flex items-center gap-2 text-white"
          >
            <Download className="w-4 h-4" />
            Télécharger
          </button>
        </div>
      )}
    </div>
  );
}
