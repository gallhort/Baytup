'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Globe, ChevronUp } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Footer() {
  const t = useTranslation('footer') as any;
  const { language, setLanguage, currency, setCurrency } = useLanguage();
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const isRTL = language === 'ar';

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ar', name: 'العربية', flag: '🇩🇿' }
  ];

  const currencies = [
    { code: 'DZD', symbol: 'دج', name: 'Algerian Dinar' },
    { code: 'EUR', symbol: '€', name: 'Euro' }
  ];

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Logo Section */}
        <div className="mb-12">
          <Link href="/" className="inline-block transition-opacity hover:opacity-80">
            <Image
              src="/Logo.png"
              alt="Baytup Logo"
              width={160}
              height={85}
              className="h-10 w-auto sm:h-11 md:h-12 max-w-[140px] sm:max-w-[160px] md:max-w-[180px]"
              style={{ objectFit: "contain" }}
            />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">

          {/* Support Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              {t.support}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/coming-soon?page=help-center"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {t.helpCenter}
                </Link>
              </li>
              <li>
                <Link
                  href="/coming-soon?page=safety-trust"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {t.safety}
                </Link>
              </li>
              <li>
                <Link
                  href="/coming-soon?page=cancellation-options"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {t.cancellation}
                </Link>
              </li>
              <li>
                <Link
                  href="/coming-soon?page=covid-response"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {t.covid}
                </Link>
              </li>
            </ul>
          </div>

          {/* Hosting Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              {t.hosting}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/become-host"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {t.becomeHost}
                </Link>
              </li>
              <li>
                <Link
                  href="/coming-soon?page=host-resources"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {t.hostResources}
                </Link>
              </li>
              <li>
                <Link
                  href="/coming-soon?page=responsible-hosting"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {t.responsibleHosting}
                </Link>
              </li>
            </ul>
          </div>

          {/* Baytup Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              {t.about}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/coming-soon?page=newsroom"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {t.newsroom}
                </Link>
              </li>
              <li>
                <Link
                  href="/coming-soon?page=careers"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {t.careers}
                </Link>
              </li>
              <li>
                <Link
                  href="/coming-soon?page=investors"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {t.investors}
                </Link>
              </li>
              <li>
                <Link
                  href="/coming-soon?page=diversity"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {t.diversity}
                </Link>
              </li>
            </ul>
          </div>

          {/* Language & Currency Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              {t.languageRegion}
            </h3>

            {/* Language Selector */}
            <div className="relative mb-4">
              <button
                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">
                    {languages.find(lang => lang.code === language)?.flag}
                  </span>
                  <span>
                    {languages.find(lang => lang.code === language)?.name}
                  </span>
                </div>
                <ChevronUp
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isLanguageMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isLanguageMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="py-2">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code as 'en' | 'fr' | 'ar');
                          setIsLanguageMenuOpen(false);
                        }}
                        className={`w-full flex items-center space-x-2 px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          language === lang.code ? 'bg-orange-50 text-orange-600' : 'text-gray-700'
                        }`}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span>{lang.name}</span>
                        {language === lang.code && (
                          <div className="ml-auto w-2 h-2 bg-orange-500 rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Currency Selector */}
            <div className="mb-4">
              <label className="block text-xs text-gray-600 mb-2">{t.currency}</label>
              <div className="space-y-1">
                {currencies.map((curr) => (
                  <button
                    key={curr.code}
                    onClick={() => setCurrency(curr.code as 'DZD' | 'EUR')}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                      currency === curr.code
                        ? 'bg-orange-50 text-orange-600 border border-orange-200'
                        : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{curr.code}</span>
                      <span className="text-gray-600">{curr.symbol}</span>
                    </div>
                    {currency === curr.code && (
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Social Media */}
            <div>
              <h4 className="text-xs text-gray-600 mb-2">{t.socialMedia}</h4>
              <div className="flex space-x-3">
                <Link
                  href="https://facebook.com/baytup"
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="sr-only">Facebook</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </Link>

                <Link
                  href="https://instagram.com/baytup"
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="sr-only">Instagram</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987S24 18.607 24 11.987C24 5.367 18.633.001 12.017.001zm5.563 11.987c0 3.075-2.488 5.563-5.563 5.563s-5.563-2.488-5.563-5.563 2.488-5.563 5.563-5.563 5.563 2.488 5.563 5.563z"/>
                  </svg>
                </Link>

                <Link
                  href="https://twitter.com/baytup"
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="sr-only">Twitter</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">

            {/* Copyright */}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>{t.copyright}</span>
            </div>

            {/* Legal Links */}
            <div className="flex items-center space-x-6 text-sm">
              <Link
                href="/privacy"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                {t.privacy}
              </Link>
              <span className="text-gray-300">·</span>
              <Link
                href="/terms"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                {t.terms}
              </Link>
              <span className="text-gray-300">·</span>
              <Link
                href="/sitemap"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                {t.sitemap}
              </Link>
            </div>
          </div>

          {/* Algerian Pride Note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              {language === 'ar' ? (
                <>
                  صنع بحب في الجزائر 🇩🇿 لربط المسافرين بالضيافة الجزائرية الأصيلة
                </>
              ) : language === 'fr' ? (
                <>
                  Fait avec amour en Algérie 🇩🇿 pour connecter les voyageurs à l'hospitalité algérienne authentique
                </>
              ) : (
                <>
                  Made with love in Algeria 🇩🇿 to connect travelers with authentic Algerian hospitality
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Click away handler for language menu */}
      {isLanguageMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsLanguageMenuOpen(false)}
        />
      )}
    </footer>
  );
}