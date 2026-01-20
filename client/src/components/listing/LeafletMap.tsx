'use client';

import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LeafletMapProps {
  coordinates: [number, number]; // [lng, lat] from MongoDB
  title: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

// Fix pour les icônes Leaflet avec Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Créer une icône personnalisée (couleur orange)
const createCustomIcon = () => {
  const svgIcon = `
    <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 0C9.01 0 0 9.01 0 20c0 15 20 30 20 30s20-15 20-30C40 9.01 30.99 0 20 0zm0 27c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" fill="#FF6B35"/>
      <circle cx="20" cy="20" r="5" fill="white"/>
    </svg>
  `;

  return new L.Icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgIcon)}`,
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -50],
  });
};

export default function LeafletMap({ coordinates, title, address }: LeafletMapProps) {
  const [map, setMap] = useState<L.Map | null>(null);

  // Convertir MongoDB format [lng, lat] to Leaflet format [lat, lng]
  const position: [number, number] = useMemo(() => {
    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      return [coordinates[1], coordinates[0]]; // Swap: [lat, lng]
    }
    // Default: Alger, Algeria
    return [36.7538, 3.0588];
  }, [coordinates]);

  const customIcon = useMemo(() => createCustomIcon(), []);

  return (
    <div className="relative">
      <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-md" style={{ height: '480px' }}>
        <MapContainer
          center={position}
          zoom={15}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', borderRadius: '16px' }}
          ref={setMap}
        >
          {/* CartoDB Voyager - Style élégant et moderne - 100% GRATUIT */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={20}
          />

          {/* Marker avec popup */}
          <Marker position={position} icon={customIcon}>
            <Popup>
              <div className="p-2">
                <h4 className="font-bold text-gray-900 text-sm mb-1">{title}</h4>
                <p className="text-xs text-gray-600">
                  {address.street && `${address.street}, `}
                  {address.city}, {address.state}
                </p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Map Legend/Info */}
      <div className="absolute top-4 left-4 bg-white rounded-xl shadow-lg p-4 max-w-xs z-[1000]">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-[#FF6B35]/10 rounded-lg flex-shrink-0">
            <MapPin className="w-5 h-5 text-[#FF6B35]" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-900 text-sm mb-1 truncate">{title}</h4>
            <p className="text-xs text-gray-600 line-clamp-2">
              {address.street && `${address.street}, `}
              {address.city}, {address.state}
            </p>
          </div>
        </div>
      </div>

      {/* Zoom to exact location button */}
      <button
        onClick={() => {
          if (map) {
            map.setView(position, 17);
          }
        }}
        className="absolute bottom-4 right-4 z-[1000] px-4 py-2 bg-white hover:bg-gray-50 rounded-xl shadow-lg font-semibold text-sm text-gray-900 transition-colors flex items-center gap-2"
      >
        <MapPin className="w-4 h-4 text-[#FF6B35]" />
        Exact Location
      </button>
    </div>
  );
}
