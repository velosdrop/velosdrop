// components/driver/FoodDeliveryNotification.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiClock, FiMapPin, FiDollarSign, FiUser, FiX, 
  FiPackage, FiPhone, FiCopy, FiChevronUp, FiChevronDown,
  FiNavigation, FiStar, FiTruck, FiShoppingBag
} from 'react-icons/fi';
import { createPubNubClient, CHANNELS, MESSAGE_TYPES } from '@/lib/pubnub-booking';
import Image from 'next/image';

interface FoodDeliveryRequest {
  id: number;
  orderNumber: string;
  restaurantId: number;
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhone: string;
  restaurantLogo?: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    notes?: string;
  }>;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  estimatedPickupTime: number;
  estimatedDeliveryTime: number;
  distance: number;
  expiresIn: number;
  createdAt: string;
  customerNotes?: string;
  restaurantCoords?: { longitude: number; latitude: number };
  deliveryCoords?: { longitude: number; latitude: number };
}

interface FoodDeliveryNotificationProps {
  request: FoodDeliveryRequest;
  onAccept: (deliveryData: {
    orderId: number;
    restaurantId: number;
    restaurantName: string;
    restaurantAddress: string;
    restaurantPhone: string;
    customerId: number;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    items: any[];
    totalAmount: number;
    restaurantCoords?: { longitude: number; latitude: number };
    deliveryCoords?: { longitude: number; latitude: number };
  }) => void;
  onReject: () => void;
  onExpire: () => void;
  isConnected: boolean;
  driverId: number;
  driverLocation?: { latitude: number; longitude: number };
}

export default function FoodDeliveryNotification({ 
  request, 
  onAccept, 
  onReject, 
  onExpire,
  isConnected,
  driverId,
  driverLocation 
}: FoodDeliveryNotificationProps) {
  const [timeLeft, setTimeLeft] = useState(request.expiresIn);
  const [isVisible, setIsVisible] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [acceptedDrivers, setAcceptedDrivers] = useState<number[]>([]);
  const [driverEta, setDriverEta] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const pubnubRef = useRef<any>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Initialize PubNub
  useEffect(() => {
    if (driverId) {
      const pubnubClient = createPubNubClient(`driver_${driverId}`);
      pubnubRef.current = pubnubClient;
      
      pubnubClient.subscribe({
        channels: [
          CHANNELS.driver(driverId),
          CHANNELS.booking(request.id),
          CHANNELS.drivers,
          CHANNELS.driverLocations
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
              if (data?.driverId !== driverId && data?.bookingId === request.id) {
                setAcceptedDrivers(prev => [...prev, data.driverId]);
                if (!isProcessing) {
                  setErrorMessage('This order has been accepted by another driver');
                }
              }
              break;
              
            case MESSAGE_TYPES.REQUEST_ACCEPTED:
              if (data?.requestId === request.id && data?.driverId !== driverId) {
                setAcceptedDrivers(prev => [...prev, data.driverId]);
              }
              break;
              
            case MESSAGE_TYPES.BOOKING_STATUS_UPDATE:
              if (data?.orderId === request.id && data?.status === 'accepted' && data?.driverId !== driverId) {
                setErrorMessage('This order has been accepted by another driver');
              }
              break;
          }
        }
      };
      
      pubnubClient.addListener(listener);

      return () => {
        pubnubClient.removeListener(listener);
        pubnubClient.unsubscribeAll();
      };
    }
  }, [driverId, request.id, isProcessing]);

  // Calculate ETA based on driver location
  useEffect(() => {
    if (driverLocation && request.restaurantCoords) {
      const calculateEta = () => {
        const R = 6371;
        const dLat = (request.restaurantCoords!.latitude - driverLocation.latitude) * Math.PI / 180;
        const dLon = (request.restaurantCoords!.longitude - driverLocation.longitude) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(driverLocation.latitude * Math.PI / 180) * Math.cos(request.restaurantCoords!.latitude * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        const etaMinutes = Math.round((distance / 30) * 60);
        setDriverEta(etaMinutes);
      };
      
      calculateEta();
    }
  }, [driverLocation, request.restaurantCoords]);

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

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNumber(type);
      setTimeout(() => setCopiedNumber(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const handleAccept = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setErrorMessage(null);
    
    try {
      const response = await fetch('/api/bookings/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: request.id,
          driverId: driverId,
          response: 'accepted',
          customerId: request.customerId
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const deliveryData = {
          orderId: request.id,
          restaurantId: request.restaurantId,
          restaurantName: request.restaurantName,
          restaurantAddress: request.restaurantAddress,
          restaurantPhone: request.restaurantPhone,
          customerId: request.customerId,
          customerName: request.customerName,
          customerPhone: request.customerPhone,
          deliveryAddress: request.deliveryAddress,
          items: request.items,
          totalAmount: request.totalAmount,
          restaurantCoords: request.restaurantCoords,
          deliveryCoords: request.deliveryCoords,
        };

        onAccept(deliveryData);
        setIsVisible(false);
      } else {
        setErrorMessage(data.error || 'Failed to accept delivery');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error accepting delivery:', error);
      setErrorMessage('Network error. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/bookings/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: request.id,
          driverId: driverId,
          response: 'rejected',
          customerId: request.customerId
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setIsVisible(false);
        onReject();
      } else {
        setErrorMessage(data.error || 'Failed to reject');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error rejecting delivery:', error);
      setErrorMessage('Failed to reject. Please try again.');
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (!isVisible || !isConnected || !request.id) {
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
          maxHeight: isExpanded ? '85vh' : '50vh',
          transition: 'max-height 0.3s ease-in-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="md:hidden flex justify-center py-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
        </div>

        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FiShoppingBag className="h-5 w-5" />
              <h3 className="font-bold text-lg">Food Delivery Request</h3>
            </div>
            <div className="flex items-center space-x-2">
              <FiClock className="h-4 w-4" />
              <span className="font-mono font-bold bg-black/20 px-2 py-1 rounded">{timeLeft}s</span>
            </div>
          </div>
          
          <p className="text-sm text-orange-100 mt-1">Order #{request.orderNumber}</p>
        </div>

        <div 
          ref={contentRef}
          className={`p-4 overflow-y-auto transition-all duration-300 ${
            isExpanded ? 'max-h-[calc(85vh-80px)]' : 'max-h-[calc(50vh-80px)]'
          }`}
        >
          {errorMessage && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
          )}

          <div className="flex items-center space-x-3 mb-4 p-3 bg-orange-50 rounded-lg">
            <div className="relative flex-shrink-0">
              {request.restaurantLogo ? (
                <Image
                  src={request.restaurantLogo}
                  alt={request.restaurantName}
                  width={48}
                  height={48}
                  className="rounded-full object-cover border-2 border-orange-200"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {request.restaurantName.charAt(0)}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{request.restaurantName}</p>
              <div className="flex items-center space-x-1 mt-1">
                <FiMapPin className="h-3 w-3 text-gray-500 flex-shrink-0" />
                <p className="text-xs text-gray-600 truncate">{request.restaurantAddress}</p>
              </div>
              {request.restaurantPhone && (
                <div className="flex items-center space-x-2 mt-1">
                  <a 
                    href={`tel:${request.restaurantPhone}`}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <FiPhone className="h-3 w-3" />
                    <span>{formatPhoneNumber(request.restaurantPhone)}</span>
                  </a>
                  <button
                    onClick={() => copyToClipboard(request.restaurantPhone, 'restaurant')}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <FiCopy className={`h-3 w-3 ${copiedNumber === 'restaurant' ? 'text-green-500' : 'text-gray-400'}`} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <FiDollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Your Earnings</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(request.totalAmount)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">{request.distance.toFixed(1)} km away</p>
              {driverEta !== null && (
                <p className="text-xs text-green-600 font-medium">ETA: {driverEta} min</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-gray-50 p-2 rounded-lg text-center">
              <p className="text-xs text-gray-500">Items</p>
              <p className="font-semibold text-gray-900">{request.items.length}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg text-center">
              <p className="text-xs text-gray-500">Pickup</p>
              <p className="font-semibold text-gray-900">{request.estimatedPickupTime} min</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg text-center">
              <p className="text-xs text-gray-500">Delivery</p>
              <p className="font-semibold text-gray-900">{request.estimatedDeliveryTime} min</p>
            </div>
          </div>

          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold text-gray-900 mb-2">Order Items</p>
                <div className="space-y-2">
                  {request.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div>
                        <span className="text-gray-900">{item.quantity}x {item.name}</span>
                        {item.notes && (
                          <p className="text-xs text-gray-500 mt-1">Note: {item.notes}</p>
                        )}
                      </div>
                      <span className="text-gray-900 font-medium">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">Customer</p>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Delivery to
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FiUser className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{request.customerName}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <a 
                        href={`tel:${request.customerPhone}`}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                      >
                        <FiPhone className="h-3 w-3" />
                        <span>{formatPhoneNumber(request.customerPhone)}</span>
                      </a>
                      <button
                        onClick={() => copyToClipboard(request.customerPhone, 'customer')}
                        className="p-1 hover:bg-blue-200 rounded"
                      >
                        <FiCopy className={`h-3 w-3 ${copiedNumber === 'customer' ? 'text-green-500' : 'text-blue-400'}`} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-start space-x-2">
                  <FiMapPin className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">{request.deliveryAddress}</p>
                </div>
              </div>

              {request.customerNotes && (
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-yellow-800 mb-1">📝 Customer Note</p>
                  <p className="text-sm text-yellow-700">{request.customerNotes}</p>
                </div>
              )}

              {acceptedDrivers.length > 0 && (
                <div className="bg-gray-50 p-2 rounded-lg">
                  <p className="text-xs text-gray-600">
                    ⚡ {acceptedDrivers.length} other driver{acceptedDrivers.length > 1 ? 's have' : ' has'} accepted
                  </p>
                </div>
              )}
            </motion.div>
          )}

          <div className="flex space-x-2 pt-3 border-t border-gray-200 mt-3">
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all border border-gray-300 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700"></div>
              ) : (
                <FiX className="h-5 w-5" />
              )}
              <span>Decline</span>
            </button>
            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <FiTruck className="h-5 w-5" />
              )}
              <span>Accept & Pickup</span>
            </button>
          </div>

          {!isExpanded && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
              <span>{request.items.length} items</span>
              <span>→</span>
              <span className="truncate max-w-[150px]">{request.deliveryAddress.split(',')[0]}</span>
            </div>
          )}
        </div>

        <div className="md:hidden text-center py-1 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            {isExpanded ? 'Swipe down to collapse' : 'Swipe up for order details'}
          </p>
        </div>

        {copiedNumber && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm"
          >
            ✓ Phone number copied!
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}