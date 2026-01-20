'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { FaMapMarkerAlt, FaSpinner } from 'react-icons/fa';
import axios from 'axios';

interface City {
  id: number;
  name: string;
  nameAr: string;
  wilaya: string;
  wilayaCode: number;
  coordinates: [number, number]; // [lat, lng]
  population: number;
  formatted_address: string;
  display: string;
}

interface CityAutocompleteProps {
  onPlaceSelected: (place: {
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    coordinates: [number, number]; // [lng, lat] MongoDB format
    formattedAddress: string;
  }) => void;
  defaultValue?: string;
  placeholder?: string;
}

export default function CityAutocomplete({
  onPlaceSelected,
  defaultValue = '',
  placeholder = 'Enter city name...'
}: CityAutocompleteProps) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Recherche de villes via l'API locale
  const searchCities = useCallback(async (searchTerm: string) => {
    if (searchTerm.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/cities/search`,
        {
          params: {
            q: searchTerm,
            limit: 10
          }
        }
      );

      if (response.data.status === 'success') {
        setSuggestions(response.data.data.cities);
      }
    } catch (error) {
      console.error('Error searching cities:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce la recherche
  const handleInputChange = (value: string) => {
    setInputValue(value);
    setSelectedIndex(-1);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      searchCities(value);
      setShowDropdown(true);
    }, 300); // 300ms debounce
  };

  // Sélection d'une ville
  const handleCitySelect = (city: City) => {
    setInputValue(city.display);
    setShowDropdown(false);
    setSuggestions([]);

    // Format compatible avec l'ancien système Google Maps
    onPlaceSelected({
      address: {
        street: '', // Pas de rue spécifique pour une ville
        city: city.name,
        state: city.wilaya,
        postalCode: '', // Algérie n'a pas de codes postaux standards
        country: 'Algeria'
      },
      coordinates: [city.coordinates[1], city.coordinates[0]], // MongoDB format [lng, lat]
      formattedAddress: city.formatted_address
    });
  };

  // Navigation au clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleCitySelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSuggestions([]);
        break;
    }
  };

  // Fermer le dropdown en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

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
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] transition-all"
          autoComplete="off"
        />
      </div>

      {/* Dropdown des suggestions */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto"
        >
          {suggestions.map((city, index) => (
            <button
              key={city.id}
              onClick={() => handleCitySelect(city)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-start space-x-3 ${
                index === selectedIndex ? 'bg-gray-100' : ''
              } ${index !== suggestions.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <FaMapMarkerAlt className="h-4 w-4 text-[#FF6B35] mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {city.name}
                </div>
                <div className="text-sm text-gray-600 truncate">
                  {city.wilaya}, Algeria
                </div>
                {city.nameAr && (
                  <div className="text-xs text-gray-500 mt-1" dir="rtl">
                    {city.nameAr}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400 flex-shrink-0">
                {Math.round(city.population / 1000)}K
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Message quand pas de résultats */}
      {showDropdown && !isLoading && inputValue.length >= 2 && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl p-4 text-center text-gray-500">
          No cities found for "{inputValue}"
        </div>
      )}

      <p className="mt-2 text-xs text-gray-500">
        Search for Algerian cities (Wilaya and communes)
      </p>
    </div>
  );
}
