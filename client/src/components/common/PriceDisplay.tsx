'use client';

import React from 'react';
import { formatPriceWithConversion } from '@/utils/priceUtils';

interface PriceDisplayProps {
  price: number;
  currency: 'DZD' | 'EUR';
  convertedPrice?: number;
  userCurrency?: 'DZD' | 'EUR';
  size?: 'small' | 'medium' | 'large';
  showConversion?: boolean;
  className?: string;
  orientation?: 'vertical' | 'horizontal';
}

export default function PriceDisplay({
  price,
  currency,
  convertedPrice,
  userCurrency = 'DZD',
  size = 'medium',
  showConversion = true,
  className = '',
  orientation = 'vertical'
}: PriceDisplayProps) {
  // Get formatted prices with conversion
  const priceData = formatPriceWithConversion(price, currency, userCurrency, showConversion);

  // Size classes
  const sizeClasses = {
    small: {
      main: 'text-base font-semibold',
      converted: 'text-xs'
    },
    medium: {
      main: 'text-xl font-bold',
      converted: 'text-sm'
    },
    large: {
      main: 'text-2xl font-bold',
      converted: 'text-base'
    }
  };

  const classes = sizeClasses[size];

  if (orientation === 'horizontal') {
    return (
      <div className={`flex items-baseline gap-2 ${className}`}>
        <span className={`${classes.main} text-gray-900`}>
          {priceData.original}
        </span>
        {priceData.shouldShowConversion && priceData.converted && (
          <span className={`${classes.converted} text-gray-500`}>
            (≈ {priceData.converted})
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <span className={`${classes.main} text-gray-900`}>
        {priceData.original}
      </span>
      {priceData.shouldShowConversion && priceData.converted && (
        <span className={`${classes.converted} text-gray-500`}>
          ≈ {priceData.converted}
        </span>
      )}
    </div>
  );
}
