'use client';

import { MapPin, Star, Loader2 } from 'lucide-react';
import { CreateListingFormData } from '../types';

interface Props {
  formData: CreateListingFormData;
  onPublish: () => void;
  onSaveDraft: () => void;
  onGoToStep: (index: number) => void;
  saving: boolean;
  t: any;
}

export default function ReviewStep({ formData, onPublish, onSaveDraft, onGoToStep, saving, t }: Props) {
  const serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
  const primaryImage = formData.images.find(img => img.isPrimary) || formData.images[0];

  const pricingLabel = (type: string) =>
    t.review?.pricingTypes?.[type] || type.replace('per_', '/ ');

  const sections = [
    { label: t.review?.sections?.category || 'Category', step: 0, value: `${formData.category} - ${formData.subcategory}` },
    { label: t.review?.sections?.location || 'Location', step: 2, value: `${formData.address.city}, ${formData.address.state}` },
    { label: t.review?.sections?.title || 'Title', step: 6, value: formData.title },
    { label: t.review?.sections?.price || 'Price', step: 8, value: `${formData.pricing.basePrice} ${formData.pricing.currency} ${pricingLabel(formData.pricing.pricingType)}` },
  ];

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
        {t.review?.title || 'Review your listing'}
      </h1>
      <p className="text-lg text-gray-500 mb-8">
        {t.review?.subtitle || "Here's a summary of your listing. Review it before publishing."}
      </p>

      {/* Preview Card */}
      {primaryImage && (
        <div className="rounded-2xl overflow-hidden border border-gray-200 mb-8">
          <div className="relative aspect-video">
            <img
              src={`${serverUrl}${primaryImage.url}`}
              alt={formData.title}
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }}
            />
          </div>
          <div className="p-5">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{formData.title || '(No title)'}</h2>
            <div className="flex items-center gap-1 text-gray-500 text-sm">
              <MapPin className="w-4 h-4" />
              {formData.address.city}, {formData.address.state}
            </div>
            <p className="text-lg font-semibold text-gray-900 mt-3">
              {formData.pricing.basePrice} {formData.pricing.currency}
              <span className="text-sm font-normal text-gray-500 ml-1">
                {pricingLabel(formData.pricing.pricingType)}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Summary Sections */}
      <div className="space-y-3 mb-8">
        {sections.map((section, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <div>
              <span className="text-sm text-gray-500">{section.label}</span>
              <p className="text-base font-medium text-gray-900">{section.value || '-'}</p>
            </div>
            <button
              type="button"
              onClick={() => onGoToStep(section.step)}
              className="text-sm font-medium text-[#FF6B35] hover:underline"
            >
              {t.review?.edit || 'Edit'}
            </button>
          </div>
        ))}
      </div>

      {/* Details summary */}
      {formData.category === 'stay' && (
        <div className="bg-gray-50 rounded-2xl p-5 mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">{t.review?.sections?.details || 'Details'}</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">{t.review?.bedrooms || 'Bedrooms'}:</span> <span className="font-medium">{formData.stayDetails.bedrooms}</span></div>
            <div><span className="text-gray-500">{t.review?.bathrooms || 'Bathrooms'}:</span> <span className="font-medium">{formData.stayDetails.bathrooms}</span></div>
            {formData.stayDetails.area > 0 && (
              <div><span className="text-gray-500">{t.review?.area || 'Area'}:</span> <span className="font-medium">{formData.stayDetails.area} m²</span></div>
            )}
            {formData.stayDetails.furnished && (
              <div><span className="text-gray-500">{t.review?.furnished || 'Furnished'}:</span> <span className="font-medium">{formData.stayDetails.furnished}</span></div>
            )}
            {formData.stayDetails.amenities.length > 0 && (
              <div className="col-span-2"><span className="text-gray-500">{t.review?.amenities || 'Amenities'}:</span> <span className="font-medium">{formData.stayDetails.amenities.length} selected</span></div>
            )}
          </div>
        </div>
      )}

      {formData.category === 'vehicle' && (
        <div className="bg-gray-50 rounded-2xl p-5 mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">{t.review?.sections?.details || 'Details'}</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">{t.review?.make || 'Make'}:</span> <span className="font-medium">{formData.vehicleDetails.make}</span></div>
            <div><span className="text-gray-500">{t.review?.model || 'Model'}:</span> <span className="font-medium">{formData.vehicleDetails.model}</span></div>
            <div><span className="text-gray-500">{t.review?.year || 'Year'}:</span> <span className="font-medium">{formData.vehicleDetails.year}</span></div>
            {formData.vehicleDetails.seats > 0 && (
              <div><span className="text-gray-500">{t.review?.seats || 'Seats'}:</span> <span className="font-medium">{formData.vehicleDetails.seats}</span></div>
            )}
            {formData.vehicleDetails.features.length > 0 && (
              <div className="col-span-2"><span className="text-gray-500">{t.review?.features || 'Features'}:</span> <span className="font-medium">{formData.vehicleDetails.features.length} selected</span></div>
            )}
          </div>
        </div>
      )}

      {/* Photos count */}
      <div className="bg-gray-50 rounded-2xl p-5 mb-8">
        <h3 className="font-semibold text-gray-900 mb-2">{t.review?.sections?.photos || 'Photos'}</h3>
        <p className="text-sm text-gray-600">{formData.images.length} {t.review?.photosCount || 'photo(s) uploaded'}</p>
        {formData.images.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {formData.images.slice(0, 5).map((img, i) => (
              <img
                key={i}
                src={`${serverUrl}${img.url}`}
                alt={`Photo ${i + 1}`}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                onError={e => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }}
              />
            ))}
            {formData.images.length > 5 && (
              <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                +{formData.images.length - 5}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancellation Policy */}
      <div className="bg-gray-50 rounded-2xl p-5 mb-8">
        <h3 className="font-semibold text-gray-900 mb-2">{t.review?.sections?.cancellation || 'Cancellation policy'}</h3>
        <p className="text-sm text-gray-600 capitalize">{formData.cancellationPolicy.replace('_', ' ')}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onPublish}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 bg-[#FF6B35] text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-[#e55a2b] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Star className="w-5 h-5" />
          )}
          {t.review?.publish || 'Publish listing'}
        </button>
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-8 py-4 rounded-full text-base font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {t.review?.saveDraft || 'Save as draft'}
        </button>
      </div>
    </div>
  );
}
