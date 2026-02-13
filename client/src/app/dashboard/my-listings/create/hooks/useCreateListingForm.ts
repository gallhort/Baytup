'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CreateListingFormData, INITIAL_FORM_DATA } from '../types';

const STORAGE_KEY = 'baytup_create_listing_draft';
const DEBOUNCE_MS = 500;

export function useCreateListingForm() {
  const [formData, setFormData] = useState<CreateListingFormData>(() => {
    if (typeof window === 'undefined') return INITIAL_FORM_DATA;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_FORM_DATA, ...parsed };
      }
    } catch {}
    return INITIAL_FORM_DATA;
  });

  const [enableAltCurrency, setEnableAltCurrency] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!parsed.pricing?.altBasePrice;
      }
    } catch {}
    return false;
  });

  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Auto-save to localStorage with debounce
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      } catch {}
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [formData]);

  const updateField = useCallback(<K extends keyof CreateListingFormData>(
    key: K,
    value: CreateListingFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateNested = useCallback((
    key: keyof CreateListingFormData,
    nestedKey: string,
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      [key]: { ...(prev[key] as any), [nestedKey]: value },
    }));
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setFormData(INITIAL_FORM_DATA);
    setEnableAltCurrency(false);
  }, []);

  const hasDraft = useCallback(() => {
    return formData.category !== '' || formData.title !== '' || formData.images.length > 0;
  }, [formData]);

  return {
    formData,
    setFormData,
    updateField,
    updateNested,
    enableAltCurrency,
    setEnableAltCurrency,
    clearDraft,
    hasDraft,
  };
}
