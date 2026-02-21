// components/customer/food/SearchingForFoodDrivers.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  FiClock, FiMapPin, FiDollarSign, FiUser, FiX, 
  FiPhone, FiTruck, FiShoppingBag, FiStar,
  FiNavigation, FiChevronUp, FiChevronDown, FiAlertCircle
} from 'react-icons/fi';
import { createPubNubClient, CHANNELS, MESSAGE_TYPES } from '@/lib/pubnub-booking';
import CustomerMap from '@/components/customer/CustomerMap';
import Image from 'next/image';

interface FoodDriver {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  vehicleType: string;
  carName: string;
  numberPlate: string;
  profilePictureUrl: string | null;
  distance: number;
  rating: number;
  isOnline: boolean;
  estimatedArrival?: number;
  completedDeliveries?: number;
}

interface SearchingForFoodDriversProps {
  orderId: number;
  restaurantId: number;
  restaurantName: string;
  restaurantAddress: string;
  restaurantCoords: { latitude: number; longitude: number };
  deliveryAddress: string;
  deliveryCoords: { latitude: number; longitude: number };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    notes?: string;
  }>;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  onCancel: () => void;
  onDriverAssigned: (driver: FoodDriver) => void;
  onFareUpdate?: (newFare: number) => void;
}

export default function SearchingForFoodDrivers({
  orderId,
  restaurantId,
  restaurantName,
  restaurantAddress,
  restaurantCoords,
  deliveryAddress,
  deliveryCoords,
  items,
  subtotal,
  deliveryFee,
  totalAmount,
  customerId,
  customerName,
  customerPhone,
  onCancel,
  onDriverAssigned,
  onFareUpdate
}: SearchingForFoodDriversProps) {
  const [searchProgress, setSearchProgress] = useState(0);
  const [availableDrivers, setAvailableDrivers] = useState<FoodDriver[]>([]);
  const [searchStatus, setSearchStatus] = useState<'searching' | 'waiting' | 'assigned' | 'failed'>('searching');
  const [error, setError] = useState<string | null>(null);
  const [driverEta, setDriverEta] = useState<number | null>(null);
  const [assignedDriver, setAssignedDriver] = useState<FoodDriver | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [driverLocation, setDriverLocation] = useState<{
    longitude: number;
    latitude: number;
    heading?: number;
    speed?: number;
  } | null>(null);
  const [isTrackingDriver, setIsTrackingDriver] = useState(false);
  const [searchRadius, setSearchRadius] = useState(5);
  const [retryCount, setRetryCount] = useState(0);
  
  const pubnubRef = useRef<any>(null);
  const searchIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (customerId) {
      const pubnubClient = createPubNubClient(`customer_${customerId}`);
      pubnubRef.current = pubnubClient;

      pubnubClient.subscribe({
        channels: [
          CHANNELS.customer(customerId),
          CHANNELS.booking(orderId),
        ],
        withPresence: true
      });

      const listener = {
        message: (event: any) => {
          const message = event.message;
          const type = message.type;
          const data = message.data;
          
          switch (type) {
            case MESSAGE_TYPES.BOOKING_ACCEPTED:
              handleDriverAccepted(data);
              break;
            case MESSAGE_TYPES.BOOKING_REJECTED:
              handleDriverRejected(data);
              break;
            case MESSAGE_TYPES.DRIVER_LOCATION_UPDATE:
              handleDriverLocationUpdate(data);
              break;
            case MESSAGE_TYPES.BOOKING_STATUS_UPDATE:
              handleBookingStatusUpdate(data);
              break;
          }
        }
      };

      pubnubClient.addListener(listener);

      return () => {
        pubnubClient.removeListener(listener);
        pubnubClient.unsubscribeAll();
        if (searchIntervalRef.current) {
          clearInterval(searchIntervalRef.current);
        }
      };
    }
  }, [customerId, orderId]);

  useEffect(() => {
    searchForDrivers();

    const progressInterval = setInterval(() => {
      setSearchProgress(prev => {
        if (prev >= 100) {
          if (availableDrivers.length === 0 && searchStatus === 'searching') {
            setSearchStatus('failed');
            setError('No drivers available in your area. Try increasing the search radius.');
          }
          return 100;
        }
        return prev + 1;
      });
    }, 300);

    searchIntervalRef.current = setInterval(() => {
      if (searchStatus === 'searching') {
        searchForDrivers(true);
      }
    }, 10000);

    return () => {
      clearInterval(progressInterval);
      if (searchIntervalRef.current) {
        clearInterval(searchIntervalRef.current);
      }
    };
  }, [searchRadius, retryCount]);

  const searchForDrivers = async (isRefresh = false) => {
    try {
      const response = await fetch(
        `/api/drivers/nearby?lat=${restaurantCoords.latitude}&lng=${restaurantCoords.longitude}&radius=${searchRadius}`
      );
      
      if (response.ok) {
        const drivers = await response.json();
        
        const driversWithETA = drivers.map((driver: any) => ({
          id: driver.id,
          firstName: driver.firstName || driver.first_name,
          lastName: driver.lastName || driver.last_name,
          phoneNumber: driver.phoneNumber || driver.phone_number,
          vehicleType: driver.vehicleType || driver.vehicle_type,
          carName: driver.carName || driver.car_name,
          numberPlate: driver.numberPlate || driver.number_plate,
          profilePictureUrl: driver.profilePictureUrl || driver.profile_picture_url,
          distance: driver.distance_km || driver.distance,
          rating: driver.averageRating || driver.rating || 4.5,
          isOnline: driver.isOnline,
          completedDeliveries: driver.total_deliveries || 0,
          estimatedArrival: calculateETA(driver.distance_km || driver.distance)
        }));
        
        setAvailableDrivers(driversWithETA);
        
        if (driversWithETA.length > 0 && !isRefresh) {
          createBookingRequest();
        }
      }
    } catch (error) {
      console.error('Error searching for drivers:', error);
    }
  };

  const calculateETA = (distance: number): number => {
    return Math.round((distance / 30) * 60);
  };

  const createBookingRequest = async () => {
    try {
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          customerUsername: customerName,
          pickupAddress: restaurantAddress,
          pickupLatitude: restaurantCoords.latitude,
          pickupLongitude: restaurantCoords.longitude,
          dropoffAddress: deliveryAddress,
          dropoffLatitude: deliveryCoords.latitude,
          dropoffLongitude: deliveryCoords.longitude,
          fare: totalAmount,
          distance: 5,
          vehicleType: 'car',
          packageDetails: `Food delivery from ${restaurantName}`,
          recipientPhone: customerPhone,
          expiresIn: 30
        }),
      });

      if (response.ok) {
        setSearchStatus('waiting');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
    }
  };

  const handleDriverAccepted = (data: any) => {
    if (!data) return;
    
    const driver: FoodDriver = {
      id: data.driverId,
      firstName: data.driverName?.split(' ')[0] || 'Driver',
      lastName: data.driverName?.split(' ')[1] || '',
      phoneNumber: data.driverPhone || '',
      vehicleType: data.vehicleType || 'car',
      carName: data.carName || 'Vehicle',
      numberPlate: data.numberPlate || '',
      profilePictureUrl: data.profilePictureUrl || null,
      distance: 0,
      rating: 4.5,
      isOnline: true,
      estimatedArrival: 15,
      completedDeliveries: 0
    };

    setAssignedDriver(driver);
    setSearchStatus('assigned');
    setDriverEta(15);
    onDriverAssigned(driver);
    setIsTrackingDriver(true);
  };

  const handleDriverRejected = (data: any) => {
    if (data?.driverId) {
      setAvailableDrivers(prev => prev.filter(d => d.id !== data.driverId));
    }
    
    if (availableDrivers.length <= 1) {
      setSearchStatus('searching');
      setRetryCount(prev => prev + 1);
    }
  };

  const handleDriverLocationUpdate = (data: any) => {
    if (!data) return;
    
    if (data.orderId === orderId || data.bookingId === orderId) {
      setDriverLocation({
        longitude: data.location?.longitude || data.longitude,
        latitude: data.location?.latitude || data.latitude,
        heading: data.heading,
        speed: data.speed
      });
      
      if (data.eta) {
        setDriverEta(data.eta);
      }
    }
  };

  const handleBookingStatusUpdate = (data: any) => {
    if (data?.orderId === orderId && data?.status === 'accepted' && data?.driverId) {
      fetchDriverDetails(data.driverId);
    }
  };

  const fetchDriverDetails = async (driverId: number) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}`);
      if (response.ok) {
        const driver = await response.json();
        // Handle driver data
      }
    } catch (error) {
      console.error('Error fetching driver details:', error);
    }
  };

  const handleIncreaseRadius = () => {
    setSearchRadius(prev => prev + 2);
    setRetryCount(prev => prev + 1);
    setError(null);
  };

  const handleTipIncrease = (amount: number) => {
    const newTotal = totalAmount + amount;
    if (onFareUpdate) {
      onFareUpdate(newTotal);
    }
    createBookingRequest();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartY) return;
    
    const touchY = e.touches[0].clientY;
    const diff = touchStartY - touchY;
    
    if (diff > 50 && !isExpanded) {
      setIsExpanded(true);
      setTouchStartY(null);
    } else if (diff < -50 && isExpanded) {
      setIsExpanded(false);
      setTouchStartY(null);
    }
  };

  const handleTouchEnd = () => {
    setTouchStartY(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getDriverInitials = (driver: FoodDriver) => {
    return `${driver.firstName.charAt(0)}${driver.lastName.charAt(0)}`;
  };

  if (searchStatus === 'assigned' && assignedDriver) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          className="w-full max-w-2xl bg-white rounded-t-3xl overflow-hidden"
        >
          {/* Header with brand purple/pink gradient */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <FiTruck className="h-6 w-6" />
                <h2 className="text-xl font-bold">Driver Assigned!</h2>
              </div>
              <button onClick={onCancel} className="p-2 hover:bg-white/20 rounded-full">
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <p className="text-purple-100">Your driver is on the way to the restaurant</p>
          </div>

          <div className="h-48 bg-gray-100 relative">
            <CustomerMap
              pickupLocation={{
                longitude: restaurantCoords.longitude,
                latitude: restaurantCoords.latitude,
                address: restaurantAddress
              }}
              deliveryLocation={{
                longitude: deliveryCoords.longitude,
                latitude: deliveryCoords.latitude,
                address: deliveryAddress
              }}
              driverLocation={driverLocation || undefined}
              showRoute={true}
              compact={true}
              style={{ height: '100%', width: '100%' }}
            />
          </div>

          <div className="p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative">
                {assignedDriver.profilePictureUrl ? (
                  <Image
                    src={assignedDriver.profilePictureUrl}
                    alt={assignedDriver.firstName}
                    width={64}
                    height={64}
                    className="rounded-full border-2 border-purple-500"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {getDriverInitials(assignedDriver)}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-500 rounded-full border-2 border-white"></div>
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">
                  {assignedDriver.firstName} {assignedDriver.lastName}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <FiStar className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm text-gray-700">{assignedDriver.rating.toFixed(1)}</span>
                  <span className="text-sm text-gray-400">•</span>
                  <span className="text-sm text-gray-600">{assignedDriver.completedDeliveries || 0} deliveries</span>
                </div>
              </div>
              
              <a
                href={`tel:${assignedDriver.phoneNumber}`}
                className="p-3 bg-purple-100 text-purple-600 rounded-full hover:bg-purple-200"
              >
                <FiPhone className="h-5 w-5" />
              </a>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Vehicle</p>
                <p className="font-medium text-gray-900">{assignedDriver.carName}</p>
                <p className="text-xs text-gray-600">{assignedDriver.vehicleType}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">License Plate</p>
                <p className="font-medium font-mono text-gray-900">{assignedDriver.numberPlate}</p>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FiClock className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Estimated arrival at restaurant</p>
                  <p className="text-xl font-bold text-purple-600">{driverEta || 15} minutes</p>
                </div>
              </div>
              {isTrackingDriver && (
                <div className="flex items-center space-x-1 text-purple-600">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">Live</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between text-gray-900"
            >
              <span className="font-medium">View Order Summary</span>
              {isExpanded ? <FiChevronDown /> : <FiChevronUp />}
            </button>

            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 space-y-3"
              >
                {items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.quantity}x {item.name}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span className="text-gray-900">{formatCurrency(deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                    <span className="text-gray-900">Total</span>
                    <span className="text-purple-600">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="w-full max-w-2xl bg-white rounded-t-3xl overflow-hidden"
        style={{
          maxHeight: isExpanded ? '90vh' : '70vh',
          transition: 'max-height 0.3s ease'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="md:hidden flex justify-center py-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
        </div>

        {/* Header with brand purple/pink/blue gradient */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <FiShoppingBag className="h-6 w-6" />
              <h2 className="text-xl font-bold">Finding a Driver</h2>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-white/20 rounded-full">
              <FiX className="h-5 w-5" />
            </button>
          </div>
          <p className="text-purple-100">Searching for nearby drivers to deliver your food</p>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100% - 120px)' }}>
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Search progress</span>
              <span className="text-sm font-bold text-purple-600">{searchProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${searchProgress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FiNavigation className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-600">Search radius: {searchRadius} km</span>
            </div>
            <button
              onClick={handleIncreaseRadius}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Increase Radius
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
              <FiAlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={handleIncreaseRadius}
                  className="text-xs text-red-700 font-medium mt-1"
                >
                  Try increasing search radius
                </button>
              </div>
            </div>
          )}

          {availableDrivers.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                Available Drivers ({availableDrivers.length})
              </h3>
              <div className="space-y-3">
                {availableDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {driver.profilePictureUrl ? (
                          <Image
                            src={driver.profilePictureUrl}
                            alt={driver.firstName}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <FiUser className="h-5 w-5 text-purple-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {driver.firstName} {driver.lastName}
                          </p>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span>{driver.carName}</span>
                            <span>•</span>
                            <span>{driver.distance.toFixed(1)} km</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1">
                          <FiStar className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-700">{driver.rating.toFixed(1)}</span>
                        </div>
                        <p className="text-xs text-purple-600 font-medium">
                          ETA: {driver.estimatedArrival} min
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Add a Tip (Optional)</h3>
            <div className="flex space-x-2">
              {[1, 2, 3, 5].map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleTipIncrease(amount)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
                >
                  <span className="text-sm font-medium text-purple-600">+${amount}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Higher tips may attract drivers faster
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-medium text-gray-900 mb-2">{restaurantName}</p>
              <p className="text-sm text-gray-600 mb-3">{restaurantAddress}</p>
              
              <div className="space-y-2 mb-3">
                {items.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.quantity}x {item.name}</span>
                    <span className="text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
                {items.length > 3 && (
                  <p className="text-sm text-gray-500">+{items.length - 3} more items</p>
                )}
              </div>

              <div className="border-t pt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="text-gray-900">{formatCurrency(deliveryFee)}</span>
                </div>
                <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                  <span className="text-gray-900">Total</span>
                  <span className="text-purple-600">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="w-full mt-6 py-3 border border-purple-300 rounded-lg text-purple-700 font-medium hover:bg-purple-50 transition-colors"
          >
            Cancel Search
          </button>
        </div>

        <div className="md:hidden text-center py-2 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            {isExpanded ? 'Swipe down to collapse' : 'Swipe up for more options'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}