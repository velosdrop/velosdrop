// components/customer/food/FoodOrderTracking.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface Props {
  order: any;
  onBack: () => void;
}

export default function FoodOrderTracking({ order, onBack }: Props) {
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const [estimatedTime, setEstimatedTime] = useState("Calculating...");
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [statusHistory, setStatusHistory] = useState<any[]>(order.statusHistory || []);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Fetch real-time order updates
  useEffect(() => {
    const fetchOrderStatus = async () => {
      try {
        // Only fetch if we have a real order ID (not a mock one)
        if (order.id && !order.id.toString().startsWith('FOOD-')) {
          const response = await fetch(`/api/customer/restaurants/orders/${order.id}/status`);
          if (response.ok) {
            const data = await response.json();
            setCurrentStatus(data.status);
            setStatusHistory(data.statusHistory || []);
            
            // Update driver info if assigned
            if (data.driver) {
              setDriverInfo(data.driver);
            }

            // Update estimated time based on preparation time
            if (data.estimatedPreparationTime) {
              updateEstimatedTime(data.estimatedPreparationTime, data.status);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching order status:', error);
      }
    };

    // Fetch immediately
    fetchOrderStatus();

    // Set up polling every 10 seconds for real-time updates
    const interval = setInterval(fetchOrderStatus, 10000);

    return () => clearInterval(interval);
  }, [order.id]);

  // Calculate and update estimated time
  const updateEstimatedTime = (prepTime: number, status: string) => {
    let totalMinutes = prepTime;
    
    // Add delivery time based on distance (mock for now)
    const deliveryTime = 15; // Average delivery time in minutes
    
    if (status === 'pending') {
      setEstimatedTime(`${prepTime}-${prepTime + 10} min`);
    } else if (status === 'confirmed') {
      setEstimatedTime(`Preparing (${prepTime-5}-${prepTime} min)`);
    } else if (status === 'preparing') {
      setEstimatedTime(`Being prepared (${Math.floor(prepTime/2)}-${prepTime} min)`);
    } else if (status === 'ready') {
      setEstimatedTime(`Ready for pickup (${deliveryTime} min delivery)`);
    } else if (status === 'picked_up') {
      setEstimatedTime(`On the way (${deliveryTime-5}-${deliveryTime} min)`);
    } else if (status === 'delivered') {
      setEstimatedTime('Delivered');
    }
  };

  // Get status display info based on current status
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; icon: string; color: string; description: string }> = {
      pending: { 
        label: "Order Placed", 
        icon: "📝", 
        color: "text-yellow-400",
        description: "Your order has been received and is waiting for restaurant confirmation"
      },
      confirmed: { 
        label: "Confirmed", 
        icon: "✅", 
        color: "text-blue-400",
        description: "Restaurant has confirmed your order and will start preparing soon"
      },
      preparing: { 
        label: "Preparing", 
        icon: "👨‍🍳", 
        color: "text-purple-400",
        description: "Your food is being prepared by the restaurant"
      },
      ready: { 
        label: "Ready for Pickup", 
        icon: "🍔", 
        color: "text-orange-400",
        description: "Your order is ready and waiting for driver pickup"
      },
      picked_up: { 
        label: "On the Way", 
        icon: "🛵", 
        color: "text-green-400",
        description: driverInfo ? `${driverInfo.name} is bringing your order` : "Driver is on the way with your order"
      },
      delivered: { 
        label: "Delivered", 
        icon: "📦", 
        color: "text-green-600",
        description: "Your order has been delivered. Enjoy your meal!"
      },
      cancelled: { 
        label: "Cancelled", 
        icon: "❌", 
        color: "text-red-400",
        description: "This order has been cancelled"
      },
    };
    
    return statusMap[status] || statusMap.pending;
  };

  const statusInfo = getStatusInfo(currentStatus);

  // Define all possible status steps in order
  const statusSteps = [
    { key: "pending", label: "Order Placed", icon: "📝" },
    { key: "confirmed", label: "Confirmed", icon: "✅" },
    { key: "preparing", label: "Preparing", icon: "👨‍🍳" },
    { key: "ready", label: "Ready for Pickup", icon: "🍔" },
    { key: "picked_up", label: "On the Way", icon: "🛵" },
    { key: "delivered", label: "Delivered", icon: "📦" },
  ];

  const currentStepIndex = statusSteps.findIndex(step => step.key === currentStatus);

  // Format order date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle order cancellation
  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/customer/restaurant/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        setCurrentStatus('cancelled');
      } else {
        alert('Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-gray-950 z-10 flex items-center gap-4 mb-6 p-4 border-b border-purple-900/30">
        <button onClick={onBack} className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Track Order</h2>
          <p className="text-sm text-gray-400">
            Order #{order.orderNumber || order.id}
            <span className="ml-2 text-xs bg-gray-800 px-2 py-0.5 rounded-full">
              {formatDate(order.createdAt)}
            </span>
          </p>
        </div>
      </div>

      {/* Restaurant Info */}
      <div className="px-4 mb-4">
        <div className="bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            {order.restaurant?.logoUrl ? (
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <Image
                  src={order.restaurant.logoUrl}
                  alt={order.restaurant.businessName}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center text-2xl">
                🍽️
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-white">{order.restaurant?.businessName}</h3>
              <p className="text-xs text-gray-400">{order.restaurant?.address || order.deliveryAddress}</p>
            </div>
            {order.merchantCode && (
              <div className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded-full">
                Code: {order.merchantCode}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current Status Banner */}
      <div className="px-4 mb-4">
        <div className={`bg-gradient-to-r ${
          currentStatus === 'delivered' ? 'from-green-600/20 to-green-700/20 border-green-500/30' :
          currentStatus === 'cancelled' ? 'from-red-600/20 to-red-700/20 border-red-500/30' :
          'from-purple-600/20 to-indigo-600/20 border-purple-500/30'
        } border rounded-xl p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{statusInfo.icon}</span>
              <div>
                <p className="text-sm text-gray-400">Current Status</p>
                <p className={`text-xl font-bold ${statusInfo.color}`}>{statusInfo.label}</p>
              </div>
            </div>
            {currentStatus !== 'delivered' && currentStatus !== 'cancelled' && (
              <div className="text-right">
                <p className="text-sm text-gray-400">Est. Time</p>
                <p className="text-white font-bold">{estimatedTime}</p>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-300 mt-2">{statusInfo.description}</p>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="px-4 mb-6">
        <div className="bg-gray-800/30 border border-purple-900/30 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-6">Order Progress</h3>
          <div className="relative">
            {statusSteps.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              
              // Check if this step has a timestamp in history
              const historyItem = statusHistory.find(h => h.status === step.key);
              
              return (
                <div key={step.key} className="flex items-start gap-4 mb-6 last:mb-0">
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                      isCompleted
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
                      isCompleted ? "text-white" : "text-gray-500"
                    }`}>
                      {step.label}
                    </p>
                    {historyItem && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(historyItem.timestamp).toLocaleTimeString()}
                      </p>
                    )}
                    {isCurrent && currentStatus !== 'delivered' && currentStatus !== 'cancelled' && (
                      <p className="text-xs text-purple-400 animate-pulse mt-1">
                        In progress...
                      </p>
                    )}
                  </div>
                  {isCompleted && !isCurrent && (
                    <span className="text-green-400 text-sm">✓</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Driver Info - Show when order is picked up */}
      {currentStatus === "picked_up" && driverInfo && (
        <div className="px-4 mb-4">
          <div className="bg-gray-800/30 border border-purple-900/30 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-3">Your Driver</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-xl">
                {driverInfo.profilePicture ? (
                  <Image src={driverInfo.profilePicture} alt={driverInfo.name} width={48} height={48} className="rounded-full" />
                ) : (
                  '👤'
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">{driverInfo.name}</p>
                <p className="text-sm text-gray-400">{driverInfo.vehicleType} • {driverInfo.numberPlate}</p>
                {driverInfo.phone && (
                  <p className="text-xs text-gray-500 mt-1">{driverInfo.phone}</p>
                )}
              </div>
              <a
                href={`tel:${driverInfo.phone}`}
                className="px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30"
              >
                Contact
              </a>
            </div>
            
            {/* Live tracking button (mock) */}
            <button className="w-full mt-3 bg-purple-600/10 border border-purple-500/30 text-purple-400 py-2 rounded-lg text-sm hover:bg-purple-600/20">
              📍 Track Driver Location
            </button>
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div className="px-4">
        <div className="bg-gray-800/30 border border-purple-900/30 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-3">Order Summary</h3>
          
          {/* Items */}
          <div className="space-y-2 mb-4">
            {order.items.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-400">
                  {item.quantity}x {item.name}
                  {item.notes && <span className="text-xs text-gray-500 ml-2">({item.notes})</span>}
                </span>
                <span className="text-white">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Price Breakdown */}
          <div className="border-t border-purple-900/30 pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-white">${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Delivery Fee</span>
              <span className="text-white">${order.deliveryFee.toFixed(2)}</span>
            </div>
            
            {/* Payment breakdown for platform delivery */}
            {order.deliveryType === 'platform' && order.paymentBreakdown && (
              <div className="mt-2 p-2 bg-purple-600/10 rounded-lg">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Paid via EcoCash:</span>
                  <span className="text-green-400">${order.paymentBreakdown.foodOnline.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-400">Cash to driver:</span>
                  <span className="text-yellow-400">${order.paymentBreakdown.deliveryCash.toFixed(2)}</span>
                </div>
              </div>
            )}
            
            <div className="border-t border-purple-900/30 pt-2 mt-2 flex justify-between font-bold">
              <span className="text-white">Total</span>
              <span className="text-purple-400">${order.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="mt-4 pt-4 border-t border-purple-900/30">
            <p className="text-xs text-gray-500 mb-1">Delivery Address</p>
            <p className="text-sm text-white">{order.deliveryAddress}</p>
            <p className="text-xs text-gray-500 mt-2">Phone: {order.phoneNumber}</p>
          </div>

          {/* Payment Reference */}
          {order.paymentReference && (
            <div className="mt-3 text-xs text-gray-500">
              EcoCash Ref: {order.paymentReference}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 mt-4 space-y-3">
        {/* Cancel Order Button (only if not delivered and not cancelled) */}
        {currentStatus !== "delivered" && currentStatus !== "cancelled" && (
          <button
            onClick={handleCancelOrder}
            disabled={loading}
            className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold py-3 rounded-xl transition-all border border-red-600/30 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Cancel Order'}
          </button>
        )}

        {/* Reorder Button (only if delivered) */}
        {currentStatus === "delivered" && (
          <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all">
            🔄 Reorder
          </button>
        )}
      </div>

      {/* Need Help? */}
      <div className="px-4 mt-6 text-center">
        <button className="text-sm text-gray-500 hover:text-purple-400 transition-colors">
          Need help with your order?
        </button>
      </div>
    </div>
  );
}