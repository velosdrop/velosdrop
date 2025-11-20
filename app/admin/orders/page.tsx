// app/admin/orders/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  MoreHorizontal, 
  MapPin, 
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  User,
  DollarSign,
  Navigation,
  AlertCircle,
  Download,
  BarChart3,
  Shield,
  TrendingUp,
  Users,
  Car,
  FileText,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPubNubInstance, CHANNELS, MESSAGE_TYPES } from '@/lib/pubnub-booking';

interface Order {
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
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'expired' | 'in_progress' | 'picked_up';
  assignedDriverId?: number;
  driverName?: string;
  driverPhoneNumber?: string;
  driverProfilePictureUrl?: string;
  createdAt: string;
  expiresAt?: string;
  respondedAt?: string;
  completedAt?: string;
  estimatedDuration?: number;
  actualDuration?: number;
}

interface OrderStats {
  total: number;
  pending: number;
  accepted: number;
  inProgress: number;
  completed: number;
  rejected: number;
  expired: number;
  totalRevenue: number;
  averageFare: number;
}

// Helper functions defined at the top level
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'from-amber-500 to-amber-600';
    case 'accepted': return 'from-blue-500 to-blue-600';
    case 'in_progress': return 'from-purple-500 to-purple-600';
    case 'picked_up': return 'from-indigo-500 to-indigo-600';
    case 'completed': return 'from-emerald-500 to-emerald-600';
    case 'rejected': return 'from-red-500 to-red-600';
    case 'expired': return 'from-gray-500 to-gray-600';
    default: return 'from-gray-500 to-gray-600';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return <Clock className="w-4 h-4" />;
    case 'accepted': return <CheckCircle className="w-4 h-4" />;
    case 'in_progress': return <Navigation className="w-4 h-4" />;
    case 'picked_up': return <Package className="w-4 h-4" />;
    case 'completed': return <CheckCircle className="w-4 h-4" />;
    case 'rejected': return <XCircle className="w-4 h-4" />;
    case 'expired': return <Clock className="w-4 h-4" />;
    default: return <Package className="w-4 h-4" />;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return 'Pending';
    case 'accepted': return 'Accepted';
    case 'in_progress': return 'In Progress';
    case 'picked_up': return 'Picked Up';
    case 'completed': return 'Completed';
    case 'rejected': return 'Rejected';
    case 'expired': return 'Expired';
    default: return status;
  }
};

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatTimeWithSeconds = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    accepted: 0,
    inProgress: 0,
    completed: 0,
    rejected: 0,
    expired: 0,
    totalRevenue: 0,
    averageFare: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);

  // Load orders data
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/orders');
      
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        calculateStats(data.orders || []);
      } else {
        console.error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
      setLastUpdated(new Date().toLocaleTimeString());
    }
  }, []);

  // Calculate statistics
  const calculateStats = (ordersData: Order[]) => {
    const stats: OrderStats = {
      total: ordersData.length,
      pending: ordersData.filter(o => o.status === 'pending').length,
      accepted: ordersData.filter(o => o.status === 'accepted').length,
      inProgress: ordersData.filter(o => o.status === 'in_progress' || o.status === 'picked_up').length,
      completed: ordersData.filter(o => o.status === 'completed').length,
      rejected: ordersData.filter(o => o.status === 'rejected').length,
      expired: ordersData.filter(o => o.status === 'expired').length,
      totalRevenue: ordersData.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.fare, 0),
      averageFare: 0
    };

    const completedOrders = ordersData.filter(o => o.status === 'completed');
    stats.averageFare = completedOrders.length > 0 ? stats.totalRevenue / completedOrders.length : 0;
    
    setStats(stats);
  };

  // Filter orders based on search and filters
  useEffect(() => {
    let filtered = orders;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.customerUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.dropoffLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.packageDetails?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Date filter
    if (dateFilter === 'today') {
      const today = new Date();
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.toDateString() === today.toDateString();
      });
    } else if (dateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(order => new Date(order.createdAt) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(order => new Date(order.createdAt) >= monthAgo);
    }

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter, dateFilter]);

  // Real-time updates with PubNub
  useEffect(() => {
    loadOrders();

    if (realtimeEnabled) {
      const pubnub = getPubNubInstance();
      
      // Subscribe to order updates channel
      const channels = [CHANNELS.drivers, 'admin_orders'];
      
      const listener = {
        message: (messageEvent: any) => {
          if (messageEvent.channel === CHANNELS.drivers || messageEvent.channel === 'admin_orders') {
            const message = messageEvent.message;
            
            // Handle different message types
            if (message.type === MESSAGE_TYPES.BOOKING_ACCEPTED || 
                message.type === MESSAGE_TYPES.BOOKING_REJECTED ||
                message.type === MESSAGE_TYPES.REQUEST_ACCEPTED) {
              
              // Refresh orders to get latest status
              loadOrders();
              setLastUpdated(new Date().toLocaleTimeString());
            }
          }
        }
      };

      pubnub.addListener(listener);
      pubnub.subscribe({ channels });

      return () => {
        pubnub.unsubscribe({ channels });
        pubnub.removeListener(listener);
      };
    }
  }, [loadOrders, realtimeEnabled]);

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const exportOrders = () => {
    const csv = [
      ['Order ID', 'Customer', 'Driver', 'Pickup', 'Dropoff', 'Fare', 'Status', 'Created'],
      ...filteredOrders.map(order => [
        order.id,
        order.customerUsername,
        order.driverName || 'Unassigned',
        order.pickupLocation,
        order.dropoffLocation,
        `$${order.fare}`,
        getStatusText(order.status),
        new Date(order.createdAt).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
            Order Management
          </h1>
          <p className="text-gray-400 text-lg">
            Monitor and manage delivery operations in real-time
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all duration-200 ${
            realtimeEnabled 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-gray-800 border-gray-700 text-gray-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${realtimeEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-sm font-medium">
              {realtimeEnabled ? 'Live' : 'Paused'}
            </span>
          </div>
          
          <button
            onClick={() => setRealtimeEnabled(!realtimeEnabled)}
            className="p-3 bg-gray-800 rounded-xl border border-gray-700 text-gray-400 hover:border-purple-500/40 hover:text-purple-400 transition-all duration-200"
            title={realtimeEnabled ? 'Pause real-time updates' : 'Enable real-time updates'}
          >
            <RefreshCw className={`w-4 h-4 ${realtimeEnabled ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={loadOrders}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 shadow-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="font-medium">Refresh</span>
          </button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <StatCard
          title="Total Orders"
          value={stats.total}
          change="+12%"
          trend="up"
          color="purple"
          icon={<Package className="w-5 h-5" />}
          delay={100}
        />
        <StatCard
          title="Active"
          value={stats.accepted + stats.inProgress}
          change="+8%"
          trend="up"
          color="blue"
          icon={<Navigation className="w-5 h-5" />}
          delay={200}
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          change="+5%"
          trend="up"
          color="amber"
          icon={<Clock className="w-5 h-5" />}
          delay={300}
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          change="+15%"
          trend="up"
          color="emerald"
          icon={<CheckCircle className="w-5 h-5" />}
          delay={400}
        />
        <StatCard
          title="Revenue"
          value={`$${stats.totalRevenue.toFixed(0)}`}
          change="+18%"
          trend="up"
          color="green"
          icon={<DollarSign className="w-5 h-5" />}
          delay={500}
        />
        <StatCard
          title="Avg Fare"
          value={`$${stats.averageFare.toFixed(2)}`}
          change="+3%"
          trend="up"
          color="cyan"
          icon={<BarChart3 className="w-5 h-5" />}
          delay={600}
        />
        <StatCard
          title="Rejected"
          value={stats.rejected}
          change="+2%"
          trend="neutral"
          color="red"
          icon={<XCircle className="w-5 h-5" />}
          delay={700}
        />
        <StatCard
          title="Expired"
          value={stats.expired}
          change="-5%"
          trend="down"
          color="gray"
          icon={<Clock className="w-5 h-5" />}
          delay={800}
        />
      </div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6 backdrop-blur-sm"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search orders by customer, location, driver, or package..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 backdrop-blur-sm"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full lg:w-64">
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white appearance-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 backdrop-blur-sm"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="in_progress">In Progress</option>
                <option value="picked_up">Picked Up</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Date Filter */}
          <div className="w-full lg:w-48">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white appearance-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 backdrop-blur-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Orders Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden backdrop-blur-sm"
      >
        <div className="p-6 border-b border-gray-700">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">
                Delivery Requests
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                {filteredOrders.length} orders found • Last updated: {lastUpdated}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={exportOrders}
                className="flex items-center space-x-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200 border border-gray-600"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">Export</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-900/20">
                <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm uppercase tracking-wider">Order</th>
                <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm uppercase tracking-wider">Customer</th>
                <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm uppercase tracking-wider">Driver</th>
                <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm uppercase tracking-wider">Route</th>
                <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm uppercase tracking-wider">Fare</th>
                <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm uppercase tracking-wider">Created</th>
                <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    {Array.from({ length: 8 }).map((_, cellIndex) => (
                      <td key={cellIndex} className="py-5 px-6">
                        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg font-medium">No orders found</p>
                    <p className="text-gray-500 text-sm mt-2">
                      {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'No delivery requests yet'}
                    </p>
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {filteredOrders.map((order, index) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-700/30 transition-colors duration-200 group"
                    >
                      <OrderRow 
                        order={order} 
                        onView={() => handleViewOrder(order)}
                      />
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {showOrderModal && selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={() => setShowOrderModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Order Row Component
function OrderRow({ order, onView }: { order: Order; onView: () => void }) {
  return (
    <>
      <td className="py-4 px-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-semibold">#{order.id}</div>
            <div className="text-gray-400 text-xs">{order.distance} km</div>
          </div>
        </div>
      </td>
      
      <td className="py-4 px-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-lg">
            {order.customerUsername.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-white font-medium">{order.customerUsername}</div>
            <div className="text-gray-400 text-xs">{order.customerPhoneNumber}</div>
          </div>
        </div>
      </td>
      
      <td className="py-4 px-6">
        {order.driverName ? (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-lg">
              {order.driverName.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="text-white font-medium">{order.driverName}</div>
              <div className="text-gray-400 text-xs">{order.driverPhoneNumber}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-amber-400">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Awaiting driver</span>
          </div>
        )}
      </td>
      
      <td className="py-4 px-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-white text-sm truncate max-w-xs">{order.pickupLocation}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-gray-400 text-sm truncate max-w-xs">{order.dropoffLocation}</span>
          </div>
        </div>
      </td>
      
      <td className="py-4 px-6">
        <div className="text-white font-bold text-lg">${order.fare.toFixed(2)}</div>
      </td>
      
      <td className="py-4 px-6">
        <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${getStatusColor(order.status)} shadow-lg`}>
          {getStatusIcon(order.status)}
          <span>{getStatusText(order.status)}</span>
        </div>
      </td>
      
      <td className="py-4 px-6">
        <div className="text-white text-sm font-medium">{formatTime(order.createdAt)}</div>
        <div className="text-gray-400 text-xs">{formatDate(order.createdAt)}</div>
      </td>
      
      <td className="py-4 px-6">
        <div className="flex items-center space-x-2">
          <button
            onClick={onView}
            className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-500/20 rounded-lg transition-all duration-200 transform hover:scale-110"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-all duration-200 transform hover:scale-110 opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </td>
    </>
  );
}

// Enhanced Stat Card Component
interface StatCardProps {
  title: string;
  value: number | string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  color: string;
  delay?: number;
}

function StatCard({ title, value, change, trend, icon, color, delay = 0 }: StatCardProps) {
  const colorClasses = {
    purple: 'from-purple-500 to-purple-600',
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-amber-600',
    emerald: 'from-emerald-500 to-emerald-600',
    green: 'from-green-500 to-green-600',
    cyan: 'from-cyan-500 to-cyan-600',
    red: 'from-red-500 to-red-600',
    gray: 'from-gray-500 to-gray-600'
  };

  const trendIcons = {
    up: <TrendingUp className="w-4 h-4" />,
    down: <TrendingUp className="w-4 h-4 rotate-180" />,
    neutral: <div className="w-4 h-4">→</div>
  };

  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    neutral: 'text-amber-400'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000 }}
      className="group relative overflow-hidden"
    >
      <div className="relative bg-gray-800/50 rounded-2xl border border-gray-700 p-6 backdrop-blur-sm hover:border-purple-500/40 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <p className="text-gray-400 text-sm font-medium">{title}</p>
            <p className="text-white font-bold text-2xl">{value}</p>
            <div className={`flex items-center space-x-2 ${trendColors[trend]}`}>
              {trendIcons[trend]}
              <span className="text-sm font-medium">{change}</span>
            </div>
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses]} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Enhanced Order Details Modal Component
function OrderDetailsModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-800 rounded-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Order Details</h2>
              <p className="text-purple-100">Order #{order.id} • {formatDate(order.createdAt)}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white transition-colors hover:bg-white/10 rounded-lg"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Customer Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-3">
                Customer Information
              </h3>
              <InfoRow label="Name" value={order.customerUsername} />
              <InfoRow label="Phone" value={order.customerPhoneNumber} />
              <InfoRow label="Customer ID" value={`#${order.customerId}`} />
            </div>

            {/* Driver Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-3">
                Driver Information
              </h3>
              {order.driverName ? (
                <>
                  <InfoRow label="Driver" value={order.driverName} />
                  <InfoRow label="Phone" value={order.driverPhoneNumber || 'N/A'} />
                  <InfoRow label="Driver ID" value={`#${order.assignedDriverId}`} />
                </>
              ) : (
                <div className="flex items-center space-x-3 text-amber-400 py-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Awaiting driver assignment</span>
                </div>
              )}
            </div>

            {/* Delivery Details */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-3">
                Delivery Details
              </h3>
              <InfoRow label="Pickup Location" value={order.pickupLocation} />
              <InfoRow label="Dropoff Location" value={order.dropoffLocation} />
              <InfoRow label="Distance" value={`${order.distance} km`} />
              <InfoRow label="Fare" value={`$${order.fare.toFixed(2)}`} />
            </div>

            {/* Status & Timestamps */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-3">
                Order Status
              </h3>
              <InfoRow label="Status" value={getStatusText(order.status)} />
              <InfoRow label="Created" value={formatTimeWithSeconds(order.createdAt)} />
              {order.respondedAt && <InfoRow label="Responded" value={formatTimeWithSeconds(order.respondedAt)} />}
              {order.completedAt && <InfoRow label="Completed" value={formatTimeWithSeconds(order.completedAt)} />}
              {order.expiresAt && <InfoRow label="Expires" value={formatTimeWithSeconds(order.expiresAt)} />}
            </div>
          </div>

          {/* Package Details */}
          {order.packageDetails && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-3">
                Package Details
              </h3>
              <div className="bg-gray-700/30 rounded-xl p-4 border border-gray-600">
                <p className="text-white whitespace-pre-wrap">{order.packageDetails}</p>
              </div>
            </div>
          )}

          {/* Recipient Information */}
          {order.recipientPhoneNumber && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-3">
                Recipient Information
              </h3>
              <InfoRow label="Recipient Phone" value={order.recipientPhoneNumber} />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-750 p-6 border-t border-gray-700">
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors font-medium"
            >
              Close
            </button>
            <button className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg">
              Take Action
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Helper Components
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-700/50">
      <span className="text-gray-400 font-medium">{label}</span>
      <span className="text-white font-semibold">{value}</span>
    </div>
  );
}