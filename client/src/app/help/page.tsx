'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Home, CreditCard, Shield, MessageCircle, ChevronDown, ChevronUp, HelpCircle, Users, Calendar, Star, Phone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  icon: React.ElementType;
  items: FAQItem[];
}

export default function HelpPage() {
  const { language } = useLanguage();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const toggleItem = (key: string) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const content = language === 'fr' ? {
    title: 'Centre d\'aide',
    subtitle: 'Comment pouvons-nous vous aider ?',
    searchPlaceholder: 'Rechercher une question...',
    howItWorks: 'Comment ça marche',
    steps: [
      { title: 'Recherchez', desc: 'Parcourez nos annonces par ville, type de bien, dates et budget.' },
      { title: 'Réservez', desc: 'Sélectionnez vos dates et payez en ligne de manière sécurisée par carte CIB/Edahabia.' },
      { title: 'Profitez', desc: 'Recevez votre confirmation et les coordonnées de votre hôte. Bon séjour !' },
    ],
    contactTitle: 'Besoin d\'aide supplémentaire ?',
    contactDesc: 'Notre équipe est disponible 7j/7 pour vous accompagner.',
    contactBtn: 'Contacter le support',
    faq: [
      {
        title: 'Réservation',
        icon: Calendar,
        items: [
          { question: 'Comment réserver un logement ?', answer: 'Recherchez un logement, sélectionnez vos dates d\'arrivée et de départ, puis cliquez sur "Réserver". Vous serez guidé pour le paiement.' },
          { question: 'Comment annuler une réservation ?', answer: 'Rendez-vous dans votre tableau de bord > Mes réservations, puis cliquez sur "Annuler". Annulation gratuite jusqu\'à 48h avant l\'arrivée, 50% entre 48h et 24h, aucun remboursement après.' },
          { question: 'Quand recevrai-je la confirmation ?', answer: 'Pour les paiements par carte, la confirmation est instantanée. Vous recevrez un email avec tous les détails de votre réservation.' },
          { question: 'Puis-je modifier les dates de ma réservation ?', answer: 'Contactez directement votre hôte via la messagerie pour demander une modification. Si l\'hôte accepte, la réservation sera mise à jour.' },
        ]
      },
      {
        title: 'Paiement',
        icon: CreditCard,
        items: [
          { question: 'Quels moyens de paiement acceptez-vous ?', answer: 'Nous acceptons les cartes CIB et Edahabia (compatibles BaridiMob) pour les paiements en DZD, et Visa/Mastercard via Stripe pour les paiements en EUR.' },
          { question: 'Le paiement est-il sécurisé ?', answer: 'Oui, tous les paiements sont protégés par un cryptage SSL. Vos données bancaires ne sont jamais stockées sur nos serveurs.' },
          { question: 'Quand suis-je débité ?', answer: 'Le paiement est effectué au moment de la réservation. Le montant est débité immédiatement de votre compte.' },
          { question: 'Comment obtenir un remboursement ?', answer: 'En cas d\'annulation éligible, le remboursement est automatique sous 5 à 10 jours ouvrés sur votre moyen de paiement original.' },
        ]
      },
      {
        title: 'Hôtes',
        icon: Home,
        items: [
          { question: 'Comment devenir hôte sur Baytup ?', answer: 'Cliquez sur "Devenir hôte" dans le menu, remplissez votre profil et soumettez votre première annonce. Notre équipe vérifiera votre profil sous 24h.' },
          { question: 'Comment fixer le prix de mon logement ?', answer: 'Vous définissez librement votre prix par nuit. Consultez les annonces similaires dans votre ville pour vous positionner.' },
          { question: 'Comment recevoir mes paiements ?', answer: 'Les paiements sont versés sur votre compte après le check-in du voyageur. Consultez votre tableau de bord hôte pour suivre vos revenus.' },
          { question: 'Puis-je refuser une réservation ?', answer: 'Oui, vous pouvez gérer vos réservations depuis votre tableau de bord. Cependant, un taux d\'acceptation élevé améliore votre visibilité.' },
        ]
      },
      {
        title: 'Sécurité & Confiance',
        icon: Shield,
        items: [
          { question: 'Comment Baytup vérifie-t-il les hôtes ?', answer: 'Chaque hôte passe par un processus de vérification incluant l\'email, le téléphone et la validation de son identité par notre équipe.' },
          { question: 'Que faire en cas de problème avec un logement ?', answer: 'Contactez immédiatement le support via votre tableau de bord. Notre équipe intervient sous 24h pour résoudre tout litige.' },
          { question: 'Mes données personnelles sont-elles protégées ?', answer: 'Oui, nous respectons les standards de protection des données. Vos informations ne sont jamais partagées avec des tiers sans votre consentement.' },
          { question: 'Comment signaler un comportement inapproprié ?', answer: 'Utilisez le bouton "Signaler" sur l\'annonce ou le profil concerné, ou contactez directement notre support.' },
        ]
      },
      {
        title: 'Avis & Évaluations',
        icon: Star,
        items: [
          { question: 'Quand puis-je laisser un avis ?', answer: 'Après la fin de votre séjour, vous aurez 14 jours pour laisser un avis. Chaque avis est lié à un séjour vérifié.' },
          { question: 'Puis-je modifier mon avis ?', answer: 'Non, les avis ne peuvent pas être modifiés après publication pour garantir leur authenticité.' },
          { question: 'Comment fonctionnent les notes ?', answer: 'Les voyageurs notent de 1 à 5 étoiles. Les logements avec une moyenne de 4.7+ et au moins 3 avis reçoivent le badge "Coup de coeur voyageurs".' },
        ]
      },
    ]
  } : language === 'ar' ? {
    title: 'مركز المساعدة',
    subtitle: 'كيف يمكننا مساعدتك؟',
    searchPlaceholder: 'ابحث عن سؤال...',
    howItWorks: 'كيف يعمل',
    steps: [
      { title: 'ابحث', desc: 'تصفح الإعلانات حسب المدينة ونوع العقار والتواريخ والميزانية.' },
      { title: 'احجز', desc: 'حدد تواريخك وادفع عبر الإنترنت بشكل آمن ببطاقة CIB/Edahabia.' },
      { title: 'استمتع', desc: 'استلم تأكيدك وتفاصيل الاتصال بالمضيف. إقامة سعيدة!' },
    ],
    contactTitle: 'تحتاج مساعدة إضافية؟',
    contactDesc: 'فريقنا متاح 7 أيام في الأسبوع لمساعدتك.',
    contactBtn: 'اتصل بالدعم',
    faq: [
      {
        title: 'الحجز',
        icon: Calendar,
        items: [
          { question: 'كيف أحجز سكنًا؟', answer: 'ابحث عن سكن، حدد تواريخ الوصول والمغادرة، ثم انقر على "احجز". سيتم توجيهك للدفع.' },
          { question: 'كيف ألغي حجزًا؟', answer: 'انتقل إلى لوحة التحكم > حجوزاتي، ثم انقر على "إلغاء". الإلغاء مجاني حتى 48 ساعة قبل الوصول.' },
          { question: 'متى أستلم التأكيد؟', answer: 'بالنسبة للدفع بالبطاقة، التأكيد فوري. ستتلقى بريدًا إلكترونيًا بكل تفاصيل حجزك.' },
        ]
      },
      {
        title: 'الدفع',
        icon: CreditCard,
        items: [
          { question: 'ما هي طرق الدفع المقبولة؟', answer: 'نقبل بطاقات CIB و Edahabia (متوافقة مع BaridiMob) للدفع بالدينار، و Visa/Mastercard عبر Stripe للدفع باليورو.' },
          { question: 'هل الدفع آمن؟', answer: 'نعم، جميع المدفوعات محمية بتشفير SSL. لا يتم تخزين بيانات بطاقتك على خوادمنا.' },
        ]
      },
      {
        title: 'الأمان والثقة',
        icon: Shield,
        items: [
          { question: 'كيف يتحقق Baytup من المضيفين؟', answer: 'يمر كل مضيف بعملية تحقق تشمل البريد الإلكتروني والهاتف والتحقق من الهوية.' },
          { question: 'ماذا أفعل في حالة مشكلة؟', answer: 'اتصل بالدعم فورًا عبر لوحة التحكم. فريقنا يتدخل خلال 24 ساعة لحل أي نزاع.' },
        ]
      },
    ]
  } : {
    title: 'Help Center',
    subtitle: 'How can we help you?',
    searchPlaceholder: 'Search for a question...',
    howItWorks: 'How it works',
    steps: [
      { title: 'Search', desc: 'Browse listings by city, property type, dates, and budget.' },
      { title: 'Book', desc: 'Select your dates and pay securely online with CIB/Edahabia card.' },
      { title: 'Enjoy', desc: 'Receive your confirmation and host contact details. Enjoy your stay!' },
    ],
    contactTitle: 'Need more help?',
    contactDesc: 'Our team is available 7 days a week to assist you.',
    contactBtn: 'Contact Support',
    faq: [
      {
        title: 'Booking',
        icon: Calendar,
        items: [
          { question: 'How do I book a property?', answer: 'Search for a property, select your check-in and check-out dates, then click "Book". You\'ll be guided through payment.' },
          { question: 'How do I cancel a booking?', answer: 'Go to your dashboard > My Bookings, then click "Cancel". Free cancellation up to 48h before arrival, 50% between 48h and 24h, no refund after.' },
          { question: 'When will I receive confirmation?', answer: 'For card payments, confirmation is instant. You\'ll receive an email with all booking details.' },
        ]
      },
      {
        title: 'Payment',
        icon: CreditCard,
        items: [
          { question: 'What payment methods do you accept?', answer: 'We accept CIB and Edahabia cards (BaridiMob compatible) for DZD payments, and Visa/Mastercard via Stripe for EUR payments.' },
          { question: 'Is payment secure?', answer: 'Yes, all payments are protected by SSL encryption. Your card details are never stored on our servers.' },
          { question: 'How do I get a refund?', answer: 'For eligible cancellations, the refund is automatic within 5-10 business days to your original payment method.' },
        ]
      },
      {
        title: 'Hosts',
        icon: Home,
        items: [
          { question: 'How do I become a host?', answer: 'Click "Become a Host" in the menu, complete your profile and submit your first listing. Our team will verify within 24h.' },
          { question: 'How do I set my price?', answer: 'You freely set your nightly rate. Check similar listings in your city for reference.' },
        ]
      },
      {
        title: 'Safety & Trust',
        icon: Shield,
        items: [
          { question: 'How does Baytup verify hosts?', answer: 'Every host goes through verification including email, phone, and identity validation by our team.' },
          { question: 'What if there\'s a problem with my stay?', answer: 'Contact support immediately via your dashboard. Our team intervenes within 24h to resolve any dispute.' },
        ]
      },
    ]
  };

  const allFaqItems = content.faq.flatMap((section, si) =>
    section.items.map((item, ii) => ({ ...item, key: `${si}-${ii}`, sectionTitle: section.title }))
  );

  const filteredItems = searchQuery.trim()
    ? allFaqItems.filter(item =>
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#FF6B35] to-orange-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{content.title}</h1>
          <p className="text-lg opacity-90 mb-8">{content.subtitle}</p>
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={content.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-12 pe-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* How it works */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">{content.howItWorks}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.steps.map((step, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-[#FF6B35] text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Search results */}
        {filteredItems && (
          <div className="mb-12">
            <p className="text-sm text-gray-500 mb-4">{filteredItems.length} {language === 'fr' ? 'résultat(s)' : 'result(s)'}</p>
            {filteredItems.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{language === 'fr' ? 'Aucun résultat trouvé.' : 'No results found.'}</p>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <div key={item.key} className="bg-white rounded-xl p-4 border border-gray-200">
                    <p className="text-xs text-[#FF6B35] font-medium mb-1">{item.sectionTitle}</p>
                    <p className="font-semibold text-gray-900 mb-2">{item.question}</p>
                    <p className="text-sm text-gray-600">{item.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FAQ sections */}
        {!filteredItems && (
          <div className="space-y-8">
            {content.faq.map((section, si) => {
              const Icon = section.icon;
              return (
                <div key={si}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <Icon className="w-5 h-5 text-[#FF6B35]" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                  </div>
                  <div className="space-y-2">
                    {section.items.map((item, ii) => {
                      const key = `${si}-${ii}`;
                      const isOpen = openItems[key];
                      return (
                        <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                          <button
                            onClick={() => toggleItem(key)}
                            className="w-full flex items-center justify-between p-4 text-start hover:bg-gray-50 transition-colors"
                          >
                            <span className="font-medium text-gray-900">{item.question}</span>
                            {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">
                              {item.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Contact CTA */}
        <div className="mt-16 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-8 text-center">
          <Phone className="w-10 h-10 text-green-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{content.contactTitle}</h2>
          <p className="text-gray-600 mb-6">{content.contactDesc}</p>
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
