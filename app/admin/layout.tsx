//app/admin/layout.tsx
'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth/check');
      if (response.ok) {
        setIsAuthenticated(true);
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

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      router.push('/admin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-purple-300">Loading...</p>
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

  // Authenticated admin layout
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-purple-500/20">
        {/* Header */}
        <div className="p-6 border-b border-purple-500/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">VelosDrop</h1>
              <p className="text-purple-300 text-sm">Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          <NavLink href="/admin/dashboard" icon="📊" label="Dashboard" />
          <NavLink href="/admin/orders" icon="📦" label="Orders" />
          <NavLink href="/admin/customers" icon="👥" label="Customers" />
          <NavLink href="/admin/drivers" icon="🚗" label="Drivers" />
          <NavLink href="/admin/analytics" icon="📈" label="Analytics" />
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm text-purple-300 hover:text-white hover:bg-purple-600/20 rounded-lg transition-all duration-200 border border-purple-500/30"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-gray-800 border-b border-purple-500/20 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">
            {getPageTitle(pathname)}
          </h1>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-900 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// Navigation Link Component
function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = pathname === href;

  return (
    <button
      onClick={() => router.push(href)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-left ${
        isActive
          ? 'bg-purple-600 text-white shadow-lg'
          : 'text-purple-300 hover:bg-purple-600/20 hover:text-white'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

// Handle null pathname
function getPageTitle(pathname: string | null) {
  if (!pathname) return 'Admin';
  
  const titles: { [key: string]: string } = {
    '/admin/dashboard': 'Dashboard',
    '/admin/orders': 'Orders',
    '/admin/customers': 'Customers',
    '/admin/drivers': 'Drivers',
    '/admin/analytics': 'Analytics',
  };
  
  return titles[pathname] || 'Admin';
}