'use client';

import Link from 'next/link';
import { Shield, Clock, MessageCircle, CheckCircle, AlertTriangle, Phone, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DisputesPage() {
  const { language } = useLanguage();

  const content = language === 'fr' ? {
    title: 'Résolution des litiges',
    subtitle: 'Nous sommes là pour vous aider en cas de problème.',
    intro: 'Chez Baytup, la satisfaction de nos voyageurs et hôtes est notre priorité. En cas de problème lors de votre séjour, voici comment nous intervenons.',
    stepsTitle: 'Comment ça marche',
    steps: [
      {
        icon: MessageCircle,
        title: 'Étape 1 : Contactez votre hôte',
        desc: 'La plupart des problèmes se résolvent directement avec votre hôte via la messagerie Baytup. Décrivez le problème avec des photos si possible.',
        time: 'Réponse attendue sous 2h',
      },
      {
        icon: AlertTriangle,
        title: 'Étape 2 : Signalez à Baytup',
        desc: 'Si le problème n\'est pas résolu, ouvrez un ticket support depuis votre tableau de bord. Notre équipe prend en charge votre demande.',
        time: 'Prise en charge sous 24h',
      },
      {
        icon: Shield,
        title: 'Étape 3 : Médiation Baytup',
        desc: 'Notre équipe analyse la situation, contacte les deux parties et propose une solution équitable : remboursement partiel ou total, relogement, ou compensation.',
        time: 'Résolution sous 48-72h',
      },
      {
        icon: CheckCircle,
        title: 'Étape 4 : Résolution',
        desc: 'Une fois la décision prise, le remboursement est traité automatiquement sous 5 à 10 jours ouvrés sur votre moyen de paiement original.',
        time: 'Remboursement sous 5-10 jours',
      },
    ],
    casesTitle: 'Cas couverts par Baytup',
    cases: [
      'Le logement ne correspond pas à l\'annonce (photos, équipements, emplacement)',
      'Le logement est insalubre ou dangereux',
      'L\'hôte annule à la dernière minute',
      'Impossible d\'accéder au logement (clés, code, hôte injoignable)',
      'Équipements essentiels manquants (eau chaude, électricité, literie)',
      'Nuisances graves (bruit, insectes, etc.)',
    ],
    guaranteeTitle: 'La Garantie Baytup',
    guarantees: [
      { title: 'Remboursement intégral', desc: 'Si le logement est inaccessible ou radicalement différent de l\'annonce.' },
      { title: 'Relogement d\'urgence', desc: 'Nous vous aidons à trouver un logement alternatif si nécessaire.' },
      { title: 'Médiation impartiale', desc: 'Notre équipe écoute les deux parties avant toute décision.' },
      { title: 'Support 7j/7', desc: 'Notre équipe est disponible tous les jours pour vous accompagner.' },
    ],
    tipsTitle: 'Conseils pour éviter les litiges',
    tips: [
      'Lisez attentivement la description et les avis avant de réserver',
      'Communiquez avec votre hôte avant votre arrivée pour confirmer les détails',
      'Prenez des photos à votre arrivée en cas de problème',
      'Signalez tout problème dans les 24 premières heures de votre séjour',
    ],
    contactCta: 'Vous avez un problème en cours ?',
    contactBtn: 'Ouvrir un ticket support',
    backToHelp: 'Retour au centre d\'aide',
  } : language === 'ar' ? {
    title: 'حل النزاعات',
    subtitle: 'نحن هنا لمساعدتك في حالة وجود مشكلة.',
    intro: 'في Baytup، رضا المسافرين والمضيفين هو أولويتنا. في حالة وجود مشكلة، إليك كيف نتدخل.',
    stepsTitle: 'كيف يعمل',
    steps: [
      { icon: MessageCircle, title: 'الخطوة 1: اتصل بالمضيف', desc: 'معظم المشاكل تُحل مباشرة مع المضيف عبر رسائل Baytup.', time: 'رد متوقع خلال ساعتين' },
      { icon: AlertTriangle, title: 'الخطوة 2: أبلغ Baytup', desc: 'إذا لم تُحل المشكلة، افتح تذكرة دعم من لوحة التحكم.', time: 'معالجة خلال 24 ساعة' },
      { icon: Shield, title: 'الخطوة 3: وساطة Baytup', desc: 'فريقنا يحلل الوضع ويقترح حلاً عادلاً.', time: 'حل خلال 48-72 ساعة' },
      { icon: CheckCircle, title: 'الخطوة 4: الحل', desc: 'بعد اتخاذ القرار، يتم معالجة الاسترداد تلقائيًا.', time: 'استرداد خلال 5-10 أيام' },
    ],
    casesTitle: 'الحالات التي يغطيها Baytup',
    cases: [
      'السكن لا يتطابق مع الإعلان',
      'السكن غير صحي أو خطير',
      'المضيف يلغي في اللحظة الأخيرة',
      'تعذر الوصول إلى السكن',
      'معدات أساسية مفقودة',
      'إزعاجات خطيرة',
    ],
    guaranteeTitle: 'ضمان Baytup',
    guarantees: [
      { title: 'استرداد كامل', desc: 'إذا كان السكن غير متاح أو مختلف جذريًا عن الإعلان.' },
      { title: 'إعادة إسكان طارئة', desc: 'نساعدك في إيجاد سكن بديل إذا لزم الأمر.' },
      { title: 'وساطة محايدة', desc: 'فريقنا يستمع للطرفين قبل أي قرار.' },
      { title: 'دعم 7 أيام/7', desc: 'فريقنا متاح كل يوم لمساعدتك.' },
    ],
    tipsTitle: 'نصائح لتجنب النزاعات',
    tips: [
      'اقرأ الوصف والتقييمات بعناية قبل الحجز',
      'تواصل مع المضيف قبل وصولك',
      'التقط صورًا عند وصولك',
      'أبلغ عن أي مشكلة خلال الـ 24 ساعة الأولى',
    ],
    contactCta: 'لديك مشكلة حالية؟',
    contactBtn: 'فتح تذكرة دعم',
    backToHelp: 'العودة إلى مركز المساعدة',
  } : {
    title: 'Dispute Resolution',
    subtitle: 'We\'re here to help if something goes wrong.',
    intro: 'At Baytup, guest and host satisfaction is our priority. If you encounter an issue during your stay, here\'s how we step in.',
    stepsTitle: 'How it works',
    steps: [
      { icon: MessageCircle, title: 'Step 1: Contact your host', desc: 'Most issues are resolved directly with your host via Baytup messaging. Describe the problem with photos if possible.', time: 'Expected response within 2h' },
      { icon: AlertTriangle, title: 'Step 2: Report to Baytup', desc: 'If the issue isn\'t resolved, open a support ticket from your dashboard. Our team takes over.', time: 'Handled within 24h' },
      { icon: Shield, title: 'Step 3: Baytup mediation', desc: 'Our team analyzes the situation, contacts both parties, and proposes a fair solution: partial/full refund, relocation, or compensation.', time: 'Resolution within 48-72h' },
      { icon: CheckCircle, title: 'Step 4: Resolution', desc: 'Once a decision is made, the refund is processed automatically within 5-10 business days.', time: 'Refund within 5-10 days' },
    ],
    casesTitle: 'Cases covered by Baytup',
    cases: [
      'Property doesn\'t match the listing (photos, amenities, location)',
      'Property is unsanitary or unsafe',
      'Host cancels at the last minute',
      'Unable to access the property (keys, code, host unreachable)',
      'Essential amenities missing (hot water, electricity, bedding)',
      'Serious disturbances (noise, pests, etc.)',
    ],
    guaranteeTitle: 'The Baytup Guarantee',
    guarantees: [
      { title: 'Full refund', desc: 'If the property is inaccessible or radically different from the listing.' },
      { title: 'Emergency relocation', desc: 'We help you find alternative accommodation if needed.' },
      { title: 'Impartial mediation', desc: 'Our team listens to both parties before any decision.' },
      { title: '7-day support', desc: 'Our team is available every day to assist you.' },
    ],
    tipsTitle: 'Tips to avoid disputes',
    tips: [
      'Read the description and reviews carefully before booking',
      'Communicate with your host before arrival to confirm details',
      'Take photos upon arrival in case of issues',
      'Report any problem within the first 24 hours of your stay',
    ],
    contactCta: 'Having an issue right now?',
    contactBtn: 'Open a support ticket',
    backToHelp: 'Back to Help Center',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#FF6B35] to-orange-600 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{content.title}</h1>
          <p className="text-lg opacity-90">{content.subtitle}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/help" className="inline-flex items-center gap-1 text-sm text-[#FF6B35] hover:underline mb-8">
          <ArrowRight className="w-4 h-4 rotate-180" />
          {content.backToHelp}
        </Link>

        <p className="text-gray-700 text-lg mb-12">{content.intro}</p>

        {/* Steps */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{content.stepsTitle}</h2>
        <div className="space-y-4 mb-16">
          {content.steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-[#FF6B35]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{step.desc}</p>
                  <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                    <Clock className="w-3 h-3" />
                    {step.time}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cases covered */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{content.casesTitle}</h2>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-16">
          <ul className="space-y-3">
            {content.cases.map((c, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{c}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Guarantee */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{content.guaranteeTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
          {content.guarantees.map((g, i) => (
            <div key={i} className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-1">{g.title}</h3>
              <p className="text-sm text-gray-600">{g.desc}</p>
            </div>
          ))}
        </div>

        {/* Tips */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{content.tipsTitle}</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-16">
          <ul className="space-y-3">
            {content.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-amber-200 text-amber-800 rounded-full flex items-center justify-center text-sm font-bold">{i + 1}</span>
                <span className="text-gray-700">{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact CTA */}
        <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-2xl p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-4">{content.contactCta}</h2>
          <Link
            href="/dashboard/support"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF6B35] text-white rounded-xl hover:bg-[#e55a2a] transition-colors font-medium"
          >
            <MessageCircle className="w-5 h-5" />
            {content.contactBtn}
          </Link>
        </div>
      </div>
    </div>
  );
}
