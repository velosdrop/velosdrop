'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { redirect } from 'next/navigation';

export default function PaymentSuccess() {
  const searchParams = useSearchParams();
  const [amount, setAmount] = useState<string>('0.00');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!searchParams) {
      redirect('/driver/wallet');
      return;
    }

    // Get amount from URL params
    const paymentAmount = searchParams.get('amount');
    if (!paymentAmount) {
      redirect('/driver/wallet');
      return;
    }

    setAmount(paymentAmount);
    setIsLoading(false);
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 p-6 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
            <div className="h-12 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="h-6 bg-gray-200 rounded w-5/6 mx-auto"></div>
            <div className="h-10 bg-gray-200 rounded w-32 mx-auto mt-8"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 transform transition-all hover:scale-[1.01] hover:shadow-xl">
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-white text-center">
          <div className="flex justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-green-100">Your transaction has been completed</p>
        </div>
        <div className="p-8 text-center">
          <p className="text-lg mb-4 text-gray-700 font-medium">You've successfully topped up:</p>
          <div className="text-4xl font-bold text-purple-600 mb-6">
            ${parseFloat(amount).toFixed(2)}
          </div>
          <p className="text-gray-600 mb-8">The amount has been added to your wallet balance.</p>
          <a 
            href="/driver/wallet" 
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-8 rounded-lg transition-all duration-200 hover:shadow-md"
          >
            Back to Wallet
          </a>
        </div>
      </div>
    </div>
  );
}