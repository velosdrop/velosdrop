// app/food/merchant/dashboard/page.tsx
'use client';

import SettingsComponent from '@/components/merchant/Settings';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Store, ShoppingBag, Menu, LogOut, 
  Package, Bell, Home, ChevronLeft,
  Settings, HelpCircle, UtensilsCrossed
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

// Import your components
import Overview from '@/components/merchant/Overview';
import OrdersComponent from '@/components/merchant/Orders';
import MenuComponent from '@/components/merchant/Menu';
import ProfileComponent from '@/components/merchant/Profile';

export default function MerchantDashboard() {
  const router = useRouter();
  const { theme } = useTheme(); // Get current theme
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchMerchantData = async () => {
      try {
        const token = localStorage.getItem('merchantToken');
        
        if (!token) {
          router.push('/food/merchant/login');
          return;
        }

        const profileRes = await fetch('/api/merchant/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (profileRes.status === 401) {
          localStorage.removeItem('merchantToken');
          localStorage.removeItem('merchantId');
          router.push('/food/merchant/login');
          return;
        }

        if (!profileRes.ok) {
          throw new Error('Failed to fetch profile');
        }
        
        const profileData = await profileRes.json();
        setMerchant(profileData.merchant);

      } catch (error: any) {
        console.error('Error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMerchantData();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('merchantToken');
    localStorage.removeItem('merchantId');
    router.push('/food/merchant/login');
  };

  const handleLogoUpdate = (newLogoUrl: string) => {
    setMerchant((prev: any) => ({ ...prev, logoUrl: newLogoUrl }));
  };

  // Menu items for sidebar
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'menu', label: 'Menu', icon: Menu },
    { id: 'profile', label: 'Profile', icon: Store },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ];

  // Professional Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          {/* Appetizing Food Animation */}
          <div className="relative mb-8">
            <div className="w-24 h-24 mx-auto relative">
              <div className="absolute inset-0 bg-purple-100 dark:bg-purple-900/30 rounded-full animate-pulse"></div>
              <UtensilsCrossed className="w-12 h-12 text-purple-600 dark:text-purple-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-bounce" />
            </div>
            {/* Floating dots */}
            <div className="flex justify-center gap-2 mt-4">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
          
          {/* Professional Loading Text */}
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Preparing your dashboard</h2>
          <p className="text-gray-500 dark:text-gray-400">Loading your menu and orders...</p>
          
          {/* Progress Bar */}
          <div className="w-64 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-6 mx-auto overflow-hidden">
            <div className="h-full bg-purple-600 rounded-full animate-progress"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-red-500 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Something went wrong</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={handleLogout}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors duration-200">
      {/* Sidebar - Fixed with full height */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 fixed h-screen flex flex-col z-20`}>
        {/* Top section with logo, company info and toggle - CLICKABLE to go to profile */}
        <button
          onClick={() => setActiveTab('profile')}
          className="h-16 flex items-center px-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 w-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {/* Logo */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
              {merchant?.logoUrl ? (
                <img 
                  src={merchant.logoUrl} 
                  alt={merchant.businessName} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-purple-600 flex items-center justify-center">
                  <Store className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            {sidebarOpen && merchant && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{merchant.businessName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{merchant.city}</p>
              </div>
            )}
          </div>
          
          {/* Toggle button - stop propagation to prevent profile navigation when clicking toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSidebarOpen(!sidebarOpen);
            }}
            className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
          >
            <ChevronLeft className={`w-5 h-5 transition-transform ${!sidebarOpen && 'rotate-180'}`} />
          </button>
        </button>

        {/* Navigation - Scrollable middle section */}
        <div className="flex-1 overflow-y-auto min-h-0 py-4">
          <nav className="px-3 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm font-medium truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Logout - Fixed at bottom with clear visibility */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors font-medium"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300 min-h-screen`}>
        {/* Top Bar - Adjusted positioning */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-6 fixed right-0 z-10 transition-colors" 
             style={{ left: sidebarOpen ? '16rem' : '5rem' }}>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {menuItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
          </h1>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full"></span>
            </button>
            <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {merchant?.logoUrl ? (
                <img 
                  src={merchant.logoUrl} 
                  alt={merchant.businessName} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Store className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="pt-20 px-6 pb-8">
          {activeTab === 'overview' && <Overview merchant={merchant} />}
          {activeTab === 'orders' && <OrdersComponent />}
          {activeTab === 'menu' && <MenuComponent />}
          {activeTab === 'profile' && (
            <ProfileComponent 
              merchant={merchant} 
              onLogoUpdate={handleLogoUpdate}
              onProfileUpdate={(updatedMerchant) => setMerchant(updatedMerchant)}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsComponent merchant={merchant} />
          )}
          {activeTab === 'help' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Help & Support</h2>
              <p className="text-gray-600 dark:text-gray-400">Help page coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}