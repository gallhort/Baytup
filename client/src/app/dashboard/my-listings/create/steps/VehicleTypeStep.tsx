'use client';

import { Car, Bike, Truck, Bus, Ship } from 'lucide-react';
import VisualCard from '../components/VisualCard';
import { CreateListingFormData, VEHICLE_TYPES } from '../types';
import { ReactNode } from 'react';

const VEHICLE_ICONS: Record<string, ReactNode> = {
  car: <Car className="w-8 h-8 text-[#FF6B35]" />,
  motorcycle: <Bike className="w-8 h-8 text-[#FF6B35]" />,
  truck: <Truck className="w-8 h-8 text-[#FF6B35]" />,
  van: <Truck className="w-8 h-8 text-[#FF6B35]" />,
  suv: <Car className="w-8 h-8 text-[#FF6B35]" />,
  bus: <Bus className="w-8 h-8 text-[#FF6B35]" />,
  bicycle: <Bike className="w-8 h-8 text-[#FF6B35]" />,
  scooter: <Bike className="w-8 h-8 text-[#FF6B35]" />,
  boat: <Ship className="w-8 h-8 text-[#FF6B35]" />,
};

interface Props {
  formData: CreateListingFormData;
  onUpdate: (subcategory: string) => void;
  t: any;
}

export default function VehicleTypeStep({ formData, onUpdate, t }: Props) {
  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
        {t.vehicleType?.title || 'What type of vehicle?'}
      </h1>
      <p className="text-lg text-gray-500 mb-8">
        {t.vehicleType?.subtitle || 'Select the option that best describes your vehicle.'}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {VEHICLE_TYPES.map(type => (
          <VisualCard
            key={type}
            icon={VEHICLE_ICONS[type] || <Car className="w-8 h-8 text-[#FF6B35]" />}
            label={t.vehicleType?.types?.[type] || type}
            selected={formData.subcategory === type}
            onClick={() => onUpdate(type)}
          />
        ))}
      </div>
    </div>
  );
}
