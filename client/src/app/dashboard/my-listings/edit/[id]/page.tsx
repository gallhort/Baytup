'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  HiOutlinePhotograph, HiOutlineDocumentText, HiOutlineHome,
  HiOutlineLocationMarker, HiOutlineCurrencyDollar, HiOutlineCalendar,
  HiOutlineClipboardList, HiOutlineEye, HiOutlineX, HiOutlineCheck,
  HiOutlinePlus, HiOutlineTrash, HiOutlineStar, HiOutlineSparkles,
  HiOutlineTrendingUp, HiOutlineChevronLeft, HiOutlineChevronRight,
  HiOutlineLightningBolt, HiOutlineClock,
  HiOutlineShieldCheck, HiOutlineUsers, HiOutlineBan
} from 'react-icons/hi';
import {
  FaSpinner, FaBed, FaWifi, FaParking, FaSwimmingPool,
  FaDumbbell, FaTree, FaSnowflake, FaFire, FaUtensils, FaTv,
  FaWater, FaMountain, FaBath, FaDoorOpen, FaCouch
} from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import CityAutocomplete from '@/components/listing/CityAutocomplete';
import dynamic from 'next/dynamic';
import { useHeaderHeight } from '@/hooks/useHeaderHeight';

// Dynamically import LeafletLocationPicker to avoid SSR issues
const LeafletLocationPicker = dynamic(
  () => import('@/components/listing/LeafletLocationPicker'),
  { ssr: false, loading: () => <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> }
);

// Section type for navigation
type EditorSection =
  | 'photos'
  | 'title'
  | 'type'
  | 'guests'
  | 'bedrooms'
  | 'beds'
  | 'bathrooms'
  | 'amenities'
  | 'location'
  | 'pricing'
  | 'calendar'
  | 'availability'
  | 'cancellation'
  | 'rules'
  | 'status';

// Bed type definition
interface BedConfig {
  type: 'single' | 'double' | 'queen' | 'king' | 'sofa_bed' | 'bunk';
  count: number;
}

// Bathroom type definition
interface BathroomConfig {
  type: 'private' | 'shared' | 'en_suite';
  count: number;
}

interface ListingForm {
  title: string;
  description: string;
  category: 'stay' | '';
  subcategory: string;
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
  stayDetails: {
    stayType: string;
    bedrooms: number;
    beds: BedConfig[];
    bathrooms: BathroomConfig[];
    capacity: number;
    amenities: string[];
  };
  pricing: {
    basePrice: number;
    currency: string;
    pricingType: string;
    cleaningFee: number;
    serviceFee: number;
    securityDeposit: number;
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
  cancellationPolicy: string;
  rules: {
    smoking: string;
    pets: string;
    parties: string;
    children: string;
    additionalRules: string[];
  };
  images: Array<{
    url: string;
    caption: string;
    isPrimary: boolean;
  }>;
  status: string;
  pricingRules: Array<any>;
  customPricing: Array<any>;
  discounts: {
    weeklyDiscount: number;
    monthlyDiscount: number;
    newListingPromo: {
      enabled: boolean;
      discountPercent: number;
      maxBookings: number;
    };
  };
}

// Bed types configuration
const bedTypes = [
  { id: 'single', label: 'Lit simple', icon: '🛏️', description: '90-100 cm de large' },
  { id: 'double', label: 'Lit double', icon: '🛏️', description: '140 cm de large' },
  { id: 'queen', label: 'Lit Queen', icon: '🛏️', description: '160 cm de large' },
  { id: 'king', label: 'Lit King', icon: '🛏️', description: '180+ cm de large' },
  { id: 'sofa_bed', label: 'Canapé-lit', icon: '🛋️', description: 'Convertible' },
  { id: 'bunk', label: 'Lits superposés', icon: '🛏️', description: '2 couchages' },
];

// Bathroom types configuration
const bathroomTypes = [
  { id: 'private', label: 'Salle de bain privée', description: 'Réservée aux voyageurs' },
  { id: 'en_suite', label: 'Salle de bain attenante', description: 'Dans une chambre' },
  { id: 'shared', label: 'Salle de bain commune', description: 'Partagée avec d\'autres' },
];

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;
  const headerHeight = useHeaderHeight();

  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<EditorSection>('photos');
  const [showContent, setShowContent] = useState(false); // Mobile: show content area
  const [activeTab, setActiveTab] = useState<'logement' | 'arrivee'>('logement');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<ListingForm | null>(null);

  const [formData, setFormData] = useState<ListingForm>({
    title: '',
    description: '',
    category: 'stay',
    subcategory: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Algeria'
    },
    location: {
      coordinates: [3.0588, 36.7538] // Default Algiers
    },
    stayDetails: {
      stayType: '',
      bedrooms: 1,
      beds: [{ type: 'double', count: 1 }],
      bathrooms: [{ type: 'private', count: 1 }],
      capacity: 2,
      amenities: []
    },
    pricing: {
      basePrice: 5000,
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
    cancellationPolicy: 'moderate',
    rules: {
      smoking: 'not_allowed',
      pets: 'not_allowed',
      parties: 'not_allowed',
      children: 'allowed',
      additionalRules: []
    },
    images: [],
    status: 'draft',
    pricingRules: [],
    customPricing: [],
    discounts: {
      weeklyDiscount: 0,
      monthlyDiscount: 0,
      newListingPromo: {
        enabled: false,
        discountPercent: 0,
        maxBookings: 0
      }
    }
  });

  const [newRule, setNewRule] = useState('');

  const stayTypes = [
    { id: 'apartment', label: 'Appartement' },
    { id: 'house', label: 'Maison' },
    { id: 'villa', label: 'Villa' },
    { id: 'studio', label: 'Studio' },
    { id: 'room', label: 'Chambre' },
    { id: 'riad', label: 'Riad' },
    { id: 'guesthouse', label: 'Maison d\'hôtes' },
    { id: 'hotel_room', label: 'Chambre d\'hôtel' },
  ];

  const amenitiesConfig = [
    { id: 'wifi', label: 'Wi-Fi', icon: <FaWifi className="w-5 h-5" /> },
    { id: 'parking', label: 'Parking', icon: <FaParking className="w-5 h-5" /> },
    { id: 'pool', label: 'Piscine', icon: <FaSwimmingPool className="w-5 h-5" /> },
    { id: 'gym', label: 'Salle de sport', icon: <FaDumbbell className="w-5 h-5" /> },
    { id: 'garden', label: 'Jardin', icon: <FaTree className="w-5 h-5" /> },
    { id: 'terrace', label: 'Terrasse', icon: <HiOutlineSparkles className="w-5 h-5" /> },
    { id: 'ac', label: 'Climatisation', icon: <FaSnowflake className="w-5 h-5" /> },
    { id: 'heating', label: 'Chauffage', icon: <FaFire className="w-5 h-5" /> },
    { id: 'kitchen', label: 'Cuisine équipée', icon: <FaUtensils className="w-5 h-5" /> },
    { id: 'tv', label: 'TV', icon: <FaTv className="w-5 h-5" /> },
    { id: 'washer', label: 'Lave-linge', icon: <HiOutlineSparkles className="w-5 h-5" /> },
    { id: 'beach_access', label: 'Accès plage', icon: <FaWater className="w-5 h-5" /> },
    { id: 'mountain_view', label: 'Vue montagne', icon: <FaMountain className="w-5 h-5" /> },
    { id: 'security', label: 'Sécurité 24h', icon: <HiOutlineShieldCheck className="w-5 h-5" /> },
  ];

  const cancellationPolicies = [
    { id: 'flexible', label: 'Flexible', description: 'Remboursement intégral jusqu\'à 24h avant l\'arrivée' },
    { id: 'moderate', label: 'Modérée', description: 'Remboursement intégral jusqu\'à 5 jours avant l\'arrivée' },
    { id: 'strict', label: 'Stricte', description: 'Remboursement de 50% jusqu\'à 1 semaine avant l\'arrivée' },
    { id: 'non_refundable', label: 'Non remboursable', description: 'Aucun remboursement après réservation' },
  ];

  // Calculate total beds count
  const getTotalBeds = () => {
    return formData.stayDetails.beds.reduce((sum, bed) => {
      if (bed.type === 'bunk') return sum + (bed.count * 2);
      return sum + bed.count;
    }, 0);
  };

  // Calculate total bathrooms count
  const getTotalBathrooms = () => {
    return formData.stayDetails.bathrooms.reduce((sum, bath) => sum + bath.count, 0);
  };

  // Get summary text for each section
  const getSectionSummary = (sectionId: EditorSection): string => {
    switch (sectionId) {
      case 'photos':
        return formData.images.length > 0 ? `${formData.images.length} photo${formData.images.length > 1 ? 's' : ''}` : 'Ajouter des photos';
      case 'title':
        return formData.title || 'Ajouter un titre';
      case 'type':
        const type = stayTypes.find(t => t.id === formData.subcategory);
        return type?.label || 'Sélectionner';
      case 'guests':
        return `${formData.stayDetails.capacity} voyageur${formData.stayDetails.capacity > 1 ? 's' : ''}`;
      case 'bedrooms':
        return `${formData.stayDetails.bedrooms} chambre${formData.stayDetails.bedrooms > 1 ? 's' : ''}`;
      case 'beds':
        const totalBeds = getTotalBeds();
        return `${totalBeds} lit${totalBeds > 1 ? 's' : ''}`;
      case 'bathrooms':
        const totalBaths = getTotalBathrooms();
        return `${totalBaths} salle${totalBaths > 1 ? 's' : ''} de bain`;
      case 'amenities':
        const count = formData.stayDetails.amenities.length;
        return count > 0 ? `${count} équipement${count > 1 ? 's' : ''}` : 'Ajouter';
      case 'location':
        return formData.address.city || 'Ajouter une adresse';
      case 'pricing':
        return formData.pricing.basePrice > 0
          ? `${formData.pricing.basePrice.toLocaleString()} ${formData.pricing.currency}`
          : 'Définir le prix';
      case 'calendar':
        const customCount = formData.customPricing?.length || 0;
        return customCount > 0 ? `${customCount} période${customCount > 1 ? 's' : ''} personnalisée${customCount > 1 ? 's' : ''}` : 'Gérer le calendrier';
      case 'availability':
        return formData.availability.instantBook ? 'Réservation instantanée' : 'Sur demande';
      case 'cancellation':
        const policy = cancellationPolicies.find(p => p.id === formData.cancellationPolicy);
        return policy?.label || 'Modérée';
      case 'rules':
        return 'Règlement intérieur';
      case 'status':
        return formData.status === 'active' ? 'Publiée' : formData.status === 'draft' ? 'Brouillon' : 'Inactive';
      default:
        return '';
    }
  };

  // Section items for sidebar
  const sectionItems = [
    { id: 'photos' as EditorSection, label: 'Photos', icon: <HiOutlinePhotograph className="w-5 h-5" /> },
    { id: 'title' as EditorSection, label: 'Titre et description', icon: <HiOutlineDocumentText className="w-5 h-5" /> },
    { id: 'type' as EditorSection, label: 'Type de logement', icon: <HiOutlineHome className="w-5 h-5" /> },
    { id: 'guests' as EditorSection, label: 'Voyageurs', icon: <HiOutlineUsers className="w-5 h-5" /> },
    { id: 'bedrooms' as EditorSection, label: 'Chambres', icon: <FaDoorOpen className="w-5 h-5" /> },
    { id: 'beds' as EditorSection, label: 'Lits', icon: <FaBed className="w-5 h-5" /> },
    { id: 'bathrooms' as EditorSection, label: 'Salles de bain', icon: <FaBath className="w-5 h-5" /> },
    { id: 'amenities' as EditorSection, label: 'Équipements', icon: <HiOutlineSparkles className="w-5 h-5" /> },
    { id: 'location' as EditorSection, label: 'Localisation', icon: <HiOutlineLocationMarker className="w-5 h-5" /> },
    { id: 'pricing' as EditorSection, label: 'Tarification', icon: <HiOutlineCurrencyDollar className="w-5 h-5" /> },
    { id: 'calendar' as EditorSection, label: 'Calendrier & Prix', icon: <HiOutlineTrendingUp className="w-5 h-5" /> },
    { id: 'availability' as EditorSection, label: 'Disponibilités', icon: <HiOutlineCalendar className="w-5 h-5" /> },
    { id: 'cancellation' as EditorSection, label: 'Annulation', icon: <HiOutlineBan className="w-5 h-5" /> },
    { id: 'rules' as EditorSection, label: 'Règlement', icon: <HiOutlineClipboardList className="w-5 h-5" /> },
    { id: 'status' as EditorSection, label: 'Publication', icon: <HiOutlineEye className="w-5 h-5" /> },
  ];

  // Track changes
  useEffect(() => {
    if (originalData) {
      setHasChanges(JSON.stringify(formData) !== JSON.stringify(originalData));
    }
  }, [formData, originalData]);

  useEffect(() => {
    fetchListing();
  }, [listingId]);

  const fetchListing = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/listings/${listingId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const listing = response.data.data.listing;

      // Convert old beds format to new format
      let bedsConfig: BedConfig[] = [{ type: 'double', count: 1 }];
      if (listing.stayDetails?.beds) {
        if (Array.isArray(listing.stayDetails.beds)) {
          bedsConfig = listing.stayDetails.beds;
        } else if (typeof listing.stayDetails.beds === 'number') {
          bedsConfig = [{ type: 'double', count: listing.stayDetails.beds }];
        }
      }

      // Convert old bathrooms format to new format
      let bathroomsConfig: BathroomConfig[] = [{ type: 'private', count: 1 }];
      if (listing.stayDetails?.bathrooms) {
        if (Array.isArray(listing.stayDetails.bathrooms)) {
          bathroomsConfig = listing.stayDetails.bathrooms;
        } else if (typeof listing.stayDetails.bathrooms === 'number') {
          bathroomsConfig = [{ type: 'private', count: listing.stayDetails.bathrooms }];
        }
      }

      const mappedData: ListingForm = {
        title: listing.title || '',
        description: listing.description || '',
        category: 'stay',
        subcategory: listing.subcategory || listing.stayDetails?.stayType || '',
        address: {
          street: listing.address?.street || '',
          city: listing.address?.city || '',
          state: listing.address?.state || '',
          postalCode: listing.address?.postalCode || '',
          country: listing.address?.country || 'Algeria'
        },
        location: {
          type: 'Point',
          coordinates: listing.location?.coordinates || [3.0588, 36.7538]
        },
        stayDetails: {
          stayType: listing.stayDetails?.stayType || listing.subcategory || '',
          bedrooms: listing.stayDetails?.bedrooms || 1,
          beds: bedsConfig,
          bathrooms: bathroomsConfig,
          capacity: listing.stayDetails?.capacity || 2,
          amenities: listing.stayDetails?.amenities || []
        },
        pricing: {
          basePrice: listing.pricing?.basePrice || 5000,
          currency: listing.pricing?.currency || 'DZD',
          pricingType: listing.pricing?.pricingType || 'per_night',
          cleaningFee: listing.pricing?.cleaningFee || 0,
          serviceFee: listing.pricing?.serviceFee || 0,
          securityDeposit: listing.pricing?.securityDeposit || 0
        },
        availability: {
          instantBook: listing.availability?.instantBook || false,
          minStay: listing.availability?.minStay || 1,
          maxStay: listing.availability?.maxStay || 365,
          advanceNotice: listing.availability?.advanceNotice || 0,
          preparationTime: listing.availability?.preparationTime || 0,
          checkInFrom: listing.availability?.checkInFrom || '15:00',
          checkInTo: listing.availability?.checkInTo || '21:00',
          checkOutBefore: listing.availability?.checkOutBefore || '11:00'
        },
        cancellationPolicy: listing.cancellationPolicy || 'moderate',
        rules: {
          smoking: listing.rules?.smoking || 'not_allowed',
          pets: listing.rules?.pets || 'not_allowed',
          parties: listing.rules?.parties || 'not_allowed',
          children: listing.rules?.children || 'allowed',
          additionalRules: listing.rules?.additionalRules || []
        },
        images: listing.images || [],
        status: listing.status || 'draft',
        pricingRules: listing.pricingRules || [],
        customPricing: (listing.customPricing || []).map((cp: any) => ({
          ...cp,
          startDate: cp.startDate ? new Date(cp.startDate).toISOString().split('T')[0] : '',
          endDate: cp.endDate ? new Date(cp.endDate).toISOString().split('T')[0] : ''
        })),
        discounts: {
          weeklyDiscount: listing.discounts?.weeklyDiscount || 0,
          monthlyDiscount: listing.discounts?.monthlyDiscount || 0,
          newListingPromo: {
            enabled: listing.discounts?.newListingPromo?.enabled || false,
            discountPercent: listing.discounts?.newListingPromo?.discountPercent || 0,
            maxBookings: listing.discounts?.newListingPromo?.maxBookings || 0
          }
        }
      };

      setFormData(mappedData);
      setOriginalData(mappedData);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching listing:', error);
      toast.error('Erreur lors du chargement de l\'annonce');
      router.push('/dashboard/my-listings');
    }
  };

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

      toast.success(`${files.length} image(s) ajoutée(s)`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du téléchargement');
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
    toast.success('Localisation mise à jour');
  };

  // Update bed count
  const updateBedCount = (bedType: string, delta: number) => {
    setFormData(prev => {
      const beds = [...prev.stayDetails.beds];
      const existingIndex = beds.findIndex(b => b.type === bedType);

      if (existingIndex >= 0) {
        const newCount = beds[existingIndex].count + delta;
        if (newCount <= 0) {
          beds.splice(existingIndex, 1);
        } else {
          beds[existingIndex].count = newCount;
        }
      } else if (delta > 0) {
        beds.push({ type: bedType as any, count: 1 });
      }

      return {
        ...prev,
        stayDetails: { ...prev.stayDetails, beds }
      };
    });
  };

  // Get bed count for a type
  const getBedCount = (bedType: string): number => {
    const bed = formData.stayDetails.beds.find(b => b.type === bedType);
    return bed?.count || 0;
  };

  // Update bathroom count
  const updateBathroomCount = (bathType: string, delta: number) => {
    setFormData(prev => {
      const bathrooms = [...prev.stayDetails.bathrooms];
      const existingIndex = bathrooms.findIndex(b => b.type === bathType);

      if (existingIndex >= 0) {
        const newCount = bathrooms[existingIndex].count + delta;
        if (newCount <= 0) {
          bathrooms.splice(existingIndex, 1);
        } else {
          bathrooms[existingIndex].count = newCount;
        }
      } else if (delta > 0) {
        bathrooms.push({ type: bathType as any, count: 1 });
      }

      return {
        ...prev,
        stayDetails: { ...prev.stayDetails, bathrooms }
      };
    });
  };

  // Get bathroom count for a type
  const getBathroomCount = (bathType: string): number => {
    const bath = formData.stayDetails.bathrooms.find(b => b.type === bathType);
    return bath?.count || 0;
  };

  const handleSave = async (newStatus?: string) => {
    // Validation
    if (!formData.title || !formData.description) {
      toast.error('Veuillez remplir le titre et la description');
      setActiveSection('title');
      return;
    }

    if (!formData.subcategory) {
      toast.error('Veuillez sélectionner le type de logement');
      setActiveSection('type');
      return;
    }

    if (!formData.address.city || !formData.address.state) {
      toast.error('Veuillez compléter l\'adresse (ville et wilaya)');
      setActiveSection('location');
      return;
    }

    if (formData.pricing.basePrice <= 0) {
      toast.error('Veuillez définir un prix de base valide');
      setActiveSection('pricing');
      return;
    }

    if (formData.images.length === 0) {
      toast.error('Veuillez ajouter au moins une photo');
      setActiveSection('photos');
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const statusToSave = newStatus || formData.status;

      // Convert beds and bathrooms arrays to backend format
      const totalBeds = getTotalBeds();
      const totalBathrooms = getTotalBathrooms();

      const payload: any = {
        title: formData.title,
        description: formData.description,
        category: 'stay',
        subcategory: formData.subcategory,
        address: formData.address,
        location: formData.location,
        stayDetails: {
          stayType: formData.subcategory,
          bedrooms: formData.stayDetails.bedrooms,
          beds: totalBeds, // Send total count for backward compatibility
          bedsDetails: formData.stayDetails.beds, // Send detailed config
          bathrooms: totalBathrooms, // Send total count for backward compatibility
          bathroomsDetails: formData.stayDetails.bathrooms, // Send detailed config
          capacity: formData.stayDetails.capacity,
          amenities: formData.stayDetails.amenities
        },
        pricing: formData.pricing,
        availability: formData.availability,
        cancellationPolicy: formData.cancellationPolicy,
        rules: formData.rules,
        images: formData.images,
        status: statusToSave,
        pricingRules: formData.pricingRules,
        customPricing: formData.customPricing,
        discounts: formData.discounts
      };

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/listings/${listingId}`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setOriginalData(formData);
      setHasChanges(false);
      toast.success('Annonce mise à jour avec succès');

      if (newStatus) {
        router.push('/dashboard/my-listings');
      }
    } catch (error: any) {
      console.error('Update listing error:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-[#FF6B35] mx-auto mb-4" />
          <p className="text-gray-500">Chargement de l'annonce...</p>
        </div>
      </div>
    );
  }

  // Small counter component for beds/bathrooms
  const SmallCounter = ({ value, onChange, min = 0 }: { value: number; onChange: (v: number) => void; min?: number }) => (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        −
      </button>
      <span className="text-lg font-medium w-8 text-center">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-900"
      >
        +
      </button>
    </div>
  );

  // Large counter component (Airbnb style)
  const LargeCounter = ({ value, onChange, min = 0, max = 50 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) => (
    <div className="flex items-center justify-center gap-6">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-11 h-11 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-900 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <span className="text-xl leading-none">−</span>
      </button>
      <span className="text-5xl font-light text-gray-900 w-20 text-center tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-11 h-11 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-900 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <span className="text-xl leading-none">+</span>
      </button>
    </div>
  );

  // Render section content (right panel)
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'photos':
        return (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Photos de votre logement</h2>
            <p className="text-gray-500 mb-6">Des photos de qualité attirent plus de voyageurs</p>

            <label
              htmlFor="image-upload"
              className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                uploading ? 'border-gray-200 bg-gray-50' : 'border-gray-300 hover:border-[#FF6B35] hover:bg-orange-50/30'
              }`}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
                disabled={uploading}
              />
              {uploading ? (
                <FaSpinner className="animate-spin text-3xl text-[#FF6B35] mx-auto" />
              ) : (
                <>
                  <HiOutlinePlus className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="font-medium text-gray-700">Ajouter des photos</p>
                  <p className="text-sm text-gray-500">Glissez-déposez ou cliquez</p>
                </>
              )}
            </label>

            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img src={image.url} alt="" className="w-full h-full object-cover" />
                    {image.isPrimary && (
                      <div className="absolute top-2 left-2 bg-[#FF6B35] text-white px-2 py-1 rounded text-xs font-medium">
                        Principale
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      {!image.isPrimary && (
                        <button
                          onClick={() => handleSetPrimaryImage(index)}
                          className="p-2 bg-white rounded-full text-[#FF6B35] hover:scale-110 transition-transform"
                        >
                          <HiOutlineStar className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="p-2 bg-white rounded-full text-red-500 hover:scale-110 transition-transform"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'title':
        return (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Donnez un titre à votre annonce</h2>
            <p className="text-gray-500 mb-6">Un titre accrocheur attire l'attention des voyageurs</p>

            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Magnifique appartement avec vue sur mer"
              maxLength={100}
              className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:ring-0 transition-colors"
            />
            <div className="text-right mt-2 text-sm text-gray-400">{formData.title.length}/100</div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Décrivez votre logement en détail..."
                rows={5}
                maxLength={2000}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:ring-0 resize-none transition-colors"
              />
              <div className="text-right mt-2 text-sm text-gray-400">{formData.description.length}/2000</div>
            </div>
          </div>
        );

      case 'type':
        return (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Quel type de logement proposez-vous ?</h2>
            <p className="text-gray-500 mb-6">Sélectionnez le type qui correspond le mieux</p>

            <div className="grid grid-cols-2 gap-3">
              {stayTypes.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    subcategory: type.id,
                    stayDetails: { ...prev.stayDetails, stayType: type.id }
                  }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.subcategory === type.id
                      ? 'border-[#FF6B35] bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`font-medium ${formData.subcategory === type.id ? 'text-[#FF6B35]' : 'text-gray-900'}`}>
                    {type.label}
                  </p>
                </button>
              ))}
            </div>
          </div>
        );

      case 'guests':
        return (
          <div className="text-center">
            <div className="mb-6">
              <HiOutlineUsers className="w-16 h-16 mx-auto text-[#FF6B35] opacity-60" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Combien de voyageurs pouvez-vous accueillir ?
            </h2>
            <p className="text-gray-500 mb-8">
              Assurez-vous que chaque voyageur dispose d'un couchage
            </p>
            <LargeCounter
              value={formData.stayDetails.capacity}
              onChange={(v) => setFormData(prev => ({ ...prev, stayDetails: { ...prev.stayDetails, capacity: v } }))}
              min={1}
              max={50}
            />
          </div>
        );

      case 'bedrooms':
        return (
          <div className="text-center">
            <div className="mb-6">
              <FaDoorOpen className="w-16 h-16 mx-auto text-[#FF6B35] opacity-60" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Combien de chambres ?
            </h2>
            <p className="text-gray-500 mb-8">
              Comptez uniquement les chambres avec un lit
            </p>
            <LargeCounter
              value={formData.stayDetails.bedrooms}
              onChange={(v) => setFormData(prev => ({ ...prev, stayDetails: { ...prev.stayDetails, bedrooms: v } }))}
              min={0}
              max={50}
            />
          </div>
        );

      case 'beds':
        return (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Quels types de lits proposez-vous ?</h2>
            <p className="text-gray-500 mb-6">Indiquez tous les couchages disponibles</p>

            <div className="space-y-4">
              {bedTypes.map(bed => (
                <div key={bed.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{bed.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900">{bed.label}</p>
                      <p className="text-sm text-gray-500">{bed.description}</p>
                    </div>
                  </div>
                  <SmallCounter
                    value={getBedCount(bed.id)}
                    onChange={(v) => updateBedCount(bed.id, v - getBedCount(bed.id))}
                    min={0}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-orange-50 rounded-xl">
              <p className="text-sm text-orange-800">
                <strong>Total:</strong> {getTotalBeds()} couchage{getTotalBeds() > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        );

      case 'bathrooms':
        return (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Quelles salles de bain proposez-vous ?</h2>
            <p className="text-gray-500 mb-6">Précisez le type de chaque salle de bain</p>

            <div className="space-y-4">
              {bathroomTypes.map(bath => (
                <div key={bath.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FaBath className="w-6 h-6 text-[#FF6B35]" />
                    <div>
                      <p className="font-medium text-gray-900">{bath.label}</p>
                      <p className="text-sm text-gray-500">{bath.description}</p>
                    </div>
                  </div>
                  <SmallCounter
                    value={getBathroomCount(bath.id)}
                    onChange={(v) => updateBathroomCount(bath.id, v - getBathroomCount(bath.id))}
                    min={0}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-orange-50 rounded-xl">
              <p className="text-sm text-orange-800">
                <strong>Total:</strong> {getTotalBathrooms()} salle{getTotalBathrooms() > 1 ? 's' : ''} de bain
              </p>
            </div>
          </div>
        );

      case 'amenities':
        return (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Quels équipements proposez-vous ?</h2>
            <p className="text-gray-500 mb-6">Sélectionnez tous les équipements disponibles</p>

            <div className="grid grid-cols-2 gap-3">
              {amenitiesConfig.map((item) => {
                const isSelected = formData.stayDetails.amenities.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleAmenity(item.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-[#FF6B35] bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={isSelected ? 'text-[#FF6B35]' : 'text-gray-400'}>
                      {item.icon}
                    </div>
                    <span className={`font-medium ${isSelected ? 'text-[#FF6B35]' : 'text-gray-700'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'location':
        return (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Où se situe votre logement ?</h2>
            <p className="text-gray-500 mb-6">Votre adresse n'est communiquée aux voyageurs qu'après la réservation</p>

            <div className="space-y-4">
              <CityAutocomplete onPlaceSelected={handlePlaceSelected} />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ville *</label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:ring-0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Wilaya *</label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, state: e.target.value } }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:ring-0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, street: e.target.value } }))}
                  placeholder="Numéro et nom de rue"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:ring-0"
                />
              </div>

              {formData.location.coordinates[0] !== 0 && formData.location.coordinates[1] !== 0 && (
                <div className="h-64 rounded-xl overflow-hidden border-2 border-gray-200">
                  <LeafletLocationPicker
                    center={{
                      lat: formData.location.coordinates[1],
                      lng: formData.location.coordinates[0]
                    }}
                    onLocationChange={(loc) => setFormData(prev => ({
                      ...prev,
                      location: { type: 'Point', coordinates: [loc.lng, loc.lat] }
                    }))}
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'pricing':
        return (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Définissez votre prix</h2>
            <p className="text-gray-500 mb-6">Vous pouvez le modifier à tout moment</p>

            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    pricing: { ...prev.pricing, basePrice: Math.max(0, prev.pricing.basePrice - 500) }
                  }))}
                  className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-900"
                >
                  −
                </button>
                <div className="text-center">
                  <div className="text-5xl font-light text-gray-900">
                    {formData.pricing.basePrice.toLocaleString()}
                  </div>
                  <div className="text-lg text-gray-500">{formData.pricing.currency} / nuit</div>
                </div>
                <button
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    pricing: { ...prev.pricing, basePrice: prev.pricing.basePrice + 500 }
                  }))}
                  className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-900"
                >
                  +
                </button>
              </div>

              <input
                type="number"
                value={formData.pricing.basePrice || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  pricing: { ...prev.pricing, basePrice: parseInt(e.target.value) || 0 }
                }))}
                className="w-40 px-4 py-2 text-center text-xl border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:ring-0"
                placeholder="0"
              />

              <div className="mt-4 flex justify-center gap-3">
                {['DZD', 'EUR'].map(currency => (
                  <button
                    key={currency}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, pricing: { ...prev.pricing, currency } }))}
                    className={`px-5 py-2 rounded-full border-2 font-medium transition-all ${
                      formData.pricing.currency === currency
                        ? 'border-[#FF6B35] bg-orange-50 text-[#FF6B35]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {currency}
                  </button>
                ))}
              </div>
            </div>

            {/* Frais supplémentaires */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Frais supplémentaires</h3>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Frais de ménage</p>
                  <p className="text-sm text-gray-500">Facturé une seule fois</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.pricing.cleaningFee || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      pricing: { ...prev.pricing, cleaningFee: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-24 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#FF6B35] focus:ring-0 text-right"
                    placeholder="0"
                  />
                  <span className="text-gray-500">{formData.pricing.currency}</span>
                </div>
              </div>
            </div>

            {/* Réductions */}
            <div className="border-t pt-6 mt-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Réductions</h3>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Réduction semaine</p>
                  <p className="text-sm text-gray-500">Pour 7 nuits ou plus</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.discounts.weeklyDiscount || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      discounts: { ...prev.discounts, weeklyDiscount: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#FF6B35] focus:ring-0 text-right"
                    placeholder="0"
                    min={0}
                    max={100}
                  />
                  <span className="text-gray-500">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Réduction mois</p>
                  <p className="text-sm text-gray-500">Pour 28 nuits ou plus</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.discounts.monthlyDiscount || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      discounts: { ...prev.discounts, monthlyDiscount: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#FF6B35] focus:ring-0 text-right"
                    placeholder="0"
                    min={0}
                    max={100}
                  />
                  <span className="text-gray-500">%</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'calendar':
        return (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Calendrier et tarification dynamique</h2>
            <p className="text-gray-500 mb-6">Ajustez vos prix pour des périodes spécifiques (haute saison, événements, week-ends...)</p>

            {/* Prix personnalisés par période */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Périodes personnalisées</h3>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    customPricing: [...(prev.customPricing || []), {
                      startDate: '',
                      endDate: '',
                      price: prev.pricing.basePrice,
                      label: ''
                    }]
                  }))}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#e55a2d] transition-colors"
                >
                  <HiOutlinePlus className="w-4 h-4" />
                  Ajouter une période
                </button>
              </div>

              {formData.customPricing && formData.customPricing.length > 0 ? (
                <div className="space-y-4">
                  {formData.customPricing.map((period: any, index: number) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={period.label || ''}
                          onChange={(e) => {
                            const newPricing = [...formData.customPricing];
                            newPricing[index] = { ...newPricing[index], label: e.target.value };
                            setFormData(prev => ({ ...prev, customPricing: newPricing }));
                          }}
                          placeholder="Nom de la période (ex: Haute saison été)"
                          className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#FF6B35] focus:ring-0"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newPricing = formData.customPricing.filter((_: any, i: number) => i !== index);
                            setFormData(prev => ({ ...prev, customPricing: newPricing }));
                          }}
                          className="ml-3 p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <HiOutlineTrash className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                          <input
                            type="date"
                            value={period.startDate || ''}
                            onChange={(e) => {
                              const newPricing = [...formData.customPricing];
                              newPricing[index] = { ...newPricing[index], startDate: e.target.value };
                              setFormData(prev => ({ ...prev, customPricing: newPricing }));
                            }}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#FF6B35] focus:ring-0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                          <input
                            type="date"
                            value={period.endDate || ''}
                            onChange={(e) => {
                              const newPricing = [...formData.customPricing];
                              newPricing[index] = { ...newPricing[index], endDate: e.target.value };
                              setFormData(prev => ({ ...prev, customPricing: newPricing }));
                            }}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#FF6B35] focus:ring-0"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prix par nuit</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={period.price || ''}
                            onChange={(e) => {
                              const newPricing = [...formData.customPricing];
                              newPricing[index] = { ...newPricing[index], price: parseInt(e.target.value) || 0 };
                              setFormData(prev => ({ ...prev, customPricing: newPricing }));
                            }}
                            className="w-32 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#FF6B35] focus:ring-0 text-right"
                            placeholder="0"
                          />
                          <span className="text-gray-500">{formData.pricing.currency}</span>
                          {period.price && formData.pricing.basePrice > 0 && (
                            <span className={`text-sm ${period.price > formData.pricing.basePrice ? 'text-green-600' : 'text-red-600'}`}>
                              {period.price > formData.pricing.basePrice ? '+' : ''}{Math.round(((period.price - formData.pricing.basePrice) / formData.pricing.basePrice) * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <HiOutlineCalendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucune période personnalisée</p>
                  <p className="text-sm text-gray-400">Ajoutez des périodes pour augmenter vos prix en haute saison</p>
                </div>
              )}

              {/* Blocked dates section */}
              <div className="mt-8 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-4">Dates bloquées</h3>
                <p className="text-sm text-gray-500 mb-4">Bloquez des dates où votre logement n'est pas disponible</p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Du</label>
                    <input
                      type="date"
                      id="blockStartDate"
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#FF6B35] focus:ring-0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Au</label>
                    <input
                      type="date"
                      id="blockEndDate"
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#FF6B35] focus:ring-0"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  id="blockReason"
                  placeholder="Raison (optionnel)"
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#FF6B35] focus:ring-0 mb-3"
                />
                <button
                  type="button"
                  onClick={() => {
                    const startDate = (document.getElementById('blockStartDate') as HTMLInputElement)?.value;
                    const endDate = (document.getElementById('blockEndDate') as HTMLInputElement)?.value;
                    const reason = (document.getElementById('blockReason') as HTMLInputElement)?.value;

                    if (startDate && endDate) {
                      // This would normally call an API to block dates
                      toast.success(`Dates bloquées du ${startDate} au ${endDate}`);
                      // Clear inputs
                      (document.getElementById('blockStartDate') as HTMLInputElement).value = '';
                      (document.getElementById('blockEndDate') as HTMLInputElement).value = '';
                      (document.getElementById('blockReason') as HTMLInputElement).value = '';
                    } else {
                      toast.error('Veuillez sélectionner les dates de début et de fin');
                    }
                  }}
                  className="w-full px-4 py-2 border-2 border-[#FF6B35] text-[#FF6B35] rounded-lg hover:bg-orange-50 transition-colors"
                >
                  Bloquer cette période
                </button>
              </div>

              {/* Tips */}
              <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                <div className="flex gap-3">
                  <HiOutlineTrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Conseils pour la tarification dynamique</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>Augmentez vos prix de 20-40% pendant les vacances scolaires</li>
                      <li>Les week-ends et jours fériés peuvent être majorés de 15-25%</li>
                      <li>Réduisez légèrement vos prix en basse saison pour attirer plus de réservations</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'availability':
        return (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Disponibilités</h2>
            <p className="text-gray-500 mb-6">Définissez les conditions de réservation</p>

            <div className="space-y-6">
              {/* Instant Book */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HiOutlineLightningBolt className="w-6 h-6 text-[#FF6B35]" />
                    <div>
                      <p className="font-medium text-gray-900">Réservation instantanée</p>
                      <p className="text-sm text-gray-500">Les voyageurs peuvent réserver sans votre approbation</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      availability: { ...prev.availability, instantBook: !prev.availability.instantBook }
                    }))}
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      formData.availability.instantBook ? 'bg-[#FF6B35]' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                      formData.availability.instantBook ? 'left-6' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Délai de réservation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Délai de réservation minimum
                </label>
                <p className="text-sm text-gray-500 mb-3">Combien de jours à l'avance les voyageurs doivent-ils réserver ?</p>
                <div className="flex items-center gap-3">
                  <select
                    value={formData.availability.advanceNotice}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      availability: { ...prev.availability, advanceNotice: parseInt(e.target.value) }
                    }))}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:ring-0"
                  >
                    <option value={0}>Jour même (0 jour)</option>
                    <option value={1}>1 jour avant</option>
                    <option value={2}>2 jours avant</option>
                    <option value={3}>3 jours avant</option>
                    <option value={7}>1 semaine avant</option>
                  </select>
                </div>
              </div>

              {/* Durée du séjour */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Séjour minimum (nuits)</label>
                  <input
                    type="number"
                    value={formData.availability.minStay}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      availability: { ...prev.availability, minStay: parseInt(e.target.value) || 1 }
                    }))}
                    min={1}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:ring-0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Séjour maximum (nuits)</label>
                  <input
                    type="number"
                    value={formData.availability.maxStay}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      availability: { ...prev.availability, maxStay: parseInt(e.target.value) || 365 }
                    }))}
                    min={1}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:ring-0"
                  />
                </div>
              </div>

              {/* Horaires */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Arrivée à partir de</label>
                  <input
                    type="time"
                    value={formData.availability.checkInFrom}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      availability: { ...prev.availability, checkInFrom: e.target.value }
                    }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:ring-0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Arrivée jusqu'à</label>
                  <input
                    type="time"
                    value={formData.availability.checkInTo}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      availability: { ...prev.availability, checkInTo: e.target.value }
                    }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:ring-0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Départ avant</label>
                  <input
                    type="time"
                    value={formData.availability.checkOutBefore}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      availability: { ...prev.availability, checkOutBefore: e.target.value }
                    }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:ring-0"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'cancellation':
        return (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Conditions d'annulation</h2>
            <p className="text-gray-500 mb-6">Choisissez la politique qui vous convient</p>

            <div className="space-y-3">
              {cancellationPolicies.map(policy => (
                <button
                  key={policy.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, cancellationPolicy: policy.id }))}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    formData.cancellationPolicy === policy.id
                      ? 'border-[#FF6B35] bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{policy.label}</p>
                      <p className="text-sm text-gray-500 mt-1">{policy.description}</p>
                    </div>
                    {formData.cancellationPolicy === policy.id && (
                      <HiOutlineCheck className="w-5 h-5 text-[#FF6B35]" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'rules':
        return (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Règlement intérieur</h2>
            <p className="text-gray-500 mb-6">Définissez ce qui est autorisé dans votre logement</p>

            <div className="space-y-3">
              {[
                { key: 'smoking', label: 'Fumeur', icon: '🚬' },
                { key: 'pets', label: 'Animaux', icon: '🐾' },
                { key: 'parties', label: 'Fêtes/événements', icon: '🎉' },
                { key: 'children', label: 'Enfants', icon: '👶' },
              ].map(rule => (
                <div key={rule.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{rule.icon}</span>
                    <span className="font-medium text-gray-900">{rule.label}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        rules: { ...prev.rules, [rule.key]: 'allowed' }
                      }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        (formData.rules as any)[rule.key] === 'allowed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      Autorisé
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        rules: { ...prev.rules, [rule.key]: 'not_allowed' }
                      }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        (formData.rules as any)[rule.key] === 'not_allowed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      Interdit
                    </button>
                  </div>
                </div>
              ))}

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Règles supplémentaires</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    placeholder="Ex: Pas de bruit après 22h"
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:ring-0"
                    onKeyPress={(e) => e.key === 'Enter' && addAdditionalRule()}
                  />
                  <button
                    type="button"
                    onClick={addAdditionalRule}
                    className="px-4 py-3 bg-[#FF6B35] text-white rounded-xl hover:bg-[#e55a2d] transition-colors"
                  >
                    <HiOutlinePlus className="w-5 h-5" />
                  </button>
                </div>
                {formData.rules.additionalRules.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {formData.rules.additionalRules.map((rule, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span>{rule}</span>
                        <button
                          type="button"
                          onClick={() => removeAdditionalRule(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <HiOutlineX className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'status':
        return (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Publication</h2>
            <p className="text-gray-500 mb-6">Choisissez le statut de votre annonce</p>

            <div className="space-y-3">
              {[
                { id: 'active', label: 'Publiée', description: 'Visible par tous les voyageurs', color: 'green' },
                { id: 'draft', label: 'Brouillon', description: 'Non visible, en cours de création', color: 'gray' },
                { id: 'inactive', label: 'Inactive', description: 'Masquée temporairement', color: 'yellow' },
              ].map(status => (
                <button
                  key={status.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: status.id }))}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    formData.status === status.id
                      ? 'border-[#FF6B35] bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        status.color === 'green' ? 'bg-green-500' :
                        status.color === 'yellow' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`} />
                      <div>
                        <p className="font-semibold text-gray-900">{status.label}</p>
                        <p className="text-sm text-gray-500">{status.description}</p>
                      </div>
                    </div>
                    {formData.status === status.id && (
                      <HiOutlineCheck className="w-5 h-5 text-[#FF6B35]" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Get section display value (like Airbnb shows the actual value)
  const getSectionValue = (sectionId: EditorSection): string => {
    switch (sectionId) {
      case 'title':
        return formData.title || 'Ajouter un titre';
      case 'type':
        const type = stayTypes.find(t => t.id === formData.subcategory);
        return type ? `Logement entier · ${type.label}` : 'Choisir';
      case 'pricing':
        return formData.pricing.basePrice > 0
          ? `${formData.pricing.basePrice.toLocaleString()} ${formData.pricing.currency} par nuit`
          : 'Définir le prix';
      case 'location':
        return formData.address.city || 'Ajouter';
      case 'availability':
        return formData.availability.instantBook ? 'Réservation instantanée' : 'Sur demande';
      case 'cancellation':
        const policy = cancellationPolicies.find(p => p.id === formData.cancellationPolicy);
        return policy?.label || 'Modérée';
      case 'rules':
        return 'Voir les règles';
      case 'status':
        return formData.status === 'active' ? 'Publiée' : 'Brouillon';
      default:
        return getSectionSummary(sectionId);
    }
  };

  // Handle section selection (shows content on mobile)
  const handleSectionClick = (section: EditorSection) => {
    setActiveSection(section);
    setShowContent(true); // On mobile, show the content area
  };

  return (
    <div
      className="fixed left-0 right-0 bottom-0 bg-white z-40"
      style={{ top: '80px' }}
    >
      {/* Main Container - Full height flex */}
      <div className="h-full flex min-h-0">
        {/* LEFT SIDEBAR - Hidden on mobile when viewing content */}
        <div className={`${showContent ? 'hidden' : 'flex'} lg:flex w-full lg:w-[380px] flex-shrink-0 border-r border-gray-200 h-full flex-col relative min-h-0`}>
          {/* Header - Fixed */}
          <div className="flex-shrink-0 p-4 lg:p-6 pb-4">
            <div className="flex items-center justify-center mb-4 lg:mb-6 relative">
              <Link
                href="/dashboard/my-listings"
                className="absolute left-0 w-9 h-9 flex items-center justify-center border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
              >
                <HiOutlineChevronLeft className="w-4 h-4 text-gray-700" />
              </Link>
              <h1 className="text-base lg:text-lg font-semibold text-gray-900">
                Modifier l'annonce
              </h1>
            </div>

            {/* Toggle Tabs - Airbnb style segmented control */}
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-full p-1">
                <button
                  onClick={() => setActiveTab('logement')}
                  className={`px-3 lg:px-5 py-1.5 text-sm font-medium rounded-full transition-all ${
                    activeTab === 'logement'
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Mon logement
                </button>
                <button
                  onClick={() => setActiveTab('arrivee')}
                  className={`px-3 lg:px-5 py-1.5 text-sm font-medium rounded-full transition-all ${
                    activeTab === 'arrivee'
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Guide d'arrivée
                </button>
              </div>
              <button
                onClick={() => toast.success('Suggestions IA bientôt disponibles')}
                className="w-9 h-9 flex items-center justify-center border border-gray-300 rounded-full hover:bg-gray-50 hover:border-gray-400 transition-colors"
              >
                <HiOutlineSparkles className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Scrollable Cards - Takes remaining space */}
          <div className="flex-1 overflow-y-auto px-4 lg:px-6 pb-20 min-h-0">
            {activeTab === 'logement' ? (
            <div className="space-y-3">
              {/* Photo Card - Special first card like Airbnb */}
              <button
                onClick={() => handleSectionClick('photos')}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                  activeSection === 'photos'
                    ? 'border-gray-900'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-xs text-gray-500 mb-1 font-medium">Visite photo</p>
                <p className="text-xs text-gray-600 mb-3">
                  {formData.stayDetails.bedrooms} chambre{formData.stayDetails.bedrooms > 1 ? 's' : ''} · {getTotalBeds()} lit{getTotalBeds() > 1 ? 's' : ''} · {getTotalBathrooms()} salle{getTotalBathrooms() > 1 ? 's' : ''} de bain
                </p>
                {/* Photo collage preview */}
                <div className="relative h-28 rounded-xl overflow-hidden bg-gray-100">
                  {formData.images && formData.images.length > 0 ? (
                    <div className="flex h-full gap-1">
                      <div className="flex-1 relative">
                        {formData.images[0]?.url && (
                          <img src={formData.images[0].url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      {formData.images.length > 1 && (
                        <div className="w-1/3 flex flex-col gap-1">
                          {formData.images.slice(1, 3).map((img, i) => (
                            <div key={i} className="flex-1 relative">
                              {img?.url && (
                                <img src={img.url} alt="" className="w-full h-full object-cover" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <HiOutlinePhotograph className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  {formData.images && formData.images.length > 0 && (
                    <span className="absolute top-2 right-2 px-2.5 py-0.5 bg-white rounded-full text-xs font-medium shadow-sm">
                      {formData.images.length} photo{formData.images.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </button>

              {/* Other section cards - Airbnb style with label + value */}
              {sectionItems.filter(item => item.id !== 'photos').map(item => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSectionClick(item.id)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                      isActive
                        ? 'border-gray-900'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-xs text-gray-500 mb-1 font-medium">{item.label}</p>
                    <p className="text-sm text-gray-900">{getSectionValue(item.id)}</p>
                  </button>
                );
              })}
            </div>
            ) : (
              /* Guide d'arrivée Tab Content */
              <div className="space-y-4">
                <div className="text-center py-12">
                  <HiOutlineClipboardList className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Guide d'arrivée</h3>
                  <p className="text-gray-500 text-sm max-w-xs mx-auto">
                    Créez un guide pour aider vos voyageurs à accéder à votre logement.
                  </p>
                  <button
                    onClick={() => toast.success('Fonctionnalité bientôt disponible')}
                    className="mt-6 px-6 py-2.5 bg-[#FF6B35] text-white text-sm font-medium rounded-full hover:bg-[#e55a2d] transition-colors"
                  >
                    Créer le guide
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Preview Button - Sticky at bottom of sidebar */}
          <div className="absolute bottom-4 left-4 lg:left-6 z-10">
            <Link
              href={`/listing/${listingId}?from=editor`}
              target="_blank"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors shadow-lg"
            >
              <HiOutlineEye className="w-4 h-4" />
              Aperçu
            </Link>
          </div>
        </div>

        {/* Vertical Scroll Indicator - Desktop only */}
        <div className="hidden lg:block w-px bg-gray-200 relative flex-shrink-0">
          <button className="absolute top-4 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border border-gray-300 bg-white flex items-center justify-center hover:shadow-md transition-all z-10">
            <HiOutlineChevronLeft className="w-3 h-3 text-gray-500 rotate-90" />
          </button>
          <button className="absolute bottom-4 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border border-gray-300 bg-white flex items-center justify-center hover:shadow-md transition-all z-10">
            <HiOutlineChevronRight className="w-3 h-3 text-gray-500 rotate-90" />
          </button>
        </div>

        {/* RIGHT CONTENT AREA - Full screen on mobile with back button */}
        <div className={`${showContent ? 'flex' : 'hidden'} lg:flex flex-1 h-full flex-col min-h-0`}>
          {/* Mobile Back Button */}
          <div className="lg:hidden flex-shrink-0 p-4 border-b border-gray-200">
            <button
              onClick={() => setShowContent(false)}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
            >
              <HiOutlineChevronLeft className="w-5 h-5" />
              <span className="font-medium">Retour</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 lg:p-8 max-w-4xl mx-auto">
              {renderSectionContent()}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Save Button */}
      {hasChanges && (
        <button
          onClick={() => handleSave()}
          disabled={saving}
          className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 px-5 lg:px-6 py-2.5 lg:py-3 bg-[#FF6B35] text-white text-sm font-semibold rounded-full shadow-lg hover:bg-[#e55a2d] disabled:opacity-50 flex items-center gap-2 transition-colors z-50"
        >
          {saving && <FaSpinner className="animate-spin w-4 h-4" />}
          Enregistrer
        </button>
      )}
    </div>
  );
}
