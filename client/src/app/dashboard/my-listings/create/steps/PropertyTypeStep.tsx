'use client';

import { Building2, Home, Castle, LayoutGrid, DoorOpen, Landmark, Hotel, BedDouble } from 'lucide-react';
import VisualCard from '../components/VisualCard';
import { CreateListingFormData, STAY_TYPES } from '../types';
import { ReactNode } from 'react';

const STAY_ICONS: Record<string, ReactNode> = {
  apartment: <Building2 className="w-8 h-8 text-[#FF6B35]" />,
  house: <Home className="w-8 h-8 text-[#FF6B35]" />,
  villa: <Castle className="w-8 h-8 text-[#FF6B35]" />,
  studio: <LayoutGrid className="w-8 h-8 text-[#FF6B35]" />,
  room: <DoorOpen className="w-8 h-8 text-[#FF6B35]" />,
  riad: <Landmark className="w-8 h-8 text-[#FF6B35]" />,
  guesthouse: <Hotel className="w-8 h-8 text-[#FF6B35]" />,
  hotel_room: <BedDouble className="w-8 h-8 text-[#FF6B35]" />,
};

interface Props {
  formData: CreateListingFormData;
  onUpdate: (subcategory: string) => void;
  t: any;
}

export default function PropertyTypeStep({ formData, onUpdate, t }: Props) {
  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
        {t.propertyType?.title || 'What type of property?'}
      </h1>
      <p className="text-lg text-gray-500 mb-8">
        {t.propertyType?.subtitle || 'Select the option that best describes your property.'}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {STAY_TYPES.map(type => (
          <VisualCard
            key={type}
            icon={STAY_ICONS[type] || <Home className="w-8 h-8 text-[#FF6B35]" />}
            label={t.propertyType?.types?.[type] || type}
            selected={formData.subcategory === type}
            onClick={() => onUpdate(type)}
          />
        ))}
      </div>
    </div>
  );
}
