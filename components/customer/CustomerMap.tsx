//components/customer/CustomerMap.tsx
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
  driverLocation?: { 
    longitude: number; 
    latitude: number; 
    heading?: number; 
    speed?: number;
    route?: any;
    eta?: number;
  } | null;
  showRoute?: boolean;
  showCurrentLocation?: boolean;
  onLocationUpdate?: (location: { longitude: number; latitude: number; address: string }) => void;
  customerId?: number;
}

export default function CustomerMap({
  initialOptions = {},
  style,
  onLoaded,
  onRemoved,
  pickupLocation,
  deliveryLocation,
  driverLocation,
  showRoute = false,
  showCurrentLocation = true,
  onLocationUpdate,
  customerId
}: CustomerMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const pickupMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const deliveryMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const currentLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [mapError, setMapError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ longitude: number; latitude: number } | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [isLocating, setIsLocating] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const [driverToPickupRouteData, setDriverToPickupRouteData] = useState<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [driverEta, setDriverEta] = useState<number | null>(null);
  const [pubnub, setPubnub] = useState<any>(null);

  // NEW: Initialize PubNub for real-time updates
  useEffect(() => {
    if (customerId) {
      // Import and initialize PubNub client
      const initializePubNub = async () => {
        const { createPubNubClient } = await import('@/lib/pubnub-booking');
        setPubnub(createPubNubClient(`customer_${customerId}`));
      };
      initializePubNub();
    }
  }, [customerId]);

  // NEW: Subscribe to driver location updates
  useEffect(() => {
    if (!pubnub || !isMapReady) return;

    pubnub.subscribe({
      channels: [`customer_${customerId}`]
    });

    const listener = {
      message: (event: any) => {
        if (event.message.type === 'DRIVER_LOCATION_UPDATE') {
          const { location, route, eta } = event.message.data;
          
          // Update driver location
          if (location && map.current) {
            updateDriverMarker(location);
            
            // Update real-time route if provided
            if (route) {
              updateRealTimeRoute(route);
            }
            
            // Update ETA
            if (eta) {
              setDriverEta(eta);
            }
          }
        }
      }
    };

    pubnub.addListener(listener);

    return () => {
      pubnub.removeListener(listener);
      pubnub.unsubscribeAll();
    };
  }, [pubnub, isMapReady, customerId]);

  // NEW: Update real-time route on customer map
  const updateRealTimeRoute = (route: any) => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const sourceId = 'realtime-driver-route';
    const layerId = 'realtime-driver-route';

    // Remove existing layer and source
    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId);
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId);
    }

    // Add new route
    map.current.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: route.geometry
      }
    });

    map.current.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#10b981',
        'line-width': 5,
        'line-opacity': 0.8,
        'line-dasharray': [0.5, 0.5]
      }
    });
  };

  // NEW: Update driver marker with real-time location
  const updateDriverMarker = (location: { longitude: number; latitude: number; heading?: number }) => {
    if (!map.current) return;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLngLat([location.longitude, location.latitude]);
      if (location.heading !== undefined) {
        driverMarkerRef.current.setRotation(location.heading);
      }
    } else {
      driverMarkerRef.current = new mapboxgl.Marker({
        element: createDriverMarkerElement(),
        rotationAlignment: 'map',
        pitchAlignment: 'map',
      })
        .setLngLat([location.longitude, location.latitude])
        .addTo(map.current);

      if (location.heading !== undefined) {
        driverMarkerRef.current.setRotation(location.heading);
      }
    }
  };

  // Get address from coordinates
  const getAddressFromCoords = async (lng: number, lat: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,place,neighborhood,locality`
      );
      const data = await response.json();
      return data.features?.[0]?.place_name || 'Address not found';
    } catch (error) {
      console.error('Error getting address:', error);
      return 'Unable to get address';
    }
  };

  // Add route to map - More efficient update logic
  const addRouteToMap = (route: any, routeId: string) => {
    if (!map.current || !map.current.isStyleLoaded()) {
      map.current?.once('styledata', () => addRouteToMap(route, routeId));
      return;
    }

    const source = map.current.getSource(routeId) as mapboxgl.GeoJSONSource;
    if (source) {
      // If source exists, just update its data
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: route.geometry,
      });
    } else {
      // Otherwise, add a new source and layer
      map.current.addSource(routeId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route.geometry,
        },
      });

      const routePaintStyle =
        routeId === 'driver-to-pickup-route'
          ? { 'line-color': '#f59e0b', 'line-width': 5, 'line-opacity': 0.8, 'line-dasharray': [1, 1] }
          : { 'line-color': '#8b5cf6', 'line-width': 4, 'line-opacity': 0.8 };

      map.current.addLayer({
        id: routeId,
        type: 'line',
        source: routeId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: routePaintStyle,
      });
    }
  };

  // Fetch route between two points
  const fetchRoute = async (start: [number, number], end: [number, number], routeId: string) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
      );
      const data = await response.json();
      if (data.routes?.[0]) {
        const route = data.routes[0];
        if (routeId === 'route') setRouteData(route);
        else if (routeId === 'driver-to-pickup-route') setDriverToPickupRouteData(route);
        addRouteToMap(route, routeId);
      }
    } catch (error) {
      console.error(`Error fetching route for ${routeId}:`, error);
    }
  };

  // Create marker elements
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

  const createDriverMarkerElement = () => {
    const el = document.createElement('div');
    el.className = 'driver-marker';
    el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
        <defs>
          <linearGradient id="driverGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#8b5cf6" />
            <stop offset="100%" stop-color="#7c3aed" />
          </linearGradient>
          <filter id="driverShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#5b21b6" flood-opacity="0.8"/>
          </filter>
        </defs>
        <path d="M38 18H10c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h28c1.1 0 2-.9 2-2V20c0-1.1-.9-2-2-2z" fill="url(#driverGradient)" filter="url(#driverShadow)" stroke="#5b21b6" stroke-width="0.5"/>
        <path d="M24 18l6-6h-12l6 6z" fill="#e1bee7" fill-opacity="0.8" stroke="#5b21b6" stroke-width="0.3"/>
        <rect x="12" y="18" width="4" height="6" rx="1" fill="#e1bee7" fill-opacity="0.6" stroke="#5b21b6" stroke-width="0.3"/>
        <rect x="32" y="18" width="4" height="6" rx="1" fill="#e1bee7" fill-opacity="0.6" stroke="#5b21b6" stroke-width="0.3"/>
        <circle cx="12" cy="32" r="4" fill="#212121" stroke="#424242" stroke-width="1.5"/>
        <circle cx="36" cy="32" r="4" fill="#212121" stroke="#424242" stroke-width="1.5"/>
        <circle cx="12" cy="32" r="2" fill="#757575" stroke="#9e9e9e" stroke-width="0.5"/>
        <circle cx="36" cy="32" r="2" fill="#757575" stroke="#9e9e9e" stroke-width="0.5"/>
        <circle cx="42" cy="24" r="2" fill="#ffeb3b" stroke="#fbc02d" stroke-width="0.5"/>
        <circle cx="6" cy="24" r="2" fill="#ffeb3b" stroke="#fbc02d" stroke-width="0.5"/>
        <circle cx="24" cy="24" r="22" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-opacity="0.3">
          <animate attributeName="r" from="22" to="28" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite"/>
        </circle>
      </svg>
    `;
    return el;
  };

  // Get and update current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMapError('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { longitude, latitude } = position.coords;
        setCurrentLocation({ longitude, latitude });
        const address = await getAddressFromCoords(longitude, latitude);
        setCurrentAddress(address);
        if (onLocationUpdate) onLocationUpdate({ longitude, latitude, address });

        if (map.current) {
          if (currentLocationMarkerRef.current) {
            currentLocationMarkerRef.current.setLngLat([longitude, latitude]);
          } else {
            currentLocationMarkerRef.current = new mapboxgl.Marker({
              element: createCurrentLocationMarkerElement(),
            })
              .setLngLat([longitude, latitude])
              .addTo(map.current);
          }
          map.current.flyTo({ center: [longitude, latitude], zoom: 16 });
        }
        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setMapError('Unable to get your location. Please check permissions.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Map initialization
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    if (!MAPBOX_TOKEN) {
      setMapError('Mapbox token is missing.');
      return;
    }

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialOptions.center || [31.033, -17.827],
      zoom: initialOptions.zoom || 12,
      ...initialOptions,
    });
    
    map.current = mapInstance;

    mapInstance.on('load', () => {
      console.log('✅ Map loaded and ready');
      mapInstance.resize();
      setIsMapReady(true);
      if (onLoaded) onLoaded(mapInstance);
      if (showCurrentLocation) getCurrentLocation();
    });

    mapInstance.on('error', (e) => {
      console.error('Mapbox error:', e);
      setMapError('Failed to load the map.');
    });
    
    // Add controls after initialization
    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapInstance.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    mapInstance.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserLocation: true,
        showUserHeading: true
      }), 'top-right'
    );

    return () => {
      console.log('Cleaning up map instance.');
      mapInstance.remove();
      map.current = null;
      setIsMapReady(false);
      if (onRemoved) onRemoved();
    };
  }, []);

  // Update markers and routes when map is ready
  useEffect(() => {
    if (!isMapReady || !map.current) return;

    // Update Pickup Marker
    if (pickupLocation) {
      const { longitude, latitude } = pickupLocation;
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.setLngLat([longitude, latitude]);
      } else {
        pickupMarkerRef.current = new mapboxgl.Marker({ element: createPickupMarkerElement() })
          .setLngLat([longitude, latitude])
          .addTo(map.current);
      }
    }

    // Update Delivery Marker
    if (deliveryLocation) {
      const { longitude, latitude } = deliveryLocation;
      if (deliveryMarkerRef.current) {
        deliveryMarkerRef.current.setLngLat([longitude, latitude]);
      } else {
        deliveryMarkerRef.current = new mapboxgl.Marker({ element: createDeliveryMarkerElement() })
          .setLngLat([longitude, latitude])
          .addTo(map.current);
      }
    }

    // Update Pickup-to-Delivery Route and Bounds
    if (pickupLocation && deliveryLocation) {
      if (showRoute) {
        fetchRoute(
          [pickupLocation.longitude, pickupLocation.latitude],
          [deliveryLocation.longitude, deliveryLocation.latitude],
          'route'
        );
      }
      if (!driverLocation) {
        const bounds = new mapboxgl.LngLatBounds()
          .extend([pickupLocation.longitude, pickupLocation.latitude])
          .extend([deliveryLocation.longitude, deliveryLocation.latitude]);
        map.current.fitBounds(bounds, { padding: 100, maxZoom: 15, duration: 1000 });
      }
    }
  }, [pickupLocation, deliveryLocation, showRoute, isMapReady]);

  // Update driver location and routes
  useEffect(() => {
    if (!isMapReady || !map.current || !driverLocation) return;

    const { longitude, latitude, heading, route, eta } = driverLocation;

    // Update Driver Marker
    updateDriverMarker({ longitude, latitude, heading });

    // Update Driver-to-Pickup Route
    if (pickupLocation) {
      fetchRoute(
        [longitude, latitude],
        [pickupLocation.longitude, pickupLocation.latitude],
        'driver-to-pickup-route'
      );
    }

    // Update real-time route if provided
    if (route) {
      updateRealTimeRoute(route);
    }

    // Update ETA
    if (eta) {
      setDriverEta(eta);
    }

    // Fit map to show all points including the driver
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([longitude, latitude]);
    if (pickupLocation) bounds.extend([pickupLocation.longitude, pickupLocation.latitude]);
    if (deliveryLocation) bounds.extend([deliveryLocation.longitude, deliveryLocation.latitude]);

    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, { padding: 100, maxZoom: 15, duration: 1000 });
    }
  }, [driverLocation, isMapReady]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-800 rounded-2xl">
        <div className="text-center text-white">
          <div className="text-2xl mb-2">🌍</div>
          <p className="text-lg font-semibold">Map Configuration Required</p>
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
      {!isMapReady && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-800/80 rounded-2xl">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2"></div>
            <p className="text-sm">Loading Map...</p>
          </div>
        </div>
      )}

      {(currentLocation || currentAddress) && (
        <div className="absolute top-4 left-4 z-10 bg-black/80 text-white p-3 rounded-lg backdrop-blur-sm max-w-xs">
          <h3 className="font-semibold text-purple-400 mb-2">Your Location</h3>
          {currentAddress && <p className="text-sm mb-1">{currentAddress}</p>}
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

      {driverLocation && (
        <div className="absolute top-4 right-4 z-10 bg-black/80 text-white p-3 rounded-lg backdrop-blur-sm">
          <h3 className="font-semibold text-green-400 mb-2">Driver Location</h3>
          <p className="text-sm">Live tracking active</p>
          <p className="text-xs text-gray-400 mt-1">
            {driverLocation.latitude.toFixed(6)}, {driverLocation.longitude.toFixed(6)}
          </p>
          {driverLocation.speed && (
            <p className="text-xs text-gray-400">
              Speed: {(driverLocation.speed * 3.6).toFixed(1)} km/h
            </p>
          )}
          {/* NEW: Driver ETA Display */}
          {driverEta && (
            <div className="mt-2 pt-2 border-t border-gray-600">
              <p className="text-sm text-green-400 font-semibold">
                ETA: {driverEta} minutes
              </p>
            </div>
          )}
        </div>
      )}

      {/* NEW: Real-time Route ETA Display */}
      {driverEta && (
        <div className="absolute top-24 right-4 z-10 bg-black/80 text-white p-3 rounded-lg backdrop-blur-sm">
          <h3 className="font-semibold text-green-400 mb-1">Driver ETA</h3>
          <p className="text-lg font-bold">{driverEta} minutes</p>
          <p className="text-xs text-gray-400">until arrival</p>
        </div>
      )}

      {routeData && (
        <div className="absolute bottom-20 left-4 z-10 bg-black/80 text-white p-3 rounded-lg backdrop-blur-sm">
          <h3 className="font-semibold text-purple-400 mb-2">Delivery Route</h3>
          <p className="text-sm">Distance: {(routeData.distance / 1000).toFixed(1)} km</p>
          <p className="text-sm">Duration: {Math.round(routeData.duration / 60)} min</p>
        </div>
      )}

      {driverToPickupRouteData && (
        <div className="absolute bottom-20 right-4 z-10 bg-black/80 text-white p-3 rounded-lg backdrop-blur-sm">
          <h3 className="font-semibold text-yellow-400 mb-2">Driver to Pickup</h3>
          <p className="text-sm">Distance: {(driverToPickupRouteData.distance / 1000).toFixed(1)} km</p>
          <p className="text-sm">ETA: {Math.round(driverToPickupRouteData.duration / 60)} min</p>
        </div>
      )}

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