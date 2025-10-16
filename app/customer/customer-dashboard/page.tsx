// app/customer/customer-dashboard/page.tsx
"use client";

import { useState, useRef, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUser } from '@/app/context/UserContext';
import { useDelivery } from '@/app/context/DeliveryContext';

// Import components for each section
import OrdersSection from "@/components/customer/OrdersSection";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { customer, clearUser, updateProfilePicture } = useUser();
  const { deliveryData } = useDelivery();

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      reader.onload = async (event) => {
        if (event.target?.result) {
          const newProfileImage = event.target.result as string;
          setProfileImage(newProfileImage);
          
          // Update profile picture in database and context
          await updateProfilePicture(newProfileImage);
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

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "orders":
        return <OrdersSection />;
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
            <div className="flex-1 bg-gradient-to-br from-gray-900 to-black rounded-2xl lg:rounded-3xl border-2 border-purple-900/30 relative overflow-hidden shadow-2xl shadow-purple-900/20">
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
                className="absolute bottom-4 right-4 lg:bottom-6 lg:right-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-6 lg:py-4 lg:px-8 rounded-full shadow-2xl shadow-purple-900/40 transition-all duration-300 flex items-center transform hover:scale-105 z-10 text-sm lg:text-base"
              >
                <span className="mr-2 lg:mr-3 text-lg lg:text-xl">🚚</span>
                Book Delivery
                <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-4 w-4 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative z-50 h-full bg-gradient-to-b from-gray-900 to-gray-950 border-r border-purple-900/30 flex flex-col shadow-2xl shadow-purple-900/10 transition-all duration-300
        ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0 lg:w-20'}
      `}>
        {/* Profile Section */}
        <div className="p-4 lg:p-6 border-b border-purple-900/30">
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-full overflow-hidden border-2 border-purple-600/80 shadow-lg shadow-purple-600/20 transition-all duration-300 group-hover:border-purple-500 group-hover:shadow-purple-500/30">
                <Image
                  src={profileImage}
                  alt="Profile"
                  width={96}
                  height={96}
                  className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full p-1 lg:p-2 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg shadow-purple-600/30 hover:shadow-purple-700/40 transform hover:scale-110"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 lg:h-4 lg:w-4 text-white"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
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
            {isSidebarOpen && (
              <>
                <h2 className="mt-3 lg:mt-4 text-sm lg:text-lg font-semibold text-white bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent text-center">
                  {customer.username}
                </h2>
                <p className="text-xs lg:text-sm text-gray-400 mt-1 text-center">{customer.phoneNumber}</p>
              </>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 lg:p-5 overflow-y-auto">
          <ul className="space-y-2 lg:space-y-3">
            {[
              { 
                id: "dashboard", 
                name: "Dashboard", 
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                )
              },
              { 
                id: "orders", 
                name: "Orders", 
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                  </svg>
                )
              },
              { 
                id: "notifications", 
                name: "Notifications", 
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                )
              },
              { 
                id: "help", 
                name: "Help Center", 
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                )
              },
              { 
                id: "settings", 
                name: "Settings", 
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                )
              },
            ].map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleSectionChange(item.id)}
                  className={`w-full flex items-center px-3 lg:px-4 py-3 lg:py-4 rounded-xl transition-all duration-300 group ${
                    activeSection === item.id
                      ? "bg-gradient-to-r from-purple-600/20 to-indigo-600/20 text-white shadow-lg shadow-purple-500/10 border border-purple-500/30"
                      : "text-gray-400 hover:bg-gray-800/50 hover:text-white border border-transparent hover:border-purple-500/20"
                  }`}
                >
                  <span className={`transition-colors duration-300 ${
                    activeSection === item.id 
                      ? "text-purple-400" 
                      : "text-gray-500 group-hover:text-purple-400"
                  }`}>
                    {item.icon}
                  </span>
                  {isSidebarOpen && (
                    <>
                      <span className="ml-3 font-medium tracking-wide text-sm lg:text-base">{item.name}</span>
                      {activeSection === item.id && (
                        <div className="ml-auto w-2 h-2 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full animate-pulse"></div>
                      )}
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout Button - Positioned at the bottom */}
        <div className="p-4 lg:p-5 border-t border-purple-900/30 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-3 lg:px-4 py-2 lg:py-3 rounded-xl bg-gradient-to-r from-red-600/20 to-red-700/20 text-red-400 hover:from-red-700/30 hover:to-red-800/30 hover:text-red-300 transition-all duration-300 border border-red-600/30 hover:border-red-500/40 shadow-lg shadow-red-500/5 hover:shadow-red-600/10 group"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 lg:h-5 lg:w-5 group-hover:animate-pulse" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
            {isSidebarOpen && (
              <span className="ml-2 lg:ml-3 font-medium text-sm lg:text-base">Logout</span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="bg-gradient-to-r from-gray-900 to-gray-950 border-b border-purple-900/30 p-4 lg:p-6 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 rounded-lg bg-gray-800/50 border border-purple-900/30 hover:bg-gray-700/50 transition-all duration-300"
              >
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
              </h1>
            </div>
            
            {activeSection === 'dashboard' && pickupLocation && deliveryLocation && (
              <div className="hidden sm:flex text-xs lg:text-sm text-gray-300 bg-gray-800/50 px-3 lg:px-4 py-1 lg:py-2 rounded-lg border border-purple-900/30">
                <span className="text-green-400 font-medium">A</span> 
                <span className="mx-1 lg:mx-2">→</span>
                <span className="text-red-400 font-medium">B</span>
              </div>
            )}
            
            {/* Mobile route indicator */}
            {activeSection === 'dashboard' && pickupLocation && deliveryLocation && (
              <div className="sm:hidden flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gradient-to-br from-gray-950 to-black">
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