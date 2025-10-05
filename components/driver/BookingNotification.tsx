// components/driver/BookingNotification.tsx
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiMapPin, FiDollarSign, FiUser, FiX, FiPackage, FiPhone } from 'react-icons/fi';

interface BookingRequest {
  id: number;
  customerId: number;
  customerUsername: string;
  customerPhoneNumber?: string;
  customerProfilePictureUrl?: string;
  pickupLocation: string;
  dropoffLocation: string;
  fare: number;
  distance: number;
  expiresIn: number;
  createdAt: string;
  packageDetails?: string;
  isDirectAssignment?: boolean;
}

interface BookingNotificationProps {
  request: BookingRequest;
  onAccept: () => void;
  onReject: () => void;
  onExpire: () => void;
  isConnected: boolean;
}

export default function BookingNotification({ 
  request, 
  onAccept, 
  onReject, 
  onExpire,
  isConnected 
}: BookingNotificationProps) {
  const [timeLeft, setTimeLeft] = useState(request.expiresIn);
  const [isVisible, setIsVisible] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      onExpire();
      setIsVisible(false);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onExpire]);

  const handleAccept = async () => {
    setIsVisible(false);
    onAccept();
  };

  const handleReject = async () => {
    setIsVisible(false);
    onReject();
  };

  const handleImageError = () => {
    setImageError(true);
  };

  if (!isVisible || !isConnected) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-4 right-4 z-50 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
      >
        {/* Header with countdown */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">New Delivery Request</h3>
            <div className="flex items-center space-x-2">
              <FiClock className="h-4 w-4" />
              <span className="font-mono">{timeLeft}s</span>
            </div>
          </div>
          {request.isDirectAssignment && (
            <div className="mt-2 flex items-center">
              <span className="px-2 py-1 bg-purple-800 text-white text-xs font-medium rounded-full">
                Direct Request
              </span>
              <span className="ml-2 text-sm text-purple-200">Customer selected you specifically</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Enhanced Customer Info Section */}
          <div className="flex items-center space-x-3 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="relative">
              {request.customerProfilePictureUrl && !imageError ? (
                <img
                  src={request.customerProfilePictureUrl}
                  alt={request.customerUsername}
                  className="w-12 h-12 rounded-full object-cover border-2 border-purple-200"
                  onError={handleImageError}
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {request.customerUsername.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="font-semibold text-gray-900 truncate">{request.customerUsername}</p>
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                  Verified
                </span>
              </div>
              
              {request.customerPhoneNumber && (
                <div className="flex items-center space-x-1 mt-1">
                  <FiPhone className="h-3 w-3 text-gray-500 flex-shrink-0" />
                  <a 
                    href={`tel:${request.customerPhoneNumber}`}
                    className="text-sm text-gray-600 hover:text-purple-600 transition-colors truncate"
                  >
                    {request.customerPhoneNumber}
                  </a>
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-1">Ready for pickup</p>
            </div>
          </div>

          {/* Trip Details */}
          <div className="space-y-3 mb-4">
            {/* Package Details */}
            {request.packageDetails && (
              <div className="flex items-start space-x-3">
                <FiPackage className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Package Details</p>
                  <p className="text-sm text-gray-600">{request.packageDetails}</p>
                </div>
              </div>
            )}

            <div className="flex items-start space-x-3">
              <FiMapPin className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Pickup</p>
                <p className="text-sm text-gray-600 truncate">{request.pickupLocation}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <FiMapPin className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Dropoff</p>
                <p className="text-sm text-gray-600 truncate">{request.dropoffLocation}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <FiDollarSign className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Fare</p>
                <p className="text-sm text-gray-600">${request.fare.toFixed(2)} • {request.distance} km</p>
              </div>
            </div>
          </div>

          {/* Enhanced Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleReject}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200 border border-gray-300 flex items-center justify-center space-x-2"
            >
              <FiX className="h-4 w-4" />
              <span>Decline</span>
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors duration-200 shadow-lg hover:shadow-green-200 flex items-center justify-center space-x-2"
            >
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>Accept Delivery</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}