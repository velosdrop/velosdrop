//components/driver/BookingNotification.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiMapPin, FiDollarSign, FiUser, FiX, FiPackage, FiPhone, FiCopy, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { createPubNubClient, publishDriverLocationUpdateWithOrder } from '@/lib/pubnub-booking';

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
  pickupCoords?: { longitude: number; latitude: number };
  dropoffCoords?: { longitude: number; latitude: number };
  recipientPhoneNumber?: string; 
}

interface BookingNotificationProps {
  request: BookingRequest;
  onAccept: (deliveryData: {
    id: number;
    deliveryId: number;
    customerId: number;
    customerUsername: string;
    pickupLocation: { longitude: number; latitude: number };
    deliveryLocation: { longitude: number; latitude: number };
    pickupAddress: string;
    deliveryAddress: string;
    fare: number;
    customerPhoneNumber?: string;
  }) => void;
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
  const [pubnub, setPubnub] = useState<any>(null);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const pubnubRef = useRef<any>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Initialize PubNub
  useEffect(() => {
    if (driverId) {
      const pubnubClient = createPubNubClient(`driver_${driverId}`);
      setPubnub(pubnubClient);
      pubnubRef.current = pubnubClient;
    }
  }, [driverId]);

  // Enhanced validation with detailed logging
  useEffect(() => {
    console.log('🔍 BookingNotification mounted with:', {
      requestId: request.id,
      driverId: driverId,
      request: request,
      recipientPhoneNumber: request.recipientPhoneNumber
    });

    if (!driverId || driverId <= 0) {
      console.error('❌ Invalid driverId provided to BookingNotification:', driverId);
      setIsVisible(false);
      onReject();
      return;
    }

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

  // Auto-collapse after 5 seconds on mobile
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile && isExpanded) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartY) return;
    
    const touchY = e.touches[0].clientY;
    const diff = touchStartY - touchY;
    
    // Swipe up to expand
    if (diff > 50 && !isExpanded) {
      setIsExpanded(true);
      setTouchStartY(null);
    }
    // Swipe down to collapse
    else if (diff < -50 && isExpanded) {
      setIsExpanded(false);
      setTouchStartY(null);
    }
  };

  const handleTouchEnd = () => {
    setTouchStartY(null);
  };

  // Cleanup location tracking on unmount
  useEffect(() => {
    return () => {
      if (locationWatchId) {
        navigator.geolocation.clearWatch(locationWatchId);
        console.log('🧹 Location tracking cleaned up');
      }
    };
  }, [locationWatchId]);

  // Copy phone number to clipboard
  const copyToClipboard = async (phoneNumber: string) => {
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setCopiedNumber(phoneNumber);
      setTimeout(() => setCopiedNumber(null), 2000);
    } catch (err) {
      console.error('Failed to copy phone number:', err);
    }
  };

  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    return phone;
  };

  // Extract phone numbers from package description and make them clickable
  const renderPackageDescriptionWithClickablePhones = (description: string) => {
    if (!description) return description;
    
    const phoneRegex = /(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/g;
    
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = phoneRegex.exec(description)) !== null) {
      if (match.index > lastIndex) {
        parts.push(description.slice(lastIndex, match.index));
      }

      const phoneNumber = match[0];
      
      parts.push(
        <a
          key={match.index}
          href={`tel:${phoneNumber.replace(/\D/g, '')}`}
          className="inline-flex items-center space-x-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded-md mx-1 transition-colors duration-200 border border-blue-200"
          onClick={(e) => e.stopPropagation()}
        >
          <FiPhone className="h-3 w-3 flex-shrink-0" />
          <span className="font-medium">{phoneNumber}</span>
          <span className="text-xs bg-blue-200 text-blue-700 px-1 rounded">Call</span>
        </a>
      );

      lastIndex = match.index + phoneNumber.length;
    }

    if (lastIndex < description.length) {
      parts.push(description.slice(lastIndex));
    }

    return parts.length > 0 ? parts : description;
  };

  // ENHANCED: Real-time tracking function with order context
  const startRealTimeTracking = async (customerId: number, pickupLocation: string, dropoffLocation: string, orderId: number) => {
    if (!navigator.geolocation) {
      console.error('❌ Geolocation is not supported by this browser');
      return;
    }

    console.log('📍 Starting real-time tracking for customer:', customerId, 'order:', orderId);
    
    const currentPubNub = pubnubRef.current;
    if (!currentPubNub) {
      console.error('❌ PubNub client not initialized');
      return;
    }

    // Geocode addresses to coordinates
    const geocodeAddress = async (address: string): Promise<{ longitude: number; latitude: number } | null> => {
      try {
        const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}`
        );
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          return {
            longitude: data.features[0].center[0],
            latitude: data.features[0].center[1]
          };
        }
        return null;
      } catch (error) {
        console.error('Error geocoding address:', error);
        return null;
      }
    };

    const pickupCoords = await geocodeAddress(pickupLocation);
    const dropoffCoords = await geocodeAddress(dropoffLocation);

    // Helper function to calculate route
    const calculateRoute = async (start: { longitude: number; latitude: number }, end: { longitude: number; latitude: number }) => {
      try {
        const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
        );
        const data = await response.json();
        return data.routes?.[0] || null;
      } catch (error) {
        console.error('Error calculating route:', error);
        return null;
      }
    };

    // Start watching position and share updates
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { longitude, latitude, heading, speed } = position.coords;
        const driverLocation = { longitude, latitude };
        
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
                heading: heading || null,
                speed: speed || null
              },
              timestamp: new Date().toISOString()
            })
          });

          console.log('📍 Location updated in database for order:', orderId);
          
          // Calculate route and ETA to pickup
          let routeData = null;
          let eta = null;
          
          if (pickupCoords) {
            routeData = await calculateRoute(driverLocation, pickupCoords);
            if (routeData) {
              eta = Math.round(routeData.duration / 60);
            }
          }
          
          // PUBLISH LOCATION WITH ORDER CONTEXT
          try {
            await currentPubNub.publish({
              channel: `customer_${customerId}`,
              message: {
                type: 'DRIVER_LOCATION_UPDATE',
                data: {
                  driverId: driverId,
                  orderId: orderId, // Add orderId here
                  location: { 
                    longitude, 
                    latitude,
                    heading: heading || null,
                    speed: speed || null
                  },
                  route: routeData,
                  eta: eta,
                  timestamp: new Date().toISOString(),
                  messageId: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                }
              }
            });
            
            // FIXED: Convert null to undefined for the publish function
            await publishDriverLocationUpdateWithOrder(
              driverId, 
              { 
                latitude, 
                longitude, 
                heading: heading ?? undefined,  // Convert null to undefined
                speed: speed ?? undefined       // Convert null to undefined
              }, 
              orderId
            );
            
            console.log('📡 Location published with order context:', { 
              orderId,
              longitude, 
              latitude, 
              eta
            });
          } catch (pubnubError) {
            console.error('❌ PubNub publish error:', pubnubError);
          }
          
        } catch (error) {
          console.error('❌ Error updating/publishing location:', error);
        }
      },
      (error) => {
        console.error('❌ Error getting location:', error);
      },
      { 
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );

    setLocationWatchId(watchId);
    console.log('📍 Real-time tracking started for order:', orderId);

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        console.log('🧹 Real-time tracking stopped');
      }
    };
  };

  // UPDATED: handleAccept with comprehensive delivery data
  const handleAccept = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setErrorMessage(null);
    
    try {
      const requestId = Number(request.id);
      const driverIdNum = Number(driverId);
      const customerId = Number(request.customerId);

      console.log('🔍 Validation before sending:', {
        rawRequestId: request.id,
        parsedRequestId: requestId,
        rawDriverId: driverId,
        parsedDriverId: driverIdNum,
        isNaNRequestId: isNaN(requestId),
        isNaNDriverId: isNaN(driverIdNum),
        recipientPhoneNumber: request.recipientPhoneNumber
      });

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

      const requestData = {
        requestId: requestId,
        driverId: driverIdNum,
        response: 'accepted' as const,
        customerId: customerId
      };

      console.log('📤 Sending request data:', requestData);

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
        
        // Geocode addresses to coordinates
        const geocodeAddress = async (address: string): Promise<{ longitude: number; latitude: number }> => {
          try {
            const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}`
            );
            const data = await response.json();
            if (data.features && data.features.length > 0) {
              return {
                longitude: data.features[0].center[0],
                latitude: data.features[0].center[1]
              };
            }
            throw new Error('No coordinates found');
          } catch (error) {
            console.error('Error geocoding address:', error);
            // Fallback coordinates
            return { longitude: 31.033, latitude: -17.827 };
          }
        };

        // Get coordinates for map
        const pickupCoords = await geocodeAddress(request.pickupLocation);
        const deliveryCoords = await geocodeAddress(request.dropoffLocation);
        
        // Prepare comprehensive delivery data for parent component
        const deliveryData = {
          id: requestId,
          deliveryId: requestId,
          customerId: request.customerId,
          customerUsername: request.customerUsername,
          pickupLocation: pickupCoords,
          deliveryLocation: deliveryCoords,
          pickupAddress: request.pickupLocation,
          deliveryAddress: request.dropoffLocation,
          fare: request.fare,
          customerPhoneNumber: request.customerPhoneNumber
        };

        // Call parent onAccept with full delivery data
        onAccept(deliveryData);
        
        // Hide notification
        setIsVisible(false);
        
        // Start real-time tracking
        startRealTimeTracking(request.customerId, request.pickupLocation, request.dropoffLocation, requestId);
      } else {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText };
        }
        console.error('❌ Failed to accept booking:', errorData);
        console.error('❌ Response status:', response.status);
        
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
        initial={{ opacity: 0, y: 300 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 300 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed z-50 w-full md:max-w-sm lg:max-w-md bg-white rounded-t-2xl md:rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
        style={{
          bottom: '0',
          left: '0',
          right: '0',
          maxHeight: isExpanded ? '85vh' : '45vh',
          transition: 'max-height 0.3s ease-in-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe Indicator for Mobile */}
        <div className="md:hidden flex justify-center py-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
        </div>

        {/* Header with countdown */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="font-bold text-lg">New Delivery Request</h3>
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="md:hidden p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                {isExpanded ? <FiChevronDown className="h-5 w-5" /> : <FiChevronUp className="h-5 w-5" />}
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <FiClock className="h-4 w-4" />
              <span className="font-mono font-bold text-white bg-black/20 px-2 py-1 rounded">{timeLeft}s</span>
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

        {/* Content with scrollable area */}
        <div 
          ref={contentRef}
          className={`p-4 overflow-y-auto transition-all duration-300 ${
            isExpanded ? 'max-h-[calc(85vh-80px)]' : 'max-h-[calc(45vh-80px)]'
          }`}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#CBD5E0 #F3F4F6'
          }}
        >
          {/* Error Message Display */}
          {errorMessage && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg relative">
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

          {/* Enhanced Customer Info Section */}
          <div className="flex items-center space-x-3 mb-3 p-3 bg-gray-50 rounded-lg">
            <div className="relative">
              {request.customerProfilePictureUrl && !imageError ? (
                <img
                  src={request.customerProfilePictureUrl}
                  alt={request.customerUsername}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-purple-200"
                  onError={handleImageError}
                />
              ) : (
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {request.customerUsername.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-2">
                <p className="font-semibold text-gray-900 truncate text-sm md:text-base">{request.customerUsername}</p>
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium self-start md:self-center">
                  Verified
                </span>
              </div>
              
              {request.customerPhoneNumber && (
                <div className="flex items-center space-x-1 mt-1">
                  <FiPhone className="h-3 w-3 text-gray-500 flex-shrink-0" />
                  <a 
                    href={`tel:${request.customerPhoneNumber}`}
                    className="text-xs md:text-sm text-blue-600 hover:text-blue-800 transition-colors truncate font-medium flex items-center space-x-1"
                  >
                    <span>{formatPhoneNumber(request.customerPhoneNumber)}</span>
                    <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded">Call</span>
                  </a>
                  <button
                    onClick={() => copyToClipboard(request.customerPhoneNumber!)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                    title="Copy phone number"
                  >
                    <FiCopy className={`h-3 w-3 ${copiedNumber === request.customerPhoneNumber ? 'text-green-500' : 'text-gray-400'}`} />
                  </button>
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-1">Ready for pickup</p>
            </div>
          </div>

          {/* Trip Details - Show only basic info when collapsed */}
          <div className="space-y-2">
            {/* Fare and Distance - Always visible */}
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <FiDollarSign className="h-4 w-4 md:h-5 md:w-5 text-yellow-600" />
                  </div>
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-900">Delivery Fare</p>
                  <p className="text-base md:text-lg font-bold text-gray-900">${request.fare.toFixed(2)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs md:text-sm text-gray-600">{request.distance} km</p>
                <p className="text-xs text-gray-500">{Math.round(request.distance / 0.621371)} mi</p>
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-2"
              >
                {/* Package Details with Clickable Phone Numbers */}
                {request.packageDetails && (
                  <div className="flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <FiPackage className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs md:text-sm font-medium text-gray-900 mb-1">Package Details</p>
                      <div className="text-xs md:text-sm text-gray-600 whitespace-pre-wrap">
                        {renderPackageDescriptionWithClickablePhones(request.packageDetails)}
                      </div>
                      <p className="text-xs text-blue-600 mt-1 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Phone numbers are clickable for quick calling
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Recipient Phone Number - Enhanced with click-to-call */}
                {request.recipientPhoneNumber && (
                  <div className="flex items-start space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <FiPhone className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-medium text-gray-900 mb-1">Recipient's Phone</p>
                      <div className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-2">
                        <a 
                          href={`tel:${request.recipientPhoneNumber}`}
                          className="text-sm md:text-base font-semibold text-orange-600 hover:text-orange-700 transition-colors truncate flex items-center space-x-1"
                        >
                          <span>{formatPhoneNumber(request.recipientPhoneNumber)}</span>
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium whitespace-nowrap">
                            Tap to Call
                          </span>
                        </a>
                        <button
                          onClick={() => copyToClipboard(request.recipientPhoneNumber!)}
                          className="p-1 hover:bg-orange-100 rounded transition-colors flex-shrink-0 self-start md:self-center"
                          title="Copy phone number"
                        >
                          <FiCopy className={`h-3 w-3 md:h-4 md:w-4 ${copiedNumber === request.recipientPhoneNumber ? 'text-green-500' : 'text-orange-400'}`} />
                        </button>
                      </div>
                      <p className="text-xs text-orange-600 mt-1 font-medium">Package recipient - Call before delivery</p>
                      {copiedNumber === request.recipientPhoneNumber && (
                        <p className="text-xs text-green-600 mt-1 animate-pulse">✓ Copied to clipboard!</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Pickup Location */}
                <div className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <FiMapPin className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs md:text-sm font-medium text-gray-900 mb-1">Pickup Location</p>
                    <p className="text-xs md:text-sm text-gray-600">{request.pickupLocation}</p>
                  </div>
                </div>

                {/* Dropoff Location */}
                <div className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <FiMapPin className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs md:text-sm font-medium text-gray-900 mb-1">Dropoff Location</p>
                    <p className="text-xs md:text-sm text-gray-600">{request.dropoffLocation}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Enhanced Action Buttons - Always visible */}
          <div className="flex space-x-2 md:space-x-3 pt-3 md:pt-4 border-t border-gray-200 mt-3">
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="flex-1 px-3 md:px-4 py-3 md:py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 border border-gray-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-b-2 border-gray-700"></div>
              ) : (
                <FiX className="h-4 w-4 md:h-5 md:w-5" />
              )}
              <span className="text-sm md:text-base">{isProcessing ? 'Processing...' : 'Decline'}</span>
            </button>
            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className="flex-1 px-3 md:px-4 py-3 md:py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-green-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-b-2 border-white"></div>
              ) : (
                <div className="w-2 h-2 md:w-3 md:h-3 bg-white rounded-full animate-pulse"></div>
              )}
              <span className="text-sm md:text-base">{isProcessing ? 'Accepting...' : 'Accept'}</span>
            </button>
          </div>

          {/* Quick Info Bar for collapsed state */}
          {!isExpanded && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
              <div className="flex items-center space-x-1 text-xs text-gray-600">
                <FiMapPin className="h-3 w-3 text-green-500" />
                <span className="truncate max-w-[100px]">{request.pickupLocation.split(',')[0]}</span>
              </div>
              <div className="text-xs text-gray-500">→</div>
              <div className="flex items-center space-x-1 text-xs text-gray-600">
                <FiMapPin className="h-3 w-3 text-red-500" />
                <span className="truncate max-w-[100px]">{request.dropoffLocation.split(',')[0]}</span>
              </div>
            </div>
          )}

          {/* Copy Success Toast */}
          {copiedNumber && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="fixed bottom-16 md:bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-3 py-2 rounded-lg shadow-lg z-50 text-sm"
            >
              <div className="flex items-center space-x-1">
                <svg className="h-3 w-3 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">Phone number copied!</span>
              </div>
            </motion.div>
          )}

          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-xl backdrop-blur-sm">
              <div className="bg-white p-4 md:p-6 rounded-xl flex items-center space-x-2 md:space-x-3 shadow-2xl">
                <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-green-600"></div>
                <span className="text-sm md:text-base text-gray-700 font-semibold">Processing your response...</span>
              </div>
            </div>
          )}
        </div>

        {/* Mobile-only expand/collapse hint */}
        <div className="md:hidden text-center py-1 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            {isExpanded ? 'Swipe down to collapse' : 'Swipe up for more details'}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}