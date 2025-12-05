//app/admin/layout.tsx
'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  Home,
  Package,
  Users,
  Car,
  MessageSquare,
  LogOut,
  Settings,
  BarChart3,
  CreditCard,
  MapPin,
  FileText,
  Shield,
  Bell,
  HelpCircle
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState<{ username: string; role: string } | null>(null);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    
    // Load admin data if authenticated
    if (isAuthenticated) {
      loadAdminData();
      loadNotifications();
    }
  }, [pathname, isAuthenticated]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth/check');
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        setAdminData(data.admin);
      } else {
        if (pathname !== '/admin') {
          router.push('/admin');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      if (pathname !== '/admin') {
        router.push('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    try {
      const response = await fetch('/api/admin/profile');
      if (response.ok) {
        const data = await response.json();
        setAdminData(data);
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/admin/notifications/unread');
      if (response.ok) {
        const data = await response.json();
        setNotificationsCount(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setAdminData(null);
      router.push('/admin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-950 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-500/30 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="mt-6 text-lg font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            VelosDrop Admin
          </p>
          <p className="mt-2 text-purple-300/70 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and not on login page, don't render layout
  if (!isAuthenticated && pathname !== '/admin') {
    return null;
  }

  // If on login page, just show the login form without layout
  if (pathname === '/admin') {
    return <>{children}</>;
  }

  // Get current path for active state
  const currentPath = pathname || '';

  // Authenticated admin layout
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-gray-800 via-gray-800/95 to-gray-900 border-r border-purple-500/20 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-purple-500/20">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                <span className="text-white font-bold text-xl">VD</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-gray-800"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                VelosDrop
              </h1>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <p className="text-emerald-400 text-xs font-medium">Admin Panel</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Profile */}
        {adminData && (
          <div className="p-4 border-b border-purple-500/10">
            <div className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all duration-200">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">
                  {adminData.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{adminData.username}</p>
                <p className="text-purple-300 text-xs truncate capitalize">{adminData.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavLink 
            href="/admin/dashboard" 
            icon={<Home className="w-5 h-5" />}
            label="Dashboard"
            isActive={currentPath === '/admin/dashboard'}
          />
          
          <NavLink 
            href="/admin/orders" 
            icon={<Package className="w-5 h-5" />}
            label="Orders"
            isActive={currentPath.startsWith('/admin/orders')}
            badge={23}
          />
          
          <NavLink 
            href="/admin/customers" 
            icon={<Users className="w-5 h-5" />}
            label="Customers"
            isActive={currentPath.startsWith('/admin/customers')}
          />
          
          <NavLink 
            href="/admin/drivers" 
            icon={<Car className="w-5 h-5" />}
            label="Drivers"
            isActive={currentPath.startsWith('/admin/drivers')}
            badge={5}
          />
          
          {/* NEW: Chats Link - Added just below Drivers as requested */}
          <NavLink 
            href="/admin/chats" 
            icon={<MessageSquare className="w-5 h-5" />}
            label="Chats"
            isActive={currentPath.startsWith('/admin/chats')}
            badge={notificationsCount > 0 ? notificationsCount : undefined}
            isNew={true}
          />
          
          <div className="pt-4">
            <p className="text-xs text-purple-400/60 font-medium px-3 pb-2 uppercase tracking-wider">
              Management
            </p>
            <NavLink 
              href="/admin/driver-transactions" 
              icon={<CreditCard className="w-5 h-5" />}
              label="Transactions"
              isActive={currentPath.startsWith('/admin/driver-transactions')}
            />
            
            <NavLink 
              href="/admin/reports" 
              icon={<BarChart3 className="w-5 h-5" />}
              label="Analytics"
              isActive={currentPath.startsWith('/admin/reports')}
            />
            
            <NavLink 
              href="/admin/live-tracking" 
              icon={<MapPin className="w-5 h-5" />}
              label="Live Tracking"
              isActive={currentPath.startsWith('/admin/live-tracking')}
            />
          </div>

          <div className="pt-4">
            <p className="text-xs text-purple-400/60 font-medium px-3 pb-2 uppercase tracking-wider">
              System
            </p>
            <NavLink 
              href="/admin/settings" 
              icon={<Settings className="w-5 h-5" />}
              label="Settings"
              isActive={currentPath.startsWith('/admin/settings')}
            />
            
            <NavLink 
              href="/admin/logs" 
              icon={<FileText className="w-5 h-5" />}
              label="Audit Logs"
              isActive={currentPath.startsWith('/admin/logs')}
            />
            
            <NavLink 
              href="/admin/notifications" 
              icon={<Bell className="w-5 h-5" />}
              label="Notifications"
              isActive={currentPath.startsWith('/admin/notifications')}
              badge={notificationsCount > 0 ? notificationsCount : undefined}
            />
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-purple-500/20 space-y-3">
          {/* Help & Support */}
          <button className="w-full flex items-center space-x-3 px-4 py-2 text-purple-300 hover:text-white hover:bg-purple-600/10 rounded-lg transition-all duration-200">
            <HelpCircle className="w-5 h-5" />
            <span className="font-medium">Help & Support</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-sm text-red-300 hover:text-white hover:bg-red-500/10 rounded-xl transition-all duration-200 border border-red-500/20 hover:border-red-500/40 group"
          >
            <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            <span className="font-medium">Logout</span>
          </button>

          {/* Version */}
          <div className="text-center pt-2">
            <p className="text-xs text-purple-400/40">v1.0.0 • VelosDrop Admin</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-gray-800/50 backdrop-blur-sm border-b border-purple-500/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {getPageTitle(currentPath)}
              </h1>
              <p className="text-purple-300 text-sm mt-1">
                {getPageDescription(currentPath)}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-purple-300 hover:text-white hover:bg-purple-600/10 rounded-lg transition-all duration-200">
                <Bell className="w-5 h-5" />
                {notificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                    {notificationsCount}
                  </span>
                )}
              </button>
              
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 bg-gray-700/50 border border-purple-500/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all duration-200 w-64"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-purple-400/50 rounded-full"></div>
                  <div className="absolute top-3 left-3 w-1.5 h-1.5 bg-purple-400/50 transform rotate-45"></div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-black to-purple-950/30 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// Navigation Link Component
function NavLink({ 
  href, 
  icon, 
  label, 
  isActive, 
  badge,
  isNew = false 
}: { 
  href: string; 
  icon: React.ReactNode; 
  label: string; 
  isActive: boolean; // FIXED: Changed from optional to required boolean
  badge?: number;
  isNew?: boolean;
}) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(href)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-left group relative ${
        isActive
          ? 'bg-gradient-to-r from-purple-600/30 to-purple-700/20 text-white border-l-4 border-purple-500'
          : 'text-purple-300 hover:bg-purple-600/10 hover:text-white hover:border-l-4 hover:border-purple-500/50'
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${
          isActive 
            ? 'bg-purple-500/20 text-purple-300' 
            : 'bg-gray-700/30 text-purple-400 group-hover:bg-purple-500/20 group-hover:text-purple-300'
        } transition-all duration-200`}>
          {icon}
        </div>
        <span className="font-medium">{label}</span>
      </div>
      
      <div className="flex items-center space-x-2">
        {isNew && (
          <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 text-xs rounded-full animate-pulse">
            New
          </span>
        )}
        
        {badge !== undefined && badge > 0 && (
          <span className={`px-2 py-0.5 text-xs rounded-full ${
            isActive
              ? 'bg-purple-500 text-white'
              : 'bg-purple-500/20 text-purple-300'
          }`}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      
      {/* Hover effect line */}
      <div className="absolute left-0 bottom-0 w-full h-0.5 bg-gradient-to-r from-purple-500 via-purple-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </button>
  );
}

// Handle null pathname
function getPageTitle(pathname: string) {
  if (!pathname) return 'Admin Dashboard';
  
  const titles: { [key: string]: string } = {
    '/admin/dashboard': 'Dashboard Overview',
    '/admin/orders': 'Order Management',
    '/admin/customers': 'Customer Management',
    '/admin/drivers': 'Driver Management',
    '/admin/chats': 'Chat Monitoring',
    '/admin/driver-transactions': 'Driver Transactions',
    '/admin/reports': 'Analytics & Reports',
    '/admin/live-tracking': 'Live Delivery Tracking',
    '/admin/settings': 'System Settings',
    '/admin/logs': 'Audit Logs',
    '/admin/notifications': 'Notifications',
  };
  
  return titles[pathname] || pathname.split('/').pop()?.replace(/-/g, ' ') || 'Admin';
}

function getPageDescription(pathname: string) {
  if (!pathname) return 'VelosDrop Administration Panel';
  
  const descriptions: { [key: string]: string } = {
    '/admin/dashboard': 'Real-time overview of your delivery platform',
    '/admin/orders': 'Manage and track delivery requests',
    '/admin/customers': 'View and manage customer accounts',
    '/admin/drivers': 'Approve, manage, and monitor drivers',
    '/admin/chats': 'Monitor customer-driver conversations in real-time',
    '/admin/driver-transactions': 'Manage payments, earnings, and transactions',
    '/admin/reports': 'Detailed analytics and performance insights',
    '/admin/live-tracking': 'Track active deliveries on map',
    '/admin/settings': 'Configure system preferences',
    '/admin/logs': 'View system activity and audit trails',
    '/admin/notifications': 'Manage alerts and notifications',
  };
  
  return descriptions[pathname] || 'VelosDrop Administration Panel';
}