"use client";

interface Props {
  items: any[];
  restaurant: any;
  onBack: () => void;
  onCheckout: () => void;
  onUpdateCart: (items: any[]) => void;
}

export default function FoodCart({ items, restaurant, onBack, onCheckout, onUpdateCart }: Props) {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = restaurant?.deliveryFee || 2.99;
  const total = restaurant?.deliveryType === 'platform' ? subtotal : subtotal + deliveryFee;

  const updateQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      onUpdateCart(items.filter(item => item.id !== itemId));
    } else {
      onUpdateCart(items.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-white">Your Cart</h2>
      </div>

      {/* Restaurant Info */}
      {restaurant && (
        <div className="bg-gray-800/30 border border-purple-900/30 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🍽️</span>
            <span className="text-white font-medium">{restaurant.name}</span>
            {restaurant.deliveryType === 'platform' ? (
              <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded-full ml-auto">
                Platform Delivery
              </span>
            ) : (
              <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded-full ml-auto">
                Restaurant Delivers
              </span>
            )}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <div className="text-6xl mb-4">🛒</div>
          <p className="text-lg">Your cart is empty</p>
          <button onClick={onBack} className="mt-4 text-purple-400 hover:text-purple-300">
            Browse Menu
          </button>
        </div>
      ) : (
        <>
          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {items.map((item) => (
              <div key={item.id} className="bg-gray-800/30 border border-purple-900/30 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-white">{item.name}</h4>
                    <p className="text-sm text-gray-400">${item.price} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 bg-gray-700/50 rounded-lg hover:bg-gray-600/50"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 bg-gray-700/50 rounded-lg hover:bg-gray-600/50"
                    >
                      +
                    </button>
                  </div>
                </div>
                <p className="text-right font-semibold text-purple-400 mt-2">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-900/30 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Delivery Fee</span>
                <span>${deliveryFee.toFixed(2)}</span>
              </div>
              
              {restaurant?.deliveryType === 'platform' && (
                <div className="mt-2 text-xs text-purple-400 bg-purple-600/10 p-2 rounded-lg">
                  ℹ️ You'll pay delivery fee (${deliveryFee.toFixed(2)}) in cash to driver
                </div>
              )}
              
              <div className="border-t border-purple-900/30 my-2 pt-2 flex justify-between font-bold text-white">
                <span>Total to pay online</span>
                <span className="text-purple-400">${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={onCheckout}
              className="w-full mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl transition-all"
            >
              Proceed to Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
}