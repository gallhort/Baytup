'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaSave, FaTimes, FaHome, FaCar, FaMapMarkerAlt, FaMoneyBillWave,
  FaCalendar, FaImage, FaClipboardList, FaInfoCircle, FaPlus, FaTrash,
  FaBed, FaCouch, FaRulerCombined, FaCogs, FaGasPump, FaUsers, FaStar,
  FaSmoking, FaPaw, FaGlassCheers, FaChild, FaClock, FaDoorOpen, FaShieldAlt,
  FaSpinner
} from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import GoogleMapsScriptLoader from '@/components/listing/GoogleMapsScriptLoader';
import CityAutocomplete from '@/components/listing/CityAutocomplete';
import { useTranslation } from '@/hooks/useTranslation';
import { useFeature } from '@/contexts/FeatureFlagsContext'; // ✅ Feature flags
import PriceInput from '@/components/common/PriceInput';
// Dynamically import the map component to avoid SSR issues
const GoogleMapsLocationPicker = dynamic(
  () => import('@/components/listing/GoogleMapsLocationPicker'),
  { ssr: false }
);

interface ListingForm {
  // Basic Information
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
    coordinates: [number, number];
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

  status: string;
}

export default function CreateListingPage() {
  const router = useRouter();
  const t = useTranslation('listing-form');
  const vehiclesEnabled = useFeature('vehiclesEnabled'); // ✅ Feature flag
  const [currentStep, setCurrentStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<ListingForm>({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Algeria'
    },
    location: {
      coordinates: [0, 0]
    },
    stayDetails: {
      stayType: '',
      bedrooms: 0,
      bathrooms: 0,
      area: 0,
      floor: 0,
      furnished: '',
      amenities: []
    },
    vehicleDetails: {
      vehicleType: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      transmission: '',
      fuelType: '',
      seats: 0,
      features: []
    },
    pricing: {
      basePrice: 0,
      currency: 'DZD',
      pricingType: 'per_night',
      cleaningFee: 0,
      serviceFee: 0,
      securityDeposit: 0
    },
    availability: {
      instantBook: false,
      minStay: 1,
      maxStay: 365,
      advanceNotice: 0,
      preparationTime: 0,
      checkInFrom: '15:00',
      checkInTo: '21:00',
      checkOutBefore: '11:00'
    },
    rules: {
      smoking: 'not_allowed',
      pets: 'not_allowed',
      parties: 'not_allowed',
      children: 'allowed',
      additionalRules: []
    },
    images: [],
    status: 'draft'
  });

  const [newRule, setNewRule] = useState('');

  const stayTypes = ['apartment', 'house', 'villa', 'studio', 'room', 'riad', 'guesthouse', 'hotel_room'];
  const vehicleTypes = ['car', 'motorcycle', 'truck', 'van', 'suv', 'bus', 'bicycle', 'scooter', 'boat'];
  const amenitiesList = ['wifi', 'parking', 'pool', 'gym', 'garden', 'terrace', 'elevator', 'security', 'ac', 'heating', 'kitchen', 'balcony', 'tv', 'washer', 'beach_access', 'mountain_view'];
  const featuresList = ['gps', 'bluetooth', 'ac', 'sunroof', 'backup_camera', 'cruise_control', 'heated_seats', 'wifi_hotspot', 'child_seat', 'ski_rack', 'bike_rack'];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadFormData = new FormData();
    Array.from(files).forEach(file => {
      uploadFormData.append('images', file);
    });

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/listings/upload-images`,
        uploadFormData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const uploadedImages = response.data.data.images.map((img: any, idx: number) => ({
        ...img,
        isPrimary: formData.images.length === 0 && idx === 0
      }));

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedImages]
      }));

      toast.success(`${files.length} ${(t as any).messages.imageUploadSuccess}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || (t as any).messages.imageUploadError);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSetPrimaryImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => ({
        ...img,
        isPrimary: i === index
      }))
    }));
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      stayDetails: {
        ...prev.stayDetails,
        amenities: prev.stayDetails.amenities.includes(amenity)
          ? prev.stayDetails.amenities.filter(a => a !== amenity)
          : [...prev.stayDetails.amenities, amenity]
      }
    }));
  };

  const toggleFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      vehicleDetails: {
        ...prev.vehicleDetails,
        features: prev.vehicleDetails.features.includes(feature)
          ? prev.vehicleDetails.features.filter(f => f !== feature)
          : [...prev.vehicleDetails.features, feature]
      }
    }));
  };

  const addAdditionalRule = () => {
    if (newRule.trim()) {
      setFormData(prev => ({
        ...prev,
        rules: {
          ...prev.rules,
          additionalRules: [...prev.rules.additionalRules, newRule.trim()]
        }
      }));
      setNewRule('');
    }
  };

  const removeAdditionalRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        additionalRules: prev.rules.additionalRules.filter((_, i) => i !== index)
      }
    }));
  };

  const handleSubmit = async (status: string) => {
    // Validation
    if (!formData.title || !formData.description || !formData.category) {
      toast.error((t as any).validation.requiredFields);
      return;
    }

    if (!formData.address.street || !formData.address.city || !formData.address.state) {
      toast.error((t as any).validation.completeAddress);
      return;
    }

    if (formData.pricing.basePrice <= 0) {
      toast.error((t as any).validation.validBasePrice);
      return;
    }

    if (formData.images.length === 0) {
      toast.error((t as any).validation.atLeastOneImage);
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('token');

      // Build payload based on category - only include relevant details
      const payload: any = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        subcategory: formData.subcategory,
        address: formData.address,
        location: formData.location,
        pricing: formData.pricing,
        availability: formData.availability,
        rules: formData.rules,
        images: formData.images,
        status
      };

      // Add category-specific details - only send the relevant one
      if (formData.category === 'stay') {
        // Clean stayDetails - remove empty string values
        const cleanStayDetails: any = {
          amenities: formData.stayDetails.amenities
        };

        // Only include fields with valid values
        if (formData.stayDetails.stayType) cleanStayDetails.stayType = formData.stayDetails.stayType;
        if (formData.stayDetails.bedrooms) cleanStayDetails.bedrooms = formData.stayDetails.bedrooms;
        if (formData.stayDetails.bathrooms) cleanStayDetails.bathrooms = formData.stayDetails.bathrooms;
        if (formData.stayDetails.area) cleanStayDetails.area = formData.stayDetails.area;
        if (formData.stayDetails.floor !== undefined) cleanStayDetails.floor = formData.stayDetails.floor;
        if (formData.stayDetails.furnished) cleanStayDetails.furnished = formData.stayDetails.furnished;

        payload.stayDetails = cleanStayDetails;
      } else if (formData.category === 'vehicle') {
        // Clean vehicleDetails - remove empty string values
        const cleanVehicleDetails: any = {
          features: formData.vehicleDetails.features
        };

        // Only include fields with valid values
        if (formData.vehicleDetails.vehicleType) cleanVehicleDetails.vehicleType = formData.vehicleDetails.vehicleType;
        if (formData.vehicleDetails.make) cleanVehicleDetails.make = formData.vehicleDetails.make;
        if (formData.vehicleDetails.model) cleanVehicleDetails.model = formData.vehicleDetails.model;
        if (formData.vehicleDetails.year) cleanVehicleDetails.year = formData.vehicleDetails.year;
        if (formData.vehicleDetails.transmission) cleanVehicleDetails.transmission = formData.vehicleDetails.transmission;
        if (formData.vehicleDetails.fuelType) cleanVehicleDetails.fuelType = formData.vehicleDetails.fuelType;
        if (formData.vehicleDetails.seats) cleanVehicleDetails.seats = formData.vehicleDetails.seats;

        payload.vehicleDetails = cleanVehicleDetails;
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/listings`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      toast.success(status === 'active' ? (t as any).messages.listingPublishedSuccess : (t as any).messages.listingSavedSuccess);
      router.push('/dashboard/my-listings');
    } catch (error: any) {
      console.error('Create listing error:', error);
      toast.error(error.response?.data?.message || (t as any).messages.listingCreateError);
    } finally {
      setSaving(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <FaInfoCircle className="mr-2 text-[#FF6B35]" />
          {(t as any).basicInfo.sectionTitle}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {(t as any).basicInfo.category} <span className="text-red-500">*</span>
            </label>
            <div className={`grid ${vehiclesEnabled ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, category: 'stay', subcategory: '', pricing: { ...prev.pricing, pricingType: 'per_night' } }))}
                className={`p-4 border-2 rounded-lg transition-all ${formData.category === 'stay' ? 'border-[#FF6B35] bg-orange-50' : 'border-gray-200 hover:border-[#FF6B35]'}`}
              >
                <FaHome className={`text-3xl mx-auto mb-2 ${formData.category === 'stay' ? 'text-[#FF6B35]' : 'text-gray-400'}`} />
                <p className="font-semibold">{(t as any).basicInfo.stayCategory}</p>
                <p className="text-xs text-gray-500">{(t as any).basicInfo.stayCategoryDesc}</p>
              </button>
              {/* ✅ FEATURE FLAG: Cacher option véhicule si désactivé */}
              {vehiclesEnabled && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, category: 'vehicle', subcategory: '', pricing: { ...prev.pricing, pricingType: 'per_day' } }))}
                  className={`p-4 border-2 rounded-lg transition-all ${formData.category === 'vehicle' ? 'border-[#FF6B35] bg-orange-50' : 'border-gray-200 hover:border-[#FF6B35]'}`}
                >
                  <FaCar className={`text-3xl mx-auto mb-2 ${formData.category === 'vehicle' ? 'text-[#FF6B35]' : 'text-gray-400'}`} />
                  <p className="font-semibold">{(t as any).basicInfo.vehicleCategory}</p>
                  <p className="text-xs text-gray-500">{(t as any).basicInfo.vehicleCategoryDesc}</p>
                </button>
              )}
            </div>
          </div>

          {formData.category && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.category === 'stay' ? (t as any).basicInfo.propertyType : (t as any).basicInfo.vehicleType} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.subcategory}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      subcategory: value,
                      // Sync the type with subcategory
                      stayDetails: formData.category === 'stay' ? { ...prev.stayDetails, stayType: value } : prev.stayDetails,
                      vehicleDetails: formData.category === 'vehicle' ? { ...prev.vehicleDetails, vehicleType: value } : prev.vehicleDetails
                    }));
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  required
                >
                  <option value="">{(t as any).basicInfo.selectType}</option>
                  {(formData.category === 'stay' ? stayTypes : vehicleTypes).map(type => (
                    <option key={type} value={type}>
                      {formData.category === 'stay' ? (t as any).options.stayTypes[type] : (t as any).options.vehicleTypes[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {(t as any).basicInfo.title} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={(t as any).basicInfo.titlePlaceholder}
                  maxLength={100}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100 {(t as any).basicInfo.titleCounter}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {(t as any).basicInfo.description} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={(t as any).basicInfo.descriptionPlaceholder}
                  rows={6}
                  maxLength={2000}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{formData.description.length}/2000 {(t as any).basicInfo.descriptionCounter}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const handlePlaceSelected = (place: {
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    coordinates: [number, number];
    formattedAddress: string;
  }) => {
    setFormData(prev => ({
      ...prev,
      address: place.address,
      location: {
        type: 'Point',
        coordinates: place.coordinates
      }
    }));
    toast.success((t as any).location.locationUpdated);
  };

  const handleMapLocationChange = (location: { lat: number; lng: number; address?: string }) => {
    setFormData(prev => ({
      ...prev,
      location: {
        type: 'Point',
        coordinates: [location.lng, location.lat]
      }
    }));
  };

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <FaMapMarkerAlt className="mr-2 text-[#FF6B35]" />
          {(t as any).location.sectionTitle}
        </h3>

        {/* City Autocomplete (Database) - 100% FREE */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {(t as any).location.searchLocation} <span className="text-red-500">*</span>
          </label>
          <CityAutocomplete
            onPlaceSelected={handlePlaceSelected}
            placeholder={(t as any).location.searchPlaceholder}
          />
        </div>

        {/* Manual Address Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {(t as any).location.streetAddress} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.address.street}
              onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, street: e.target.value } }))}
              placeholder={(t as any).location.streetPlaceholder}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {(t as any).location.city} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.address.city}
              onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))}
              placeholder={(t as any).location.cityPlaceholder}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {(t as any).location.state} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.address.state}
              onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, state: e.target.value } }))}
              placeholder={(t as any).location.statePlaceholder}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {(t as any).location.postalCode}
            </label>
            <input
              type="text"
              value={formData.address.postalCode}
              onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, postalCode: e.target.value } }))}
              placeholder={(t as any).location.postalCodePlaceholder}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {(t as any).location.country} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.address.country}
              onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, country: e.target.value } }))}
              placeholder={(t as any).location.countryPlaceholder}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
              required
            />
          </div>
        </div>

        {/* Coordinates Display (Read-only) */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {(t as any).location.latitude} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.location.coordinates[1] || ''}
              readOnly
              placeholder={(t as any).location.latitudePlaceholder}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {(t as any).location.longitude} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.location.coordinates[0] || ''}
              readOnly
              placeholder={(t as any).location.longitudePlaceholder}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>
        </div>

        {/* Google Maps Location Picker */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {(t as any).location.pinLocation} <span className="text-red-500">*</span>
          </label>
          <GoogleMapsLocationPicker
            center={{
              lat: formData.location.coordinates[1] || 36.7538,
              lng: formData.location.coordinates[0] || 3.0588
            }}
            onLocationChange={handleMapLocationChange}
            zoom={15}
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      {formData.category === 'stay' ? (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <FaHome className="mr-2 text-[#FF6B35]" />
            {(t as any).stayDetails.sectionTitle}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaBed className="inline mr-2" />
                {(t as any).stayDetails.bedrooms}
              </label>
              <input
                type="number"
                value={formData.stayDetails.bedrooms}
                onChange={(e) => setFormData(prev => ({ ...prev, stayDetails: { ...prev.stayDetails, bedrooms: parseInt(e.target.value) || 0 } }))}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {(t as any).stayDetails.bathrooms}
              </label>
              <input
                type="number"
                value={formData.stayDetails.bathrooms}
                onChange={(e) => setFormData(prev => ({ ...prev, stayDetails: { ...prev.stayDetails, bathrooms: parseInt(e.target.value) || 0 } }))}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaRulerCombined className="inline mr-2" />
                {(t as any).stayDetails.area}
              </label>
              <input
                type="number"
                value={formData.stayDetails.area}
                onChange={(e) => setFormData(prev => ({ ...prev, stayDetails: { ...prev.stayDetails, area: parseInt(e.target.value) || 0 } }))}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {(t as any).stayDetails.floor}
              </label>
              <input
                type="number"
                value={formData.stayDetails.floor}
                onChange={(e) => setFormData(prev => ({ ...prev, stayDetails: { ...prev.stayDetails, floor: parseInt(e.target.value) || 0 } }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaCouch className="inline mr-2" />
                {(t as any).stayDetails.furnished}
              </label>
              <select
                value={formData.stayDetails.furnished}
                onChange={(e) => setFormData(prev => ({ ...prev, stayDetails: { ...prev.stayDetails, furnished: e.target.value } }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
              >
                <option value="">{(t as any).stayDetails.furnishedSelect}</option>
                <option value="furnished">{(t as any).stayDetails.furnishedOption}</option>
                <option value="semi-furnished">{(t as any).stayDetails.semiFurnishedOption}</option>
                <option value="unfurnished">{(t as any).stayDetails.unfurnishedOption}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {(t as any).stayDetails.amenities}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {amenitiesList.map(amenity => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                    formData.stayDetails.amenities.includes(amenity)
                      ? 'border-[#FF6B35] bg-orange-50 text-[#FF6B35]'
                      : 'border-gray-200 text-gray-700 hover:border-[#FF6B35]'
                  }`}
                >
                  {(t as any).options.amenities[amenity]}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : formData.category === 'vehicle' ? (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <FaCar className="mr-2 text-[#FF6B35]" />
            {(t as any).vehicleDetails.sectionTitle}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {(t as any).vehicleDetails.make}
              </label>
              <input
                type="text"
                value={formData.vehicleDetails.make}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicleDetails: { ...prev.vehicleDetails, make: e.target.value } }))}
                placeholder={(t as any).vehicleDetails.makePlaceholder}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {(t as any).vehicleDetails.model}
              </label>
              <input
                type="text"
                value={formData.vehicleDetails.model}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicleDetails: { ...prev.vehicleDetails, model: e.target.value } }))}
                placeholder={(t as any).vehicleDetails.modelPlaceholder}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {(t as any).vehicleDetails.year}
              </label>
              <input
                type="number"
                value={formData.vehicleDetails.year}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicleDetails: { ...prev.vehicleDetails, year: parseInt(e.target.value) || new Date().getFullYear() } }))}
                min="1900"
                max={new Date().getFullYear() + 1}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaUsers className="inline mr-2" />
                {(t as any).vehicleDetails.seats}
              </label>
              <input
                type="number"
                value={formData.vehicleDetails.seats}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicleDetails: { ...prev.vehicleDetails, seats: parseInt(e.target.value) || 0 } }))}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaCogs className="inline mr-2" />
                {(t as any).vehicleDetails.transmission}
              </label>
              <select
                value={formData.vehicleDetails.transmission}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicleDetails: { ...prev.vehicleDetails, transmission: e.target.value } }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
              >
                <option value="">{(t as any).vehicleDetails.transmissionSelect}</option>
                <option value="manual">{(t as any).vehicleDetails.transmissionManual}</option>
                <option value="automatic">{(t as any).vehicleDetails.transmissionAutomatic}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaGasPump className="inline mr-2" />
                {(t as any).vehicleDetails.fuelType}
              </label>
              <select
                value={formData.vehicleDetails.fuelType}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicleDetails: { ...prev.vehicleDetails, fuelType: e.target.value } }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
              >
                <option value="">{(t as any).vehicleDetails.fuelTypeSelect}</option>
                <option value="gasoline">{(t as any).vehicleDetails.fuelGasoline}</option>
                <option value="diesel">{(t as any).vehicleDetails.fuelDiesel}</option>
                <option value="electric">{(t as any).vehicleDetails.fuelElectric}</option>
                <option value="hybrid">{(t as any).vehicleDetails.fuelHybrid}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {(t as any).vehicleDetails.features}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {featuresList.map(feature => (
                <button
                  key={feature}
                  type="button"
                  onClick={() => toggleFeature(feature)}
                  className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                    formData.vehicleDetails.features.includes(feature)
                      ? 'border-[#FF6B35] bg-orange-50 text-[#FF6B35]'
                      : 'border-gray-200 text-gray-700 hover:border-[#FF6B35]'
                  }`}
                >
                  {(t as any).options.features[feature]}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
<div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <FaMoneyBillWave className="mr-2 text-[#FF6B35]" />
          {(t as any).pricing.sectionTitle}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ✅ BASE PRICE */}
          <div className="md:col-span-2">
            <PriceInput
              value={formData.pricing.basePrice}
              onChange={(value) => setFormData(prev => ({ 
                ...prev, 
                pricing: { ...prev.pricing, basePrice: value } 
              }))}
              currency={formData.pricing.currency}
              label={(t as any).pricing.basePrice}
              required
              min={0}
            />
          </div>

          {/* PRICING TYPE - inchangé */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {(t as any).pricing.pricingType}
            </label>
            <select
              value={formData.pricing.pricingType}
              onChange={(e) => setFormData(prev => ({ ...prev, pricing: { ...prev.pricing, pricingType: e.target.value } }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            >
              <option value="per_night">{(t as any).pricing.perNight}</option>
              <option value="per_day">{(t as any).pricing.perDay}</option>
              <option value="per_week">{(t as any).pricing.perWeek}</option>
              <option value="per_month">{(t as any).pricing.perMonth}</option>
              <option value="per_hour">{(t as any).pricing.perHour}</option>
            </select>
          </div>

          {/* ✅ CLEANING FEE */}
          <div>
            <PriceInput
              value={formData.pricing.cleaningFee}
              onChange={(value) => setFormData(prev => ({ 
                ...prev, 
                pricing: { ...prev.pricing, cleaningFee: value } 
              }))}
              currency={formData.pricing.currency}
              label={(t as any).pricing.cleaningFee}
              min={0}
            />
          </div>

          {/* ✅ SERVICE FEE */}
          <div>
            <PriceInput
              value={formData.pricing.serviceFee}
              onChange={(value) => setFormData(prev => ({ 
                ...prev, 
                pricing: { ...prev.pricing, serviceFee: value } 
              }))}
              currency={formData.pricing.currency}
              label={(t as any).pricing.serviceFee}
              min={0}
            />
          </div>

          {/* ✅ SECURITY DEPOSIT */}
          <div>
            <PriceInput
              value={formData.pricing.securityDeposit}
              onChange={(value) => setFormData(prev => ({ 
                ...prev, 
                pricing: { ...prev.pricing, securityDeposit: value } 
              }))}
              currency={formData.pricing.currency}
              label={(t as any).pricing.securityDeposit}
              min={0}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <FaCalendar className="mr-2 text-[#FF6B35]" />
          {(t as any).availability.sectionTitle}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.availability.instantBook}
                onChange={(e) => setFormData(prev => ({ ...prev, availability: { ...prev.availability, instantBook: e.target.checked } }))}
                className="w-5 h-5 text-[#FF6B35] border-gray-300 rounded focus:ring-[#FF6B35]"
              />
              <span className="text-sm font-medium text-gray-700">{(t as any).availability.instantBook}</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {(t as any).availability.minStay}
            </label>
            <input
              type="number"
              value={formData.availability.minStay}
              onChange={(e) => setFormData(prev => ({ ...prev, availability: { ...prev.availability, minStay: parseInt(e.target.value) || 1 } }))}
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {(t as any).availability.maxStay}
            </label>
            <input
              type="number"
              value={formData.availability.maxStay}
              onChange={(e) => setFormData(prev => ({ ...prev, availability: { ...prev.availability, maxStay: parseInt(e.target.value) || 365 } }))}
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaClock className="inline mr-2" />
              {(t as any).availability.advanceNotice}
            </label>
            <input
              type="number"
              value={formData.availability.advanceNotice}
              onChange={(e) => setFormData(prev => ({ ...prev, availability: { ...prev.availability, advanceNotice: parseInt(e.target.value) || 0 } }))}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {(t as any).availability.preparationTime}
            </label>
            <input
              type="number"
              value={formData.availability.preparationTime}
              onChange={(e) => setFormData(prev => ({ ...prev, availability: { ...prev.availability, preparationTime: parseInt(e.target.value) || 0 } }))}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaDoorOpen className="inline mr-2" />
              {(t as any).availability.checkInFrom}
            </label>
            <input
              type="time"
              value={formData.availability.checkInFrom}
              onChange={(e) => setFormData(prev => ({ ...prev, availability: { ...prev.availability, checkInFrom: e.target.value } }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {(t as any).availability.checkInTo}
            </label>
            <input
              type="time"
              value={formData.availability.checkInTo}
              onChange={(e) => setFormData(prev => ({ ...prev, availability: { ...prev.availability, checkInTo: e.target.value } }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {(t as any).availability.checkOutBefore}
            </label>
            <input
              type="time"
              value={formData.availability.checkOutBefore}
              onChange={(e) => setFormData(prev => ({ ...prev, availability: { ...prev.availability, checkOutBefore: e.target.value } }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <FaClipboardList className="mr-2 text-[#FF6B35]" />
          {(t as any).rules.sectionTitle}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaSmoking className="inline mr-2" /> {(t as any).rules.smoking}
            </label>
            <select
              value={formData.rules.smoking}
              onChange={(e) => setFormData(prev => ({ ...prev, rules: { ...prev.rules, smoking: e.target.value } }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            >
              <option value="allowed">{(t as any).rules.smokingAllowed}</option>
              <option value="not_allowed">{(t as any).rules.smokingNotAllowed}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaPaw className="inline mr-2" /> {(t as any).rules.pets}
            </label>
            <select
              value={formData.rules.pets}
              onChange={(e) => setFormData(prev => ({ ...prev, rules: { ...prev.rules, pets: e.target.value } }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            >
              <option value="allowed">{(t as any).rules.petsAllowed}</option>
              <option value="not_allowed">{(t as any).rules.petsNotAllowed}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaGlassCheers className="inline mr-2" /> {(t as any).rules.parties}
            </label>
            <select
              value={formData.rules.parties}
              onChange={(e) => setFormData(prev => ({ ...prev, rules: { ...prev.rules, parties: e.target.value } }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            >
              <option value="allowed">{(t as any).rules.partiesAllowed}</option>
              <option value="not_allowed">{(t as any).rules.partiesNotAllowed}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaChild className="inline mr-2" /> {(t as any).rules.children}
            </label>
            <select
              value={formData.rules.children}
              onChange={(e) => setFormData(prev => ({ ...prev, rules: { ...prev.rules, children: e.target.value } }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            >
              <option value="allowed">{(t as any).rules.childrenAllowed}</option>
              <option value="not_allowed">{(t as any).rules.childrenNotAllowed}</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {(t as any).rules.additionalRules}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAdditionalRule())}
                placeholder={(t as any).rules.additionalRulesPlaceholder}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
              />
              <button
                type="button"
                onClick={addAdditionalRule}
                className="px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#ff8255] transition-colors"
              >
                <FaPlus />
              </button>
            </div>
            <div className="space-y-2">
              {formData.rules.additionalRules.map((rule, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <span className="flex-1 text-sm">{rule}</span>
                  <button
                    type="button"
                    onClick={() => removeAdditionalRule(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <FaImage className="mr-2 text-[#FF6B35]" />
            {(t as any).images.sectionTitle} <span className="text-red-500 ml-1">*</span>
          </h3>
          {formData.images.length > 0 && (
            <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {formData.images.length} {formData.images.length === 1 ? (t as any).images.imageNumber : (t as any).images.imagesNumber} {(t as any).images.uploadedText}
            </span>
          )}
        </div>

        <div className="space-y-4">
          {/* Upload Area */}
          <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
            uploading ? 'border-[#FF6B35] bg-orange-50' : 'border-gray-300 hover:border-[#FF6B35] hover:bg-gray-50'
          }`}>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
              disabled={uploading}
            />
            <label
              htmlFor="image-upload"
              className={`cursor-pointer ${uploading ? 'cursor-not-allowed' : ''}`}
            >
              {uploading ? (
                <FaSpinner className="text-4xl text-[#FF6B35] mx-auto mb-4 animate-spin" />
              ) : (
                <FaImage className="text-4xl text-gray-400 mx-auto mb-4" />
              )}
              <p className="text-gray-600 mb-2 font-medium">
                {uploading ? (t as any).images.uploadingText : (t as any).images.uploadArea}
              </p>
              <p className="text-sm text-gray-500">
                {(t as any).images.uploadFormats}
              </p>
              {formData.images.length > 0 && (
                <p className="text-xs text-[#FF6B35] mt-2">
                  {(t as any).images.addMoreImages}
                </p>
              )}
            </label>
          </div>

          {/* Image Preview Grid */}
          {formData.images.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Tip:</span> {(t as any).images.primaryImageTip}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative group bg-white rounded-lg border-2 border-gray-200 overflow-hidden hover:border-[#FF6B35] transition-all">
                    {/* Image Container with Loading State */}
                    <div className="relative w-full h-40 bg-gray-100">
                      <img
                        src={`${process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000'}${image.url}`}
                        alt={image.caption || `Listing image ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          // Fallback for broken images
                          console.error('Image failed to load:', `${process.env.NEXT_PUBLIC_SOCKET_URL}${image.url}`);
                          e.currentTarget.src = '/placeholder.jpg';
                          e.currentTarget.onerror = null;
                        }}
                        loading="lazy"
                      />

                      {/* Overlay on Hover */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200" />
                    </div>

                    {/* Primary Badge */}
                    {image.isPrimary && (
                      <div className="absolute top-2 left-2 bg-gradient-to-r from-[#FF6B35] to-orange-600 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center shadow-lg z-10">
                        <FaStar className="mr-1" size={10} /> {(t as any).images.primaryBadge}
                      </div>
                    )}

                    {/* Image Number */}
                    <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs font-medium">
                      #{index + 1}
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      {!image.isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryImage(index)}
                          className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-lg transform hover:scale-110 transition-all"
                          title={(t as any).images.setPrimary}
                        >
                          <FaStar size={12} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg transform hover:scale-110 transition-all"
                        title={(t as any).images.removeImage}
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>

                    {/* Caption Input */}
                    <div className="p-2 bg-white">
                      <input
                        type="text"
                        value={image.caption || ''}
                        onChange={(e) => {
                          const newImages = [...formData.images];
                          newImages[index].caption = e.target.value;
                          setFormData(prev => ({ ...prev, images: newImages }));
                        }}
                        placeholder={(t as any).images.captionPlaceholder}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Images Message */}
          {formData.images.length === 0 && !uploading && (
            <div className="text-center py-8">
              <FaImage className="text-6xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">{(t as any).images.noImagesYet}</p>
              <p className="text-gray-400 text-xs mt-1">{(t as any).images.uploadAtLeastOne}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const steps = [
    { number: 1, title: (t as any).steps.basicInfo, icon: FaInfoCircle },
    { number: 2, title: (t as any).steps.location, icon: FaMapMarkerAlt },
    { number: 3, title: (t as any).steps.details, icon: formData.category === 'stay' ? FaHome : FaCar },
    { number: 4, title: (t as any).steps.pricing, icon: FaMoneyBillWave },
    { number: 5, title: (t as any).steps.rules, icon: FaClipboardList },
    { number: 6, title: (t as any).steps.images, icon: FaImage }
  ];

  return (
    <GoogleMapsScriptLoader>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/my-listings"
            className="inline-flex items-center text-[#FF6B35] hover:text-[#ff8255] mb-4"
          >
            <FaTimes className="mr-2" />
            {(t as any).header.backButton}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{(t as any).header.createTitle}</h1>
          <p className="text-gray-600 mt-2">{(t as any).header.createSubtitle}</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex-1">
                <div className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      currentStep >= step.number
                        ? 'border-[#FF6B35] bg-[#FF6B35] text-white'
                        : 'border-gray-300 text-gray-400'
                    }`}
                  >
                    <step.icon />
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 ${currentStep > step.number ? 'bg-[#FF6B35]' : 'bg-gray-300'}`} />
                  )}
                </div>
                <p className={`text-xs mt-2 ${currentStep >= step.number ? 'text-[#FF6B35] font-semibold' : 'text-gray-500'}`}>
                  {step.title}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={(e) => e.preventDefault()}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStep6()}

          {/* Navigation Buttons */}
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(t as any).buttons.previous}
            </button>

            <div className="flex gap-3">
              {currentStep < 6 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => Math.min(6, prev + 1))}
                  className="px-6 py-3 bg-[#FF6B35] text-white rounded-lg hover:bg-[#ff8255] transition-colors"
                >
                  {(t as any).buttons.next}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleSubmit('draft')}
                    disabled={saving}
                    className="px-6 py-3 border border-[#FF6B35] text-[#FF6B35] rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50"
                  >
                    <FaSave className="inline mr-2" />
                    {(t as any).buttons.saveAsDraft}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit('active')}
                    disabled={saving}
                    className="px-6 py-3 bg-[#FF6B35] text-white rounded-lg hover:bg-[#ff8255] transition-colors disabled:opacity-50"
                  >
                    <FaSave className="inline mr-2" />
                    {(t as any).buttons.publishListing}
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
        </div>
      </div>
    </GoogleMapsScriptLoader>
  );
}
