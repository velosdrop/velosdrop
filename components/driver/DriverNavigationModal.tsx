// components/driver/DriverNavigationModal.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  FiX, 
  FiMapPin, 
  FiNavigation, 
  FiPhone, 
  FiCheckCircle, 
  FiClock,
  FiPackage,
  FiUser,
  FiNavigation2,
  FiChevronUp,
  FiChevronDown,
  FiAlertCircle,
  FiRotateCw,
  FiCompass,
  FiTarget,
  FiHome,
  FiMap,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';

interface LocationCoordinates {
  longitude: number;
  latitude: number;
}

interface NavigationData {
  pickupLocation: LocationCoordinates;
  deliveryLocation: LocationCoordinates;
  pickupAddress: string;
  deliveryAddress: string;
  orderId: number;
  customerUsername: string;
  fare: number;
  customerPhoneNumber?: string;
}

interface DriverNavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  navigationData: NavigationData;
  driverId: number;
  onDeliveryComplete?: () => void;
}

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: string;
  location?: [number, number];
}

export default function DriverNavigationModal({
  isOpen,
  onClose,
  navigationData,
  driverId,
  onDeliveryComplete
}: DriverNavigationModalProps) {
  const [currentStep, setCurrentStep] = useState<'to_pickup' | 'picked_up' | 'to_delivery'>('to_pickup');
  const [eta, setEta] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [instructions, setInstructions] = useState<RouteStep[]>([]);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [nextInstruction, setNextInstruction] = useState<string>('');
  const [isNavigating, setIsNavigating] = useState(true);
  const [heading, setHeading] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isFollowingDriver, setIsFollowingDriver] = useState(true);
  
  // Zimbabwe default coordinates (Harare)
  const ZIMBABWE_BOUNDS = {
    minLng: 25.0,
    maxLng: 33.0,
    minLat: -22.5,
    maxLat: -15.5
  };
  
  const HARARE_CENTER: [number, number] = [31.0522, -17.8292];
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const routeSourceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const pickupMarkerRef = useRef<any>(null);
  const deliveryMarkerRef = useRef<any>(null);
  const mapboxglRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const locationWatchId = useRef<number | null>(null);
  const routeUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize with proper coordinates
  useEffect(() => {
    if (!isOpen) return;
    
    console.log('🔍 Navigation Data:', {
      pickupLocation: navigationData.pickupLocation,
      deliveryLocation: navigationData.deliveryLocation,
      pickupAddress: navigationData.pickupAddress,
      deliveryAddress: navigationData.deliveryAddress
    });
  }, [navigationData, isOpen]);

  // Initialize Map with Zimbabwe coordinates
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const loadMapbox = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;
        mapboxglRef.current = mapboxgl;

        // Get initial center based on available locations
        const initialCenter = getInitialCenter();
        console.log('📍 Initial map center:', initialCenter);

        mapRef.current = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: initialCenter,
          zoom: 13,
          pitch: 45,
          bearing: 0,
          antialias: true,
          maxBounds: [
            [ZIMBABWE_BOUNDS.minLng, ZIMBABWE_BOUNDS.minLat],
            [ZIMBABWE_BOUNDS.maxLng, ZIMBABWE_BOUNDS.maxLat]
          ]
        });

        // Add navigation controls
        mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        
        // Add geolocate control with Zimbabwe bounds
        const geolocate = new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
            timeout: 10000
          },
          trackUserLocation: true,
          showUserLocation: true,
          showUserHeading: true,
          fitBoundsOptions: {
            maxZoom: 16
          }
        });
        
        mapRef.current.addControl(geolocate, 'top-right');

        mapRef.current.on('load', () => {
          console.log('✅ Map loaded successfully');
          setMapLoaded(true);
          
          // Add route source
          routeSourceRef.current = mapRef.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: []
              }
            }
          });

          // Add route layer
          mapRef.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              // 🔄 IMPORTANT CHANGE: Changed route color to purple
              'line-color': '#8b5cf6',
              'line-width': 5,
              'line-opacity': 0.8
            }
          });

          // Add route outline
          mapRef.current.addLayer({
            id: 'route-outline',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              // 🔄 IMPORTANT CHANGE: Changed outline color for purple route
              'line-color': '#ffffff',
              'line-width': 7,
              'line-opacity': 0.5
            }
          }, 'route');

          // Add markers
          addMarkers();
          
          // Start location tracking and route calculation
          setTimeout(() => {
            startLocationTracking();
          }, 500);
        });

        mapRef.current.on('error', (e: any) => {
          console.error('❌ Map error:', e.error);
        });

      } catch (error) {
        console.error('❌ Failed to load Mapbox:', error);
        setLocationError('Failed to load map. Please check your internet connection.');
      }
    };

    loadMapbox();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (locationWatchId.current) {
        navigator.geolocation.clearWatch(locationWatchId.current);
      }
      
      if (routeUpdateTimerRef.current) {
        clearTimeout(routeUpdateTimerRef.current);
      }
      
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      mapboxglRef.current = null;
      setMapLoaded(false);
      setCurrentLocation(null);
      setLocationError(null);
    };
  }, [isOpen]);

  // Get initial center for map
  const getInitialCenter = (): [number, number] => {
    // Use pickup location as initial center if valid
    if (isValidZimbabweCoordinate(navigationData.pickupLocation)) {
      return [
        navigationData.pickupLocation.longitude,
        navigationData.pickupLocation.latitude
      ];
    }
    
    // Otherwise use delivery location
    if (isValidZimbabweCoordinate(navigationData.deliveryLocation)) {
      return [
        navigationData.deliveryLocation.longitude,
        navigationData.deliveryLocation.latitude
      ];
    }
    
    // Default to Harare
    return HARARE_CENTER;
  };

  // Validate Zimbabwe coordinates
  const isValidZimbabweCoordinate = (location: LocationCoordinates): boolean => {
    if (!location || typeof location.longitude !== 'number' || typeof location.latitude !== 'number') {
      return false;
    }
    
    // Check if coordinates are within Zimbabwe bounds
    return (
      location.longitude >= ZIMBABWE_BOUNDS.minLng &&
      location.longitude <= ZIMBABWE_BOUNDS.maxLng &&
      location.latitude >= ZIMBABWE_BOUNDS.minLat &&
      location.latitude <= ZIMBABWE_BOUNDS.maxLat
    );
  };

  // Get valid pickup coordinates
  const getValidPickupCoordinates = (): [number, number] => {
    // Check original navigation data
    if (isValidZimbabweCoordinate(navigationData.pickupLocation)) {
      return [
        navigationData.pickupLocation.longitude,
        navigationData.pickupLocation.latitude
      ];
    }
    
    // Default to Harare central business district
    return [31.0522, -17.8292];
  };

  // Get valid delivery coordinates
  const getValidDeliveryCoordinates = (): [number, number] => {
    // Check original navigation data
    if (isValidZimbabweCoordinate(navigationData.deliveryLocation)) {
      return [
        navigationData.deliveryLocation.longitude,
        navigationData.deliveryLocation.latitude
      ];
    }
    
    // Default to Harare residential area
    return [31.0187, -17.8465];
  };

  // Add markers to map
  const addMarkers = () => {
    if (!mapRef.current || !mapboxglRef.current) return;

    try {
      // Add pickup marker
      const pickupCoords = getValidPickupCoordinates();
      const pickupEl = document.createElement('div');
      pickupEl.className = 'pickup-marker';
      pickupEl.innerHTML = `
        <div class="relative">
          <div class="w-10 h-10 bg-green-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
        </div>
      `;

      pickupMarkerRef.current = new mapboxglRef.current.Marker(pickupEl)
        .setLngLat(pickupCoords)
        .setPopup(
          new mapboxglRef.current.Popup({ offset: 25 })
            .setHTML(`
              <div class="p-3 max-w-xs">
                <div class="flex items-center space-x-2 mb-2">
                  <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 class="font-bold text-sm text-gray-900">📦 Pickup Location</h3>
                    <p class="text-xs text-gray-600">${navigationData.pickupAddress || 'Pickup address not available'}</p>
                  </div>
                </div>
                <div class="mt-2 text-xs text-green-700 font-medium bg-green-50 p-2 rounded">
                  • Package waiting here for pickup
                </div>
              </div>
            `)
        )
        .addTo(mapRef.current);

      console.log('📍 Pickup marker added:', pickupCoords);

      // Add delivery marker
      const deliveryCoords = getValidDeliveryCoordinates();
      const deliveryEl = document.createElement('div');
      deliveryEl.className = 'delivery-marker';
      deliveryEl.innerHTML = `
        <div class="relative">
          <div class="w-10 h-10 bg-blue-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
          </div>
          <div class="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full border-2 border-white animate-pulse"></div>
        </div>
      `;

      deliveryMarkerRef.current = new mapboxglRef.current.Marker(deliveryEl)
        .setLngLat(deliveryCoords)
        .setPopup(
          new mapboxglRef.current.Popup({ offset: 25 })
            .setHTML(`
              <div class="p-3 max-w-xs">
                <div class="flex items-center space-x-2 mb-2">
                  <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 class="font-bold text-sm text-gray-900">📍 Delivery Location</h3>
                    <p class="text-xs text-gray-600">${navigationData.deliveryAddress || 'Delivery address not available'}</p>
                  </div>
                </div>
                <div class="mt-2 text-xs text-blue-700 font-medium bg-blue-50 p-2 rounded">
                  • Deliver package here to complete order
                </div>
              </div>
            `)
        )
        .addTo(mapRef.current);

      console.log('📍 Delivery marker added:', deliveryCoords);

    } catch (error) {
      console.error('❌ Error adding markers:', error);
    }
  };

  // Start location tracking
  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser. Please enable location services.');
      console.error('❌ Geolocation not supported');
      return;
    }

    console.log('📍 Starting location tracking...');

    // First get current position immediately
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleLocationUpdate(position);
      },
      (error) => {
        handleLocationError(error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Then start watching position for continuous updates
    locationWatchId.current = navigator.geolocation.watchPosition(
      (position) => {
        handleLocationUpdate(position);
      },
      (error) => {
        handleLocationError(error);
      },
      { 
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000
      }
    );
  }, []);

  // Handle location update
  const handleLocationUpdate = (position: GeolocationPosition) => {
    const newLocation: [number, number] = [
      position.coords.longitude,
      position.coords.latitude
    ];
    
    console.log('📍 Location update:', {
      coordinates: newLocation,
      accuracy: position.coords.accuracy,
      heading: position.coords.heading,
      speed: position.coords.speed
    });
    
    // Check if location is valid (within Zimbabwe bounds)
    if (!isValidZimbabweCoordinate({ longitude: newLocation[0], latitude: newLocation[1] })) {
      console.warn('⚠️ Location outside Zimbabwe bounds:', newLocation);
      setLocationError('Your location appears to be outside Zimbabwe. Please ensure your GPS is working correctly.');
      return;
    }
    
    setLocationError(null);
    setCurrentLocation(newLocation);
    setHeading(position.coords.heading);
    setSpeed(position.coords.speed ? Math.round(position.coords.speed * 3.6) : null);
    
    // Update driver marker
    updateDriverMarker(newLocation, position.coords.heading);
    
    // Update driver location in database
    updateDriverLocation(newLocation, position.coords.heading);
    
    // Follow driver on map if enabled
    if (isFollowingDriver && mapRef.current) {
      mapRef.current.flyTo({
        center: newLocation,
        zoom: 16,
        bearing: position.coords.heading || 0,
        pitch: 60,
        duration: 1000
      });
    }
    
    // Calculate or update route
    if (!eta && !isLoadingRoute) {
      // First time route calculation
      calculateRoute(newLocation);
    } else if (eta && currentLocation) {
      // Update route periodically (every 30 seconds or when location changes significantly)
      if (routeUpdateTimerRef.current) {
        clearTimeout(routeUpdateTimerRef.current);
      }
      
      routeUpdateTimerRef.current = setTimeout(() => {
        calculateRoute(newLocation);
      }, 30000); // Update route every 30 seconds
    }
  };

  // Handle location error
  const handleLocationError = (error: GeolocationPositionError) => {
    console.error('❌ Geolocation error:', error);
    
    switch(error.code) {
      case error.PERMISSION_DENIED:
        setLocationError('Location permission denied. Please enable location services in your browser settings.');
        break;
      case error.POSITION_UNAVAILABLE:
        setLocationError('Location information is unavailable. Please check your GPS connection.');
        break;
      case error.TIMEOUT:
        setLocationError('Location request timed out. Please check your internet connection.');
        break;
      default:
        setLocationError('Unable to get your location. Please ensure location services are enabled.');
    }
  };

  // Update driver marker
  const updateDriverMarker = (location: [number, number], newHeading: number | null) => {
    if (!mapRef.current || !mapboxglRef.current) return;

    if (!driverMarkerRef.current) {
      // Create driver marker
      const el = document.createElement('div');
      el.className = 'driver-marker';
      el.innerHTML = `
        <div class="relative">
          <div class="w-12 h-12 bg-red-600 rounded-full border-4 border-white shadow-xl flex items-center justify-center">
            <svg class="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
          ${newHeading !== null ? `
            <div class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-3">
              <div class="w-0 h-0 border-l-4 border-r-4 border-b-6 border-l-transparent border-r-transparent border-b-red-500"></div>
            </div>
          ` : ''}
        </div>
      `;
      
      driverMarkerRef.current = new mapboxglRef.current.Marker(el, {
        rotationAlignment: 'map',
        pitchAlignment: 'map',
        rotation: newHeading || 0
      })
        .setLngLat(location)
        .addTo(mapRef.current);
      
      console.log('🚗 Driver marker created at:', location);
    } else {
      // Smooth movement animation
      const currentLngLat = driverMarkerRef.current.getLngLat();
      const targetLngLat = new mapboxglRef.current.LngLat(location[0], location[1]);
      
      // Only update if location changed significantly (more than 10 meters)
      const distanceChange = Math.sqrt(
        Math.pow(targetLngLat.lng - currentLngLat.lng, 2) +
        Math.pow(targetLngLat.lat - currentLngLat.lat, 2)
      );
      
      if (distanceChange > 0.0001) { // Approximately 10 meters
        driverMarkerRef.current.setLngLat(targetLngLat);
        
        if (newHeading !== null) {
          driverMarkerRef.current.setRotation(newHeading);
        }
      }
    }
  };

  // Update driver location in database
  const updateDriverLocation = async (location: [number, number], heading: number | null) => {
    try {
      await fetch('/api/drivers/update-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverId: driverId,
          location: {
            longitude: location[0],
            latitude: location[1],
            heading: heading,
            speed: speed ? speed / 3.6 : null,
            timestamp: new Date().toISOString()
          }
        }),
      });
    } catch (error) {
      console.error('❌ Error updating driver location:', error);
    }
  };

  // Calculate route using Mapbox Directions API
  const calculateRoute = async (startLocation?: [number, number]) => {
    if (!mapLoaded) {
      console.log('⚠️ Map not loaded yet');
      return;
    }

    setIsLoadingRoute(true);
    
    try {
      const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if (!MAPBOX_TOKEN) {
        throw new Error('Mapbox token not configured');
      }

      let start: [number, number];
      
      // Use provided start location or current location
      if (startLocation) {
        start = startLocation;
      } else if (currentLocation) {
        start = currentLocation;
      } else {
        throw new Error('No start location available');
      }
      
      let end: [number, number];
      
      if (currentStep === 'to_pickup') {
        const pickupCoords = getValidPickupCoordinates();
        end = pickupCoords;
      } else {
        const deliveryCoords = getValidDeliveryCoordinates();
        end = deliveryCoords;
      }

      console.log('📍 Calculating route from:', start, 'to:', end);

      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
      );
      
      if (!response.ok) {
        throw new Error(`Directions API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        console.log('✅ Route calculated:', {
          distance: route.distance,
          duration: route.duration,
          coordinates: route.geometry.coordinates.length
        });
        
        setEta(Math.round(route.duration / 60)); // Convert to minutes
        setDistance(Math.round(route.distance / 1000)); // Convert to km
        
        // Extract instructions
        const steps: RouteStep[] = route.legs[0].steps.map((step: any, index: number) => ({
          instruction: step.maneuver.instruction
            .replace('Destination', 'Arrived at destination')
            .replace('Head', 'Continue')
            .replace(/<[^>]*>/g, ''), // Remove HTML tags
          distance: Math.round(step.distance / 1000 * 10) / 10, // km with 1 decimal
          duration: Math.round(step.duration / 60), // minutes
          maneuver: step.maneuver.type,
          location: step.maneuver.location
        }));
        
        setInstructions(steps.slice(0, 3)); // Show first 3 steps
        
        // Set next instruction
        if (steps.length > 0) {
          setNextInstruction(steps[0].instruction);
        }
        
        // Store route geometry
        setRouteGeoJSON({
          type: 'Feature',
          properties: {},
          geometry: route.geometry
        });

        // Draw route on map
        drawRoute(route.geometry);

        // Fit map to show driver, route, and destination
        fitMapToRouteAndLocations(start, end);

      } else {
        throw new Error('No route found');
      }
    } catch (error) {
      console.error('❌ Error calculating route:', error);
      setNextInstruction('Calculating route... Please wait.');
      
      // Fallback: Show straight line between points
      const start = startLocation || currentLocation || HARARE_CENTER;
      let end: [number, number];
      if (currentStep === 'to_pickup') {
        end = getValidPickupCoordinates();
      } else {
        end = getValidDeliveryCoordinates();
      }
      
      const fallbackRoute = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [start, end]
        }
      };
      drawRoute(fallbackRoute.geometry);
      
      // Still fit the map
      fitMapToRouteAndLocations(start, end);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Draw route on map
  const drawRoute = (geometry: any) => {
    if (!mapRef.current || !routeSourceRef.current) {
      console.log('⚠️ Cannot draw route: map or route source not ready');
      return;
    }

    try {
      routeSourceRef.current.setData({
        type: 'Feature',
        properties: {},
        geometry: geometry
      });
      console.log('🛣️ Route drawn on map');
    } catch (error) {
      console.error('❌ Error drawing route:', error);
    }
  };

  // Fit map to show driver, route, and destination
  const fitMapToRouteAndLocations = (start: [number, number], end: [number, number]) => {
    if (!mapRef.current || !mapboxglRef.current) return;

    const bounds = new mapboxglRef.current.LngLatBounds();
    
    // Add start (driver) location
    bounds.extend(start);
    
    // Add end (destination) location
    bounds.extend(end);
    
    // Add pickup location if we're going to delivery
    if (currentStep === 'to_delivery') {
      const pickupCoords = getValidPickupCoordinates();
      bounds.extend(pickupCoords);
    }

    // Fit bounds to show everything with padding
    if (bounds.getNorth() !== bounds.getSouth() && bounds.getEast() !== bounds.getWest()) {
      mapRef.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 300, left: 50, right: 50 },
        maxZoom: 16,
        duration: 1500
      });
      console.log('🗺️ Map fitted to route and locations');
    }
  };

  // Toggle follow driver mode
  const toggleFollowDriver = () => {
    setIsFollowingDriver(!isFollowingDriver);
    
    if (!isFollowingDriver && currentLocation && mapRef.current) {
      // If turning follow mode on, center on driver
      mapRef.current.flyTo({
        center: currentLocation,
        zoom: 16,
        bearing: heading || 0,
        pitch: 60,
        duration: 1000
      });
    }
  };

  // Handle arrival at pickup/delivery
  const handleArrived = async () => {
    if (currentStep === 'to_pickup') {
      // Mark as picked up
      setCurrentStep('picked_up');
      setNextInstruction('✓ Package picked up! Heading to delivery...');
      
      // Update order status in database
      await updateOrderStatus('picked_up');
      
      // Calculate route to delivery after delay
      setTimeout(() => {
        setCurrentStep('to_delivery');
        if (currentLocation) {
          calculateRoute(currentLocation);
        }
      }, 2000);
      
    } else if (currentStep === 'to_delivery') {
      // Mark as delivered
      setNextInstruction('✓ Package delivered! Delivery completed');
      
      // Update order status in database
      await updateOrderStatus('delivered');
      
      // Call delivery complete callback if provided
      if (onDeliveryComplete) {
        setTimeout(() => {
          onDeliveryComplete();
        }, 2000);
      }
      
      // Close navigation after delay
      setTimeout(() => {
        onClose();
      }, 3000);
    }
  };

  // Update order status
  const updateOrderStatus = async (status: string) => {
    try {
      const response = await fetch(`/api/deliveries/${navigationData.orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: status,
          driverId: driverId,
          timestamp: new Date().toISOString()
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update order status');
      }
      
      console.log(`✅ Order status updated to: ${status}`);
    } catch (error) {
      console.error('❌ Error updating order status:', error);
    }
  };

  // Format ETA
  const formatEta = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Format distance
  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  // Format speed
  const formatSpeed = (kmh: number) => {
    return `${kmh} km/h`;
  };

  // Recalculate route when step changes
  useEffect(() => {
    if (currentLocation && (currentStep === 'to_pickup' || currentStep === 'to_delivery') && mapLoaded) {
      calculateRoute(currentLocation);
    }
  }, [currentStep, mapLoaded]);

  // Add custom CSS - UPDATED for better mobile responsiveness
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .driver-marker, .pickup-marker, .delivery-marker {
        z-index: 1000;
      }
      .mapboxgl-ctrl-top-right {
        top: 70px !important;
      }
      .mapbox-improve-map {
        display: none !important;
      }
      .navigation-card {
        backdrop-filter: blur(10px);
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.1);
      }
      .instruction-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
        border: 2px solid rgba(255, 255, 255, 0.2);
      }
      .step-progress {
        background: linear-gradient(90deg, #10b981, #3b82f6);
        box-shadow: 0 2px 10px rgba(16, 185, 129, 0.3);
      }
      .pulse-ring {
        animation: pulse 2s infinite;
      }
      @keyframes pulse {
        0% { transform: scale(0.95); opacity: 0.7; }
        70% { transform: scale(1.1); opacity: 0.3; }
        100% { transform: scale(0.95); opacity: 0.7; }
      }
      .location-status {
        backdrop-filter: blur(5px);
        background: rgba(0, 0, 0, 0.7);
      }
      
      /* 🔄 IMPORTANT CHANGE: Additional responsive styles */
      @media (max-width: 640px) {
        .compact-stats {
          font-size: 0.7rem;
          padding: 0.25rem 0.5rem;
        }
        .mobile-hide {
          display: none !important;
        }
        .mobile-show {
          display: flex !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Map Container - Full screen */}
      <div className="h-full w-full">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Location Status Indicator */}
      {locationError && (
        <motion.div 
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30"
        >
          <div className="bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <FiAlertCircle className="h-5 w-5" />
            <span>{locationError}</span>
            <button
              onClick={startLocationTracking}
              className="ml-4 px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        </motion.div>
      )}

      {/* 🔄 IMPORTANT CHANGE: COMPACT Top Bar for Mobile */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-r from-blue-900/95 to-indigo-900/95 backdrop-blur-lg p-2 sm:p-3 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 shadow-lg flex-shrink-0"
          >
            <FiX size={18} className="sm:size-20 text-white" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 flex-wrap">
              <h1 className="font-bold text-white text-sm sm:text-base truncate">
                Order #{navigationData.orderId}
              </h1>
              <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-white/20 rounded-full text-xs text-white font-medium flex-shrink-0">
                {currentStep === 'to_pickup' ? 'PICKUP' : 
                 currentStep === 'picked_up' ? 'TRANSIT' : 
                 'DELIVER'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-blue-200 truncate">
              {navigationData.customerUsername} • ${navigationData.fare.toFixed(2)}
            </p>
          </div>
        </div>
        
        {/* 🔄 IMPORTANT CHANGE: Compact stats for mobile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Follow Driver Toggle - Mobile friendly */}
          <button
            onClick={toggleFollowDriver}
            className={`p-1.5 sm:p-2 rounded-full ${isFollowingDriver ? 'bg-green-500' : 'bg-white/20'} hover:opacity-90 transition-colors flex-shrink-0`}
            title={isFollowingDriver ? 'Following your location' : 'Click to follow your location'}
          >
            <FiTarget className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
          </button>
          
          {/* Stats Container - Responsive */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {speed !== null && (
              <div className="bg-white/20 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full backdrop-blur-sm border border-white/10 compact-stats hidden xs:block">
                <span className="font-bold text-white text-xs sm:text-sm flex items-center gap-1">
                  <FiCompass className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="mobile-hide sm:inline">{formatSpeed(speed)}</span>
                </span>
              </div>
            )}
            {eta && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-lg compact-stats">
                <span className="font-bold text-white text-xs sm:text-sm flex items-center gap-1">
                  <FiClock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>{formatEta(eta)}</span>
                </span>
              </div>
            )}
            {distance && (
              <div className="bg-white/20 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full backdrop-blur-sm border border-white/10 compact-stats mobile-hide sm:block">
                <span className="font-bold text-white text-xs sm:text-sm flex items-center gap-1">
                  <FiNavigation className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>{formatDistance(distance)}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🔄 IMPORTANT CHANGE: Responsive Next Instruction Card */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="absolute top-16 sm:top-20 left-1/2 transform -translate-x-1/2 z-30 w-11/12 max-w-2xl"
      >
        <div className="instruction-card text-white rounded-xl sm:rounded-2xl shadow-2xl p-3 sm:p-5 border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${currentStep === 'to_pickup' ? 'bg-green-500' : 'bg-blue-500'} flex items-center justify-center flex-shrink-0`}>
                  {currentStep === 'to_pickup' ? (
                    <FiMapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <FiPackage className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                </div>
                <p className="font-semibold text-xs sm:text-sm opacity-90 truncate">
                  {currentStep === 'to_pickup' ? 'To Pickup' : 'To Delivery'}
                </p>
              </div>
              <p className="font-bold text-base sm:text-xl leading-tight truncate">
                {nextInstruction || (isLoadingRoute ? 'Calculating route...' : 'Getting location...')}
              </p>
            </div>
            <div className="ml-3 sm:ml-6 flex-shrink-0">
              {isLoadingRoute ? (
                <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full border-3 sm:border-4 border-white/30 border-t-white animate-spin"></div>
              ) : (
                <div className="relative">
                  <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center pulse-ring">
                    <div className="w-7 h-7 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center">
                      {currentStep === 'to_pickup' ? (
                        <FiMapPin className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
                      ) : (
                        <FiPackage className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2 sm:gap-4">
                {eta && (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <FiClock className="h-3 w-3 sm:h-4 sm:w-4 opacity-80" />
                    <span className="font-medium">ETA: {formatEta(eta)}</span>
                  </div>
                )}
                {distance && (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <FiNavigation className="h-3 w-3 sm:h-4 sm:w-4 opacity-80" />
                    <span className="font-medium">{formatDistance(distance)} left</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={toggleFollowDriver}
                  className={`flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg transition-colors ${isFollowingDriver ? 'bg-green-500/20 text-green-300' : 'bg-white/20 hover:bg-white/30'}`}
                  title={isFollowingDriver ? 'Following your location' : 'Click to follow your location'}
                >
                  <FiTarget className="h-3 w-3" />
                  <span className="text-xs">{isFollowingDriver ? 'Following' : 'Follow'}</span>
                </button>
                <button
                  onClick={() => currentLocation && calculateRoute(currentLocation)}
                  disabled={isLoadingRoute}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50"
                >
                  <FiRotateCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isLoadingRoute ? 'animate-spin' : ''}`} />
                  <span className="text-xs sm:text-sm">Recalc</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 🔄 IMPORTANT CHANGE: Enhanced Bottom Navigation Panel */}
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: isCollapsed ? 'calc(100% - 60px)' : 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 z-40 navigation-card shadow-2xl rounded-t-xl sm:rounded-t-2xl border-t border-gray-200"
      >
        {/* Collapse Handle */}
        <div 
          className="flex justify-center py-3 sm:py-4 cursor-pointer hover:bg-gray-50/50 rounded-t-xl sm:rounded-t-2xl transition-colors"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="w-12 h-1.5 sm:w-16 sm:h-2 bg-gray-300 rounded-full"></div>
        </div>

        {/* Main Content */}
        {!isCollapsed && (
          <div className="p-4 sm:p-6 max-w-6xl mx-auto">
            {/* Progress & Locations - Mobile Optimized */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-6 gap-4">
                <div className="flex items-center justify-between w-full sm:w-auto sm:flex-1 sm:gap-4">
                  {/* Pickup - Mobile Compact */}
                  <div className={`flex items-center gap-2 sm:gap-4 ${currentStep === 'to_pickup' || currentStep === 'picked_up' ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`relative ${currentStep === 'to_pickup' || currentStep === 'picked_up' ? 'pulse-ring' : ''}`}>
                      <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center ${currentStep === 'to_pickup' || currentStep === 'picked_up' ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <FiMapPin className="h-5 w-5 sm:h-7 sm:w-7" />
                      </div>
                      {currentStep === 'to_pickup' && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-6 sm:h-6 bg-green-500 rounded-full border-2 sm:border-3 border-white animate-pulse"></div>
                      )}
                    </div>
                    <div className="hidden sm:block">
                      <p className="font-bold text-gray-900 text-sm sm:text-base">Pickup</p>
                      <p className="text-xs text-gray-600 max-w-[140px] sm:max-w-[180px] truncate">{navigationData.pickupAddress}</p>
                    </div>
                  </div>

                  {/* Progress Line - Mobile Optimized */}
                  <div className="flex-1 h-2 bg-gray-200 rounded-full mx-2 sm:mx-6 relative hidden sm:block">
                    <div 
                      className="step-progress h-full rounded-full transition-all duration-1000 ease-out" 
                      style={{ 
                        width: currentStep === 'to_pickup' ? '33%' : 
                               currentStep === 'picked_up' ? '66%' : 
                               '100%' 
                      }}
                    ></div>
                    <div className="absolute top-1/2 left-1/3 transform -translate-x-1/2 -translate-y-1/2">
                      <div className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full ${currentStep === 'picked_up' || currentStep === 'to_delivery' ? 'bg-green-500' : 'bg-gray-300'} border-2 sm:border-4 border-white`}></div>
                    </div>
                  </div>

                  {/* Delivery - Mobile Compact */}
                  <div className={`flex items-center gap-2 sm:gap-4 ${currentStep === 'to_delivery' ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`relative ${currentStep === 'to_delivery' ? 'pulse-ring' : ''}`}>
                      <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center ${currentStep === 'to_delivery' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <FiPackage className="h-5 w-5 sm:h-7 sm:w-7" />
                      </div>
                      {currentStep === 'to_delivery' && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-6 sm:h-6 bg-blue-500 rounded-full border-2 sm:border-3 border-white animate-pulse"></div>
                      )}
                    </div>
                    <div className="hidden sm:block">
                      <p className="font-bold text-gray-900 text-sm sm:text-base">Delivery</p>
                      <p className="text-xs text-gray-600 max-w-[140px] sm:max-w-[180px] truncate">{navigationData.deliveryAddress}</p>
                    </div>
                  </div>
                </div>
                
                {/* Mobile Address Display */}
                <div className="sm:hidden w-full text-center">
                  <p className="font-bold text-gray-900 text-sm">
                    {currentStep === 'to_pickup' ? 'Pickup: ' : 
                     currentStep === 'picked_up' ? 'En Route to: ' : 
                     'Delivery: '}
                    <span className="font-normal text-gray-600">
                      {currentStep === 'to_pickup' ? navigationData.pickupAddress : 
                       navigationData.deliveryAddress}
                    </span>
                  </p>
                </div>
              </div>

              {/* Action Button - Mobile Friendly */}
              <button
                onClick={handleArrived}
                disabled={isLoadingRoute}
                className={`w-full py-3 sm:py-5 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-2 sm:gap-4 transition-all duration-200 shadow-lg ${
                  currentStep === 'to_pickup' 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white' 
                    : currentStep === 'to_delivery'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white'
                    : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                } ${isLoadingRoute ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FiCheckCircle className="h-5 w-5 sm:h-7 sm:w-7" />
                <span className="text-sm sm:text-lg">
                  {currentStep === 'to_pickup' ? 'Arrived at Pickup' : 
                   currentStep === 'picked_up' ? 'Package Picked Up' : 
                   'Arrived at Delivery'}
                </span>
              </button>
            </div>

            {/* Customer & Instructions - Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Customer Contact */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-blue-100">
                <h3 className="font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FiUser className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <span className="text-sm sm:text-base">Customer Contact</span>
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">{navigationData.customerUsername}</p>
                    <p className="text-xs sm:text-sm text-gray-600">Order #{navigationData.orderId}</p>
                  </div>
                  {navigationData.customerPhoneNumber && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <a 
                        href={`tel:${navigationData.customerPhoneNumber}`}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1.5 sm:gap-2 font-medium text-sm"
                      >
                        <FiPhone className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="truncate">{navigationData.customerPhoneNumber}</span>
                      </a>
                      <a
                        href={`tel:${navigationData.customerPhoneNumber}`}
                        className="bg-blue-600 text-white px-3 py-2 sm:px-5 sm:py-3 rounded-lg sm:rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 shadow-md text-sm"
                      >
                        <FiPhone className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Call Now</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Route Instructions */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Next Steps</h3>
                <div className="space-y-2 sm:space-y-3 max-h-40 sm:max-h-48 overflow-y-auto pr-1 sm:pr-2">
                  {instructions.length > 0 ? (
                    instructions.map((instruction, index) => (
                      <div key={index} className="flex items-start gap-2.5 sm:gap-4 p-2.5 sm:p-3 bg-white rounded-lg sm:rounded-xl shadow-sm">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs sm:text-sm font-bold text-blue-700">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-xs sm:text-sm">{instruction.instruction}</p>
                          <div className="flex items-center gap-2 sm:gap-4 mt-1.5 text-xs text-gray-500">
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <FiNavigation className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              {formatDistance(instruction.distance)}
                            </span>
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <FiClock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              {instruction.duration} min
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 sm:p-4 text-center">
                      <p className="text-gray-500 text-xs sm:text-sm">
                        {isLoadingRoute ? 'Calculating route instructions...' : 'No route instructions available'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Info - Mobile Optimized */}
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-gray-500">
                <div className="flex items-center flex-wrap gap-3 sm:gap-6">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <FiClock className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Started: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${currentLocation ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                    <span>{currentLocation ? 'Navigation Active' : 'Getting location...'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-normal gap-2 sm:gap-4">
                  <button
                    onClick={toggleFollowDriver}
                    className={`flex items-center gap-1.5 ${isFollowingDriver ? 'text-green-600 hover:text-green-800' : 'text-blue-600 hover:text-blue-800'} font-medium text-xs sm:text-sm`}
                  >
                    <FiTarget className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">{isFollowingDriver ? 'Following' : 'Follow'}</span>
                  </button>
                  <button
                    onClick={() => currentLocation && calculateRoute(currentLocation)}
                    disabled={isLoadingRoute}
                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium text-xs sm:text-sm"
                  >
                    <FiRotateCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isLoadingRoute ? 'animate-spin' : ''}`} />
                    <span>Recalc</span>
                  </button>
                  <button
                    onClick={() => {
                      if (mapRef.current && currentLocation) {
                        mapRef.current.flyTo({
                          center: currentLocation,
                          zoom: 16,
                          bearing: heading || 0,
                          pitch: 60,
                          duration: 1000
                        });
                      }
                    }}
                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium text-xs sm:text-sm"
                    disabled={!currentLocation}
                  >
                    <FiNavigation2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Re-center</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed View - Mobile Optimized */}
        {isCollapsed && (
          <div className="p-3 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <FiNavigation2 className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm sm:text-base">
                  {currentStep === 'to_pickup' ? 'To Pickup' : 
                   currentStep === 'picked_up' ? 'To Delivery' : 
                   'Navigation'}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 truncate max-w-[150px] sm:max-w-none">
                  {eta ? `${formatEta(eta)} remaining` : 'Calculating route...'} • {navigationData.customerUsername}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={toggleFollowDriver}
                className={`p-1.5 sm:p-2 rounded-full ${isFollowingDriver ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'} hover:opacity-90`}
                title={isFollowingDriver ? 'Following your location' : 'Click to follow your location'}
              >
                <FiTarget className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
              </button>
              <button
                onClick={handleArrived}
                className={`px-3 py-1.5 sm:px-5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm ${
                  currentStep === 'to_pickup' 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {currentStep === 'to_pickup' ? 'Arrived' : 'Delivered'}
              </button>
              <button
                onClick={() => setIsCollapsed(false)}
                className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100"
              >
                <FiChevronUp className="h-4 w-4 sm:h-6 sm:w-6 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}