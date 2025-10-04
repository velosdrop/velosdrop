'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiMapPin, FiDollarSign, FiUser, FiX, FiPackage } from 'react-icons/fi';

interface BookingRequest {
  id: number;
  customerUsername: string;
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
          {/* Customer Info */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <FiUser className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{request.customerUsername}</p>
              <p className="text-sm text-gray-600">Customer</p>
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

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleReject}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Reject
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Accept
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}