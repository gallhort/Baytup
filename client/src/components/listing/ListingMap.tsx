'use client';

import React, { useEffect, useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { MapPin } from 'lucide-react';

interface ListingMapProps {
  coordinates: [number, number]; // [lng, lat] from MongoDB
  title: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

const containerStyle = {
  width: '100%',
  height: '480px',
  borderRadius: '16px'
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: true,
  streetViewControl: true,
  rotateControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

export default function ListingMap({ coordinates, title, address }: ListingMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places', 'geometry'] as any
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState<google.maps.LatLngLiteral>({ lat: 36.7538, lng: 3.0588 });

  useEffect(() => {
    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      // MongoDB stores as [lng, lat], Google Maps expects {lat, lng}
      const [lng, lat] = coordinates;
      setCenter({ lat, lng });
    }
  }, [coordinates]);

  const onLoad = React.useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = React.useCallback(() => {
    setMap(null);
  }, []);

  if (loadError) {
    return (
      <div className="w-full h-[480px] bg-gray-100 rounded-2xl flex items-center justify-center">
        <div className="text-center p-8">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Unable to load map</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-[480px] bg-gray-100 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={15}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        <Marker
          position={center}
          title={title}
          icon={{
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 0C9.01 0 0 9.01 0 20c0 15 20 30 20 30s20-15 20-30C40 9.01 30.99 0 20 0zm0 27c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" fill="#FF6B35"/>
                <circle cx="20" cy="20" r="5" fill="white"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(40, 50),
            anchor: new google.maps.Point(20, 50)
          }}
          animation={google.maps.Animation.DROP}
        />
      </GoogleMap>

      {/* Map Legend/Info */}
      <div className="absolute top-4 left-4 bg-white rounded-xl shadow-lg p-4 max-w-xs">
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
            map.panTo(center);
            map.setZoom(17);
          }
        }}
        className="absolute bottom-4 right-4 px-4 py-2 bg-white hover:bg-gray-50 rounded-xl shadow-lg font-semibold text-sm text-gray-900 transition-colors flex items-center gap-2"
      >
        <MapPin className="w-4 h-4 text-[#FF6B35]" />
        Exact Location
      </button>
    </div>
  );
}
