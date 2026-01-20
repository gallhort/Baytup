'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
  User,
  Calendar,
  MapPin,
  Phone,
  CreditCard,
  Shield,
  FileText,
  Upload,
  Check,
  AlertCircle,
  Home,
  Car,
  Building,
  Users,
  ChevronRight,
  Loader2,
  Save,
  Send
} from 'lucide-react';

interface HostApplication {
  _id: string;
  user: any;
  status: string;
  personalInfo: {
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    dateOfBirth: string;
    nationalIdNumber: string;
  };
  hostIntent: {
    propertyTypes: string[];
    vehicleTypes: string[];
    numberOfListings: number;
    experienceLevel: string;
    motivation: string;
  };
  bankingInfo: {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    rib: string;
    swift: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  documents: {
    nationalId?: {
      front?: { url: string; uploadedAt: string };
      back?: { url: string; uploadedAt: string };
    };
    proofOfAddress?: { url: string; uploadedAt: string };
    businessLicense?: { url: string; uploadedAt: string };
    taxId?: { document?: { url: string; uploadedAt: string } };
  };
  agreements: {
    termsAccepted: boolean;
    privacyAccepted: boolean;
    hostGuidelinesAccepted: boolean;
  };
  stepsCompleted: {
    personalInfo: boolean;
    hostIntent: boolean;
    documents: boolean;
    bankingInfo: boolean;
    emergencyContact: boolean;
    agreements: boolean;
  };
  completionPercentage: number;
  submittedAt?: string;
}

export default function HostApplicationPage() {
  const router = useRouter();
  const { state } = useApp();
  const t = useTranslation('host-application');
  const [application, setApplication] = useState<HostApplication | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // Steps with translations
  const steps = [
    { id: 'personalInfo', name: (t as any)?.steps?.personalInfo || 'Personal Information', icon: User },
    { id: 'hostIntent', name: (t as any)?.steps?.hostIntent || 'Host Intent', icon: Home },
    { id: 'documents', name: (t as any)?.steps?.documents || 'Documents', icon: FileText },
    { id: 'bankingInfo', name: (t as any)?.steps?.bankingInfo || 'Banking Information', icon: CreditCard },
    { id: 'emergencyContact', name: (t as any)?.steps?.emergencyContact || 'Emergency Contact', icon: Phone },
    { id: 'agreements', name: (t as any)?.steps?.agreements || 'Terms & Agreements', icon: Shield }
  ];

  // Property types with translations
  const propertyTypeOptions = [
    { value: 'apartment', label: (t as any)?.hostIntent?.propertyOptions?.apartment || 'Apartment' },
    { value: 'house', label: (t as any)?.hostIntent?.propertyOptions?.house || 'House' },
    { value: 'villa', label: (t as any)?.hostIntent?.propertyOptions?.villa || 'Villa' },
    { value: 'chalet', label: (t as any)?.hostIntent?.propertyOptions?.chalet || 'Chalet' },
    { value: 'guesthouse', label: (t as any)?.hostIntent?.propertyOptions?.guesthouse || 'Guesthouse' },
    { value: 'other', label: (t as any)?.hostIntent?.propertyOptions?.other || 'Other' }
  ];

  // Vehicle types with translations
  const vehicleTypeOptions = [
    { value: 'car', label: (t as any)?.hostIntent?.vehicleOptions?.car || 'Car' },
    { value: 'motorcycle', label: (t as any)?.hostIntent?.vehicleOptions?.motorcycle || 'Motorcycle' },
    { value: 'van', label: (t as any)?.hostIntent?.vehicleOptions?.van || 'Van' },
    { value: 'suv', label: (t as any)?.hostIntent?.vehicleOptions?.suv || 'SUV' },
    { value: 'bike', label: (t as any)?.hostIntent?.vehicleOptions?.bike || 'Bicycle' },
    { value: 'other', label: (t as any)?.hostIntent?.vehicleOptions?.other || 'Other' }
  ];

  // Form states for each step
  const [formData, setFormData] = useState({
    // Personal Info
    phone: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    dateOfBirth: '',
    nationalIdNumber: '',
    // Host Intent
    propertyTypes: [] as string[],
    vehicleTypes: [] as string[],
    numberOfListings: 1,
    experienceLevel: 'first_time',
    motivation: '',
    // Banking Info
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    rib: '',
    swift: '',
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    // Agreements
    termsAccepted: false,
    privacyAccepted: false,
    hostGuidelinesAccepted: false
  });

  useEffect(() => {
    if (!state.isAuthenticated) {
      toast.error((t as any)?.messages?.pleaseSignIn || 'Please sign in to access the host application');
      router.push('/login?redirect=/host-application');
      return;
    }
    fetchApplication();
  }, [state.isAuthenticated]);

  const fetchApplication = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const response = await axios.get(
        `${API_BASE_URL}/host-applications/my-application`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.status === 'success') {
        const app = response.data.data.application;
        setApplication(app);
        // Pre-fill form data
        setFormData({
          phone: app.personalInfo?.phone || '',
          street: app.personalInfo?.address?.street || '',
          city: app.personalInfo?.address?.city || '',
          state: app.personalInfo?.address?.state || '',
          postalCode: app.personalInfo?.address?.postalCode || '',
          dateOfBirth: app.personalInfo?.dateOfBirth?.split('T')[0] || '',
          nationalIdNumber: app.personalInfo?.nationalIdNumber || '',
          propertyTypes: app.hostIntent?.propertyTypes || [],
          vehicleTypes: app.hostIntent?.vehicleTypes || [],
          numberOfListings: app.hostIntent?.numberOfListings || 1,
          experienceLevel: app.hostIntent?.experienceLevel || 'first_time',
          motivation: app.hostIntent?.motivation || '',
          bankName: app.bankingInfo?.bankName || '',
          accountHolderName: app.bankingInfo?.accountHolderName || '',
          accountNumber: app.bankingInfo?.accountNumber || '',
          rib: app.bankingInfo?.rib || '',
          swift: app.bankingInfo?.swift || '',
          emergencyContactName: app.emergencyContact?.name || '',
          emergencyContactRelationship: app.emergencyContact?.relationship || '',
          emergencyContactPhone: app.emergencyContact?.phone || '',
          termsAccepted: app.agreements?.termsAccepted || false,
          privacyAccepted: app.agreements?.privacyAccepted || false,
          hostGuidelinesAccepted: app.agreements?.hostGuidelinesAccepted || false
        });
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        // No application exists, this is normal for first-time users
      } else {
        console.error('Error fetching application:', error);
        toast.error((t as any)?.messages?.failedToLoad || 'Failed to load application');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveStep = async () => {
    if (!application) {
      toast.error((t as any)?.messages?.pleaseWait || 'Please wait for application to load');
      return;
    }

    setIsSaving(true);
    const stepName = steps[currentStep].id;

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      let stepData = {};

      switch (stepName) {
        case 'personalInfo':
          stepData = {
            phone: formData.phone,
            address: {
              street: formData.street,
              city: formData.city,
              state: formData.state,
              postalCode: formData.postalCode,
              country: 'Algeria'
            },
            dateOfBirth: formData.dateOfBirth,
            nationalIdNumber: formData.nationalIdNumber
          };
          break;

        case 'hostIntent':
          stepData = {
            propertyTypes: formData.propertyTypes,
            vehicleTypes: formData.vehicleTypes,
            numberOfListings: formData.numberOfListings,
            experienceLevel: formData.experienceLevel,
            motivation: formData.motivation
          };
          break;

        case 'bankingInfo':
          stepData = {
            bankName: formData.bankName,
            accountHolderName: formData.accountHolderName,
            accountNumber: formData.accountNumber,
            rib: formData.rib,
            swift: formData.swift
          };
          break;

        case 'emergencyContact':
          stepData = {
            name: formData.emergencyContactName,
            relationship: formData.emergencyContactRelationship,
            phone: formData.emergencyContactPhone
          };
          break;

        case 'agreements':
          stepData = {
            termsAccepted: formData.termsAccepted,
            privacyAccepted: formData.privacyAccepted,
            hostGuidelinesAccepted: formData.hostGuidelinesAccepted
          };
          break;
      }

      const response = await axios.put(
        `${API_BASE_URL}/host-applications/${application._id}/step/${stepName}`,
        stepData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success(`${steps[currentStep].name} ${(t as any)?.messages?.stepSaved || 'saved successfully'}`);
        setApplication(response.data.data.application);
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1);
        }
      }
    } catch (error: any) {
      console.error('Error saving step:', error);
      toast.error(error.response?.data?.message || (t as any)?.messages?.failedToSave || 'Failed to save information');
    } finally {
      setIsSaving(false);
    }
  };

  const uploadDocument = async (documentType: string, file: File) => {
    if (!application) return;

    setUploadingDoc(documentType);

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const formData = new FormData();
      formData.append('document', file);

      const response = await axios.post(
        `${API_BASE_URL}/host-applications/${application._id}/documents/${documentType}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success((t as any)?.messages?.documentUploaded || 'Document uploaded successfully');
        setApplication(response.data.data.application);
      }
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error((t as any)?.messages?.failedToUpload || 'Failed to upload document');
    } finally {
      setUploadingDoc(null);
    }
  };

  const submitApplication = async () => {
    if (!application) return;

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const response = await axios.post(
        `${API_BASE_URL}/host-applications/${application._id}/submit`,
        {},
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.status === 'success') {
        toast.success((t as any)?.messages?.applicationSubmitted || 'Application submitted successfully! We will review it and get back to you soon.');
        router.push('/');
      }
    } catch (error: any) {
      console.error('Error submitting application:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error((t as any)?.messages?.failedToSubmit || 'Failed to submit application');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePropertyTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      propertyTypes: prev.propertyTypes.includes(type)
        ? prev.propertyTypes.filter(t => t !== type)
        : [...prev.propertyTypes, type]
    }));
  };

  const handleVehicleTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      vehicleTypes: prev.vehicleTypes.includes(type)
        ? prev.vehicleTypes.filter(t => t !== type)
        : [...prev.vehicleTypes, type]
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35] mx-auto" />
          <p className="mt-4 text-gray-600">{(t as any)?.messages?.loading || 'Loading application...'}</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">{(t as any)?.noApplication?.title || 'Start Your Host Application'}</h1>
            <p className="text-gray-600 mb-8">
              {(t as any)?.noApplication?.description || "You haven't started a host application yet. Click below to begin your journey as a Baytup host."}
            </p>
            <button
              onClick={() => router.push('/become-host')}
              className="bg-[#FF6B35] text-white px-8 py-3 rounded-lg hover:bg-[#ff8255] transition-colors"
            >
              {(t as any)?.noApplication?.startButton || 'Start Application'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{(t as any)?.header?.title || 'Host Application'}</h1>
            <p className="text-gray-600">{(t as any)?.header?.subtitle || 'Complete all steps to submit your application'}</p>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-700">
                {(t as any)?.header?.progress || 'Progress'}: {application.completionPercentage}%
              </span>
              <span className="text-sm text-gray-500">
                {(t as any)?.header?.step || 'Step'} {currentStep + 1} of {steps.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#FF6B35] h-2 rounded-full transition-all duration-300"
                style={{ width: `${application.completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Steps Navigation */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = application.stepsCompleted[step.id as keyof typeof application.stepsCompleted];
                const isCurrent = index === currentStep;

                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(index)}
                    className={`p-4 rounded-lg text-center transition-colors ${
                      isCurrent
                        ? 'bg-[#FF6B35] text-white'
                        : isCompleted
                        ? 'bg-green-50 text-green-600'
                        : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    <Icon className="h-6 w-6 mx-auto mb-2" />
                    <span className="text-xs font-medium">{step.name}</span>
                    {isCompleted && (
                      <Check className="h-4 w-4 mx-auto mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            {currentStep === 0 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">{(t as any)?.personalInfo?.title || 'Personal Information'}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {(t as any)?.personalInfo?.phone || 'Phone Number'} {(t as any)?.required || '*'}
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      placeholder={(t as any)?.personalInfo?.phonePlaceholder || '+213 XXX XXX XXX'}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {(t as any)?.personalInfo?.dateOfBirth || 'Date of Birth'} {(t as any)?.required || '*'}
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {(t as any)?.personalInfo?.nationalIdNumber || 'National ID Number'} {(t as any)?.required || '*'}
                    </label>
                    <input
                      type="text"
                      value={formData.nationalIdNumber}
                      onChange={(e) => setFormData({ ...formData, nationalIdNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      placeholder={(t as any)?.personalInfo?.nationalIdPlaceholder || 'Enter your national ID number'}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {(t as any)?.personalInfo?.city || 'City'} {(t as any)?.required || '*'}
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      placeholder={(t as any)?.personalInfo?.cityPlaceholder || 'Enter your city'}
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {(t as any)?.personalInfo?.street || 'Street Address'}
                    </label>
                    <input
                      type="text"
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      placeholder={(t as any)?.personalInfo?.streetPlaceholder || 'Enter your street address'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {(t as any)?.personalInfo?.state || 'State/Province'}
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      placeholder={(t as any)?.personalInfo?.statePlaceholder || 'Enter your state or province'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {(t as any)?.personalInfo?.postalCode || 'Postal Code'}
                    </label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      placeholder={(t as any)?.personalInfo?.postalCodePlaceholder || 'Enter postal code'}
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">{(t as any)?.hostIntent?.title || 'Host Intent'}</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any)?.hostIntent?.propertyTypes || 'What type of properties will you list?'} {(t as any)?.required || '*'}
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {propertyTypeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handlePropertyTypeToggle(option.value)}
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          formData.propertyTypes.includes(option.value)
                            ? 'border-[#FF6B35] bg-orange-50 text-[#FF6B35]'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <Home className="h-5 w-5 mx-auto mb-1" />
                        <span className="text-sm">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any)?.hostIntent?.vehicleTypes || 'What type of vehicles will you list?'}
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {vehicleTypeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleVehicleTypeToggle(option.value)}
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          formData.vehicleTypes.includes(option.value)
                            ? 'border-[#FF6B35] bg-orange-50 text-[#FF6B35]'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <Car className="h-5 w-5 mx-auto mb-1" />
                        <span className="text-sm">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {(t as any)?.hostIntent?.numberOfListings || 'How many listings do you plan to create?'} {(t as any)?.required || '*'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.numberOfListings}
                      onChange={(e) => setFormData({ ...formData, numberOfListings: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {(t as any)?.hostIntent?.experienceLevel || 'Experience Level'} {(t as any)?.required || '*'}
                    </label>
                    <select
                      value={formData.experienceLevel}
                      onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      required
                    >
                      <option value="first_time">{(t as any)?.hostIntent?.experienceLevels?.first_time || 'First Time Host'}</option>
                      <option value="experienced">{(t as any)?.hostIntent?.experienceLevels?.experienced || 'Experienced Host'}</option>
                      <option value="professional">{(t as any)?.hostIntent?.experienceLevels?.professional || 'Professional Property Manager'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any)?.hostIntent?.motivation || 'Why do you want to become a host?'}
                  </label>
                  <textarea
                    value={formData.motivation}
                    onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                    rows={4}
                    maxLength={500}
                    placeholder={(t as any)?.hostIntent?.motivationPlaceholder || 'Tell us about your motivation for becoming a host...'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.motivation.length}/500 {(t as any)?.hostIntent?.characterCount || 'characters'}
                  </p>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">{(t as any)?.documents?.title || 'Documents'}</h2>

                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <h3 className="font-medium mb-2">{(t as any)?.documents?.nationalIdFront || 'National ID (Front)'} {(t as any)?.required || '*'}</h3>
                    {application.documents?.nationalId?.front?.url ? (
                      <div className="flex items-center justify-between">
                        <span className="text-green-600 flex items-center">
                          <Check className="h-4 w-4 mr-2" />
                          {(t as any)?.documents?.uploaded || 'Document uploaded'}
                        </span>
                        <label className="cursor-pointer text-[#FF6B35] hover:text-[#ff8255]">
                          {(t as any)?.documents?.replace || 'Replace'}
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                uploadDocument('nationalIdFront', e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center">
                        {uploadingDoc === 'nationalIdFront' ? (
                          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600">{(t as any)?.documents?.clickToUpload || 'Click to upload'}</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              uploadDocument('nationalIdFront', e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <h3 className="font-medium mb-2">{(t as any)?.documents?.nationalIdBack || 'National ID (Back)'} {(t as any)?.required || '*'}</h3>
                    {application.documents?.nationalId?.back?.url ? (
                      <div className="flex items-center justify-between">
                        <span className="text-green-600 flex items-center">
                          <Check className="h-4 w-4 mr-2" />
                          {(t as any)?.documents?.uploaded || 'Document uploaded'}
                        </span>
                        <label className="cursor-pointer text-[#FF6B35] hover:text-[#ff8255]">
                          {(t as any)?.documents?.replace || 'Replace'}
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                uploadDocument('nationalIdBack', e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center">
                        {uploadingDoc === 'nationalIdBack' ? (
                          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600">{(t as any)?.documents?.clickToUpload || 'Click to upload'}</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              uploadDocument('nationalIdBack', e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <h3 className="font-medium mb-2">{(t as any)?.documents?.proofOfAddress || 'Proof of Address (Optional)'}</h3>
                    {application.documents?.proofOfAddress?.url ? (
                      <div className="flex items-center justify-between">
                        <span className="text-green-600 flex items-center">
                          <Check className="h-4 w-4 mr-2" />
                          {(t as any)?.documents?.uploaded || 'Document uploaded'}
                        </span>
                        <label className="cursor-pointer text-[#FF6B35] hover:text-[#ff8255]">
                          {(t as any)?.documents?.replace || 'Replace'}
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                uploadDocument('proofOfAddress', e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center">
                        {uploadingDoc === 'proofOfAddress' ? (
                          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600">{(t as any)?.documents?.clickToUploadOptional || 'Click to upload (optional)'}</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              uploadDocument('proofOfAddress', e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        {(t as any)?.documents?.infoMessage || 'All documents must be clear and readable. We accept images (JPG, PNG) and PDF files.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">{(t as any)?.bankingInfo?.title || 'Banking Information'}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {(t as any)?.bankingInfo?.bankName || 'Bank Name'} {(t as any)?.required || '*'}
                    </label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      placeholder={(t as any)?.bankingInfo?.bankNamePlaceholder || 'Enter your bank name'}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {(t as any)?.bankingInfo?.accountHolderName || 'Account Holder Name'} {(t as any)?.required || '*'}
                    </label>
                    <input
                      type="text"
                      value={formData.accountHolderName}
                      onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      placeholder={(t as any)?.bankingInfo?.accountHolderPlaceholder || 'Full name as on bank account'}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {(t as any)?.bankingInfo?.accountNumber || 'Account Number'} {(t as any)?.required || '*'}
                    </label>
                    <input
                      type="text"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      placeholder={(t as any)?.bankingInfo?.accountNumberPlaceholder || 'Enter account number'}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {(t as any)?.bankingInfo?.rib || 'RIB (Bank ID)'} {(t as any)?.required || '*'}
                    </label>
                    <input
                      type="text"
                      value={formData.rib}
                      onChange={(e) => setFormData({ ...formData, rib: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      placeholder={(t as any)?.bankingInfo?.ribPlaceholder || 'Enter RIB number'}
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {(t as any)?.bankingInfo?.swift || 'SWIFT Code (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={formData.swift}
                      onChange={(e) => setFormData({ ...formData, swift: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      placeholder={(t as any)?.bankingInfo?.swiftPlaceholder || 'Enter SWIFT code (for international transfers)'}
                    />
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        {(t as any)?.bankingInfo?.securityMessage || 'Your banking information is encrypted and secure. We will use this information to transfer your earnings.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">{(t as any)?.emergencyContact?.title || 'Emergency Contact'}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {(t as any)?.emergencyContact?.name || 'Emergency Contact Name'} {(t as any)?.required || '*'}
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      placeholder={(t as any)?.emergencyContact?.namePlaceholder || 'Full name of emergency contact'}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {(t as any)?.emergencyContact?.relationship || 'Relationship'} {(t as any)?.required || '*'}
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyContactRelationship}
                      onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      placeholder={(t as any)?.emergencyContact?.relationshipPlaceholder || 'e.g., Spouse, Parent, Sibling'}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {(t as any)?.emergencyContact?.phone || 'Emergency Contact Phone'} {(t as any)?.required || '*'}
                    </label>
                    <input
                      type="tel"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      placeholder={(t as any)?.emergencyContact?.phonePlaceholder || '+213 XXX XXX XXX'}
                      required
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        {(t as any)?.emergencyContact?.confidentialityMessage || 'This information will only be used in case of emergencies and will be kept confidential.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">{(t as any)?.agreements?.title || 'Terms & Agreements'}</h2>

                <div className="space-y-4">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.termsAccepted}
                      onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                      className="mt-1 mr-3 h-4 w-4 text-[#FF6B35] focus:ring-[#FF6B35] border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">
                        {(t as any)?.agreements?.terms?.title || 'I accept the Terms and Conditions'} {(t as any)?.required || '*'}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        {(t as any)?.agreements?.terms?.description || "By checking this box, you agree to Baytup's Terms of Service and acknowledge that you have read and understood them."}
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.privacyAccepted}
                      onChange={(e) => setFormData({ ...formData, privacyAccepted: e.target.checked })}
                      className="mt-1 mr-3 h-4 w-4 text-[#FF6B35] focus:ring-[#FF6B35] border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">
                        {(t as any)?.agreements?.privacy?.title || 'I accept the Privacy Policy'} {(t as any)?.required || '*'}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        {(t as any)?.agreements?.privacy?.description || "By checking this box, you agree to Baytup's Privacy Policy and consent to the collection and use of your information as described."}
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hostGuidelinesAccepted}
                      onChange={(e) => setFormData({ ...formData, hostGuidelinesAccepted: e.target.checked })}
                      className="mt-1 mr-3 h-4 w-4 text-[#FF6B35] focus:ring-[#FF6B35] border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">
                        {(t as any)?.agreements?.guidelines?.title || 'I accept the Host Guidelines'} {(t as any)?.required || '*'}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        {(t as any)?.agreements?.guidelines?.description || "By checking this box, you agree to follow Baytup's Host Guidelines and maintain high standards of hospitality."}
                      </p>
                    </div>
                  </label>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="ml-3">
                      <p className="text-sm text-green-700">
                        {(t as any)?.agreements?.reviewMessage || 'Once you accept all agreements and submit your application, our team will review it within 2-3 business days.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <button
              onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
              disabled={currentStep === 0}
              className={`px-6 py-2 rounded-lg transition-colors ${
                currentStep === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {(t as any)?.actions?.previous || 'Previous'}
            </button>

            <div className="space-x-4">
              <button
                onClick={saveStep}
                disabled={isSaving}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Save className="h-5 w-5 inline mr-2" />
                    {(t as any)?.actions?.saveProgress || 'Save Progress'}
                  </>
                )}
              </button>

              {currentStep === steps.length - 1 && application.completionPercentage === 100 && (
                <button
                  onClick={submitApplication}
                  disabled={isSubmitting || !formData.termsAccepted || !formData.privacyAccepted || !formData.hostGuidelinesAccepted}
                  className="px-6 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#ff8255] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-5 w-5 inline mr-2" />
                      {(t as any)?.actions?.submitApplication || 'Submit Application'}
                    </>
                  )}
                </button>
              )}

              {currentStep < steps.length - 1 && (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="px-6 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#ff8255] transition-colors"
                >
                  {(t as any)?.actions?.next || 'Next'}
                  <ChevronRight className="h-5 w-5 inline ml-2" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
