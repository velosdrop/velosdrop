//components/customer/BookingPanel.tsx
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
  const [isAutoLocating, setIsAutoLocating] = useState(true); // CHANGED: Set to true for auto-location
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

  // ADDED: Handle fare confirmation
  const handleConfirmFare = (fare: string) => {
    console.log('Fare confirmed:', fare);
    // You can handle the fare confirmation here
    // For example, you might want to close the panel or show a success message
    onClose(); // Close the panel after fare confirmation
  };

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    handlePackageDetailsClick();
  };

  if (currentStep === "package-details") {
    return (
      <PackageDetails
        customerId={customer?.id} 
        customerPhone={customer?.phoneNumber || ""}
        pickupLocation={pickupLocation}
        deliveryLocation={deliveryLocation}
        pickupCoords={pickupCoords}
        deliveryCoords={deliveryCoords}
        routeDistance={routeDistance}
        onBack={handleBackToBooking}
        onClose={onClose}
        onConfirmFare={handleConfirmFare} // ADDED: This prop was missing
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-end justify-center z-50">
      <div className="bg-gradient-to-b from-gray-900 to-black w-full max-w-2xl rounded-t-2xl p-6 animate-slide-up border-t border-purple-900/30 max-h-[90vh] overflow-y-auto">
        {/* Header Section */}
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

          {/* Route Map Preview */}
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
                  setRouteDistance(routeData.distance / 1000); // Convert to km
                }}
              />
            </div>
          )}

          <div className="space-y-6">
            {/* Pickup Location - Auto-filled with current location */}
            <div className="group">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-purple-300">
                  Pickup Location
                </label>
                {isAutoLocating ? (
                  <span className="text-xs text-purple-400 flex items-center space-x-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-400"></div>
                    <span>Detecting exact location...</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={isLocating}
                    className="text-xs bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 hover:text-purple-200 flex items-center space-x-1 px-2 py-1 rounded-lg transition-all duration-200 disabled:opacity-50"
                  >
                    {isLocating ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-300"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
                        </svg>
                        <span>Use exact location</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-green-400 z-10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
                  </svg>
                </div>
                <input
                  type="text"
                  value={pickupLocation}
                  onChange={(e) => {
                    setPickupLocation(e.target.value);
                    setIsAutoLocating(false);
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 backdrop-blur-sm transition-all duration-300 group-hover:border-gray-600"
                  placeholder="Enter pickup address"
                  required
                />
                {pickupSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-gray-900 border border-gray-700 rounded-b-xl shadow-2xl z-10 mt-1 max-h-60 overflow-y-auto backdrop-blur-sm">
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
            </div>

            {/* Delivery Location */}
            <div className="group">
              <label className="block text-sm font-medium text-purple-300 mb-3">
                Delivery Location
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-red-400 z-10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
                  </svg>
                </div>
                <input
                  type="text"
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 backdrop-blur-sm transition-all duration-300 group-hover:border-gray-600"
                  placeholder="Enter delivery address"
                  required
                />
                {deliverySuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-gray-900 border border-gray-700 rounded-b-xl shadow-2xl z-10 mt-1 max-h-60 overflow-y-auto backdrop-blur-sm">
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