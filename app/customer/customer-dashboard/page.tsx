// app/customer/customer-dashboard/page.tsx (updated)
"use client";

import { useState, useRef, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUser } from '@/app/context/UserContext';
import { useDelivery } from '@/app/context/DeliveryContext';

// Import components for each section
import OrdersSection from "@/components/customer/OrdersSection";
import WalletSection from "@/components/customer/WalletSection";
import HelpCenterSection from "@/components/customer/HelpCenterSection";
import SettingsSection from "@/components/customer/SettingsSection";
import NotificationsSection from "@/components/customer/NotificationsSection";
import BookingPanel from "@/components/customer/BookingPanel";
import CustomerMap from "@/components/customer/CustomerMap";

export default function CustomerDashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [profileImage, setProfileImage] = useState("/default-avatar.png");
  const [showBookingPanel, setShowBookingPanel] = useState(false);
  const [pickupLocation, setPickupLocation] = useState<{longitude: number; latitude: number; address?: string} | undefined>();
  const [deliveryLocation, setDeliveryLocation] = useState<{longitude: number; latitude: number; address?: string} | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { customer, clearUser  } = useUser();
  const { deliveryData } = useDelivery();

  useEffect(() => {
    // Redirect to login if no customer data
    if (!customer) {
      router.push("/customer/customer-login");
      return;
    }

    // Set profile image if available
    if (customer.profilePictureUrl) {
      setProfileImage(customer.profilePictureUrl);
    }

    // If we have delivery data from booking panel, update the map
    if (deliveryData) {
      setPickupLocation({
        longitude: deliveryData.pickup.coordinates[0],
        latitude: deliveryData.pickup.coordinates[1],
        address: deliveryData.pickup.address
      });
      setDeliveryLocation({
        longitude: deliveryData.delivery.coordinates[0],
        latitude: deliveryData.delivery.coordinates[1],
        address: deliveryData.delivery.address
      });
    }
  }, [customer, router, deliveryData]);

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newProfileImage = event.target.result as string;
          setProfileImage(newProfileImage);
          
          // Update user data in localStorage and context
          const updatedCustomer = {
            ...customer,
            profilePictureUrl: newProfileImage
          };
          localStorage.setItem('customerData', JSON.stringify(updatedCustomer));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    clearUser();
    router.push("/customer/customer-login");
  };

  const handleBookDelivery = () => {
    setShowBookingPanel(true);
  };

  const handleCloseBookingPanel = () => {
    setShowBookingPanel(false);
  };

  const handleLocationsSelected = (pickup: any, delivery: any) => {
    if (pickup) {
      setPickupLocation({
        longitude: pickup.coordinates[0],
        latitude: pickup.coordinates[1],
        address: pickup.address
      });
    }
    if (delivery) {
      setDeliveryLocation({
        longitude: delivery.coordinates[0],
        latitude: delivery.coordinates[1],
        address: delivery.address
      });
    }
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "orders":
        return <OrdersSection />;
      case "wallet":
        return <WalletSection />;
      case "help":
        return <HelpCenterSection />;
      case "settings":
        return <SettingsSection />;
      case "notifications":
        return <NotificationsSection />;
      default:
        return (
          <div className="h-full flex flex-col">
            {/* Map Container */}
            <div className="flex-1 bg-gradient-to-br from-gray-900 to-black rounded-2xl border-2 border-purple-900/30 relative overflow-hidden shadow-2xl shadow-purple-900/20">
              <CustomerMap 
                pickupLocation={pickupLocation}
                deliveryLocation={deliveryLocation}
                showRoute={!!(pickupLocation && deliveryLocation)}
                style={{ height: '100%', width: '100%' }}
                initialOptions={{
                  center: pickupLocation ? [pickupLocation.longitude, pickupLocation.latitude] : [31.033, -17.827],
                  zoom: pickupLocation && deliveryLocation ? 12 : 16,
                  style: 'mapbox://styles/mapbox/streets-v12'
                }}
              />
              
              {/* Loading overlay for map */}
              {!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm z-10">
                  <div className="text-center text-white">
                    <div className="text-4xl mb-4">🌍</div>
                    <p className="text-lg font-semibold">Map Configuration Required</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Please add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your environment variables
                    </p>
                  </div>
                </div>
              )}
              
              {/* Book Delivery Button */}
              <button
                onClick={handleBookDelivery}
                className="absolute bottom-6 right-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 px-8 rounded-full shadow-2xl shadow-purple-900/40 transition-all duration-300 flex items-center transform hover:scale-105 z-10"
              >
                <span className="mr-3 text-xl">🚚</span>
                Book a Delivery
                <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        );
    }
  };

  // Show loading state while checking authentication
  if (!customer) {
    return (
      <div className="flex h-screen bg-gray-950 items-center justify-center">
        <div className="text-purple-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-purple-900 flex flex-col">
        {/* Profile Section */}
        <div className="p-6 border-b border-purple-900">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-600">
                <Image
                  src={profileImage}
                  alt="Profile"
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-purple-600 rounded-full p-2 hover:bg-purple-700 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7极9a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleProfileImageChange}
                  className="hidden"
                  accept="image/*"
                />
              </button>
            </div>
            <h2 className="mt-4 text-lg font-semibold">{customer.username}</h2>
            <p className="text-sm text-gray-400">{customer.phoneNumber}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {[
              { id: "dashboard", name: "Dashboard", icon: "📊" },
              { id: "orders", name: "Orders", icon: "📦" },
              { id: "wallet", name: "Wallet", icon: "💳" },
              { id: "help", name: "Help Center", icon: "❓" },
              { id: "settings", name: "Settings", icon: "⚙️" },
              { id: "notifications", name: "Notifications", icon: "🔔" },
            ].map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                    activeSection === item.id
                      ? "bg-purple-900 text-white shadow-lg shadow-purple-900/30"
                      : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  <span className="text-xl mr-3">{item.icon}</span>
                  <span>{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-purple-900">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <span className="text-xl mr-3">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gray-900 border-b border-purple-900 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-purple-400">
              {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
            </h1>
            {activeSection === 'dashboard' && pickupLocation && deliveryLocation && (
              <div className="text-sm text-gray-300">
                <span className="text-green-400">A</span> {pickupLocation.address} → <span className="text-red-400">B</span> {deliveryLocation.address}
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-950">
          {renderActiveSection()}
        </main>
      </div>

      {/* Booking Panel */}
      {showBookingPanel && (
        <BookingPanel 
          onClose={handleCloseBookingPanel} 
          onLocationsSelected={handleLocationsSelected}
        />
      )}
    </div>
  );
}