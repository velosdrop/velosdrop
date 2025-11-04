//app/admin/dashboard/page.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  Package, 
  Users, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  Car, 
  UserPlus,
  AlertCircle,
  Activity,
  BarChart3,
  Download,
  Eye,
  MoreHorizontal,
  MapPin,
  Shield,
  Settings,
  RefreshCw
} from 'lucide-react';

// Type definitions
type TrendType = 'up' | 'down' | 'neutral';
type ColorType = 'purple' | 'blue' | 'green' | 'orange' | 'cyan' | 'pink';
type HealthStatus = 'healthy' | 'degraded' | 'down';

interface DashboardStats {
  totalOrders: number;
  activeDrivers: number;
  totalCustomers: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  onlineDrivers: number;
  newCustomers: number;
}

interface Driver {
  id: number;
  firstName: string;
  lastName: string;
  isOnline: boolean;
  status: string;
  totalDeliveries: number;
  averageRating: number;
  totalEarnings: number;
  createdAt: string;
}

interface Customer {
  id: number;
  username: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

interface Order {
  id: string;
  customer: string;
  driver: string;
  status: string;
  amount: number;
  time: string;
  customerAvatar: string;
  driverAvatar: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    activeDrivers: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    onlineDrivers: 0,
    newCustomers: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [systemHealth, setSystemHealth] = useState({
    api: { status: 'healthy' as HealthStatus, responseTime: '45ms' },
    database: { status: 'healthy' as HealthStatus, connections: 42 },
    payments: { status: 'healthy' as HealthStatus, successRate: '99.8%' },
    notifications: { status: 'degraded' as HealthStatus, deliveryRate: '87%' }
  });
  const [performance, setPerformance] = useState({
    onTimeDelivery: 92,
    customerSatisfaction: 88,
    driverResponse: 95,
    orderCompletion: 89
  });
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    loadDashboardData();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching dashboard data...');
      
      // Fetch drivers data
      const driversResponse = await fetch('/api/admin/drivers');
      console.log('Drivers response status:', driversResponse.status);
      
      if (!driversResponse.ok) {
        throw new Error(`Drivers API returned ${driversResponse.status}: ${driversResponse.statusText}`);
      }
      
      const driversData = await driversResponse.json();
      console.log('Drivers data:', driversData);
      
      const drivers: Driver[] = driversData.drivers || [];
      console.log('Processed drivers:', drivers);

      // Fetch customers data
      const customersResponse = await fetch('/api/admin/customers');
      console.log('Customers response status:', customersResponse.status);
      
      if (!customersResponse.ok) {
        throw new Error(`Customers API returned ${customersResponse.status}: ${customersResponse.statusText}`);
      }
      
      const customersData = await customersResponse.json();
      console.log('Customers data:', customersData);
      
      // Handle both array and object responses
      let customers: Customer[] = [];
      if (Array.isArray(customersData)) {
        customers = customersData;
      } else if (customersData && Array.isArray(customersData.customers)) {
        customers = customersData.customers;
      } else if (customersData && customersData.error) {
        throw new Error(customersData.error);
      }
      
      console.log('Processed customers:', customers);

      // Calculate dynamic stats
      const onlineDrivers = drivers.filter(driver => driver.isOnline === true).length;
      const activeDrivers = drivers.filter(driver => 
        driver.status === 'active' || driver.status === 'approved'
      ).length;
      
      // Calculate new customers (last 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const newCustomers = customers.filter(customer => {
        try {
          return new Date(customer.createdAt) > twentyFourHoursAgo;
        } catch {
          return false;
        }
      }).length;

      // Calculate total revenue from drivers' earnings
      const totalRevenue = drivers.reduce((sum, driver) => sum + (Number(driver.totalEarnings) || 0), 0);
      
      // Calculate total orders from customers
      const totalOrders = customers.reduce((sum, customer) => sum + (Number(customer.totalOrders) || 0), 0);

      // For demo purposes, we'll calculate some derived stats
      const completedOrders = Math.floor(totalOrders * 0.8); // 80% completion rate
      const pendingOrders = Math.max(0, totalOrders - completedOrders);

      const dynamicStats: DashboardStats = {
        totalOrders,
        activeDrivers,
        totalCustomers: customers.length,
        totalRevenue,
        pendingOrders,
        completedOrders,
        onlineDrivers,
        newCustomers
      };

      console.log('Calculated stats:', dynamicStats);
      setStats(dynamicStats);

      // Generate recent orders from the data
      const mockRecentOrders = generateRecentOrders(drivers, customers);
      setRecentOrders(mockRecentOrders);

      // Update last updated time
      setLastUpdated(new Date().toLocaleTimeString());

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to generate recent orders (replace with actual orders API)
  const generateRecentOrders = (drivers: Driver[], customers: Customer[]): Order[] => {
    if (customers.length === 0) {
      return [];
    }
    
    const statuses = ['delivered', 'in_progress', 'pending'];
    return customers.slice(0, 5).map((customer, index) => {
      const driver = drivers[index % drivers.length];
      const status = statuses[index % statuses.length];
      const amount = 15 + (index * 5) + Math.random() * 10;
      
      return {
        id: `ORD-${1000 + index}`,
        customer: customer.username || `Customer ${customer.id}`,
        driver: driver ? `${driver.firstName} ${driver.lastName}` : 'Unassigned',
        status,
        amount: Math.round(amount * 100) / 100,
        time: `${5 + index * 5} min ago`,
        customerAvatar: customer.username ? customer.username.charAt(0).toUpperCase() : 'C',
        driverAvatar: driver ? (driver.firstName?.charAt(0) || '') + (driver.lastName?.charAt(0) || '') : 'U'
      };
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-emerald-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending': return 'bg-amber-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'delivered': return 'Delivered';
      case 'in_progress': return 'In Progress';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-emerald-500';
      case 'degraded': return 'bg-amber-500';
      case 'down': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (loading && stats.totalCustomers === 0 && stats.activeDrivers === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-purple-300">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-purple-300 text-lg">Welcome back! Here's what's happening with your delivery platform.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 rounded-xl border border-purple-500/20 text-purple-300 hover:border-purple-500/40 hover:text-purple-200 transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <div className="flex items-center space-x-3 px-4 py-2 bg-gray-800 rounded-xl border border-purple-500/20">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-purple-300 text-sm">Live</span>
            <span className="text-gray-400">•</span>
            <span className="text-purple-300 text-sm">Last updated: {lastUpdated}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-red-400 font-medium">Error loading data</p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}
      {/* Quick Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/drivers"
          className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl group"
        >
          <div className="p-3 bg-white/20 rounded-lg group-hover:scale-110 transition-transform duration-300">
            <Car className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-lg">Drivers Management</div>
            <div className="text-purple-200 text-sm">Manage and monitor drivers</div>
          </div>
          <TrendingUp className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform duration-300" />
        </Link>

        <Link
          href="/admin/orders"
          className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl group"
        >
          <div className="p-3 bg-white/20 rounded-lg group-hover:scale-110 transition-transform duration-300">
            <Package className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-lg">Orders</div>
            <div className="text-blue-200 text-sm">View all delivery requests</div>
          </div>
          <TrendingUp className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform duration-300" />
        </Link>

        <Link
          href="/admin/customers"
          className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 text-white hover:from-cyan-700 hover:to-cyan-800 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl group"
        >
          <div className="p-3 bg-white/20 rounded-lg group-hover:scale-110 transition-transform duration-300">
            <Users className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-lg">Customers</div>
            <div className="text-cyan-200 text-sm">Manage customer accounts</div>
          </div>
          <TrendingUp className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform duration-300" />
        </Link>

        <Link
          href="/admin/analytics"
          className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl group"
        >
          <div className="p-3 bg-white/20 rounded-lg group-hover:scale-110 transition-transform duration-300">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-lg">Analytics</div>
            <div className="text-emerald-200 text-sm">View detailed reports</div>
          </div>
          <TrendingUp className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform duration-300" />
        </Link>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Orders"
          value={stats.totalOrders.toLocaleString()}
          change="+12%"
          trend="up"
          icon={<Package className="w-6 h-6" />}
          color="purple"
          delay={100}
        />
        <StatsCard
          title="Active Drivers"
          value={stats.activeDrivers.toString()}
          change="+5%"
          trend="up"
          icon={<Car className="w-6 h-6" />}
          color="blue"
          delay={200}
        />
        <StatsCard
          title="Total Customers"
          value={stats.totalCustomers.toLocaleString()}
          change="+8%"
          trend="up"
          icon={<Users className="w-6 h-6" />}
          color="cyan"
          delay={300}
        />
        <StatsCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          change="+15%"
          trend="up"
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
          delay={400}
        />
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStatsCard
          title="Pending"
          value={stats.pendingOrders.toString()}
          icon={<Clock className="w-4 h-4" />}
          color="orange"
        />
        <MiniStatsCard
          title="Completed"
          value={stats.completedOrders.toString()}
          icon={<CheckCircle className="w-4 h-4" />}
          color="green"
        />
        <MiniStatsCard
          title="Online"
          value={stats.onlineDrivers.toString()}
          icon={<div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
          color="blue"
        />
        <MiniStatsCard
          title="New Customers"
          value={stats.newCustomers.toString()}
          icon={<UserPlus className="w-4 h-4" />}
          color="pink"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-gray-800 rounded-2xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300 group">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Package className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Recent Orders</h2>
              </div>
              <Link 
                href="/admin/orders"
                className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors duration-200 group-hover:translate-x-1"
              >
                <span>View All</span>
                <TrendingUp className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentOrders.length > 0 ? (
                recentOrders.map((order, index) => (
                  <OrderItem 
                    key={order.id} 
                    order={order} 
                    delay={index * 100}
                  />
                ))
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-purple-400 mx-auto mb-4 opacity-50" />
                  <p className="text-purple-300">No recent orders</p>
                </div>
              )}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-gray-800 rounded-2xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Performance Metrics</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MetricCard
                label="On-time Delivery"
                percentage={performance.onTimeDelivery}
                value={`${performance.onTimeDelivery}%`}
                color="green"
                icon={<CheckCircle className="w-4 h-4" />}
              />
              <MetricCard
                label="Customer Satisfaction"
                percentage={performance.customerSatisfaction}
                value={`${performance.customerSatisfaction}%`}
                color="blue"
                icon={<Users className="w-4 h-4" />}
              />
              <MetricCard
                label="Driver Response Rate"
                percentage={performance.driverResponse}
                value={`${performance.driverResponse}%`}
                color="purple"
                icon={<Car className="w-4 h-4" />}
              />
              <MetricCard
                label="Order Completion"
                percentage={performance.orderCompletion}
                value={`${performance.orderCompletion}%`}
                color="cyan"
                icon={<Package className="w-4 h-4" />}
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* System Health */}
          <div className="bg-gray-800 rounded-2xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">System Health</h2>
            </div>
            <div className="space-y-4">
              {Object.entries(systemHealth).map(([service, data]) => (
                <HealthItem 
                  key={service} 
                  service={service} 
                  data={data} 
                />
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-800 rounded-2xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Quick Actions</h2>
            </div>
            <div className="space-y-3">
              <ActionButton
                title="View All Orders"
                description="Manage delivery requests"
                icon={<Package className="w-4 h-4" />}
                color="purple"
                onClick={() => window.location.href = '/admin/orders'}
              />
              <ActionButton
                title="Driver Management"
                description="Approve and manage drivers"
                icon={<Car className="w-4 h-4" />}
                color="blue"
                onClick={() => window.location.href = '/admin/drivers'}
              />
              <ActionButton
                title="Customer Management"
                description="Manage customer accounts"
                icon={<Users className="w-4 h-4" />}
                color="cyan"
                onClick={() => window.location.href = '/admin/customers'}
              />
              <ActionButton
                title="Generate Reports"
                description="Download analytics"
                icon={<Download className="w-4 h-4" />}
                color="green"
                onClick={() => {/* Generate reports */}}
              />
              <ActionButton
                title="Live Tracking"
                description="Monitor active deliveries"
                icon={<Eye className="w-4 h-4" />}
                color="orange"
                onClick={() => {/* Navigate to tracking */}}
              />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-800 rounded-2xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Activity className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Recent Activity</h2>
            </div>
            <div className="space-y-4">
              <ActivityItem time="2 min ago" action="New order placed" user="John Doe" />
              <ActivityItem time="5 min ago" action="Driver assigned" user="Mike Johnson" />
              <ActivityItem time="10 min ago" action="Delivery completed" user="Sarah Wilson" />
              <ActivityItem time="15 min ago" action="New driver registered" user="Alex Chen" />
              <ActivityItem time="20 min ago" action="Customer signed up" user="Emily Davis" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  trend: TrendType;
  icon: React.ReactNode;
  color: ColorType;
  delay?: number;
}

function StatsCard({ title, value, change, trend, icon, color, delay = 0 }: StatsCardProps) {
  const colorClasses: Record<ColorType, { bg: string; icon: string }> = {
    purple: { 
      bg: 'from-purple-600 to-purple-700', 
      icon: 'bg-purple-500/20 text-purple-400' 
    },
    blue: { 
      bg: 'from-blue-600 to-blue-700', 
      icon: 'bg-blue-500/20 text-blue-400' 
    },
    green: { 
      bg: 'from-emerald-600 to-emerald-700', 
      icon: 'bg-emerald-500/20 text-emerald-400' 
    },
    orange: { 
      bg: 'from-orange-600 to-orange-700', 
      icon: 'bg-orange-500/20 text-orange-400' 
    },
    cyan: { 
      bg: 'from-cyan-600 to-cyan-700', 
      icon: 'bg-cyan-500/20 text-cyan-400' 
    },
    pink: { 
      bg: 'from-pink-600 to-pink-700', 
      icon: 'bg-pink-500/20 text-pink-400' 
    }
  };

  const trendIcons: Record<TrendType, React.ReactNode> = {
    up: <TrendingUp className="w-4 h-4" />,
    down: <TrendingUp className="w-4 h-4 rotate-180" />,
    neutral: <div className="w-4 h-4">→</div>
  };

  const trendColors: Record<TrendType, string> = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    neutral: 'text-amber-400'
  };

  return (
    <div 
      className="group relative overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative bg-gray-800 rounded-2xl border border-purple-500/20 p-6 group-hover:border-purple-500/40 group-hover:scale-[1.02] transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <p className="text-purple-300 text-sm font-medium">{title}</p>
            <p className="text-white font-bold text-3xl">{value}</p>
            <div className={`flex items-center space-x-2 ${trendColors[trend]}`}>
              {trendIcons[trend]}
              <span className="text-sm font-medium">{change}</span>
              <span className="text-purple-300 text-xs">from yesterday</span>
            </div>
          </div>
          <div className={`p-3 rounded-xl ${colorClasses[color].icon} group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

// Mini Stats Card Component
interface MiniStatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: ColorType;
}

function MiniStatsCard({ title, value, icon, color }: MiniStatsCardProps) {
  const colorClasses: Record<ColorType, string> = {
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-purple-500/20 p-4 hover:border-purple-500/40 transition-all duration-200 group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-purple-300 text-xs font-medium">{title}</p>
          <p className="text-white font-bold text-xl group-hover:scale-110 transition-transform duration-200">{value}</p>
        </div>
        <div className={`p-2 rounded-lg border ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Order Item Component
interface OrderItemProps {
  order: Order;
  delay: number;
}

function OrderItem({ order, delay }: OrderItemProps) {
  return (
    <div 
      className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all duration-200 group hover:translate-x-1"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center space-x-4">
        <div className={`w-3 h-3 rounded-full ${getStatusColor(order.status)} animate-pulse`}></div>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 text-xs font-medium">
            {order.customerAvatar}
          </div>
          <div>
            <div className="text-white font-medium">{order.id}</div>
            <div className="text-purple-300 text-sm">{order.customer}</div>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="text-right">
          <div className="text-white font-semibold">${order.amount}</div>
          <div className="text-purple-300 text-sm">{order.time}</div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>
    </div>
  );
}

// Health Item Component
interface HealthItemProps {
  service: string;
  data: any;
}

function HealthItem({ service, data }: HealthItemProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all duration-200">
      <div className="flex items-center space-x-3">
        <div className={`w-2 h-2 rounded-full ${getHealthColor(data.status)} animate-pulse`}></div>
        <span className="text-purple-300 capitalize font-medium">{service}</span>
      </div>
      <div className="flex items-center space-x-3">
        <span className="text-white text-sm">
          {service === 'api' && data.responseTime}
          {service === 'database' && `${data.connections} conn`}
          {service === 'payments' && data.successRate}
          {service === 'notifications' && data.deliveryRate}
        </span>
        <span className={`text-xs px-2 py-1 rounded-full ${
          data.status === 'healthy' ? 'bg-emerald-500/20 text-emerald-400' :
          data.status === 'degraded' ? 'bg-amber-500/20 text-amber-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {data.status}
        </span>
      </div>
    </div>
  );
}

// Action Button Component
interface ActionButtonProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: ColorType;
  onClick: () => void;
}

function ActionButton({ title, description, icon, color, onClick }: ActionButtonProps) {
  const colorClasses: Record<ColorType, string> = {
    purple: 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20 text-purple-400',
    blue: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 text-blue-400',
    green: 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400',
    orange: 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20 text-orange-400',
    cyan: 'bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20 text-cyan-400',
    pink: 'bg-pink-500/10 border-pink-500/20 hover:bg-pink-500/20 text-pink-400'
  };

  return (
    <button 
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] hover:border-current/40 ${colorClasses[color]}`}
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-current/20">
          {icon}
        </div>
        <div>
          <div className="text-white font-medium">{title}</div>
          <div className="text-current/80 text-sm">{description}</div>
        </div>
      </div>
    </button>
  );
}

// Metric Card Component
interface MetricCardProps {
  label: string;
  percentage: number;
  value: string;
  color: ColorType;
  icon: React.ReactNode;
}

function MetricCard({ label, percentage, value, color, icon }: MetricCardProps) {
  const colorClasses: Record<ColorType, string> = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    orange: 'bg-orange-500',
    cyan: 'bg-cyan-500',
    pink: 'bg-pink-500'
  };

  return (
    <div className="bg-gray-700/30 rounded-xl p-4 hover:bg-gray-700/50 transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-purple-300 text-sm font-medium">{label}</span>
        <div className="text-white font-bold text-lg">{value}</div>
      </div>
      <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
        <div 
          className={`h-2 rounded-full ${colorClasses[color]} transition-all duration-1000 ease-out`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1 text-purple-300">
          {icon}
          <span>Performance</span>
        </div>
        <span className="text-white">{percentage}%</span>
      </div>
    </div>
  );
}

// Activity Item Component
interface ActivityItemProps {
  time: string;
  action: string;
  user: string;
}

function ActivityItem({ time, action, user }: ActivityItemProps) {
  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all duration-200 group">
      <div className="w-2 h-2 bg-purple-500 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm truncate">{action}</div>
        <div className="text-purple-300 text-xs truncate">{user}</div>
      </div>
      <div className="text-purple-400 text-xs whitespace-nowrap">{time}</div>
    </div>
  );
}

// Helper function to get status color
function getStatusColor(status: string): string {
  switch (status) {
    case 'delivered': return 'bg-emerald-500';
    case 'in_progress': return 'bg-blue-500';
    case 'pending': return 'bg-amber-500';
    default: return 'bg-gray-500';
  }
}

// Helper function to get health color
function getHealthColor(health: string): string {
  switch (health) {
    case 'healthy': return 'bg-emerald-500';
    case 'degraded': return 'bg-amber-500';
    case 'down': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}