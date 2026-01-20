'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '@/locales';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: 'DZD' | 'EUR';
  setCurrency: (curr: 'DZD' | 'EUR') => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [currency, setCurrencyState] = useState<'DZD' | 'EUR'>('DZD');

  // Load from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('baytup-language') as Language;
    const savedCurrency = localStorage.getItem('baytup-currency') as 'DZD' | 'EUR';

    if (savedLanguage && ['en', 'fr', 'ar'].includes(savedLanguage)) {
      setLanguageState(savedLanguage);
    }

    if (savedCurrency && ['DZD', 'EUR'].includes(savedCurrency)) {
      setCurrencyState(savedCurrency);
    }
  }, []);

  // Update HTML direction and language when language changes
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('baytup-language', lang);
  };

  const setCurrency = (curr: 'DZD' | 'EUR') => {
    setCurrencyState(curr);
    localStorage.setItem('baytup-currency', curr);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, currency, setCurrency }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}