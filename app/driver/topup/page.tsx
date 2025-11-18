// app/driver/topup/page.tsx
'use client';

import { FiDollarSign, FiCreditCard, FiArrowLeft, FiArrowUpRight, FiSmartphone } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CheckoutPage from "@/components/driver/CheckoutPage";
import convertToSubcurrency from "@/lib/convertToSubcurrency";
import MobileMoneyModal from '@/components/driver/MobileMoneyModal';

// Validate Stripe public key
if (!process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY) {
  throw new Error("NEXT_PUBLIC_STRIPE_PUBLIC_KEY is not defined");
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);

// Updated: Phone number formatting function
const formatPhoneNumber = (phone: string) => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If it starts with 263, keep as is
  if (digits.startsWith('263') && digits.length === 12) {
    return `+${digits}`;
  }
  
  // If it starts with 0 and has 10 digits, convert to +263
  if (digits.startsWith('0') && digits.length === 10) {
    return `+263${digits.substring(1)}`;
  }
  
  // If it's 9 digits without prefix, assume it's missing the 0
  if (digits.length === 9) {
    return `+263${digits}`;
  }
  
  return phone;
};

// ✅ UPDATED: Enhanced status polling function with new response structure
const pollPaymentStatus = async (pollUrl: string, driverId: number): Promise<boolean> => {
  try {
    console.log('🔄 Polling payment status:', { pollUrl, driverId });
    
    const response = await fetch(
      `/api/payments/status?pollUrl=${encodeURIComponent(pollUrl)}&driverId=${driverId}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to poll payment status');
    }
    
    const status = await response.json();
    
    console.log('🔄 Payment status poll result:', {
      paid: status.paid,
      status: status.status,
      amount: status.amount,
      reference: status.reference,
      hasValidData: status.paid && status.reference && status.amount
    });
    
    // ✅ FIXED: Consider payment successful if paid=true, regardless of other data
    // The API will now handle wallet updates internally
    if (status.paid) {
      console.log('✅ Payment confirmed via status polling');
      return true;
    } else if (status.status === 'cancelled' || status.status === 'failed') {
      console.log('❌ Payment failed or cancelled');
      return false;
    }
    
    // Continue polling if still pending
    return false;
  } catch (error) {
    console.error('Error polling payment status:', error);
    return false;
  }
};

export default function TopUp() {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'mobile' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [driverId, setDriverId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Get driver ID from localStorage
    if (typeof window !== 'undefined') {
      const savedDriverId = localStorage.getItem('driverId');
      if (savedDriverId) {
        const id = parseInt(savedDriverId);
        setDriverId(id);
        console.log('✅ Driver ID loaded:', id);
      } else {
        console.error('❌ No driver ID found in localStorage');
      }
    }
  }, []);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    
    if (error) setError('');
    
    if (value) {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0.10 || numValue > 100) {
        setError('Please enter an amount between $0.10 and $100');
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
    
    if (numValue < 0.10 || numValue > 100) {
      setError('Amount must be between $0.10 and $100');
      return;
    }

    // ✅ ADDED: Check if driver ID is available
    if (!driverId) {
      setError('Please log in again to continue');
      return;
    }

    setSelectedMethod(method);

    if (method === 'card') {
      // Handle card payment (existing Stripe flow)
      try {
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: convertToSubcurrency(numValue) }),
        });
        
        if (!response.ok) throw new Error('Failed to create payment intent');
        
        const { clientSecret } = await response.json();
        setClientSecret(clientSecret);
        setShowCheckout(true);
      } catch (err) {
        setError('Failed to initialize payment. Please try again.');
      }
    } else if (method === 'mobile') {
      // Show mobile money modal to collect phone number
      setShowMobileModal(true);
    }
  };

  // ✅ UPDATED: Enhanced mobile payment handler with proper polling
  const handleMobilePayment = async (phoneNumber: string) => {
    if (!driverId) {
      setError('Please log in again');
      return;
    }

    setIsProcessing(true);
    setShowMobileModal(false);
  
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      console.log('📱 MOBILE PAYMENT REQUEST:', {
        driverId: driverId,
        originalPhone: phoneNumber,
        formattedPhone: formattedPhone,
        amount: parseFloat(amount)
      });

      const response = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: parseFloat(amount),
          phone: formattedPhone,
          driverId: driverId // ✅ Send driver ID in request
        }),
      });
  
      const result = await response.json();
  
      if (result.success) {
        console.log('✅ Payment initiated successfully:', {
          pollUrl: result.pollUrl,
          reference: result.reference,
          amount: result.amount,
          driverId: result.driverId
        });

        // ✅ ADDED: Start polling for payment status
        const pollResult = await startPaymentPolling(result.pollUrl, driverId);
        
        if (pollResult) {
          console.log('✅ PAYMENT SUCCESSFUL - REDIRECTING AND REFRESHING');
          
          // Force immediate wallet refresh
          if (typeof window !== 'undefined') {
            localStorage.setItem('walletLastUpdate', Date.now().toString());
          }
          
          // Redirect to wallet with refresh parameter
          router.push('/driver/wallet?refresh=true&payment=success&amount=' + parseFloat(amount));
        } else {
          // Payment failed or timed out
          setError('Payment failed or was not completed. Please try again.');
        }
      } else {
        setError(result.error || 'Failed to initiate mobile payment');
      }
    } catch (err) {
      console.error('❌ MOBILE PAYMENT ERROR:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ UPDATED: Function to handle payment polling with timeout
  const startPaymentPolling = async (pollUrl: string, driverId: number): Promise<boolean> => {
    const maxAttempts = 30; // 30 attempts (2.5 minutes at 5-second intervals)
    const interval = 5000; // 5 seconds
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔄 Polling attempt ${attempt}/${maxAttempts}`);
      
      const isPaid = await pollPaymentStatus(pollUrl, driverId);
      
      if (isPaid) {
        console.log('✅ Payment confirmed after', attempt, 'attempts');
        return true;
      }
      
      // Wait before next poll
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    console.log('❌ Payment polling timed out after', maxAttempts, 'attempts');
    return false;
  };

  const handleBackToPaymentMethods = () => {
    setShowCheckout(false);
    setSelectedMethod(null);
    setShowMobileModal(false);
    setClientSecret('');
  };

  const handleBackToWallet = () => {
    router.push('/driver/wallet');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center space-x-4">
            <button 
              onClick={showCheckout ? handleBackToPaymentMethods : handleBackToWallet}
              className="hover:opacity-80 transition"
              disabled={isProcessing}
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
                    min="0.10"
                    max="100"
                    step="0.01"
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
                <p className="mt-1 text-xs text-gray-500">Minimum $0.10 - Maximum $100</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Select Payment Method</h3>
                <div className="space-y-3">
                  <div 
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedMethod === 'card' ? 'border-purple-500 bg-purple-50 shadow-sm' : 'border-gray-200 hover:border-purple-500'
                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => !isProcessing && handlePaymentMethodSelect('card')}
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
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedMethod === 'mobile' ? 'border-purple-500 bg-purple-50 shadow-sm' : 'border-gray-200 hover:border-purple-500'
                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => !isProcessing && handlePaymentMethodSelect('mobile')}
                  >
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white mr-4">
                      <FiSmartphone className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Mobile Money</h4>
                      <p className="text-sm text-gray-600">EcoCash Zimbabwe</p>
                    </div>
                    {selectedMethod === 'mobile' && (
                      <div className="w-5 h-5 rounded-full border-2 border-purple-500 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isProcessing && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-lg">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                    Processing mobile payment...
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Please check your phone for the EcoCash prompt
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    This may take up to 2 minutes to complete
                  </p>
                </div>
              )}
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
                className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
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

      {/* Mobile Money Modal */}
      <MobileMoneyModal 
        isOpen={showMobileModal}
        onClose={() => setShowMobileModal(false)}
        onConfirm={handleMobilePayment}
        amount={amount}
        isLoading={isProcessing}
      />
    </div>
  );
}