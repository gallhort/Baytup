'use client';

import CounterInput from '../components/CounterInput';
import { CreateListingFormData } from '../types';

interface Props {
  formData: CreateListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<CreateListingFormData>>;
  t: any;
}

export default function AvailabilityStep({ formData, setFormData, t }: Props) {
  const update = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      availability: { ...prev.availability, [field]: value },
    }));
  };

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
        {t.availability?.title || 'Availability settings'}
      </h1>
      <p className="text-lg text-gray-500 mb-8">
        {t.availability?.subtitle || 'Set your booking preferences.'}
      </p>

      {/* Instant Book Toggle */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <button
          type="button"
          onClick={() => update('instantBook', !formData.availability.instantBook)}
          className="w-full flex items-center justify-between cursor-pointer text-left"
        >
          <div>
            <h3 className="text-base font-medium text-gray-900">
              {t.availability?.instantBook || 'Instant booking'}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {t.availability?.instantBookDesc || 'Guests can book without waiting for approval'}
            </p>
          </div>
          <div
            className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors ${
              formData.availability.instantBook ? 'bg-[#FF6B35]' : 'bg-gray-300'
            }`}
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
              formData.availability.instantBook ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </div>
        </button>
      </div>

      {/* Stay Duration */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          {t.availability?.stayDuration || 'Stay duration'}
        </h3>
        <CounterInput
          label={t.availability?.minStay || 'Minimum stay (nights)'}
          value={formData.availability.minStay}
          onChange={v => update('minStay', v)}
          min={1}
          max={365}
        />
        <CounterInput
          label={t.availability?.maxStay || 'Maximum stay (nights)'}
          value={formData.availability.maxStay}
          onChange={v => update('maxStay', v)}
          min={1}
          max={365}
        />
        <CounterInput
          label={t.availability?.advanceNotice || 'Advance notice (days)'}
          subtitle={t.availability?.advanceNoticeDesc || 'How far in advance guests can book'}
          value={formData.availability.advanceNotice}
          onChange={v => update('advanceNotice', v)}
          min={0}
          max={30}
        />
        <CounterInput
          label={t.availability?.preparationTime || 'Preparation time (days)'}
          subtitle={t.availability?.preparationTimeDesc || 'Time between bookings'}
          value={formData.availability.preparationTime}
          onChange={v => update('preparationTime', v)}
          min={0}
          max={7}
        />
      </div>

      {/* Check-in / Check-out Times */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          {t.availability?.checkTimes || 'Check-in & check-out'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              {t.availability?.checkInFrom || 'Check-in from'}
            </label>
            <input
              type="time"
              value={formData.availability.checkInFrom}
              onChange={e => update('checkInFrom', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              {t.availability?.checkInTo || 'Check-in until'}
            </label>
            <input
              type="time"
              value={formData.availability.checkInTo}
              onChange={e => update('checkInTo', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              {t.availability?.checkOutBefore || 'Check-out before'}
            </label>
            <input
              type="time"
              value={formData.availability.checkOutBefore}
              onChange={e => update('checkOutBefore', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
