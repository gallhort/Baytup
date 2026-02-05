'use client';

import React from 'react';
import { CreditCard, Banknote, Shield, Clock, CheckCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

type PaymentMethod = 'card' | 'cash';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  currency: string;
  disabled?: boolean;
}

export default function PaymentMethodSelector({
  selectedMethod,
  onSelect,
  currency,
  disabled = false
}: PaymentMethodSelectorProps) {
  const t = useTranslation('paymentMethod');
  const isEUR = currency === 'EUR' || currency === 'eur';
  const isDZD = currency === 'DZD' || currency === 'dzd';

  // Cash option is only available for DZD
  const cashAvailable = isDZD;

  const paymentOptions = [
    {
      id: 'card' as PaymentMethod,
      name: isEUR
        ? ((t as any)?.card?.nameStripe || 'Bank card (Stripe)')
        : ((t as any)?.card?.nameSlickpay || 'Bank card (SlickPay)'),
      description: isEUR
        ? ((t as any)?.card?.descriptionStripe || 'Secure payment by Visa, Mastercard')
        : ((t as any)?.card?.descriptionSlickpay || 'Secure payment by CIB/Edahabia card'),
      icon: CreditCard,
      benefits: [
        (t as any)?.card?.benefit1 || 'Instant payment',
        (t as any)?.card?.benefit2 || 'Immediate confirmation',
        (t as any)?.card?.benefit3 || 'Secured by SSL encryption'
      ],
      available: true
    },
    {
      id: 'cash' as PaymentMethod,
      name: (t as any)?.cash?.name || 'Cash (Nord Express)',
      description: (t as any)?.cash?.description || 'Pay cash at a Nord Express agency',
      icon: Banknote,
      benefits: [
        (t as any)?.cash?.benefit1 || 'No bank card needed',
        (t as any)?.cash?.benefit2 || 'Over 200 agencies in Algeria',
        (t as any)?.cash?.benefit3 || '48h to complete payment'
      ],
      available: cashAvailable
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-green-600" />
        <span className="text-sm text-gray-600">{(t as any)?.chooseMethod || 'Choose your secure payment method'}</span>
      </div>

      <div className="space-y-3">
        {paymentOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedMethod === option.id;
          const isDisabled = disabled || !option.available;

          return (
            <div key={option.id}>
              <button
                type="button"
                onClick={() => !isDisabled && onSelect(option.id)}
                disabled={isDisabled}
                className={`
                  w-full p-4 rounded-xl border-2 transition-all text-left
                  ${isSelected
                    ? 'border-[#FF6B35] bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                  }
                  ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-start gap-4">
                  {/* Radio indicator */}
                  <div className={`
                    mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    ${isSelected ? 'border-[#FF6B35]' : 'border-gray-300'}
                  `}>
                    {isSelected && (
                      <div className="w-3 h-3 rounded-full bg-[#FF6B35]" />
                    )}
                  </div>

                  {/* Icon */}
                  <div className={`
                    p-2 rounded-lg flex-shrink-0
                    ${isSelected ? 'bg-[#FF6B35] text-white' : 'bg-gray-100 text-gray-600'}
                  `}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-grow">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold ${isSelected ? 'text-[#FF6B35]' : 'text-gray-900'}`}>
                        {option.name}
                      </h3>
                      {!option.available && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {(t as any)?.notAvailable || 'Not available'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{option.description}</p>

                    {/* Benefits list (shown when selected) */}
                    {isSelected && (
                      <ul className="mt-3 space-y-1.5">
                        {option.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </button>

              {/* Cash payment notice */}
              {option.id === 'cash' && isSelected && (
                <div className="mt-2 ml-9 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-yellow-800 font-medium">{(t as any)?.important || 'Important'}</p>
                      <p className="text-yellow-700 mt-1">
                        {(t as any)?.cashNotice || 'You will have 48 hours to complete the payment at a Nord Express agency. After this deadline, your booking will be automatically cancelled.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* EUR notice */}
      {isEUR && (
        <p className="text-xs text-gray-500 text-center mt-4">
          {(t as any)?.eurNotice || 'EUR payments are processed by Stripe, the global leader in online payments.'}
        </p>
      )}
    </div>
  );
}
