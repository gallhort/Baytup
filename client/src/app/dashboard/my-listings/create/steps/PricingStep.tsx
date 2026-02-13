'use client';

import PriceInput from '@/components/common/PriceInput';
import { CreateListingFormData } from '../types';

interface Props {
  formData: CreateListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<CreateListingFormData>>;
  enableAltCurrency: boolean;
  setEnableAltCurrency: (v: boolean) => void;
  t: any;
}

export default function PricingStep({ formData, setFormData, enableAltCurrency, setEnableAltCurrency, t }: Props) {
  const updatePricing = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      pricing: { ...prev.pricing, [field]: value },
    }));
  };

  const pricingTypes = formData.category === 'stay'
    ? ['per_night', 'per_week', 'per_month']
    : ['per_day', 'per_hour', 'per_week'];

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
        {t.pricing?.title || 'Set your price'}
      </h1>
      <p className="text-lg text-gray-500 mb-8">
        {t.pricing?.subtitle || 'You can change it anytime.'}
      </p>

      {/* Currency */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {t.pricing?.currency || 'Currency'}
        </label>
        <div className="grid grid-cols-2 gap-3">
          {['DZD', 'EUR'].map(cur => (
            <button
              key={cur}
              type="button"
              onClick={() => {
                updatePricing('currency', cur);
                if (enableAltCurrency) {
                  updatePricing('altCurrency', cur === 'DZD' ? 'EUR' : 'DZD');
                }
              }}
              className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                formData.pricing.currency === cur
                  ? 'border-[#FF6B35] bg-orange-50 text-[#FF6B35]'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {cur === 'DZD' ? 'DZD (د.ج)' : 'EUR (€)'}
            </button>
          ))}
        </div>
      </div>

      {/* Pricing Type */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {t.pricing?.pricingType || 'Pricing type'}
        </label>
        <div className="grid grid-cols-3 gap-3">
          {pricingTypes.map(pt => (
            <button
              key={pt}
              type="button"
              onClick={() => updatePricing('pricingType', pt)}
              className={`px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                formData.pricing.pricingType === pt
                  ? 'border-[#FF6B35] bg-orange-50 text-[#FF6B35]'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.pricing?.pricingTypes?.[pt] || pt.replace('per_', '/ ')}
            </button>
          ))}
        </div>
      </div>

      {/* Base Price */}
      <div className="mb-6">
        <PriceInput
          value={formData.pricing.basePrice}
          onChange={v => updatePricing('basePrice', v)}
          currency={formData.pricing.currency}
          label={t.pricing?.basePrice || 'Base price'}
          required
        />
      </div>

      {/* Fees */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <PriceInput
          value={formData.pricing.cleaningFee}
          onChange={v => updatePricing('cleaningFee', v)}
          currency={formData.pricing.currency}
          label={t.pricing?.cleaningFee || 'Cleaning fee'}
        />
        <PriceInput
          value={formData.pricing.securityDeposit}
          onChange={v => updatePricing('securityDeposit', v)}
          currency={formData.pricing.currency}
          label={t.pricing?.securityDeposit || 'Security deposit'}
        />
      </div>

      {/* Alt Currency Toggle */}
      <div className="border-t border-gray-200 pt-6">
        <button
          type="button"
          onClick={() => {
            const newVal = !enableAltCurrency;
            setEnableAltCurrency(newVal);
            if (newVal) {
              updatePricing('altCurrency', formData.pricing.currency === 'DZD' ? 'EUR' : 'DZD');
            } else {
              updatePricing('altBasePrice', undefined);
              updatePricing('altCurrency', undefined);
              updatePricing('altCleaningFee', undefined);
            }
          }}
          className="flex items-center gap-3 cursor-pointer w-full text-left"
        >
          <div
            className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors ${
              enableAltCurrency ? 'bg-[#FF6B35]' : 'bg-gray-300'
            }`}
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
              enableAltCurrency ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </div>
          <span className="text-sm font-medium text-gray-700">
            {t.pricing?.enableAltCurrency || 'Also display price in another currency'}
          </span>
        </button>

        {enableAltCurrency && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PriceInput
              value={formData.pricing.altBasePrice || 0}
              onChange={v => updatePricing('altBasePrice', v)}
              currency={formData.pricing.currency === 'DZD' ? 'EUR' : 'DZD'}
              label={t.pricing?.altBasePrice || 'Alternative base price'}
              required
            />
            <PriceInput
              value={formData.pricing.altCleaningFee || 0}
              onChange={v => updatePricing('altCleaningFee', v)}
              currency={formData.pricing.currency === 'DZD' ? 'EUR' : 'DZD'}
              label={t.pricing?.altCleaningFee || 'Alternative cleaning fee'}
            />
          </div>
        )}
      </div>
    </div>
  );
}
