'use client';
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import LocationPermissionRequest from '@/components/driver/LocationPermissionRequest';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (!MAPBOX_TOKEN) {
  throw new Error('Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN environment variable');
}
mapboxgl.accessToken = MAPBOX_TOKEN;

interface MapProps {
  initialOptions?: Omit<mapboxgl.MapboxOptions, 'container'>;
  style?: React.CSSProperties;
  onLoaded?: (map: mapboxgl.Map) => void;
  onRemoved?: () => void;
  driverId?: number;
  isOnline?: boolean;
  driverData?: {
    lastLocation?: {
      longitude: number;
      latitude: number;
    };
  };
}

export default function Map({
  initialOptions = {},
  style,
  onLoaded,
  onRemoved,
  driverId,
  isOnline = false,
  driverData
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  // Convert any coordinate format to LngLatLike
  const toLngLatLike = (location: { longitude: number; latitude: number }): [number, number] => {
    return [location.longitude, location.latitude];
  };

  const createCarElement = () => {
    const el = document.createElement('div');
    el.className = 'car-marker';
    el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
        <defs>
          <linearGradient id="carBody" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#9c27b0" />
            <stop offset="50%" stop-color="#7b1fa2" />
            <stop offset="100%" stop-color="#6a1b9a" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#4a148c" flood-opacity="0.8"/>
          </filter>
        </defs>
        
        <!-- Car Body -->
        <path d="M38 18H10c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h28c1.1 0 2-.9 2-2V20c0-1.1-.9-2-2-2z" 
              fill="url(#carBody)" filter="url(#shadow)" stroke="#4a148c" stroke-width="0.5"/>
        
        <!-- Windshield -->
        <path d="M24 18l6-6h-12l6 6z" fill="#e1bee7" fill-opacity="0.8" stroke="#4a148c" stroke-width="0.3"/>
        
        <!-- Side Windows -->
        <rect x="12" y="18" width="4" height="6" rx="1" fill="#e1bee7" fill-opacity="0.6" stroke="#4a148c" stroke-width="0.3"/>
        <rect x="32" y="18" width="4" height="6" rx="1" fill="#e1bee7" fill-opacity="0.6" stroke="#4a148c" stroke-width="0.3"/>
        
        <!-- Wheels -->
        <circle cx="12" cy="32" r="4" fill="#212121" stroke="#424242" stroke-width="1.5"/>
        <circle cx="36" cy="32" r="4" fill="#212121" stroke="#424242" stroke-width="1.5"/>
        <circle cx="12" cy="32" r="2" fill="#757575" stroke="#9e9e9e" stroke-width="0.5"/>
        <circle cx="36" cy="32" r="2" fill="#757575" stroke="#9e9e9e" stroke-width="0.5"/>
        
        <!-- Headlights -->
        <circle cx="42" cy="24" r="2" fill="#ffeb3b" stroke="#fbc02d" stroke-width="0.5"/>
        <circle cx="6" cy="24" r="2" fill="#ffeb3b" stroke="#fbc02d" stroke-width="0.5"/>
        
        <!-- 3D Details -->
        <path d="M38 18H10l2-4h24l2 4z" fill="#7b1fa2" fill-opacity="0.7"/>
        <path d="M12 18h24l-2-4h-20l-2 4z" fill="#9c27b0" fill-opacity="0.5"/>
      </svg>
    `;
    return el;
  };

  const updateDriverLocation = async (longitude: number, latitude: number) => {
    if (!driverId || !isOnline) return;
    
    try {
      const response = await fetch('/api/driver/update-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverId,
          location: { longitude, latitude }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update location');
      }
    } catch (error) {
      console.error('Error updating location:', error instanceof Error ? error.message : error);
    }
  };

  const getGeolocationErrorText = (code: number): string => {
    switch(code) {
      case 1:
        return 'Permission denied - Please enable location services in your browser settings';
      case 2:
        return 'Position unavailable - Location information is not available';
      case 3:
        return 'Timeout - The request to get location timed out';
      default:
        return 'Unknown error occurred while getting location';
    }
  };

  useEffect(() => {
    if (!map.current || !locationGranted || !isOnline) return;
  
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: false,
      showAccuracyCircle: false
    });
  
    map.current.addControl(geolocate);
  
    const onSuccess = (position: GeolocationPosition) => {
      const { longitude, latitude } = position.coords;
      
      if (markerRef.current) {
        markerRef.current.setLngLat([longitude, latitude]);
      } else {
        markerRef.current = new mapboxgl.Marker({
          element: createCarElement()
        })
          .setLngLat([longitude, latitude])
          .addTo(map.current!);
      }
  
      updateDriverLocation(longitude, latitude);
    };
  
    const onError = (error: GeolocationPositionError) => {
      console.error('Geolocation error:', {
        code: error.code,
        message: error.message || 'Unknown geolocation error',
        PERMISSION_DENIED: error.PERMISSION_DENIED,
        POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
        TIMEOUT: error.TIMEOUT
      });
      
      if (error.code === error.PERMISSION_DENIED) {
        setLocationGranted(false);
      }
      
      if (driverData?.lastLocation) {
        map.current?.flyTo({
          center: toLngLatLike(driverData.lastLocation),
          zoom: 15
        });
      }
    };
  
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  
    const watchId = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
  
    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [locationGranted, isOnline, driverId, driverData?.lastLocation]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const initialCenter = driverData?.lastLocation 
      ? toLngLatLike(driverData.lastLocation)
      : initialOptions.center || [31.033, -17.827];

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/murombo/cmdq9jyzw00hd01s87etkezgc',
      center: initialCenter,
      zoom: initialOptions.zoom || 12,
      ...initialOptions
    });

    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');

    mapInstance.on('load', () => {
      if (onLoaded) onLoaded(mapInstance);
    });

    map.current = mapInstance;

    return () => {
      mapInstance.remove();
      if (onRemoved) onRemoved();
      map.current = null;
    };
  }, [initialOptions, onLoaded, onRemoved, driverData?.lastLocation]);

  return (
    <div className="relative h-full w-full">
      <LocationPermissionRequest 
        onGranted={() => setLocationGranted(true)}
      />
      <div ref={mapContainer} style={style} className="h-full w-full" />
    </div>
  );
}