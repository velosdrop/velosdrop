// components/customer/food/FoodSection.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import RestaurantMenu from "./RestaurantMenu";
import FoodCart from "./FoodCart";
import FoodCheckout from "./FoodCheckout";
import FoodOrderTracking from "./FoodOrderTracking";
import SearchingForFoodDrivers from "./SearchingForFoodDrivers"; // Import the driver search component

interface Category {
  id: number;
  name: string;
  imageUrl: string | null;
  merchantId: number;
}

interface Merchant {
  id: number;
  businessName: string;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  businessType: string | null;
  deliveryType: 'platform' | 'self';
  deliveryFee: number;
  deliveryRadius: number;
  minimumOrder: number;
  averageRating: number | null;
  isOpen: boolean;
  isActive: boolean;
  status: string;
  city: string;
  address: string;
  businessHours: any;
  categories: Category[];
  merchantCode?: string;
  latitude?: number;
  longitude?: number;
}

export default function FoodSection() {
  const [view, setView] = useState<"restaurants" | "menu" | "cart" | "checkout" | "tracking" | "searching">("restaurants");
  const [selectedRestaurant, setSelectedRestaurant] = useState<Merchant | null>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingOrder, setPendingOrder] = useState<any>(null); // Add this for platform delivery

  // Fetch restaurants from database
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        
        const response = await fetch('/api/customer/restaurants');
        
        if (!response.ok) throw new Error('Failed to fetch restaurants');
        
        const data = await response.json();
        console.log('Fetched restaurants:', data);
        setRestaurants(data);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load restaurants');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  // Get unique categories
  const allCategoryNames = restaurants.flatMap(r => 
    r.categories?.map(c => c.name) || []
  );
  const uniqueCategoryNames = Array.from(new Set(allCategoryNames));
  const categories = ["all", ...uniqueCategoryNames];

  // Filter restaurants
  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesSearch = restaurant.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (restaurant.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesDeliveryType = selectedDeliveryType === 'all' || restaurant.deliveryType === selectedDeliveryType;
    const matchesCategory = selectedCategory === 'all' || 
      restaurant.categories?.some(cat => cat.name === selectedCategory);
    const isActive = restaurant.isActive === true;
    
    return matchesSearch && matchesDeliveryType && matchesCategory && isActive;
  });

  const getDeliveryBadge = (restaurant: Merchant) => {
    if (restaurant.deliveryType === 'platform') {
      return {
        text: "Platform delivery",
        color: "bg-purple-600 text-white"
      };
    } else {
      return {
        text: "Restaurant delivers",
        color: "bg-gray-700 text-gray-300"
      };
    }
  };

  // Handle when driver is found
  const handleDriverFound = (driver: any) => {
    // Update the order with driver info
    const updatedOrder = {
      ...pendingOrder,
      driver: driver,
      driverAssigned: true,
      status: "preparing" // Now the restaurant can start preparing
    };
    
    setCurrentOrder(updatedOrder);
    setView("tracking");
  };

  // Handle cancel search
  const handleCancelSearch = () => {
    setView("cart"); // Go back to cart
    setPendingOrder(null);
  };

  if (view === "menu" && selectedRestaurant) {
    return (
      <RestaurantMenu 
        restaurant={selectedRestaurant}
        onBack={() => setView("restaurants")}
        onAddToCart={(item) => {
          setCartItems([...cartItems, item]);
          setView("cart");
        }}
      />
    );
  }

  if (view === "cart") {
    return (
      <FoodCart 
        items={cartItems}
        restaurant={selectedRestaurant}
        onBack={() => setView("menu")}
        onCheckout={() => setView("checkout")}
        onUpdateCart={setCartItems}
      />
    );
  }

  if (view === "checkout") {
    return (
      <FoodCheckout 
        cartItems={cartItems}
        restaurant={selectedRestaurant}
        onBack={() => setView("cart")}
        onPlaceOrder={(order) => {
          // Check if restaurant needs a driver (platform delivery)
          if (selectedRestaurant?.deliveryType === 'platform') {
            // Save order and show driver search
            setPendingOrder(order);
            setView("searching");
          } else {
            // Restaurant has own bikers - go directly to tracking
            setCurrentOrder(order);
            setView("tracking");
          }
        }}
      />
    );
  }

  // New view for searching drivers
  if (view === "searching" && pendingOrder && selectedRestaurant) {
    return (
      <SearchingForFoodDrivers
        orderId={pendingOrder.id}
        restaurantId={selectedRestaurant.id}
        restaurantName={selectedRestaurant.businessName}
        restaurantAddress={selectedRestaurant.address}
        restaurantCoords={{
          latitude: selectedRestaurant.latitude || -17.827,
          longitude: selectedRestaurant.longitude || 31.033
        }}
        deliveryAddress={pendingOrder.deliveryAddress}
        deliveryCoords={{
          latitude: -17.827, // You'll need to get these from somewhere
          longitude: 31.033
        }}
        items={pendingOrder.items}
        subtotal={pendingOrder.subtotal}
        deliveryFee={pendingOrder.deliveryFee}
        totalAmount={pendingOrder.total}
        customerId={pendingOrder.customerId || 1} // Make sure this comes from your auth
        customerName={pendingOrder.customerName || "Customer"}
        customerPhone={pendingOrder.phoneNumber}
        onCancel={handleCancelSearch}
        onDriverAssigned={handleDriverFound}
      />
    );
  }

  if (view === "tracking" && currentOrder) {
    return (
      <FoodOrderTracking 
        order={currentOrder}
        onBack={() => setView("restaurants")}
      />
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-purple-400">Loading restaurants near you...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="text-purple-400 hover:text-purple-300"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header - DoorDash style */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur-sm border-b border-purple-900/30 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Food Delivery</h1>
            <button className="p-2 hover:bg-gray-800 rounded-full transition-colors">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar - DoorDash style */}
      <div className="sticky top-[57px] z-10 bg-gray-950/95 backdrop-blur-sm px-4 py-3 border-b border-purple-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for restaurants or cuisines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-purple-900/30 rounded-lg py-3 px-4 pl-12 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <svg className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filter Chips - DoorDash style */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedDeliveryType("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedDeliveryType === "all"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-900 text-gray-300 border border-purple-900/30 hover:border-purple-500"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedDeliveryType("platform")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedDeliveryType === "platform"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-900 text-gray-300 border border-purple-900/30 hover:border-purple-500"
              }`}
            >
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
                </svg>
                Platform
              </span>
            </button>
            <button
              onClick={() => setSelectedDeliveryType("self")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedDeliveryType === "self"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-900 text-gray-300 border border-purple-900/30 hover:border-purple-500"
              }`}
            >
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
                </svg>
                Self
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Categories - DoorDash style */}
      {categories.length > 1 && (
        <div className="px-4 py-4 border-b border-purple-900/30">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Categories</h2>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map((cat) => (
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
      )}

      {/* Restaurant Grid - DoorDash style */}
      <div className="px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              {filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'Restaurant' : 'Restaurants'}
            </h2>
          </div>
          
          {filteredRestaurants.length === 0 ? (
            <div className="text-center py-16 bg-gray-900/50 rounded-lg border border-purple-900/30">
              <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-gray-400 text-lg">No restaurants found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRestaurants.map((restaurant) => {
                const badge = getDeliveryBadge(restaurant);
                
                return (
                  <div
                    key={restaurant.id}
                    onClick={() => {
                      if (restaurant.isOpen) {
                        setSelectedRestaurant(restaurant);
                        setView("menu");
                      }
                    }}
                    className={`group bg-gray-900 border border-purple-900/30 rounded-lg overflow-hidden hover:shadow-xl hover:shadow-purple-600/10 hover:border-purple-500 transition-all ${
                      restaurant.isOpen ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {/* Restaurant Image */}
                    <div className="relative h-48 bg-gradient-to-br from-gray-800 to-gray-900">
                      {restaurant.coverImageUrl ? (
                        <Image
                          src={restaurant.coverImageUrl}
                          alt={restaurant.businessName}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          {restaurant.logoUrl ? (
                            <Image
                              src={restaurant.logoUrl}
                              alt={restaurant.businessName}
                              width={80}
                              height={80}
                              className="rounded-full border-4 border-purple-600/30"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center text-3xl text-white">
                              {restaurant.businessName.charAt(0)}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Not Open Badge */}
                      {!restaurant.isOpen && (
                        <div className="absolute top-3 left-3 bg-black/80 text-white text-xs font-semibold px-2 py-1 rounded">
                          Closed
                        </div>
                      )}
                    </div>

                    {/* Restaurant Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                            {restaurant.businessName}
                          </h3>
                          <p className="text-sm text-gray-400 mt-0.5">
                            {restaurant.categories?.slice(0, 3).map(c => c.name).join(' • ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded text-sm">
                          <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-white font-medium">{restaurant.averageRating?.toFixed(1) || 'New'}</span>
                        </div>
                      </div>

                      {/* Delivery Info */}
                      <div className="flex items-center gap-3 text-sm text-gray-400 mb-3">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>25-35 min</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{restaurant.city}</span>
                        </div>
                      </div>

                      {/* Price and Delivery Badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            ${restaurant.minimumOrder} min
                          </span>
                          <span className="text-gray-600">•</span>
                          <span className="text-sm text-gray-400">
                            ${restaurant.deliveryFee}/km
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.color}`}>
                          {badge.text}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}