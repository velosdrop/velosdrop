//components/customer/food/FoodOrderTracking.tsx
"use client";

import { useState, useEffect } from "react";

interface Props {
  order: any;
  onBack: () => void;
}

export default function FoodOrderTracking({ order, onBack }: Props) {
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const [estimatedTime, setEstimatedTime] = useState("25-35 min");

  // Mock status updates
  useEffect(() => {
    const statuses = ["pending", "confirmed", "preparing", "ready", "picked_up", "delivered"];
    let index = 0;

    const interval = setInterval(() => {
      if (index < statuses.length - 1) {
        index++;
        setCurrentStatus(statuses[index]);
      } else {
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const statusSteps = [
    { key: "pending", label: "Order Placed", icon: "📝" },
    { key: "confirmed", label: "Confirmed", icon: "✅" },
    { key: "preparing", label: "Preparing", icon: "👨‍🍳" },
    { key: "ready", label: "Ready for Pickup", icon: "🍔" },
    { key: "picked_up", label: "On the Way", icon: "🛵" },
    { key: "delivered", label: "Delivered", icon: "📦" },
  ];

  const currentStepIndex = statusSteps.findIndex(step => step.key === currentStatus);

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Track Order</h2>
          <p className="text-sm text-gray-400">Order #{order.id}</p>
        </div>
      </div>

      {/* Estimated Time */}
      <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 rounded-xl p-6 text-center mb-6">
        <p className="text-sm text-gray-400">Estimated Delivery Time</p>
        <p className="text-3xl font-bold text-white mt-1">{estimatedTime}</p>
      </div>

      {/* Status Timeline */}
      <div className="bg-gray-800/30 border border-purple-900/30 rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-white mb-6">Order Status</h3>
        <div className="relative">
          {statusSteps.map((step, index) => (
            <div key={step.key} className="flex items-start gap-4 mb-6 last:mb-0">
              <div className="relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                  index <= currentStepIndex
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600"
                    : "bg-gray-700"
                }`}>
                  {step.icon}
                </div>
                {index < statusSteps.length - 1 && (
                  <div className={`absolute top-10 left-1/2 w-0.5 h-6 -translate-x-1/2 ${
                    index < currentStepIndex ? "bg-purple-600" : "bg-gray-700"
                  }`} />
                )}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${
                  index <= currentStepIndex ? "text-white" : "text-gray-500"
                }`}>
                  {step.label}
                </p>
                {index === currentStepIndex && (
                  <p className="text-sm text-purple-400 mt-1">In progress...</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Driver Info (mock) */}
      {currentStatus === "picked_up" && (
        <div className="bg-gray-800/30 border border-purple-900/30 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-3">Your Driver</h3>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-xl">
              👤
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">John D.</p>
              <p className="text-sm text-gray-400">License: ZDP 1234</p>
            </div>
            <button className="px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30">
              Contact
            </button>
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div className="bg-gray-800/30 border border-purple-900/30 rounded-xl p-4 mt-4">
        <h3 className="font-semibold text-white mb-3">Order Summary</h3>
        {order.items.map((item: any) => (
          <div key={item.id} className="flex justify-between text-sm text-gray-400 mb-2">
            <span>{item.quantity}x {item.name}</span>
            <span>${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t border-purple-900/30 mt-3 pt-3 flex justify-between font-bold text-white">
          <span>Total</span>
          <span className="text-purple-400">${order.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Cancel Order Button (only if not delivered) */}
      {currentStatus !== "delivered" && (
        <button className="w-full mt-4 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold py-3 rounded-xl transition-all border border-red-600/30">
          Cancel Order
        </button>
      )}
    </div>
  );
}