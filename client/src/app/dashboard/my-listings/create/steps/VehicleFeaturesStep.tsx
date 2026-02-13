'use client';

import { ReactNode } from 'react';
import {
  Navigation, Bluetooth, Snowflake, Sun, Camera,
  Gauge, Flame, Wifi, Baby, Bike, Mountain
} from 'lucide-react';
import VisualToggle from '../components/VisualToggle';
import { CreateListingFormData, VEHICLE_FEATURES } from '../types';

const FEATURE_ICONS: Record<string, ReactNode> = {
  gps: <Navigation className="w-5 h-5" />,
  bluetooth: <Bluetooth className="w-5 h-5" />,
  ac: <Snowflake className="w-5 h-5" />,
  sunroof: <Sun className="w-5 h-5" />,
  backup_camera: <Camera className="w-5 h-5" />,
  cruise_control: <Gauge className="w-5 h-5" />,
  heated_seats: <Flame className="w-5 h-5" />,
  wifi_hotspot: <Wifi className="w-5 h-5" />,
  child_seat: <Baby className="w-5 h-5" />,
  ski_rack: <Mountain className="w-5 h-5" />,
  bike_rack: <Bike className="w-5 h-5" />,
};

interface Props {
  formData: CreateListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<CreateListingFormData>>;
  t: any;
}

export default function VehicleFeaturesStep({ formData, setFormData, t }: Props) {
  const toggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      vehicleDetails: {
        ...prev.vehicleDetails,
        features: prev.vehicleDetails.features.includes(feature)
          ? prev.vehicleDetails.features.filter(f => f !== feature)
          : [...prev.vehicleDetails.features, feature],
      },
    }));
  };

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
        {t.vehicleFeatures?.title || 'What features does it have?'}
      </h1>
      <p className="text-lg text-gray-500 mb-8">
        {t.vehicleFeatures?.subtitle || 'Select all that apply.'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {VEHICLE_FEATURES.map(feature => (
          <VisualToggle
            key={feature}
            icon={FEATURE_ICONS[feature] || <span>-</span>}
            label={t.vehicleFeatures?.items?.[feature] || feature}
            selected={formData.vehicleDetails.features.includes(feature)}
            onClick={() => toggle(feature)}
          />
        ))}
      </div>
    </div>
  );
}
