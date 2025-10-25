// app/driver/payment/success/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FiCheckCircle, FiXCircle, FiClock, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';

export default function PaymentSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [pollingCount, setPollingCount] = useState(0);
  const [lastError, setLastError] = useState<string>('');

  useEffect(() => {
    const pollUrl = searchParams?.get('pollUrl');
    const initialStatus = searchParams?.get('status');

    console.log('🔄 Payment success page mounted', { pollUrl, initialStatus });

    if (initialStatus === 'success') {
      setStatus('success');
    } else if (initialStatus === 'failed') {
      setStatus('failed');
    } else if (pollUrl) {
      // Start polling for payment status
      pollPaymentStatus(pollUrl);
    } else {
      // No poll URL provided, check after delay
      console.log('❌ No poll URL provided');
      setTimeout(() => {
        setStatus('failed');
        setLastError('No payment reference found');
      }, 5000);
    }
  }, [searchParams]);

  const pollPaymentStatus = async (pollUrl: string) => {
    // Stop polling after 15 attempts (45 seconds) for test payments
    if (pollingCount >= 15) {
      console.log('🛑 Max polling attempts reached, showing failed status');
      setStatus('failed');
      setLastError('Payment status check timeout after 45 seconds');
      return;
    }

    try {
      console.log(`🔄 Polling attempt ${pollingCount + 1}/15 for payment status`);
      
      const response = await fetch(`/api/payments/status?pollUrl=${encodeURIComponent(pollUrl)}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      
      console.log('📨 Payment status API response:', result);
      
      if (result.paid === true) {
        console.log('🎉 Payment confirmed as PAID!');
        setStatus('success');
        setLastError('');
        // TODO: Update wallet balance here - you can call an API to update the driver's wallet
        // await updateDriverWallet(result.amount, result.reference);
      } else if (result.error) {
        console.log('❌ API returned error:', result.error);
        setLastError(result.error);
        // Continue polling even if there's an API error
        setPollingCount(prev => prev + 1);
        setTimeout(() => pollPaymentStatus(pollUrl), 3000);
      } else {
        console.log('⏳ Payment still pending, continuing to poll...');
        setLastError('');
        // Continue polling
        setPollingCount(prev => prev + 1);
        setTimeout(() => pollPaymentStatus(pollUrl), 3000);
      }
    } catch (error) {
      console.error('❌ Error polling payment status:', error);
      setLastError(error instanceof Error ? error.message : 'Network error');
      setPollingCount(prev => prev + 1);
      
      // Continue polling even if there's an error (network issues, etc.)
      if (pollingCount < 14) {
        console.log('🔄 Retrying after error...');
        setTimeout(() => pollPaymentStatus(pollUrl), 3000);
      } else {
        console.log('🛑 Too many errors, showing failed status');
        setStatus('failed');
      }
    }
  };

  const handleRetry = () => {
    const pollUrl = searchParams?.get('pollUrl');
    if (pollUrl) {
      setStatus('loading');
      setPollingCount(0);
      setLastError('');
      pollPaymentStatus(pollUrl);
    } else {
      router.push('/driver/topup');
    }
  };

  const getTimeRemaining = () => {
    const remainingAttempts = 15 - pollingCount;
    const remainingSeconds = remainingAttempts * 3;
    return `${Math.floor(remainingSeconds / 60)}:${(remainingSeconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-purple-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => router.push('/driver/wallet')}
              className="hover:bg-white/10 p-2 rounded-lg transition"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Payment Status</h1>
          </div>
        </div>

        <div className="p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center animate-pulse">
                  <FiClock className="w-10 h-10 text-purple-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Processing Payment</h2>
              <p className="text-gray-600 mb-4">
                We're confirming your EcoCash payment. This usually takes a few moments.
              </p>
              
              <div className="bg-purple-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between text-sm text-purple-700 mb-2">
                  <span>Checking status...</span>
                  <span>{pollingCount + 1}/15</span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((pollingCount + 1) / 15) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-purple-600 mt-2">
                  Time remaining: ~{getTimeRemaining()}
                </p>
              </div>

              {lastError && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-yellow-700 text-sm">
                    <strong>Note:</strong> {lastError}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center space-x-2 text-purple-600">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                <span className="text-sm">Contacting payment gateway...</span>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                  <FiCheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Payment Successful! 🎉</h2>
              <p className="text-gray-600 mb-2">Your wallet has been topped up successfully.</p>
              <p className="text-green-600 font-semibold mb-6">Thank you for using EcoCash!</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/driver/wallet')}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition shadow-lg"
                >
                  Go to Wallet
                </button>
                <button
                  onClick={() => router.push('/driver/topup')}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4 rounded-lg font-semibold hover:from-purple-600 hover:to-purple-700 transition"
                >
                  Add More Funds
                </button>
              </div>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                  <FiXCircle className="w-10 h-10 text-red-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {lastError ? 'Payment Error' : 'Payment Status Unknown'}
              </h2>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-700 text-sm">
                  {lastError || 'We couldn\'t verify your payment status automatically.'}
                </p>
              </div>

              <p className="text-gray-600 mb-2">
                Your payment may still be processing or there might be an issue.
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Check your EcoCash transaction history or try the payment again.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleRetry}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition flex items-center justify-center space-x-2"
                >
                  <FiRefreshCw className="w-5 h-5" />
                  <span>Check Status Again</span>
                </button>
                
                <button
                  onClick={() => router.push('/driver/topup')}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition"
                >
                  Try New Payment
                </button>
                
                <button
                  onClick={() => router.push('/driver/wallet')}
                  className="w-full bg-gray-200 text-gray-700 px-6 py-4 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Check Wallet Balance
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-2 text-gray-500 text-xs">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Secure payment processed by EcoCash</span>
          </div>
        </div>
      </div>
    </div>
  );
}