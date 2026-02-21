// components/customer/food/FoodCart.tsx
"use client";

import { useState } from "react";
import Image from "next/image";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  imageUrl?: string | null;
  options?: Array<{ name: string; choice: string; price?: number }>;
}

interface Props {
  items: CartItem[];
  restaurant: any;
  onBack: () => void;
  onCheckout: () => void;
  onUpdateCart: (items: CartItem[]) => void;
  onViewMenu?: () => void;
}

export default function FoodCart({ 
  items, 
  restaurant, 
  onBack, 
  onCheckout, 
  onUpdateCart,
  onViewMenu 
}: Props) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [itemNotes, setItemNotes] = useState<Record<number, string>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});

  // Calculate totals using restaurant's actual delivery fee from database
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Use delivery fee from restaurant data (from database)
  const deliveryFee = restaurant?.deliveryFee || 0;
  
  // For platform delivery, customer pays delivery fee in cash to driver
  // For self delivery, delivery fee is included in online total
  const total = restaurant?.deliveryType === 'platform' ? subtotal : subtotal + deliveryFee;
  
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Check if restaurant has minimum order requirement
  const meetsMinimumOrder = !restaurant?.minimumOrder || subtotal >= restaurant.minimumOrder;
  const minimumOrderRemaining = restaurant?.minimumOrder ? (restaurant.minimumOrder - subtotal).toFixed(2) : 0;

  const updateQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      // Remove item if quantity becomes 0
      onUpdateCart(items.filter(item => item.id !== itemId));
    } else {
      onUpdateCart(items.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const removeItem = (itemId: number) => {
    onUpdateCart(items.filter(item => item.id !== itemId));
  };

  const updateItemNotes = (itemId: number, notes: string) => {
    setItemNotes(prev => ({ ...prev, [itemId]: notes }));
    
    // Update the item in cart with notes
    onUpdateCart(items.map(item => 
      item.id === itemId ? { ...item, notes } : item
    ));
  };

  const toggleNotes = (itemId: number) => {
    setExpandedNotes(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      await onCheckout();
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const getItemTotalPrice = (item: CartItem): number => {
    let total = item.price * item.quantity;
    
    // Add options prices if they exist with proper undefined check
    if (item.options && item.options.length > 0) {
      item.options.forEach(option => {
        // Only add price if it exists and is a number
        if (option.price && typeof option.price === 'number') {
          total += option.price * item.quantity;
        }
      });
    }
    
    return total;
  };

  // Format currency with proper type handling
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Helper to safely format price with undefined check
  const formatPrice = (price: number | undefined | null): string => {
    if (price == null) return formatCurrency(0);
    return formatCurrency(price);
  };

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur-sm border-b border-purple-900/30 px-4 py-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">Your Cart</h2>
            <p className="text-sm text-gray-400">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
          </div>
        </div>
      </div>

      {/* Restaurant Info */}
      {restaurant && (
        <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border-b border-purple-900/30 px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Restaurant Logo */}
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
              {restaurant.logoUrl ? (
                <Image
                  src={restaurant.logoUrl}
                  alt={restaurant.businessName}
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-xl text-white">
                  {restaurant.businessName?.charAt(0) || 'R'}
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-white">{restaurant.businessName}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  restaurant.deliveryType === 'platform' 
                    ? 'bg-purple-600/20 text-purple-400' 
                    : 'bg-green-600/20 text-green-400'
                }`}>
                  {restaurant.deliveryType === 'platform' ? 'Platform Delivery' : 'Restaurant Delivers'}
                </span>
                {restaurant.minimumOrder > 0 && (
                  <span className="text-xs text-gray-400">
                    Min. {formatCurrency(restaurant.minimumOrder)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 px-4">
          <div className="text-8xl mb-4 opacity-50">🛒</div>
          <p className="text-xl text-white mb-2">Your cart is empty</p>
          <p className="text-sm text-gray-500 text-center mb-6">
            Add items from the restaurant menu to get started
          </p>
          <button 
            onClick={onViewMenu || onBack} 
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition-all"
          >
            Browse Menu
          </button>
        </div>
      ) : (
        <>
          {/* Minimum Order Warning */}
          {!meetsMinimumOrder && restaurant?.minimumOrder > 0 && (
            <div className="mx-4 mt-4 bg-yellow-600/20 border border-yellow-600/30 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm text-yellow-400 font-medium">Minimum order not met</p>
                  <p className="text-xs text-yellow-500/80 mt-1">
                    Add {formatCurrency(Number(minimumOrderRemaining))} more to checkout
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="bg-gray-900/50 border border-purple-900/30 rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex gap-3">
                    {/* Item Image */}
                    <div className="w-16 h-16 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          width={64}
                          height={64}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600/20 to-indigo-600/20 flex items-center justify-center text-2xl">
                          🍽️
                        </div>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-white">{item.name}</h4>
                          <p className="text-sm text-gray-400">
                            {formatCurrency(item.price)} each
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 hover:bg-gray-800 rounded-lg transition-colors group"
                          aria-label="Remove item"
                        >
                          <svg className="w-5 h-5 text-gray-500 group-hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {/* Options if any - FIXED: Added proper undefined check */}
                      {item.options && item.options.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          {item.options.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <span className="text-purple-400">•</span>
                              <span>{opt.name}: {opt.choice}</span>
                              {/* Fixed: Check if price exists and is a number */}
                              {opt.price != null && opt.price > 0 && (
                                <span className="text-purple-400">
                                  (+{formatCurrency(opt.price)})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center text-white"
                            disabled={item.quantity <= 1}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="w-8 text-center text-white font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center text-white"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                        <p className="font-semibold text-purple-400">
                          {formatCurrency(getItemTotalPrice(item))}
                        </p>
                      </div>

                      {/* Special Instructions Button */}
                      <button
                        onClick={() => toggleNotes(item.id)}
                        className="mt-2 text-xs text-gray-500 hover:text-purple-400 flex items-center gap-1 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        {expandedNotes[item.id] ? 'Hide' : 'Add'} special instructions
                      </button>

                      {/* Notes Input */}
                      {expandedNotes[item.id] && (
                        <div className="mt-2">
                          <textarea
                            value={itemNotes[item.id] || item.notes || ''}
                            onChange={(e) => updateItemNotes(item.id, e.target.value)}
                            placeholder="E.g., no onions, extra sauce, etc."
                            className="w-full bg-gray-800 border border-purple-900/30 rounded-lg p-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur-sm border-t border-purple-900/30 p-4">
            <div className="max-w-7xl mx-auto">
              <h3 className="font-semibold text-white mb-3">Order Summary</h3>
              
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                
                <div className="flex justify-between text-gray-400">
                  <span>Delivery Fee</span>
                  <span>{deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Free'}</span>
                </div>
                
                {restaurant?.deliveryType === 'platform' && deliveryFee > 0 && (
                  <div className="mt-2 text-xs text-purple-400 bg-purple-600/10 p-2 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        You'll pay delivery fee ({formatCurrency(deliveryFee)}) in cash to the driver
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="border-t border-purple-900/30 my-2 pt-2"></div>
                
                <div className="flex justify-between font-bold text-white">
                  <span>Total to pay online</span>
                  <span className="text-purple-400 text-lg">{formatCurrency(total)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={!meetsMinimumOrder || isCheckingOut || items.length === 0}
                className={`w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 rounded-xl transition-all ${
                  !meetsMinimumOrder || isCheckingOut || items.length === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-purple-600/25'
                }`}
              >
                {isCheckingOut ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : !meetsMinimumOrder ? (
                  `Add ${formatCurrency(Number(minimumOrderRemaining))} more`
                ) : (
                  'Proceed to Checkout'
                )}
              </button>

              {/* Continue Shopping Link */}
              <button
                onClick={onViewMenu || onBack}
                className="w-full text-center text-sm text-gray-500 hover:text-purple-400 mt-3 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}