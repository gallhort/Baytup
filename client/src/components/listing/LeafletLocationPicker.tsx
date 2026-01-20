'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { FaMapMarkedAlt } from 'react-icons/fa';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LeafletLocationPickerProps {
  center: {
    lat: number;
    lng: number;
  };
  onLocationChange: (location: { lat: number; lng: number; address?: string }) => void;
  zoom?: number;
}

// Fix pour les icônes Leaflet avec Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

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

// Composant pour gérer les clics sur la carte
function MapClickHandler({
  onMapClick,
  markerPosition,
  setMarkerPosition
}: {
  onMapClick: (lat: number, lng: number) => void;
  markerPosition: [number, number];
  setMarkerPosition: (pos: [number, number]) => void;
}) {
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setMarkerPosition([lat, lng]);
      onMapClick(lat, lng);
    },
  });

  // Centrer la carte sur la nouvelle position
  useEffect(() => {
    map.setView(markerPosition, map.getZoom());
  }, [markerPosition, map]);

  return null;
}

export default function LeafletLocationPicker({
  center,
  onLocationChange,
  zoom = 15
}: LeafletLocationPickerProps) {
  const [markerPosition, setMarkerPosition] = useState<[number, number]>([center.lat, center.lng]);
  const customIcon = useMemo(() => createCustomIcon(), []);

  // Mise à jour du marker quand le center change
  useEffect(() => {
    if (center.lat !== markerPosition[0] || center.lng !== markerPosition[1]) {
      setMarkerPosition([center.lat, center.lng]);
    }
  }, [center.lat, center.lng]);

  // Reverse geocode avec Nominatim (OpenStreetMap - GRATUIT)
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'fr' // Préférer les résultats en français
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.display_name;
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
    return undefined;
  };

  const handleMapClick = async (lat: number, lng: number) => {
    const address = await reverseGeocode(lat, lng);
    onLocationChange({ lat, lng, address });
  };

  const handleMarkerDragEnd = async (e: L.DragEndEvent) => {
    const marker = e.target as L.Marker;
    const position = marker.getLatLng();
    const lat = position.lat;
    const lng = position.lng;

    setMarkerPosition([lat, lng]);
    const address = await reverseGeocode(lat, lng);
    onLocationChange({ lat, lng, address });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start space-x-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <FaMapMarkedAlt className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Cliquez sur la carte ou déplacez le marqueur pour définir l'emplacement exact de votre annonce</p>
          <p className="text-xs text-blue-600 mt-1">Coordonnées: {markerPosition[0].toFixed(6)}, {markerPosition[1].toFixed(6)}</p>
        </div>
      </div>

      <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-md" style={{ height: '400px' }}>
        <MapContainer
          center={markerPosition}
          zoom={zoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          {/* CartoDB Voyager - Style élégant et moderne - 100% GRATUIT */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={20}
          />

          {/* Marker draggable */}
          <Marker
            position={markerPosition}
            icon={customIcon}
            draggable={true}
            eventHandlers={{
              dragend: handleMarkerDragEnd
            }}
          />

          {/* Handler pour les clics sur la carte */}
          <MapClickHandler
            onMapClick={handleMapClick}
            markerPosition={markerPosition}
            setMarkerPosition={setMarkerPosition}
          />
        </MapContainer>
      </div>
    </div>
  );
}
