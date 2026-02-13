'use client';

import { Home, Car } from 'lucide-react';
import VisualCard from '../components/VisualCard';
import { CreateListingFormData } from '../types';

interface Props {
  formData: CreateListingFormData;
  onUpdate: (category: 'stay' | 'vehicle') => void;
  t: any;
  vehiclesEnabled: boolean;
}

export default function WelcomeCategoryStep({ formData, onUpdate, t, vehiclesEnabled }: Props) {
  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
        {t.category?.title || 'What are you listing?'}
      </h1>
      <p className="text-lg text-gray-500 mb-10">
        {t.category?.subtitle || 'Choose the type of listing you want to create.'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <VisualCard
          icon={<Home className="w-12 h-12 text-[#FF6B35]" />}
          label={t.category?.stay || 'A place to stay'}
          description={t.category?.stayDesc || 'Apartment, house, villa, room...'}
          selected={formData.category === 'stay'}
          onClick={() => onUpdate('stay')}
          large
        />
        {vehiclesEnabled && (
          <VisualCard
            icon={<Car className="w-12 h-12 text-[#FF6B35]" />}
            label={t.category?.vehicle || 'A vehicle'}
            description={t.category?.vehicleDesc || 'Car, motorcycle, van, SUV...'}
            selected={formData.category === 'vehicle'}
            onClick={() => onUpdate('vehicle')}
            large
          />
        )}
      </div>
    </div>
  );
}
