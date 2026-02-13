export interface CreateListingFormData {
  // Basic
  title: string;
  description: string;
  category: 'stay' | 'vehicle' | '';
  subcategory: string;

  // Location
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  location: {
    type?: string;
    coordinates: [number, number]; // [lng, lat]
  };

  // Stay Details
  stayDetails: {
    stayType: string;
    bedrooms: number;
    bathrooms: number;
    area: number;
    floor: number;
    furnished: string;
    amenities: string[];
  };

  // Vehicle Details
  vehicleDetails: {
    vehicleType: string;
    make: string;
    model: string;
    year: number;
    transmission: string;
    fuelType: string;
    seats: number;
    features: string[];
  };

  // Pricing
  pricing: {
    basePrice: number;
    currency: string;
    pricingType: string;
    cleaningFee: number;
    serviceFee: number;
    securityDeposit: number;
    altBasePrice?: number;
    altCurrency?: string;
    altCleaningFee?: number;
  };

  // Availability
  availability: {
    instantBook: boolean;
    minStay: number;
    maxStay: number;
    advanceNotice: number;
    preparationTime: number;
    checkInFrom: string;
    checkInTo: string;
    checkOutBefore: string;
  };

  // Cancellation Policy
  cancellationPolicy: string;

  // Rules
  rules: {
    smoking: string;
    pets: string;
    parties: string;
    children: string;
    additionalRules: string[];
  };

  // Images
  images: Array<{
    url: string;
    caption: string;
    isPrimary: boolean;
  }>;
}

export interface StepConfig {
  id: string;
  phase: number;
  component: string;
}

export const STAY_TYPES = ['apartment', 'house', 'villa', 'studio', 'room', 'riad', 'guesthouse', 'hotel_room'] as const;
export const VEHICLE_TYPES = ['car', 'motorcycle', 'truck', 'van', 'suv', 'bus', 'bicycle', 'scooter', 'boat'] as const;

export const AMENITIES = [
  'wifi', 'parking', 'pool', 'gym', 'garden', 'terrace',
  'elevator', 'security', 'ac', 'heating', 'kitchen', 'balcony',
  'tv', 'washer', 'beach_access', 'mountain_view'
] as const;

export const VEHICLE_FEATURES = [
  'gps', 'bluetooth', 'ac', 'sunroof', 'backup_camera',
  'cruise_control', 'heated_seats', 'wifi_hotspot',
  'child_seat', 'ski_rack', 'bike_rack'
] as const;

export const CANCELLATION_POLICIES = ['flexible', 'moderate', 'strict', 'strict_long_term', 'non_refundable'] as const;

export const INITIAL_FORM_DATA: CreateListingFormData = {
  title: '',
  description: '',
  category: '',
  subcategory: '',
  address: {
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Algeria',
  },
  location: {
    coordinates: [0, 0],
  },
  stayDetails: {
    stayType: '',
    bedrooms: 1,
    bathrooms: 1,
    area: 0,
    floor: 0,
    furnished: '',
    amenities: [],
  },
  vehicleDetails: {
    vehicleType: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    transmission: '',
    fuelType: '',
    seats: 0,
    features: [],
  },
  pricing: {
    basePrice: 0,
    currency: 'DZD',
    pricingType: 'per_night',
    cleaningFee: 0,
    serviceFee: 0,
    securityDeposit: 0,
  },
  availability: {
    instantBook: false,
    minStay: 1,
    maxStay: 365,
    advanceNotice: 0,
    preparationTime: 0,
    checkInFrom: '15:00',
    checkInTo: '21:00',
    checkOutBefore: '11:00',
  },
  cancellationPolicy: 'moderate',
  rules: {
    smoking: 'not_allowed',
    pets: 'not_allowed',
    parties: 'not_allowed',
    children: 'allowed',
    additionalRules: [],
  },
  images: [],
};
