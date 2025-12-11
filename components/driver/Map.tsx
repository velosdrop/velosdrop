//components/driver/Map.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import LocationPermissionRequest from '@/components/driver/LocationPermissionRequest';
import ChatBubble from '@/components/driver/ChatBubble';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const isInDeliveryZone = (driverLocation: { longitude: number; latitude: number }, 
                          deliveryLocation: { longitude: number; latitude: number }, 
                          radiusMeters = 100): boolean => {
  const distanceKm = calculateDistance(
    driverLocation.latitude,
    driverLocation.longitude,
    deliveryLocation.latitude,
    deliveryLocation.longitude
  );
  return distanceKm * 1000 <= radiusMeters; // Convert km to meters
};

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
    id: number;
    deliveryId: number;
    customerId: number;
    customerUsername: string;
    pickupLocation: { longitude: number; latitude: number };
    deliveryLocation: { longitude: number; latitude: number };
    customerLocation?: { longitude: number; latitude: number };
    pickupAddress: string;
    deliveryAddress: string;
    fare: number;
    customerPhoneNumber?: string;
  } | null;
}

// Destination type for Waze navigation
type WazeDestinationType = 'pickup' | 'delivery' | 'customer';

// Waze navigation state
interface WazeNavigationState {
  destinationType: WazeDestinationType;
  isNavigating: boolean;
  lastUsedDestination: WazeDestinationType | null;
  showReminder: boolean;
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
  const customerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState<{ longitude: number; latitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [driverToPickupRouteData, setDriverToPickupRouteData] = useState<any>(null);
  const [driverToCustomerRouteData, setDriverToCustomerRouteData] = useState<any>(null);
  const [currentEta, setCurrentEta] = useState<number | null>(null);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [pickupEta, setPickupEta] = useState<number | null>(null);
  const [pickupDistance, setPickupDistance] = useState<number | null>(null);
  
  // Fixed: Moved showCompleteButton state INSIDE the component
  const [showCompleteButton, setShowCompleteButton] = useState(false);
  
  // Premium Waze Navigation State
  const [wazeState, setWazeState] = useState<WazeNavigationState>({
    destinationType: 'pickup',
    isNavigating: false,
    lastUsedDestination: null,
    showReminder: true
  });
  const [showWazeOptions, setShowWazeOptions] = useState(false);
  const [wazeButtonPulse, setWazeButtonPulse] = useState(false);

  // Image upload handler for chat
  const handleImageUpload = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('deliveryId', activeDelivery?.deliveryId.toString() || '');
    formData.append('driverId', driverId?.toString() || '');
    
    try {
      const response = await fetch('/api/upload/delivery-proof', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  // PREMIUM FEATURE: Waze Navigation Function with all premium features
  const openWazeNavigation = (
    destinationType: WazeDestinationType = 'pickup',
    options?: {
      skipConfirmation?: boolean;
      forceNewTab?: boolean;
    }
  ) => {
    if (!activeDelivery) {
      console.error('❌ No active delivery for Waze navigation');
      return;
    }

    // Determine destination based on type
    let destination: { longitude: number; latitude: number };
    let destinationName: string;
    let address: string;

    switch (destinationType) {
      case 'pickup':
        destination = activeDelivery.pickupLocation;
        destinationName = `Pickup: ${activeDelivery.customerUsername}`;
        address = activeDelivery.pickupAddress;
        break;
      case 'delivery':
        destination = activeDelivery.deliveryLocation;
        destinationName = `Delivery: ${activeDelivery.customerUsername}`;
        address = activeDelivery.deliveryAddress;
        break;
      case 'customer':
        destination = activeDelivery.customerLocation || activeDelivery.deliveryLocation;
        destinationName = `Customer: ${activeDelivery.customerUsername}`;
        address = activeDelivery.deliveryAddress;
        break;
      default:
        destination = activeDelivery.pickupLocation;
        destinationName = `Pickup: ${activeDelivery.customerUsername}`;
        address = activeDelivery.pickupAddress;
    }

    const { latitude, longitude } = destination;
    
    // Premium Waze Deep Link Construction with all recommended parameters
    const wazeUrl = new URL('https://waze.com/ul');
    
    // Core navigation parameters
    wazeUrl.searchParams.append('ll', `${latitude},${longitude}`);
    wazeUrl.searchParams.append('navigate', 'yes');
    wazeUrl.searchParams.append('zoom', '15'); // Optimal zoom level
    
    // Enhanced search query with context
    const searchQuery = `${destinationName} - ${address.substring(0, 50)}`;
    wazeUrl.searchParams.append('q', encodeURIComponent(searchQuery));
    
    // UTM tracking for partner support (recommended by Waze)
    wazeUrl.searchParams.append('utm_source', 'delivery-driver-app');
    wazeUrl.searchParams.append('utm_medium', 'web-deeplink');
    wazeUrl.searchParams.append('utm_campaign', 'driver-navigation');
    
    console.log('🚗 Premium Waze URL:', wazeUrl.toString());
    console.log('📍 Destination:', { destinationType, coordinates: destination, address });

    // Set navigation state
    setWazeState(prev => ({
      ...prev,
      destinationType,
      isNavigating: true,
      lastUsedDestination: destinationType
    }));

    // Start button pulsing animation
    setWazeButtonPulse(true);
    setTimeout(() => setWazeButtonPulse(false), 3000);

    // Open in new tab strategy for web apps
    const wazeWindow = window.open(
      wazeUrl.toString(),
      'waze-navigation',
      'noopener,noreferrer,width=800,height=600'
    );

    if (wazeWindow) {
      wazeWindow.focus();
      
      // Track tab/window for better user experience
      const checkTabClosed = setInterval(() => {
        if (wazeWindow.closed) {
          clearInterval(checkTabClosed);
          setWazeState(prev => ({ ...prev, isNavigating: false }));
          console.log('🔙 Driver returned from Waze navigation');
          
          // Show return notification if needed
          if (wazeState.showReminder) {
            showReturnReminder();
          }
        }
      }, 1000);
    }

    // Show smart reminder (only first time or based on user preference)
    if (wazeState.showReminder && !options?.skipConfirmation) {
      setTimeout(() => {
        if (confirm(
          `🚗 Waze Navigation Started!\n\n📱 Destination: ${destinationType.toUpperCase()}\n📍 ${address.substring(0, 60)}...\n\n💡 IMPORTANT FOR WEB APPS:\n1. Keep THIS browser tab open\n2. Return here to mark delivery complete\n3. Your location is still being tracked\n\n✅ Click OK to continue\n🔕 Click Cancel to disable reminders`
        )) {
          // User acknowledged
        } else {
          // User wants to disable reminders
          setWazeState(prev => ({ ...prev, showReminder: false }));
          localStorage.setItem('waze-reminder-disabled', 'true');
        }
      }, 1000);
    }

    // Log navigation event for analytics
    logWazeNavigation(destinationType, destination, address);
  };

  // Premium: Show return reminder when driver might have completed navigation
  const showReturnReminder = () => {
    // Check if driver is near destination
    const isNearDestination = checkProximityToDestination();
    
    if (isNearDestination && wazeState.showReminder) {
      // Create a non-intrusive notification
      const reminderDiv = document.createElement('div');
      reminderDiv.className = 'waze-return-reminder';
      reminderDiv.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px 20px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          z-index: 9999;
          max-width: 320px;
          backdrop-filter: blur(10px);
          animation: slideIn 0.5s ease-out;
        ">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="
              width: 36px;
              height: 36px;
              background: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              color: #667eea;
            ">✓</div>
            <div>
              <div style="font-weight: bold; margin-bottom: 4px;">Return to Delivery App</div>
              <div style="font-size: 14px; opacity: 0.9;">Tap to mark delivery as complete</div>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(reminderDiv);
      
      // Auto-remove after 10 seconds
      setTimeout(() => {
        if (reminderDiv.parentNode) {
          reminderDiv.remove();
        }
      }, 10000);
      
      // Click to remove
      reminderDiv.onclick = () => reminderDiv.remove();
    }
  };

  // Premium: Check if driver is near destination
  const checkProximityToDestination = (): boolean => {
    if (!lastLocation || !activeDelivery) return false;
    
    let destination: { longitude: number; latitude: number };
    
    switch (wazeState.destinationType) {
      case 'pickup':
        destination = activeDelivery.pickupLocation;
        break;
      case 'delivery':
      case 'customer':
        destination = activeDelivery.deliveryLocation;
        break;
      default:
        return false;
    }
    
    // Calculate distance in kilometers
    const distance = calculateDistance(
      lastLocation.latitude,
      lastLocation.longitude,
      destination.latitude,
      destination.longitude
    );
    
    // Consider within 0.2km (200m) as "near"
    return distance < 0.2;
  };

  // Premium: Calculate distance between coordinates (Haversine formula)
  const calculateDistanceFunction = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Premium: Log navigation events
  const logWazeNavigation = (
    destinationType: WazeDestinationType,
    destination: { longitude: number; latitude: number },
    address: string
  ) => {
    const logData = {
      event: 'waze_navigation_started',
      timestamp: new Date().toISOString(),
      driverId,
      deliveryId: activeDelivery?.deliveryId,
      destinationType,
      coordinates: destination,
      address,
      userAgent: navigator.userAgent,
      platform: 'web'
    };
    
    console.log('📊 Waze Navigation Log:', logData);
    
    // Send to analytics endpoint (optional)
    fetch('/api/analytics/navigation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    }).catch(err => console.error('Analytics error:', err));
  };

  // Premium: Smart destination suggestion
  const getSuggestedDestination = (): WazeDestinationType => {
    if (!activeDelivery) return 'pickup';
    
    // Logic: Suggest delivery if pickup is complete (you need to track this state)
    // For now, default to pickup
    return 'pickup';
  };

  // Add this useEffect for debugging
  useEffect(() => {
    console.log('🔍 Map Debug - Active Delivery:', activeDelivery);
    console.log('🔍 Map Debug - Last Location:', lastLocation);
    console.log('🔍 Map Debug - Map Instance:', map.current);
    console.log('🔍 Map Debug - Location Granted:', locationGranted);
    console.log('🔍 Map Debug - Is Online:', isOnline);
  }, [activeDelivery, lastLocation, locationGranted, isOnline]);

  // Force map refresh when active delivery is set
  useEffect(() => {
    if (activeDelivery && map.current) {
      console.log('🔄 Active delivery changed, updating map');
      setTimeout(() => {
        updateDeliveryMarkers();
      }, 100);
    } else if (!activeDelivery && map.current) {
      clearDeliveryMarkers();
    }
  }, [activeDelivery]);

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

  // Enhanced route calculation with better error handling
  const calculateRoute = async (start: { longitude: number; latitude: number }, end: { longitude: number; latitude: number }) => {
    if (!map.current) {
      console.error('❌ Map instance not available');
      return null;
    }

    try {
      console.log('📍 Calculating route from:', start, 'to:', end);
      
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        console.log('✅ Route calculated successfully:', data.routes[0]);
        return data.routes[0];
      } else {
        console.warn('⚠️ No routes found in response:', data);
        return null;
      }
    } catch (error) {
      console.error('❌ Error calculating route:', error);
      return null;
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
      const route = await calculateRoute(driverLocation, pickupLocation);
      
      if (route) {
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
            geometry: route.geometry
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
            'line-color': '#f59e0b', // Amber color for pickup route
            'line-width': 5,
            'line-opacity': 0.8,
            'line-dasharray': [1, 1]
          }
        });

        setDriverToPickupRouteData(route);
        setPickupEta(Math.round(route.duration / 60));
        setPickupDistance(route.distance / 1000);
        console.log('📍 Driver to pickup route calculated and displayed');
      }
    } catch (error) {
      console.error('❌ Error fetching driver to pickup route:', error);
    }
  };

  // Add driver to customer route (real-time tracking)
  const addDriverToCustomerRoute = async (driverLocation: { longitude: number; latitude: number }, customerLocation: { longitude: number; latitude: number }) => {
    if (!map.current) return;

    try {
      console.log('📍 Calculating driver to customer route');
      const route = await calculateRoute(driverLocation, customerLocation);
      
      if (route) {
        // Remove existing driver to customer route layer if it exists
        if (map.current.getLayer('driver-to-customer-route')) {
          map.current.removeLayer('driver-to-customer-route');
        }
        if (map.current.getSource('driver-to-customer-route')) {
          map.current.removeSource('driver-to-customer-route');
        }

        // Add driver to customer route source and layer
        map.current.addSource('driver-to-customer-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route.geometry
          }
        });

        map.current.addLayer({
          id: 'driver-to-customer-route',
          type: 'line',
          source: 'driver-to-customer-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#10b981', // Green color for customer route
            'line-width': 6,
            'line-opacity': 0.9,
            'line-dasharray': [0.5, 0.5]
          }
        });

        setDriverToCustomerRouteData(route);
        
        // Update ETA and distance
        const eta = Math.round(route.duration / 60);
        const distance = route.distance / 1000;
        setCurrentEta(eta);
        setRouteDistance(distance);
        
        console.log('✅ Driver to customer route calculated and displayed', { eta, distance });
      }
    } catch (error) {
      console.error('❌ Error fetching driver to customer route:', error);
    }
  };

  // Update real-time route to customer
  const updateRealTimeRoute = async (driverLocation: { longitude: number; latitude: number }, customerLocation: { longitude: number; latitude: number }) => {
    await addDriverToCustomerRoute(driverLocation, customerLocation);
  };

  // Add customer marker
  const addCustomerMarker = (customerLocation: { longitude: number; latitude: number }) => {
    if (!map.current) return;

    if (customerMarkerRef.current) {
      customerMarkerRef.current.remove();
    }

    customerMarkerRef.current = new mapboxgl.Marker({
      element: createCustomerMarkerElement()
    })
      .setLngLat([customerLocation.longitude, customerLocation.latitude])
      .addTo(map.current);
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

  // Create customer marker element
  const createCustomerMarkerElement = () => {
    const el = document.createElement('div');
    el.className = 'customer-marker';
    el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
        <circle cx="16" cy="16" r="14" fill="#3b82f6" stroke="#1d4ed8" stroke-width="2"/>
        <circle cx="16" cy="16" r="6" fill="white" fill-opacity="0.9"/>
        <text x="16" y="16" text-anchor="middle" dy="0.3em" font-size="8" font-weight="bold" fill="#1d4ed8">C</text>
        <!-- Pulsing animation for real-time tracking -->
        <circle cx="16" cy="16" r="14" fill="none" stroke="#3b82f6" stroke-width="2" stroke-opacity="0.3">
          <animate attributeName="r" from="14" to="20" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" from="0.7" to="0" dur="2s" repeatCount="indefinite"/>
        </circle>
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

  // UPDATED: Change delivery route color to blue (#3b82f6) for better visibility
  const addDeliveryRoute = async (pickup: [number, number], delivery: [number, number]) => {
    if (!map.current) return;

    try {
      const route = await calculateRoute(
        { longitude: pickup[0], latitude: pickup[1] },
        { longitude: delivery[0], latitude: delivery[1] }
      );
      
      if (route) {
        // Remove existing route layer if it exists
        if (map.current.getLayer('delivery-route')) {
          map.current.removeLayer('delivery-route');
        }
        if (map.current.getSource('delivery-route')) {
          map.current.removeSource('delivery-route');
        }

        // Add route source and layer with BLUE color
        map.current.addSource('delivery-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route.geometry
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
            'line-color': '#FF0000', // Changed to blue for better visibility
            'line-width': 4,
            'line-opacity': 0.8
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

  // Clear all delivery markers and routes
  const clearDeliveryMarkers = () => {
    if (!map.current) return;

    // Clear markers
    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
      pickupMarkerRef.current = null;
    }
    if (deliveryMarkerRef.current) {
      deliveryMarkerRef.current.remove();
      deliveryMarkerRef.current = null;
    }
    if (customerMarkerRef.current) {
      customerMarkerRef.current.remove();
      customerMarkerRef.current = null;
    }

    // Clear routes
    if (map.current.getLayer('delivery-route')) {
      map.current.removeLayer('delivery-route');
    }
    if (map.current.getSource('delivery-route')) {
      map.current.removeSource('delivery-route');
    }
    if (map.current.getLayer('driver-to-pickup-route')) {
      map.current.removeLayer('driver-to-pickup-route');
    }
    if (map.current.getSource('driver-to-pickup-route')) {
      map.current.removeSource('driver-to-pickup-route');
    }
    if (map.current.getLayer('driver-to-customer-route')) {
      map.current.removeLayer('driver-to-customer-route');
    }
    if (map.current.getSource('driver-to-customer-route')) {
      map.current.removeSource('driver-to-customer-route');
    }

    // Clear route data
    setDriverToPickupRouteData(null);
    setDriverToCustomerRouteData(null);
    setCurrentEta(null);
    setRouteDistance(null);
    setPickupEta(null);
    setPickupDistance(null);

    // Reset Waze state
    setWazeState({
      destinationType: 'pickup',
      isNavigating: false,
      lastUsedDestination: null,
      showReminder: true
    });

    console.log('🗑️ All delivery markers and routes cleared');
  };

  const updateDeliveryMarkers = () => {
    if (!map.current || !activeDelivery) {
      clearDeliveryMarkers();
      return;
    }

    // Clear existing markers first
    clearDeliveryMarkers();

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

    // Add customer marker if customer location is available
    if (activeDelivery.customerLocation) {
      addCustomerMarker(activeDelivery.customerLocation);
    }

    // Add route with BLUE color
    addDeliveryRoute(
      [activeDelivery.pickupLocation.longitude, activeDelivery.pickupLocation.latitude],
      [activeDelivery.deliveryLocation.longitude, activeDelivery.deliveryLocation.latitude]
    );

    // Add driver to pickup route if we have current location
    if (lastLocation) {
      addDriverToPickupRoute(lastLocation, activeDelivery.pickupLocation);
    }

    // Add real-time route to customer if customer location is available
    if (lastLocation && activeDelivery.customerLocation) {
      updateRealTimeRoute(lastLocation, activeDelivery.customerLocation);
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

      // 🔥 ADD THIS GEOFENCING CHECK HERE 🔥
      if (activeDelivery && activeDelivery.deliveryLocation) {
        const targetLocation = activeDelivery.customerLocation || activeDelivery.deliveryLocation;
        const isAtDeliveryZone = isInDeliveryZone(location, targetLocation);
        
        if (isAtDeliveryZone && !showCompleteButton) {
          console.log('📍 Driver entered delivery zone, updating status');
          
          // Update order status to 'arrived'
          try {
            await fetch('/api/delivery/arrived', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ deliveryId: activeDelivery.deliveryId })
            });
          } catch (error) {
            console.error('Error updating arrival status:', error);
          }
          
          // Show "Mark as Completed" button
          setShowCompleteButton(true);
        } else if (!isAtDeliveryZone && showCompleteButton) {
          // Driver left the zone, hide button
          setShowCompleteButton(false);
        }
      }
      
      if (markerRef.current) {
        markerRef.current.setLngLat([longitude, latitude]);
        
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
        
        // Update real-time route to customer if customer location is available
        if (activeDelivery.customerLocation) {
          updateRealTimeRoute(location, activeDelivery.customerLocation);
        }
      }

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
        maximumAge: 5000,
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
    } else if (!activeDelivery && map.current) {
      clearDeliveryMarkers();
    }
  }, [activeDelivery]);

  // Update driver to pickup route and driver to customer route when location changes with active delivery
  useEffect(() => {
    if (activeDelivery && lastLocation && map.current) {
      console.log('🔄 Updating driver to pickup route with current location');
      addDriverToPickupRoute(lastLocation, activeDelivery.pickupLocation);
      
      if (activeDelivery.customerLocation) {
        updateRealTimeRoute(lastLocation, activeDelivery.customerLocation);
      }
    }
  }, [lastLocation, activeDelivery]);

  // Check proximity when location updates (for return reminders)
  useEffect(() => {
    if (lastLocation && wazeState.isNavigating && activeDelivery) {
      const isNear = checkProximityToDestination();
      if (isNear) {
        console.log('📍 Driver is near destination, showing return reminder');
        showReturnReminder();
      }
    }
  }, [lastLocation, wazeState.isNavigating]);

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
      
      {/* Simple Tracking Status Indicator - Just green dot */}
      {isTracking && (
        <div className="absolute top-4 left-4 z-10">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
        </div>
      )}

      {/* Compact Current Location Info - Mobile Friendly */}
      {lastLocation && (
        <div className="absolute top-4 right-4 z-10 bg-black/80 text-white p-2 rounded-lg backdrop-blur-sm max-w-[140px] sm:max-w-xs">
          <div className="flex items-center justify-between">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
            <p className="text-xs font-medium truncate">
              {currentAddress ? currentAddress.split(',')[0] : 'Current Location'}
            </p>
          </div>
          {isLocating && (
            <div className="flex items-center mt-1 text-green-400 text-xs">
              <div className="animate-spin rounded-full h-2 w-2 border-b-2 border-green-400 mr-1"></div>
              Updating...
            </div>
          )}
        </div>
      )}

      {/* ETA Display - More compact */}
      {pickupEta && activeDelivery && (
        <div className="absolute top-12 right-4 z-10 bg-black/80 text-white p-2 rounded-lg backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <div>
              <p className="text-xs font-medium">To Pickup</p>
              <p className="text-sm font-bold">{pickupEta} min</p>
              {pickupDistance && (
                <p className="text-xs text-gray-300">{pickupDistance.toFixed(1)} km</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer ETA Display */}
      {currentEta && activeDelivery && activeDelivery.customerLocation && (
        <div className="absolute top-28 right-4 z-10 bg-black/80 text-white p-2 rounded-lg backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-xs font-medium">To Customer</p>
              <p className="text-sm font-bold">{currentEta} min</p>
              {routeDistance && (
                <p className="text-xs text-gray-300">{routeDistance.toFixed(1)} km</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MARK AS COMPLETED BUTTON */}
      {showCompleteButton && activeDelivery && (
        <div className="absolute bottom-32 left-4 right-4 z-10">
          <button
            onClick={async () => {
              try {
                await fetch('/api/delivery/complete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    deliveryId: activeDelivery.deliveryId,
                    driverId: driverId 
                  })
                });
                setShowCompleteButton(false);
                alert('Delivery marked as completed! Waiting for customer confirmation.');
              } catch (error) {
                console.error('Error completing delivery:', error);
              }
            }}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-xl hover:from-green-600 hover:to-emerald-700 transition-all animate-pulse"
          >
            ✅ MARK AS COMPLETED
          </button>
        </div>
      )}

      {/* Find My Location Button - More compact */}
      {locationGranted && lastLocation && (
        <button
          onClick={flyToCurrentLocation}
          disabled={isLocating}
          className="absolute bottom-4 right-4 z-10 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Find my location"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}

      {/* PREMIUM FEATURE: Waze Navigation Floating Action Button - MOVED TO BOTTOM LEFT */}
      {activeDelivery && (
        <div className="absolute bottom-16 left-4 z-20">
          {/* Waze Options Modal */}
          {showWazeOptions && (
            <div className="absolute bottom-full left-0 mb-3 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-fade-in">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center">
                  <span className="text-[#33CCFF] mr-2">Waze</span> Navigation
                </h3>
                <p className="text-xs text-gray-600 mt-1">Choose destination to open in Waze</p>
              </div>
              
              <div className="p-2">
                <button
                  onClick={() => {
                    openWazeNavigation('pickup');
                    setShowWazeOptions(false);
                  }}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Pickup Location</p>
                      <p className="text-xs text-gray-500 truncate max-w-[160px]">
                        {activeDelivery.pickupAddress.substring(0, 40)}...
                      </p>
                    </div>
                  </div>
                  <div className="text-[#33CCFF] opacity-0 group-hover:opacity-100 transition-opacity">
                    →
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    openWazeNavigation('delivery');
                    setShowWazeOptions(false);
                  }}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Delivery Location</p>
                      <p className="text-xs text-gray-500 truncate max-w-[160px]">
                        {activeDelivery.deliveryAddress.substring(0, 40)}...
                      </p>
                    </div>
                  </div>
                  <div className="text-[#33CCFF] opacity-0 group-hover:opacity-100 transition-opacity">
                    →
                  </div>
                </button>
                
                {activeDelivery.customerLocation && (
                  <button
                    onClick={() => {
                      openWazeNavigation('customer');
                      setShowWazeOptions(false);
                    }}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Customer Location</p>
                        <p className="text-xs text-gray-500">Real-time tracking</p>
                      </div>
                    </div>
                    <div className="text-[#33CCFF] opacity-0 group-hover:opacity-100 transition-opacity">
                      →
                    </div>
                  </button>
                )}
              </div>
              
              <div className="p-3 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={() => {
                    const suggested = getSuggestedDestination();
                    openWazeNavigation(suggested, { skipConfirmation: true });
                    setShowWazeOptions(false);
                  }}
                  className="w-full bg-[#33CCFF] hover:bg-[#2AA3CC] text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                  <span className="mr-2">Quick Start</span>
                  <span className="text-xs bg-white/30 px-1.5 py-0.5 rounded">Smart</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Main Waze FAB Button */}
          <div className="relative">
            <button
              onClick={() => {
                if (wazeState.lastUsedDestination && !showWazeOptions) {
                  // Quick re-navigate to last used destination
                  openWazeNavigation(wazeState.lastUsedDestination);
                } else {
                  // Show options modal
                  setShowWazeOptions(!showWazeOptions);
                }
              }}
              onMouseEnter={() => setWazeButtonPulse(true)}
              onMouseLeave={() => setWazeButtonPulse(false)}
              className={`
                relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center
                transition-all duration-300 transform hover:scale-105 active:scale-95
                ${wazeButtonPulse ? 'animate-pulse-scale' : ''}
                ${wazeState.isNavigating 
                  ? 'bg-gradient-to-br from-[#101111] to-black-500' 
                  : 'bg-gradient-to-br from-[#0d0d0e] to-[#050505]'
                }
              `}
            >
              {/* Waze "W" Logo */}
              <img
                  src="/velosdroplogo.svg"
                  alt="VelosDrop Logo"
                  className="h-8 w-auto drop-shadow-md"
              />
              
              {/* Navigation Active Indicator */}
              {wazeState.isNavigating && (
                <div className="absolute -top-1 -right-1">
                  <div className="relative">
                    <div className="w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
                  </div>
                </div>
              )}
              
              {/* Pulsing Ring Effect */}
              <div className={`absolute inset-0 rounded-full border-2 ${
                wazeState.isNavigating 
                  ? 'border-green-400 animate-ping' 
                  : 'border-white/30'
              }`}></div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-0 mb-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                <div className="font-semibold">Waze Navigation</div>
                <div className="text-xs text-gray-300">Click for destination options</div>
                <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </button>
            
            {/* Quick Action Badge */}
            {wazeState.lastUsedDestination && !showWazeOptions && (
              <button
                onClick={() => openWazeNavigation(wazeState.lastUsedDestination!)}
                className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg hover:scale-105 transition-transform animate-bounce-subtle"
              >
                ↻
              </button>
            )}
          </div>
          
          {/* Button Label */}
          <div className="mt-2 flex flex-col items-center">
            <div className="text-xs font-semibold text-gray-800 bg-white/95 px-3 py-1.5 rounded-full shadow-md border border-gray-200">
              <span className="bg-gradient-to-r from-[#33CCFF] to-blue-600 bg-clip-text text-transparent font-bold">
                WAZE NAV
              </span>
            </div>
            {wazeState.isNavigating && (
              <div className="text-[10px] text-green-600 font-medium mt-1 flex items-center">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                Navigating to {wazeState.destinationType}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Bubble - Only show when we have an active delivery */}
      {activeDelivery && driverId && activeDelivery.customerId && (
          <ChatBubble
            driverId={driverId}
            deliveryId={activeDelivery.deliveryId}
            customerId={activeDelivery.customerId}
          />
      )}

      {/* Add custom styles for animations */}
      <style jsx>{`
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); box-shadow: 0 10px 30px rgba(51, 204, 255, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 15px 40px rgba(51, 204, 255, 0.6); }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-pulse-scale {
          animation: pulse-scale 2s infinite;
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
        }
      `}</style>

      <div ref={mapContainer} style={style} className="h-full w-full" />
    </div>
  );
}