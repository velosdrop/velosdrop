// app/driver-dashboard/mydeliveries/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FiPackage, FiUser, FiPhone, FiMapPin, FiDollarSign, FiClock, 
  FiCheckCircle, FiXCircle, FiSearch, FiFilter, FiTrash2, FiFileText,
  FiDownload, FiX
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

interface DeliveryHistory {
  id: number;
  customerId: number;
  customerUsername: string;
  customerPhoneNumber: string;
  customerProfilePictureUrl?: string;
  pickupLocation: string;
  dropoffLocation: string;
  fare: number;
  distance: number;
  packageDetails?: string;
  recipientPhoneNumber?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'expired';
  assignedDriverId: number;
  createdAt: string;
  respondedAt?: string;
  completedAt?: string;
}

interface ElectronicReceiptData {
  deliveryId: number;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  dropoffLocation: string;
  fare: number;
  distance: number;
  packageDetails?: string;
  recipientPhone?: string;
  createdAt: string;
  completedAt?: string;
  receiptNumber: string;
  driverName: string;
  driverPhone: string;
  vehicleType: string;
  licensePlate: string;
}

export default function MyDeliveries() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<DeliveryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [driverId, setDriverId] = useState<number | null>(null);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<ElectronicReceiptData | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const driverIdStr = sessionStorage.getItem('driver-id');
    const driverId = driverIdStr ? parseInt(driverIdStr) : null;
    
    if (!driverId) {
      router.push('/driver-login');
      return;
    }
    
    setDriverId(driverId);
    fetchDriverInfo(driverId);
    fetchDeliveryHistory(driverId);
  }, [router]);

  const fetchDriverInfo = async (driverId: number) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}`);
      if (response.ok) {
        const data = await response.json();
        setDriverInfo(data.driver);
      }
    } catch (error) {
      console.error('Error fetching driver info:', error);
    }
  };

  const fetchDeliveryHistory = async (driverId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/drivers/delivery-history?driverId=${driverId}`);
      
      if (response.ok) {
        const data = await response.json();
        setDeliveries(data.deliveries || []);
      } else {
        console.error('Failed to fetch delivery history');
        setDeliveries([]);
      }
    } catch (error) {
      console.error('Error fetching delivery history:', error);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  // Delete delivery function
  const handleDeleteDelivery = async (deliveryId: number) => {
    if (!confirm('Are you sure you want to delete this delivery record? This action cannot be undone.')) {
      return;
    }

    setDeletingId(deliveryId);
    try {
      const response = await fetch(`/api/drivers/deliveries/${deliveryId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driverId }),
      });

      if (response.ok) {
        setDeliveries(prev => prev.filter(delivery => delivery.id !== deliveryId));
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete delivery');
      }
    } catch (error) {
      console.error('Error deleting delivery:', error);
      alert('Failed to delete delivery. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // Generate electronic receipt
  const generateReceipt = (delivery: DeliveryHistory) => {
    const receiptNumber = `DR-${delivery.id.toString().padStart(6, '0')}-${Date.now().toString(36)}`;
    
    const receipt: ElectronicReceiptData = {
      deliveryId: delivery.id,
      customerName: delivery.customerUsername,
      customerPhone: delivery.customerPhoneNumber,
      pickupLocation: delivery.pickupLocation,
      dropoffLocation: delivery.dropoffLocation,
      fare: delivery.fare,
      distance: delivery.distance,
      packageDetails: delivery.packageDetails,
      recipientPhone: delivery.recipientPhoneNumber,
      createdAt: delivery.createdAt,
      completedAt: delivery.completedAt,
      receiptNumber,
      driverName: driverInfo ? `${driverInfo.firstName} ${driverInfo.lastName}` : 'Driver',
      driverPhone: driverInfo?.phoneNumber || 'N/A',
      vehicleType: driverInfo?.vehicleType || 'N/A',
      licensePlate: driverInfo?.numberPlate || 'N/A'
    };

    setReceiptData(receipt);
    setShowReceipt(true);
  };

  // Prevent right-click and text selection on receipt
  const preventDownload = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Filter deliveries based on search and status
  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = 
      delivery.customerUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.dropoffLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.packageDetails?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || delivery.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge color and icon
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: 'bg-green-100 text-green-800 border-green-200', icon: FiCheckCircle };
      case 'accepted':
        return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: FiCheckCircle };
      case 'rejected':
        return { color: 'bg-red-100 text-red-800 border-red-200', icon: FiXCircle };
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: FiClock };
      case 'expired':
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: FiClock };
      default:
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: FiClock };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mb-4"
          />
          <p className="text-gray-600">Loading your delivery history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Electronic Receipt Modal */}
      <AnimatePresence>
        {showReceipt && receiptData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
              onContextMenu={preventDownload}
            >
              {/* Receipt Header */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold">Delivery Receipt</h2>
                    <p className="text-purple-100">Receipt #: {receiptData.receiptNumber}</p>
                  </div>
                  <button
                    onClick={() => setShowReceipt(false)}
                    className="text-white hover:text-purple-200 transition-colors"
                  >
                    <FiX size={24} />
                  </button>
                </div>
              </div>

              {/* Receipt Content - Protected from downloading */}
              <div 
                className="p-6 overflow-y-auto max-h-[60vh] select-none bg-white"
                style={{ 
                  userSelect: 'none', 
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none'
                }}
                onContextMenu={preventDownload}
                onDragStart={preventDownload}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Customer Information */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      Customer Information
                    </h3>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Customer Name</p>
                      <p className="font-medium text-gray-900 text-base">{receiptData.customerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Phone Number</p>
                      <p className="font-medium text-gray-900 text-base">{formatPhoneNumber(receiptData.customerPhone)}</p>
                    </div>
                    {receiptData.recipientPhone && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Recipient Phone</p>
                        <p className="font-medium text-gray-900 text-base">{formatPhoneNumber(receiptData.recipientPhone)}</p>
                      </div>
                    )}
                  </div>

                  {/* Driver Information */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      Driver Information
                    </h3>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Driver Name</p>
                      <p className="font-medium text-gray-900 text-base">{receiptData.driverName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Phone Number</p>
                      <p className="font-medium text-gray-900 text-base">{formatPhoneNumber(receiptData.driverPhone)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Vehicle</p>
                      <p className="font-medium text-gray-900 text-base">{receiptData.vehicleType} - {receiptData.licensePlate}</p>
                    </div>
                  </div>
                </div>

                {/* Delivery Details */}
                <div className="space-y-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Delivery Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Pickup Location</p>
                      <p className="font-medium text-gray-900 text-base">{receiptData.pickupLocation}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Dropoff Location</p>
                      <p className="font-medium text-gray-900 text-base">{receiptData.dropoffLocation}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Distance</p>
                      <p className="font-medium text-gray-900 text-base">{receiptData.distance} km</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Delivery Fare</p>
                      <p className="font-medium text-xl text-purple-600">${receiptData.fare.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Package Details */}
                {receiptData.packageDetails && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-3">
                      Package Details
                    </h3>
                    <p className="text-gray-900 text-base whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-200">
                      {receiptData.packageDetails}
                    </p>
                  </div>
                )}

                {/* Timestamps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
                  <div>
                    <p className="text-gray-600 mb-1">Order Created</p>
                    <p className="font-medium text-gray-900">{formatDate(receiptData.createdAt)}</p>
                  </div>
                  {receiptData.completedAt && (
                    <div>
                      <p className="text-gray-600 mb-1">Completed At</p>
                      <p className="font-medium text-gray-900">{formatDate(receiptData.completedAt)}</p>
                    </div>
                  )}
                </div>

                {/* Watermark */}
                <div className="mt-8 text-center relative">
                  <div className="absolute inset-0 flex items-center justify-center opacity-5">
                    <div className="text-6xl font-bold text-gray-600 transform -rotate-45">
                      DELIVERY RECEIPT
                    </div>
                  </div>
                  <div className="relative z-10">
                    <p className="text-xs text-gray-500">
                      This is an electronic receipt. For verification purposes only.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="bg-gray-50 p-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    This receipt is for record purposes only
                  </p>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <FiDownload size={16} />
                    <span>Print Receipt</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Delivery History</h1>
          <p className="text-gray-600 mt-2">
            View your complete delivery request history and status
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by customer, location, or package..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 bg-white"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div className="w-full md:w-64">
              <div className="relative">
                <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none bg-white text-gray-900"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="pending">Pending</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredDeliveries.length === 0 ? (
            <div className="text-center py-12">
              <FiPackage className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {deliveries.length === 0 ? 'No Delivery History' : 'No Matching Deliveries'}
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                {deliveries.length === 0 
                  ? "You haven't completed any deliveries yet. Your delivery history will appear here once you start accepting requests."
                  : "No deliveries match your current search and filter criteria."
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredDeliveries.map((delivery, index) => {
                const StatusIcon = getStatusInfo(delivery.status).icon;
                
                return (
                  <motion.div
                    key={delivery.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      {/* Left Section - Customer and Package Info */}
                      <div className="flex-1">
                        <div className="flex items-start space-x-4">
                          {/* Customer Profile */}
                          <div className="flex-shrink-0">
                            {delivery.customerProfilePictureUrl ? (
                              <img
                                src={delivery.customerProfilePictureUrl}
                                alt={delivery.customerUsername}
                                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {delivery.customerUsername.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          {/* Delivery Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-2 mb-3">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {delivery.customerUsername}
                              </h3>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusInfo(delivery.status).color} flex items-center space-x-1`}>
                                <StatusIcon className="h-3 w-3" />
                                <span className="capitalize">{delivery.status}</span>
                              </span>
                            </div>

                            {/* Contact Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <FiPhone className="h-4 w-4 flex-shrink-0" />
                                <a 
                                  href={`tel:${delivery.customerPhoneNumber}`}
                                  className="hover:text-blue-600 transition-colors"
                                >
                                  {formatPhoneNumber(delivery.customerPhoneNumber)}
                                </a>
                              </div>
                              {delivery.recipientPhoneNumber && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <FiUser className="h-4 w-4 flex-shrink-0" />
                                  <span>Recipient: </span>
                                  <a 
                                    href={`tel:${delivery.recipientPhoneNumber}`}
                                    className="hover:text-blue-600 transition-colors"
                                  >
                                    {formatPhoneNumber(delivery.recipientPhoneNumber)}
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Locations */}
                            <div className="space-y-2">
                              <div className="flex items-start space-x-2 text-sm">
                                <FiMapPin className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-medium text-gray-700">Pickup: </span>
                                  <span className="text-gray-600">{delivery.pickupLocation}</span>
                                </div>
                              </div>
                              <div className="flex items-start space-x-2 text-sm">
                                <FiMapPin className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-medium text-gray-700">Dropoff: </span>
                                  <span className="text-gray-600">{delivery.dropoffLocation}</span>
                                </div>
                              </div>
                            </div>

                            {/* Package Details */}
                            {delivery.packageDetails && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-sm font-medium text-gray-700 mb-1">Package Details</p>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{delivery.packageDetails}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Section - Fare, Actions and Timestamps */}
                      <div className="lg:text-right space-y-3">
                        {/* Fare */}
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                          <p className="text-sm font-medium text-gray-700">Delivery Fare</p>
                          <p className="text-2xl font-bold text-purple-600">${delivery.fare.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">{delivery.distance} km</p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={() => generateReceipt(delivery)}
                            className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <FiFileText size={16} />
                            <span>View Receipt</span>
                          </button>
                          
                          <button
                            onClick={() => handleDeleteDelivery(delivery.id)}
                            disabled={deletingId === delivery.id}
                            className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingId === delivery.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <FiTrash2 size={16} />
                            )}
                            <span>{deletingId === delivery.id ? 'Deleting...' : 'Delete'}</span>
                          </button>
                        </div>

                        {/* Timestamps */}
                        <div className="space-y-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Created: </span>
                            <span>{formatDate(delivery.createdAt)}</span>
                          </div>
                          {delivery.respondedAt && (
                            <div>
                              <span className="font-medium">Responded: </span>
                              <span>{formatDate(delivery.respondedAt)}</span>
                            </div>
                          )}
                          {delivery.completedAt && (
                            <div>
                              <span className="font-medium">Completed: </span>
                              <span>{formatDate(delivery.completedAt)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats Summary */}
        {deliveries.length > 0 && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
              <p className="text-2xl font-bold text-gray-900">{deliveries.length}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
              <p className="text-2xl font-bold text-green-600">
                {deliveries.filter(d => d.status === 'completed').length}
              </p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {deliveries.filter(d => d.status === 'accepted').length}
              </p>
              <p className="text-sm text-gray-600">Accepted</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
              <p className="text-2xl font-bold text-red-600">
                {deliveries.filter(d => d.status === 'rejected').length}
              </p>
              <p className="text-sm text-gray-600">Rejected</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}