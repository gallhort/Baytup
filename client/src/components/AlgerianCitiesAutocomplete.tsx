'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Search, X } from 'lucide-react';

// 48 WILAYAS D'ALGÉRIE avec coordonnées exactes
export const ALGERIAN_CITIES = [
  // WILAYA 01-10
  { id: 1, name: 'Adrar', nameAr: 'أدرار', nameFr: 'Adrar', coordinates: { lat: 27.8742, lng: 0.2841 }, region: 'Sud' },
  { id: 2, name: 'Chlef', nameAr: 'الشلف', nameFr: 'Chlef', coordinates: { lat: 36.1647, lng: 1.3347 }, region: 'Nord' },
  { id: 3, name: 'Laghouat', nameAr: 'الأغواط', nameFr: 'Laghouat', coordinates: { lat: 33.8069, lng: 2.8636 }, region: 'Sud' },
  { id: 4, name: 'Oum El Bouaghi', nameAr: 'أم البواقي', nameFr: 'Oum El Bouaghi', coordinates: { lat: 35.8753, lng: 7.1133 }, region: 'Est' },
  { id: 5, name: 'Batna', nameAr: 'باتنة', nameFr: 'Batna', coordinates: { lat: 35.5559, lng: 6.1741 }, region: 'Est' },
  { id: 6, name: 'Béjaïa', nameAr: 'بجاية', nameFr: 'Béjaïa', coordinates: { lat: 36.7525, lng: 5.0556 }, region: 'Est' },
  { id: 7, name: 'Biskra', nameAr: 'بسكرة', nameFr: 'Biskra', coordinates: { lat: 34.8503, lng: 5.7244 }, region: 'Sud' },
  { id: 8, name: 'Béchar', nameAr: 'بشار', nameFr: 'Béchar', coordinates: { lat: 31.6167, lng: -2.2167 }, region: 'Sud' },
  { id: 9, name: 'Blida', nameAr: 'البليدة', nameFr: 'Blida', coordinates: { lat: 36.4703, lng: 2.8277 }, region: 'Centre' },
  { id: 10, name: 'Bouira', nameAr: 'البويرة', nameFr: 'Bouira', coordinates: { lat: 36.3689, lng: 3.9014 }, region: 'Centre' },

  // WILAYA 11-20
  { id: 11, name: 'Tamanrasset', nameAr: 'تمنراست', nameFr: 'Tamanrasset', coordinates: { lat: 22.7850, lng: 5.5228 }, region: 'Sud' },
  { id: 12, name: 'Tébessa', nameAr: 'تبسة', nameFr: 'Tébessa', coordinates: { lat: 35.4041, lng: 8.1244 }, region: 'Est' },
  { id: 13, name: 'Tlemcen', nameAr: 'تلمسان', nameFr: 'Tlemcen', coordinates: { lat: 34.8781, lng: -1.3150 }, region: 'Ouest' },
  { id: 14, name: 'Tiaret', nameAr: 'تيارت', nameFr: 'Tiaret', coordinates: { lat: 35.3711, lng: 1.3228 }, region: 'Ouest' },
  { id: 15, name: 'Tizi Ouzou', nameAr: 'تيزي وزو', nameFr: 'Tizi Ouzou', coordinates: { lat: 36.7117, lng: 4.0497 }, region: 'Centre' },
  { id: 16, name: 'Algiers', nameAr: 'الجزائر', nameFr: 'Alger', coordinates: { lat: 36.7538, lng: 3.0588 }, region: 'Centre' },
  { id: 17, name: 'Djelfa', nameAr: 'الجلفة', nameFr: 'Djelfa', coordinates: { lat: 34.6703, lng: 3.2500 }, region: 'Sud' },
  { id: 18, name: 'Jijel', nameAr: 'جيجل', nameFr: 'Jijel', coordinates: { lat: 36.8200, lng: 5.7667 }, region: 'Est' },
  { id: 19, name: 'Sétif', nameAr: 'سطيف', nameFr: 'Sétif', coordinates: { lat: 36.1900, lng: 5.4100 }, region: 'Est' },
  { id: 20, name: 'Saïda', nameAr: 'سعيدة', nameFr: 'Saïda', coordinates: { lat: 34.8417, lng: 0.1500 }, region: 'Ouest' },

  // WILAYA 21-30
  { id: 21, name: 'Skikda', nameAr: 'سكيكدة', nameFr: 'Skikda', coordinates: { lat: 36.8761, lng: 6.9094 }, region: 'Est' },
  { id: 22, name: 'Sidi Bel Abbès', nameAr: 'سيدي بلعباس', nameFr: 'Sidi Bel Abbès', coordinates: { lat: 35.1908, lng: -0.6389 }, region: 'Ouest' },
  { id: 23, name: 'Annaba', nameAr: 'عنابة', nameFr: 'Annaba', coordinates: { lat: 36.9000, lng: 7.7667 }, region: 'Est' },
  { id: 24, name: 'Guelma', nameAr: 'قالمة', nameFr: 'Guelma', coordinates: { lat: 36.4622, lng: 7.4333 }, region: 'Est' },
  { id: 25, name: 'Constantine', nameAr: 'قسنطينة', nameFr: 'Constantine', coordinates: { lat: 36.3650, lng: 6.6147 }, region: 'Est' },
  { id: 26, name: 'Médéa', nameAr: 'المدية', nameFr: 'Médéa', coordinates: { lat: 36.2639, lng: 2.7539 }, region: 'Centre' },
  { id: 27, name: 'Mostaganem', nameAr: 'مستغانم', nameFr: 'Mostaganem', coordinates: { lat: 35.9317, lng: 0.0892 }, region: 'Ouest' },
  { id: 28, name: 'M\'Sila', nameAr: 'المسيلة', nameFr: 'M\'Sila', coordinates: { lat: 35.7017, lng: 4.5417 }, region: 'Centre' },
  { id: 29, name: 'Mascara', nameAr: 'معسكر', nameFr: 'Mascara', coordinates: { lat: 35.3958, lng: 0.1408 }, region: 'Ouest' },
  { id: 30, name: 'Ouargla', nameAr: 'ورقلة', nameFr: 'Ouargla', coordinates: { lat: 31.9492, lng: 5.3347 }, region: 'Sud' },

  // WILAYA 31-40
  { id: 31, name: 'Oran', nameAr: 'وهران', nameFr: 'Oran', coordinates: { lat: 35.6969, lng: -0.6331 }, region: 'Ouest' },
  { id: 32, name: 'El Bayadh', nameAr: 'البيض', nameFr: 'El Bayadh', coordinates: { lat: 33.6833, lng: 1.0167 }, region: 'Sud' },
  { id: 33, name: 'Illizi', nameAr: 'إليزي', nameFr: 'Illizi', coordinates: { lat: 26.5069, lng: 8.4833 }, region: 'Sud' },
  { id: 34, name: 'Bordj Bou Arréridj', nameAr: 'برج بوعريريج', nameFr: 'Bordj Bou Arréridj', coordinates: { lat: 36.0686, lng: 4.7681 }, region: 'Est' },
  { id: 35, name: 'Boumerdès', nameAr: 'بومرداس', nameFr: 'Boumerdès', coordinates: { lat: 36.7667, lng: 3.4833 }, region: 'Centre' },
  { id: 36, name: 'El Tarf', nameAr: 'الطارف', nameFr: 'El Tarf', coordinates: { lat: 36.7639, lng: 8.3139 }, region: 'Est' },
  { id: 37, name: 'Tindouf', nameAr: 'تندوف', nameFr: 'Tindouf', coordinates: { lat: 27.6711, lng: -8.1475 }, region: 'Sud' },
  { id: 38, name: 'Tissemsilt', nameAr: 'تيسمسيلت', nameFr: 'Tissemsilt', coordinates: { lat: 35.6050, lng: 1.8103 }, region: 'Ouest' },
  { id: 39, name: 'El Oued', nameAr: 'الوادي', nameFr: 'El Oued', coordinates: { lat: 33.3686, lng: 6.8675 }, region: 'Sud' },
  { id: 40, name: 'Khenchela', nameAr: 'خنشلة', nameFr: 'Khenchela', coordinates: { lat: 35.4356, lng: 7.1433 }, region: 'Est' },

  // WILAYA 41-48
  { id: 41, name: 'Souk Ahras', nameAr: 'سوق أهراس', nameFr: 'Souk Ahras', coordinates: { lat: 36.2864, lng: 7.9511 }, region: 'Est' },
  { id: 42, name: 'Tipaza', nameAr: 'تيبازة', nameFr: 'Tipaza', coordinates: { lat: 36.5889, lng: 2.4475 }, region: 'Centre' },
  { id: 43, name: 'Mila', nameAr: 'ميلة', nameFr: 'Mila', coordinates: { lat: 36.4503, lng: 6.2647 }, region: 'Est' },
  { id: 44, name: 'Aïn Defla', nameAr: 'عين الدفلى', nameFr: 'Aïn Defla', coordinates: { lat: 36.2647, lng: 1.9708 }, region: 'Centre' },
  { id: 45, name: 'Naâma', nameAr: 'النعامة', nameFr: 'Naâma', coordinates: { lat: 33.2667, lng: -0.3167 }, region: 'Sud' },
  { id: 46, name: 'Aïn Témouchent', nameAr: 'عين تموشنت', nameFr: 'Aïn Témouchent', coordinates: { lat: 35.2992, lng: -1.1392 }, region: 'Ouest' },
  { id: 47, name: 'Ghardaïa', nameAr: 'غرداية', nameFr: 'Ghardaïa', coordinates: { lat: 32.4911, lng: 3.6739 }, region: 'Sud' },
  { id: 48, name: 'Relizane', nameAr: 'غليزان', nameFr: 'Relizane', coordinates: { lat: 35.7372, lng: 0.5558 }, region: 'Ouest' },

  // Villes principales supplémentaires
  { id: 49, name: 'Draria', nameAr: 'دراريا', nameFr: 'Draria', coordinates: { lat: 36.7167, lng: 2.9833 }, region: 'Alger', isCommune: true },
  { id: 50, name: 'Birtouta', nameAr: 'بئر توتة', nameFr: 'Birtouta', coordinates: { lat: 36.6417, lng: 3.0500 }, region: 'Alger', isCommune: true },
  { id: 51, name: 'Zeralda', nameAr: 'زرالدة', nameFr: 'Zeralda', coordinates: { lat: 36.7103, lng: 2.8447 }, region: 'Alger', isCommune: true },
  { id: 52, name: 'Cheraga', nameAr: 'الشراقة', nameFr: 'Cheraga', coordinates: { lat: 36.7667, lng: 2.9833 }, region: 'Alger', isCommune: true },
  { id: 53, name: 'Bab Ezzouar', nameAr: 'باب الزوار', nameFr: 'Bab Ezzouar', coordinates: { lat: 36.7167, lng: 3.1833 }, region: 'Alger', isCommune: true },
  { id: 54, name: 'Rouiba', nameAr: 'الرويبة', nameFr: 'Rouiba', coordinates: { lat: 36.7383, lng: 3.2833 }, region: 'Alger', isCommune: true },
  { id: 55, name: 'Dar El Beïda', nameAr: 'الدار البيضاء', nameFr: 'Dar El Beïda', coordinates: { lat: 36.7133, lng: 3.2167 }, region: 'Alger', isCommune: true },
  { id: 56, name: 'Baraki', nameAr: 'براقي', nameFr: 'Baraki', coordinates: { lat: 36.6667, lng: 3.0833 }, region: 'Alger', isCommune: true },
  { id: 57, name: 'Kouba', nameAr: 'القبة', nameFr: 'Kouba', coordinates: { lat: 36.7267, lng: 3.0650 }, region: 'Alger', isCommune: true },
  { id: 58, name: 'El Harrach', nameAr: 'الحراش', nameFr: 'El Harrach', coordinates: { lat: 36.7167, lng: 3.1333 }, region: 'Alger', isCommune: true },
];

interface AlgerianCitiesAutocompleteProps {
  value: string;
  onChange: (value: string, city?: typeof ALGERIAN_CITIES[0]) => void;
  onCitySelect?: (city: typeof ALGERIAN_CITIES[0]) => void;
  placeholder?: string;
  language?: 'en' | 'fr' | 'ar';
  className?: string;
}

export default function AlgerianCitiesAutocomplete({
  value,
  onChange,
  onCitySelect,
  placeholder = 'Rechercher une ville...',
  language = 'fr',
  className = ''
}: AlgerianCitiesAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCities, setFilteredCities] = useState(ALGERIAN_CITIES);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normaliser texte (enlever accents, minuscules)
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '');
  };

  // Filtrer les villes
  useEffect(() => {
    if (!value || value.length < 2) {
      setFilteredCities(ALGERIAN_CITIES.slice(0, 10)); // Top 10 par défaut
      return;
    }

    const searchTerm = normalizeText(value);
    const filtered = ALGERIAN_CITIES.filter(city => {
      const nameEn = normalizeText(city.name);
      const nameFr = normalizeText(city.nameFr);
      const nameAr = city.nameAr.toLowerCase();
      
      return (
        nameEn.includes(searchTerm) ||
        nameFr.includes(searchTerm) ||
        nameAr.includes(value.toLowerCase()) ||
        nameEn.startsWith(searchTerm) ||
        nameFr.startsWith(searchTerm)
      );
    });

    // Trier: exact match first, puis starts with, puis contains
    filtered.sort((a, b) => {
      const aName = normalizeText(language === 'ar' ? a.nameAr : language === 'fr' ? a.nameFr : a.name);
      const bName = normalizeText(language === 'ar' ? b.nameAr : language === 'fr' ? b.nameFr : b.name);
      
      if (aName === searchTerm) return -1;
      if (bName === searchTerm) return 1;
      if (aName.startsWith(searchTerm)) return -1;
      if (bName.startsWith(searchTerm)) return 1;
      return 0;
    });

    setFilteredCities(filtered.slice(0, 8));
  }, [value, language]);

  const getCityName = (city: typeof ALGERIAN_CITIES[0]) => {
    if (language === 'ar') return city.nameAr;
    if (language === 'fr') return city.nameFr;
    return city.name;
  };

  const handleCityClick = (city: typeof ALGERIAN_CITIES[0]) => {
    const cityName = getCityName(city);
    const fullName = city.isCommune 
      ? `${cityName}, ${city.region}` 
      : `${cityName}, Algérie`;
    
    onChange(fullName, city);
    onCitySelect?.(city);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent outline-none transition-all"
          autoComplete="off"
        />
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {value && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              type="button"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <MapPin className="w-5 h-5 text-[#FF6B35]" />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && filteredCities.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
          {filteredCities.map((city) => (
            <button
              key={city.id}
              onClick={() => handleCityClick(city)}
              className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left flex items-start gap-3 border-b border-gray-50 last:border-b-0"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B35]/10 to-[#F7931E]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-[#FF6B35]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">
                  {getCityName(city)}
                  {city.isCommune && ` • ${city.region}`}
                </div>
                <div className="text-sm text-gray-500">
                  {city.isCommune ? `Commune - ${city.region}` : `Wilaya ${city.id.toString().padStart(2, '0')}`}
                  {city.region && !city.isCommune && ` • ${city.region}`}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && value.length >= 2 && filteredCities.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl p-6 text-center">
          <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <div className="text-sm text-gray-600">Aucune ville trouvée</div>
          <div className="text-xs text-gray-400 mt-1">Essayez un autre nom</div>
        </div>
      )}
    </div>
  );
}