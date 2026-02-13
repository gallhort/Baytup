'use client';

import CounterInput from '../components/CounterInput';
import { CreateListingFormData } from '../types';

interface Props {
  formData: CreateListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<CreateListingFormData>>;
  t: any;
}

export default function BasicsVehicleStep({ formData, setFormData, t }: Props) {
  const update = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      vehicleDetails: { ...prev.vehicleDetails, [field]: value },
    }));
  };

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
        {t.basicsVehicle?.title || 'Vehicle details'}
      </h1>
      <p className="text-lg text-gray-500 mb-8">
        {t.basicsVehicle?.subtitle || 'Tell us more about your vehicle.'}
      </p>

      {/* Make & Model */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.basicsVehicle?.make || 'Make'}
          </label>
          <input
            type="text"
            value={formData.vehicleDetails.make}
            onChange={e => update('make', e.target.value)}
            placeholder={t.basicsVehicle?.makePlaceholder || 'e.g. Toyota'}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] outline-none text-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.basicsVehicle?.model || 'Model'}
          </label>
          <input
            type="text"
            value={formData.vehicleDetails.model}
            onChange={e => update('model', e.target.value)}
            placeholder={t.basicsVehicle?.modelPlaceholder || 'e.g. Corolla'}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] outline-none text-base"
          />
        </div>
      </div>

      {/* Year */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t.basicsVehicle?.year || 'Year'}
        </label>
        <input
          type="number"
          value={formData.vehicleDetails.year || ''}
          onChange={e => update('year', parseInt(e.target.value) || 0)}
          min={1900}
          max={new Date().getFullYear() + 1}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] outline-none text-base"
        />
      </div>

      {/* Seats */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <CounterInput
          label={t.basicsVehicle?.seats || 'Seats'}
          value={formData.vehicleDetails.seats}
          onChange={v => update('seats', v)}
          min={1}
          max={50}
        />
      </div>

      {/* Transmission */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {t.basicsVehicle?.transmission || 'Transmission'}
        </label>
        <div className="grid grid-cols-2 gap-3">
          {['manual', 'automatic'].map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => update('transmission', opt)}
              className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                formData.vehicleDetails.transmission === opt
                  ? 'border-[#FF6B35] bg-orange-50 text-[#FF6B35]'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.basicsVehicle?.transmissionOptions?.[opt] || opt}
            </button>
          ))}
        </div>
      </div>

      {/* Fuel Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {t.basicsVehicle?.fuelType || 'Fuel type'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['gasoline', 'diesel', 'electric', 'hybrid'].map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => update('fuelType', opt)}
              className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                formData.vehicleDetails.fuelType === opt
                  ? 'border-[#FF6B35] bg-orange-50 text-[#FF6B35]'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.basicsVehicle?.fuelOptions?.[opt] || opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
