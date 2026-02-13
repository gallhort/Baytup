'use client';

import { useCallback } from 'react';
import { CreateListingFormData } from '../types';

export function useStepValidation(formData: CreateListingFormData) {
  const validateStep = useCallback((stepId: string): string | null => {
    switch (stepId) {
      case 'category':
        if (!formData.category) return 'selectCategory';
        return null;

      case 'property-type':
        if (!formData.subcategory) return 'selectType';
        return null;

      case 'vehicle-type':
        if (!formData.subcategory) return 'selectType';
        return null;

      case 'location':
        if (!formData.address.city || !formData.address.state) return 'selectCity';
        if (!formData.address.street) return 'enterStreet';
        if (formData.location.coordinates[0] === 0 && formData.location.coordinates[1] === 0)
          return 'placeMarker';
        return null;

      case 'basics-stay':
        if (formData.stayDetails.bedrooms < 1) return 'atLeastOneBedroom';
        if (formData.stayDetails.bathrooms < 1) return 'atLeastOneBathroom';
        return null;

      case 'basics-vehicle':
        if (!formData.vehicleDetails.make) return 'enterMake';
        if (!formData.vehicleDetails.model) return 'enterModel';
        if (!formData.vehicleDetails.transmission) return 'selectTransmission';
        if (!formData.vehicleDetails.fuelType) return 'selectFuelType';
        return null;

      case 'amenities':
      case 'vehicle-features':
        return null; // Optional

      case 'photos':
        if (formData.images.length === 0) return 'atLeastOnePhoto';
        return null;

      case 'title':
        if (!formData.title.trim()) return 'enterTitle';
        if (formData.title.length < 5) return 'titleTooShort';
        if (formData.title.length > 100) return 'titleTooLong';
        return null;

      case 'description':
        if (!formData.description.trim()) return 'enterDescription';
        if (formData.description.length < 20) return 'descriptionTooShort';
        if (formData.description.length > 2000) return 'descriptionTooLong';
        return null;

      case 'pricing':
        if (formData.pricing.basePrice <= 0) return 'enterPrice';
        return null;

      case 'availability':
      case 'rules':
        return null; // All have defaults

      case 'review':
        return null;

      default:
        return null;
    }
  }, [formData]);

  const isStepValid = useCallback((stepId: string): boolean => {
    return validateStep(stepId) === null;
  }, [validateStep]);

  return { validateStep, isStepValid };
}
