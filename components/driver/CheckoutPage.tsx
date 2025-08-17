'use client';

import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CheckoutPage = ({ amount }: { amount: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/driver/payment-success?amount=${amount}`,
        },
      });

      if (error) {
        setMessage(error.message || 'Payment failed. Please try again.');
      }
    } catch (err) {
      setMessage('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement id="payment-element" options={{ layout: 'tabs' }} />
      <button
        disabled={isLoading || !stripe || !elements}
        id="submit"
        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50"
      >
        {isLoading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
      </button>
      {message && (
        <div className="text-red-500 text-sm mt-2" id="payment-message">
          {message}
        </div>
      )}
    </form>
  );
};

export default CheckoutPage;