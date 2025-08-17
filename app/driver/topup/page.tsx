'use client';

import { FiDollarSign, FiCreditCard, FiArrowLeft, FiArrowUpRight } from 'react-icons/fi';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CheckoutPage from "@/components/driver/CheckoutPage";
import convertToSubcurrency from "@/lib/convertToSubcurrency";

// Validate Stripe public key
if (!process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY) {
  throw new Error("NEXT_PUBLIC_STRIPE_PUBLIC_KEY is not defined");
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);

export default function TopUp() {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'mobile' | null>(null);
  const router = useRouter();

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    
    if (error) setError('');
    
    if (value) {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 2 || numValue > 100) {
        setError('Please enter an amount between $2 and $100');
      }
    }
  };

  const handlePaymentMethodSelect = async (method: 'card' | 'mobile') => {
    if (!amount) {
      setError('Please enter an amount');
      return;
    }
    
    const numValue = parseFloat(amount);
    if (isNaN(numValue)) {
      setError('Please enter a valid number');
      return;
    }
    
    if (numValue < 2 || numValue > 100) {
      setError('Amount must be between $2 and $100');
      return;
    }

    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: convertToSubcurrency(numValue) }),
      });
      
      if (!response.ok) throw new Error('Failed to create payment intent');
      
      const { clientSecret } = await response.json();
      setClientSecret(clientSecret);
      setSelectedMethod(method);
      setShowCheckout(true);
    } catch (err) {
      setError('Failed to initialize payment. Please try again.');
    }
  };

  const handleBackToPaymentMethods = () => {
    setShowCheckout(false);
    setSelectedMethod(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center space-x-4">
            <button 
              onClick={showCheckout ? handleBackToPaymentMethods : () => router.push('/driver/wallet')}
              className="hover:opacity-80 transition"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">
              {showCheckout ? 'Complete Payment' : 'Top Up Wallet'}
            </h1>
          </div>
          <p className="text-purple-100 mt-2">
            {showCheckout ? 'Enter your payment details' : 'Add funds to continue accepting deliveries'}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {!showCheckout ? (
            <>
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter Amount (USD)
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiDollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    name="amount"
                    id="amount"
                    min="2"
                    max="100"
                    value={amount}
                    onChange={handleAmountChange}
                    className={`focus:ring-purple-500 focus:border-purple-500 block w-full pl-10 pr-12 py-3 border ${
                      error ? 'border-red-500' : 'border-gray-300'
                    } rounded-md text-gray-900`}
                    placeholder="0.00"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-gray-500">USD</span>
                  </div>
                </div>
                {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
                <p className="mt-1 text-xs text-gray-500">Minimum $2 - Maximum $100</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Select Payment Method</h3>
                <div className="space-y-3">
                  <div 
                    className={`flex items-center p-4 border rounded-lg cursor-pointer ${
                      selectedMethod === 'card' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-500'
                    }`}
                    onClick={() => handlePaymentMethodSelect('card')}
                  >
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-white mr-4">
                      <FiCreditCard className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Credit/Debit Card</h4>
                      <p className="text-sm text-gray-600">Visa, Mastercard</p>
                    </div>
                    {selectedMethod === 'card' && (
                      <div className="w-5 h-5 rounded-full border-2 border-purple-500 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                      </div>
                    )}
                  </div>

                  <div 
                    className={`flex items-center p-4 border rounded-lg cursor-pointer ${
                      selectedMethod === 'mobile' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-500'
                    }`}
                    onClick={() => handlePaymentMethodSelect('mobile')}
                  >
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white mr-4">
                      <FiArrowUpRight className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Mobile Money</h4>
                      <p className="text-sm text-gray-600">EcoCash, MPesa, etc.</p>
                    </div>
                    {selectedMethod === 'mobile' && (
                      <div className="w-5 h-5 rounded-full border-2 border-purple-500 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : clientSecret ? (
            <Elements 
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#7c3aed',
                  }
                }
              }}
            >
              <CheckoutPage amount={parseFloat(amount)} />
            </Elements>
          ) : (
            <div className="text-center py-8">
              <p className="text-red-500">Payment initialization failed. Please try again.</p>
              <button
                onClick={handleBackToPaymentMethods}
                className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg"
              >
                Back to Payment Methods
              </button>
            </div>
          )}

          {!showCheckout && (
            <div className="flex items-start text-xs text-gray-600">
              <svg className="h-4 w-4 text-purple-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>All transactions are secure and encrypted</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}