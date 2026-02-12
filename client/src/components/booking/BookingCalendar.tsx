'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  MapPin, Home, Car, Clock, Users, DollarSign, Eye, X
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

// ✅ CORRECTION: listing peut être null
interface Booking {
  _id: string;
  listing: {
    _id: string;
    title: string;
    category: string;
    subcategory: string;
    images: { url: string; isPrimary?: boolean }[];
    address: {
      city: string;
      state: string;
      country: string;
      street?: string;
    };
    pricing: {
      basePrice: number;
      currency: string;
    };
  } | null; // ✅ Peut être null
  guest: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    email?: string;
    phone?: string;
  };
  host: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    email?: string;
    phone?: string;
  };
  startDate: string;
  endDate: string;
  checkInTime: string;
  checkOutTime: string;
  status: string;
  pricing: {
    totalAmount: number;
    nights: number;
    currency: string;
    basePrice?: number;
    subtotal?: number;
    cleaningFee?: number;
    serviceFee?: number;
    taxes?: number;
  };
  guestCount: {
    adults: number;
    children: number;
    infants: number;
  };
  payment: {
    status: string;
    method: string;
    transactionId?: string;
    paidAt?: string;
  };
  createdAt: string;
  specialRequests?: string;
  hostMessage?: string;
  guestReview?: {
    _id: string;
    rating: { overall: number };
    comment: string;
    status: string;
  };
  hostReview?: {
    _id: string;
    rating: { overall: number };
    comment: string;
    status: string;
  };
}

interface BookingCalendarProps {
  bookings: Booking[];
  onBookingClick?: (booking: Booking) => void;
  view?: 'month' | 'week';
  initialDate?: Date;
}

export default function BookingCalendar({
  bookings,
  onBookingClick,
  view = 'month',
  initialDate = new Date()
}: BookingCalendarProps) {
  const t = useTranslation('bookings');
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Get the first day of the current month
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  // Get the day of week for the first day (0 = Sunday, 6 = Saturday)
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Total days in month
  const daysInMonth = lastDayOfMonth.getDate();

  // Days from previous month to show
  const daysFromPrevMonth = startingDayOfWeek;

  // Days from next month to show
  const totalCells = Math.ceil((daysInMonth + daysFromPrevMonth) / 7) * 7;
  const daysFromNextMonth = totalCells - (daysInMonth + daysFromPrevMonth);

  // Helper function to format date as YYYY-MM-DD in local timezone
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to parse date string to local Date object
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // ✅ CORRECTION: Filtrer les bookings avec listing null
  const validBookings = useMemo(() => {
    return bookings.filter(booking => booking.listing !== null);
  }, [bookings]);

  // Get bookings for a specific date
  const getBookingsForDate = (date: Date): Booking[] => {
    const dateStr = formatDateLocal(date);
    return validBookings.filter(booking => {
      const start = formatDateLocal(parseLocalDate(booking.startDate));
      const end = formatDateLocal(parseLocalDate(booking.endDate));
      return dateStr >= start && dateStr <= end;
    });
  };

  // Check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Check if a booking starts on this date
  const isBookingStart = (booking: Booking, date: Date): boolean => {
    const bookingStart = formatDateLocal(parseLocalDate(booking.startDate));
    const checkDate = formatDateLocal(date);
    return bookingStart === checkDate;
  };

  // Check if a booking ends on this date
  const isBookingEnd = (booking: Booking, date: Date): boolean => {
    const bookingEnd = formatDateLocal(parseLocalDate(booking.endDate));
    const checkDate = formatDateLocal(date);
    return bookingEnd === checkDate;
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    // Previous month days
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      days.push({
        date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthDays - i),
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i),
        isCurrentMonth: true
      });
    }

    // Next month days
    for (let i = 1; i <= daysFromNextMonth; i++) {
      days.push({
        date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  }, [currentDate, daysInMonth, daysFromPrevMonth, daysFromNextMonth]);

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-500',
      'pending_payment': 'bg-orange-500',
      'confirmed': 'bg-blue-500',
      'paid': 'bg-green-500',
      'active': 'bg-green-600',
      'completed': 'bg-gray-500',
      'cancelled_by_guest': 'bg-red-500',
      'cancelled_by_host': 'bg-red-600',
      'expired': 'bg-red-700'
    };
    return colors[status] || 'bg-gray-400';
  };

  // Format price
  const formatPrice = (amount: number, currency: string) => {
    if (currency === 'DZD') {
      return `${amount.toLocaleString('fr-FR')} DA`;
    }
    return `€${amount.toLocaleString('fr-FR')}`;
  };

  // Format month/year
  const formatMonthYear = () => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Calendar Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#FF6B35] to-[#F7931E]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CalendarIcon className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">{formatMonthYear()}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition text-sm font-medium"
            >
              {(t as any)?.calendar?.today || 'Today'}
            </button>
            <button
              onClick={goToPreviousMonth}
              className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Names Header */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center py-2">
              <span className="text-sm font-semibold text-gray-700">{day}</span>
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => {
            const dayBookings = getBookingsForDate(day.date);
            const dateStr = day.date.toISOString().split('T')[0];
            const isHovered = hoveredDate === dateStr;

            return (
              <div
                key={index}
                className={`
                  min-h-[120px] p-2 border rounded-lg transition-all
                  ${day.isCurrentMonth ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}
                  ${isToday(day.date) ? 'ring-2 ring-[#FF6B35] ring-offset-2' : ''}
                  ${isHovered ? 'shadow-lg scale-105 z-10' : 'hover:shadow-md'}
                  ${dayBookings.length > 0 ? 'cursor-pointer' : ''}
                `}
                onMouseEnter={() => setHoveredDate(dateStr)}
                onMouseLeave={() => setHoveredDate(null)}
              >
                {/* Date Number */}
                <div className={`
                  text-sm font-semibold mb-2 flex items-center justify-between
                  ${!day.isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}
                  ${isToday(day.date) ? 'text-[#FF6B35]' : ''}
                `}>
                  <span>{day.date.getDate()}</span>
                  {dayBookings.length > 0 && (
                    <span className="text-xs bg-[#FF6B35] text-white rounded-full px-2 py-0.5">
                      {dayBookings.length}
                    </span>
                  )}
                </div>

                {/* Bookings for this day */}
                <div className="space-y-1">
                  {dayBookings.slice(0, 3).map((booking, idx) => {
                    // ✅ CORRECTION: Vérification supplémentaire (normalement pas nécessaire car déjà filtré)
                    if (!booking.listing) return null;

                    const isStart = isBookingStart(booking, day.date);
                    const isEnd = isBookingEnd(booking, day.date);

                    return (
                      <div
                        key={booking._id + idx}
                        onClick={() => onBookingClick?.(booking)}
                        className={`
                          text-xs p-1.5 rounded cursor-pointer transition-all
                          ${getStatusColor(booking.status)} text-white
                          hover:scale-105 hover:shadow-md
                          ${isStart ? 'rounded-l-full pl-2' : ''}
                          ${isEnd ? 'rounded-r-full pr-2' : ''}
                        `}
                        title={booking.listing.title}
                      >
                        <div className="flex items-center gap-1 truncate">
                          {booking.listing.category === 'stay' ? (
                            <Home className="w-3 h-3 flex-shrink-0" />
                          ) : (
                            <Car className="w-3 h-3 flex-shrink-0" />
                          )}
                          <span className="truncate font-medium">
                            {booking.listing.title.length > 15
                              ? booking.listing.title.substring(0, 15) + '...'
                              : booking.listing.title}
                          </span>
                        </div>
                        {isStart && (
                          <div className="text-[10px] opacity-90 mt-0.5">
                            <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                            {booking.checkInTime}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Show "more" indicator if there are more bookings */}
                  {dayBookings.length > 3 && (
                    <div className="text-[10px] text-gray-500 text-center py-1 bg-gray-100 rounded cursor-pointer hover:bg-gray-200">
                      +{dayBookings.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-semibold text-gray-700">{(t as any)?.calendar?.legend || 'Legend:'}  </span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-gray-600">{(t as any)?.status?.pending || 'Pending'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-gray-600">{(t as any)?.status?.confirmed || 'Confirmed'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-600">{(t as any)?.status?.paid || 'Paid'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-600 rounded"></div>
            <span className="text-gray-600">{(t as any)?.status?.active || 'Active'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded"></div>
            <span className="text-gray-600">{(t as any)?.status?.completed || 'Completed'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}