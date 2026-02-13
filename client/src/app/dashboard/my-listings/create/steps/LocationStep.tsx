'use client';

import { useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Navigation, Search, Loader2 } from 'lucide-react';
import CityAutocomplete from '@/components/listing/CityAutocomplete';
import { useLanguage } from '@/contexts/LanguageContext';
import { CreateListingFormData } from '../types';

const LeafletLocationPicker = dynamic(
  () => import('@/components/listing/LeafletLocationPicker'),
  { ssr: false }
);

interface Props {
  formData: CreateListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<CreateListingFormData>>;
  t: any;
}

export default function LocationStep({ formData, setFormData, t }: Props) {
  const { language } = useLanguage();
  const nominatimLang = language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en';
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressResults, setAddressResults] = useState<any[]>([]);

  const mapCenter = useMemo(() => {
    const [lng, lat] = formData.location.coordinates;
    if (lat !== 0 || lng !== 0) return { lat, lng };
    return { lat: 36.7538, lng: 3.0588 }; // Algiers default
  }, [formData.location.coordinates]);

  const mapZoom = useMemo(() => {
    const [lng, lat] = formData.location.coordinates;
    if (lat !== 0 || lng !== 0) return 16;
    return 6;
  }, [formData.location.coordinates]);

  const handlePlaceSelected = (place: any) => {
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        city: place.address.city,
        state: place.address.state,
        postalCode: place.address.postalCode || '',
        country: place.address.country || 'Algeria',
      },
      location: {
        type: 'Point',
        coordinates: place.coordinates,
      },
    }));
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  const handleLocationChange = async (loc: { lat: number; lng: number; address?: string }) => {
    setFormData(prev => ({
      ...prev,
      location: {
        type: 'Point',
        coordinates: [loc.lng, loc.lat],
      },
    }));

    // Reverse geocode to fill address when user clicks/drags on map
    try {
      const res = await fetch(
        `${apiUrl}/geocode/reverse?lat=${loc.lat}&lon=${loc.lng}&lang=${nominatimLang}`
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        setFormData(prev => ({
          ...prev,
          address: {
            ...prev.address,
            street: [addr.road, addr.house_number].filter(Boolean).join(' ') || prev.address.street,
            city: addr.city || addr.town || addr.village || prev.address.city,
            state: addr.state || prev.address.state,
            postalCode: addr.postcode || prev.address.postalCode,
            country: addr.country || 'Algeria',
          },
        }));
      }
    } catch {
      // Ignore reverse geocode errors
    }
  };

  // Option B: Use browser GPS
  const handleUseMyPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError(t.location?.geoNotSupported || 'Geolocation is not supported by your browser');
      return;
    }

    setGeoLoading(true);
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Update coordinates
        setFormData(prev => ({
          ...prev,
          location: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
        }));

        // Reverse geocode to fill in address
        try {
          const res = await fetch(
            `${apiUrl}/geocode/reverse?lat=${latitude}&lon=${longitude}&lang=${nominatimLang}`
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            setFormData(prev => ({
              ...prev,
              address: {
                ...prev.address,
                street: [addr.road, addr.house_number].filter(Boolean).join(' ') || prev.address.street,
                city: addr.city || addr.town || addr.village || prev.address.city,
                state: addr.state || prev.address.state,
                postalCode: addr.postcode || prev.address.postalCode,
                country: addr.country || 'Algeria',
              },
            }));
          }
        } catch {
          // Ignore reverse geocode errors - coordinates are still set
        }

        setGeoLoading(false);
      },
      (error) => {
        setGeoLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError(t.location?.geoPermissionDenied || 'Location permission denied. Please allow access in your browser settings.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError(t.location?.geoUnavailable || 'Position unavailable. Try again.');
            break;
          default:
            setGeoError(t.location?.geoError || 'Could not get your position. Try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [setFormData, t]);

  // Option C: Search address with Nominatim
  const handleAddressSearch = useCallback(async () => {
    if (!addressQuery.trim() || addressQuery.trim().length < 3) return;

    setAddressLoading(true);
    setAddressResults([]);

    try {
      const res = await fetch(
        `${apiUrl}/geocode/search?q=${encodeURIComponent(addressQuery.trim())}&lang=${nominatimLang}`
      );

      if (res.ok) {
        const data = await res.json();
        setAddressResults(data);
      }
    } catch {
      // Ignore search errors
    }

    setAddressLoading(false);
  }, [addressQuery]);

  const handleSelectAddress = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const addr = result.address || {};

    setFormData(prev => ({
      ...prev,
      location: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      address: {
        ...prev.address,
        street: [addr.road, addr.house_number].filter(Boolean).join(' ') || prev.address.street,
        city: addr.city || addr.town || addr.village || prev.address.city,
        state: addr.state || prev.address.state,
        postalCode: addr.postcode || prev.address.postalCode,
        country: addr.country || 'Algeria',
      },
    }));

    setAddressResults([]);
    setAddressQuery('');
  };

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
        {t.location?.title || 'Where is it located?'}
      </h1>
      <p className="text-lg text-gray-500 mb-8">
        {t.location?.subtitle || 'Guests will only get the exact address once they book.'}
      </p>

      {/* City Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t.location?.city || 'City'}
        </label>
        <CityAutocomplete
          onPlaceSelected={handlePlaceSelected}
          defaultValue={formData.address.city}
          placeholder={t.location?.cityPlaceholder || 'Search for a city...'}
        />
      </div>

      {/* Street Address */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t.location?.street || 'Street address'}
        </label>
        <input
          type="text"
          value={formData.address.street}
          onChange={e => {
            setFormData(prev => ({
              ...prev,
              address: { ...prev.address, street: e.target.value },
            }));
          }}
          placeholder={t.location?.streetPlaceholder || 'e.g. 23 Rue Didouche Mourad'}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] outline-none text-base"
        />
      </div>

      {/* City/State info */}
      {formData.address.city && (
        <div className="mb-6 flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {t.location?.city || 'City'}
            </label>
            <p className="text-base font-medium text-gray-900">{formData.address.city}</p>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {t.location?.state || 'Wilaya'}
            </label>
            <p className="text-base font-medium text-gray-900">{formData.address.state}</p>
          </div>
        </div>
      )}

      {/* GPS + Address Search buttons */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        {/* Use my GPS position */}
        <button
          type="button"
          onClick={handleUseMyPosition}
          disabled={geoLoading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-700 font-medium text-sm hover:bg-blue-100 hover:border-blue-300 transition-all disabled:opacity-50"
        >
          {geoLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          {t.location?.useMyPosition || 'Use my GPS position'}
        </button>
      </div>

      {geoError && (
        <p className="text-sm text-red-500 mb-4">{geoError}</p>
      )}

      {/* Address search (Nominatim) */}
      <div className="mb-4 relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t.location?.searchAddress || 'Search an address'}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={addressQuery}
              onChange={e => setAddressQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddressSearch(); } }}
              placeholder={t.location?.searchAddressPlaceholder || 'e.g. 23 Rue Didouche Mourad, Alger'}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] outline-none text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleAddressSearch}
            disabled={addressLoading || addressQuery.trim().length < 3}
            className="px-4 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {addressLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (t.location?.search || 'Search')}
          </button>
        </div>

        {/* Search results dropdown */}
        {addressResults.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {addressResults.map((result, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectAddress(result)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#FF6B35] mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 line-clamp-2">{result.display_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-gray-200">
        <LeafletLocationPicker
          center={mapCenter}
          onLocationChange={handleLocationChange}
          zoom={mapZoom}
        />
      </div>
      <p className="text-sm text-gray-400 mt-2">
        {t.location?.mapHint || 'Click on the map or drag the marker to set the exact location.'}
      </p>
    </div>
  );
}
