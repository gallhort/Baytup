'use client';

import React, { useState, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Calendar,
  Link2,
  Copy,
  Trash2,
  RefreshCw,
  Plus,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExternalCalendar {
  name: string;
  url: string;
  lastSynced?: string;
  lastError?: string;
}

interface CalendarSyncProps {
  listingId: string;
  listingTitle: string;
  icalToken?: string;
  externalCalendars?: ExternalCalendar[];
  onUpdate: () => void;
}

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

const translations = {
  fr: {
    title: 'Synchronisation du calendrier',
    subtitle: 'Synchronisez vos calendriers externes pour eviter les doubles reservations',
    exportSection: 'Exporter votre calendrier',
    exportDescription:
      'Utilisez cette URL iCal pour synchroniser vos reservations Baytup avec Airbnb, Booking.com ou tout autre service.',
    generateUrl: 'Generer l\'URL iCal',
    generating: 'Generation en cours...',
    copyUrl: 'Copier l\'URL',
    copied: 'Copie !',
    urlGenerated: 'URL iCal generee avec succes',
    urlGenerateError: 'Erreur lors de la generation de l\'URL',
    copySuccess: 'URL copiee dans le presse-papiers',
    copyError: 'Erreur lors de la copie',
    importSection: 'Calendriers externes importes',
    importDescription: 'Importez les calendriers d\'autres plateformes pour bloquer automatiquement les dates.',
    noCalendars: 'Aucun calendrier externe importe',
    addCalendar: 'Ajouter un calendrier',
    calendarName: 'Nom du calendrier',
    calendarNamePlaceholder: 'ex: Airbnb, Booking.com',
    calendarUrl: 'URL iCal',
    calendarUrlPlaceholder: 'https://www.airbnb.com/calendar/ical/...',
    import: 'Importer',
    importing: 'Importation...',
    importSuccess: 'Calendrier importe avec succes',
    importError: 'Erreur lors de l\'importation du calendrier',
    deleteConfirm: 'Supprimer ce calendrier externe ?',
    deleteSuccess: 'Calendrier supprime avec succes',
    deleteError: 'Erreur lors de la suppression du calendrier',
    syncAll: 'Tout synchroniser',
    syncing: 'Synchronisation...',
    syncSuccess: 'Tous les calendriers ont ete synchronises',
    syncError: 'Erreur lors de la synchronisation',
    lastSynced: 'Derniere synchro',
    syncFailed: 'Echec de la synchro',
    never: 'Jamais',
    maxCalendars: 'Maximum 5 calendriers externes autorises',
    nameRequired: 'Le nom est requis',
    urlRequired: 'L\'URL est requise',
    urlInvalid: 'L\'URL doit commencer par http:// ou https://',
  },
  en: {
    title: 'Calendar Sync',
    subtitle: 'Sync your external calendars to avoid double bookings',
    exportSection: 'Export your calendar',
    exportDescription:
      'Use this iCal URL to sync your Baytup bookings with Airbnb, Booking.com or any other service.',
    generateUrl: 'Generate iCal URL',
    generating: 'Generating...',
    copyUrl: 'Copy URL',
    copied: 'Copied!',
    urlGenerated: 'iCal URL generated successfully',
    urlGenerateError: 'Failed to generate iCal URL',
    copySuccess: 'URL copied to clipboard',
    copyError: 'Failed to copy URL',
    importSection: 'Imported external calendars',
    importDescription: 'Import calendars from other platforms to automatically block dates.',
    noCalendars: 'No external calendars imported',
    addCalendar: 'Add a calendar',
    calendarName: 'Calendar name',
    calendarNamePlaceholder: 'e.g. Airbnb, Booking.com',
    calendarUrl: 'iCal URL',
    calendarUrlPlaceholder: 'https://www.airbnb.com/calendar/ical/...',
    import: 'Import',
    importing: 'Importing...',
    importSuccess: 'Calendar imported successfully',
    importError: 'Failed to import calendar',
    deleteConfirm: 'Delete this external calendar?',
    deleteSuccess: 'Calendar deleted successfully',
    deleteError: 'Failed to delete calendar',
    syncAll: 'Sync all',
    syncing: 'Syncing...',
    syncSuccess: 'All calendars synced successfully',
    syncError: 'Failed to sync calendars',
    lastSynced: 'Last synced',
    syncFailed: 'Sync failed',
    never: 'Never',
    maxCalendars: 'Maximum 5 external calendars allowed',
    nameRequired: 'Name is required',
    urlRequired: 'URL is required',
    urlInvalid: 'URL must start with http:// or https://',
  },
  ar: {
    title: 'مزامنة التقويم',
    subtitle: 'قم بمزامنة تقويماتك الخارجية لتجنب الحجوزات المزدوجة',
    exportSection: 'تصدير تقويمك',
    exportDescription:
      'استخدم رابط iCal هذا لمزامنة حجوزات Baytup مع Airbnb او Booking.com او اي خدمة اخرى.',
    generateUrl: 'إنشاء رابط iCal',
    generating: 'جاري الإنشاء...',
    copyUrl: 'نسخ الرابط',
    copied: 'تم النسخ!',
    urlGenerated: 'تم إنشاء رابط iCal بنجاح',
    urlGenerateError: 'فشل في إنشاء رابط iCal',
    copySuccess: 'تم نسخ الرابط',
    copyError: 'فشل في نسخ الرابط',
    importSection: 'التقويمات الخارجية المستوردة',
    importDescription: 'استورد تقويمات من منصات اخرى لحجب التواريخ تلقائيا.',
    noCalendars: 'لا توجد تقويمات خارجية مستوردة',
    addCalendar: 'إضافة تقويم',
    calendarName: 'اسم التقويم',
    calendarNamePlaceholder: 'مثال: Airbnb, Booking.com',
    calendarUrl: 'رابط iCal',
    calendarUrlPlaceholder: 'https://www.airbnb.com/calendar/ical/...',
    import: 'استيراد',
    importing: 'جاري الاستيراد...',
    importSuccess: 'تم استيراد التقويم بنجاح',
    importError: 'فشل في استيراد التقويم',
    deleteConfirm: 'حذف هذا التقويم الخارجي؟',
    deleteSuccess: 'تم حذف التقويم بنجاح',
    deleteError: 'فشل في حذف التقويم',
    syncAll: 'مزامنة الكل',
    syncing: 'جاري المزامنة...',
    syncSuccess: 'تمت مزامنة جميع التقويمات بنجاح',
    syncError: 'فشل في مزامنة التقويمات',
    lastSynced: 'آخر مزامنة',
    syncFailed: 'فشل المزامنة',
    never: 'أبداً',
    maxCalendars: 'الحد الأقصى 5 تقويمات خارجية',
    nameRequired: 'الاسم مطلوب',
    urlRequired: 'الرابط مطلوب',
    urlInvalid: 'يجب أن يبدأ الرابط بـ http:// أو https://',
  },
} as const;

type Language = 'fr' | 'en' | 'ar';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_EXTERNAL_CALENDARS = 5;

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

function apiUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_API_URL}${path}`;
}

function formatDate(iso: string | undefined, language: Language): string {
  if (!iso) return '';
  try {
    const locale = language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar-SA' : 'en-US';
    return new Date(iso).toLocaleString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalendarSync({
  listingId,
  listingTitle,
  icalToken,
  externalCalendars = [],
  onUpdate,
}: CalendarSyncProps) {
  const { language } = useLanguage();
  const t = translations[(language as Language) || 'en'] ?? translations.en;
  const isRtl = language === 'ar';

  // ---- Local state ----------------------------------------------------------
  const [generatingToken, setGeneratingToken] = useState(false);
  const [localIcalUrl, setLocalIcalUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [importName, setImportName] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);

  const [syncLoading, setSyncLoading] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  // ---- Derived values -------------------------------------------------------
  const icalUrl =
    localIcalUrl ??
    (icalToken
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar/listings/${listingId}/ical/${icalToken}`
      : null);

  const canAddMore = externalCalendars.length < MAX_EXTERNAL_CALENDARS;

  // ---- Handlers -------------------------------------------------------------

  const handleGenerateToken = useCallback(async () => {
    setGeneratingToken(true);
    try {
      const res = await axios.post(
        apiUrl(`/calendar/listings/${listingId}/generate-token`),
        {},
        { headers: getAuthHeaders() },
      );
      setLocalIcalUrl(res.data.icalUrl);
      toast.success(t.urlGenerated);
      onUpdate();
    } catch {
      toast.error(t.urlGenerateError);
    } finally {
      setGeneratingToken(false);
    }
  }, [listingId, onUpdate, t]);

  const handleCopy = useCallback(async () => {
    if (!icalUrl) return;
    try {
      await navigator.clipboard.writeText(icalUrl);
      setCopied(true);
      toast.success(t.copySuccess);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t.copyError);
    }
  }, [icalUrl, t]);

  const handleImport = useCallback(async () => {
    const trimmedName = importName.trim();
    const trimmedUrl = importUrl.trim();

    if (!trimmedName) {
      toast.error(t.nameRequired);
      return;
    }
    if (!trimmedUrl) {
      toast.error(t.urlRequired);
      return;
    }
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      toast.error(t.urlInvalid);
      return;
    }

    setImportLoading(true);
    try {
      await axios.post(
        apiUrl(`/calendar/listings/${listingId}/import`),
        { name: trimmedName, url: trimmedUrl },
        { headers: getAuthHeaders() },
      );
      toast.success(t.importSuccess);
      setImportName('');
      setImportUrl('');
      setShowImportForm(false);
      onUpdate();
    } catch {
      toast.error(t.importError);
    } finally {
      setImportLoading(false);
    }
  }, [importName, importUrl, listingId, onUpdate, t]);

  const handleDelete = useCallback(
    async (index: number) => {
      if (!window.confirm(t.deleteConfirm)) return;
      setDeletingIndex(index);
      try {
        await axios.delete(
          apiUrl(`/calendar/listings/${listingId}/external/${index}`),
          { headers: getAuthHeaders() },
        );
        toast.success(t.deleteSuccess);
        onUpdate();
      } catch {
        toast.error(t.deleteError);
      } finally {
        setDeletingIndex(null);
      }
    },
    [listingId, onUpdate, t],
  );

  const handleSyncAll = useCallback(async () => {
    setSyncLoading(true);
    try {
      await axios.post(
        apiUrl(`/calendar/listings/${listingId}/sync`),
        {},
        { headers: getAuthHeaders() },
      );
      toast.success(t.syncSuccess);
      onUpdate();
    } catch {
      toast.error(t.syncError);
    } finally {
      setSyncLoading(false);
    }
  }, [listingId, onUpdate, t]);

  // ---- Render ---------------------------------------------------------------

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* ================================================================== */}
      {/* Header                                                             */}
      {/* ================================================================== */}
      <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B35] flex items-center justify-center shadow-sm">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
              {t.title}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 truncate">{t.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {/* ================================================================ */}
        {/* Export iCal URL                                                   */}
        {/* ================================================================ */}
        <section className="px-5 py-5 sm:px-6 sm:py-6">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1">
            <ExternalLink className="w-4 h-4 text-[#FF6B35]" />
            {t.exportSection}
          </h3>
          <p className="text-xs text-gray-500 mb-4">{t.exportDescription}</p>

          {icalUrl ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-600 truncate select-all">{icalUrl}</span>
              </div>
              <button
                onClick={handleCopy}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm flex-shrink-0 ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-[#FF6B35] text-white hover:bg-[#e85e2d] active:scale-[0.97]'
                }`}
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {t.copied}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    {t.copyUrl}
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateToken}
              disabled={generatingToken}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#e85e2d] active:scale-[0.97] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {generatingToken ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {t.generating}
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  {t.generateUrl}
                </>
              )}
            </button>
          )}
        </section>

        {/* ================================================================ */}
        {/* External calendars list                                          */}
        {/* ================================================================ */}
        <section className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#FF6B35]" />
              {t.importSection}
            </h3>

            {externalCalendars.length > 0 && (
              <button
                onClick={handleSyncAll}
                disabled={syncLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#FF6B35] bg-orange-50 hover:bg-orange-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`}
                />
                {syncLoading ? t.syncing : t.syncAll}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-4">{t.importDescription}</p>

          {externalCalendars.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">{t.noCalendars}</p>
            </div>
          ) : (
            <ul className="space-y-2 mb-2">
              {externalCalendars.map((cal, index) => (
                <li
                  key={`${cal.name}-${index}`}
                  className="flex items-start sm:items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 group hover:border-gray-200 transition-colors"
                >
                  {/* Status indicator */}
                  <div className="flex-shrink-0 mt-0.5 sm:mt-0">
                    {cal.lastError ? (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    ) : cal.lastSynced ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <Calendar className="w-5 h-5 text-gray-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{cal.name}</p>
                    <p className="text-xs text-gray-400 truncate">{cal.url}</p>
                    <div className="mt-1">
                      {cal.lastError ? (
                        <span className="inline-flex items-center gap-1 text-xs text-red-500">
                          <AlertCircle className="w-3 h-3" />
                          {t.syncFailed}: {cal.lastError}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {t.lastSynced}:{' '}
                          {cal.lastSynced
                            ? formatDate(cal.lastSynced, language as Language)
                            : t.never}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(index)}
                    disabled={deletingIndex === index}
                    className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t.deleteConfirm}
                  >
                    {deletingIndex === index ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Max calendars notice */}
          {!canAddMore && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-3 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {t.maxCalendars}
            </p>
          )}

          {/* ============================================================== */}
          {/* Import form                                                     */}
          {/* ============================================================== */}
          {canAddMore && (
            <div className="mt-4">
              {!showImportForm ? (
                <button
                  onClick={() => setShowImportForm(true)}
                  className="flex items-center gap-2 text-sm font-medium text-[#FF6B35] hover:text-[#e85e2d] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t.addCalendar}
                </button>
              ) : (
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t.calendarName}
                    </label>
                    <input
                      type="text"
                      value={importName}
                      onChange={(e) => setImportName(e.target.value)}
                      placeholder={t.calendarNamePlaceholder}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-colors placeholder:text-gray-400"
                      dir={isRtl ? 'rtl' : 'ltr'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t.calendarUrl}
                    </label>
                    <input
                      type="url"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      placeholder={t.calendarUrlPlaceholder}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-colors placeholder:text-gray-400"
                      dir="ltr"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleImport}
                      disabled={importLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#e85e2d] active:scale-[0.97] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {importLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          {t.importing}
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          {t.import}
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowImportForm(false);
                        setImportName('');
                        setImportUrl('');
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      {language === 'fr'
                        ? 'Annuler'
                        : language === 'ar'
                          ? 'إلغاء'
                          : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
