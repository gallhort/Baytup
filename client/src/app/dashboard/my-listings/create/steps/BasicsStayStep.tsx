'use client';

import CounterInput from '../components/CounterInput';
import { CreateListingFormData } from '../types';

interface Props {
  formData: CreateListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<CreateListingFormData>>;
  t: any;
}

export default function BasicsStayStep({ formData, setFormData, t }: Props) {
  const update = (field: string, value: number | string) => {
    setFormData(prev => ({
      ...prev,
      stayDetails: { ...prev.stayDetails, [field]: value },
    }));
  };

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
        {t.basicsStay?.title || 'Tell us about your place'}
      </h1>
      <p className="text-lg text-gray-500 mb-8">
        {t.basicsStay?.subtitle || 'Share some basic details about your property.'}
      </p>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <CounterInput
          label={t.basicsStay?.bedrooms || 'Bedrooms'}
          value={formData.stayDetails.bedrooms}
          onChange={v => update('bedrooms', v)}
          min={1}
          max={20}
        />
        <CounterInput
          label={t.basicsStay?.bathrooms || 'Bathrooms'}
          value={formData.stayDetails.bathrooms}
          onChange={v => update('bathrooms', v)}
          min={1}
          max={20}
        />
        <CounterInput
          label={t.basicsStay?.floor || 'Floor'}
          subtitle={t.basicsStay?.floorHint || 'Ground floor = 0'}
          value={formData.stayDetails.floor}
          onChange={v => update('floor', v)}
          min={0}
          max={50}
        />
      </div>

      {/* Area */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t.basicsStay?.area || 'Area (m²)'}
        </label>
        <input
          type="number"
          value={formData.stayDetails.area || ''}
          onChange={e => update('area', parseInt(e.target.value) || 0)}
          placeholder="0"
          min={0}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] outline-none text-base"
        />
      </div>

      {/* Furnished */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {t.basicsStay?.furnished || 'Furnishing'}
        </label>
        <div className="grid grid-cols-3 gap-3">
          {['furnished', 'semi-furnished', 'unfurnished'].map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => update('furnished', opt)}
              className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                formData.stayDetails.furnished === opt
                  ? 'border-[#FF6B35] bg-orange-50 text-[#FF6B35]'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.basicsStay?.furnishedOptions?.[opt] || opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
