// components/customer/OfferYourFare.tsx
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
          customerId: packageData.customerId,
          customerUsername: customer?.username || packageData.customerPhone,
          recipientPhone: packageData.recipientPhone, // Pass recipient phone through
          pickupAddress: packageData.pickupLocation,
          dropoffAddress: packageData.deliveryLocation,
          routeDistance: packageData.routeDistance || 0,
          packageDescription: packageData.packageDescription,
          pickupCoords: packageData.pickupCoords,
          deliveryCoords: packageData.deliveryCoords,
          customerPhone: packageData.customerPhone
        }}
        userLocation={userLocation || { lat: 0, lng: 0 }}
        customerId={customer?.id || packageData.customerId || 0}
        customerUsername={customer?.username || packageData.customerPhone}
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
            Set Your Delivery Price
          </h2>
          <div className="w-10"></div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-2 mb-8">
          <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
          <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fare Input Section - Simplified */}
          <div className="text-center space-y-4">
            {/* Input Label */}
            <div className="text-center mb-2">
              <p className="text-gray-300 text-sm mb-1">Enter your delivery price</p>
              <p className="text-gray-500 text-xs">Drivers will see your offer and can accept it</p>
            </div>

            {/* Input Field */}
            <div className="relative flex items-center justify-center max-w-xs mx-auto">
              <div className="absolute left-3 text-purple-400 text-2xl font-bold">$</div>
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={fare}
                onChange={handleFareChange}
                className="w-full pl-10 pr-4 py-4 text-3xl text-center bg-gray-800/50 border-2 border-purple-500/50 rounded-xl text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 backdrop-blur-sm transition-all duration-300"
                placeholder="0.00"
              />
            </div>

            {/* Recommended Price - Now below the input */}
            <div className="text-center space-y-2">
              <p className="text-gray-400 text-sm">Recommended price for this trip</p>
              <button
                type="button"
                onClick={useRecommendedFare}
                className="inline-flex items-center space-x-2 bg-purple-900/40 hover:bg-purple-900/60 border border-purple-600/50 rounded-xl px-6 py-3 transition-all duration-300 group hover:scale-105"
              >
                <span className="text-white font-bold text-lg">${recommendedFare}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-purple-300 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
          {/* Quick Info Cards - Simplified */}
          <div className="grid grid-cols-1 gap-4">
            {/* Route Info */}
            <div className="bg-gray-800/30 border border-purple-900/30 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <div className="flex flex-col items-center pt-1">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <div className="w-0.5 h-6 bg-purple-500/30 my-1"></div>
                  <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <h3 className="text-purple-300 font-medium text-sm mb-2">Delivery Route</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-white truncate">{packageData.pickupLocation}</p>
                    <p className="text-white truncate">{packageData.deliveryLocation}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Package Info */}
            <div className="bg-gray-800/30 border border-purple-900/30 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7l8 4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-purple-300 font-medium text-sm mb-2">Package Details</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-300">
                      <span className="text-gray-400">To:</span> {packageData.recipientPhone || "Not provided"}
                    </p>
                    <p className="text-gray-300 truncate">
                      <span className="text-gray-400">Item:</span> {packageData.packageDescription || "No description"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method - Simplified */}
          <div className="bg-gray-800/30 border border-purple-900/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-purple-400"
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
                <div>
                  <span className="text-white font-medium block">Cash Payment</span>
                  <span className="text-gray-400 text-xs">Pay the driver upon delivery</span>
                </div>
              </div>
            </div>
          </div>

          {/* Done Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={!fare || parseFloat(fare) <= 0}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl shadow-2xl shadow-purple-900/40 hover:shadow-purple-900/60 transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100"
            >
              {fare ? `Book for $${fare}` : "Enter Price to Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}