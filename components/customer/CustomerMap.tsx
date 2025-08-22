// components/customer/CustomerMap.tsx (updated to show routes)
'use client';
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Initialize Mapbox
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (!MAPBOX_TOKEN) {
  console.error('Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN environment variable');
} else {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

interface CustomerMapProps {
  initialOptions?: Omit<mapboxgl.MapboxOptions, 'container'>;
  style?: React.CSSProperties;
  onLoaded?: (map: mapboxgl.Map) => void;
  onRemoved?: () => void;
  pickupLocation?: { longitude: number; latitude: number; address?: string };
  deliveryLocation?: { longitude: number; latitude: number; address?: string };
  showRoute?: boolean;
  showCurrentLocation?: boolean;
  onLocationUpdate?: (location: { longitude: number; latitude: number, address: string }) => void;
}

export default function CustomerMap({
  initialOptions = {},
  style,
  onLoaded,
  onRemoved,
  pickupLocation,
  deliveryLocation,
  showRoute = false,
  showCurrentLocation = true,
  onLocationUpdate
}: CustomerMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const pickupMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const deliveryMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const currentLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ longitude: number; latitude: number } | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [isLocating, setIsLocating] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);

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

  // Fetch route between two points
  const fetchRoute = async (pickup: [number, number], delivery: [number, number]) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup[0]},${pickup[1]};${delivery[0]},${delivery[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
      );
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        setRouteData(data.routes[0]);
        addRouteToMap(data.routes[0]);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  // Add route to map
  const addRouteToMap = (route: any) => {
    if (!map.current) return;

    // Remove existing route layer if it exists
    if (map.current.getLayer('route')) {
      map.current.removeLayer('route');
    }
    if (map.current.getSource('route')) {
      map.current.removeSource('route');
    }

    // Add route source and layer
    map.current.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: route.geometry
      }
    });

    map.current.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#8b5cf6',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });
  };

  // Create markers
  const createPickupMarkerElement = () => {
    const el = document.createElement('div');
    el.className = 'pickup-marker';
    el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="40" height="40">
        <defs>
          <linearGradient id="pickupGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#10b981" />
            <stop offset="100%" stop-color="#059669" />
          </linearGradient>
          <filter id="pickupShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#065f46" flood-opacity="0.8"/>
          </filter>
        </defs>
        <circle cx="24" cy="24" r="20" fill="url(#pickupGradient)" filter="url(#pickupShadow)" />
        <circle cx="24" cy="24" r="8" fill="white" fill-opacity="0.9" />
        <text x="24" y="24" text-anchor="middle" dy="0.3em" font-size="12" font-weight="bold" fill="#059669">A</text>
      </svg>
    `;
    return el;
  };

  const createDeliveryMarkerElement = () => {
    const el = document.createElement('div');
    el.className = 'delivery-marker';
    el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="40" height="40">
        <defs>
          <linearGradient id="deliveryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#ef4444" />
            <stop offset="100%" stop-color="#dc2626" />
          </linearGradient>
          <filter id="deliveryShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#7f1d1d" flood-opacity="0.8"/>
          </filter>
        </defs>
        <circle cx="24" cy="24" r="20" fill="url(#deliveryGradient)" filter="url(#deliveryShadow)" />
        <circle cx="24" cy="24" r="8" fill="white" fill-opacity="0.9" />
        <text x="24" y="24" text-anchor="middle" dy="0.3em" font-size="12" font-weight="bold" fill="#dc2626">B</text>
      </svg>
    `;
    return el;
  };

  const createCurrentLocationMarkerElement = () => {
    const el = document.createElement('div');
    el.className = 'current-location-marker';
    el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
        <defs>
          <linearGradient id="currentLocationGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#3b82f6" />
            <stop offset="100%" stop-color="#1d4ed8" />
          </linearGradient>
          <filter id="currentLocationShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#1e40af" flood-opacity="0.8"/>
          </filter>
        </defs>
        <circle cx="24" cy="24" r="20" fill="url(#currentLocationGradient)" filter="url(#currentLocationShadow)" />
        <circle cx="24" cy="24" r="8" fill="white" fill-opacity="0.9" />
        <circle cx="24" cy="24" r="4" fill="#3b82f6" />
      </svg>
    `;
    return el;
  };

  // Update markers
  const updateMarkers = () => {
    if (!map.current) return;

    // Clear existing markers
    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
      pickupMarkerRef.current = null;
    }
    if (deliveryMarkerRef.current) {
      deliveryMarkerRef.current.remove();
      deliveryMarkerRef.current = null;
    }

    // Add pickup marker if location provided
    if (pickupLocation) {
      pickupMarkerRef.current = new mapboxgl.Marker({
        element: createPickupMarkerElement()
      })
        .setLngLat([pickupLocation.longitude, pickupLocation.latitude])
        .addTo(map.current);
    }

    // Add delivery marker if location provided
    if (deliveryLocation) {
      deliveryMarkerRef.current = new mapboxgl.Marker({
        element: createDeliveryMarkerElement()
      })
        .setLngLat([deliveryLocation.longitude, deliveryLocation.latitude])
        .addTo(map.current);
    }

    // Fit map to show both markers and route if both are present
    if (pickupLocation && deliveryLocation) {
      const bounds = new mapboxgl.LngLatBounds()
        .extend([pickupLocation.longitude, pickupLocation.latitude])
        .extend([deliveryLocation.longitude, deliveryLocation.latitude]);
      
      map.current.fitBounds(bounds, {
        padding: 100,
        maxZoom: 15
      });

      // Fetch and show route
      if (showRoute) {
        fetchRoute(
          [pickupLocation.longitude, pickupLocation.latitude],
          [deliveryLocation.longitude, deliveryLocation.latitude]
        );
      }
    } else if (pickupLocation) {
      map.current.flyTo({
        center: [pickupLocation.longitude, pickupLocation.latitude],
        zoom: 14
      });
    } else if (deliveryLocation) {
      map.current.flyTo({
        center: [deliveryLocation.longitude, deliveryLocation.latitude],
        zoom: 14
      });
    }
  };

  // Update current location marker
  const updateCurrentLocationMarker = (location: { longitude: number; latitude: number }) => {
    if (!map.current) return;

    // Clear existing marker
    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.remove();
      currentLocationMarkerRef.current = null;
    }

    // Add new marker
    currentLocationMarkerRef.current = new mapboxgl.Marker({
      element: createCurrentLocationMarkerElement()
    })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map.current);

    // Center map on current location with street-level zoom
    map.current.flyTo({
      center: [location.longitude, location.latitude],
      zoom: 16,
      essential: true
    });
  };

  // Get user's current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMapError('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          longitude: position.coords.longitude,
          latitude: position.coords.latitude
        };
        
        setCurrentLocation(location);
        
        // Get address from coordinates
        const address = await getAddressFromCoords(location.longitude, location.latitude);
        setCurrentAddress(address);
        
        // Update marker
        updateCurrentLocationMarker(location);
        
        // Callback if provided
        if (onLocationUpdate) {
          onLocationUpdate({ ...location, address });
        }
        
        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setMapError('Unable to get your location. Please check location permissions.');
        setIsLocating(false);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      setMapError('Mapbox token is missing. Please check your environment variables.');
      return;
    }

    if (map.current || !mapContainer.current) return;

    try {
      const mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: initialOptions.center || [31.033, -17.827],
        zoom: initialOptions.zoom || 12,
        ...initialOptions
      });

      mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
      mapInstance.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      mapInstance.addControl(new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserLocation: true,
        showUserHeading: true
      }), 'top-right');

      mapInstance.on('load', () => {
        if (onLoaded) onLoaded(mapInstance);
        
        // Update markers with any provided locations
        updateMarkers();
        
        // Get current location when map loads if enabled
        if (showCurrentLocation) {
          getCurrentLocation();
        }
      });

      mapInstance.on('error', (e) => {
        console.error('Mapbox error:', e);
        setMapError('Failed to load map. Please check your Mapbox token.');
      });

      map.current = mapInstance;

      return () => {
        mapInstance.remove();
        if (onRemoved) onRemoved();
        map.current = null;
      };
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to initialize map.');
    }
  }, [initialOptions, onLoaded, onRemoved, showCurrentLocation]);

  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      updateMarkers();
    }
  }, [pickupLocation, deliveryLocation, showRoute]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-800 rounded-2xl">
        <div className="text-center text-white">
          <div className="text-2xl mb-2">🌍</div>
          <p className="text-lg font-semib极">Map Configuration Required</p>
          <p className="text-sm text-gray-400 mt-1">
            Please add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your environment variables
          </p>
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-800 rounded-2xl">
        <div className="text-center text-white">
          <div className="text-2xl mb-2">❌</div>
          <p className="text-lg font-semibold">Map Error</p>
          <p className="text-sm text-gray-400 mt-1">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Location Info Overlay */}
      {(currentLocation || currentAddress) && (
        <div className="absolute top-4 left-4 z-10 bg-black/80 text-white p-3 rounded-lg backdrop-blur-sm max-w-xs">
          <h3 className="font-semibold text-purple-400 mb-2">Your Location</h3>
          {currentAddress && (
            <p className="text-sm mb-1">{currentAddress}</p>
          )}
          {currentLocation && (
            <p className="text-xs text-gray-400">
              {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
            </p>
          )}
          {isLocating && (
            <div className="flex items-center mt-2 text-purple-400 text-xs">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-400 mr-2"></div>
              Updating location...
            </div>
          )}
        </div>
      )}
      
      {/* Route Info Overlay */}
      {routeData && pickupLocation && deliveryLocation && (
        <div className="absolute top-4 right-4 z-10 bg-black/80 text-white p-3 rounded-lg backdrop-blur-sm">
          <h3 className="font-semibold text-purple-400 mb-2">Delivery Route</h3>
          <p className="text-sm">Distance: {(routeData.distance / 1000).toFixed(1)} km</p>
          <p className="text-sm">Duration: {Math.round(routeData.duration / 60)} min</p>
        </div>
      )}
      
      {/* Locate Button */}
      <button
        onClick={getCurrentLocation}
        disabled={isLocating}
        className="absolute bottom-4 right-4 z-10 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Find my location"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      <div ref={mapContainer} style={style} className="h-full w-full rounded-2xl" />
    </div>
  );
}