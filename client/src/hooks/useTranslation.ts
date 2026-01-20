import { useLanguage } from '@/contexts/LanguageContext';
import { translations, TranslationSection } from '@/locales';

export function useTranslation(section: TranslationSection) {
  const { language } = useLanguage();
  return translations[language][section];
}
