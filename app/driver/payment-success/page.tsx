//app/driver/payment-success/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';

export default function PaymentSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'checking' | 'success' | 'failed'>('checking');
  const [message, setMessage] = useState('Checking payment status...');

  useEffect(() => {
    const checkPayment = async () => {
      // Safely get search params - they might be null
      const urlReference = searchParams ? searchParams.get('reference') : null;
      const urlStatus = searchParams ? searchParams.get('status') : null;
      
      const reference = urlReference || localStorage.getItem('pesepayReference');
      const amount = localStorage.getItem('pesepayAmount');
      const driverId = localStorage.getItem('pesepayDriverId');

      if (!reference) {
        setStatus('failed');
        setMessage('No payment reference found');
        return;
      }

      try {
        const response = await fetch(`/api/pesepay/check-status?reference=${reference}`);
        
        if (!response.ok) {
          throw new Error('Failed to check payment status');
        }

        const result = await response.json();

        console.log('🔍 Payment status check result:', result);

        if (result.paid || result.status === 'SUCCESS' || result.status === 'PAID') {
          setStatus('success');
          setMessage('Payment successful! Updating your wallet...');
          
          // Clear localStorage
          localStorage.removeItem('pesepayReference');
          localStorage.removeItem('pesepayAmount');
          localStorage.removeItem('pesepayDriverId');
          
          // Force wallet refresh
          if (typeof window !== 'undefined') {
            localStorage.setItem('walletLastUpdate', Date.now().toString());
          }
          
          // Redirect to wallet after delay
          setTimeout(() => {
            router.push(`/driver/wallet?refresh=true&payment=success&amount=${amount || '0'}`);
          }, 2000);
        } else {
          setStatus('failed');
          setMessage(result.error || 'Payment failed or was not completed');
          
          setTimeout(() => {
            router.push('/driver/topup?error=payment_failed');
          }, 3000);
        }
      } catch (error) {
        console.error('Payment check error:', error);
        setStatus('failed');
        setMessage('Unable to verify payment status');
        
        setTimeout(() => {
          router.push('/driver/topup');
        }, 3000);
      }
    };

    checkPayment();
  }, [router, searchParams]);

  const renderStatus = () => {
    switch (status) {
      case 'checking':
        return (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Payment</h2>
            <p className="text-gray-600">{message}</p>
          </>
        );
      
      case 'success':
        return (
          <>
            <FiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500 mt-4">Redirecting to your wallet...</p>
          </>
        );
      
      case 'failed':
        return (
          <>
            <FiXCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => router.push('/driver/topup')}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              Try Again
            </button>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {renderStatus()}
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Having issues? Contact support at admin@velosdrop.com
          </p>
        </div>
      </div>
    </div>
  );
}