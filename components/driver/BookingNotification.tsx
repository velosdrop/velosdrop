//components/driver/BookingNotification.tsx
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
  driverId: number;
}

export default function BookingNotification({ 
  request, 
  onAccept, 
  onReject, 
  onExpire,
  isConnected,
  driverId 
}: BookingNotificationProps) {
  const [timeLeft, setTimeLeft] = useState(request.expiresIn);
  const [isVisible, setIsVisible] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Enhanced validation with detailed logging
  useEffect(() => {
    console.log('🔍 BookingNotification mounted with:', {
      requestId: request.id,
      driverId: driverId,
      request: request
    });

    if (!driverId || driverId <= 0) {
      console.error('❌ Invalid driverId provided to BookingNotification:', driverId);
      setIsVisible(false);
      onReject();
      return;
    }

    // Check if request.id is valid
    if (!request.id || isNaN(Number(request.id)) || Number(request.id) <= 0) {
      console.error('❌ Invalid request.id provided:', request.id);
      setErrorMessage('Invalid booking request. Please try again.');
      setIsVisible(false);
      onReject();
      return;
    }
  }, [driverId, onReject, request, request.id]);

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
    if (isProcessing) return;
    
    setIsProcessing(true);
    setErrorMessage(null);
    
    try {
      // Enhanced validation with type checking
      const requestId = Number(request.id);
      const driverIdNum = Number(driverId);
      const customerId = Number(request.customerId);

      console.log('🔍 Validation before sending:', {
        rawRequestId: request.id,
        parsedRequestId: requestId,
        rawDriverId: driverId,
        parsedDriverId: driverIdNum,
        isNaNRequestId: isNaN(requestId),
        isNaNDriverId: isNaN(driverIdNum)
      });

      // Validate data before sending - more comprehensive checks
      if (isNaN(requestId) || requestId <= 0) {
        const errorMsg = `Invalid Request ID: ${request.id} (parsed as: ${requestId})`;
        console.error('❌ Request ID validation failed:', errorMsg);
        setErrorMessage('Invalid booking request ID. Please try again.');
        setIsProcessing(false);
        return;
      }

      if (isNaN(driverIdNum) || driverIdNum <= 0) {
        const errorMsg = `Invalid Driver ID: ${driverId} (parsed as: ${driverIdNum})`;
        console.error('❌ Driver ID validation failed:', errorMsg);
        setErrorMessage('Invalid driver ID. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Create request data with explicit type checking
      const requestData = {
        requestId: requestId,
        driverId: driverIdNum,
        response: 'accepted' as const,
        customerId: customerId
      };

      // Enhanced debugging logs
      console.log('📤 Sending request data:', requestData);
      console.log('📤 Data types:', {
        requestId: typeof requestData.requestId,
        driverId: typeof requestData.driverId,
        response: typeof requestData.response,
        customerId: typeof requestData.customerId
      });

      const response = await fetch('/api/bookings/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const responseText = await response.text();
      console.log('📥 Raw response:', responseText);
      console.log('📥 Response status:', response.status);

      if (response.ok) {
        console.log('✅ Booking accepted successfully');
        setIsVisible(false);
        onAccept();
        
        // Start sharing location with customer
        startLocationSharing(request.customerId);
      } else {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText };
        }
        console.error('❌ Failed to accept booking:', errorData);
        console.error('❌ Response status:', response.status);
        
        // Set user-friendly error message
        setErrorMessage(errorData.error || 'Failed to accept booking. Please try again.');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('❌ Network error accepting booking:', error);
      setErrorMessage('Network error. Please check your connection and try again.');
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setErrorMessage(null);
    
    try {
      // Same validation as handleAccept
      const requestId = Number(request.id);
      const driverIdNum = Number(driverId);

      if (isNaN(requestId) || requestId <= 0) {
        console.error('❌ Invalid requestId in reject:', request.id);
        setErrorMessage('Invalid booking request.');
        setIsProcessing(false);
        return;
      }

      const requestData = {
        requestId: requestId,
        driverId: driverIdNum,
        response: 'rejected' as const,
        customerId: Number(request.customerId)
      };

      console.log('📤 Sending rejection data:', requestData);

      const response = await fetch('/api/bookings/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const responseText = await response.text();
      console.log('📥 Raw rejection response:', responseText);

      if (response.ok) {
        console.log('✅ Booking rejected successfully');
        setIsVisible(false);
        onReject();
      } else {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText };
        }
        console.error('❌ Failed to reject booking:', errorData);
        setErrorMessage(errorData.error || 'Failed to reject booking. Please try again.');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('❌ Error rejecting booking:', error);
      setErrorMessage('Network error. Please check your connection and try again.');
      setIsProcessing(false);
    }
  };

  // Function to start sharing driver location with customer
  const startLocationSharing = (customerId: number) => {
    if (!navigator.geolocation) {
      console.error('❌ Geolocation is not supported by this browser');
      return;
    }

    console.log('📍 Starting location sharing with customer:', customerId);

    // Start watching position and share updates
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { longitude, latitude } = position.coords;
        
        try {
          // Update driver location in database
          await fetch('/api/drivers/update-location', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              driverId: driverId,
              location: { 
                longitude, 
                latitude,
                accuracy: position.coords.accuracy,
                heading: position.coords.heading,
                speed: position.coords.speed
              },
              timestamp: new Date().toISOString()
            })
          });

          console.log('📍 Location updated:', { longitude, latitude });
          
        } catch (error) {
          console.error('❌ Error updating location:', error);
        }
      },
      (error) => {
        console.error('❌ Error getting location:', {
          code: error.code,
          message: error.message,
          PERMISSION_DENIED: error.PERMISSION_DENIED,
          POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
          TIMEOUT: error.TIMEOUT
        });
      },
      { 
        enableHighAccuracy: true,
        maximumAge: 10000, // 10 seconds
        timeout: 15000 // 15 seconds
      }
    );

    // Store watchId for cleanup
    return () => {
      navigator.geolocation.clearWatch(watchId);
      console.log('🧹 Location sharing stopped');
    };
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleCloseError = () => {
    setErrorMessage(null);
  };

  // Don't render if request.id is invalid
  if (!isVisible || !isConnected || !request.id || isNaN(Number(request.id))) {
    console.log('🚫 Not rendering BookingNotification due to:', {
      isVisible,
      isConnected,
      requestId: request.id,
      isValidRequestId: !request.id || isNaN(Number(request.id))
    });
    return null;
  }

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
          {/* Error Message Display */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg relative">
              <button
                onClick={handleCloseError}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700"
              >
                <FiX className="h-4 w-4" />
              </button>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Debug info - remove in production */}
          <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <p>Debug: Request ID: {request.id} (Type: {typeof request.id})</p>
            <p>Driver ID: {driverId} (Type: {typeof driverId})</p>
          </div>

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
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200 border border-gray-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
              ) : (
                <FiX className="h-4 w-4" />
              )}
              <span>{isProcessing ? 'Processing...' : 'Decline'}</span>
            </button>
            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors duration-200 shadow-lg hover:shadow-green-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              )}
              <span>{isProcessing ? 'Accepting...' : 'Accept Delivery'}</span>
            </button>
          </div>

          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-xl">
              <div className="bg-white p-4 rounded-lg flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                <span className="text-gray-700 font-medium">Processing your response...</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}