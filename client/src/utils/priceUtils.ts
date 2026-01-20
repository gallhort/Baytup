/**
 * Price Formatting and Validation Utilities
 * Fixes: BQ-26, BQ-27, BQ-28, BQ-29, BQ-30
 */

/**
 * Format price with thousand separators and currency
 * Fixes: BQ-26 (separators), BQ-27 (currency display), BQ-30 (consistency)
 * 
 * @param amount - The price amount
 * @param currency - Currency code (DZD, EUR, USD, etc.)
 * @param options - Formatting options
 * @returns Formatted price string
 * 
 * @example
 * formatPrice(15000, 'DZD') → "15,000 DZD"
 * formatPrice(1500.50, 'EUR') → "€1,500.50"
 */
export function formatPrice(
  amount: number | string | undefined | null,
  currency: string = 'DZD',
  options: {
    showCurrency?: boolean;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string {
  const {
    showCurrency = true,
    locale = 'fr-FR',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
  } = options;

  // Handle null/undefined
  if (amount === null || amount === undefined) {
    return showCurrency ? `0 ${currency}` : '0';
  }

  // Convert to number
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Handle NaN
  if (isNaN(numAmount)) {
    return showCurrency ? `0 ${currency}` : '0';
  }

  // Format with thousand separators
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(Math.abs(numAmount)); // Always positive display

  // Add currency if needed
  if (showCurrency) {
    // Special formatting for common currencies
    switch (currency.toUpperCase()) {
      case 'EUR':
        return `€${formatted}`;
      case 'USD':
        return `$${formatted}`;
      case 'GBP':
        return `£${formatted}`;
      case 'DZD':
      default:
        return `${formatted} ${currency}`;
    }
  }

  return formatted;
}

/**
 * Format price input (for display in input fields)
 * Adds thousand separators while typing
 * Fixes: BQ-26 (separators in inputs)
 */
export function formatPriceInput(value: string): string {
  // Remove all non-digit characters except decimal point
  const cleaned = value.replace(/[^\d.]/g, '');
  
  // Split into integer and decimal parts
  const parts = cleaned.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  // Add thousand separators to integer part
  const formatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // Reconstruct with decimal if present
  return decimalPart !== undefined ? `${formatted}.${decimalPart}` : formatted;
}

/**
 * Parse price input to number
 * Removes formatting and validates
 * Fixes: BQ-29 (letters), BQ-28 (negatives)
 */
export function parsePriceInput(value: string): number {
  // Remove all non-digit characters except decimal point
  const cleaned = value.replace(/[^\d.]/g, '');
  
  // Convert to number
  const parsed = parseFloat(cleaned);
  
  // Return 0 if invalid or negative (BQ-28: no negative prices)
  if (isNaN(parsed) || parsed < 0) {
    return 0;
  }
  
  return parsed;
}

/**
 * Validate price input
 * Fixes: BQ-28 (negatives), BQ-29 (letters)
 * 
 * @returns true if valid, error message if invalid
 */
export function validatePriceInput(
  value: string | number,
  options: {
    min?: number;
    max?: number;
    required?: boolean;
    fieldName?: string;
  } = {}
): true | string {
  const {
    min = 0,
    max = Infinity,
    required = true,
    fieldName = 'Price',
  } = options;

  // Convert to string for validation
  const strValue = typeof value === 'number' ? value.toString() : value;

  // Check required
  if (required && (!strValue || strValue.trim() === '')) {
    return `${fieldName} is required`;
  }

  // Check for letters (BQ-29)
  if (/[a-zA-Z]/.test(strValue)) {
    return `${fieldName} cannot contain letters`;
  }

  // Parse to number
  const numValue = parsePriceInput(strValue);

  // Check negative (BQ-28)
  if (numValue < 0) {
    return `${fieldName} cannot be negative`;
  }

  // Check min
  if (numValue < min) {
    return `${fieldName} must be at least ${formatPrice(min, 'DZD', { showCurrency: false })}`;
  }

  // Check max
  if (numValue > max) {
    return `${fieldName} cannot exceed ${formatPrice(max, 'DZD', { showCurrency: false })}`;
  }

  return true;
}

/**
 * Sanitize price input (remove invalid characters)
 * Fixes: BQ-29 (prevent letters from being typed)
 */
export function sanitizePriceInput(value: string): string {
  // Only allow digits and one decimal point
  return value
    .replace(/[^\d.]/g, '') // Remove all except digits and dot
    .replace(/(\..*)\./g, '$1'); // Keep only first decimal point
}

/**
 * Format price range
 * Example: "5,000 - 15,000 DZD"
 */
export function formatPriceRange(
  minPrice: number,
  maxPrice: number,
  currency: string = 'DZD'
): string {
  const min = formatPrice(minPrice, currency, { showCurrency: false });
  const max = formatPrice(maxPrice, currency, { showCurrency: false });
  return `${min} - ${max} ${currency}`;
}

/**
 * Get currency symbol
 * Fixes: BQ-27 (consistent currency display)
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: { [key: string]: string } = {
    DZD: 'دج',
    EUR: '€',
    USD: '$',
    GBP: '£',
  };
  return symbols[currency.toUpperCase()] || currency;
}

/**
 * Format price for display in cards/lists
 * Shorter format for compact spaces
 */
export function formatPriceCompact(
  amount: number,
  currency: string = 'DZD'
): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M ${currency}`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K ${currency}`;
  }
  return formatPrice(amount, currency);
}