//components/driver/Map.tsx
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
  activeDelivery?: {
    pickupLocation: { longitude: number; latitude: number };
    deliveryLocation: { longitude: number; latitude: number };
  };
}

export default function Map({
  initialOptions = {},
  style,
  onLoaded,
  onRemoved,
  driverId,
  isOnline = false,
  driverData,
  activeDelivery
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const pickupMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const deliveryMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState<{ longitude: number; latitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [driverToPickupRouteData, setDriverToPickupRouteData] = useState<any>(null);

  // Convert any coordinate format to LngLatLike
  const toLngLatLike = (location: { longitude: number; latitude: number }): [number, number] => {
    return [location.longitude, location.latitude];
  };

  // Get address from coordinates
  const getAddressFromCoords = async (lng: number, lat: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,place,neighborhood,locality`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }
      return 'Address not found';
    } catch (error) {
      console.error('Error getting address:', error);
      return 'Unable to get address';
    }
  };

  // Fly to user's current location
  const flyToCurrentLocation = () => {
    if (!map.current || !lastLocation) return;

    setIsLocating(true);
    
    map.current.flyTo({
      center: [lastLocation.longitude, lastLocation.latitude],
      zoom: 16,
      bearing: 0,
      speed: 1.2,
      curve: 1,
      easing: (t) => t,
      essential: true
    });

    // Reset locating state after animation
    setTimeout(() => setIsLocating(false), 1500);
  };

  // Auto-zoom to driver location when tracking starts
  const zoomToDriverLocation = (longitude: number, latitude: number) => {
    if (!map.current) return;

    map.current.flyTo({
      center: [longitude, latitude],
      zoom: 16,
      speed: 0.8,
      curve: 1,
      essential: true
    });
  };

  // Add driver to pickup route
  const addDriverToPickupRoute = async (driverLocation: { longitude: number; latitude: number }, pickupLocation: { longitude: number; latitude: number }) => {
    if (!map.current) return;

    try {
      console.log('📍 Calculating driver to pickup route');
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${driverLocation.longitude},${driverLocation.latitude};${pickupLocation.longitude},${pickupLocation.latitude}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
      );
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        // Remove existing driver route layer if it exists
        if (map.current.getLayer('driver-to-pickup-route')) {
          map.current.removeLayer('driver-to-pickup-route');
        }
        if (map.current.getSource('driver-to-pickup-route')) {
          map.current.removeSource('driver-to-pickup-route');
        }

        // Add driver route source and layer
        map.current.addSource('driver-to-pickup-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: data.routes[0].geometry
          }
        });

        map.current.addLayer({
          id: 'driver-to-pickup-route',
          type: 'line',
          source: 'driver-to-pickup-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#f59e0b',
            'line-width': 5,
            'line-opacity': 0.8,
            'line-dasharray': [1, 1]
          }
        });

        setDriverToPickupRouteData(data.routes[0]);
        console.log('📍 Driver to pickup route calculated and displayed');
      }
    } catch (error) {
      console.error('❌ Error fetching driver to pickup route:', error);
    }
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
        
        <!-- Pulsing effect when tracking -->
        <circle cx="24" cy="24" r="22" fill="none" stroke="#10b981" stroke-width="2" stroke-opacity="0.5">
          <animate attributeName="r" from="22" to="28" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" from="0.7" to="0" dur="1.5s" repeatCount="indefinite"/>
        </circle>
      </svg>
    `;
    return el;
  };

  const createPickupMarkerElement = () => {
    const el = document.createElement('div');
    el.className = 'pickup-marker';
    el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
        <circle cx="16" cy="16" r="14" fill="#10b981" stroke="#059669" stroke-width="2"/>
        <circle cx="16" cy="16" r="6" fill="white" fill-opacity="0.9"/>
        <text x="16" y="16" text-anchor="middle" dy="0.3em" font-size="8" font-weight="bold" fill="#059669">P</text>
      </svg>
    `;
    return el;
  };

  const createDeliveryMarkerElement = () => {
    const el = document.createElement('div');
    el.className = 'delivery-marker';
    el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
        <circle cx="16" cy="16" r="14" fill="#ef4444" stroke="#dc2626" stroke-width="2"/>
        <circle cx="16" cy="16" r="6" fill="white" fill-opacity="0.9"/>
        <text x="16" y="16" text-anchor="middle" dy="0.3em" font-size="8" font-weight="bold" fill="#dc2626">D</text>
      </svg>
    `;
    return el;
  };

  const updateDriverLocation = async (longitude: number, latitude: number, heading?: number) => {
    if (!driverId || !isOnline) return;
    
    try {
      const response = await fetch('/api/drivers/update-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverId,
          location: { 
            longitude, 
            latitude,
            heading,
            timestamp: new Date().toISOString()
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update location');
      }
      
      console.log('📍 Driver location updated:', { longitude, latitude });
    } catch (error) {
      console.error('Error updating location:', error instanceof Error ? error.message : error);
    }
  };

  const addDeliveryRoute = async (pickup: [number, number], delivery: [number, number]) => {
    if (!map.current) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup[0]},${pickup[1]};${delivery[0]},${delivery[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
      );
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        // Remove existing route layer if it exists
        if (map.current.getLayer('delivery-route')) {
          map.current.removeLayer('delivery-route');
        }
        if (map.current.getSource('delivery-route')) {
          map.current.removeSource('delivery-route');
        }

        // Add route source and layer
        map.current.addSource('delivery-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: data.routes[0].geometry
          }
        });

        map.current.addLayer({
          id: 'delivery-route',
          type: 'line',
          source: 'delivery-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#8b5cf6',
            'line-width': 4,
            'line-opacity': 0.7
          }
        });

        // Fit map to show route and markers
        const bounds = new mapboxgl.LngLatBounds()
          .extend(pickup)
          .extend(delivery);

        if (lastLocation) {
          bounds.extend([lastLocation.longitude, lastLocation.latitude]);
        }

        map.current.fitBounds(bounds, {
          padding: 100,
          maxZoom: 15,
          duration: 1000
        });
      }
    } catch (error) {
      console.error('Error fetching delivery route:', error);
    }
  };

  const updateDeliveryMarkers = () => {
    if (!map.current || !activeDelivery) return;

    // Clear existing markers
    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
    }
    if (deliveryMarkerRef.current) {
      deliveryMarkerRef.current.remove();
    }

    // Add pickup marker
    pickupMarkerRef.current = new mapboxgl.Marker({
      element: createPickupMarkerElement()
    })
      .setLngLat([activeDelivery.pickupLocation.longitude, activeDelivery.pickupLocation.latitude])
      .addTo(map.current);

    // Add delivery marker
    deliveryMarkerRef.current = new mapboxgl.Marker({
      element: createDeliveryMarkerElement()
    })
      .setLngLat([activeDelivery.deliveryLocation.longitude, activeDelivery.deliveryLocation.latitude])
      .addTo(map.current);

    // Add route
    addDeliveryRoute(
      [activeDelivery.pickupLocation.longitude, activeDelivery.pickupLocation.latitude],
      [activeDelivery.deliveryLocation.longitude, activeDelivery.deliveryLocation.latitude]
    );

    // Add driver to pickup route if we have current location
    if (lastLocation) {
      addDriverToPickupRoute(lastLocation, activeDelivery.pickupLocation);
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

  const startLocationTracking = () => {
    if (!map.current || !locationGranted || !isOnline) return;

    console.log('📍 Starting location tracking for driver:', driverId);
    setIsTracking(true);

    const onSuccess = async (position: GeolocationPosition) => {
      const { longitude, latitude, heading } = position.coords;
      const location = { longitude, latitude };
      
      setLastLocation(location);
      
      // Auto-zoom to driver location on first position update
      if (!lastLocation) {
        zoomToDriverLocation(longitude, latitude);
      }
      
      // Get address for current location
      const address = await getAddressFromCoords(longitude, latitude);
      setCurrentAddress(address);
      
      if (markerRef.current) {
        markerRef.current.setLngLat([longitude, latitude]);
        
        // Apply rotation if heading is available
        if (heading !== null && heading !== undefined) {
          markerRef.current.setRotation(heading);
        }
      } else {
        markerRef.current = new mapboxgl.Marker({
          element: createCarElement(),
          rotationAlignment: 'map',
          pitchAlignment: 'map'
        })
          .setLngLat([longitude, latitude])
          .addTo(map.current!);

        if (heading !== null && heading !== undefined) {
          markerRef.current.setRotation(heading);
        }
      }

      // Update driver to pickup route if we have active delivery
      if (activeDelivery) {
        addDriverToPickupRoute(location, activeDelivery.pickupLocation);
      }

      // FIXED: Convert null to undefined using nullish coalescing operator
      updateDriverLocation(longitude, latitude, heading ?? undefined);
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
        setIsTracking(false);
      }
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });

    // Start watching position
    const watchId = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      { 
        enableHighAccuracy: true, 
        maximumAge: 10000,
        timeout: 15000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      setIsTracking(false);
    };
  };

  useEffect(() => {
    if (locationGranted && isOnline) {
      const cleanup = startLocationTracking();
      return cleanup;
    }
  }, [locationGranted, isOnline, driverId]);

  useEffect(() => {
    if (activeDelivery && map.current) {
      updateDeliveryMarkers();
    }
  }, [activeDelivery]);

  // Update driver to pickup route when location changes with active delivery
  useEffect(() => {
    if (activeDelivery && lastLocation && map.current) {
      console.log('🔄 Updating driver to pickup route with current location');
      addDriverToPickupRoute(lastLocation, activeDelivery.pickupLocation);
    }
  }, [lastLocation, activeDelivery]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const initialCenter = driverData?.lastLocation 
      ? toLngLatLike(driverData.lastLocation)
      : initialOptions.center || [31.033, -17.827];

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialCenter,
      zoom: initialOptions.zoom || 12,
      ...initialOptions
    });

    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapInstance.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    mapInstance.on('load', () => {
      if (onLoaded) onLoaded(mapInstance);
      
      // Add delivery markers if active delivery exists
      if (activeDelivery) {
        updateDeliveryMarkers();
      }
    });

    map.current = mapInstance;

    return () => {
      mapInstance.remove();
      if (onRemoved) onRemoved();
      map.current = null;
    };
  }, [initialOptions, onLoaded, onRemoved, driverData?.lastLocation, activeDelivery]);

  return (
    <div className="relative h-full w-full">
      <LocationPermissionRequest 
        onGranted={() => setLocationGranted(true)}
      />
      
      {/* Tracking Status Overlay */}
      {isTracking && (
        <div className="absolute top-4 left-4 z-10 bg-black/80 text-white p-3 rounded-lg backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Live Tracking Active</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Sharing location with customers</p>
        </div>
      )}

      {/* Current Location Info */}
      {lastLocation && (
        <div className="absolute top-4 right-4 z-10 bg-black/80 text-white p-3 rounded-lg backdrop-blur-sm max-w-xs">
          <h3 className="font-semibold text-purple-400 mb-2">Your Location</h3>
          {currentAddress && (
            <p className="text-sm mb-1">{currentAddress}</p>
          )}
          <p className="text-xs text-gray-400">
            {lastLocation.latitude.toFixed(6)}, {lastLocation.longitude.toFixed(6)}
          </p>
          {isLocating && (
            <div className="flex items-center mt-2 text-purple-400 text-xs">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-400 mr-2"></div>
              Updating location...
            </div>
          )}
        </div>
      )}

      {/* Active Delivery Info */}
      {activeDelivery && (
        <div className="absolute top-24 right-4 z-10 bg-black/80 text-white p-3 rounded-lg backdrop-blur-sm max-w-xs">
          <h3 className="font-semibold text-purple-400 mb-2">Active Delivery</h3>
          <p className="text-sm">Follow the route to complete delivery</p>
          <div className="flex items-center space-x-2 mt-2 text-xs">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Pickup Location</span>
          </div>
          <div className="flex items-center space-x-2 mt-1 text-xs">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Delivery Location</span>
          </div>
          {driverToPickupRouteData && (
            <div className="mt-2 pt-2 border-t border-gray-600">
              <p className="text-xs text-yellow-400">
                ETA to pickup: {Math.round(driverToPickupRouteData.duration / 60)} min
              </p>
              <p className="text-xs text-gray-400">
                Distance: {(driverToPickupRouteData.distance / 1000).toFixed(1)} km
              </p>
            </div>
          )}
        </div>
      )}

      {/* Find My Location Button - Bottom Right Corner */}
      {locationGranted && lastLocation && (
        <button
          onClick={flyToCurrentLocation}
          disabled={isLocating}
          className="absolute bottom-4 right-4 z-10 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Find my location"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}

      {/* Location Accuracy Indicator */}
      {isTracking && (
        <div className="absolute bottom-4 left-4 z-10 bg-black/80 text-white p-2 rounded-lg backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs">High Accuracy GPS</span>
          </div>
        </div>
      )}

      <div ref={mapContainer} style={style} className="h-full w-full" />
    </div>
  );
}