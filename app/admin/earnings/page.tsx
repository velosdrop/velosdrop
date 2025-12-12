//app/admin/earnings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Download,
  Filter,
  RefreshCw,
  BarChart3,
  PieChart,
  Package,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface EarningsData {
  totalEarnings: number;
  totalDeliveries: number;
  averageCommission: number;
  earningsByDate: Array<{
    date: string;
    earnings: number;
    deliveries: number;
  }>;
  recentEarnings: Array<{
    id: number;
    commission_amount: number;
    created_at: string;
    delivery_id: number;
    driver_id: number;
    customer_id: number;
    fare_amount: number;
  }>;
  trends: {
    today: number;
    yesterday: number;
    thisWeek: number;
    thisMonth: number;
  };
}

interface TimeFilter {
  label: string;
  value: string;
  startDate: Date;
}

export default function EarningsPage() {
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [mounted, setMounted] = useState(false);

  const timeFilters: TimeFilter[] = [
    { label: 'Today', value: 'today', startDate: new Date(new Date().setHours(0, 0, 0, 0)) },
    { label: 'This Week', value: 'week', startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    { label: 'This Month', value: 'month', startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    { label: 'This Year', value: 'year', startDate: new Date(new Date().getFullYear(), 0, 1) },
    { label: 'All Time', value: 'all', startDate: new Date(0) },
  ];

  useEffect(() => {
    setMounted(true);
    fetchEarnings();
  }, [timeFilter]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/earnings?timeRange=${timeFilter}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch earnings: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setEarningsData(data.data);
      } else {
        throw new Error(data.error || 'Failed to load earnings data');
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
      setError(error instanceof Error ? error.message : 'Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (loading && !earningsData) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-10 bg-gray-800 rounded-xl w-1/4 animate-pulse"></div>
          <div className="flex space-x-3">
            <div className="h-10 bg-gray-800 rounded-xl w-24 animate-pulse"></div>
            <div className="h-10 bg-gray-800 rounded-xl w-24 animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-800 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-1/3 mb-4"></div>
              <div className="h-8 bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !earningsData) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Earnings Dashboard</h1>
            <p className="text-purple-300">Track platform revenue and commission earnings</p>
          </div>
        </div>
        <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <div>
              <h3 className="text-red-400 font-medium">Error loading earnings data</h3>
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!earningsData) {
    return null;
  }

  const todayGrowth = calculateGrowth(earningsData.trends.today, earningsData.trends.yesterday);
  const weekGrowth = calculateGrowth(earningsData.trends.thisWeek, earningsData.trends.today * 7);
  const monthGrowth = calculateGrowth(earningsData.trends.thisMonth, earningsData.trends.today * 30);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">
            Earnings Dashboard
          </h1>
          <p className="text-purple-300 text-lg">Track platform revenue and commission earnings in real-time</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-gray-800 rounded-xl p-1 border border-purple-500/20">
            {timeFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setTimeFilter(filter.value)}
                className={`px-3 py-1 rounded-lg text-sm transition-all ${
                  timeFilter === filter.value
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchEarnings}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 rounded-xl border border-purple-500/20 text-purple-300 hover:border-purple-500/40 hover:text-purple-200 transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 rounded-xl border border-emerald-500/20 text-white hover:bg-emerald-700 transition-all duration-200">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
              {todayGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(todayGrowth).toFixed(1)}%</span>
            </div>
          </div>
          <div>
            <p className="text-purple-300 text-sm">Total Revenue</p>
            <p className="text-white text-2xl font-bold mt-2">
              {formatCurrency(earningsData.totalEarnings)}
            </p>
            <p className="text-emerald-300 text-xs mt-2">
              {earningsData.totalDeliveries.toLocaleString()} deliveries • {earningsData.averageCommission.toFixed(2)} avg/order
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-blue-500/20 p-6 hover:border-blue-500/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs">
              <TrendingUp className="w-3 h-3" />
              <span>+12.5%</span>
            </div>
          </div>
          <div>
            <p className="text-purple-300 text-sm">Today's Earnings</p>
            <p className="text-white text-2xl font-bold mt-2">
              {formatCurrency(earningsData.trends.today)}
            </p>
            <p className="text-blue-300 text-xs mt-2">
              {formatCurrency(earningsData.trends.yesterday)} yesterday
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-cyan-500/20 p-6 hover:border-cyan-500/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs">
              {weekGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(weekGrowth).toFixed(1)}%</span>
            </div>
          </div>
          <div>
            <p className="text-purple-300 text-sm">This Week</p>
            <p className="text-white text-2xl font-bold mt-2">
              {formatCurrency(earningsData.trends.thisWeek)}
            </p>
            <p className="text-cyan-300 text-xs mt-2">
              Weekly performance
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-orange-500/20 p-6 hover:border-orange-500/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <PieChart className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs">
              {monthGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(monthGrowth).toFixed(1)}%</span>
            </div>
          </div>
          <div>
            <p className="text-purple-300 text-sm">This Month</p>
            <p className="text-white text-2xl font-bold mt-2">
              {formatCurrency(earningsData.trends.thisMonth)}
            </p>
            <p className="text-orange-300 text-xs mt-2">
              Monthly revenue goal
            </p>
          </div>
        </div>
      </div>

      {/* Charts and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Earnings Chart */}
        <div className="lg:col-span-2 bg-gray-800 rounded-2xl border border-purple-500/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Earnings Over Time</h2>
            </div>
            <div className="text-sm text-purple-300">
              Last 30 days
            </div>
          </div>
          
          <div className="space-y-4">
            {earningsData.earningsByDate.length > 0 ? (
              <div className="h-64">
                {/* Simple bar chart representation */}
                <div className="flex items-end justify-between h-48 space-x-2 mt-4">
                  {earningsData.earningsByDate.slice(0, 10).map((day, index) => {
                    const maxEarning = Math.max(...earningsData.earningsByDate.map(d => d.earnings));
                    const height = maxEarning > 0 ? (day.earnings / maxEarning) * 100 : 0;
                    
                    return (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-lg transition-all duration-300 hover:opacity-80"
                             style={{ height: `${height}%` }}>
                        </div>
                        <div className="text-xs text-purple-300 mt-2 truncate w-full text-center">
                          {formatDate(day.date)}
                        </div>
                        <div className="text-xs text-white font-medium mt-1">
                          ${day.earnings.toFixed(0)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-purple-400 mx-auto mb-4 opacity-50" />
                <p className="text-purple-300">No earnings data available for this period</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Earnings */}
        <div className="bg-gray-800 rounded-2xl border border-purple-500/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Package className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Recent Commissions</h2>
            </div>
            <span className="text-sm text-purple-300">
              {earningsData.recentEarnings.length} transactions
            </span>
          </div>
          
          <div className="space-y-3">
            {earningsData.recentEarnings.length > 0 ? (
              earningsData.recentEarnings.slice(0, 5).map((earning) => (
                <div key={earning.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all duration-200">
                  <div>
                    <div className="text-white font-medium">Order #{earning.delivery_id}</div>
                    <div className="text-purple-300 text-sm">
                      Commission: <span className="text-emerald-400 font-medium">
                        {formatCurrency(earning.commission_amount)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white text-sm">
                      {new Date(earning.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-purple-300 text-xs">
                      Total: ${earning.fare_amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-purple-400 mx-auto mb-4 opacity-50" />
                <p className="text-purple-300">No recent commissions</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-purple-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Package className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="text-purple-300 text-sm">Total Deliveries</div>
              <div className="text-white text-xl font-bold">{earningsData.totalDeliveries.toLocaleString()}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-xl p-4 border border-emerald-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-purple-300 text-sm">Avg Commission</div>
              <div className="text-white text-xl font-bold">{formatCurrency(earningsData.averageCommission)}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-xl p-4 border border-cyan-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <CheckCircle className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="text-purple-300 text-sm">Success Rate</div>
              <div className="text-white text-xl font-bold">98.5%</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-xl p-4 border border-orange-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Clock className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <div className="text-purple-300 text-sm">Avg Processing</div>
              <div className="text-white text-xl font-bold">2.4min</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}