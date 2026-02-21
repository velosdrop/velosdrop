// components/merchant/Overview.tsx
'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, DollarSign, Clock, Package, TrendingUp, Users, AlertCircle } from 'lucide-react';
import Image from 'next/image';

interface OverviewStats {
  todayOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  totalProducts: number;
  totalCustomers: number;
  avgOrderValue: number;
  revenueChange: number;
  ordersChange: number;
}

interface RecentOrder {
  id: number;
  orderNumber: string;
  items: any[];
  totalAmount: number;
  status: string;
  createdAt: string;
  customerName: string | null;
}

interface PopularItem {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  orderCount: number;
}

export default function Overview({ merchant }: { merchant: any }) {
  const [stats, setStats] = useState<OverviewStats>({
    todayOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    avgOrderValue: 0,
    revenueChange: 0,
    ordersChange: 0
  });
  
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [popularItems, setPopularItems] = useState<PopularItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    try {
      const token = localStorage.getItem('merchantToken');
      
      if (!token) {
        setError('Authentication token not found');
        setLoading(false);
        return;
      }

      // Fetch dashboard stats
      const statsResponse = await fetch('/api/merchant/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!statsResponse.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const statsData = await statsResponse.json();
      
      setStats({
        todayOrders: statsData.todayOrders || 0,
        totalRevenue: statsData.totalRevenue || 0,
        pendingOrders: statsData.pendingOrders || 0,
        totalProducts: statsData.totalProducts || 0,
        totalCustomers: statsData.totalCustomers || 0,
        avgOrderValue: statsData.avgOrderValue || 0,
        revenueChange: statsData.revenueChange || 0,
        ordersChange: statsData.ordersChange || 0
      });

      setRecentOrders(statsData.recentOrders || []);
      setPopularItems(statsData.popularItems || []);

    } catch (error) {
      console.error('Error fetching overview data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
      confirmed: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      preparing: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      ready: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
      picked_up: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
      delivered: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
      cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
    };
    return colors[status as keyof typeof colors] || colors.pending;
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-gray-100"></div>
          <div className="w-12 h-12 rounded-full border-2 border-purple-600 border-t-transparent animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button 
            onClick={fetchOverviewData}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Welcome back, {merchant?.ownerName?.split(' ')[0] || 'Merchant'}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Here's what's happening with your business today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Today's Orders */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            {stats.ordersChange !== 0 && (
              <span className={`text-xs ${stats.ordersChange > 0 ? 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400' : 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400'} px-2 py-1 rounded-full`}>
                {stats.ordersChange > 0 ? '+' : ''}{stats.ordersChange}%
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Today's Orders</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.todayOrders}</p>
        </div>

        {/* Revenue */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            {stats.revenueChange !== 0 && (
              <span className={`text-xs ${stats.revenueChange > 0 ? 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400' : 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400'} px-2 py-1 rounded-full`}>
                {stats.revenueChange > 0 ? '+' : ''}{stats.revenueChange}%
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Revenue (Today)</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatCurrency(stats.totalRevenue)}</p>
        </div>

        {/* Pending Orders */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Pending Orders</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.pendingOrders}</p>
        </div>

        {/* Total Products */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Products</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalProducts}</p>
        </div>

        {/* Total Customers */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Customers</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalCustomers}</p>
        </div>

        {/* Average Order Value */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Order Value</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatCurrency(stats.avgOrderValue)}</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Orders</h2>
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No recent orders</p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{order.orderNumber}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {order.items?.length || 0} items • {formatCurrency(order.totalAmount)}
                      <span className="ml-2 text-xs text-gray-400">{formatTime(order.createdAt)}</span>
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusColor(order.status)}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Popular Items */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Popular Items Today</h2>
          {popularItems.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No items sold today</p>
          ) : (
            <div className="space-y-4">
              {popularItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600/20 to-indigo-600/20 flex items-center justify-center text-lg">
                          🍽️
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.orderCount} orders today</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(item.price)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}