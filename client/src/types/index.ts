// User types
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar: string;
  bio?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  role: 'guest' | 'host' | 'admin';
  language: 'en' | 'fr' | 'ar';
  currency: 'DZD' | 'EUR';
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  hostInfo?: {
    isHost: boolean;
    hostSince?: Date;
    responseRate: number;
    responseTime: number;
    superhost: boolean;
    verifications: {
      identity: boolean;
      email: boolean;
      phone: boolean;
      government: boolean;
    };
  };
  stats: {
    totalBookings: number;
    totalListings: number;
    totalReviews: number;
    averageRating: number;
    totalEarnings: number;
  };
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Listing types
export interface Listing {
  id?: string;
  _id?: string; // MongoDB ObjectId compatibility
  title: string;
  description: string;
  category: 'stay' | 'vehicle';
  subcategory: string;
  host: User | string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode?: string;
    country: string;
  };
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  stayDetails?: {
    stayType: 'apartment' | 'house' | 'villa' | 'studio' | 'room' | 'riad' | 'guesthouse' | 'hotel_room';
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    floor?: number;
    furnished: 'furnished' | 'semi-furnished' | 'unfurnished';
    capacity?: number;
    amenities: string[];
  };
  vehicleDetails?: {
    vehicleType: 'car' | 'motorcycle' | 'truck' | 'van' | 'suv' | 'bus' | 'bicycle' | 'scooter' | 'boat';
    make?: string;
    model?: string;
    year?: number;
    transmission: 'manual' | 'automatic';
    fuelType: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
    seats?: number;
    capacity?: number;
    features: string[];
  };
  pricing: {
    basePrice: number;
    currency: 'DZD' | 'EUR';
    pricingType: 'per_night' | 'per_day' | 'per_week' | 'per_month' | 'per_hour';
    cleaningFee: number;
    serviceFee: number;
    securityDeposit: number;
    convertedPrice?: number;
  };
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
  rules: {
    smoking: 'allowed' | 'not_allowed';
    pets: 'allowed' | 'not_allowed';
    parties: 'allowed' | 'not_allowed';
    children: 'allowed' | 'not_allowed';
    additionalRules: string[];
  };
  images: (string | {
    url: string;
    caption?: string;
    isPrimary: boolean;
  })[];
  status: 'draft' | 'pending' | 'active' | 'inactive' | 'blocked';
  stats: {
    views: number;
    favorites: number;
    bookings: number;
    totalRevenue: number;
    averageRating: number;
    reviewCount?: number;
    totalReviews?: number; // Alternative field name compatibility
  };
  blockedDates: {
    startDate: Date;
    endDate: Date;
    reason?: string;
  }[];
  featured: boolean;
  featuredUntil?: Date;
  slug: string;
  primaryImage: string;
  priceInEUR: number;
  priceInDZD: number;
  createdAt: Date;
  updatedAt: Date;
}

// Booking types
export interface Booking {
  id: string;
  listing: Listing | string;
  guest: User | string;
  host: User | string;
  startDate: Date;
  endDate: Date;
  checkInTime: string;
  checkOutTime: string;
  guestCount: {
    adults: number;
    children: number;
    infants: number;
  };
  pricing: {
    basePrice: number;
    nights: number;
    subtotal: number;
    cleaningFee: number;
    serviceFee: number;
    taxes: number;
    totalAmount: number;
    currency: 'DZD' | 'EUR';
    securityDeposit: number;
  };
  payment: {
    method: 'slickpay' | 'bank_transfer' | 'cash' | 'card';
    status: 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
    transactionId?: string;
    paidAmount: number;
    paidAt?: Date;
    refundAmount: number;
    refundReason?: string;
    refundedAt?: Date;
  };
  status: 'pending' | 'confirmed' | 'paid' | 'active' | 'completed' | 'cancelled_by_guest' | 'cancelled_by_host' | 'cancelled_by_admin' | 'expired' | 'disputed';
  specialRequests?: string;
  hostMessage?: string;
  cancellation?: {
    cancelledBy: User | string;
    cancelledAt: Date;
    reason: string;
    refundAmount: number;
    cancellationFee: number;
  };
  checkIn?: {
    actualTime: Date;
    confirmedBy: User | string;
    notes?: string;
  };
  checkOut?: {
    actualTime: Date;
    confirmedBy: User | string;
    notes?: string;
    damageReport?: string;
  };
  guestReview?: Review | string;
  hostReview?: Review | string;
  duration: number;
  totalGuests: number;
  statusColor: string;
  createdAt: Date;
  updatedAt: Date;
}

// Review types
export interface Review {
  id: string;
  listing: Listing | string;
  booking: Booking | string;
  reviewer: User | string;
  reviewee: User | string;
  type: 'guest_to_host' | 'host_to_guest';
  rating: {
    overall: number;
    cleanliness?: number;
    communication?: number;
    checkIn?: number;
    accuracy?: number;
    location?: number;
    value?: number;
  };
  title?: string;
  comment: string;
  photos?: {
    url: string;
    caption?: string;
  }[];
  response?: {
    comment: string;
    respondedAt: Date;
  };
  status: 'pending' | 'published' | 'hidden' | 'flagged';
  helpful: {
    count: number;
    users: (User | string)[];
  };
  isPublic: boolean;
  publishedAt?: Date;
  language: 'en' | 'fr' | 'ar';
  averageRating: number;
  age: string;
  createdAt: Date;
  updatedAt: Date;
}

// Message types
export interface Conversation {
  id: string;
  participants: {
    user: User | string;
    joinedAt: Date;
    lastReadAt: Date;
  }[];
  listing?: Listing | string;
  booking?: Booking | string;
  type: 'inquiry' | 'booking' | 'support' | 'general';
  subject?: string;
  lastMessage: {
    content: string;
    sender: User | string;
    sentAt: Date;
    type: 'text' | 'image' | 'file' | 'system';
  };
  status: 'active' | 'archived' | 'blocked';
  messageCount: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags: string[];
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversation: Conversation | string;
  sender: User | string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system' | 'booking_request' | 'booking_confirmation';
  attachments?: {
    type: 'image' | 'document' | 'pdf';
    url: string;
    filename: string;
    size: number;
    mimeType: string;
  }[];
  readBy: {
    user: User | string;
    readAt: Date;
  }[];
  status: 'sent' | 'delivered' | 'read' | 'failed';
  edited: boolean;
  editedAt?: Date;
  originalContent?: string;
  systemData?: {
    bookingId?: string;
    action?: string;
    metadata?: any;
  };
  replyTo?: Message | string;
  language: 'en' | 'fr' | 'ar';
  age: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  errors?: any[];
}

export interface PaginatedResponse<T> {
  status: 'success';
  results: number;
  pagination: {
    page: number;
    pages: number;
    total: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  data: T;
}

// Search and filter types
export interface SearchFilters {
  location?: string;
  category?: 'stay' | 'vehicle';
  subcategory?: string;
  minPrice?: number;
  maxPrice?: number;
  startDate?: string;
  endDate?: string;
  guests?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  currency?: 'DZD' | 'EUR';
  sort?: string;
  page?: number;
  limit?: number;
}

// Form types
export interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role?: 'guest' | 'host';
  language?: 'en' | 'fr' | 'ar';
  currency?: 'DZD' | 'EUR';
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface ListingForm {
  title: string;
  description: string;
  category: 'stay' | 'vehicle';
  subcategory: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode?: string;
    country: string;
  };
  location: {
    coordinates: [number, number];
  };
  pricing: {
    basePrice: number;
    currency: 'DZD' | 'EUR';
    pricingType: 'per_night' | 'per_day' | 'per_week' | 'per_month' | 'per_hour';
    cleaningFee?: number;
    securityDeposit?: number;
  };
  propertyDetails?: any;
  vehicleDetails?: any;
  availability?: any;
  rules?: any;
  images?: File[];
}

export interface BookingForm {
  listing: string;
  startDate: Date;
  endDate: Date;
  guestCount: {
    adults: number;
    children: number;
    infants: number;
  };
  specialRequests?: string;
}