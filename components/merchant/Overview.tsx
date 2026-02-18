// components/merchant/Overview.tsx
import { ShoppingBag, DollarSign, Clock, Package, TrendingUp, Users } from 'lucide-react';

export default function Overview({ merchant }: { merchant: any }) {
  const stats = {
    todayOrders: 12,
    totalRevenue: 345.50,
    pendingOrders: 5,
    totalProducts: 24,
    totalCustomers: 156,
    avgOrderValue: 28.50
  };

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome back, {merchant?.ownerName?.split(' ')[0] || 'Merchant'}! 👋
        </h1>
        <p className="text-gray-600 mt-1">Here's what's happening with your business today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">+12%</span>
          </div>
          <p className="text-sm text-gray-600">Today's Orders</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.todayOrders}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">+8%</span>
          </div>
          <p className="text-sm text-gray-600">Revenue</p>
          <p className="text-2xl font-semibold text-gray-900">${stats.totalRevenue}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600">Pending Orders</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.pendingOrders}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600">Products</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.totalProducts}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600">Customers</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.totalCustomers}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600">Avg. Order Value</p>
          <p className="text-2xl font-semibold text-gray-900">${stats.avgOrderValue}</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">Order #ORD-{1000 + i}</p>
                  <p className="text-sm text-gray-500">2 items • $45.50</p>
                </div>
                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-600 rounded-full">
                  Preparing
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Popular Items</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg"></div>
                  <div>
                    <p className="font-medium text-gray-900">Margherita Pizza</p>
                    <p className="text-sm text-gray-500">12 orders today</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900">$12.99</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}