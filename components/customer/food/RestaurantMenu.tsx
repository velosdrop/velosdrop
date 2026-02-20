// components/customer/food/RestaurantMenu.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  imageUrl: string | null;
  isPopular: boolean | null;
  isAvailable: boolean;
  preparationTime: number | null;
}

interface Props {
  restaurant: any;
  onBack: () => void;
  onAddToCart: (item: any) => void;
}

export default function RestaurantMenu({ restaurant, onBack, onAddToCart }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartAnimation, setCartAnimation] = useState<number | null>(null);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);

  // Fetch menu items for this restaurant - USING PUBLIC ENDPOINT
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true);
        // Use the public customer endpoint instead of merchant endpoint
        const response = await fetch(`/api/customer/restaurants/${restaurant.id}/menu`);
        
        if (!response.ok) throw new Error('Failed to fetch menu');
        
        const data = await response.json();
        setMenuItems(data);
      } catch (err) {
        console.error('Error fetching menu:', err);
        setError('Failed to load menu items');
      } finally {
        setLoading(false);
      }
    };

    if (restaurant?.id) {
      fetchMenuItems();
    }
  }, [restaurant.id]);

  // Get unique categories from actual menu items
  const uniqueCategories = Array.from(new Set(menuItems.map(item => item.category).filter(Boolean) as string[]));
  const categories = ["all", ...uniqueCategories];
  
  const filteredItems = selectedCategory === "all" 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const handleAddToCart = (item: MenuItem) => {
    const quantity = quantities[item.id] || 1;
    
    // Trigger animation
    setCartAnimation(item.id);
    setTimeout(() => setCartAnimation(null), 300);
    
    // Update cart summary
    setCartItemCount(prev => prev + quantity);
    setCartTotal(prev => prev + (item.price * quantity));
    
    onAddToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity,
      notes: '',
      imageUrl: item.imageUrl
    });
    
    // Reset quantity for this item
    setQuantities(prev => ({ ...prev, [item.id]: 1 }));
  };

  const updateQuantity = (itemId: number, delta: number) => {
    setQuantities(prev => {
      const current = prev[itemId] || 1;
      const newQuantity = Math.max(1, current + delta);
      return { ...prev, [itemId]: newQuantity };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-purple-400">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">{error}</p>
          <button 
            onClick={onBack}
            className="text-purple-400 hover:text-purple-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Restaurant Header - DoorDash style */}
      <div className="relative h-48 bg-gradient-to-r from-purple-900 to-indigo-900">
        {restaurant.coverImageUrl ? (
          <Image
            src={restaurant.coverImageUrl}
            alt={restaurant.businessName}
            fill
            className="object-cover opacity-60"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/50 to-indigo-900/50" />
        )}
        
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Restaurant Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-end gap-4">
            {/* Logo */}
            <div className="w-20 h-20 rounded-2xl border-4 border-gray-900 overflow-hidden shadow-xl bg-gray-900 flex-shrink-0">
              {restaurant.logoUrl ? (
                <Image
                  src={restaurant.logoUrl}
                  alt={restaurant.businessName}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-3xl text-white">
                  {restaurant.businessName.charAt(0)}
                </div>
              )}
            </div>
            
            {/* Details */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{restaurant.businessName}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-300">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>{restaurant.averageRating?.toFixed(1) || 'New'}</span>
                </div>
                <span>•</span>
                <span>{menuItems.length} items</span>
                <span>•</span>
                <span>{restaurant.city}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Filter - DoorDash style */}
      <div className="sticky top-0 z-10 bg-gray-950 border-b border-purple-900/30 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-purple-600 text-white"
                    : "bg-gray-900 text-gray-300 border border-purple-900/30 hover:border-purple-500"
                }`}
              >
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items Grid - DoorDash style */}
      <div className="px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 bg-gray-900/50 rounded-lg border border-purple-900/30">
              <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <p className="text-gray-400 text-lg">No items in this category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`bg-gray-900 border border-purple-900/30 rounded-lg overflow-hidden hover:shadow-xl hover:shadow-purple-600/10 hover:border-purple-500 transition-all ${
                    cartAnimation === item.id ? 'scale-95 opacity-50' : ''
                  }`}
                >
                  {/* Item Image */}
                  <div className="relative h-40 bg-gradient-to-br from-gray-800 to-gray-900">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600/20 to-indigo-600/20 flex items-center justify-center text-3xl">
                          🍽️
                        </div>
                      </div>
                    )}
                    
                    {/* Popular Badge */}
                    {item.isPopular && (
                      <div className="absolute top-3 left-3 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
                        Popular
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-white">{item.name}</h3>
                      <span className="text-lg font-bold text-purple-400">${item.price.toFixed(2)}</span>
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{item.description}</p>
                    )}

                    {/* Quantity Selector and Add Button - DoorDash style */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-gray-800 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-l-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="w-10 text-center text-white font-medium">
                          {quantities[item.id] || 1}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-r-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                      
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Add
                      </button>
                    </div>

                    {/* Preparation Time (if available) */}
                    {item.preparationTime && (
                      <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {item.preparationTime} min prep
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Summary - Sticky bottom (DoorDash style) */}
      <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur-sm border-t border-purple-900/30 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-400">Your cart</p>
              <p className="text-white font-medium">{cartItemCount} items • ${cartTotal.toFixed(2)}</p>
            </div>
          </div>
          <button className="bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors">
            View Cart
          </button>
        </div>
      </div>
    </div>
  );
}