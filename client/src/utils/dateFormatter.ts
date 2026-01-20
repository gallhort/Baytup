/**
 * Date Formatter Utility
 * Robust date formatting functions with error handling
 * Default locale: fr-FR (French)
 */

/**
 * Format a date string to a localized date
 * @param dateString - ISO date string or Date object
 * @param locale - Locale string (default: 'fr-FR')
 * @returns Formatted date string or fallback
 */
export const formatDate = (
  dateString: string | Date | null | undefined,
  locale: string = 'fr-FR'
): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return 'Date invalide';
    }
    
    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Date invalide';
  }
};

/**
 * Format a date string to include day of week
 * @param dateString - ISO date string or Date object
 * @param locale - Locale string (default: 'fr-FR')
 * @returns Formatted date string with weekday
 */
export const formatDateWithWeekday = (
  dateString: string | Date | null | undefined,
  locale: string = 'fr-FR'
): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return 'Date invalide';
    }
    
    return date.toLocaleDateString(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Date invalide';
  }
};

/**
 * Format a date string to a date and time
 * @param dateString - ISO date string or Date object
 * @param locale - Locale string (default: 'fr-FR')
 * @returns Formatted date and time string
 */
export const formatDateTime = (
  dateString: string | Date | null | undefined,
  locale: string = 'fr-FR'
): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return 'Date invalide';
    }
    
    return date.toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('DateTime formatting error:', error);
    return 'Date invalide';
  }
};

/**
 * Format a date range (start and end dates)
 * @param startDate - Start date
 * @param endDate - End date
 * @param locale - Locale string (default: 'fr-FR')
 * @returns Formatted date range string
 */
export const formatDateRange = (
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
  locale: string = 'fr-FR'
): string => {
  const start = formatDate(startDate, locale);
  const end = formatDate(endDate, locale);
  
  if (start === 'N/A' && end === 'N/A') return 'N/A';
  if (start === 'N/A') return end;
  if (end === 'N/A') return start;
  
  return `${start} - ${end}`;
};

/**
 * Format a date to "time ago" format (e.g., "il y a 2 heures")
 * @param dateString - ISO date string or Date object
 * @returns Relative time string in French
 */
export const formatTimeAgo = (
  dateString: string | Date | null | undefined
): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return 'Date invalide';
    }
    
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    const intervals: { [key: string]: { singular: string; plural: string; seconds: number } } = {
      year: { singular: 'an', plural: 'ans', seconds: 31536000 },
      month: { singular: 'mois', plural: 'mois', seconds: 2592000 },
      week: { singular: 'semaine', plural: 'semaines', seconds: 604800 },
      day: { singular: 'jour', plural: 'jours', seconds: 86400 },
      hour: { singular: 'heure', plural: 'heures', seconds: 3600 },
      minute: { singular: 'minute', plural: 'minutes', seconds: 60 },
      second: { singular: 'seconde', plural: 'secondes', seconds: 1 }
    };
    
    for (const [key, value] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / value.seconds);
      
      if (interval >= 1) {
        const unit = interval === 1 ? value.singular : value.plural;
        return `il y a ${interval} ${unit}`;
      }
    }
    
    return 'à l\'instant';
  } catch (error) {
    console.error('TimeAgo formatting error:', error);
    return 'Date invalide';
  }
};

/**
 * Format a date to just the time (HH:MM)
 * @param dateString - ISO date string or Date object
 * @param locale - Locale string (default: 'fr-FR')
 * @returns Formatted time string
 */
export const formatTime = (
  dateString: string | Date | null | undefined,
  locale: string = 'fr-FR'
): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return 'Heure invalide';
    }
    
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Time formatting error:', error);
    return 'Heure invalide';
  }
};

/**
 * Calculate number of nights/days between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of days
 */
export const calculateNights = (
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): number => {
  if (!startDate || !endDate) return 0;
  
  try {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 0;
    }
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch (error) {
    console.error('Calculate nights error:', error);
    return 0;
  }
};

/**
 * Check if a date is in the past
 * @param dateString - ISO date string or Date object
 * @returns boolean
 */
export const isPastDate = (dateString: string | Date | null | undefined): boolean => {
  if (!dateString) return false;
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return false;
    }
    
    return date.getTime() < new Date().getTime();
  } catch (error) {
    return false;
  }
};

/**
 * Check if a date is today
 * @param dateString - ISO date string or Date object
 * @returns boolean
 */
export const isToday = (dateString: string | Date | null | undefined): boolean => {
  if (!dateString) return false;
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return false;
    }
    
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  } catch (error) {
    return false;
  }
};