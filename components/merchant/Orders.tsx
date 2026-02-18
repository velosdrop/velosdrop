// components/merchant/Orders.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Search, Filter, Clock, CheckCircle, XCircle, Eye, 
  MoreVertical, Package, AlertCircle, ChevronRight,
  MapPin, Phone, User, Calendar, DollarSign, CreditCard
} from 'lucide-react';

interface Order {
  id: number;
  orderNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  items: Array<{
    productId: number;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
    options?: Array<{ name: string; choice: string; price?: number }>;
  }>;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: 'online' | 'cash_on_delivery';
  paymentStatus: 'pending' | 'paid' | 'failed';
  deliveryAddress: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';
  statusHistory: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
  customerNotes: string | null;
  estimatedPreparationTime: number | null;
  createdAt: string;
}

export default function OrdersComponent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  // Fetch orders on mount and when status changes
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('merchantToken');
      const response = await fetch('/api/merchant/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch orders');
      
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: Order['status'], note?: string) => {
    setUpdating(true);
    setError('');

    try {
      const token = localStorage.getItem('merchantToken');
      const response = await fetch(`/api/merchant/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus, note })
      });

      if (!response.ok) throw new Error('Failed to update order');

      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus }
          : order
      ));

      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }

    } catch (error) {
      console.error('Error updating order:', error);
      setError('Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const getNextStatus = (currentStatus: Order['status']): Order['status'] | null => {
    const flow: Record<Order['status'], Order['status'] | null> = {
      'pending': 'confirmed',
      'confirmed': 'preparing',
      'preparing': 'ready',
      'ready': 'picked_up',
      'picked_up': 'delivered',
      'delivered': null,
      'cancelled': null
    };
    return flow[currentStatus];
  };

  const getStatusColor = (status: Order['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      preparing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      ready: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      picked_up: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      delivered: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return colors[status];
  };

  const getStatusIcon = (status: Order['status']) => {
    switch(status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  // Filter orders based on status and search
  const filteredOrders = orders.filter(order => 
    (selectedStatus === 'all' || order.status === selectedStatus) &&
    (order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
     order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     order.customerPhone?.includes(searchTerm))
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-gray-100"></div>
          <div className="w-12 h-12 rounded-full border-2 border-purple-600 border-t-transparent animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 font-medium">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Orders</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-purple-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <button className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Status Filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {['all', 'pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-colors ${
              selectedStatus === status
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Orders Count */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Showing {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
      </p>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No orders found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Order Header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{order.orderNumber}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{order.customerName || 'Guest'}</span>
                        {order.customerPhone && (
                          <>
                            <Phone className="w-3 h-3 text-gray-400 ml-2" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">{order.customerPhone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">${order.totalAmount.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 justify-end">
                      <Calendar className="w-3 h-3" />
                      {formatTime(order.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Items Preview */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Items ({order.items.length})</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Subtotal: ${order.subtotal.toFixed(2)}</p>
                </div>
                <div className="space-y-2">
                  {order.items.slice(0, 2).map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      +{order.items.length - 2} more items
                    </p>
                  )}
                </div>
              </div>

              {/* Order Footer */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusColor(order.status)}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    order.paymentStatus === 'paid' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : order.paymentStatus === 'failed'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {order.paymentMethod === 'cash_on_delivery' ? 'COD' : order.paymentStatus}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Status Update Buttons */}
                  {getNextStatus(order.status) && (
                    <button
                      onClick={() => updateOrderStatus(order.id, getNextStatus(order.status)!)}
                      disabled={updating}
                      className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:bg-purple-300"
                    >
                      Mark {getNextStatus(order.status)?.replace('_', ' ')}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowOrderDetails(true);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Order {selectedOrder.orderNumber}
              </h2>
              <button onClick={() => setShowOrderDetails(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Customer Information</h3>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {selectedOrder.customerName || 'Guest'}
                  </p>
                  {selectedOrder.customerPhone && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {selectedOrder.customerPhone}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {selectedOrder.deliveryAddress}
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Qty: {item.quantity}</p>
                        {item.notes && (
                          <p className="text-xs text-gray-400 mt-1">Note: {item.notes}</p>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span className="text-gray-900 dark:text-white">${selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Delivery Fee</span>
                    <span className="text-gray-900 dark:text-white">${selectedOrder.deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span className="text-gray-900 dark:text-white">${selectedOrder.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-600 dark:text-gray-400">Payment Method</span>
                    <span className="text-gray-900 dark:text-white capitalize">
                      {selectedOrder.paymentMethod.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Payment Status</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      selectedOrder.paymentStatus === 'paid' 
                        ? 'bg-green-100 text-green-700'
                        : selectedOrder.paymentStatus === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {selectedOrder.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status History */}
              {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">Status History</h3>
                  <div className="space-y-2">
                    {selectedOrder.statusHistory.map((history, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-purple-600"></div>
                        <div>
                          <p className="text-gray-900 dark:text-white capitalize">{history.status.replace('_', ' ')}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(history.timestamp).toLocaleString()}
                          </p>
                          {history.note && (
                            <p className="text-xs text-gray-400 mt-1">Note: {history.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Notes */}
              {selectedOrder.customerNotes && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <span className="font-medium">Customer Note:</span> {selectedOrder.customerNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}