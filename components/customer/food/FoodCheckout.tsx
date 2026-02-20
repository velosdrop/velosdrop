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
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("online");
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = restaurant.deliveryFee || 2.99;
  
  // For platform delivery: customer pays food online, driver cash
  // For self delivery: customer pays everything online
  const total = restaurant.deliveryType === 'platform' 
    ? subtotal // Only pay for food online
    : subtotal + deliveryFee; // Pay everything online

  const handlePlaceOrder = () => {
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      const order = {
        id: Date.now(),
        items: cartItems,
        restaurant: restaurant,
        subtotal,
        deliveryFee,
        total,
        deliveryAddress,
        phoneNumber,
        paymentMethod: restaurant.deliveryType === 'platform' ? 'online' : paymentMethod,
        deliveryType: restaurant.deliveryType,
        paymentBreakdown: {
          foodOnline: restaurant.deliveryType === 'platform' ? subtotal : total,
          deliveryCash: restaurant.deliveryType === 'platform' ? deliveryFee : 0,
        },
        notes,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      
      onPlaceOrder(order);
      setIsProcessing(false);
    }, 1500);
  };

  const getPaymentInstructions = () => {
    if (restaurant.deliveryType === 'platform') {
      return {
        title: "💳 Pay Food Online, 💵 Cash to Driver",
        message: "You'll pay for the food now via EcoCash. Please pay the delivery fee in cash to your driver.",
        note: "Driver will carry exact change if needed"
      };
    } else {
      return {
        title: "💳 Pay Everything Online",
        message: "You'll pay the total amount now via EcoCash. The restaurant handles delivery.",
        note: "No cash payment needed on delivery"
      };
    }
  };

  const instructions = getPaymentInstructions();

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-white">Checkout</h2>
      </div>

      {/* Restaurant Info */}
      <div className="bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border border-purple-500/30 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🍽️</div>
          <div>
            <h3 className="font-semibold text-white">{restaurant.name}</h3>
            <p className="text-xs text-gray-400 mt-1">{restaurant.cuisine}</p>
          </div>
          <div className="ml-auto">
            {restaurant.deliveryType === 'platform' ? (
              <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded-full border border-purple-500/30">
                🚚 Platform Delivery
              </span>
            ) : (
              <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
                🛵 Restaurant Delivers
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Payment Instructions Banner */}
      <div className={`rounded-xl p-4 mb-4 ${
        restaurant.deliveryType === 'platform' 
          ? 'bg-blue-600/10 border border-blue-500/30' 
          : 'bg-green-600/10 border border-green-500/30'
      }`}>
        <h3 className="font-semibold text-white mb-1">{instructions.title}</h3>
        <p className="text-sm text-gray-300">{instructions.message}</p>
        <p className="text-xs text-gray-400 mt-2">ℹ️ {instructions.note}</p>
      </div>

      <div className="space-y-4">
        {/* Delivery Address */}
        <div className="bg-gray-800/30 border border-purple-900/30 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-3">Delivery Address</h3>
          <input
            type="text"
            placeholder="Enter your full address"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            className="w-full bg-gray-700/50 border border-purple-900/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        {/* Contact Info */}
        <div className="bg-gray-800/30 border border-purple-900/30 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-3">Contact Information</h3>
          <input
            type="tel"
            placeholder="Phone number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full bg-gray-700/50 border border-purple-900/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        {/* Payment Method - Only show for self-delivery restaurants */}
        {restaurant.deliveryType === 'self' && (
          <div className="bg-gray-800/30 border border-purple-900/30 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-3">Payment Method</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "online"}
                  onChange={() => setPaymentMethod("online")}
                  className="text-purple-600"
                />
                <span className="text-white">Pay Online (EcoCash)</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg cursor-pointer opacity-50 cursor-not-allowed">
                <input
                  type="radio"
                  name="payment"
                  disabled
                  className="text-purple-600"
                />
                <span className="text-white">Cash on Delivery <span className="text-xs text-gray-400">(Coming soon)</span></span>
              </label>
            </div>
          </div>
        )}

        {/* For platform delivery, show payment notice */}
        {restaurant.deliveryType === 'platform' && (
          <div className="bg-gray-800/30 border border-purple-900/30 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-3">Payment</h3>
            <div className="bg-purple-600/10 border border-purple-500/30 rounded-lg p-3">
              <p className="text-sm text-gray-300">
                <span className="text-purple-400 font-medium">Food payment:</span> You'll pay now via EcoCash
              </p>
              <p className="text-sm text-gray-300 mt-2">
                <span className="text-green-400 font-medium">Delivery payment:</span> Cash to driver on arrival
              </p>
            </div>
          </div>
        )}

        {/* Order Notes */}
        <div className="bg-gray-800/30 border border-purple-900/30 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-3">Order Notes (Optional)</h3>
          <textarea
            placeholder="Any special instructions for the restaurant?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
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
              <span>Subtotal (Food)</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-400 mb-1">
              <span>Delivery Fee</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
            
            {/* Show payment breakdown for platform delivery */}
            {restaurant.deliveryType === 'platform' && (
              <div className="mt-3 p-2 bg-purple-600/10 rounded-lg">
                <p className="text-sm text-purple-400 font-medium mb-1">Payment Breakdown:</p>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300">Pay online now:</span>
                  <span className="text-white font-bold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-300">Pay cash to driver:</span>
                  <span className="text-green-400 font-bold">${deliveryFee.toFixed(2)}</span>
                </div>
              </div>
            )}
            
            <div className="flex justify-between font-bold text-white mt-3 pt-2 border-t border-purple-900/30">
              <span>Total to pay online</span>
              <span className="text-purple-400">${total.toFixed(2)}</span>
            </div>
            
            {restaurant.deliveryType === 'platform' && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                + ${deliveryFee.toFixed(2)} cash to driver on delivery
              </p>
            )}
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={!deliveryAddress || !phoneNumber || isProcessing}
            className="w-full mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                {restaurant.deliveryType === 'platform' ? (
                  <>Pay ${subtotal.toFixed(2)} Now (EcoCash)</>
                ) : (
                  <>Pay ${total.toFixed(2)} Now (EcoCash)</>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}