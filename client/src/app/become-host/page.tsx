'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useFeature } from '@/contexts/FeatureFlagsContext';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function BecomeHostPage() {
  const router = useRouter();
  const { state } = useApp();
  const t = useTranslation('become-host');
  const vehiclesEnabled = useFeature('vehiclesEnabled');
  const [isCreatingApplication, setIsCreatingApplication] = useState(false);

  const createHostApplication = async () => {
    try {
      setIsCreatingApplication(true);

      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      // Try to create a new application with empty data
      // The server will handle default values
      const response = await axios.post(
        `${API_BASE_URL}/host-applications`,
        {
          // Send some basic initial data if available
          propertyTypes: [],
          vehicleTypes: [],
          numberOfListings: 1,
          experienceLevel: 'first_time'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        if (response.data.message === 'Application already exists') {
          toast((t as any)?.messages?.alreadyHaveApplication || 'You already have a host application in progress', {
            icon: 'ℹ️',
            duration: 4000
          });
        } else {
          toast.success((t as any)?.messages?.applicationCreated || 'Host application created! Redirecting to application form...');
        }
        // Redirect to host application form
        router.push('/host-application');
      }
    } catch (error: any) {
      console.error('Error creating host application:', error);
      if (error.response?.status === 401) {
        toast.error((t as any)?.messages?.pleaseSignIn || 'Please sign in to continue');
        router.push('/login?redirect=/become-host');
      } else if (error.response?.status === 400 && error.response?.data?.message?.includes('already')) {
        // User already has an application
        toast((t as any)?.messages?.redirectingToExisting || 'Redirecting to your existing application...', {
          icon: 'ℹ️',
          duration: 3000
        });
        router.push('/host-application');
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error((t as any)?.messages?.failedToCreate || 'Failed to create host application. Please try again.');
      }
    } finally {
      setIsCreatingApplication(false);
    }
  };

  const handleStartHosting = () => {
    // Check if user is authenticated
    if (!state.isAuthenticated || !state.user) {
      // Show toast message
      toast.error((t as any)?.messages?.signInRequired || 'Please create an account or sign in to start hosting');
      // Redirect to register page with return URL
      router.push('/register?redirect=/become-host');
    } else {
      // User is logged in, proceed with host application
      toast.success((t as any)?.messages?.welcomeHost || 'Welcome! Let\'s get you set up as a host');
      // Create host application through API
      createHostApplication();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {(t as any)?.hero?.title || 'Become a Host'}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {vehiclesEnabled
              ? ((t as any)?.hero?.subtitle || 'Share your space or vehicle and start earning with Algeria\'s leading sharing platform')
              : ((t as any)?.hero?.subtitleStayOnly || 'Share your space and start earning with Algeria\'s leading rental platform')
            }
          </p>
        </div>

        {/* Benefits Grid */}
        <div className={`grid grid-cols-1 ${vehiclesEnabled ? 'md:grid-cols-3' : 'md:grid-cols-2 max-w-3xl mx-auto'} gap-8 mb-16`}>
          <div className="bg-white p-8 rounded-xl shadow-sm text-center">
            <div className="text-4xl mb-4">🏠</div>
            <h3 className="text-xl font-semibold mb-4">{(t as any)?.benefits?.shareSpace?.title || 'Share Your Space'}</h3>
            <p className="text-gray-600">
              {(t as any)?.benefits?.shareSpace?.description || 'Rent out your home, apartment, or room to travelers from around the world'}
            </p>
          </div>

          {vehiclesEnabled && (
            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <div className="text-4xl mb-4">🚗</div>
              <h3 className="text-xl font-semibold mb-4">{(t as any)?.benefits?.shareVehicle?.title || 'Share Your Vehicle'}</h3>
              <p className="text-gray-600">
                {(t as any)?.benefits?.shareVehicle?.description || 'Let others rent your car when you\'re not using it and earn extra income'}
              </p>
            </div>
          )}

          <div className="bg-white p-8 rounded-xl shadow-sm text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-4">{(t as any)?.benefits?.earnMoney?.title || 'Earn Money'}</h3>
            <p className="text-gray-600">
              {(t as any)?.benefits?.earnMoney?.description || 'Set your own prices and earn money from your unused assets'}
            </p>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-white rounded-2xl p-12 mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">{(t as any)?.howItWorks?.title || 'How It Works'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#FF6B35] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h4 className="font-semibold mb-2">{(t as any)?.howItWorks?.step1?.title || 'Sign Up'}</h4>
              <p className="text-sm text-gray-600">{(t as any)?.howItWorks?.step1?.description || 'Create your host account in minutes'}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#FF6B35] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h4 className="font-semibold mb-2">{(t as any)?.howItWorks?.step2?.title || 'List Your Property'}</h4>
              <p className="text-sm text-gray-600">
                {vehiclesEnabled
                  ? ((t as any)?.howItWorks?.step2?.description || 'Add photos and details about your space or vehicle')
                  : ((t as any)?.howItWorks?.step2?.descriptionStayOnly || 'Add photos and details about your space')
                }
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#FF6B35] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h4 className="font-semibold mb-2">{(t as any)?.howItWorks?.step3?.title || 'Get Bookings'}</h4>
              <p className="text-sm text-gray-600">{(t as any)?.howItWorks?.step3?.description || 'Receive and manage booking requests'}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#FF6B35] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                4
              </div>
              <h4 className="font-semibold mb-2">{(t as any)?.howItWorks?.step4?.title || 'Earn Money'}</h4>
              <p className="text-sm text-gray-600">{(t as any)?.howItWorks?.step4?.description || 'Get paid securely through our platform'}</p>
            </div>
          </div>
        </div>

        {/* Why Host with Baytup */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">{(t as any)?.whyHost?.title || 'Why Host with Baytup?'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start space-x-4">
              <div className="text-2xl">✅</div>
              <div>
                <h4 className="font-semibold mb-2">{(t as any)?.whyHost?.securePayments?.title || 'Secure Payments'}</h4>
                <p className="text-gray-600">{(t as any)?.whyHost?.securePayments?.description || 'Get paid on time, every time, with our secure payment system'}</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="text-2xl">✅</div>
              <div>
                <h4 className="font-semibold mb-2">{(t as any)?.whyHost?.support?.title || '24/7 Support'}</h4>
                <p className="text-gray-600">{(t as any)?.whyHost?.support?.description || 'Our dedicated support team is always here to help you'}</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="text-2xl">✅</div>
              <div>
                <h4 className="font-semibold mb-2">{(t as any)?.whyHost?.protection?.title || 'Host Protection'}</h4>
                <p className="text-gray-600">{(t as any)?.whyHost?.protection?.description || 'Comprehensive insurance coverage for peace of mind'}</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="text-2xl">✅</div>
              <div>
                <h4 className="font-semibold mb-2">{(t as any)?.whyHost?.flexible?.title || 'Flexible Hosting'}</h4>
                <p className="text-gray-600">{(t as any)?.whyHost?.flexible?.description || 'You\'re in control - set your own prices and availability'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-[#FF6B35] text-white rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">{(t as any)?.cta?.title || 'Ready to Get Started?'}</h2>
          <p className="text-xl opacity-90 mb-8">
            {(t as any)?.cta?.subtitle || 'Join thousands of hosts already earning on Baytup'}
          </p>
          <button
            onClick={handleStartHosting}
            disabled={isCreatingApplication}
            className="bg-white text-[#FF6B35] px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingApplication ? ((t as any)?.cta?.processing || 'Processing...') : ((t as any)?.cta?.button || 'Start Hosting Today')}
          </button>
          {!state.isAuthenticated && (
            <p className="text-sm mt-4 opacity-90">
              {(t as any)?.cta?.accountNote || 'You\'ll need to create an account to start hosting'}
            </p>
          )}
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center mb-12">{(t as any)?.faq?.title || 'Frequently Asked Questions'}</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-lg p-6">
              <h4 className="font-semibold mb-2">{(t as any)?.faq?.q1?.question || 'How much can I earn as a host?'}</h4>
              <p className="text-gray-600">
                {(t as any)?.faq?.q1?.answer || 'Your earnings depend on your property type, location, and availability. Many hosts earn a significant supplemental income.'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-6">
              <h4 className="font-semibold mb-2">{(t as any)?.faq?.q2?.question || 'Is my property protected?'}</h4>
              <p className="text-gray-600">
                {(t as any)?.faq?.q2?.answer || 'Yes! We provide host protection insurance that covers property damage and liability.'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-6">
              <h4 className="font-semibold mb-2">{(t as any)?.faq?.q3?.question || 'How do I get paid?'}</h4>
              <p className="text-gray-600">
                {(t as any)?.faq?.q3?.answer || 'Payments are processed securely through our platform and transferred to your bank account after each successful booking.'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-6">
              <h4 className="font-semibold mb-2">{(t as any)?.faq?.q4?.question || 'Can I choose my guests?'}</h4>
              <p className="text-gray-600">
                {(t as any)?.faq?.q4?.answer || 'Yes! You can review booking requests and guest profiles before accepting any reservation.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
