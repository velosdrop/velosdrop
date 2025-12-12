//app/admin/analytics/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign, 
  MapPin, 
  Calendar,
  Download,
  Filter,
  RefreshCw,
  PieChart,
  Clock,
  Star,
  CheckCircle2,
  AlertCircle,
  Car,
  Activity,
  Target,
  Zap,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  MoreVertical,
  Eye,
  Maximize2,
  Minimize2,
  ExternalLink
} from 'lucide-react';

interface AnalyticsData {
  timeRange: {
    startDate: string;
    endDate: string;
    range: string;
  };
  summary: {
    totalRevenue: number;
    totalDeliveries: number;
    completionRate: number;
    activeDrivers: number;
    totalCustomers: number;
    averageRating: number;
    averageFare: number;
  };
  charts: {
    revenueTrend: Array<{
      date: string;
      totalRevenue: number;
      deliveries: number;
    }>;
    hourlyDistribution: Array<{
      hour: number;
      deliveries: number;
    }>;
    vehicleTypeBreakdown: Array<{
      vehicleType: string;
      count: number;
      totalFare: number;
      averageFare: number;
    }>;
    dailyCompletionRate: Array<{
      date: string;
      total: number;
      completed: number;
      completionRate: number;
    }>;
  };
  tables: {
    topDrivers: Array<{
      driverId: number;
      firstName: string;
      lastName: string;
      totalDeliveries: number;
      totalEarnings: number;
      averageRating: number;
    }>;
    popularRoutes: Array<{
      pickupArea: string;
      dropoffArea: string;
      count: number;
    }>;
    vehicleTypeStats: Array<{
      vehicleType: string;
      count: number;
      totalFare: number;
      averageFare: number;
    }>;
  };
  metrics: {
    deliveryStats: {
      totalDeliveries: number;
      completedDeliveries: number;
      pendingDeliveries: number;
      cancelledDeliveries: number;
      totalFareValue: number;
      averageDistance: number;
      averageFare: number;
    };
    driverStats: {
      totalDrivers: number;
      activeDrivers: number;
      onlineDrivers: number;
      averageRating: number;
    };
    customerStats: {
      totalCustomers: number;
      newCustomers: number;
      activeCustomers: number;
    };
    revenueBreakdown: {
      totalCommission: number;
      totalFareValue: number;
      averageCommissionRate: number;
    };
  };
}

interface RealtimeStats {
  activeDeliveriesLastHour: number;
  newDriversToday: number;
  newCustomersToday: number;
  revenueToday: number;
  onlineDriversNow: number;
  updatedAt: string;
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [realtimeLoading, setRealtimeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>('month');
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'revenue' | 'deliveries' | 'drivers' | 'customers'>('overview');

  const timeRanges = [
    { label: 'Today', value: 'day' },
    { label: 'Last 7 Days', value: 'week' },
    { label: 'Last 30 Days', value: 'month' },
    { label: 'Last Year', value: 'year' },
    { label: 'All Time', value: 'all' },
  ];

  const viewModes = [
    { label: 'Overview', value: 'overview', icon: <Activity className="w-4 h-4" /> },
    { label: 'Revenue', value: 'revenue', icon: <DollarSign className="w-4 h-4" /> },
    { label: 'Deliveries', value: 'deliveries', icon: <Package className="w-4 h-4" /> },
    { label: 'Drivers', value: 'drivers', icon: <Users className="w-4 h-4" /> },
    { label: 'Customers', value: 'customers', icon: <Target className="w-4 h-4" /> },
  ];

  const fetchAnalyticsData = useCallback(async (range: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/analytics?timeRange=${range}`);
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setAnalyticsData(data.data);
      } else {
        throw new Error(data.error || 'Failed to load analytics');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRealtimeStats = useCallback(async () => {
    try {
      setRealtimeLoading(true);
      const response = await fetch('/api/admin/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'realtime' }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRealtimeStats(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching realtime stats:', err);
    } finally {
      setRealtimeLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalyticsData(timeRange);
    fetchRealtimeStats();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchRealtimeStats, 30000);
    return () => clearInterval(interval);
  }, [timeRange, fetchAnalyticsData, fetchRealtimeStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { percentage: 0, direction: 'neutral' };
    const percentage = ((current - previous) / previous) * 100;
    return {
      percentage: Math.abs(percentage),
      direction: percentage >= 0 ? 'up' : 'down',
    };
  };

  const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up': return <ArrowUpRight className="w-4 h-4" />;
      case 'down': return <ArrowDownRight className="w-4 h-4" />;
      default: return <span className="w-4 h-4">→</span>;
    }
  };

  const renderRevenueChart = () => {
    if (!analyticsData?.charts.revenueTrend.length) return null;
    
    const data = analyticsData.charts.revenueTrend;
    const maxRevenue = Math.max(...data.map(d => d.totalRevenue || 0));
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Revenue Trend</h3>
          <div className="flex items-center space-x-2 text-sm text-purple-300">
            <Calendar className="w-4 h-4" />
            <span>{analyticsData.timeRange.startDate ? formatDate(analyticsData.timeRange.startDate) : ''} - {analyticsData.timeRange.endDate ? formatDate(analyticsData.timeRange.endDate) : ''}</span>
          </div>
        </div>
        
        <div className="h-64">
          <div className="flex items-end justify-between h-48 space-x-1">
            {data.slice(-14).map((day, index) => {
              const height = maxRevenue > 0 ? ((day.totalRevenue || 0) / maxRevenue) * 100 : 0;
              return (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div className="relative group">
                    <div 
                      className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-lg transition-all duration-300 hover:opacity-80 cursor-pointer"
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                        {formatDate(day.date)}: {formatCurrency(day.totalRevenue || 0)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-purple-300 mt-2 truncate w-full text-center">
                    {formatDate(day.date)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-white font-semibold">{formatCurrency(data.reduce((sum, day) => sum + (day.totalRevenue || 0), 0))}</div>
            <div className="text-purple-300 text-xs">Total Revenue</div>
          </div>
          <div>
            <div className="text-white font-semibold">{formatNumber(data.reduce((sum, day) => sum + (day.deliveries || 0), 0))}</div>
            <div className="text-purple-300 text-xs">Total Deliveries</div>
          </div>
          <div>
            <div className="text-white font-semibold">
              {formatCurrency(data.reduce((sum, day) => sum + (day.totalRevenue || 0), 0) / data.reduce((sum, day) => sum + (day.deliveries || 0), 1))}
            </div>
            <div className="text-purple-300 text-xs">Avg per Delivery</div>
          </div>
        </div>
      </div>
    );
  };

  const renderHourlyDistribution = () => {
    if (!analyticsData?.charts.hourlyDistribution.length) return null;
    
    const data = analyticsData.charts.hourlyDistribution;
    const maxDeliveries = Math.max(...data.map(d => d.deliveries || 0));
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Peak Delivery Hours</h3>
        
        <div className="h-48">
          <div className="flex items-end justify-between h-36 space-x-1">
            {data.map((hourData, index) => {
              const height = maxDeliveries > 0 ? ((hourData.deliveries || 0) / maxDeliveries) * 100 : 0;
              return (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div className="relative group">
                    <div 
                      className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-lg transition-all duration-300 hover:opacity-80 cursor-pointer"
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                        {hourData.hour}:00 - {hourData.deliveries} deliveries
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-blue-300 mt-2">
                    {hourData.hour}:00
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-sm text-gray-400">
            Peak hour: {data.reduce((max, hour) => hour.deliveries > max.deliveries ? hour : max).hour}:00
          </div>
        </div>
      </div>
    );
  };

  const renderVehicleTypeBreakdown = () => {
    if (!analyticsData?.charts.vehicleTypeBreakdown.length) return null;
    
    const data = analyticsData.charts.vehicleTypeBreakdown;
    const total = data.reduce((sum, item) => sum + (item.count || 0), 0);
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Deliveries by Vehicle Type</h3>
        
        <div className="space-y-3">
          {data.map((item, index) => {
            const percentage = total > 0 ? ((item.count || 0) / total) * 100 : 0;
            const colors = [
              'bg-purple-500',
              'bg-blue-500',
              'bg-cyan-500',
              'bg-emerald-500',
              'bg-amber-500',
            ];
            
            return (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-white font-medium capitalize">{item.vehicleType || 'Unknown'}</span>
                  <span className="text-purple-300">{item.count} ({percentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${colors[index % colors.length]} transition-all duration-1000`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Avg Fare: {formatCurrency(item.averageFare || 0)}</span>
                  <span>Total: {formatCurrency(item.totalFare || 0)}</span>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="pt-4 border-t border-gray-700">
          <div className="flex justify-between text-sm">
            <span className="text-white font-medium">Total Deliveries</span>
            <span className="text-purple-300">{formatNumber(total)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderTopDriversTable = () => {
    if (!analyticsData?.tables.topDrivers.length) return null;
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Top Performing Drivers</h3>
          <button className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
            View All
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-purple-300 border-b border-gray-700">
                <th className="pb-2">Driver</th>
                <th className="pb-2">Deliveries</th>
                <th className="pb-2">Earnings</th>
                <th className="pb-2">Rating</th>
                <th className="pb-2">Performance</th>
              </tr>
            </thead>
            <tbody>
              {analyticsData.tables.topDrivers.slice(0, 5).map((driver, index) => (
                <tr key={driver.driverId} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {driver.firstName?.[0]}{driver.lastName?.[0]}
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          {driver.firstName} {driver.lastName}
                        </div>
                        <div className="text-xs text-gray-400">ID: {driver.driverId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="text-white font-semibold">{driver.totalDeliveries}</div>
                  </td>
                  <td className="py-3">
                    <div className="text-emerald-400 font-semibold">{formatCurrency(driver.totalEarnings || 0)}</div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3 text-amber-400 fill-current" />
                      <span className={`font-medium ${driver.averageRating >= 4.5 ? 'text-emerald-400' : driver.averageRating >= 4.0 ? 'text-amber-400' : 'text-red-400'}`}>
                        {driver.averageRating?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="w-24 bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-400"
                        style={{ 
                          width: `${Math.min((driver.totalDeliveries / Math.max(...analyticsData.tables.topDrivers.map(d => d.totalDeliveries))) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPopularRoutes = () => {
    if (!analyticsData?.tables.popularRoutes.length) return null;
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Popular Delivery Routes</h3>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {analyticsData.tables.popularRoutes.map((route, index) => (
            <div key={index} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-purple-500/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-white text-sm truncate">{route.pickupArea || 'Unknown pickup'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full ml-0.5"></div>
                    <span className="text-white text-sm truncate">{route.dropoffArea || 'Unknown dropoff'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-lg">{route.count}</div>
                  <div className="text-purple-300 text-xs">deliveries</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="text-xs text-gray-400">
                  Most frequent route in selected period
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCompletionRateChart = () => {
    if (!analyticsData?.charts.dailyCompletionRate.length) return null;
    
    const data = analyticsData.charts.dailyCompletionRate.slice(-14);
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Daily Completion Rate</h3>
        
        <div className="h-48">
          <div className="flex items-end justify-between h-36 space-x-1">
            {data.map((day, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="relative group w-full">
                  <div 
                    className={`w-full rounded-t-lg transition-all duration-300 hover:opacity-80 cursor-pointer ${
                      day.completionRate >= 90 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' :
                      day.completionRate >= 75 ? 'bg-gradient-to-t from-amber-600 to-amber-400' :
                      'bg-gradient-to-t from-red-600 to-red-400'
                    }`}
                    style={{ height: `${day.completionRate || 0}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                      {formatDate(day.date)}: {day.completionRate?.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  {formatDate(day.date)}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-white font-semibold">
              {formatPercentage(data.reduce((sum, day) => sum + (day.completed || 0), 0) / data.reduce((sum, day) => sum + (day.total || 1), 0) * 100)}
            </div>
            <div className="text-purple-300 text-xs">Avg Completion Rate</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-white font-semibold">
              {formatNumber(data.reduce((sum, day) => sum + (day.completed || 0), 0))}
            </div>
            <div className="text-purple-300 text-xs">Total Completed</div>
          </div>
        </div>
      </div>
    );
  };

  if (loading && !analyticsData) {
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

  if (error && !analyticsData) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
            <p className="text-purple-300">Comprehensive platform insights and performance metrics</p>
          </div>
        </div>
        <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <div>
              <h3 className="text-red-400 font-medium">Error loading analytics data</h3>
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <p className="text-purple-300 text-lg">Comprehensive platform insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-gray-800 rounded-xl p-1 border border-purple-500/20">
            {viewModes.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setViewMode(mode.value as any)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  viewMode === mode.value
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                {mode.icon}
                <span>{mode.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-2 bg-gray-800 rounded-xl p-1 border border-purple-500/20">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  timeRange === range.value
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchAnalyticsData(timeRange)}
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

      {/* Real-time Stats Bar */}
      {realtimeStats && (
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl border border-purple-500/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-amber-400 text-sm font-medium">Live Updates</span>
              <span className="text-gray-400 text-xs">• Updated: {new Date(realtimeStats.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-white font-bold">{realtimeStats.onlineDriversNow}</div>
                <div className="text-emerald-400 text-xs">Drivers Online</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold">{realtimeStats.activeDeliveriesLastHour}</div>
                <div className="text-blue-400 text-xs">Active (1h)</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold">{formatCurrency(realtimeStats.revenueToday)}</div>
                <div className="text-cyan-400 text-xs">Revenue Today</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold">{realtimeStats.newCustomersToday}</div>
                <div className="text-purple-400 text-xs">New Customers</div>
              </div>
            </div>
            <button
              onClick={fetchRealtimeStats}
              disabled={realtimeLoading}
              className="p-2 text-purple-300 hover:text-white hover:bg-purple-600/10 rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${realtimeLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Summary Metrics */}
      {analyticsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs">
                <TrendingUp className="w-3 h-3" />
                <span>+12.5%</span>
              </div>
            </div>
            <div>
              <p className="text-purple-300 text-sm">Total Revenue</p>
              <p className="text-white text-2xl font-bold mt-2">
                {formatCurrency(analyticsData.summary.totalRevenue)}
              </p>
              <p className="text-purple-300 text-xs mt-2">
                {formatCurrency(analyticsData.metrics.revenueBreakdown.totalCommission)} commission • {formatCurrency(analyticsData.metrics.revenueBreakdown.totalFareValue)} total fare
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-blue-500/20 p-6 hover:border-blue-500/40 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                <TrendingUp className="w-3 h-3" />
                <span>+8.2%</span>
              </div>
            </div>
            <div>
              <p className="text-purple-300 text-sm">Total Deliveries</p>
              <p className="text-white text-2xl font-bold mt-2">
                {formatNumber(analyticsData.summary.totalDeliveries)}
              </p>
              <p className="text-blue-300 text-xs mt-2">
                {formatPercentage(analyticsData.summary.completionRate)} completion rate • Avg fare: {formatCurrency(analyticsData.summary.averageFare)}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-emerald-500/20 p-6 hover:border-emerald-500/40 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                <TrendingUp className="w-3 h-3" />
                <span>+15.3%</span>
              </div>
            </div>
            <div>
              <p className="text-purple-300 text-sm">Active Drivers</p>
              <p className="text-white text-2xl font-bold mt-2">
                {formatNumber(analyticsData.summary.activeDrivers)}
              </p>
              <p className="text-emerald-300 text-xs mt-2">
                {analyticsData.metrics.driverStats.onlineDrivers || 0} online • Avg rating: {analyticsData.summary.averageRating.toFixed(1)}★
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-cyan-500/20 p-6 hover:border-cyan-500/40 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Target className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs">
                <TrendingUp className="w-3 h-3" />
                <span>+22.1%</span>
              </div>
            </div>
            <div>
              <p className="text-purple-300 text-sm">Total Customers</p>
              <p className="text-white text-2xl font-bold mt-2">
                {formatNumber(analyticsData.summary.totalCustomers)}
              </p>
              <p className="text-cyan-300 text-xs mt-2">
                {analyticsData.metrics.customerStats.newCustomers || 0} new • {analyticsData.metrics.customerStats.activeCustomers || 0} active
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="bg-gray-800 rounded-2xl border border-purple-500/20 p-6">
          {renderRevenueChart()}
        </div>

        {/* Hourly Distribution */}
        <div className="bg-gray-800 rounded-2xl border border-blue-500/20 p-6">
          {renderHourlyDistribution()}
        </div>

        {/* Vehicle Type Breakdown */}
        <div className="bg-gray-800 rounded-2xl border border-cyan-500/20 p-6">
          {renderVehicleTypeBreakdown()}
        </div>

        {/* Completion Rate Chart */}
        <div className="bg-gray-800 rounded-2xl border border-emerald-500/20 p-6">
          {renderCompletionRateChart()}
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Drivers Table */}
        <div className="bg-gray-800 rounded-2xl border border-purple-500/20 p-6">
          {renderTopDriversTable()}
        </div>

        {/* Popular Routes */}
        <div className="bg-gray-800 rounded-2xl border border-blue-500/20 p-6">
          {renderPopularRoutes()}
        </div>
      </div>

      {/* Detailed Metrics */}
      {analyticsData && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
          <h3 className="text-xl font-bold text-white mb-6">Detailed Performance Metrics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Delivery Metrics */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
                <Package className="w-5 h-5 text-blue-400" />
                <span>Delivery Performance</span>
              </h4>
              <div className="space-y-3">
                <MetricItem label="Total Deliveries" value={formatNumber(analyticsData.metrics.deliveryStats.totalDeliveries)} />
                <MetricItem label="Completed" value={formatNumber(analyticsData.metrics.deliveryStats.completedDeliveries)} color="text-emerald-400" />
                <MetricItem label="Pending" value={formatNumber(analyticsData.metrics.deliveryStats.pendingDeliveries)} color="text-amber-400" />
                <MetricItem label="Cancelled" value={formatNumber(analyticsData.metrics.deliveryStats.cancelledDeliveries)} color="text-red-400" />
                <MetricItem label="Average Distance" value={`${analyticsData.metrics.deliveryStats.averageDistance?.toFixed(2) || '0'} km`} />
                <MetricItem label="Average Fare" value={formatCurrency(analyticsData.metrics.deliveryStats.averageFare)} />
              </div>
            </div>

            {/* Driver Metrics */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <span>Driver Analytics</span>
              </h4>
              <div className="space-y-3">
                <MetricItem label="Total Drivers" value={formatNumber(analyticsData.metrics.driverStats.totalDrivers)} />
                <MetricItem label="Active Drivers" value={formatNumber(analyticsData.metrics.driverStats.activeDrivers)} color="text-emerald-400" />
                <MetricItem label="Online Now" value={formatNumber(analyticsData.metrics.driverStats.onlineDrivers)} color="text-emerald-400" />
                <MetricItem label="Average Rating" value={`${analyticsData.metrics.driverStats.averageRating?.toFixed(1) || '0'}/5`} />
                <MetricItem label="Driver Growth" value="+12.5%" color="text-emerald-400" />
                <MetricItem label="Retention Rate" value="94.2%" color="text-emerald-400" />
              </div>
            </div>

            {/* Customer Metrics */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
                <Target className="w-5 h-5 text-cyan-400" />
                <span>Customer Insights</span>
              </h4>
              <div className="space-y-3">
                <MetricItem label="Total Customers" value={formatNumber(analyticsData.metrics.customerStats.totalCustomers)} />
                <MetricItem label="New Customers" value={formatNumber(analyticsData.metrics.customerStats.newCustomers)} color="text-emerald-400" />
                <MetricItem label="Active Customers" value={formatNumber(analyticsData.metrics.customerStats.activeCustomers)} color="text-cyan-400" />
                <MetricItem label="Avg Orders per Customer" value="4.2" />
                <MetricItem label="Customer Satisfaction" value="4.7/5" color="text-emerald-400" />
                <MetricItem label="Repeat Customer Rate" value="68.5%" color="text-emerald-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time Range Summary */}
      {analyticsData && (
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300 text-sm">Analysis Period:</span>
              <span className="text-white text-sm font-medium">
                {formatDate(analyticsData.timeRange.startDate)} - {formatDate(analyticsData.timeRange.endDate)}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              Data updated in real-time • Platform commission rate: 13.5%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for metric items
function MetricItem({ label, value, color = "text-white" }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-700/50 last:border-0">
      <span className="text-gray-400">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}