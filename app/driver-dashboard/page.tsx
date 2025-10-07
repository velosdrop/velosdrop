//app/driver-dashboard/page.tsx
'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/src/db';
import { eq } from 'drizzle-orm';
import { driversTable } from '@/src/db/schema';
import {
  FiMenu, FiX, FiTruck, FiDollarSign, FiUser, FiCamera,
  FiUpload, FiStar, FiMap, FiBell, FiPackage, FiSearch,
  FiClock, FiNavigation, FiCheckCircle, FiXCircle, FiMapPin
} from 'react-icons/fi';
import dynamic from 'next/dynamic';
import LocationPermissionRequest from '@/components/driver/LocationPermissionRequest';
import type { Driver } from '@/src/db/schema';
import Wallet from '@/components/driver/wallet';
import { usePubNubConnection } from '@/components/driver/PubNubConnection';
import BookingNotification from '@/components/driver/BookingNotification';

const Map = dynamic(() => import('@/components/driver/Map'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center">Loading map...</div>,
});

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

interface BookingRequest {
  id: number;
  customerId: number;
  customerUsername: string;
  customerProfilePictureUrl?: string;
  pickupLocation: string;
  dropoffLocation: string;
  fare: number;
  distance: number;
  expiresIn: number;
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  packageDetails?: string;
  isDirectAssignment?: boolean;
}

function ConnectionStatus({ isConnected, isOnline }: { isConnected: boolean; isOnline: boolean }) {
  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 p-3 rounded-lg text-xs text-white z-40">
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span>PubNub: {isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
      <div className="mt-1 text-gray-400">
        Status: {isOnline ? 'Online' : 'Offline'}
      </div>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 text-blue-400 hover:text-blue-300"
      >
        Refresh Connection
      </button>
    </div>
  );
}

export default function DriverDashboard() {
  const router = useRouter();
  const [driverData, setDriverData] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('map');
  const [locationGranted, setLocationGranted] = useState(false);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [bookingRequest, setBookingRequest] = useState<BookingRequest | null>(null);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [ratings] = useState({
    average: 4.5,
    total: 24,
    breakdown: [5, 4, 3, 2, 1]
  });

  // Use PubNub connection hook
  const { isConnected } = usePubNubConnection(
    driverData?.id, 
    isOnline, 
    setBookingRequest, 
    setHasNewNotification, 
    setBookingRequests
  );

  const getGeolocationErrorText = (code: number): string => {
    switch (code) {
      case 1:
        return 'Permission denied - Please enable location services in your browser settings';
      case 2:
        return 'Position unavailable - Location information is not available';
      case 3:
        return 'Timeout - The request to get location timed out';
      default:
        return 'Unknown error occurred while getting location';
    }
  };

  const updateDriverLocation = useCallback(async (position: GeolocationPosition) => {
    if (!driverData?.id || !isOnline) return;
    const location: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date().toISOString()
    };
    try {
      const response = await fetch('/api/drivers/update-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverId: driverData.id,
          location
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update location');
      }
    } catch (error) {
      console.error('Location update error:', error instanceof Error ? error.message : error);
    }
  }, [driverData?.id, isOnline]);

  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('driver-auth-token') === 'true';
    const driverIdStr = sessionStorage.getItem('driver-id');
    const driverId = driverIdStr ? parseInt(driverIdStr) : null;
    if (!isAuthenticated || !driverId) {
      router.push('/driver-login');
      return;
    }
    const fetchDriverData = async () => {
      try {
        const driver = await db.query.driversTable.findFirst({
          where: eq(driversTable.id, driverId),
        });
        if (driver) {
          let parsedLocation = null;
          if (driver.lastLocation && typeof driver.lastLocation === 'string') {
            try {
              parsedLocation = JSON.parse(driver.lastLocation);
              if (!parsedLocation || typeof parsedLocation !== 'object' ||
                !('latitude' in parsedLocation) || !('longitude' in parsedLocation)) {
                parsedLocation = null;
              }
            } catch (e) {
              console.error('Error parsing location ', e);
              parsedLocation = null;
            }
          }
          const formattedDriver: Driver = {
            ...driver,
            profilePictureUrl: driver.profilePictureUrl || '/driver-avatar.jpg',
            isOnline: driver.isOnline,
            lastLocation: parsedLocation
          };
          setDriverData(formattedDriver);
          setIsOnline(formattedDriver.isOnline);
        }
      } catch (error) {
        console.error('Error fetching driver ', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDriverData();
  }, [router]);

  useEffect(() => {
    if (!driverData?.id) return;
    const checkOnlineStatus = async () => {
      try {
        const driver = await db.query.driversTable.findFirst({
          where: eq(driversTable.id, driverData.id),
          columns: { isOnline: true }
        });
        if (driver && driver.isOnline !== isOnline) {
          setIsOnline(driver.isOnline);
          setDriverData(prev => prev ? { ...prev, isOnline: driver.isOnline } : null);
        }
      } catch (error) {
        console.error('Error checking online status:', error);
      }
    };
    const interval = setInterval(checkOnlineStatus, 30000);
    return () => clearInterval(interval);
  }, [driverData?.id, isOnline]);

  useEffect(() => {
    if (!isOnline || !locationGranted) return;
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        updateDriverLocation,
        (error) => {
          console.error('Geolocation error:', {
            code: error.code,
            message: getGeolocationErrorText(error.code),
            PERMISSION_DENIED: error.PERMISSION_DENIED,
            POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
            TIMEOUT: error.TIMEOUT
          });
          if (error.code === error.PERMISSION_DENIED) {
            setLocationGranted(false);
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000
        }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isOnline, locationGranted, updateDriverLocation]);

  useEffect(() => {
    if (isOnline && driverData?.id) {
      const interval = setInterval(() => {
        console.log('🔍 Driver Connection Status:', {
          driverId: driverData.id,
          isOnline,
          pubnubConnected: isConnected,
        });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isOnline, driverData?.id, isConnected]);

  const handleBookingAccept = async (requestId?: number) => {
    const requestToAccept = requestId
      ? bookingRequests.find(req => req.id === requestId)
      : bookingRequest;
    if (!requestToAccept || !driverData) return;
    try {
      const response = await fetch('/api/bookings/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: requestToAccept.id,
          driverId: driverData.id,
          response: 'accepted'
        }),
      });
      if (response.ok) {
        if (bookingRequest?.id === requestToAccept.id) {
            setBookingRequest(null);
        }
        setBookingRequests(prev =>
          prev.map(req =>
            req.id === requestToAccept.id
              ? { ...req, status: 'accepted' }
              : req
          )
        );
        const hasOtherPending = bookingRequests.some(req =>
          req.id !== requestToAccept.id && req.status === 'pending'
        );
        if (!hasOtherPending) {
            setHasNewNotification(false);
        }
        setActiveTab('deliveries');
      } else {
        throw new Error('Failed to accept booking');
      }
    } catch (error) {
      console.error('Error accepting booking:', error);
    }
  };

  const handleBookingReject = async (requestId?: number) => {
    const requestToReject = requestId
      ? bookingRequests.find(req => req.id === requestId)
      : bookingRequest;
    if (!requestToReject || !driverData) return;
    try {
      const response = await fetch('/api/bookings/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: requestToReject.id,
          driverId: driverData.id,
          response: 'rejected'
        }),
      });
      if (response.ok) {
        if (bookingRequest?.id === requestToReject.id) {
           setBookingRequest(null);
        }
         setBookingRequests(prev =>
          prev.map(req =>
            req.id === requestToReject.id
              ? { ...req, status: 'rejected' }
              : req
          )
        );
        const hasOtherPending = bookingRequests.some(req =>
          req.id !== requestToReject.id && req.status === 'pending'
        );
        if (!hasOtherPending) {
            setHasNewNotification(false);
        }
      } else {
         throw new Error('Failed to reject booking');
      }
    } catch (error) {
      console.error('Error rejecting booking:', error);
    }
  };

  const handleBookingExpire = useCallback(() => {
    setBookingRequest(null);
    setHasNewNotification(false);
  }, []);

  const clearExpiredRequests = () => {
    setBookingRequests(prev => prev.filter(req => req.status !== 'expired'));
  };

  const handleLogout = async () => {
    if (driverData?.id) {
      try {
        await db.update(driversTable)
          .set({
            isOnline: false,
            lastOnline: new Date().toISOString()
          })
          .where(eq(driversTable.id, driverData.id));
      } catch (error) {
        console.error('Error updating driver status on logout:', error);
      }
    }
    sessionStorage.removeItem('driver-auth-token');
    sessionStorage.removeItem('driver-id');
    router.push('/driver-login');
  };

  const toggleOnlineStatus = async () => {
    if (!driverData?.id) return;
    const newStatus = !isOnline;
    setIsUpdatingStatus(true);
    try {
      const response = await fetch('/api/drivers/online', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverId: driverData.id,
          isOnline: newStatus,
          latitude: driverData.latitude || -17.8710215,
          longitude: driverData.longitude || 30.9560123
        }),
      });
      if (response.ok) {
        const result = await response.json();
        setIsOnline(newStatus);
        setDriverData(prev => prev ? { ...prev, isOnline: newStatus } : null);
        if (newStatus) {
          setLocationGranted(true);
        } else {
          setBookingRequests([]);
          setBookingRequest(null);
          setHasNewNotification(false);
        }
      } else {
        throw new Error('Failed to update online status');
      }
    } catch (error) {
      console.error('Error updating online status:', error);
      setIsOnline(isOnline);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !driverData?.id) return;
    try {
      const newProfilePicUrl = previewUrl || '/default-avatar.png';
      await db.update(driversTable)
        .set({ profilePictureUrl: newProfilePicUrl })
        .where(eq(driversTable.id, driverData.id));
      setDriverData(prev => prev ? {
        ...prev,
        profilePictureUrl: newProfilePicUrl
      } : null);
      setIsEditingProfile(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error updating profile picture:', error);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FiStar
          key={i}
          className={`${i <= rating ? 'text-purple-500 fill-purple-500' : 'text-gray-400'}`}
        />
      );
    }
    return stars;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {bookingRequest && driverData?.id && (
        <BookingNotification
             request={bookingRequest}
             onAccept={() => handleBookingAccept()}
             onReject={() => handleBookingReject()}
             onExpire={handleBookingExpire}
             isConnected={isConnected}
             driverId={driverData.id} // This will always be a valid number
        />
        )}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-purple-600 text-white rounded-lg shadow-lg"
      >
        <FiMenu size={24} />
      </button>

      <div className="hidden md:flex md:w-64 bg-black text-white flex-col border-r border-gray-800">
        <div className="flex flex-col h-full p-4">
          <div className="flex flex-col items-center py-6 border-b border-gray-800">
            <div className="relative w-20 h-20 rounded-full bg-gray-800 mb-4 overflow-hidden group">
              <img
                src={previewUrl || driverData?.profilePictureUrl}
                alt="Driver"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/driver-avatar.jpg';
                }}
              />
              <button
                onClick={() => setIsEditingProfile(true)}
                className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <FiCamera className="text-white" size={20} />
              </button>
            </div>
            <h3 className="text-xl font-semibold text-white">
              {driverData?.firstName} {driverData?.lastName}
            </h3>
            <div className="flex items-center mt-2">
              <span className={`h-2 w-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></span>
              <span className="text-sm text-gray-400">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center mt-2">
              <div className="flex mr-2">
                {renderStars(Math.round(ratings.average))}
              </div>
              <span className="text-gray-400 text-sm">
                {ratings.average} ({ratings.total})
              </span>
            </div>
          </div>

          <nav className="flex-1 mt-6">
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setActiveTab('map')}
                  className={`w-full text-left flex items-center p-3 rounded-lg transition-colors ${
                    activeTab === 'map' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                >
                  <FiMap className="mr-3" />
                  <span>Delivery Map</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('delivery-requests')}
                  className={`w-full text-left flex items-center p-3 rounded-lg transition-colors ${
                    activeTab === 'delivery-requests' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                >
                  <FiPackage className="mr-3" />
                  <span>Delivery Requests</span>
                  {hasNewNotification && (
                    <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full text-left flex items-center p-3 rounded-lg transition-colors ${
                    activeTab === 'profile' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                >
                  <FiUser className="mr-3" />
                  <span>My Profile</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('deliveries')}
                  className={`w-full text-left flex items-center p-3 rounded-lg transition-colors ${
                    activeTab === 'deliveries' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                >
                  <FiTruck className="mr-3" />
                  <span>My Deliveries</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('wallet')}
                  className={`w-full text-left flex items-center p-3 rounded-lg transition-colors ${
                    activeTab === 'wallet' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                >
                  <FiDollarSign className="mr-3" />
                  <span>My Wallet</span>
                </button>
              </li>
            </ul>
          </nav>

          <button
            onClick={handleLogout}
            className="mt-auto p-3 text-left rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center"
          >
            <FiX className="mr-3" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 w-64 bg-black text-white z-50 shadow-xl border-r border-gray-800"
            >
              <div className="flex flex-col h-full p-4">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="self-end p-2 md:hidden text-gray-300 hover:text-white"
                >
                  <FiX size={24} />
                </button>

                <div className="flex flex-col items-center py-6 border-b border-gray-800">
                  <div className="relative w-20 h-20 rounded-full bg-gray-800 mb-4 overflow-hidden">
                    <img
                      src={driverData?.profilePictureUrl}
                      alt="Driver"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/default-avatar.png';
                      }}
                    />
                  </div>
                  <h3 className="text-xl font-semibold text-white">
                    {driverData?.firstName} {driverData?.lastName}
                  </h3>
                  <div className="flex items-center mt-2">
                    <span className={`h-2 w-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                    <span className="text-sm text-gray-400">
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex items-center mt-2">
                    <div className="flex mr-2">
                      {renderStars(Math.round(ratings.average))}
                    </div>
                    <span className="text-gray-400 text-sm">
                      {ratings.average} ({ratings.total})
                    </span>
                  </div>
                </div>

                <nav className="flex-1 mt-6">
                  <ul className="space-y-2">
                    <li>
                      <button
                        onClick={() => {
                          setActiveTab('map');
                          setSidebarOpen(false);
                        }}
                        className={`w-full text-left flex items-center p-3 rounded-lg transition-colors ${
                          activeTab === 'map' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                          }`}
                      >
                        <FiMap className="mr-3" />
                        <span>Delivery Map</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          setActiveTab('delivery-requests');
                          setSidebarOpen(false);
                        }}
                        className={`w-full text-left flex items-center p-3 rounded-lg transition-colors ${
                          activeTab === 'delivery-requests' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                          }`}
                      >
                        <FiPackage className="mr-3" />
                        <span>Delivery Requests</span>
                        {hasNewNotification && (
                          <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        )}
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          setActiveTab('profile');
                          setSidebarOpen(false);
                        }}
                        className={`w-full text-left flex items-center p-3 rounded-lg transition-colors ${
                          activeTab === 'profile' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                          }`}
                      >
                        <FiUser className="mr-3" />
                        <span>My Profile</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          setActiveTab('deliveries');
                          setSidebarOpen(false);
                        }}
                        className={`w-full text-left flex items-center p-3 rounded-lg transition-colors ${
                          activeTab === 'deliveries' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                          }`}
                      >
                        <FiTruck className="mr-3" />
                        <span>My Deliveries</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          setActiveTab('wallet');
                          setSidebarOpen(false);
                        }}
                        className={`w-full text-left flex items-center p-3 rounded-lg transition-colors ${
                          activeTab === 'wallet' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                          }`}
                      >
                        <FiDollarSign className="mr-3" />
                        <span>My Wallet</span>
                      </button>
                    </li>
                  </ul>
                </nav>

                <button
                  onClick={handleLogout}
                  className="mt-auto p-3 text-left rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center"
                >
                  <FiX className="mr-3" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <div className="bg-white shadow-sm p-4 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mr-4 p-2 text-gray-700 rounded-lg hover:bg-gray-100 md:hidden"
            >
              <FiMenu size={20} />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              {activeTab === 'profile' ? 'My Profile' :
                activeTab === 'deliveries' ? 'My Deliveries' :
                  activeTab === 'wallet' ? 'My Wallet' :
                    activeTab === 'map' ? 'Delivery Map' :
                      activeTab === 'delivery-requests' ? 'Delivery Requests' :
                        'Driver Dashboard'}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            {hasNewNotification && (
              <div className="relative">
                <FiBell className="h-6 w-6 text-purple-600 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </div>
            )}
            <span className={`mr-3 text-sm font-medium ${isOnline ? 'text-purple-600' : 'text-gray-600'}`}>
              {isOnline ? 'Online - Available' : 'Offline'}
            </span>
            <button
              onClick={toggleOnlineStatus}
              disabled={isUpdatingStatus}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                isOnline ? 'bg-purple-600' : 'bg-gray-200'
                } ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isOnline ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
        </div>

        {isOnline && (
          <ConnectionStatus isConnected={isConnected} isOnline={isOnline} />
        )}

        <AnimatePresence>
          {isEditingProfile && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
              >
                <h2 className="text-xl font-bold mb-4 text-gray-900">Update Profile Picture</h2>
                <div className="flex flex-col items-center mb-4">
                  <div className="w-32 h-32 rounded-full bg-gray-200 mb-4 overflow-hidden">
                    <img
                      src={previewUrl || driverData?.profilePictureUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center hover:bg-purple-700 transition-colors"
                  >
                    <FiUpload className="mr-2" />
                    Choose Image
                  </button>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setIsEditingProfile(false);
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile}
                    className={`px-4 py-2 rounded-lg text-white transition-colors ${
                      selectedFile ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-400 cursor-not-allowed'
                      }`}
                  >
                    Save Changes
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {activeTab === 'profile' ? (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3 flex flex-col items-center">
                  <div className="relative w-32 h-32 rounded-full bg-gray-200 mb-4 overflow-hidden">
                    <img
                      src={driverData?.profilePictureUrl}
                      alt="Driver"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/default-avatar.png';
                      }}
                    />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {driverData?.firstName} {driverData?.lastName}
                  </h2>
                  <div className="flex items-center mt-2">
                    <span className={`h-2 w-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                    <span className="text-sm text-gray-600">
                      {isOnline ? 'Currently Online' : 'Currently Offline'}
                    </span>
                  </div>
                  <div className="mt-4 text-center">
                    <div className="flex justify-center mb-1">
                      {renderStars(Math.round(ratings.average))}
                    </div>
                    <p className="text-gray-600">
                      {ratings.average} average ({ratings.total} ratings)
                    </p>
                  </div>
                </div>

                <div className="md:w-2/3">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">First Name</p>
                      <p className="font-medium text-gray-900">{driverData?.firstName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Name</p>
                      <p className="font-medium text-gray-900">{driverData?.lastName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium text-gray-900">{driverData?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone Number</p>
                      <p className="font-medium text-gray-900">{driverData?.phoneNumber}</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mt-6 mb-4 text-gray-900">Vehicle Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Vehicle Type</p>
                      <p className="font-medium text-gray-900">{driverData?.vehicleType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Car Model</p>
                      <p className="font-medium text-gray-900">{driverData?.carName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">License Plate</p>
                      <p className="font-medium text-gray-900">{driverData?.numberPlate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">License Expiry</p>
                      <p className="font-medium text-gray-900">{driverData?.licenseExpiry}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'map' ? (
            <div className="bg-white rounded-lg shadow-sm h-full border border-gray-200 overflow-hidden">
              <LocationPermissionRequest onGranted={() => setLocationGranted(true)} />
              <Map
                initialOptions={{
                  center: [31.033, -17.827],
                  zoom: 12,
                  style: 'mapbox://styles/murombo/cmdq9jyzw00hd01s87etkezgc'
                }}
                style={{ height: '100%', width: '100%' }}
                driverId={driverData?.id}
                isOnline={isOnline}
              />
            </div>
          ) : activeTab === 'wallet' ? (
            <Wallet />
          ) : activeTab === 'deliveries' ? (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">My Deliveries</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Completed
                    </span>
                    <span className="text-sm text-gray-500">2 hours ago</span>
                  </div>
                  <p className="font-medium text-gray-900">City Center to Airport</p>
                  <p className="text-sm text-gray-600 mt-1">Customer: john_doe</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm font-medium text-gray-900">$15.50</span>
                    <span className="text-sm text-gray-500">5.2 km</span>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      In Progress
                    </span>
                    <span className="text-sm text-gray-500">Now</span>
                  </div>
                  <p className="font-medium text-gray-900">Mall to Residential</p>
                  <p className="text-sm text-gray-600 mt-1">Customer: sarah_m</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm font-medium text-gray-900">$12.00</span>
                    <span className="text-sm text-gray-500">3.8 km</span>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                      Scheduled
                    </span>
                    <span className="text-sm text-gray-500">Tomorrow</span>
                  </div>
                  <p className="font-medium text-gray-900">Office to Home</p>
                  <p className="text-sm text-gray-600 mt-1">Customer: mike_t</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm font-medium text-gray-900">$18.75</span>
                    <span className="text-sm text-gray-500">7.1 km</span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'delivery-requests' ? (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Delivery Requests</h3>
              {bookingRequests.length > 0 ? (
                <div className="space-y-4">
                  {bookingRequests.map((request) => (
                    <div key={request.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <FiUser className="h-4 w-4 text-purple-600" />
                          <div>
                            <span className="font-medium text-gray-900">{request.customerUsername}</span>
                            {request.isDirectAssignment && (
                              <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                                Direct Request
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          request.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                          request.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                      <div className="space-y-2 mb-4">
                        {request.packageDetails && (
                          <div className="flex items-start space-x-3">
                            <FiPackage className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Package Details</p>
                              <p className="text-sm text-gray-600">{request.packageDetails}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-start space-x-3">
                          <FiMapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Pickup</p>
                            <p className="text-sm text-gray-600">{request.pickupLocation}</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <FiMapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Dropoff</p>
                            <p className="text-sm text-gray-600">{request.dropoffLocation}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <FiDollarSign className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Fare</p>
                            <p className="text-sm text-gray-600">${request.fare.toFixed(2)} • {request.distance} km</p>
                          </div>
                        </div>
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleBookingReject(request.id)}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleBookingAccept(request.id)}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                          >
                            Accept
                          </button>
                        </div>
                      )}
                      {request.status === 'accepted' && (
                        <div className="flex items-center text-green-600">
                          <FiCheckCircle className="mr-2" />
                          <span className="font-medium">Request Accepted</span>
                        </div>
                      )}
                      {request.status === 'rejected' && (
                        <div className="flex items-center text-red-600">
                          <FiXCircle className="mr-2" />
                          <span className="font-medium">Request Rejected</span>
                        </div>
                      )}
                      {request.status === 'expired' && (
                        <div className="flex items-center text-gray-500">
                          <FiClock className="mr-2" />
                          <span className="font-medium">Request Expired</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <FiPackage className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No Delivery Requests</h3>
                  <p>You'll see delivery requests here when they come in</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm h-full flex items-center justify-center border border-gray-200">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiTruck className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Ready to Deliver?
                </h3>
                <p className="text-gray-600 mb-4">
                  Go online to start receiving delivery requests from customers in your area.
                </p>
                <button
                  onClick={toggleOnlineStatus}
                  disabled={isUpdatingStatus}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    isOnline
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                    } ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isUpdatingStatus ? (
                    <span>Updating...</span>
                  ) : isOnline ? (
                    <span>Go Offline</span>
                  ) : (
                    <span>Go Online</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}