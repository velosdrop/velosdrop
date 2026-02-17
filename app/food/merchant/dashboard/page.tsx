'use client';

import { useState, useEffect } from 'react';
import {
  Store, LayoutDashboard, ShoppingBag, Menu, Settings,
  LogOut, ChevronRight, Package, TrendingUp, Clock,
  Star, CreditCard, HelpCircle, Bell, AlertCircle
} from 'lucide-react';

export default function MerchantDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    const fetchMerchant = async () => {
      try {
        const token = localStorage.getItem('merchantToken');
        
        // If no token, just show default state
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch('/api/merchant/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.status === 404) {
          setApiError(true);
          setLoading(false);
          return;
        }

        if (!res.ok) {
          setApiError(true);
          setLoading(false);
          return;
        }
        
        const data = await res.json();
        setMerchant(data.merchant);
      } catch (error) {
        console.error('Error fetching merchant:', error);
        setApiError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchMerchant();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('merchantToken');
    localStorage.removeItem('merchantId');
    window.location.href = '/food/merchant'; // Just go back to merchant home
  };

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'menu', label: 'Menu', icon: Menu },
    { id: 'profile', label: 'Business Profile', icon: Store },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Always show this - no redirects!
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-black/50 border-r border-white/5 transition-all duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center font-bold">
              V
            </div>
            {isSidebarOpen && (
              <span className="font-semibold tracking-tight">
                Velos<span className="text-purple-500">Business</span>
              </span>
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="ml-auto text-gray-400 hover:text-white"
          >
            <ChevronRight className={`w-5 h-5 transition-transform ${!isSidebarOpen && 'rotate-180'}`} />
          </button>
        </div>

        {/* Merchant Info - Mini Profile */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center">
              <Store className="w-5 h-5 text-purple-400" />
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{merchant?.businessName || 'Your Business'}</p>
                <p className="text-xs text-gray-500">{merchant?.city || 'City'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                  activeTab === item.id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isSidebarOpen && <span className="text-sm">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/5 space-y-1">
          <button
            onClick={() => setActiveTab('help')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <HelpCircle className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span className="text-sm">Help</span>}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Top Bar */}
        <header className="h-16 bg-black/30 border-b border-white/5 flex items-center justify-between px-6">
          <h1 className="text-xl font-semibold">
            {menuItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
          </h1>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium">{merchant?.businessName || 'Your Business'}</p>
                <p className="text-xs text-gray-500">{merchant?.status || 'active'}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center">
                <Store className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {apiError ? (
            <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl p-8 text-center">
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Dashboard Under Construction</h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                You've successfully registered! The merchant dashboard is being built.
                You'll be able to manage your menu, view orders, and update settings soon.
              </p>
              <div className="space-y-3">
                <div className="bg-white/5 rounded-xl p-4 text-left max-w-sm mx-auto">
                  <p className="text-sm text-gray-300">
                    <span className="text-purple-400 font-medium">✓</span> Registration complete
                  </p>
                  <p className="text-sm text-gray-300 mt-2">
                    <span className="text-yellow-400 font-medium">⟳</span> Dashboard in development
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl p-8 text-center">
              <Package className="w-16 h-16 text-purple-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Welcome to Your Dashboard!</h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                You've successfully registered. The full dashboard features are coming soon!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="bg-white/5 rounded-xl p-4">
                  <ShoppingBag className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-300">Manage Orders</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <Menu className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-300">Update Menu</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <Store className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-300">Edit Profile</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}