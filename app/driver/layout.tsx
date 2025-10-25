//app/driver/layout.tsx
'use client';

import { DriverFormProvider } from '@/app/context/DriverFormContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Skip auth check for registration and other allowed paths
    const allowedPaths = [
      '/driver/registration',
      '/driver/personal',
      '/driver/vehicle',
      '/driver/documents',
      '/driver/topup',
      '/driver/payment/success', // ✅ Added payment success path
      '/driver/payment-success', // Keep for backward compatibility
      '/driver/wallet',
      '/driver-login',
    ];

    const isAllowedPath = allowedPaths.some(path => 
      pathname?.startsWith(path)
    );

    // Only check auth for non-allowed paths
    if (!isAllowedPath) {
      const isAuthenticated = localStorage.getItem('driver-auth');
      if (!isAuthenticated) {
        sessionStorage.setItem('redirect-after-login', pathname || '/driver');
        router.push('/driver-login');
      }
    }
  }, [router, pathname]);

  if (!isClient) {
    return <LoadingSpinner />;
  }

  return (
    <DriverFormProvider>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        {children}
      </div>
    </DriverFormProvider>
  );
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
    </div>
  );
}