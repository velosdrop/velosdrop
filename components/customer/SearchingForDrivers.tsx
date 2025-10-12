//components/customer/SearchingForDrivers.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPubNubClient, CHANNELS, MESSAGE_TYPES } from "@/lib/pubnub-booking";
import CustomerMap from "@/components/customer/CustomerMap";

interface SearchingForDriversProps {
  initialFare: string;
  onFareChange: (newFare: string) => void;
  onCancel: () => void;
  onConfirm: (driver: any) => void;
  packageData: any;
  userLocation: { lat: number; lng: number };
  customerId: number;
  customerUsername: string;
}

interface Driver {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  vehicleType: string;
  carName: string;
  profilePictureUrl: string;
  distance: number;
  rating: number;
  isOnline: boolean;
  lastLocation: any;
  averageRating?: number;
  totalRatings?: number;
  latitude?: number;
  longitude?: number;
}

export default function SearchingForDrivers({
  initialFare,
  onFareChange,
  onCancel,
  onConfirm,
  packageData,
  userLocation,
  customerId,
  customerUsername
}: SearchingForDriversProps) {
  const [fare, setFare] = useState(initialFare);
  const [isVisible, setIsVisible] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingFare, setIsUpdatingFare] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [bookingStatus, setBookingStatus] = useState<'searching' | 'waiting' | 'accepted' | 'failed'>('searching');
  const [currentRequestId, setCurrentRequestId] = useState<number | null>(null);
  const [acceptedDriver, setAcceptedDriver] = useState<Driver | null>(null);
  const [acceptedDrivers, setAcceptedDrivers] = useState<Driver[]>([]);
  
  // Enhanced states for real-time tracking
  const [driverLocation, setDriverLocation] = useState<{ 
    longitude: number; 
    latitude: number; 
    heading?: number; 
    speed?: number 
  } | null>(null);

  const [isTrackingDriver, setIsTrackingDriver] = useState(false);
  
  // PubNub refs
  const pubnubRef = useRef<any>(null);
  const listenerRef = useRef<any>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Enhanced driver location update handler with map integration
// Enhanced driver location update handler with map integration
const handleDriverLocationUpdate = useCallback((data: any) => {
  console.log('📍 Processing driver location update:', data);
  
  if (!data || !data.driverId || !data.location) {
    console.error('❌ Invalid location data:', data);
    return;
  }
  
  // Check if this update is for our accepted driver
  if (data.driverId === acceptedDriver?.id) {
    console.log('✅ Location update for accepted driver:', data.driverId);
    
    // Update driver location state with proper typing that matches CustomerMapProps
    setDriverLocation({
      longitude: data.location.longitude,
      latitude: data.location.latitude,
      heading: data.location.heading,
      speed: data.location.speed
    });
    setIsTrackingDriver(true);
    
    console.log('🗺️ Driver location state updated:', data.location);
  } else {
    console.log('📍 Location update for different driver:', data.driverId);
  }
}, [acceptedDriver?.id]);

  // Enhanced PubNub message handler with duplicate prevention and better logging
  const handlePubNubMessage = useCallback((event: any) => {
    console.log('📍 PubNub message received:', event);
    
    const { channel, message } = event;
    
    // Add message ID tracking to prevent duplicates
    if (!message.messageId) {
      console.warn('⚠️ Message missing ID, may be duplicate');
    }
    
    switch (message.type) {
      case MESSAGE_TYPES.BOOKING_ACCEPTED:
        console.log('✅ Booking accepted message processed');
        handleBookingAccepted(message.data);
        break;
        
      case MESSAGE_TYPES.BOOKING_REJECTED:
        console.log('❌ Booking rejected message processed');
        handleBookingRejected(message.data);
        break;
        
      case MESSAGE_TYPES.DRIVER_LOCATION_UPDATE:
      case 'DRIVER_LOCATION_UPDATE': // Handle both cases explicitly
        console.log('📍 Processing driver location update:', message.data);
        // Ensure this is being called with proper data validation
        if (message.data && message.data.driverId && message.data.location) {
          handleDriverLocationUpdate(message.data);
        } else {
          console.warn('⚠️ Malformed location update:', message.data);
        }
        break;
        
      case 'booking_expired':
      case 'booking_cancelled':
        console.log('📛 Booking failed message:', message.data);
        handleBookingFailed(message.data);
        break;

      case 'CONTINUE_SEARCH':
        console.log('🔄 Continue search message received');
        handleContinueSearch(message.data);
        break;

      default:
        console.log('📨 Unhandled message type:', message.type, message);
    }
  }, [handleDriverLocationUpdate]);

  // Enhanced booking accepted handler
  const handleBookingAccepted = (data: any) => {
    console.log('Booking accepted via PubNub:', data);
    setBookingStatus('accepted');
    
    const driverData: Driver = {
      id: data.driverId,
      firstName: data.driverName?.split(' ')[0] || 'Driver',
      lastName: data.driverName?.split(' ')[1] || '',
      phoneNumber: data.driverPhone || '',
      vehicleType: data.vehicleType || 'car',
      carName: data.carName || 'Vehicle',
      profilePictureUrl: data.profilePictureUrl || '/default-driver.png',
      distance: 0,
      rating: data.rating || data.averageRating || 4.5,
      isOnline: true,
      lastLocation: null,
      totalRatings: data.totalRatings || 0
    };
    
    setAcceptedDriver(driverData);
    setAcceptedDrivers([driverData]);
    setIsTrackingDriver(true);
    
    console.log('🚗 Started tracking driver:', data.driverId);
  };

  // Enhanced booking rejected handler with better auto-retry
  const handleBookingRejected = (data: any) => {
    console.log('Booking rejected via PubNub:', data);
    
    // Show appropriate message based on rejection reason
    if (data.expired) {
      setBookingStatus('failed');
      setError('No drivers accepted your request. Please try again.');
    } else if (data.rejected) {
      // Keep the status as 'searching' to continue looking for drivers
      setBookingStatus('searching');
      setError(data.message || 'Driver declined. Searching for new drivers...');
      
      // Enhanced auto-retry with better logic
      setTimeout(() => {
        setError(null);
        
        // Only fetch new drivers if we don't have any selected driver waiting
        if (!selectedDriver) {
          fetchNearbyDrivers(true).then((newDrivers) => {
            if (newDrivers && newDrivers.length > 0) {
              // Auto-broadcast to new drivers
              createBookingRequest(null);
            }
          });
        }
      }, 2000);
    }
  };

  // New handler for general booking failures
  const handleBookingFailed = (data: any) => {
    setBookingStatus('failed');
    setError(data.message || 'Booking request failed. Please try again.');
    setSelectedDriver(null); // Reset any selected driver
  };

  // New handler for continue search messages
  const handleContinueSearch = (data: any) => {
    console.log('Continue search requested:', data);
    if (bookingStatus === 'waiting') {
      setBookingStatus('searching');
      setError(null);
      fetchNearbyDrivers(true);
    }
  };

  // Enhanced fetchNearbyDrivers function with retry support
  const fetchNearbyDrivers = useCallback(async (isRetry = false) => {
    try {
      if (!userLocation || userLocation.lat === undefined || userLocation.lng === undefined) {
        setError('Location data is not available. Please check your location settings.');
        return;
      }

      console.log(`${isRetry ? '🔄 Retrying' : '🔍 Fetching'} nearby drivers with location:`, userLocation);
      setError(null);

      const response = await fetch(
        `/api/drivers/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=5&excludeResponded=true`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch drivers: ${response.status}`);
      }

      const nearbyDrivers = await response.json();
      console.log('Received nearby drivers:', nearbyDrivers);

      const transformedDrivers = nearbyDrivers.map((driver: any) => ({
        ...driver,
        rating: driver.averageRating || driver.rating || 4.5,
        distance: driver.distance || 0
      }));

      setDrivers(transformedDrivers);
      
      // If this is a retry and we found new drivers, auto-broadcast
      if (isRetry && transformedDrivers.length > 0) {
        console.log('🔄 Auto-broadcasting to new drivers after rejection');
        createBookingRequest(null);
      }
      
      return transformedDrivers;
    } catch (error) {
      console.error('Error fetching nearby drivers:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch nearby drivers');
      return [];
    }
  }, [userLocation]);

  // Enhanced PubNub initialization with proper cleanup
  useEffect(() => {
    if (!customerId) {
      console.log('⏳ Waiting for customer ID');
      return;
    }

    // Create PubNub client for this customer
    const pubnubInstance = createPubNubClient(`customer_${customerId}`);
    pubnubRef.current = pubnubInstance;
    
    // Set up message listener
    const listenerInstance = {
      message: handlePubNubMessage,
      status: (event: any) => {
        console.log('📡 PubNub status:', event.category);
        if (event.category === 'PNConnectedCategory') {
          console.log('✅ PubNub connected successfully');
        } else if (event.category === 'PNDisconnectedCategory') {
          console.log('❌ PubNub disconnected');
        }
      },
      presence: (event: any) => {
        console.log('👥 Presence event:', event);
        // Handle driver online/offline status
      }
    };

    listenerRef.current = listenerInstance;

    // Remove any existing listeners first to prevent duplicates
    pubnubInstance.removeListener(listenerInstance);
    pubnubInstance.addListener(listenerInstance);

    // Enhanced subscription to multiple channels
    const channels = [
      CHANNELS.customer(customerId),
      `customer_${customerId}_location_updates`, // Add dedicated location channel
      `driver_location_${customerId}` // Add specific location channel
    ];
    
    if (currentRequestId) {
      channels.push(`booking_${currentRequestId}`);
      channels.push(`customer_${customerId}_updates`);
      channels.push(`search_${customerId}`);
    }

    pubnubInstance.subscribe({
      channels: channels,
      withPresence: true
    });

    console.log('✅ PubNub initialized for customer:', customerId, 'channels:', channels);

    return () => {
      // Proper cleanup to prevent memory leaks and duplicate handlers
      console.log('🧹 Cleaning up PubNub connection');
      if (pubnubInstance && listenerInstance) {
        pubnubInstance.removeListener(listenerInstance);
        pubnubInstance.unsubscribeAll();
      }
    };
  }, [customerId, currentRequestId, handlePubNubMessage]);

  const createBookingRequest = useCallback(async (selectedDriver: Driver | null = null) => {
    setBookingStatus('waiting');
    try {
      const bookingData = {
        customerId,
        customerUsername,
        pickupAddress: packageData.pickupAddress,
        dropoffAddress: packageData.dropoffAddress,
        fare: parseFloat(fare),
        distance: packageData.routeDistance,
        packageDetails: packageData.packageDescription,
        userLocation: userLocation,
        ...(selectedDriver && { selectedDriverId: selectedDriver.id })
      };

      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        throw new Error('Failed to create booking');
      }

      const result = await response.json();
      setCurrentRequestId(result.request.id);

      // FIXED: Don't automatically set status to 'accepted' when selecting a driver
      // Wait for the driver to actually accept via PubNub
      if (selectedDriver) {
        console.log('📤 Request sent to specific driver:', selectedDriver.firstName);
        // Status remains 'waiting' until driver responds
      }

    } catch (error) {
      console.error('Error creating booking:', error);
      setBookingStatus('failed');
      setError('Failed to create booking request');
    }
  }, [customerId, customerUsername, fare, packageData, userLocation]);

  // Simplified useEffect without SSE
  useEffect(() => {
    setIsVisible(true);

    if (userLocation && userLocation.lat !== undefined && userLocation.lng !== undefined) {
      fetchNearbyDrivers();
    } else {
      setError('Waiting for location data...');
    }

    const progressInterval = setInterval(() => {
      setSearchProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          if (drivers.length > 0 && bookingStatus === 'searching') {
            // Optionally auto-broadcast if no driver is selected after progress completes
            // createBookingRequest();
          }
          return 100;
        }
        return prev + 1;
      });
    }, 50);

    return () => {
      clearInterval(progressInterval);
    };
  }, [fetchNearbyDrivers, userLocation, drivers.length, bookingStatus]);

  // Check request status using polling (fallback)
  useEffect(() => {
    if (!currentRequestId) return;

    const checkRequestStatus = async () => {
      try {
        const response = await fetch(`/api/bookings/status?requestId=${currentRequestId}`);
        const data = await response.json();

        if (data.status === 'accepted' && data.driver) {
          setBookingStatus('accepted');
          setAcceptedDriver(data.driver);
          setIsTrackingDriver(true);
        } else if (data.status === 'expired') {
          setBookingStatus('failed');
          setError('No drivers accepted your request. Please try again.');
        }
      } catch (error) {
        console.error('Error checking request status:', error);
      }
    };

    const interval = setInterval(checkRequestStatus, 2000);

    return () => clearInterval(interval);
  }, [currentRequestId]);

  const handleFareAdjust = (amount: number) => {
    const currentFare = parseFloat(fare);
    const newFare = Math.max(2.00, currentFare + amount).toFixed(2);
    setFare(newFare);
    onFareChange(newFare);
  };

  const handleFareInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setFare(value);
      onFareChange(value);
    }
  };

  const handleUpdateFare = async () => {
    setIsUpdatingFare(true);
    console.log("Fare updated to:", fare);
    await fetchNearbyDrivers();

    setTimeout(() => {
      setIsUpdatingFare(false);
    }, 1000);
  };

  const handleSelectDriver = (driver: Driver) => {
    setSelectedDriver(driver.id);
    // Call createBookingRequest with the selected driver - this sends notification to that driver
    createBookingRequest(driver);
  };

  const handleRetry = () => {
    setError(null);
    setBookingStatus('searching');
    setSearchProgress(0);
    setCurrentRequestId(null);
    setAcceptedDriver(null);
    setAcceptedDrivers([]);
    setSelectedDriver(null); // Reset selected driver on retry
    setDriverLocation(null); // This now matches the type
    setIsTrackingDriver(false);
    fetchNearbyDrivers();
  };

  const calculateEstimatedTime = (distance: number) => {
    if (distance < 1) return "2-5 min";
    if (distance < 3) return "5-10 min";
    if (distance < 5) return "10-15 min";
    return "15-20 min";
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        xmlns="http://www.w3.org/2000/svg"
        className={`h-4 w-4 ${i < Math.floor(rating) ? "text-yellow-400 fill-current" : "text-gray-500"}`}
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  // Filter drivers to show only accepted ones first
  const visibleDrivers = acceptedDrivers.length > 0 ? acceptedDrivers : drivers;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-end justify-center z-50">
      <div
        ref={panelRef}
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
            onClick={onCancel}
            className="p-3 rounded-full bg-gray-800/50 hover:bg-purple-900/40 transition-all duration-300 group"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-purple-400 group-hover:text-white transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              {bookingStatus === 'waiting' ? 'Waiting for Driver' :
               bookingStatus === 'accepted' ? 'Driver Accepted!' : 'Searching for Drivers'}
            </h2>
            <p className="text-purple-300 text-sm mt-1">
              {bookingStatus === 'waiting' ? 'Your request has been sent to the driver.' :
               bookingStatus === 'accepted' ? 'A driver has accepted your request!' : "We're finding the best matches for you"}
            </p>
          </div>

          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">{visibleDrivers.length}</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700/50 rounded-xl backdrop-blur-sm">
            <div className="flex items-center justify-between">
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
              <button
                onClick={handleRetry}
                className="text-red-300 hover:text-red-100 text-sm font-medium px-3 py-1.5 rounded-lg bg-red-800/40 hover:bg-red-800/60 transition-all duration-300"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Waiting for Driver Response */}
        {bookingStatus === 'waiting' && selectedDriver && (
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-2xl p-5 mb-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-blue-300 font-semibold text-lg">Request Sent!</h3>
              <div className="w-6 h-6 bg-blue-500 rounded-full animate-pulse"></div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-800 rounded-full overflow-hidden">
                <img
                  src={drivers.find(d => d.id === selectedDriver)?.profilePictureUrl || '/default-driver.png'}
                  alt="Driver"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239336f3' stroke-width='2'%3E%3Cpath d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'/%3E%3C/svg%3E";
                  }}
                />
              </div>

              <div className="flex-1">
                <h4 className="text-white font-semibold">
                  {drivers.find(d => d.id === selectedDriver)?.firstName} {drivers.find(d => d.id === selectedDriver)?.lastName}
                </h4>
                <p className="text-blue-300 text-sm">Waiting for driver to accept your request...</p>
                <p className="text-gray-400 text-sm">They have 30 seconds to respond</p>
              </div>
            </div>
          </div>
        )}

        {/* Driver Tracking Map Section - Show when driver is accepted */}
        {bookingStatus === 'accepted' && acceptedDriver && (
          <div className="bg-gray-800/30 border border-green-700/50 rounded-2xl p-4 mb-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-green-300 font-semibold text-lg">Driver is on the way! 🚗</h3>
              <div className="flex items-center space-x-2 text-green-400">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm">Live tracking</span>
              </div>
            </div>
            
            <div className="h-64 bg-gray-700/50 rounded-xl mb-4 flex items-center justify-center">
              <CustomerMap
                pickupLocation={{
                  longitude: userLocation.lng,
                  latitude: userLocation.lat,
                  address: packageData.pickupAddress
                }}
                deliveryLocation={{
                  longitude: userLocation.lng, // You might want to use actual delivery coords
                  latitude: userLocation.lat,
                  address: packageData.dropoffAddress
                }}
                driverLocation={driverLocation}
                showRoute={true}
                showCurrentLocation={true}
                style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center p-2 bg-gray-700/30 rounded-lg">
                <p className="text-gray-400">Driver</p>
                <p className="text-white font-semibold">{acceptedDriver.firstName} {acceptedDriver.lastName}</p>
              </div>
              <div className="text-center p-2 bg-gray-700/30 rounded-lg">
                <p className="text-gray-400">Vehicle</p>
                <p className="text-white font-semibold">{acceptedDriver.carName}</p>
              </div>
            </div>
            {isTrackingDriver && driverLocation && (
                     <div className="mt-3 p-2 bg-green-900/20 rounded-lg text-center">
                                     <p className="text-green-400 text-sm">📍 Driver location tracking active</p>
                                     <p className="text-green-300 text-xs">Real-time updates enabled</p>
            {driverLocation.heading && (
                                    <p className="text-green-300 text-xs">Heading: {driverLocation.heading}°</p>
             )}
           {driverLocation.speed && (
                                    <p className="text-green-300 text-xs">Speed: {(driverLocation.speed * 3.6).toFixed(1)} km/h</p>
             )}
          </div>
)}
     <button
              onClick={() => onConfirm(acceptedDriver)}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Confirm Booking
            </button>
          </div>
        )}

        {/* Progress Bar */}
        {bookingStatus !== 'accepted' && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-purple-300 text-sm font-medium">Matching you with perfect drivers</span>
              <span className="text-purple-400 text-sm font-bold">{searchProgress}%</span>
            </div>
            <div className="w-full bg-gray-800/50 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${searchProgress}%` }}
              >
                <div className="w-full h-full bg-gradient-to-r from-white/10 via-white/20 to-white/10 animate-pulse"></div>
              </div>
            </div>
          </div>
        )}

        {/* Animated Driver Icons */}
        {bookingStatus !== 'accepted' && (
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-purple-900/20 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-20 h-20 bg-purple-800/30 rounded-full flex items-center justify-center">
                  <div className="w-12 h-12 bg-purple-700/40 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center px-6">
              {[1, 2, 3, 4, 5].map((driver) => (
                <div
                  key={driver}
                  className={`w-14 h-14 bg-gradient-to-br from-purple-900 to-black rounded-full border-3 flex items-center justify-center transition-all duration-700 transform ${
                    driver <= visibleDrivers.length
                      ? "border-purple-500 scale-110 shadow-2xl shadow-purple-500/40 rotate-0"
                      : "border-gray-700 opacity-30 scale-90 -rotate-12"
                  }`}
                  style={{
                    transitionDelay: `${driver * 150}ms`,
                    animation: driver <= visibleDrivers.length ? "bounce 2s infinite" : "none"
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-7 w-7 ${
                      driver <= visibleDrivers.length ? "text-purple-400" : "text-gray-600"
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fare Offer Section */}
        {bookingStatus !== 'accepted' && (
          <div className="bg-gray-800/30 border border-purple-900/40 rounded-2xl p-5 mb-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-purple-300 font-semibold text-lg">Your Fare Offer</h3>
              <div className="p-2 bg-purple-600/20 rounded-lg">
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

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handleFareAdjust(-0.5)}
                  disabled={parseFloat(fare) <= 2.00}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-900 to-black border-2 border-purple-700/40 flex items-center justify-center text-white hover:bg-purple-800/60 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>

                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400 font-bold text-lg">$</div>
                  <input
                    type="text"
                    value={fare}
                    onChange={handleFareInput}
                    className="pl-10 pr-5 py-3 w-28 bg-gray-700/50 border-2 border-purple-700/40 rounded-xl text-white text-center text-lg font-bold focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all duration-300"
                  />
                </div>

                <button
                  onClick={() => handleFareAdjust(0.5)}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-900 to-black border-2 border-purple-700/40 flex items-center justify-center text-white hover:bg-purple-800/60 transition-all duration-300"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>

              <button
                onClick={handleUpdateFare}
                disabled={isUpdatingFare}
                className="bg-gradient-to-r from-purple-700 to-blue-600 hover:from-purple-600 hover:to-blue-500 border border-purple-600/40 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isUpdatingFare ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Update Fare</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Trip Info Cards */}
        {bookingStatus !== 'accepted' && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-800/30 border border-purple-900/40 rounded-2xl p-4 backdrop-blur-sm">
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

            <div className="bg-gray-800/30 border border-purple-900/40 rounded-2xl p-4 backdrop-blur-sm">
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
                    {visibleDrivers.length > 0 ? calculateEstimatedTime(visibleDrivers[0].distance) : "15-20 min"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Available Drivers Section - Only show when not waiting for response */}
        {visibleDrivers.length > 0 && bookingStatus === 'searching' && (
          <div className="bg-gray-800/30 border border-purple-900/40 rounded-2xl p-5 mb-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-purple-300 font-semibold text-lg">Available Drivers</h3>
              <span className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-bold px-3 py-1 rounded-full">
                {visibleDrivers.length} nearby
              </span>
            </div>

            <div className="space-y-4">
              {visibleDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className={`flex items-center justify-between p-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-xl border-2 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] ${
                    selectedDriver === driver.id
                      ? "border-purple-500 bg-purple-900/20"
                      : "border-purple-900/30 hover:border-purple-700/50"
                  }`}
                  onClick={() => handleSelectDriver(driver)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-900 to-black rounded-full flex items-center justify-center overflow-hidden border-2 border-purple-600/40">
                        {driver.profilePictureUrl ? (
                          <img
                            src={driver.profilePictureUrl}
                            alt={driver.firstName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239336f3' stroke-width='2'%3E%3Cpath d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'/%3E%3C/svg%3E";
                            }}
                          />
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-purple-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-gray-900"></div>
                    </div>
                    <div>
                      <p className="text-white font-semibold">
                        {driver.firstName} {driver.lastName}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center space-x-1">
                          {renderStars(driver.rating)}
                        </div>
                        <span className="text-xs text-gray-400">({driver.totalRatings || 12})</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                          {driver.carName}
                        </span>
                        <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                          {driver.vehicleType}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1">{driver.distance?.toFixed(1)} km away</p>
                    <p className="text-green-400 font-bold text-sm">{calculateEstimatedTime(driver.distance)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Drivers Found State */}
        {visibleDrivers.length === 0 && searchProgress >= 100 && !error && bookingStatus !== 'accepted' && (
          <div className="bg-gray-800/30 border border-purple-900/40 rounded-2xl p-8 mb-6 text-center backdrop-blur-sm">
            <div className="text-purple-400 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 11a3 3 0 11-6 3 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="text-purple-300 font-semibold text-lg mb-2">No Drivers Available</h3>
            <p className="text-gray-400 text-sm mb-4">
              There are no drivers in your area at the moment. Try increasing your fare offer or try again in a few minutes.
            </p>
            <button
              onClick={handleRetry}
              className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white font-medium px-4 py-2 rounded-xl transition-all duration-300"
            >
              Search Again
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-4 px-6 rounded-xl transition-all duration-300 border border-gray-700 hover:border-gray-600 flex items-center justify-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Cancel Search</span>
          </button>

          {visibleDrivers.length > 0 && bookingStatus === 'searching' && (
            <button
              onClick={() => createBookingRequest(null)} // Broadcast to all
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 px-6 rounded-xl shadow-2xl shadow-purple-900/40 hover:shadow-purple-900/60 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
              </svg>
              <span>Broadcast to All Drivers</span>
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-8px) rotate(5deg); }
        }
        .backdrop-blur-sm {
          backdrop-filter: blur(8px);
        }
      `}</style>
    </div>
  );
}