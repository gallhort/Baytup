'use client';

import React, { useState } from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';

interface HorizontalFilterChipsProps {
  onFiltersClick: () => void;
  activeFiltersCount?: number;
  sortValue?: string;
  onSortChange?: (value: string) => void;
  searchOnMapMove?: boolean;
  onSearchOnMapMoveChange?: (value: boolean) => void;
}

export default function HorizontalFilterChips({
  onFiltersClick,
  activeFiltersCount = 0,
  sortValue = 'recommended',
  onSortChange,
  searchOnMapMove = false,
  onSearchOnMapMoveChange
}: HorizontalFilterChipsProps) {
  const [showSortMenu, setShowSortMenu] = useState(false);

  const sortOptions = [
    { value: 'recommended', label: 'Recommandés' },
    { value: 'price_low', label: 'Prix croissant' },
    { value: 'price_high', label: 'Prix décroissant' },
    { value: 'rating', label: 'Meilleures notes' },
  ];

  const currentSortLabel = sortOptions.find(opt => opt.value === sortValue)?.label || 'Trier par';

  return (
    <div className="flex items-center gap-2 py-3 overflow-x-auto hide-scrollbar">
      {/* Filtres button */}
      <button
        onClick={onFiltersClick}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-all duration-200 whitespace-nowrap ${
          activeFiltersCount > 0
            ? 'border-gray-900 bg-gray-900 text-white'
            : 'border-gray-300 bg-white hover:border-gray-900'
        }`}
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span className="font-medium">Filtres</span>
        {activeFiltersCount > 0 && (
          <span className="bg-white text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {/* Trier par dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowSortMenu(!showSortMenu)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-gray-300 bg-white hover:border-gray-900 transition-all duration-200 whitespace-nowrap"
        >
          <span className="font-medium">{currentSortLabel}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
        </button>

        {/* Sort dropdown menu */}
        {showSortMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowSortMenu(false)}
            />
            <div className="absolute top-full mt-2 left-0 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 min-w-[200px] z-20">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onSortChange?.(option.value);
                    setShowSortMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                    sortValue === option.value ? 'bg-gray-100 font-semibold' : ''
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Checkbox: Rechercher lorsque je déplace la carte */}
      <label className="flex items-center gap-2 px-3 py-2 cursor-pointer whitespace-nowrap text-sm text-gray-700 hover:text-gray-900 transition-colors">
        <input
          type="checkbox"
          checked={searchOnMapMove}
          onChange={(e) => onSearchOnMapMoveChange?.(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35] cursor-pointer"
        />
        <span className="font-medium">Rechercher lorsque je déplace la carte</span>
      </label>
    </div>
  );
}
