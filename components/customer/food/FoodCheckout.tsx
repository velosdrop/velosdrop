// components/customer/food/FoodCheckout.tsx
"use client";

import { useState } from "react";

interface Props {
  cartItems: any[];
  restaurant: any;
  onBack: () => void;
  onPlaceOrder: (order: any) => void;
}

export default function FoodCheckout({ cartItems, restaurant, onBack, onPlaceOrder }: Props) {
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = restaurant.deliveryFee || 2.99;
  
  // For platform delivery: customer pays food online, driver cash
  // For self delivery: customer pays everything online
  const total = restaurant.deliveryType === 'platform' 
    ? subtotal // Only pay for food online
    : subtotal + deliveryFee; // Pay everything online

  // Get the merchant's EcoCash code from the restaurant data
  const merchantCode = restaurant.merchantCode || "000000";

  const handlePlaceOrder = async () => {
    // Validate required fields
    if (!deliveryAddress || !phoneNumber) {
      setError("Please fill in all required fields");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      // Get auth token
      const token = localStorage.getItem('customerToken');
      
      if (!token) {
        setError('Please log in to place an order');
        setIsProcessing(false);
        return;
      }

      // Prepare order data for database
      const orderData = {
        restaurantId: restaurant.id,
        items: cartItems.map(item => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes || ''
        })),
        subtotal,
        deliveryFee,
        total,
        customerPhone: phoneNumber,
        deliveryAddress,
        notes,
        paymentMethod: 'online',
        estimatedPreparationTime: 25, // Default
      };

      // Save order to database
      const orderResponse = await fetch('/api/customer/restaurants/orders/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const orderResult = await orderResponse.json();
      const savedOrder = orderResult.order;

      // Create the order object for tracking
      const order = {
        id: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        items: cartItems,
        restaurant: restaurant,
        subtotal,
        deliveryFee,
        total,
        deliveryAddress,
        phoneNumber,
        paymentMethod: 'online',
        deliveryType: restaurant.deliveryType,
        merchantCode: merchantCode,
        paymentBreakdown: {
          foodOnline: restaurant.deliveryType === 'platform' ? subtotal : total,
          deliveryCash: restaurant.deliveryType === 'platform' ? deliveryFee : 0,
        },
        notes,
        status: "confirmed", // Directly set to confirmed since we're bypassing payment
        paymentConfirmed: true,
        paymentReference: `BYPASS-${Date.now()}`,
        statusHistory: [{
          status: 'pending',
          timestamp: new Date().toISOString(),
          note: 'Order placed'
        }, {
          status: 'confirmed',
          timestamp: new Date().toISOString(),
          note: 'Order confirmed (payment bypassed)'
        }],
        confirmedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      
      // Pass to parent
      onPlaceOrder(order);
      
    } catch (error) {
      console.error('Error placing order:', error);
      setError(error instanceof Error ? error.message : 'Failed to place order');
    } finally {
      setIsProcessing(false);
    }
  };

  const getPaymentInstructions = () => {
    if (restaurant.deliveryType === 'platform') {
      return {
        title: "💳 Pay Food via EcoCash, 💵 Cash to Driver",
        message: "Pay for food now using EcoCash. Pay delivery fee in cash to driver.",
        note: "Driver will carry change if needed"
      };
    } else {
      return {
        title: "💳 Pay Everything via EcoCash",
        message: "Pay the total amount using EcoCash. Restaurant handles delivery.",
        note: "No cash payment needed on delivery"
      };
    }
  };

  const instructions = getPaymentInstructions();

  // Render checkout form
  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-gray-950 z-10 flex items-center gap-4 mb-6 p-4 border-b border-purple-900/30">
        <button onClick={onBack} className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-white">Checkout</h2>
      </div>

      <div className="px-4 space-y-4">
        {/* Error Message */}
        {error && (
          <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Restaurant Info with Merchant Code */}
        <div className="bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🍽️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">{restaurant.businessName}</h3>
              {merchantCode && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">Merchant:</span>
                  <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded-full font-mono">
                    {merchantCode}
                  </span>
                </div>
              )}
            </div>
            <div>
              {restaurant.deliveryType === 'platform' ? (
                <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded-full border border-purple-500/30">
                  🚚 Platform
                </span>
              ) : (
                <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
                  🛵 Self Delivery
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Payment Instructions Banner - Updated to show bypass mode */}
        <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-1">⚠️ Test Mode - Payment Bypassed</h3>
          <p className="text-sm text-gray-300">This is a test order. No actual payment will be processed.</p>
          <p className="text-xs text-gray-400 mt-2">Your order will be confirmed immediately.</p>
        </div>

        {/* Delivery Address */}
        <div className="bg-gray-800/30 border border-purple-900/30 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-3">Delivery Address</h3>
          <input
            type="text"
            placeholder="Enter your full address"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            className="w-full bg-gray-700/50 border border-purple-900/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
            required
          />
        </div>

        {/* Contact Info */}
        <div className="bg-gray-800/30 border border-purple-900/30 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-3">Contact Information</h3>
          <input
            type="tel"
            placeholder="Your phone number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full bg-gray-700/50 border border-purple-900/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
            required
          />
        </div>

        {/* Order Notes */}
        <div className="bg-gray-800/30 border border-purple-900/30 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-3">Order Notes (Optional)</h3>
          <textarea
            placeholder="Any special instructions?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-gray-700/50 border border-purple-900/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        {/* Order Summary */}
        <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-900/30 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-3">Order Summary</h3>
          
          {cartItems.map((item) => (
            <div key={item.id} className="flex justify-between text-sm text-gray-400 mb-2">
              <span>{item.quantity}x {item.name}</span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          
          <div className="border-t border-purple-900/30 my-3 pt-3">
            <div className="flex justify-between text-gray-400 mb-1">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-400 mb-1">
              <span>Delivery Fee</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
            
            {restaurant.deliveryType === 'platform' && (
              <div className="mt-3 p-2 bg-purple-600/10 rounded-lg">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300">Pay via EcoCash now:</span>
                  <span className="text-white font-bold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-300">Cash to driver:</span>
                  <span className="text-green-400 font-bold">${deliveryFee.toFixed(2)}</span>
                </div>
              </div>
            )}
            
            <div className="flex justify-between font-bold text-white mt-3 pt-2 border-t border-purple-900/30">
              <span>Total</span>
              <span className="text-purple-400">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Place Order Button - Bypasses payment */}
          <button
            onClick={handlePlaceOrder}
            disabled={!deliveryAddress || !phoneNumber || isProcessing}
            className="w-full mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Placing Order...</span>
              </>
            ) : (
              <>
                <span>✅ Place Test Order (No Payment)</span>
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center mt-3">
            Test mode: Order will be confirmed immediately without payment
          </p>
        </div>
      </div>
    </div>
  );
}