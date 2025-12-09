//components/customer/BookingPanel.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@/app/context/UserContext';
import PackageDetails from '@/components/customer/PackageDetails';
import dynamic from 'next/dynamic';
import { useDelivery } from '@/app/context/DeliveryContext';

const RouteMap = dynamic(() => import('@/components/customer/RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gray-800/50 rounded-xl flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2"></div>
        <p className="text-gray-400 text-sm">Loading map...</p>
      </div>
    </div>
  )
});

interface BookingPanelProps {
  onClose: () => void;
  onLocationsSelected?: (pickup: any, delivery: any) => void;
}

interface LocationSuggestion {
  place_name: string;
  center: [number, number];
  geometry: {
    coordinates: [number, number];
  };
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

// IMPROVED: More precise reverse geocoding with multiple place types
const getAddressFromCoords = async (lng: number, lat: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
      `access_token=${MAPBOX_TOKEN}` +
      `&country=ZW` +
      `&types=poi,address,neighborhood,place` + // POI first for specific buildings
      `&limit=1` +
      `&language=en`
    );

    if (!response.ok) throw new Error('Geocoding failed');

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      return data.features[0].place_name;
    }
    
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
};

export default function BookingPanel({ onClose, onLocationsSelected }: BookingPanelProps) {
  const [currentStep, setCurrentStep] = useState('booking');
  const [pickupLocation, setPickupLocation] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [deliveryCoords, setDeliveryCoords] = useState<[number, number] | null>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<LocationSuggestion[]>([]);
  const [deliverySuggestions, setDeliverySuggestions] = useState<LocationSuggestion[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isPickupFromGPS, setIsPickupFromGPS] = useState(false);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string>('');

  const { customer } = useUser();
  const { setDeliveryData } = useDelivery();

  const pickupTimeoutRef = useRef<NodeJS.Timeout>();
  const deliveryTimeoutRef = useRef<NodeJS.Timeout>();
  const hasAutoLocatedRef = useRef(false);

  // IMPROVED: Auto-get precise location on mount (only once)
  useEffect(() => {
    if (!hasAutoLocatedRef.current) {
      hasAutoLocatedRef.current = true;
      getCurrentLocation();
    }
  }, []);

  const getCurrentLocation = () => {
    setIsLocating(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsLocating(false);
      return;
    }

    // IMPROVED: Request high accuracy location
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        console.log('Location obtained:', {
          latitude,
          longitude,
          accuracy: `${accuracy}m`
        });

        const coords: [number, number] = [longitude, latitude];
        setPickupCoords(coords);
        setIsPickupFromGPS(true); // ADD THIS LINE

        // Get human-readable address
        const address = await getAddressFromCoords(longitude, latitude);
        setPickupLocation(address);

        if (onLocationsSelected) {
          onLocationsSelected(
            { address, coordinates: coords },
            null
          );
        }

        setIsLocating(false);

        // Notify user if accuracy is poor
        if (accuracy > 50) {
          setLocationError(`Location accuracy: ${Math.round(accuracy)}m. You may want to refine it.`);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsLocating(false);
        setIsPickupFromGPS(false); // ADD THIS LINE

        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location access denied. Please enable location services in your browser settings.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information unavailable. Please enter your address manually.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out. Please try again.');
            break;
          default:
            setLocationError('Unable to get your location. Please enter manually.');
        }
      },
      {
        enableHighAccuracy: true, // CRITICAL: Request GPS-level accuracy
        timeout: 10000,           // 10 seconds timeout
        maximumAge: 0             // Don't use cached location
      }
    );
  };
  const fetchSuggestions = async (
    query: string,
    setSuggestions: React.Dispatch<React.SetStateAction<LocationSuggestion[]>>,
    isPickup: boolean = false
  ) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
  
    try {
      // Build proximity parameter
      let proximityParam = '';
      if (isPickup && pickupCoords) {
        proximityParam = `&proximity=${pickupCoords[0]},${pickupCoords[1]}`;
      } else if (!isPickup && deliveryCoords) {
        proximityParam = `&proximity=${deliveryCoords[0]},${deliveryCoords[1]}`;
      } else {
        // Default to Harare for Zimbabwe
        proximityParam = '&proximity=31.0522,-17.8252';
      }
  
      // OPTION 1: MOST COMPREHENSIVE (Remove type filter completely)
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${MAPBOX_TOKEN}` +
        `&country=ZW` + // Limit to Zimbabwe
        `&limit=10` + // Increased limit
        `&language=en` +
        `&autocomplete=true` + // Enable autocomplete
        proximityParam;
  
      // OPTION 2: BROADEST TYPE FILTER (if you want some filtering)
      // `&types=poi,address,place,locality,neighborhood,district,postcode,region` +
  
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.features) {
        // Filter out very generic results
        const filteredResults = data.features.filter((feature: any) => {
          // Keep specific places, remove overly broad results
          if (feature.relevance < 0.2) return false;
          
          const placeName = feature.place_name.toLowerCase();
          const queryLower = query.toLowerCase();
          
          // Boost relevance for exact matches
          if (placeName.includes(queryLower)) {
            return true;
          }
          
          return feature.relevance >= 0.3; // Minimum relevance threshold
        });
        
        setSuggestions(filteredResults);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  };
  // Debounced pickup suggestions
  useEffect(() => {
    if (pickupTimeoutRef.current) {
      clearTimeout(pickupTimeoutRef.current);
    }
    pickupTimeoutRef.current = setTimeout(() => {
      if (!isPickupFromGPS) { // Only fetch suggestions if not locked to GPS
        fetchSuggestions(pickupLocation, setPickupSuggestions, true);
      }
    }, 300);

    return () => {
      if (pickupTimeoutRef.current) {
        clearTimeout(pickupTimeoutRef.current);
      }
    };
  }, [pickupLocation, isPickupFromGPS]);

  // Debounced delivery suggestions
  useEffect(() => {
    if (deliveryTimeoutRef.current) {
      clearTimeout(deliveryTimeoutRef.current);
    }
    deliveryTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(deliveryLocation, setDeliverySuggestions, false);
    }, 300);

    return () => {
      if (deliveryTimeoutRef.current) {
        clearTimeout(deliveryTimeoutRef.current);
      }
    };
  }, [deliveryLocation]);

  const handleSuggestionClick = (suggestion: LocationSuggestion, isPickup: boolean) => {
    const coords = suggestion.center || suggestion.geometry.coordinates;
    const address = suggestion.place_name;

    if (isPickup) {
      setPickupLocation(address);
      setPickupCoords(coords);
      setPickupSuggestions([]);
      setLocationError('');
      setIsPickupFromGPS(false); // User selected from suggestions, not GPS

      if (onLocationsSelected) {
        onLocationsSelected(
          { address, coordinates: coords },
          deliveryCoords ? { address: deliveryLocation, coordinates: deliveryCoords } : null
        );
      }
    } else {
      setDeliveryLocation(address);
      setDeliveryCoords(coords);
      setDeliverySuggestions([]);

      if (onLocationsSelected) {
        onLocationsSelected(
          pickupCoords ? { address: pickupLocation, coordinates: pickupCoords } : null,
          { address, coordinates: coords }
        );
      }
    }
  };

  // Handle manual address entry (when user presses Enter without selecting suggestion)
  const handleManualAddressEntry = async (address: string, isPickup: boolean) => {
    if (!address || address.length < 3) return;

    try {
      // Try to geocode the manually entered address
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?` +
        `access_token=${MAPBOX_TOKEN}` +
        `&country=ZW` +
        `&limit=1`
      );

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const coords: [number, number] = feature.center;
        
        if (isPickup) {
          setPickupCoords(coords);
          setIsPickupFromGPS(false); // Manual entry, not GPS
          if (onLocationsSelected) {
            onLocationsSelected(
              { address, coordinates: coords },
              deliveryCoords ? { address: deliveryLocation, coordinates: deliveryCoords } : null
            );
          }
        } else {
          setDeliveryCoords(coords);
          if (onLocationsSelected) {
            onLocationsSelected(
              pickupCoords ? { address: pickupLocation, coordinates: pickupCoords } : null,
              { address, coordinates: coords }
            );
          }
        }
      } else {
        // If no results, show warning but allow user to continue
        setLocationError(`Couldn't find "${address}". Please check the spelling or use the map to select a location.`);
      }
    } catch (error) {
      console.error('Error geocoding manual address:', error);
      setLocationError('Unable to verify address. Please try again.');
    }
  };

  const handlePackageDetailsClick = () => {
    if (!pickupCoords || !deliveryCoords) {
      alert('Please select valid pickup and delivery locations');
      return;
    }

    if (setDeliveryData) {
      setDeliveryData({
        pickup: { address: pickupLocation, coordinates: pickupCoords },
        delivery: { address: deliveryLocation, coordinates: deliveryCoords },
        distance: routeDistance
      });
    }

    setCurrentStep('package-details');
  };

  const handleBackToBooking = () => {
    setCurrentStep('booking');
  };

  const handleConfirmFare = (fare: string) => {
    console.log('Fare confirmed:', fare);
    onClose();
  };

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    handlePackageDetailsClick();
  };

  if (currentStep === 'package-details') {
    return (
      <PackageDetails
        customerId={customer?.id}
        customerPhone={customer?.phoneNumber || ''}
        pickupLocation={pickupLocation}
        deliveryLocation={deliveryLocation}
        pickupCoords={pickupCoords}
        deliveryCoords={deliveryCoords}
        routeDistance={routeDistance}
        onBack={handleBackToBooking}
        onClose={onClose}
        onConfirmFare={handleConfirmFare}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-end justify-center z-50">
      <div className="bg-gradient-to-b from-gray-900 to-black w-full max-w-2xl rounded-t-2xl p-6 animate-slide-up border-t border-purple-900/30 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 7.001c0 3.865-3.134 7-7 7s-7-3.135-7-7c0-3.867 3.134-7.001 7-7.001s7 3.134 7 7.001zm-1.598 7.18c-1.506 1.137-3.374 1.82-5.402 1.82-2.03 0-3.899-.685-5.407-1.822-4.072 1.793-6.593 7.376-6.593 9.821h24c0-2.423-2.6-8.006-6.598-9.819z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Book a Delivery
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-purple-900/30 transition-all duration-300 transform hover:rotate-90 group"
            aria-label="Cancel"
            title="Cancel"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 group-hover:scale-110 transition-transform"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M18.3 5.71a1 1 0 00-1.41 0L12 10.59 7.11 5.7A1 1 0 005.7 7.11L10.59 12 5.7 16.89a1 1 0 101.41 1.41L12 13.41l4.89 4.89a1 1 0 001.41-1.41L13.41 12l4.89-4.89a1 1 0 000-1.4z"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmitBooking} className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse shadow-lg shadow-purple-500/50"></div>
              <span className="text-sm text-purple-300 font-medium">Location</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-600"></div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
              <span className="text-sm text-gray-400">Package</span>
            </div>
          </div>

          {/* Route Map */}
          {(pickupCoords || deliveryCoords) && (
            <div className="bg-gray-800/30 rounded-xl p-4 border border-purple-900/20 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
                </svg>
                <h3 className="text-purple-300 font-medium">Route Preview</h3>
              </div>
              <RouteMap
                pickupCoords={pickupCoords}
                deliveryCoords={deliveryCoords}
                height="200px"
                onRouteCalculated={(routeData) => {
                  setRouteDistance(routeData.distance / 1000);
                }}
              />
            </div>
          )}

          <div className="space-y-6">
            {/* Pickup Location - Updated with GPS lock feature */}
            <div className="group">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-purple-300">
                  Pickup Location
                </label>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={isLocating}
                  className="text-xs bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 flex items-center space-x-1"
                >
                  {isLocating ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-400"></div>
                      <span>Locating...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
                      </svg>
                      <span>Refresh</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Location Error/Warning */}
              {locationError && (
                <div className="mb-3 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                  <p className="text-xs text-yellow-300">{locationError}</p>
                </div>
              )}

              <div className="relative">
                {/* Lock icon for GPS location */}
                {isPickupFromGPS && (
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-green-400 z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z"/>
                    </svg>
                  </div>
                )}
                {!isPickupFromGPS && (
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-green-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
                    </svg>
                  </div>
                )}
                
                <input
                  type="text"
                  value={pickupLocation}
                  onChange={(e) => {
                    setPickupLocation(e.target.value);
                    setIsPickupFromGPS(false); // User is manually editing
                  }}
                  onFocus={() => {
                    // Don't show suggestions if GPS location is locked
                    if (!isPickupFromGPS && pickupLocation && pickupLocation.length >= 2) {
                      fetchSuggestions(pickupLocation, setPickupSuggestions, true);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setPickupSuggestions([]);
                      handleManualAddressEntry(pickupLocation, true);
                      setIsPickupFromGPS(false);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      if (pickupSuggestions.length > 0) {
                        setPickupSuggestions([]);
                      }
                    }, 200);
                  }}
                  className={`w-full ${isPickupFromGPS ? 'pl-10' : 'pl-10'} pr-4 py-3 rounded-xl bg-gray-800/50 border ${
                    isPickupFromGPS ? 'border-green-500 bg-green-900/10' : 'border-gray-700'
                  } text-white placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20`}
                  placeholder={isLocating ? "Getting your location..." : isPickupFromGPS ? "Using your GPS location" : "Enter or refine pickup address"}
                  required
                  disabled={isLocating}
                  readOnly={isPickupFromGPS} // Make it read-only when GPS locked
                />
                
                {/* Only show suggestions if NOT from GPS */}
                {!isPickupFromGPS && pickupSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-gray-900 border border-gray-700 rounded-b-xl shadow-2xl z-20 mt-1 max-h-60 overflow-y-auto">
                    {pickupSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion, true)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors text-sm text-gray-200 border-b border-gray-700 last:border-b-0 flex items-center space-x-3"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
                        </svg>
                        <span className="font-medium">{suggestion.place_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Coordinate display for verification */}
              {pickupCoords && (
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    📍 {pickupCoords[1].toFixed(6)}, {pickupCoords[0].toFixed(6)}
                  </p>
                  {isPickupFromGPS && (
                    <button
                      type="button"
                      onClick={() => setIsPickupFromGPS(false)}
                      className="text-xs text-purple-400 hover:text-purple-300 underline"
                    >
                      Edit manually
                    </button>
                  )}
                </div>
              )}
              
              {/* GPS lock indicator */}
              {isPickupFromGPS && (
                <p className="text-xs text-green-400 mt-2 flex items-center space-x-1">
                  <span>✓</span>
                  <span>Using your precise GPS location</span>
                </p>
              )}
              
              {/* Manual entry hint */}
              {!isPickupFromGPS && !pickupCoords && pickupLocation && (
                <p className="text-xs text-gray-400 mt-2 flex items-center space-x-1">
                  <span>💡</span>
                  <span>Type and press Enter, or select from suggestions</span>
                </p>
              )}
            </div>

            {/* Delivery Location */}
            <div className="group">
              <label className="block text-sm font-medium text-purple-300 mb-3">
                Delivery Location
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-red-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
                  </svg>
                </div>
                <input
                  type="text"
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                  onFocus={() => setDeliverySuggestions([])} // Clear suggestions on focus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setDeliverySuggestions([]);
                      handleManualAddressEntry(deliveryLocation, false);
                    }
                  }}
                  onBlur={() => {
                    // Delay to allow click on suggestion
                    setTimeout(() => {
                      if (deliverySuggestions.length > 0) {
                        setDeliverySuggestions([]);
                      }
                    }, 200);
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  placeholder="Enter delivery address"
                  required
                />
                {deliverySuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-gray-900 border border-gray-700 rounded-b-xl shadow-2xl z-20 mt-1 max-h-60 overflow-y-auto">
                    {deliverySuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion, false)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors text-sm text-gray-200 border-b border-gray-700 last:border-b-0 flex items-center space-x-3"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
                        </svg>
                        <span className="font-medium">{suggestion.place_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {deliveryCoords && (
                <p className="text-xs text-gray-500 mt-2">
                  📍 {deliveryCoords[1].toFixed(6)}, {deliveryCoords[0].toFixed(6)}
                </p>
              )}
              
              {/* Manual entry hint */}
              {!deliveryCoords && deliveryLocation && (
                <p className="text-xs text-gray-400 mt-2 flex items-center space-x-1">
                  <span>💡</span>
                  <span>Can't find it? Type the full address and press Enter</span>
                </p>
              )}
            </div>

            {/* Package Details Button */}
            <div className="group">
              <label className="block text-sm font-medium text-purple-300 mb-3 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 7h-4V5c0-.55-.22-1.05-.59-1.41C15.05 3.22 14.55 3 14 3h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5zm1 13.5l-1-1 3-3-3-3 1-1 4 4-4 4z"/>
                </svg>
                <span>Package Details</span>
              </label>
              <button
                type="button"
                onClick={handlePackageDetailsClick}
                className="w-full p-4 rounded-xl bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-700/30 text-left text-gray-300 hover:text-white hover:from-purple-900/50 hover:to-indigo-900/50 hover:border-purple-500/50 transition-all duration-300 group-hover:scale-[1.02] backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-yellow-600/20 rounded-lg group-hover:bg-yellow-600/30 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 7h-4V5c0-.55-.22-1.05-.59-1.41C15.05 3.22 14.55 3 14 3h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5zm1 13.5l-1-1 3-3-3-3 1-1 4 4-4 4z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Add Package Information</p>
                      <p className="text-sm text-gray-400 group-hover:text-gray-300">Describe what you're sending</p>
                    </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                  </svg>
                </div>
              </button>
            </div>
          </div>

          {/* Continue Button */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={!pickupCoords || !deliveryCoords}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl shadow-2xl shadow-purple-900/40 hover:shadow-purple-900/60 transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100 group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                </svg>
                <span>Continue to Package Details</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}