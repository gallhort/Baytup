'use client';

import { useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';
import { FaSpinner, FaMapMarkedAlt } from 'react-icons/fa';

interface GoogleMapsLocationPickerProps {
  center: {
    lat: number;
    lng: number;
  };
  onLocationChange: (location: { lat: number; lng: number; address?: string }) => void;
  zoom?: number;
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '12px'
};

const defaultCenter = {
  lat: 36.7538,  // Algiers, Algeria
  lng: 3.0588
};

export default function GoogleMapsLocationPicker({
  center,
  onLocationChange,
  zoom = 15
}: GoogleMapsLocationPickerProps) {
  // Use the centralized GoogleMapsContext instead of useJsApiLoader
  const { isLoaded, loadError } = useGoogleMaps();

  const [markerPosition, setMarkerPosition] = useState(center);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Initialize geocoder
  useEffect(() => {
    if (isLoaded && !geocoderRef.current) {
      geocoderRef.current = new google.maps.Geocoder();
    }
  }, [isLoaded]);

  // Update marker when center prop changes
  useEffect(() => {
    if (center.lat !== markerPosition.lat || center.lng !== markerPosition.lng) {
      setMarkerPosition(center);
      if (map) {
        map.panTo(center);
      }
    }
  }, [center, map, markerPosition]);

  // Reverse geocode to get address from coordinates
  const reverseGeocode = async (lat: number, lng: number) => {
    if (!geocoderRef.current) return;

    try {
      const response = await geocoderRef.current.geocode({
        location: { lat, lng }
      });

      if (response.results && response.results[0]) {
        return response.results[0].formatted_address;
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
    return undefined;
  };

  const onMapClick = async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    setMarkerPosition({ lat, lng });

    // Get address from coordinates
    const address = await reverseGeocode(lat, lng);

    onLocationChange({ lat, lng, address });
  };

  const onMarkerDragEnd = async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    setMarkerPosition({ lat, lng });

    // Get address from coordinates
    const address = await reverseGeocode(lat, lng);

    onLocationChange({ lat, lng, address });
  };

  const onLoad = (map: google.maps.Map) => {
    setMap(map);
  };

  const onUnmount = () => {
    setMap(null);
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-red-50 border border-red-200 rounded-xl">
        <div className="text-center p-6">
          <p className="text-red-600 font-medium">Error loading Google Maps</p>
          <p className="text-sm text-red-500 mt-2">{loadError.message}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-gray-50 border border-gray-200 rounded-xl">
        <div className="text-center">
          <FaSpinner className="h-10 w-10 text-[#FF6B35] animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start space-x-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <FaMapMarkedAlt className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Click on the map or drag the marker to set the exact location of your listing</p>
          <p className="text-xs text-blue-600 mt-1">Coordinates: {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}</p>
        </div>
      </div>

      <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-md">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={markerPosition}
          zoom={zoom}
          onClick={onMapClick}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            streetViewControl: false,
            mapTypeControl: true,
            fullscreenControl: true,
            zoomControl: true,
            gestureHandling: 'greedy',
            draggable: true,
            scrollwheel: true
          }}
        >
          <Marker
            position={markerPosition}
            draggable={true}
            onDragEnd={onMarkerDragEnd}
            animation={google.maps.Animation.DROP}
          />
        </GoogleMap>
      </div>
    </div>
  );
}
