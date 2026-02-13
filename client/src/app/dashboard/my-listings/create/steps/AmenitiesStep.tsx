'use client';

import { ReactNode } from 'react';
import {
  Wifi, Car, Waves, Dumbbell, TreePine, Fence,
  ArrowUp, Shield, Snowflake, Flame, CookingPot, RectangleHorizontal,
  Tv, WashingMachine, Umbrella, Mountain
} from 'lucide-react';
import VisualToggle from '../components/VisualToggle';
import { CreateListingFormData, AMENITIES } from '../types';

const AMENITY_ICONS: Record<string, ReactNode> = {
  wifi: <Wifi className="w-5 h-5" />,
  parking: <Car className="w-5 h-5" />,
  pool: <Waves className="w-5 h-5" />,
  gym: <Dumbbell className="w-5 h-5" />,
  garden: <TreePine className="w-5 h-5" />,
  terrace: <Fence className="w-5 h-5" />,
  elevator: <ArrowUp className="w-5 h-5" />,
  security: <Shield className="w-5 h-5" />,
  ac: <Snowflake className="w-5 h-5" />,
  heating: <Flame className="w-5 h-5" />,
  kitchen: <CookingPot className="w-5 h-5" />,
  balcony: <RectangleHorizontal className="w-5 h-5" />,
  tv: <Tv className="w-5 h-5" />,
  washer: <WashingMachine className="w-5 h-5" />,
  beach_access: <Umbrella className="w-5 h-5" />,
  mountain_view: <Mountain className="w-5 h-5" />,
};

interface Props {
  formData: CreateListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<CreateListingFormData>>;
  t: any;
}

export default function AmenitiesStep({ formData, setFormData, t }: Props) {
  const toggle = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      stayDetails: {
        ...prev.stayDetails,
        amenities: prev.stayDetails.amenities.includes(amenity)
          ? prev.stayDetails.amenities.filter(a => a !== amenity)
          : [...prev.stayDetails.amenities, amenity],
      },
    }));
  };

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
        {t.amenities?.title || 'What amenities do you offer?'}
      </h1>
      <p className="text-lg text-gray-500 mb-8">
        {t.amenities?.subtitle || 'Select all that apply. You can always add more later.'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {AMENITIES.map(amenity => (
          <VisualToggle
            key={amenity}
            icon={AMENITY_ICONS[amenity] || <span>-</span>}
            label={t.amenities?.items?.[amenity] || amenity}
            selected={formData.stayDetails.amenities.includes(amenity)}
            onClick={() => toggle(amenity)}
          />
        ))}
      </div>
    </div>
  );
}
