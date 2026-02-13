'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';

import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useFeature } from '@/contexts/FeatureFlagsContext';

import { useCreateListingForm } from './hooks/useCreateListingForm';
import { useStepNavigation } from './hooks/useStepNavigation';
import { useStepValidation } from './hooks/useStepValidation';

import CreateListingLayout from './CreateListingLayout';
import StepTransition from './components/StepTransition';
import GuestUpgradePrompt from './components/GuestUpgradePrompt';

// Steps
import WelcomeCategoryStep from './steps/WelcomeCategoryStep';
import PropertyTypeStep from './steps/PropertyTypeStep';
import VehicleTypeStep from './steps/VehicleTypeStep';
import LocationStep from './steps/LocationStep';
import BasicsStayStep from './steps/BasicsStayStep';
import BasicsVehicleStep from './steps/BasicsVehicleStep';
import AmenitiesStep from './steps/AmenitiesStep';
import VehicleFeaturesStep from './steps/VehicleFeaturesStep';
import PhotosStep from './steps/PhotosStep';
import TitleStep from './steps/TitleStep';
import DescriptionStep from './steps/DescriptionStep';
import PricingStep from './steps/PricingStep';
import AvailabilityStep from './steps/AvailabilityStep';
import RulesStep from './steps/RulesStep';
import ReviewStep from './steps/ReviewStep';

export default function CreateListingPage() {
  const router = useRouter();
  const { state } = useApp();
  const t = useTranslation('create-wizard') as any;
  const vehiclesEnabled = useFeature('vehiclesEnabled');
  const [saving, setSaving] = useState(false);

  const {
    formData, setFormData,
    enableAltCurrency, setEnableAltCurrency,
    clearDraft, hasDraft,
  } = useCreateListingForm();

  const {
    currentIndex, currentStep, totalSteps, currentPhase,
    progress, canGoBack, isLastStep,
    goNext, goBack, goToStep,
  } = useStepNavigation(formData);

  const { validateStep, isStepValid } = useStepValidation(formData);

  // Guard: guests cannot create listings
  if (state.user && state.user.role === 'guest') {
    return <GuestUpgradePrompt t={t} />;
  }

  const handleNext = () => {
    const error = validateStep(currentStep.id);
    if (error) {
      toast.error(t.validation?.[error] || error);
      return;
    }
    goNext();
  };

  const handleCategorySelect = (category: 'stay' | 'vehicle') => {
    setFormData(prev => ({
      ...prev,
      category,
      subcategory: '',
      pricing: {
        ...prev.pricing,
        pricingType: category === 'stay' ? 'per_night' : 'per_day',
      },
      stayDetails: { ...prev.stayDetails, stayType: '' },
      vehicleDetails: { ...prev.vehicleDetails, vehicleType: '' },
    }));
    // Auto-advance after selection
    setTimeout(goNext, 200);
  };

  const handleSubcategorySelect = (subcategory: string) => {
    if (formData.category === 'stay') {
      setFormData(prev => ({
        ...prev,
        subcategory,
        stayDetails: { ...prev.stayDetails, stayType: subcategory },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        subcategory,
        vehicleDetails: { ...prev.vehicleDetails, vehicleType: subcategory },
      }));
    }
  };

  const handleSubmit = async (status: 'active' | 'draft') => {
    // Final validation
    if (!formData.title || !formData.description || !formData.category) {
      toast.error(t.validation?.selectCategory || 'Missing required fields');
      return;
    }
    if (formData.pricing.basePrice <= 0) {
      toast.error(t.validation?.enterPrice || 'Enter a valid price');
      return;
    }
    if (formData.images.length === 0) {
      toast.error(t.validation?.atLeastOnePhoto || 'Upload at least one photo');
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('token');

      const payload: any = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        subcategory: formData.subcategory,
        address: formData.address,
        location: { type: 'Point', coordinates: formData.location.coordinates },
        pricing: formData.pricing,
        availability: formData.availability,
        rules: formData.rules,
        cancellationPolicy: formData.cancellationPolicy,
        images: formData.images,
        status,
      };

      // Only include category-specific details
      if (formData.category === 'stay') {
        const s = formData.stayDetails;
        const cleanStay: any = { amenities: s.amenities };
        if (s.stayType) cleanStay.stayType = s.stayType;
        if (s.bedrooms) cleanStay.bedrooms = s.bedrooms;
        if (s.bathrooms) cleanStay.bathrooms = s.bathrooms;
        if (s.area) cleanStay.area = s.area;
        if (s.floor !== undefined) cleanStay.floor = s.floor;
        if (s.furnished) cleanStay.furnished = s.furnished;
        payload.stayDetails = cleanStay;
      } else if (formData.category === 'vehicle') {
        const v = formData.vehicleDetails;
        const cleanVehicle: any = { features: v.features };
        if (v.vehicleType) cleanVehicle.vehicleType = v.vehicleType;
        if (v.make) cleanVehicle.make = v.make;
        if (v.model) cleanVehicle.model = v.model;
        if (v.year) cleanVehicle.year = v.year;
        if (v.transmission) cleanVehicle.transmission = v.transmission;
        if (v.fuelType) cleanVehicle.fuelType = v.fuelType;
        if (v.seats) cleanVehicle.seats = v.seats;
        payload.vehicleDetails = cleanVehicle;
      }

      // Remove alt currency fields if not enabled or not filled
      if (!enableAltCurrency || !payload.pricing.altBasePrice) {
        delete payload.pricing.altBasePrice;
        delete payload.pricing.altCurrency;
        delete payload.pricing.altCleaningFee;
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/listings`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      clearDraft();
      toast.success(
        status === 'active'
          ? (t.messages?.publishSuccess || 'Listing published!')
          : (t.messages?.draftSuccess || 'Draft saved!')
      );
      router.push('/dashboard/my-listings');
    } catch (error: any) {
      console.error('Create listing error:', error);
      toast.error(error.response?.data?.message || t.messages?.error || 'Failed to create listing');
    } finally {
      setSaving(false);
    }
  };

  const phaseLabels: { [key: number]: string } = {
    1: t.phases?.['1'] || 'Describe your property',
    2: t.phases?.['2'] || 'Make it stand out',
    3: t.phases?.['3'] || 'Finish and publish',
  };

  const renderStep = () => {
    switch (currentStep.id) {
      case 'category':
        return <WelcomeCategoryStep formData={formData} onUpdate={handleCategorySelect} t={t} vehiclesEnabled={vehiclesEnabled} />;
      case 'property-type':
        return <PropertyTypeStep formData={formData} onUpdate={handleSubcategorySelect} t={t} />;
      case 'vehicle-type':
        return <VehicleTypeStep formData={formData} onUpdate={handleSubcategorySelect} t={t} />;
      case 'location':
        return <LocationStep formData={formData} setFormData={setFormData} t={t} />;
      case 'basics-stay':
        return <BasicsStayStep formData={formData} setFormData={setFormData} t={t} />;
      case 'basics-vehicle':
        return <BasicsVehicleStep formData={formData} setFormData={setFormData} t={t} />;
      case 'amenities':
        return <AmenitiesStep formData={formData} setFormData={setFormData} t={t} />;
      case 'vehicle-features':
        return <VehicleFeaturesStep formData={formData} setFormData={setFormData} t={t} />;
      case 'photos':
        return <PhotosStep formData={formData} setFormData={setFormData} t={t} />;
      case 'title':
        return <TitleStep formData={formData} setFormData={setFormData} t={t} />;
      case 'description':
        return <DescriptionStep formData={formData} setFormData={setFormData} t={t} />;
      case 'pricing':
        return <PricingStep formData={formData} setFormData={setFormData} enableAltCurrency={enableAltCurrency} setEnableAltCurrency={setEnableAltCurrency} t={t} />;
      case 'availability':
        return <AvailabilityStep formData={formData} setFormData={setFormData} t={t} />;
      case 'rules':
        return <RulesStep formData={formData} setFormData={setFormData} t={t} />;
      case 'review':
        return <ReviewStep formData={formData} onPublish={() => handleSubmit('active')} onSaveDraft={() => handleSubmit('draft')} onGoToStep={goToStep} saving={saving} t={t} />;
      default:
        return null;
    }
  };

  return (
    <CreateListingLayout
      currentIndex={currentIndex}
      totalSteps={totalSteps}
      currentPhase={currentPhase}
      progress={progress}
      canGoBack={canGoBack}
      isLastStep={isLastStep}
      onBack={goBack}
      onNext={handleNext}
      onSaveDraft={() => handleSubmit('draft')}
      nextDisabled={!isStepValid(currentStep.id)}
      saving={saving}
      phaseLabels={phaseLabels}
      t={t}
      hasDraft={hasDraft()}
    >
      <StepTransition stepKey={currentStep.id}>
        {renderStep()}
      </StepTransition>
    </CreateListingLayout>
  );
}
