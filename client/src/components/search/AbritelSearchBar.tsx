'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Search, MapPin, Calendar, Users, ChevronDown, X } from 'lucide-react';
import { useClickAway } from 'react-use';

interface AbritelSearchBarProps {
  location?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  onSearch?: (data: SearchData) => void;
  onLocationChange?: (location: string) => void;
  onDatesChange?: (checkIn: string, checkOut: string) => void;
  onGuestsChange?: (guests: number) => void;
}

interface SearchData {
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

// Simple calendar component
const CalendarPicker = ({
  checkIn,
  checkOut,
  onSelect,
  onClose
}: {
  checkIn: string;
  checkOut: string;
  onSelect: (dates: { checkIn: string; checkOut: string }) => void;
  onClose: () => void;
}) => {
  const [selectedCheckIn, setSelectedCheckIn] = useState<Date | null>(
    checkIn ? new Date(checkIn) : null
  );
  const [selectedCheckOut, setSelectedCheckOut] = useState<Date | null>(
    checkOut ? new Date(checkOut) : null
  );
  const [isSelectingCheckOut, setIsSelectingCheckOut] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add the days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isDateInRange = (date: Date) => {
    if (!selectedCheckIn || !selectedCheckOut) return false;
    return date >= selectedCheckIn && date <= selectedCheckOut;
  };

  const isDateSelected = (date: Date) => {
    if (selectedCheckIn && date.getTime() === selectedCheckIn.getTime()) return 'checkin';
    if (selectedCheckOut && date.getTime() === selectedCheckOut.getTime()) return 'checkout';
    return false;
  };

  const handleDateClick = (date: Date) => {
    if (date < today) return;

    if (!selectedCheckIn || (selectedCheckIn && selectedCheckOut)) {
      setSelectedCheckIn(date);
      setSelectedCheckOut(null);
      setIsSelectingCheckOut(true);
    } else if (isSelectingCheckOut) {
      if (date >= selectedCheckIn) {
        setSelectedCheckOut(date);
        setIsSelectingCheckOut(false);
        onSelect({
          checkIn: selectedCheckIn.toISOString().split('T')[0],
          checkOut: date.toISOString().split('T')[0]
        });
      } else {
        setSelectedCheckIn(date);
        setSelectedCheckOut(null);
      }
    }
  };

  const renderMonth = (monthDate: Date) => {
    const days = getDaysInMonth(monthDate);

    return (
      <div className="flex-1 min-w-[280px]">
        <div className="text-center mb-3">
          <h3 className="text-base font-semibold text-gray-900">
            {months[monthDate.getMonth()]} {monthDate.getFullYear()}
          </h3>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {daysOfWeek.map(day => (
            <div key={day} className="p-2 text-center text-xs font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            if (!date) {
              return <div key={index} className="p-2"></div>;
            }

            const isPast = date < today;
            const selected = isDateSelected(date);
            const inRange = isDateInRange(date);

            return (
              <button
                key={date.getTime()}
                onClick={() => handleDateClick(date)}
                disabled={isPast}
                className={`
                  p-2 text-sm font-medium rounded-full transition-all duration-200
                  ${isPast ? 'text-gray-300 cursor-not-allowed' : 'text-gray-900 hover:bg-gray-100 cursor-pointer'}
                  ${selected ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
                  ${inRange && !selected ? 'bg-gray-100' : ''}
                  ${date.getTime() === today.getTime() ? 'ring-1 ring-gray-900' : ''}
                `}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const currentMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth());
  const nextMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);

  return (
    <div className="p-6">
      <div className="flex gap-6 mb-6">
        {renderMonth(currentMonthDate)}
        {renderMonth(nextMonthDate)}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          onClick={() => {
            setSelectedCheckIn(null);
            setSelectedCheckOut(null);
            onSelect({ checkIn: '', checkOut: '' });
          }}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 underline"
        >
          Effacer les dates
        </button>

        <button
          onClick={onClose}
          className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

// Guest selector component
const GuestSelector = ({
  guests,
  onGuestsChange,
  onClose
}: {
  guests: number;
  onGuestsChange: (guests: number) => void;
  onClose: () => void;
}) => {
  const [adults, setAdults] = useState(guests || 1);
  const [children, setChildren] = useState(0);

  const handleApply = () => {
    onGuestsChange(adults + children);
    onClose();
  };

  return (
    <div className="p-6 w-80">
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900">Adultes</div>
            <div className="text-sm text-gray-500">13 ans et plus</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAdults(Math.max(1, adults - 1))}
              disabled={adults <= 1}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              −
            </button>
            <span className="w-8 text-center font-medium">{adults}</span>
            <button
              onClick={() => setAdults(adults + 1)}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-900 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900">Enfants</div>
            <div className="text-sm text-gray-500">De 2 à 12 ans</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setChildren(Math.max(0, children - 1))}
              disabled={children <= 0}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              −
            </button>
            <span className="w-8 text-center font-medium">{children}</span>
            <button
              onClick={() => setChildren(children + 1)}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-900 transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end pt-4 border-t border-gray-200">
        <button
          onClick={handleApply}
          className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Appliquer
        </button>
      </div>
    </div>
  );
};

export default function AbritelSearchBar({
  location = '',
  checkIn = '',
  checkOut = '',
  guests = 1,
  onSearch,
  onLocationChange,
  onDatesChange,
  onGuestsChange
}: AbritelSearchBarProps) {
  const [activeField, setActiveField] = useState<string | null>(null);
  const [localLocation, setLocalLocation] = useState(location);
  const [localCheckIn, setLocalCheckIn] = useState(checkIn);
  const [localCheckOut, setLocalCheckOut] = useState(checkOut);
  const [localGuests, setLocalGuests] = useState(guests);

  const searchBarRef = useRef<HTMLDivElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const datesDropdownRef = useRef<HTMLDivElement>(null);
  const guestsDropdownRef = useRef<HTMLDivElement>(null);

  useClickAway(locationDropdownRef, () => {
    if (activeField === 'location') setActiveField(null);
  });

  useClickAway(datesDropdownRef, () => {
    if (activeField === 'dates') setActiveField(null);
  });

  useClickAway(guestsDropdownRef, () => {
    if (activeField === 'guests') setActiveField(null);
  });

  const formatDateRange = () => {
    if (!localCheckIn || !localCheckOut) return 'Sélectionner des dates';

    const checkInDate = new Date(localCheckIn);
    const checkOutDate = new Date(localCheckOut);

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    };

    const checkInFormatted = checkInDate.toLocaleDateString('fr-FR', options);
    const checkOutFormatted = checkOutDate.toLocaleDateString('fr-FR', options);

    return `${checkInFormatted} - ${checkOutFormatted}`;
  };

  const handleSearch = useCallback(() => {
    if (onSearch) {
      onSearch({
        location: localLocation,
        checkIn: localCheckIn,
        checkOut: localCheckOut,
        guests: localGuests
      });
    }
  }, [localLocation, localCheckIn, localCheckOut, localGuests, onSearch]);

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-6 py-4">
        {/* Abritel-style horizontal search bar */}
        <div className="flex items-center gap-0 bg-white border border-gray-300 rounded-full shadow-md max-w-4xl">
          {/* Location Field */}
          <div className="relative flex-1" ref={locationDropdownRef}>
            <button
              onClick={() => setActiveField(activeField === 'location' ? null : 'location')}
              className={`w-full text-left px-6 py-3 rounded-l-full transition-all ${
                activeField === 'location' ? 'bg-gray-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-700 mb-0.5">
                    Où allez-vous ?
                  </div>
                  <div className="text-sm text-gray-900 truncate">
                    {localLocation || 'Rechercher une destination'}
                  </div>
                </div>
              </div>
            </button>

            {/* Location dropdown */}
            {activeField === 'location' && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 w-96">
                <div className="p-4">
                  <input
                    type="text"
                    value={localLocation}
                    onChange={(e) => {
                      setLocalLocation(e.target.value);
                      onLocationChange?.(e.target.value);
                    }}
                    placeholder="Ville, région..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                    autoFocus
                  />
                  <div className="mt-3 text-sm text-gray-500">
                    Entrez une destination pour rechercher
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-300" />

          {/* Dates Field */}
          <div className="relative flex-1" ref={datesDropdownRef}>
            <button
              onClick={() => setActiveField(activeField === 'dates' ? null : 'dates')}
              className={`w-full text-left px-6 py-3 transition-all ${
                activeField === 'dates' ? 'bg-gray-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-700 mb-0.5">
                    Dates
                  </div>
                  <div className="text-sm text-gray-900 truncate">
                    {formatDateRange()}
                  </div>
                </div>
              </div>
            </button>

            {/* Dates dropdown */}
            {activeField === 'dates' && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
                <CalendarPicker
                  checkIn={localCheckIn}
                  checkOut={localCheckOut}
                  onSelect={(dates) => {
                    setLocalCheckIn(dates.checkIn);
                    setLocalCheckOut(dates.checkOut);
                    onDatesChange?.(dates.checkIn, dates.checkOut);
                    setActiveField(null);
                  }}
                  onClose={() => setActiveField(null)}
                />
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-300" />

          {/* Guests Field */}
          <div className="relative flex-1" ref={guestsDropdownRef}>
            <button
              onClick={() => setActiveField(activeField === 'guests' ? null : 'guests')}
              className={`w-full text-left px-6 py-3 transition-all ${
                activeField === 'guests' ? 'bg-gray-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-700 mb-0.5">
                    Voyageurs
                  </div>
                  <div className="text-sm text-gray-900 truncate">
                    {localGuests} {localGuests === 1 ? 'personne' : 'personnes'}
                  </div>
                </div>
              </div>
            </button>

            {/* Guests dropdown */}
            {activeField === 'guests' && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
                <GuestSelector
                  guests={localGuests}
                  onGuestsChange={(newGuests) => {
                    setLocalGuests(newGuests);
                    onGuestsChange?.(newGuests);
                  }}
                  onClose={() => setActiveField(null)}
                />
              </div>
            )}
          </div>

          {/* Search Button */}
          <div className="pr-2">
            <button
              onClick={handleSearch}
              className="bg-[#FF6B35] hover:bg-[#F7931E] text-white p-3 rounded-full transition-all duration-200 hover:scale-105 shadow-md"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
