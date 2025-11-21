// components/customer/PackageDetails.tsx
"use client";

import { useState, useEffect } from "react";
import OfferYourFare from "@/components/customer/OfferYourFare";
import { useUser } from '@/app/context/UserContext';

interface PackageDetailsProps {
  customerId?: number; 
  customerPhone: string;
  pickupLocation: string;
  deliveryLocation: string;
  pickupCoords: [number, number] | null;
  deliveryCoords: [number, number] | null;
  routeDistance?: number | null;
  onBack: () => void;
  onClose: () => void;
  onConfirmFare: (fare: string) => void;
}

export default function PackageDetails({
  customerPhone,
  pickupLocation,
  deliveryLocation,
  pickupCoords,
  deliveryCoords,
  routeDistance,
  onBack,
  onClose,
  onConfirmFare
}: PackageDetailsProps) {
  const [recipientPhone, setRecipientPhone] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [currentStep, setCurrentStep] = useState("package-details");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { customer } = useUser();

  // Auto-update package description when recipient phone changes
  useEffect(() => {
    if (recipientPhone.trim()) {
      const baseDescription = `Delivery to recipient: ${recipientPhone}`;
      
      if (!packageDescription || packageDescription.includes('Delivery to recipient:')) {
        setPackageDescription(baseDescription);
      } else if (packageDescription && !packageDescription.includes(recipientPhone)) {
        setPackageDescription(`${packageDescription}\n\nRecipient Phone: ${recipientPhone}`);
      }
    }
  }, [recipientPhone]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientPhone.trim()) {
      setError("Please enter recipient's phone number");
      return;
    }
    if (!packageDescription.trim()) {
      setError("Please describe what you want to deliver");
      return;
    }
    setCurrentStep("offer-fare");
  };

  const handleBackToPackageDetails = () => {
    setCurrentStep("package-details");
  };

  const handleConfirmFare = async (fare: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const bookingData = {
        customerId: customer?.id,
        customerUsername: customer?.username || customerPhone,
        recipientPhone,
        pickupAddress: pickupLocation,
        dropoffAddress: deliveryLocation,
        fare,
        distance: routeDistance || 0,
        packageDetails: packageDescription,
        userLocation: {
          lat: pickupCoords?.[1] || 0, 
          lng: pickupCoords?.[0] || 0
        },
      };

      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create booking');
      }

      const result = await response.json();
      console.log('✅ Booking created successfully:', result);
      
      onConfirmFare(fare);

    } catch (error) {
      console.error('❌ Error creating booking:', error);
      setError(error instanceof Error ? error.message : 'Failed to create booking');
    } finally {
      setIsLoading(false);
    }
  };

  if (currentStep === "offer-fare") {
    return (
      <OfferYourFare
        packageData={{
          customerId: customer?.id,
          customerPhone,
          recipientPhone,
          pickupLocation,
          deliveryLocation,
          packageDescription,
          pickupCoords,
          deliveryCoords,
          routeDistance
        }}
        onBack={handleBackToPackageDetails}
        onConfirmFare={handleConfirmFare}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-end justify-center z-50">
      <div className="bg-gradient-to-b from-gray-900 to-black w-full max-w-2xl rounded-t-2xl p-6 border-t border-purple-900/30 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-purple-900/30 transition-colors"
          >
            <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <h2 className="text-xl font-bold text-white">Delivery Details</h2>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-purple-900/30 transition-colors"
          >
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress */}
        <div className="flex justify-center space-x-2 mb-6">
          <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Route Info */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-purple-300 text-sm font-medium mb-2">Delivery Route</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                <span className="text-white">{pickupLocation}</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-pink-500 rounded-full mr-2"></div>
                <span className="text-white">{deliveryLocation}</span>
              </div>
            </div>
          </div>

          {/* Recipient Phone */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Recipient's Phone
            </label>
            <input
              type="tel"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-purple-500 focus:outline-none"
              placeholder="Enter phone number"
              required
            />
            <p className="text-purple-400 text-xs mt-1">
              Phone will be added to package details automatically
            </p>
          </div>

          {/* Package Description */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Package Details
            </label>
            <textarea
              value={packageDescription}
              onChange={(e) => setPackageDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-purple-500 focus:outline-none"
              placeholder="Describe what you're delivering..."
              required
            />
          </div>

          {/* Preview */}
          {recipientPhone && packageDescription && (
            <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-700/30">
              <h3 className="text-purple-300 text-sm font-medium mb-2">Preview</h3>
              <div className="text-sm text-gray-300 bg-gray-800/30 rounded p-3">
                {packageDescription}
              </div>
            </div>
          )}

          {/* Continue Button */}
          <button
            type="submit"
            disabled={isLoading || !recipientPhone.trim() || !packageDescription.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-medium py-4 px-6 rounded-lg transition-colors"
          >
            {isLoading ? "Processing..." : "Continue to Pricing"}
          </button>
        </form>
      </div>
    </div>
  );
}