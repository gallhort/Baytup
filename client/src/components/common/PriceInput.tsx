'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, DollarSign } from 'lucide-react';
import { formatPriceInput, parsePriceInput, sanitizePriceInput, validatePriceInput, getCurrencySymbol } from '@/utils/priceUtils';

interface PriceInputProps {
  value: number | string;
  onChange: (value: number) => void;
  currency?: string;
  label?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  showCurrencySymbol?: boolean;
}

/**
 * PriceInput Component
 * Handles price input with:
 * - Automatic thousand separators (BQ-26)
 * - Currency display (BQ-27)
 * - No negative values (BQ-28)
 * - No letters allowed (BQ-29)
 * - Consistent formatting (BQ-30)
 */
export default function PriceInput({
  value,
  onChange,
  currency = 'DZD',
  label,
  placeholder = '0',
  min = 0,
  max,
  required = false,
  disabled = false,
  error: externalError,
  className = '',
  showCurrencySymbol = true,
}: PriceInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [internalError, setInternalError] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);

  // Initialize display value
  useEffect(() => {
    if (!isFocused) {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (!isNaN(numValue) && numValue > 0) {
        setDisplayValue(formatPriceInput(numValue.toString()));
      } else {
        setDisplayValue('');
      }
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Sanitize input (remove letters, etc.) - BQ-29
    const sanitized = sanitizePriceInput(rawValue);
    
    // Format for display
    const formatted = formatPriceInput(sanitized);
    setDisplayValue(formatted);
    
    // Parse to number
    const numValue = parsePriceInput(sanitized);
    
    // Validate
    const validation = validatePriceInput(sanitized, {
      min,
      max,
      required,
      fieldName: label || 'Price',
    });
    
    if (validation === true) {
      setInternalError('');
      onChange(numValue);
    } else {
      setInternalError(validation);
      onChange(numValue); // Still update value for controlled input
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // Final validation on blur
    const numValue = parsePriceInput(displayValue);
    const validation = validatePriceInput(numValue, {
      min,
      max,
      required,
      fieldName: label || 'Price',
    });
    
    if (validation !== true) {
      setInternalError(validation);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setInternalError('');
  };

  const error = externalError || internalError;
  const currencySymbol = getCurrencySymbol(currency);

  return (
    <div className={`${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {showCurrencySymbol && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm font-medium">
              {currencySymbol}
            </span>
          </div>
        )}
        
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            block w-full rounded-lg border
            ${showCurrencySymbol ? 'pl-10' : 'pl-3'}
            pr-12 py-3
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-orange-500 focus:ring-orange-500'}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            focus:outline-none focus:ring-2
            text-gray-900 placeholder-gray-400
            sm:text-sm
          `}
        />
        
        {!showCurrencySymbol && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">
              {currency}
            </span>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
      
      {!error && min !== undefined && (
        <p className="mt-1 text-xs text-gray-500">
          Minimum: {formatPriceInput(min.toString())} {currency}
        </p>
      )}
    </div>
  );
}