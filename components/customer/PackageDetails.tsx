"use client";

import { useState } from "react";

interface PackageDetailsProps {
  customerPhone: string;
  pickupLocation: string;
  deliveryLocation: string;
  fareOffer: string;
  pickupCoords: [number, number] | null; // Add this line
  deliveryCoords: [number, number] | null; // Add this line
  onBack: () => void;
  onClose: () => void;
}

export default function PackageDetails({
  customerPhone,
  pickupLocation,
  deliveryLocation,
  fareOffer,
  pickupCoords, // Add this line
  deliveryCoords, // Add this line
  onBack,
  onClose
}: PackageDetailsProps) {
  const [recipientPhone, setRecipientPhone] = useState("");
  const [packageDescription, setPackageDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle package details submission
    console.log({
      customerPhone,
      recipientPhone,
      pickupLocation,
      deliveryLocation,
      fareOffer,
      packageDescription,
      pickupCoords, // You can now use these coordinates
      deliveryCoords // You can now use these coordinates
    });
  };

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
              viewBox="0 极 0 24 24"
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
        <div className="flex items-center justify-center space-x-2极 mb-6">
          <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
          <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
        </div>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684极l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 极 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
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
                  xmlns="http://www.w3.org/2000/s极vg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2极h-1C9.716 21 3 14.284 3 6V5z" />
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
          </div>

          {/* Package Description - Combined field for all package details */}
          <div className="group">
            <label className="block text-sm font-medium text-purple-300 mb-2">
              What do you want to deliver?
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 text-purple-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4极v10M4 7l8 4" />
                </svg>
              </div>
              <textarea
                value={packageDescription}
                onChange={(e) => setPackageDescription(e.target.value)}
                rows={6}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 backdrop-blur-sm transition-all duration-300"
                placeholder={`Describe your package in detail including:
• What items are being delivered, weight and size etc`}
                required
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Please include all relevant details about your package in the description above.
            </p>
          </div>

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
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px极-6 rounded-xl shadow-2xl shadow-purple-900/40 hover:shadow-purple-900/60 transition-all duration-300"
            >
              Confirm Delivery
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}