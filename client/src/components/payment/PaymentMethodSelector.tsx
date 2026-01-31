'use client';

import React from 'react';
import { CreditCard, Banknote, Shield, Clock, CheckCircle } from 'lucide-react';

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
  const isEUR = currency === 'EUR' || currency === 'eur';
  const isDZD = currency === 'DZD' || currency === 'dzd';

  // Cash option is only available for DZD
  const cashAvailable = isDZD;

  const paymentOptions = [
    {
      id: 'card' as PaymentMethod,
      name: isEUR ? 'Carte bancaire (Stripe)' : 'Carte bancaire (SlickPay)',
      description: isEUR
        ? 'Paiement sécurisé par Visa, Mastercard'
        : 'Paiement sécurisé par carte CIB/Edahabia',
      icon: CreditCard,
      benefits: [
        'Paiement instantané',
        'Confirmation immédiate',
        'Sécurisé par cryptage SSL'
      ],
      available: true
    },
    {
      id: 'cash' as PaymentMethod,
      name: 'Espèces (Nord Express)',
      description: 'Payez en espèces dans une agence Nord Express',
      icon: Banknote,
      benefits: [
        'Pas besoin de carte bancaire',
        'Plus de 200 agences en Algérie',
        '48h pour effectuer le paiement'
      ],
      available: cashAvailable
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-green-600" />
        <span className="text-sm text-gray-600">Choisissez votre mode de paiement sécurisé</span>
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
                          Non disponible
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
                      <p className="text-yellow-800 font-medium">Important</p>
                      <p className="text-yellow-700 mt-1">
                        Vous aurez 48 heures pour effectuer le paiement dans une agence Nord Express.
                        Passé ce délai, votre réservation sera automatiquement annulée.
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
          Les paiements en EUR sont traités par Stripe, leader mondial du paiement en ligne.
        </p>
      )}
    </div>
  );
}
