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
    console.log('🚀 LanguageContext: Loading from localStorage...');
    const savedLanguage = localStorage.getItem('baytup_language') as Language;
    const savedCurrency = localStorage.getItem('baytup_currency') as 'DZD' | 'EUR';
    console.log('📦 LanguageContext: Saved language:', savedLanguage);
    console.log('📦 LanguageContext: Saved currency:', savedCurrency);

    if (savedLanguage && ['en', 'fr', 'ar'].includes(savedLanguage)) {
      setLanguageState(savedLanguage);
      console.log('✅ LanguageContext: Loaded language:', savedLanguage);
    } else {
      console.log('⚠️ LanguageContext: No valid saved language, using default: en');
    }

    if (savedCurrency && ['DZD', 'EUR'].includes(savedCurrency)) {
      setCurrencyState(savedCurrency);
      console.log('✅ LanguageContext: Loaded currency:', savedCurrency);
    } else {
      console.log('⚠️ LanguageContext: No valid saved currency, using default: DZD');
    }
  }, []);

  // Update HTML direction and language when language changes
  useEffect(() => {
    const dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = language;

    console.log('🌍 DIRECTION CHANGED:', {
      language,
      dir,
      htmlDir: document.documentElement.dir,
      htmlLang: document.documentElement.lang
    });
  }, [language]);

  const setLanguage = (lang: Language) => {
    console.log('🌍 LanguageContext: setLanguage called with:', lang);
    setLanguageState(lang);
    localStorage.setItem('baytup_language', lang);
    console.log('✅ LanguageContext: Language set to:', lang);
  };

  const setCurrency = (curr: 'DZD' | 'EUR') => {
    console.log('💰 LanguageContext: setCurrency called with:', curr);
    setCurrencyState(curr);
    localStorage.setItem('baytup_currency', curr);
    console.log('✅ LanguageContext: Currency set to:', curr);
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