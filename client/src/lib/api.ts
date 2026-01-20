import axios, { AxiosError } from 'axios';

// API Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 10000,
});

// Request interceptor for auth
api.interceptors.request.use(
  (config) => {
    // Add auth token if exists
    const token = typeof window !== 'undefined' ? localStorage.getItem('baytup_token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      if (typeof window !== 'undefined') {
        localStorage.removeItem('baytup_token');
        // Don't redirect to login for public routes
        if (!window.location.pathname.includes('/search') && window.location.pathname !== '/') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Listings API
export const listingsAPI = {
  // Search listings with filters
  searchListings: async (filters: any) => {
    try {
      
      const params = new URLSearchParams();
      
      // Add all valid parameters
      if (filters.location) params.append('location', filters.location);
      if (filters.category) params.append('category', filters.category);
      if (filters.subcategory) params.append('subcategory', filters.subcategory);
      if (filters.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.guests) params.append('guests', filters.guests.toString());
      if (filters.bedrooms && filters.bedrooms !== 'any') params.append('bedrooms', filters.bedrooms.toString());
      if (filters.bathrooms && filters.bathrooms !== 'any') params.append('bathrooms', filters.bathrooms.toString());
      if (filters.amenities?.length > 0) params.append('amenities', filters.amenities.join(','));
      if (filters.sort) params.append('sort', filters.sort);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      // Enhanced parameters
      if (filters.lat) params.append('lat', filters.lat.toString());
      if (filters.lng) params.append('lng', filters.lng.toString());
      if (filters.radius) params.append('radius', filters.radius.toString());
      if (filters.instantBook !== undefined) params.append('instantBook', filters.instantBook.toString());
      if (filters.superhost !== undefined) params.append('superhost', filters.superhost.toString());
      if (filters.rating) params.append('rating', filters.rating.toString());
      if (filters.propertyTypes?.length > 0) params.append('propertyTypes', filters.propertyTypes.join(','));
      if (filters.vehicleTypes?.length > 0) params.append('vehicleTypes', filters.vehicleTypes.join(','));
      if (filters.features?.length > 0) params.append('features', filters.features.join(','));
      if (filters.search) params.append('search', filters.search);
      
      const response = await api.get(`/listings?${params.toString()}`);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Search listings error:', error);
      
      // Return empty data structure on error
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch listings',
        data: {
          status: 'error',
          data: {
            listings: [],
          },
          pagination: {
            total: 0,
            page: 1,
            pages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      };
    }
  },

  // Get single listing
  getListing: async (id: string) => {
    try {
      const response = await api.get(`/listings/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get listing error:', error);
      throw error;
    }
  },

  // Get featured listings
  getFeaturedListings: async () => {
    try {
      const response = await api.get('/listings/featured');
      return response.data;
    } catch (error) {
      console.error('Get featured listings error:', error);
      return { data: { listings: [] } };
    }
  },

  // Toggle favorite
  toggleFavorite: async (listingId: string) => {
    try {
      const response = await api.post(`/listings/${listingId}/favorite`);
      return response.data;
    } catch (error) {
      console.error('Toggle favorite error:', error);
      throw error;
    }
  },

  // Advanced search
  advancedSearch: async (searchData: any) => {
    try {
      const response = await api.post('/listings/search', searchData);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Advanced search error:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Advanced search failed',
        data: {
          status: 'error',
          data: { listings: [] },
          facets: {},
          suggestions: {},
          meta: {}
        }
      };
    }
  },

  // Get search suggestions
  getSearchSuggestions: async (query: string) => {
    try {
      const response = await api.get(`/listings/suggestions?q=${encodeURIComponent(query)}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Get suggestions error:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to get suggestions',
        data: { data: { suggestions: [] } }
      };
    }
  },

  // Get filter data (counts for property types, amenities, etc.)
  getFilterData: async (category: string = 'stay') => {
    try {
      const response = await api.get(`/listings/filters?category=${category}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Get filter data error:', error);
      // Return default data structure if API fails
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to get filter data',
        data: {
          data: {
            propertyTypes: category === 'stay' ? [
              { value: 'apartment', label: 'Apartment', count: 0 },
              { value: 'house', label: 'House', count: 0 },
              { value: 'villa', label: 'Villa', count: 0 },
              { value: 'riad', label: 'Traditional Riad', count: 0 },
              { value: 'kasbah', label: 'Kasbah', count: 0 },
              { value: 'desert-camp', label: 'Desert Camp', count: 0 },
              { value: 'studio', label: 'Studio', count: 0 },
              { value: 'room', label: 'Room', count: 0 }
            ] : [
              { value: 'car', label: 'Car', count: 0 },
              { value: 'suv', label: 'SUV/4x4', count: 0 },
              { value: 'van', label: 'Van', count: 0 },
              { value: 'motorcycle', label: 'Motorcycle', count: 0 },
              { value: 'truck', label: 'Truck', count: 0 },
              { value: 'scooter', label: 'Scooter', count: 0 }
            ],
            amenities: category === 'stay' ? [
              'WiFi', 'Parking', 'Pool', 'AC', 'Kitchen', 'Washer',
              'TV', 'Heating', 'Balcony', 'Garden', 'Gym', 'Elevator',
              'Beach Access', 'Mountain View', 'Terrace', 'Security'
            ] : [
              'GPS', 'Bluetooth', 'AC', 'Cruise Control', 'Backup Camera',
              'Child Seat', 'Sunroof', 'USB Charger', 'Spare Tire',
              'First Aid Kit', 'Phone Holder', 'Cooler'
            ],
            priceRange: {
              min: 0,
              max: 100000,
              avg: 15000
            },
            totalListings: 0
          }
        }
      };
    }
  }
};

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      if (response.data.token) {
        localStorage.setItem('baytup_token', response.data.token);
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  register: async (data: any) => {
    try {
      const response = await api.post('/api/auth/register', data);
      if (response.data.token) {
        localStorage.setItem('baytup_token', response.data.token);
      }
      return response.data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.get('/api/auth/logout');
      localStorage.removeItem('baytup_token');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem('baytup_token');
      return { success: false };
    }
  },

  getMe: async () => {
    try {
      const response = await api.get('/api/auth/me');
      return response.data;
    } catch (error) {
      console.error('Get me error:', error);
      throw error;
    }
  }
};

// Bookings API
export const bookingsAPI = {
  createBooking: async (data: any) => {
    try {
      const response = await api.post('/bookings', data);
      return response.data;
    } catch (error) {
      console.error('Create booking error:', error);
      throw error;
    }
  },

  getMyBookings: async () => {
    try {
      const response = await api.get('/bookings/my');
      return response.data;
    } catch (error) {
      console.error('Get bookings error:', error);
      throw error;
    }
  },

  cancelBooking: async (id: string) => {
    try {
      const response = await api.put(`/bookings/${id}/cancel`);
      return response.data;
    } catch (error) {
      console.error('Cancel booking error:', error);
      throw error;
    }
  }
};

export default api;