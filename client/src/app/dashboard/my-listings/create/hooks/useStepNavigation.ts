'use client';

import { useState, useMemo, useCallback } from 'react';
import { CreateListingFormData } from '../types';

export interface StepDef {
  id: string;
  phase: number;
}

const STAY_STEPS: StepDef[] = [
  { id: 'category', phase: 1 },
  { id: 'property-type', phase: 1 },
  { id: 'location', phase: 1 },
  { id: 'basics-stay', phase: 1 },
  { id: 'amenities', phase: 1 },
  { id: 'photos', phase: 2 },
  { id: 'title', phase: 2 },
  { id: 'description', phase: 2 },
  { id: 'pricing', phase: 3 },
  { id: 'availability', phase: 3 },
  { id: 'rules', phase: 3 },
  { id: 'review', phase: 3 },
];

const VEHICLE_STEPS: StepDef[] = [
  { id: 'category', phase: 1 },
  { id: 'vehicle-type', phase: 1 },
  { id: 'location', phase: 1 },
  { id: 'basics-vehicle', phase: 1 },
  { id: 'vehicle-features', phase: 1 },
  { id: 'photos', phase: 2 },
  { id: 'title', phase: 2 },
  { id: 'description', phase: 2 },
  { id: 'pricing', phase: 3 },
  { id: 'availability', phase: 3 },
  { id: 'rules', phase: 3 },
  { id: 'review', phase: 3 },
];

// Before a category is chosen we show only the first step
const INITIAL_STEPS: StepDef[] = [
  { id: 'category', phase: 1 },
];

export function useStepNavigation(formData: CreateListingFormData) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const steps = useMemo(() => {
    if (formData.category === 'stay') return STAY_STEPS;
    if (formData.category === 'vehicle') return VEHICLE_STEPS;
    return INITIAL_STEPS;
  }, [formData.category]);

  const currentStep = steps[currentIndex] || steps[0];
  const totalSteps = steps.length;
  const currentPhase = currentStep.phase;
  const progress = ((currentIndex + 1) / totalSteps) * 100;

  const canGoNext = currentIndex < totalSteps - 1;
  const canGoBack = currentIndex > 0;
  const isLastStep = currentIndex === totalSteps - 1;

  const goNext = useCallback(() => {
    if (canGoNext) setCurrentIndex(i => i + 1);
  }, [canGoNext]);

  const goBack = useCallback(() => {
    if (canGoBack) setCurrentIndex(i => i - 1);
  }, [canGoBack]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < totalSteps) setCurrentIndex(index);
  }, [totalSteps]);

  // When category changes from '' to something, we stay at index 0
  // The step list just expanded so index 0 is still 'category'

  return {
    steps,
    currentIndex,
    currentStep,
    totalSteps,
    currentPhase,
    progress,
    canGoNext,
    canGoBack,
    isLastStep,
    goNext,
    goBack,
    goToStep,
  };
}
