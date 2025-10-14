//components/customer/PackageDetails.tsx`
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
  const { customer } = useUser(); // Get customer from context

  // Auto-update package description when recipient phone changes
  useEffect(() => {
    if (recipientPhone.trim()) {
      // Create a smart package description that includes the recipient phone
      const baseDescription = `Delivery to recipient: ${recipientPhone}`;
      
      // Only update if the package description is empty or contains the recipient phone pattern
      if (!packageDescription || packageDescription.includes('Delivery to recipient:')) {
        setPackageDescription(baseDescription);
      } else if (packageDescription && !packageDescription.includes(recipientPhone)) {
        // If there's existing description but no recipient phone, append it
        setPackageDescription(`${packageDescription}\n\nRecipient Phone: ${recipientPhone}`);
      }
    }
  }, [recipientPhone]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate that both recipient phone and package description are provided
    if (!recipientPhone.trim()) {
      setError("Please enter recipient's phone number");
      return;
    }
    if (!packageDescription.trim()) {
      setError("Please describe what you want to deliver");
      return;
    }
    // Transition to OfferYourFare instead of submitting directly
    setCurrentStep("offer-fare");
  };

  const handleBackToPackageDetails = () => {
    setCurrentStep("package-details");
  };

  const handleConfirmFare = async (fare: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Create the booking data with ALL required fields including recipientPhone
      const bookingData = {
        customerId: customer?.id,
        customerUsername: customer?.username || customerPhone,
        recipientPhone, // This is the key field - passed separately to API
        pickupAddress: pickupLocation,
        dropoffAddress: deliveryLocation,
        fare,
        distance: routeDistance || 0,
        packageDetails: packageDescription, // Also included in description for visibility
        userLocation: {
          lat: pickupCoords?.[1] || 0, 
          lng: pickupCoords?.[0] || 0
        },
      };

      console.log('📤 Sending booking data to API:', {
        ...bookingData,
        recipientPhone: recipientPhone // Debug log to confirm it's being sent
      });

      // Make the actual API call to create the booking
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
      
      // Handle success
      console.log('Booking created with recipient phone:', recipientPhone);

      // Call the original onConfirmFare to handle any additional logic
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
          recipientPhone, // CRITICAL: Pass recipientPhone separately
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
      <div className="bg-gradient-to-b from-gray-900 to-black w-full max-w-2xl rounded-t-2xl p-6 animate-slide-up border-t border-purple-900/30 max-h-[90vh] overflow-y-auto">
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
            Package Details
          </h2>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-purple-900/30 transition-all duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-2 mb-6">
          <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
          <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-xl backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-700/20 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="text-red-200 text-sm">{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Phone (pre-filled) */}
          <div className="group">
            <label className="block text-sm font-medium text-purple-300 mb-2">
              Your Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <input
                type="tel"
                value={customerPhone}
                readOnly
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800/20 border border-gray-700 text-gray-400 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Recipient Phone */}
          <div className="group">
            <label className="block text-sm font-medium text-purple-300 mb-2">
              Recipient's Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 backdrop-blur-sm transition-all duration-300"
                placeholder="Enter recipient's phone number"
                required
              />
            </div>
            <p className="text-xs text-purple-400 mt-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recipient's phone will be automatically
            </p>
          </div>

          {/* Package Description - Combined field for all package details */}
          <div className="group">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-purple-300">
                What do you want to deliver?
              </label>
              {recipientPhone && (
                <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded-full flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Recipient phone included
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute top-3 left-3 text-purple-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7l8 4" />
                </svg>
              </div>
              <textarea
                value={packageDescription}
                onChange={(e) => setPackageDescription(e.target.value)}
                rows={6}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 backdrop-blur-sm transition-all duration-300"
                placeholder={`Describe your package in detail including:
• What items are being delivered
• Weight and size
• Special instructions

Recipient's phone will be automatically added here`}
                required
              />
            </div>
            <div className="flex items-start justify-between mt-2">
              <p className="text-sm text-gray-400">
                Please include all relevant details about your package
              </p>
              {packageDescription.includes(recipientPhone) && recipientPhone && (
                <p className="text-xs text-green-400 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Recipient phone included
                </p>
              )}
            </div>
          </div>

          {/* Preview Section */}
          {recipientPhone && packageDescription && (
            <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-4">
              <h3 className="text-purple-300 font-medium text-sm mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Package Preview (What driver will see)
              </h3>
              <div className="text-sm text-gray-300 bg-gray-800/30 rounded-lg p-3 max-h-32 overflow-y-auto">
                {packageDescription}
              </div>
              <div className="mt-2 text-xs text-purple-400">
                ✅ Recipient phone will also be displayed separately to driver for easy contact
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-6">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-3 px-6 rounded-xl border border-purple-700/30 text-purple-300 hover:bg-purple-900/30 hover:text-white transition-all duration-300"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading || !recipientPhone.trim() || !packageDescription.trim()}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl shadow-2xl shadow-purple-900/40 hover:shadow-purple-900/60 transition-all duration-300 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                'Continue to Pricing'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}