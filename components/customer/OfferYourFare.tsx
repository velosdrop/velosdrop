//components/customer/OfferYourFare.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { calculateAllVehicleFares, formatCurrency, getVehicleIcon, getVehicleDisplayName } from "@/utils/pricingCalculator";
import SearchingForDrivers from "@/components/customer/SearchingForDrivers";
import { useUser } from '@/app/context/UserContext';

interface OfferYourFareProps {
  packageData: any;
  onBack: () => void;
  onConfirmFare: (fare: string, vehicleType?: string) => void;
}

export default function OfferYourFare({ packageData, onBack, onConfirmFare }: OfferYourFareProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<'motorcycle' | 'car' | 'truck'>('car');
  const [fare, setFare] = useState<string>("");
  const [isVisible, setIsVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [vehicleFares, setVehicleFares] = useState<Record<string, number>>({});
  const [recommendedFare, setRecommendedFare] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { customer } = useUser();

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
          setUserLocation({ lat: 0, lng: 0 });
        }
      );
    } else {
      setUserLocation({ lat: 0, lng: 0 });
    }
  }, []);

  // Calculate fares for all vehicle types when distance changes
  useEffect(() => {
    let distance = packageData.routeDistance;
    
    if (!distance && packageData.pickupCoords && packageData.deliveryCoords) {
      // Use existing distance if available
      distance = packageData.routeDistance || 5; // Default to 5km if no distance
    }
    
    if (distance) {
      const fares = calculateAllVehicleFares(distance);
      setVehicleFares(fares);
      
      // Set initial fare to car's recommended fare (rounded to nearest dollar)
      const carFare = Math.round(fares.car);
      setFare(carFare.toString());
      setRecommendedFare(carFare);
    }
  }, [packageData.routeDistance, packageData.pickupCoords, packageData.deliveryCoords]);

  // Handle vehicle selection
  const handleVehicleSelect = (vehicle: 'motorcycle' | 'car' | 'truck') => {
    setSelectedVehicle(vehicle);
    if (vehicleFares[vehicle]) {
      const newFare = Math.round(vehicleFares[vehicle]).toString();
      setFare(newFare);
      setRecommendedFare(Math.round(vehicleFares[vehicle]));
    }
  };

  // Focus input on component mount and trigger animation
  useEffect(() => {
    setIsVisible(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle fare input with validation
  const handleFareChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, ""); // Only allow numbers, no decimals
    if (value === "" || /^\d+$/.test(value)) {
      setFare(value);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fare && parseInt(fare) > 0) {
      setIsSearching(true);
    }
  };

  // Handle fare updates from the SearchingForDrivers component
  const handleFareUpdate = (newFare: string) => {
    // Remove any cents if they exist
    const wholeDollarFare = Math.round(parseFloat(newFare)).toString();
    setFare(wholeDollarFare);
  };

  // Handle final confirmation from the SearchingForDrivers component
  const handleFinalConfirm = (driver: any) => {
    onConfirmFare(fare, selectedVehicle);
  };

  // Adjust fare by $1 increments/decrements
  const adjustFare = (amount: number) => {
    const currentFare = parseInt(fare) || recommendedFare;
    const newFare = Math.max(2, currentFare + amount); // Minimum $2 from your pricing calculator
    setFare(newFare.toString());
  };

  // Get vehicle display name
  const getVehicleDisplayName = (vehicleType: 'motorcycle' | 'car' | 'truck'): string => {
    const names = {
      motorcycle: 'Motorcycle',
      car: 'Car',
      truck: 'Truck'
    };
    return names[vehicleType];
  };

  // Format fare as whole number
  const formatFare = (fareValue: string | number): string => {
    const num = typeof fareValue === 'string' ? parseInt(fareValue) : fareValue;
    return `$${num}`;
  };

  if (isSearching) {
    return (
      <SearchingForDrivers
        initialFare={fare}
        onFareChange={handleFareUpdate}
        onCancel={() => setIsSearching(false)}
        onConfirm={handleFinalConfirm}
        packageData={{
          ...packageData,
          vehicleType: selectedVehicle,
          customerId: customer?.id,
          customerUsername: customer?.username || packageData.customerPhone,
          recipientPhone: packageData.recipientPhone,
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

  // Calculate price per km for display
  const calculatePricePerKm = (): string => {
    const distance = packageData.routeDistance || 1;
    const currentFare = parseInt(fare) || recommendedFare;
    const perKm = currentFare / distance;
    return `$${perKm.toFixed(2)}/km`;
  };

  // Get vehicle rate from your pricing calculator
  const getVehicleRate = (vehicle: 'motorcycle' | 'car' | 'truck'): number => {
    const rates = {
      motorcycle: 0.60,
      car: 0.80,
      truck: 1.20
    };
    return rates[vehicle];
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-end justify-center z-50">
      <div
        className={`bg-gradient-to-b from-gray-900 via-gray-900 to-black w-full max-w-2xl rounded-t-3xl p-6 border-t border-purple-900/50 max-h-[90vh] overflow-y-auto transform transition-all duration-700 ease-out ${
          isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
        style={{
          background: "linear-gradient(180deg, rgba(17, 24, 39, 0.95) 0%, rgba(0, 0, 0, 0.98) 100%)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 -20px 60px rgba(139, 92, 246, 0.3)"
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="p-3 rounded-full bg-gray-800/50 hover:bg-purple-900/40 transition-all duration-300 group"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-purple-400 group-hover:text-white transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Set Your Price
            </h2>
            <p className="text-purple-300 text-sm mt-1">
              Choose vehicle and set fair price
            </p>
          </div>

          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">{getVehicleIcon(selectedVehicle)}</span>
          </div>
        </div>

        {/* Vehicle Selection Section */}
        <div className="mb-8">
          <h3 className="text-purple-300 font-semibold text-lg mb-4">Choose Your Vehicle</h3>
          
          <div className="grid grid-cols-3 gap-3">
            {(['motorcycle', 'car', 'truck'] as const).map((vehicle) => (
              <button
                key={vehicle}
                onClick={() => handleVehicleSelect(vehicle)}
                className={`relative p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                  selectedVehicle === vehicle
                    ? 'border-purple-500 bg-gradient-to-br from-purple-900/40 to-black shadow-2xl shadow-purple-500/30 animate-vehicle-select'
                    : 'border-gray-700 bg-gray-800/30 hover:border-purple-400/50'
                }`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <div className={`text-3xl transition-transform duration-300 ${
                    selectedVehicle === vehicle ? 'scale-110 animate-vehicle-icon-bounce' : ''
                  }`}>
                    {getVehicleIcon(vehicle)}
                  </div>
                  
                  <div className="text-center">
                    <p className={`font-semibold text-sm ${
                      selectedVehicle === vehicle ? 'text-white' : 'text-gray-300'
                    }`}>
                      {getVehicleDisplayName(vehicle)}
                    </p>
                    <p className={`text-xs mt-1 ${
                      selectedVehicle === vehicle ? 'text-purple-300' : 'text-gray-500'
                    }`}>
                      {vehicle === 'motorcycle' ? 'Small items' : 
                       vehicle === 'car' ? 'Medium packages' : 
                       'Large shipments'}
                    </p>
                  </div>
                  
                  <div className={`px-3 py-1 rounded-lg text-sm font-bold transition-all duration-300 ${
                    selectedVehicle === vehicle
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-gray-700/50 text-gray-300'
                  }`}>
                    {vehicleFares[vehicle] ? `$${Math.round(vehicleFares[vehicle])}` : '...'}
                  </div>
                </div>
                
                {selectedVehicle === vehicle && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg animate-checkmark-pop">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Price Adjuster Section */}
        <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-purple-900/40 rounded-2xl p-5 mb-6 backdrop-blur-sm animate-slide-in-up relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute -top-10 -right-10 w-20 h-20 bg-purple-500/10 rounded-full blur-xl"></div>
          <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-blue-500/10 rounded-full blur-xl"></div>
          
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div>
              <h3 className="text-purple-300 font-semibold text-lg">Set Your Price</h3>
              <p className="text-gray-400 text-sm">Adjust in $1 increments</p>
            </div>
            <div className="p-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg">
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
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          <div className="relative z-10">
            {/* Price Display */}
            <div className="text-center mb-6">
              <div className="inline-block px-8 py-4 bg-gradient-to-r from-purple-900/40 to-blue-900/40 rounded-2xl border border-purple-700/40 backdrop-blur-sm animate-price-glow">
                <span className="text-5xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-transparent">
                  ${parseInt(fare) || recommendedFare}
                </span>
                <p className="text-gray-400 text-sm mt-2">Total Price</p>
              </div>
            </div>

            {/* Adjust Buttons */}
            <div className="flex items-center justify-center space-x-8">
              <button
                onClick={() => adjustFare(-1)}
                className="group w-16 h-16 rounded-full bg-gradient-to-br from-gray-800 to-black border-2 border-purple-700/40 flex items-center justify-center text-white hover:from-red-900/40 hover:to-gray-800 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-red-500/20 active:scale-95"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 group-hover:text-red-400 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>

              <div className="text-center">
                <div className="text-lg font-semibold text-white mb-1">Adjust Price</div>
                <div className="text-sm text-gray-400">$1 per click</div>
              </div>

              <button
                onClick={() => adjustFare(1)}
                className="group w-16 h-16 rounded-full bg-gradient-to-br from-gray-800 to-black border-2 border-purple-700/40 flex items-center justify-center text-white hover:from-green-900/40 hover:to-gray-800 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-green-500/20 active:scale-95"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 group-hover:text-green-400 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>

            {/* Reset Button */}
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setFare(recommendedFare.toString())}
                className="px-5 py-2 bg-gradient-to-r from-purple-700/30 to-blue-700/30 text-purple-300 hover:text-white text-sm rounded-lg border border-purple-700/50 hover:border-purple-500 transition-all duration-300 flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Reset to Recommended: ${recommendedFare}</span>
              </button>
            </div>

            {/* Fare Info */}
            <div className="grid grid-cols-2 gap-3 mt-6 text-sm">
              <div className="bg-gray-800/30 rounded-lg p-3 text-center">
                <p className="text-gray-400 mb-1">Recommended</p>
                <p className="text-green-400 font-bold text-lg">${recommendedFare}</p>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-3 text-center">
                <p className="text-gray-400 mb-1">Effective Rate</p>
                <p className="text-purple-300 font-bold text-lg">{calculatePricePerKm()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trip Info Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-gray-800/30 to-black/30 border border-purple-900/40 rounded-2xl p-4 backdrop-blur-sm animate-slide-in-up stagger-delay-1">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-purple-600 to-blue-500 rounded-xl">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white"
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 3 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Distance</p>
                <p className="text-white font-bold">
                  {packageData.routeDistance ? `${packageData.routeDistance.toFixed(1)} km` : "Calculating..."}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800/30 to-black/30 border border-purple-900/40 rounded-2xl p-4 backdrop-blur-sm animate-slide-in-up stagger-delay-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-pink-600 to-purple-500 rounded-xl">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Est. Time</p>
                <p className="text-white font-bold">
                  {packageData.routeDistance ? 
                    `${Math.ceil(packageData.routeDistance * 3)}-${Math.ceil(packageData.routeDistance * 4)} min` : 
                    "15-20 min"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Package Summary */}
        <div className="bg-gradient-to-br from-gray-800/30 to-black/30 border border-purple-900/40 rounded-2xl p-5 mb-6 backdrop-blur-sm animate-slide-in-up stagger-delay-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-purple-300 font-semibold text-lg">Delivery Summary</h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-xs">Live pricing</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-800/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{getVehicleIcon(selectedVehicle)}</div>
                <div>
                  <p className="text-gray-400 text-sm">Vehicle</p>
                  <p className="text-white font-medium">{getVehicleDisplayName(selectedVehicle)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">Base Rate</p>
                <p className="text-green-400 font-medium">${getVehicleRate(selectedVehicle).toFixed(2)}/km</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-800/20 rounded-lg">
                <p className="text-gray-400 text-sm">From</p>
                <p className="text-white text-sm truncate">{packageData.pickupLocation}</p>
              </div>
              <div className="p-3 bg-gray-800/20 rounded-lg">
                <p className="text-gray-400 text-sm">To</p>
                <p className="text-white text-sm truncate">{packageData.deliveryLocation}</p>
              </div>
            </div>
            
            <div className="p-3 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-700/30">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-300 text-sm">Your Offer</p>
                  <p className="text-xl font-bold text-white">${parseInt(fare) || recommendedFare}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-300 text-sm">Effective Rate</p>
                  <p className="text-lg font-semibold text-purple-300">{calculatePricePerKm()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={onBack}
            className="flex-1 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white font-medium py-4 px-6 rounded-xl transition-all duration-300 border border-gray-700 hover:border-gray-600 flex items-center justify-center space-x-2 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back</span>
          </button>

          <button
            onClick={handleSubmit}
            disabled={!fare || parseInt(fare) <= 0}
            className="flex-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-500 hover:via-pink-500 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-xl shadow-2xl shadow-purple-900/40 hover:shadow-purple-900/60 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-2 group relative overflow-hidden"
          >
            {/* Button shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="relative">
              Book for ${parseInt(fare) || recommendedFare}
            </span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes vehicleSelect {
          0% { transform: scale(0.95); opacity: 0.8; box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 20px 10px rgba(147, 51, 234, 0.2); }
          100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(147, 51, 234, 0); }
        }
        
        @keyframes vehicleIconBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        
        @keyframes checkmarkPop {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes slideInUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes priceGlow {
          0%, 100% { filter: drop-shadow(0 0 5px rgba(147, 51, 234, 0.5)); }
          50% { filter: drop-shadow(0 0 15px rgba(147, 51, 234, 0.8)); }
        }
        
        .animate-vehicle-select {
          animation: vehicleSelect 0.5s ease-out forwards;
        }
        
        .animate-vehicle-icon-bounce {
          animation: vehicleIconBounce 0.5s ease-in-out;
        }
        
        .animate-checkmark-pop {
          animation: checkmarkPop 0.3s ease-out forwards;
        }
        
        .animate-slide-in-up {
          animation: slideInUp 0.5s ease-out forwards;
        }
        
        .animate-price-glow {
          animation: priceGlow 2s infinite;
        }
        
        .stagger-delay-1 { animation-delay: 0.1s; }
        .stagger-delay-2 { animation-delay: 0.2s; }
        .stagger-delay-3 { animation-delay: 0.3s; }
      `}</style>
    </div>
  );
}