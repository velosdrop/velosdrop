// components/customer/OrdersSection.tsx
"use client";

import { useState, useEffect } from "react";
import { useUser } from '@/app/context/UserContext';
import { createPubNubClient, CHANNELS, MESSAGE_TYPES } from '@/lib/pubnub-booking';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPackage, 
  FiMapPin, 
  FiClock, 
  FiUser, 
  FiNavigation, 
  FiCheckCircle,
  FiXCircle,
  FiTruck,
  FiPhone,
  FiDollarSign,
  FiCalendar,
  FiMap,
  FiTrash2,
  FiLoader
} from 'react-icons/fi';

interface Order {
  id: number;
  customerId: number;
  driverId?: number;
  status: 'pending' | 'accepted' | 'picking_up' | 'in_transit' | 'completed' | 'cancelled';
  pickupLocation: string;
  dropoffLocation: string;
  fare: number;
  distance: number;
  packageDetails?: string;
  recipientPhoneNumber?: string;
  createdAt: string;
  updatedAt: string;
  driver?: {
    firstName: string;
    lastName: string;
    profilePictureUrl: string;
    carName: string;
    numberPlate: string;
    phoneNumber: string;
  };
  currentDriverLocation?: {
    longitude: number;
    latitude: number;
  };
}

// Helper function for status config (moved to top level)
function getStatusConfig(status: string) {
  const configs = {
    pending: {
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      icon: FiClock,
      gradient: 'from-yellow-500/10 to-yellow-600/5',
      text: 'Waiting for Driver',
      description: 'Looking for available drivers'
    },
    accepted: {
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      icon: FiUser,
      gradient: 'from-blue-500/10 to-blue-600/5',
      text: 'Driver Accepted',
      description: 'Driver is on the way to pickup'
    },
    picking_up: {
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      icon: FiNavigation,
      gradient: 'from-purple-500/10 to-purple-600/5',
      text: 'Picking Up',
      description: 'Driver is at pickup location'
    },
    in_transit: {
      color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      icon: FiTruck,
      gradient: 'from-indigo-500/10 to-indigo-600/5',
      text: 'In Transit',
      description: 'Package is on the way'
    },
    completed: {
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      icon: FiCheckCircle,
      gradient: 'from-green-500/10 to-green-600/5',
      text: 'Completed',
      description: 'Delivery successfully completed'
    },
    cancelled: {
      color: 'bg-red-500/20 text-red-400 border-red-500/30',
      icon: FiXCircle,
      gradient: 'from-red-500/10 to-red-600/5',
      text: 'Cancelled',
      description: 'Order was cancelled'
    }
  };
  return configs[status as keyof typeof configs] || configs.pending;
}

// Helper function for date formatting (moved to top level)
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function OrdersSection() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingOrders, setDeletingOrders] = useState<number[]>([]);
  const { customer } = useUser();

  useEffect(() => {
    if (customer?.id) {
      fetchCustomerOrders();
      setupPubNubListener();
    }
  }, [customer?.id]);

  const fetchCustomerOrders = async () => {
    try {
      setRefreshing(true);
      console.log('🔄 Fetching orders for customer:', customer?.id);
      
      const response = await fetch(`/api/customer/orders?customerId=${customer?.id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const ordersData = await response.json();
      console.log('📦 Orders data received:', ordersData);
      setOrders(ordersData);
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const setupPubNubListener = () => {
    if (!customer?.id) return;

    const pubnub = createPubNubClient(`customer_${customer.id}`);
    
    pubnub.addListener({
      message: (event: any) => {
        const { message } = event;
        console.log('📡 PubNub message received:', message);
        
        switch (message.type) {
          case MESSAGE_TYPES.BOOKING_STATUS_UPDATE:
            handleOrderStatusUpdate(message.data);
            break;
            
          case MESSAGE_TYPES.DRIVER_LOCATION_UPDATE:
            handleDriverLocationUpdate(message.data);
            break;
        }
      }
    });

    pubnub.subscribe({
      channels: [
        CHANNELS.customer(customer.id),
        `customer_orders_${customer.id}`
      ]
    });

    console.log('🔔 PubNub listener setup for customer:', customer.id);
  };

  const handleOrderStatusUpdate = (updateData: any) => {
    console.log('🔄 Order status update received:', updateData);
    setOrders(prev => prev.map(order => 
      order.id === updateData.orderId 
        ? { ...order, status: updateData.status, driver: updateData.driver }
        : order
    ));
  };

  const handleDriverLocationUpdate = (locationData: any) => {
    console.log('📍 Driver location update received:', locationData);
    if (locationData.orderId) {
      setOrders(prev => prev.map(order => 
        order.id === locationData.orderId 
          ? { ...order, currentDriverLocation: locationData.location }
          : order
      ));
      
      if (selectedOrder?.id === locationData.orderId) {
        setSelectedOrder(prev => prev ? {
          ...prev,
          currentDriverLocation: locationData.location
        } : null);
      }
    }
  };

  const deleteOrder = async (orderId: number) => {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    setDeletingOrders(prev => [...prev, orderId]);
    
    try {
      console.log('🗑️ Deleting order:', orderId);
      const response = await fetch(`/api/customer/orders/${orderId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Order deleted successfully:', orderId);
        setOrders(prev => prev.filter(order => order.id !== orderId));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(null);
        }
      } else {
        console.error('❌ Failed to delete order:', result.error);
        alert(`Failed to delete order: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error deleting order:', error);
      alert('Failed to delete order. Please try again.');
    } finally {
      setDeletingOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  // Fixed Framer Motion variants with proper TypeScript types
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 20 
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                Your Orders
              </h1>
              <p className="text-gray-400 mt-2">Track your delivery requests</p>
            </div>
          </motion.div>

          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-3">
                    <div className="h-6 bg-gray-700 rounded w-32"></div>
                    <div className="h-4 bg-gray-700 rounded w-48"></div>
                  </div>
                  <div className="h-8 bg-gray-700 rounded w-24"></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8"
        >
          <div className="mb-6 lg:mb-0">
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 bg-clip-text text-transparent">
              Your Orders
            </h1>
            <p className="text-gray-400 mt-2 text-lg">
              Track and manage your delivery requests
            </p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={fetchCustomerOrders}
            disabled={refreshing}
            className="flex items-center space-x-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 px-6 py-3 rounded-xl transition-all duration-300 backdrop-blur-sm"
          >
            <FiClock className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Orders'}</span>
          </motion.button>
        </motion.div>

        {orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 lg:py-24"
          >
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 mx-auto mb-6 bg-purple-500/10 rounded-full flex items-center justify-center">
                <FiPackage className="w-12 h-12 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">No Orders Yet</h3>
              <p className="text-gray-400 text-lg mb-8">
                Your delivery requests will appear here once you make a booking
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-purple-500/25"
              >
                Make Your First Delivery
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-6 lg:gap-8"
          >
            {orders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              const StatusIcon = statusConfig.icon;
              const isDeleting = deletingOrders.includes(order.id);
              
              return (
                <motion.div
                  key={order.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  className="group relative"
                >
                  {/* Background Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${statusConfig.gradient} rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  
                  <div className="relative bg-gray-800/40 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-6 lg:p-8 transition-all duration-300 group-hover:border-purple-500/40 group-hover:shadow-2xl group-hover:shadow-purple-500/10">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-6 lg:space-y-0">
                      {/* Left Section */}
                      <div className="flex-1 space-y-6">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="relative">
                              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <FiPackage className="w-6 h-6 text-white" />
                              </div>
                              <div className="absolute -top-2 -right-2">
                                <div className={`px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm ${statusConfig.color} flex items-center space-x-1`}>
                                  <StatusIcon className="w-3 h-3" />
                                  <span>{statusConfig.text}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-white">
                                Order #{order.id}
                              </h3>
                              <p className="text-gray-400 text-sm mt-1">
                                {statusConfig.description}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-400">
                              ${order.fare.toFixed(2)}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {order.distance} km • {formatDate(order.createdAt)}
                            </p>
                          </div>
                        </div>

                        {/* Locations */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="flex items-start space-x-3 p-4 bg-gray-700/30 rounded-xl border border-gray-600/30">
                            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FiMapPin className="w-5 h-5 text-green-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-400 text-sm font-medium mb-1">Pickup Location</p>
                              <p className="text-white font-semibold truncate">{order.pickupLocation}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start space-x-3 p-4 bg-gray-700/30 rounded-xl border border-gray-600/30">
                            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FiMapPin className="w-5 h-5 text-red-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-400 text-sm font-medium mb-1">Delivery Location</p>
                              <p className="text-white font-semibold truncate">{order.dropoffLocation}</p>
                            </div>
                          </div>
                        </div>

                        {/* Driver Information - Only show when driver is assigned */}
                        {order.driver && order.status !== 'pending' && order.status !== 'cancelled' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/5 rounded-xl border border-purple-500/20"
                          >
                            <p className="text-gray-400 text-sm font-medium mb-3 flex items-center">
                              <FiUser className="w-4 h-4 mr-2" />
                              Assigned Driver
                            </p>
                            <div className="flex items-center space-x-4">
                              <div className="relative">
                                <div className="w-14 h-14 bg-gray-700 rounded-2xl overflow-hidden border-2 border-purple-500/30">
                                  {order.driver.profilePictureUrl ? (
                                    <img 
                                      src={order.driver.profilePictureUrl} 
                                      alt={`${order.driver.firstName} ${order.driver.lastName}`}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-lg">
                                      {order.driver.firstName.charAt(0)}{order.driver.lastName.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-gray-800"></div>
                              </div>
                              
                              <div className="flex-1">
                                <p className="text-white font-semibold text-lg">
                                  {order.driver.firstName} {order.driver.lastName}
                                </p>
                                <p className="text-gray-400 text-sm">
                                  {order.driver.carName} • {order.driver.numberPlate}
                                </p>
                                <div className="flex items-center space-x-4 mt-2">
                                  <a 
                                    href={`tel:${order.driver.phoneNumber}`}
                                    className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
                                  >
                                    <FiPhone className="w-4 h-4" />
                                    <span className="text-sm">Call Driver</span>
                                  </a>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-4 mt-6 pt-6 border-t border-gray-700/50">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedOrder(order)}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg shadow-purple-500/25"
                      >
                        <FiMap className="w-5 h-5" />
                        <span>View Details</span>
                      </motion.button>
                      
                      {/* Delete button - Available for ALL orders */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => deleteOrder(order.id)}
                        disabled={isDeleting}
                        className="px-6 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting ? (
                          <FiLoader className="w-5 h-5 animate-spin" />
                        ) : (
                          <FiTrash2 className="w-5 h-5" />
                        )}
                        <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                      </motion.button>
                      
                      {/* Call Driver button - Only show when driver is assigned */}
                      {order.driver && order.status !== 'pending' && order.status !== 'cancelled' && (
                        <motion.a
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          href={`tel:${order.driver.phoneNumber}`}
                          className="px-6 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-3"
                        >
                          <FiPhone className="w-5 h-5" />
                          <span>Call</span>
                        </motion.a>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Order Details Modal */}
        <AnimatePresence>
          {selectedOrder && (
            <OrderDetailsModal 
              order={selectedOrder} 
              onClose={() => setSelectedOrder(null)} 
              onDelete={() => {
                deleteOrder(selectedOrder.id);
                setSelectedOrder(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Enhanced Order Details Modal Component
function OrderDetailsModal({ order, onClose, onDelete }: { order: Order; onClose: () => void; onDelete?: () => void }) {
  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-gradient-to-br from-gray-900 to-gray-800 w-full max-w-4xl rounded-3xl border border-purple-500/30 shadow-2xl shadow-purple-500/10 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-8 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FiPackage className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Order #{order.id}
                </h2>
                <div className="flex items-center space-x-3 mt-2">
                  <div className={`px-4 py-2 rounded-full text-sm font-semibold border backdrop-blur-sm ${statusConfig.color} flex items-center space-x-2`}>
                    <StatusIcon className="w-4 h-4" />
                    <span>{statusConfig.text}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-400">
                    <FiCalendar className="w-4 h-4" />
                    <span className="text-sm">{formatDate(order.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-12 h-12 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl flex items-center justify-center transition-all duration-300 border border-gray-600/30"
            >
              <FiXCircle className="w-6 h-6 text-gray-400" />
            </motion.button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Delivery Route */}
              <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/30">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <FiNavigation className="w-5 h-5 mr-2 text-purple-400" />
                  Delivery Route
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">A</span>
                      </div>
                      <div className="w-0.5 h-12 bg-green-500/30 mt-2"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-400 text-sm font-medium">Pickup Location</p>
                      <p className="text-white font-semibold mt-1">{order.pickupLocation}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">B</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-400 text-sm font-medium">Delivery Location</p>
                      <p className="text-white font-semibold mt-1">{order.dropoffLocation}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Package Details */}
              {order.packageDetails && (
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/30">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <FiPackage className="w-5 h-5 mr-2 text-blue-400" />
                    Package Details
                  </h3>
                  <p className="text-gray-300 leading-relaxed">{order.packageDetails}</p>
                </div>
              )}

              {/* Recipient Info */}
              {order.recipientPhoneNumber && (
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/30">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <FiUser className="w-5 h-5 mr-2 text-green-400" />
                    Recipient Information
                  </h3>
                  <a 
                    href={`tel:${order.recipientPhoneNumber}`}
                    className="text-blue-400 hover:text-blue-300 font-semibold text-lg transition-colors flex items-center space-x-2"
                  >
                    <FiPhone className="w-5 h-5" />
                    <span>{order.recipientPhoneNumber}</span>
                  </a>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Driver Information - Only show when driver is assigned */}
              {order.driver && order.status !== 'pending' && order.status !== 'cancelled' && (
                <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/5 rounded-2xl p-6 border border-purple-500/20">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <FiUser className="w-5 h-5 mr-2 text-purple-400" />
                    Driver Information
                  </h3>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-700 rounded-2xl overflow-hidden border-2 border-purple-500/30">
                      {order.driver.profilePictureUrl ? (
                        <img 
                          src={order.driver.profilePictureUrl} 
                          alt={`${order.driver.firstName} ${order.driver.lastName}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-xl">
                          {order.driver.firstName.charAt(0)}{order.driver.lastName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-xl">
                        {order.driver.firstName} {order.driver.lastName}
                      </p>
                      <p className="text-gray-400 mt-1">{order.driver.phoneNumber}</p>
                      <p className="text-gray-400 text-sm">
                        {order.driver.carName} • {order.driver.numberPlate}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/30">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <FiDollarSign className="w-5 h-5 mr-2 text-green-400" />
                  Order Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Distance</span>
                    <span className="text-white font-semibold">{order.distance} km</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Delivery Fare</span>
                    <span className="text-green-400 font-bold text-xl">${order.fare.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-700/50">
                    <span className="text-white font-semibold">Total</span>
                    <span className="text-green-400 font-bold text-2xl">${order.fare.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/30">
                <h3 className="text-lg font-semibold text-white mb-4">Delivery Timeline</h3>
                <div className="space-y-4">
                  {['pending', 'accepted', 'picking_up', 'in_transit', 'completed'].map((status, index) => {
                    const isActive = order.status === status;
                    const isCompleted = ['accepted', 'picking_up', 'in_transit', 'completed'].indexOf(order.status) >= 
                                      ['accepted', 'picking_up', 'in_transit', 'completed'].indexOf(status);
                    
                    return (
                      <div key={status} className="flex items-center space-x-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isCompleted 
                            ? 'bg-green-500 text-white' 
                            : isActive
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-600 text-gray-400'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${
                            isCompleted || isActive ? 'text-white' : 'text-gray-400'
                          }`}>
                            {getStatusConfig(status).text}
                          </p>
                        </div>
                        {isActive && (
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-gray-700/50 bg-gray-800/20">
          <div className="flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="flex-1 bg-gray-700/50 hover:bg-gray-600/50 text-white py-4 rounded-xl font-semibold transition-all duration-300 border border-gray-600/30"
            >
              Close Details
            </motion.button>
            
            {/* Delete button in modal - Available for ALL orders */}
            {onDelete && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onDelete}
                className="flex-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-3"
              >
                <FiTrash2 className="w-5 h-5" />
                <span>Delete Order</span>
              </motion.button>
            )}
            
            {/* Call Driver button - Only show when driver is assigned */}
            {order.driver && order.status !== 'pending' && order.status !== 'cancelled' && (
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href={`tel:${order.driver.phoneNumber}`}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 rounded-xl font-semibold transition-all duration-300 text-center shadow-lg shadow-green-500/25 flex items-center justify-center space-x-3"
              >
                <FiPhone className="w-5 h-5" />
                <span>Call Driver</span>
              </motion.a>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}