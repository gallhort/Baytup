'use client';

import { useEffect, useRef, useState } from 'react';
import { FaMapMarkerAlt, FaSpinner } from 'react-icons/fa';

interface GoogleMapsAutocompleteProps {
  onPlaceSelected: (place: {
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    coordinates: [number, number];
    formattedAddress: string;
  }) => void;
  defaultValue?: string;
  placeholder?: string;
}

export default function GoogleMapsAutocomplete({
  onPlaceSelected,
  defaultValue = '',
  placeholder = 'Enter address or location...'
}: GoogleMapsAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAutocomplete = () => {
      try {
        if (!window.google || !window.google.maps || !window.google.maps.places) {
          setError('Google Maps API not loaded');
          setIsLoading(false);
          return;
        }

        if (!inputRef.current) {
          return;
        }

        // Initialize autocomplete with Algeria and neighboring countries
        // Note: Use 'geocode' type only - 'address' cannot be mixed with other types
        // 'geocode' covers all address types: streets, cities, localities, postal codes
        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['geocode'],
          componentRestrictions: { country: ['dz', 'fr', 'ma', 'tn'] }, // Algeria, France, Morocco, Tunisia
          fields: ['address_components', 'formatted_address', 'geometry', 'name']
        });

        // Add place_changed listener
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();

          if (!place || !place.geometry || !place.geometry.location) {
            setError('Please select a valid location from the dropdown');
            return;
          }

          setError(null);

          // Extract address components
          const addressComponents = place.address_components || [];
          const address = {
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: ''
          };

          // Parse address components
          addressComponents.forEach((component) => {
            const types = component.types;

            if (types.includes('street_number')) {
              address.street = component.long_name + ' ';
            }
            if (types.includes('route')) {
              address.street += component.long_name;
            }
            if (types.includes('locality')) {
              address.city = component.long_name;
            }
            if (types.includes('administrative_area_level_1')) {
              address.state = component.long_name;
            }
            if (types.includes('postal_code')) {
              address.postalCode = component.long_name;
            }
            if (types.includes('country')) {
              address.country = component.long_name;
            }
          });

          // Get coordinates (longitude, latitude)
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const coordinates: [number, number] = [lng, lat]; // MongoDB GeoJSON format [longitude, latitude]

          // If street is empty, use the place name
          if (!address.street.trim() && place.name) {
            address.street = place.name;
          }

          // If city is still empty, try to get from administrative_area_level_2
          if (!address.city) {
            const area2 = addressComponents.find(c => c.types.includes('administrative_area_level_2'));
            if (area2) {
              address.city = area2.long_name;
            }
          }

          onPlaceSelected({
            address,
            coordinates,
            formattedAddress: place.formatted_address || ''
          });
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing autocomplete:', err);
        setError('Failed to initialize location search');
        setIsLoading(false);
      }
    };

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      initAutocomplete();
    } else {
      // Wait for Google Maps to load
      const checkGoogleMaps = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          clearInterval(checkGoogleMaps);
          initAutocomplete();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkGoogleMaps);
        if (!window.google || !window.google.maps) {
          setError('Google Maps failed to load');
          setIsLoading(false);
        }
      }, 10000);
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onPlaceSelected]);

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {isLoading ? (
            <FaSpinner className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <FaMapMarkerAlt className="h-5 w-5 text-[#FF6B35]" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          defaultValue={defaultValue}
          placeholder={placeholder}
          disabled={isLoading}
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      {isLoading && (
        <p className="mt-2 text-sm text-gray-500">Loading location search...</p>
      )}
      <p className="mt-2 text-xs text-gray-500">
        Start typing to search for an address or location
      </p>
    </div>
  );
}
