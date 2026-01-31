'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import StripeConnectOnboarding from '@/components/payment/StripeConnectOnboarding';
import {
  Shield,
  CreditCard,
  Clock,
  Lock,
  Globe,
  CheckCircle,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  Banknote,
  Building2,
  TrendingUp,
  BadgeCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FAQ {
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    question: "Pourquoi dois-je configurer Stripe ?",
    answer: "Stripe est notre partenaire de paiement sécurisé pour les transactions en EUR. Il vous permet de recevoir vos paiements automatiquement sur votre compte bancaire européen après chaque réservation."
  },
  {
    question: "Dois-je avoir une entreprise pour recevoir des paiements ?",
    answer: "Non ! Vous pouvez recevoir des paiements en tant que particulier. Le formulaire demandera vos informations personnelles (nom, prénom, date de naissance, IBAN). Si vous avez une entreprise, vous pourrez aussi l'indiquer, mais ce n'est pas obligatoire."
  },
  {
    question: "Combien de temps prend la configuration ?",
    answer: "La configuration prend généralement 5 à 10 minutes. Vous aurez besoin d'une pièce d'identité et de vos coordonnées bancaires (IBAN)."
  },
  {
    question: "Quand recevrai-je mes paiements ?",
    answer: "Les fonds sont automatiquement virés sur votre compte 24 heures après le check-out de chaque voyageur. Le virement arrive généralement sous 2 à 5 jours ouvrés."
  },
  {
    question: "Y a-t-il des frais supplémentaires ?",
    answer: "Non, il n'y a aucun frais supplémentaire pour les hôtes. Baytup prélève uniquement sa commission standard de 3% sur chaque réservation."
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer: "Absolument. Stripe est certifié PCI DSS niveau 1, le plus haut niveau de certification de sécurité. Vos données bancaires ne transitent jamais par nos serveurs."
  },
  {
    question: "Que se passe-t-il si un voyageur annule ?",
    answer: "En cas d'annulation, le remboursement est calculé selon votre politique d'annulation. Les fonds non reversés restent sur votre compte Stripe."
  }
];

export default function HostPaymentsPage() {
  const router = useRouter();
  const { state } = useApp();
  const user = state.user;
  const t = useTranslation('hostPayments');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setLoading(false);
      // Redirect non-hosts
      if (user.role !== 'host' && user.role !== 'admin' && !user.hostInfo?.isHost) {
        toast.error('Cette page est réservée aux hôtes');
        router.push('/dashboard');
      }
    }
  }, [user, router]);

  // Check if user has EUR listings (optional - you can implement this check)
  const hasEurListings = true; // TODO: Check if user has listings with currency='EUR'

  const handleOnboardingComplete = () => {
    toast.success('Configuration Stripe terminée avec succès !');
    // Optionally refresh or redirect
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  // If user wants to see onboarding directly
  if (showOnboarding) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => setShowOnboarding(false)}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2 mb-4 transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Retour
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Configuration des paiements</h1>
          <p className="text-gray-600 mt-2">
            Configurez votre compte pour recevoir vos paiements automatiquement
          </p>
        </div>

        {/* Stripe Connect Onboarding Component */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <StripeConnectOnboarding onComplete={handleOnboardingComplete} />
        </div>

        {/* Security Badge */}
        <div className="mt-6 flex items-center justify-center gap-3 text-gray-500 text-sm">
          <Lock className="w-4 h-4" />
          <span>Connexion sécurisée SSL/TLS</span>
          <span className="text-gray-300">|</span>
          <Shield className="w-4 h-4" />
          <span>Powered by Stripe</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Info Banners */}
      <div className="space-y-4">
        {/* EUR Only */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900">Paiements en EUR uniquement</h3>
              <p className="text-sm text-blue-700 mt-1">
                Cette page est réservée aux hôtes qui proposent des annonces en <strong>EURO (EUR)</strong>.
                Si vous êtes en Algérie et recevez des paiements en <strong>DZD via SlickPay</strong>,
                rendez-vous sur la page <a href="/dashboard/earnings" className="underline font-medium">Revenus</a> pour gérer vos retraits.
              </p>
            </div>
          </div>
        </div>

        {/* Reassurance - No company needed */}
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-green-900">Pas besoin d'être une entreprise</h3>
              <p className="text-sm text-green-700 mt-1">
                Vous pouvez recevoir des paiements en tant que <strong>particulier</strong>.
                Le formulaire vous demandera vos <strong>informations personnelles</strong> (nom, prénom, date de naissance)
                et vos <strong>coordonnées bancaires</strong> (IBAN). C'est tout !
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#FF6B35] via-[#ff8255] to-[#ffA07A] rounded-3xl p-8 md:p-12 text-white">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <BadgeCheck className="w-5 h-5" />
              <span className="text-sm font-medium">Paiements sécurisés</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Recevez vos paiements EUR automatiquement
            </h1>
            <p className="text-lg text-white/90 mb-8 max-w-xl">
              Configurez votre compte bancaire européen (IBAN) et recevez vos gains en EUR directement après chaque réservation. Virements automatiques vers votre banque.
            </p>

            <button
              onClick={() => setShowOnboarding(true)}
              className="inline-flex items-center gap-3 bg-white text-[#FF6B35] px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Configurer mes paiements
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Visual Element */}
          <div className="hidden md:block">
            <div className="relative">
              <div className="w-64 h-64 bg-white/10 backdrop-blur-sm rounded-3xl p-6 transform rotate-3">
                <div className="w-full h-full bg-white/20 rounded-2xl flex items-center justify-center">
                  <CreditCard className="w-24 h-24 text-white/80" />
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-green-400 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">100% Sécurisé</h3>
          <p className="text-sm text-gray-500">Certification PCI DSS</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Paiements rapides</h3>
          <p className="text-sm text-gray-500">24h après checkout</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Banknote className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Zéro frais cachés</h3>
          <p className="text-sm text-gray-500">Commission claire 3%</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Globe className="w-6 h-6 text-orange-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">International</h3>
          <p className="text-sm text-gray-500">30+ pays supportés</p>
        </div>
      </div>

      {/* How it Works */}
      <div className="bg-white rounded-3xl p-8 md:p-10 border border-gray-100 shadow-sm">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Comment ça fonctionne ?
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Un processus simple et transparent pour recevoir vos paiements
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="relative">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B35] to-[#ff8255] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Configurez votre compte</h3>
              <p className="text-gray-600 text-sm">
                Renseignez vos informations d'identité et vos coordonnées bancaires en quelques minutes
              </p>
            </div>
            {/* Connector Line */}
            <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-[#FF6B35]/50 to-transparent"></div>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B35] to-[#ff8255] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Recevez des réservations</h3>
              <p className="text-gray-600 text-sm">
                Les voyageurs paient en EUR. Les fonds sont sécurisés jusqu'au checkout
              </p>
            </div>
            {/* Connector Line */}
            <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-[#FF6B35]/50 to-transparent"></div>
          </div>

          {/* Step 3 */}
          <div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Recevez vos gains</h3>
              <p className="text-gray-600 text-sm">
                24h après le checkout, vos gains sont automatiquement virés sur votre compte
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Partnership */}
      <div className="bg-gradient-to-r from-[#635BFF]/5 to-[#635BFF]/10 rounded-3xl p-8 md:p-10 border border-[#635BFF]/20">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-shrink-0">
            <div className="w-24 h-24 bg-white rounded-2xl shadow-md flex items-center justify-center">
              <svg viewBox="0 0 60 25" className="w-16 h-auto" fill="#635BFF">
                <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.02 1.04-.06 1.48zm-3.67-3.07c0-1.76-.86-2.94-2.3-2.94-1.38 0-2.46 1.18-2.63 2.94h4.93zM41.24 20.6V5.6l4.14-.88v15.88h-4.14zm0-17.7l4.14-.88v3.14l-4.14.88V2.9zM30.75 20.6V5.3l4.14-.88V5c.56-.42 1.42-.8 2.63-.8 1.08 0 1.76.24 2.4.56l-.84 3.56a3.17 3.17 0 0 0-1.56-.4c-1.06 0-2.24.46-2.63 1.16v11.52h-4.14zM25.54 7.02v9.14c0 1.12.52 1.46 1.36 1.46.52 0 1.08-.1 1.38-.2l.22 3.44c-.54.18-1.52.44-2.94.44-3.1 0-4.14-1.8-4.14-4.66V7.02h-1.94V3.68h1.94V.52l4.12-.88v4.04h2.76v3.34h-2.76zM12.18 16.76c0-2.26 1.68-3.12 4.14-3.5l2.62-.4V12c0-.96-.58-1.56-1.88-1.56-1.38 0-3.06.44-4.3 1.04V8.04a14.1 14.1 0 0 1 5.04-.94c3.6 0 5.32 1.78 5.32 5.56v7.94h-3.68l-.24-1.02c-.86.74-2.02 1.22-3.5 1.22-2.28 0-3.52-1.48-3.52-4.04zm6.76-1.14v-1.62l-1.5.22c-.84.12-1.26.56-1.26 1.36 0 .78.38 1.18 1.02 1.18.7 0 1.38-.34 1.74-1.14zM0 10.6c0-5.3 3.34-7.52 7.08-7.52 1.56 0 2.86.36 3.76.78v4a6.62 6.62 0 0 0-3.46-.96c-2.22 0-3.24 1.42-3.24 3.66 0 2.52 1.32 3.86 3.48 3.86 1.36 0 2.44-.36 3.22-.84v3.84c-.86.48-2.3.88-4 .88C3.04 18.3 0 15.82 0 10.6z"/>
              </svg>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Propulsé par Stripe
            </h3>
            <p className="text-gray-600 mb-4">
              Stripe traite des milliards de dollars chaque année pour des millions d'entreprises dans le monde entier,
              incluant Amazon, Google, et Shopify. Vos données sont entre de bonnes mains.
            </p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Chiffrement 256-bit</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>PCI DSS Niveau 1</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Conformité RGPD</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-3xl p-8 md:p-10 border border-gray-100 shadow-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#FF6B35]/10 rounded-full px-4 py-2 mb-4">
            <HelpCircle className="w-5 h-5 text-[#FF6B35]" />
            <span className="text-sm font-medium text-[#FF6B35]">FAQ</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Questions fréquentes
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`border rounded-xl overflow-hidden transition-all ${
                expandedFaq === index ? 'border-[#FF6B35] bg-[#FF6B35]/5' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left"
              >
                <span className="font-medium text-gray-900">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    expandedFaq === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedFaq === index && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-900 rounded-3xl p-8 md:p-12 text-center text-white">
        <Building2 className="w-16 h-16 text-[#FF6B35] mx-auto mb-6" />
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          Prêt à recevoir vos paiements ?
        </h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          Configurez votre compte en quelques minutes et commencez à recevoir vos gains automatiquement.
        </p>
        <button
          onClick={() => setShowOnboarding(true)}
          className="inline-flex items-center gap-3 bg-[#FF6B35] hover:bg-[#e55a2b] text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl"
        >
          Commencer maintenant
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
