"use client";

import { useState, useEffect, useRef } from "react";
import { calculateDistance } from "@/utils/pricingCalculator";
import SearchingForDrivers from "@/components/customer/SearchingForDrivers";
import { useUser } from '@/app/context/UserContext';

interface OfferYourFareProps {
  packageData: any;
  onBack: () => void;
  onConfirmFare: (fare: string) => void;
}

// Simple function to calculate fare based only on distance
const calculateRecommendedFare = (distance: number): number => {
  // Charge 95 cents per km
  const distanceRate = distance * 0.95;
  
  // Apply minimum and maximum bounds
  return Math.max(2.00, Math.min(100.00, distanceRate));
};

export default function OfferYourFare({ packageData, onBack, onConfirmFare }: OfferYourFareProps) {
  const [fare, setFare] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { customer } = useUser(); // Get customer from context

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Fallback to a default location or handle error
          setUserLocation({ lat: 0, lng: 0 });
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser');
      setUserLocation({ lat: 0, lng: 0 });
    }
  }, []);

  // Recommended fare calculation based on actual route distance
  const recommendedFare = (() => {
    if (packageData.routeDistance) {
      const fare = calculateRecommendedFare(packageData.routeDistance);
      return fare.toFixed(2);
    }
    
    if (!packageData.pickupCoords || !packageData.deliveryCoords) return "2.00";
    const distance = calculateDistance(packageData.pickupCoords, packageData.deliveryCoords);
    const fare = calculateRecommendedFare(distance);
    return fare.toFixed(2);
  })();

  // Focus input on component mount and trigger animation
  useEffect(() => {
    setIsVisible(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle fare input with validation
  const handleFareChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setFare(value);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fare && parseFloat(fare) > 0) {
      setIsSearching(true);
    }
  };

  // Set fare to recommended amount
  const useRecommendedFare = () => {
    setFare(recommendedFare);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle fare updates from the SearchingForDrivers component
  const handleFareUpdate = (newFare: string) => {
    setFare(newFare);
  };

  // Handle final confirmation from the SearchingForDrivers component
  const handleFinalConfirm = () => {
    onConfirmFare(fare);
  };

  if (isSearching) {
    return (
      <SearchingForDrivers
        initialFare={fare}
        onFareChange={handleFareUpdate}
        onCancel={() => setIsSearching(false)}
        onConfirm={handleFinalConfirm}
        packageData={{
          pickupAddress: packageData.pickupLocation,
          dropoffAddress: packageData.deliveryLocation,
          routeDistance: packageData.routeDistance || 0,
          packageDescription: packageData.packageDescription
        }}
        userLocation={userLocation || { lat: 0, lng: 0 }}
        customerId={customer?.id || 0} // Pass customerId
        customerUsername={customer?.phoneNumber || packageData.customerPhone} // Use phone as username
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-end justify-center z-50">
      <div
        className={`bg-gradient-to-b from-gray-900 to-black w-full max-w-2xl rounded-t-2xl p-6 border-t border-purple-900/30 max-h-[90vh] overflow-y-auto transform transition-transform duration-500 ease-out ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-purple-900/30 transition-all duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Offer Your Fare
          </h2>
          <div className="w-10"></div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-2 mb-8">
          <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
          <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Fare Input Section */}
          <div className="text-center">
            <div className="relative flex items-center justify-center max-w-xs mx-auto">
              <div className="absolute left-3 text-purple-400 text-2xl font-bold">$</div>
              <div className="absolute right-3">
                <div className="h-8 w-px bg-purple-500 mx-2 animate-pulse"></div>
              </div>
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={fare}
                onChange={handleFareChange}
                className="w-full pl-10 pr-12 py-4 text-3xl text-center bg-gray-800/50 border border-purple-700/30 rounded-xl text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 backdrop-blur-sm transition-all duration-300"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Route Information */}
          <div className="bg-gray-800/20 border border-purple-900/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-purple-300 font-medium">Delivery Route</h3>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                <span className="text-gray-300 truncate">{packageData.pickupLocation}</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-pink-500 rounded-full mr-2"></div>
                <span className="text-gray-300 truncate">{packageData.deliveryLocation}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-gray-800/20 border border-purple-900/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-purple-300 font-medium">Payment Method</h3>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <span className="text-white font-medium">Cash</span>
              </div>
              <div className="bg-purple-900/30 text-purple-300 text-xs px-2 py-1 rounded-md">Default</div>
            </div>
          </div>

          {/* Recommended Price */}
          <div className="text-center">
            <p className="text-gray-400 mb-2">Recommended Price</p>
            <button
              type="button"
              onClick={useRecommendedFare}
              className="inline-flex items-center space-x-2 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700/30 rounded-xl px-4 py-2 transition-all duration-300 group"
            >
              <span className="text-white font-medium">${recommendedFare}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-purple-400 group-hover:translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {packageData.routeDistance ? (
              <p className="text-xs text-gray-500 mt-2">
                Distance: {packageData.routeDistance.toFixed(1)} km
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-2">
                Based on direct distance only (95¢ per km)
              </p>
            )}
          </div>

          {/* Done Button */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={!fare || parseFloat(fare) <= 0}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl shadow-2xl shadow-purple-900/40 hover:shadow-purple-900/60 transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100"
            >
              Confirm Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}