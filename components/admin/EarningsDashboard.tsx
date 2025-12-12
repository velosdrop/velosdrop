//components/admin/EarningsDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Package, Calendar } from 'lucide-react';

interface EarningsData {
  totalEarnings: number;
  totalDeliveries: number;
  averageCommission: number;
  trends: {
    today: number;
    yesterday: number;
    thisWeek: number;
    thisMonth: number;
  };
}

export default function EarningsDashboard() {
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('all');

  const fetchEarnings = async (range: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/earnings?timeRange=${range}`);
      if (response.ok) {
        const data = await response.json();
        setEarningsData(data.data);
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings(timeRange);
  }, [timeRange]);

  if (loading || !earningsData) {
    return (
      <div className="bg-gray-800 rounded-2xl border border-purple-500/20 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          <div className="h-8 bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  const dailyChange = earningsData.trends.yesterday 
    ? ((earningsData.trends.today - earningsData.trends.yesterday) / earningsData.trends.yesterday) * 100
    : 0;

  return (
    <div className="bg-gray-800 rounded-2xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Platform Revenue</h2>
            <p className="text-emerald-300 text-sm">Commission earnings from deliveries</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-gray-700/50 rounded-xl p-1">
          {(['today', 'week', 'month', 'year', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                timeRange === range
                  ? 'bg-purple-600 text-white'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold text-white mb-2">
              ${earningsData.totalEarnings.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </div>
            <div className="flex items-center space-x-2">
              {dailyChange >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span className={`text-sm font-medium ${dailyChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {dailyChange >= 0 ? '+' : ''}{dailyChange.toFixed(1)}% from yesterday
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-purple-300 text-sm">Total Deliveries</div>
            <div className="text-white text-2xl font-bold">{earningsData.totalDeliveries}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-700/30 rounded-xl p-4">
            <div className="text-emerald-300 text-sm mb-1">Today</div>
            <div className="text-white text-xl font-bold">
              ${earningsData.trends.today.toFixed(2)}
            </div>
          </div>
          <div className="bg-gray-700/30 rounded-xl p-4">
            <div className="text-blue-300 text-sm mb-1">This Week</div>
            <div className="text-white text-xl font-bold">
              ${earningsData.trends.thisWeek.toFixed(2)}
            </div>
          </div>
          <div className="bg-gray-700/30 rounded-xl p-4">
            <div className="text-cyan-300 text-sm mb-1">This Month</div>
            <div className="text-white text-xl font-bold">
              ${earningsData.trends.thisMonth.toFixed(2)}
            </div>
          </div>
          <div className="bg-gray-700/30 rounded-xl p-4">
            <div className="text-purple-300 text-sm mb-1">Avg/Order</div>
            <div className="text-white text-xl font-bold">
              ${earningsData.averageCommission.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between text-sm text-purple-300">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span>Commission Rate: 13.5% per delivery</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Updated just now</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}