"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from '@/app/context/UserContext';
import PackageDetails from "@/components/customer/PackageDetails";
import dynamic from 'next/dynamic';
import { useDelivery } from '@/app/context/DeliveryContext';

// Dynamically import the map component to avoid SSR issues
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

export default function BookingPanel({ onClose, onLocationsSelected }: BookingPanelProps) {
  const [currentStep, setCurrentStep] = useState("booking");
  const [pickupLocation, setPickupLocation] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [deliveryCoords, setDeliveryCoords] = useState<[number, number] | null>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<LocationSuggestion[]>([]);
  const [deliverySuggestions, setDeliverySuggestions] = useState<LocationSuggestion[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isAutoLocating, setIsAutoLocating] = useState(true);
  const { customer } = useUser();
  const { setDeliveryData } = useDelivery();
  const [routeDistance, setRouteDistance] = useState<number | null>(null);

  const pickupTimeoutRef = useRef<NodeJS.Timeout>();
  const deliveryTimeoutRef = useRef<NodeJS.Timeout>();

  // Automatically get user's location when component mounts
  useEffect(() => {
    if (isAutoLocating) {
      getCurrentLocation();
    }
  }, [isAutoLocating]);

  // Get current location with better precision
  const getCurrentLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setIsLocating(false);
      setIsAutoLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // First, set the exact coordinates for accurate mapping
        const exactCoords: [number, number] = [longitude, latitude];
        setPickupCoords(exactCoords);

        // Then try to get a more precise address
        try {
          // Try to get a more precise address by using a smaller radius
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?` +
            `access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}` +
            `&country=ZW` +
            `&types=address,poi,neighborhood,locality` +
            `&limit=5` + // Get more results to find the most specific one
            `&radius=100` // Smaller radius for more precise results
          );

          const data = await response.json();

          if (data.features && data.features.length > 0) {
            // Find the most specific result (prioritize addresses over general areas)
            let bestMatch = data.features[0];

            // Look for address results first
            const addressResult = data.features.find((f: any) =>
              f.place_type.includes('address') || f.place_type.includes('poi')
            );

            if (addressResult) {
              bestMatch = addressResult;
            }

            setPickupLocation(bestMatch.place_name);

            // Notify parent component about location selection
            if (onLocationsSelected) {
              onLocationsSelected(
                {
                  address: bestMatch.place_name,
                  coordinates: exactCoords
                },
                null
              );
            }
          } else {
            // If no specific address found, use coordinates directly
            setPickupLocation(`Near ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
        } catch (error) {
          console.error("Error reverse geocoding:", error);
          // If geocoding fails, still use the coordinates
          setPickupLocation(`Near ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }

        setIsLocating(false);
        setIsAutoLocating(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        setIsLocating(false);
        setIsAutoLocating(false);

        if (error.code === error.PERMISSION_DENIED) {
          alert("Location access denied. Please enable location services to use this feature.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,  // Increased timeout
        maximumAge: 0    // Don't use cached position
      }
    );
  };

  // Fetch location suggestions for Zimbabwe
  const fetchSuggestions = async (query: string, setSuggestions: React.Dispatch<React.SetStateAction<LocationSuggestion[]>>) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}` +
        `&types=address,place,poi,neighborhood,locality` +
        `&country=ZW` +
        `&limit=5` +
        `&language=en` +
        `&proximity=31.033,-17.827`
      );

      const data = await response.json();
      setSuggestions(data.features || []);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  // Debounced suggestion fetching
  useEffect(() => {
    if (pickupTimeoutRef.current) {
      clearTimeout(pickupTimeoutRef.current);
    }
    pickupTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(pickupLocation, setPickupSuggestions);
    }, 300);

    return () => {
      if (pickupTimeoutRef.current) {
        clearTimeout(pickupTimeoutRef.current);
      }
    };
  }, [pickupLocation]);

  useEffect(() => {
    if (deliveryTimeoutRef.current) {
      clearTimeout(deliveryTimeoutRef.current);
    }
    deliveryTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(deliveryLocation, setDeliverySuggestions);
    }, 300);

    return () => {
      if (deliveryTimeoutRef.current) {
        clearTimeout(deliveryTimeoutRef.current);
      }
    };
  }, [deliveryLocation]);

  const handleSuggestionClick = (suggestion: LocationSuggestion, isPickup: boolean) => {
    const locationData = {
      address: suggestion.place_name,
      coordinates: suggestion.center || suggestion.geometry.coordinates
    };

    if (isPickup) {
      setPickupLocation(suggestion.place_name);
      setPickupCoords(locationData.coordinates);
      setPickupSuggestions([]);

      if (onLocationsSelected) {
        onLocationsSelected(locationData, deliveryCoords ? {
          address: deliveryLocation,
          coordinates: deliveryCoords
        } : null);
      }
    } else {
      setDeliveryLocation(suggestion.place_name);
      setDeliveryCoords(locationData.coordinates);
      setDeliverySuggestions([]);

      if (onLocationsSelected) {
        onLocationsSelected(pickupCoords ? {
          address: pickupLocation,
          coordinates: pickupCoords
        } : null, locationData);
      }
    }
  };

  const handlePackageDetailsClick = () => {
    if (!pickupCoords || !deliveryCoords) {
      alert("Please select valid pickup and delivery locations");
      return;
    }

    if (setDeliveryData) {
      setDeliveryData({
        pickup: { address: pickupLocation, coordinates: pickupCoords },
        delivery: { address: deliveryLocation, coordinates: deliveryCoords },
        distance: routeDistance
      });
    }

    setCurrentStep("package-details");
  };

  const handleBackToBooking = () => {
    setCurrentStep("booking");
  };

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    handlePackageDetailsClick();
  };

  if (currentStep === "package-details") {
    return (
      <PackageDetails
        customerPhone={customer?.phoneNumber || ""}
        pickupLocation={pickupLocation}
        deliveryLocation={deliveryLocation}
        pickupCoords={pickupCoords}
        deliveryCoords={deliveryCoords}
        routeDistance={routeDistance}
        onBack={handleBackToBooking}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-end justify-center z-50">
      <div className="bg-gradient-to-b from-gray-900 to-black w-full max-w-2xl rounded-t-2xl p-6 animate-slide-up border-t border-purple-900/30 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Book a Delivery
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-purple-900/30 transition-all duration-300 transform hover:rotate-90"
            aria-label="Cancel"
            title="Cancel"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmitBooking} className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
          </div>

          {/* Route Map Preview */}
          {(pickupCoords || deliveryCoords) && (
            <div className="bg-gray-800/30 rounded-xl p-4 border border-purple-900/20">
              <h3 className="text-purple-300 font-medium mb-3">Route Preview</h3>
              <RouteMap
                pickupCoords={pickupCoords}
                deliveryCoords={deliveryCoords}
                height="200px"
                onRouteCalculated={(routeData) => {
                  setRouteDistance(routeData.distance / 1000); // Convert to km
                }}
              />
            </div>
          )}

          <div className="space-y-4">
            {/* Pickup Location - Auto-filled with current location */}
            <div className="group">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-purple-300">
                  Pickup Location
                </label>
                {isAutoLocating ? (
                  <span className="text-xs text-purple-400 flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-400 mr-1"></div>
                    Detecting exact location...
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={isLocating}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center disabled:opacity-50"
                  >
                    {isLocating ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-400 mr-1"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Use exact location
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={pickupLocation}
                  onChange={(e) => {
                    setPickupLocation(e.target.value);
                    setIsAutoLocating(false);
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 backdrop-blur-sm transition-all duration-300"
                  placeholder="Enter pickup address"
                  required
                />
                {pickupSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-gray-900 border border-gray-700 rounded-b-xl shadow-lg z-10 mt-1 max-h-60 overflow-y-auto">
                    {pickupSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion, true)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors text-sm text-gray-200 border-b border-gray-700 last:border-b-0"
                      >
                        <div className="font-medium">{suggestion.place_name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Location */}
            <div className="group">
              <label className="block text-sm font-medium text-purple-300 mb-2">
                Delivery Location
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 backdrop-blur-sm transition-all duration-300"
                  placeholder="Enter delivery address"
                  required
                />
                {deliverySuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-gray-900 border border-gray-700 rounded-b-xl shadow-lg z-10 mt-1 max-h-60 overflow-y-auto">
                    {deliverySuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion, false)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors text-sm text-gray-200 border-b border-gray-700 last:border-b-0"
                      >
                        <div className="font-medium">{suggestion.place_name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Package Details Button */}
            <div className="group">
              <label className="block text-sm font-medium text-purple-300 mb-2">
                Package Details
              </label>
              <button
                type="button"
                onClick={handlePackageDetailsClick}
                className="w-full p-4 rounded-xl bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-700/30 text-left text-gray-300 hover:text-white hover:from-purple-900/50 hover:to-indigo-900/50 hover:border-purple-500/50 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-600/20 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Add Package Information</p>
                      <p className="text-sm text-gray-400">Describe what you're sending</p>
                    </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={!pickupCoords || !deliveryCoords}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl shadow-2xl shadow-purple-900/40 hover:shadow-purple-900/60 transition-all duration-300"
            >
              Continue to Package Details
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}