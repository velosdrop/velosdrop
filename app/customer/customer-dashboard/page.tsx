//app/customer/customer-dashboard/page.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
import FoodSection from "@/components/customer/food/FoodSection"; // Add this import

export default function CustomerDashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [profileImage, setProfileImage] = useState("/default-avatar.png");
  const [showBookingPanel, setShowBookingPanel] = useState(false);
  const [pickupLocation, setPickupLocation] = useState<{longitude: number; latitude: number; address?: string} | undefined>();
  const [deliveryLocation, setDeliveryLocation] = useState<{longitude: number; latitude: number; address?: string} | undefined>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { customer, clearUser, updateProfilePicture } = useUser();
  const { deliveryData } = useDelivery();

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Only auto-open sidebar on desktop
      if (!mobile) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch unread message count with error handling
  const fetchUnreadMessageCount = useCallback(async () => {
    if (!customer?.id) return;
    
    try {
      const response = await fetch(`/api/customer/${customer.id}/unread-message-count`);
      
      if (response.ok) {
        const data = await response.json();
        setUnreadMessageCount(data.count || 0);
      } else {
        console.warn('Failed to fetch unread count, response not OK');
      }
    } catch (error) {
      console.error('Error fetching unread message count:', error);
      // Don't set error state here, just log it
    }
  }, [customer]);

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
    
    // Initial fetch of unread message count
    if (customer.id) {
      fetchUnreadMessageCount();
      setIsLoading(false);
      
      // Set up polling for message count updates - every 30 seconds instead of 15
      const interval = setInterval(fetchUnreadMessageCount, 30000);
      return () => clearInterval(interval);
    }
  }, [customer, router, deliveryData, fetchUnreadMessageCount]);

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        const newProfileImage = event.target.result as string;
        setProfileImage(newProfileImage);
        
        // Update profile picture in database and context
        try {
          await updateProfilePicture(newProfileImage);
        } catch (error) {
          console.error('Failed to update profile picture:', error);
          alert('Failed to update profile picture. Please try again.');
          // Revert to previous image
          if (customer?.profilePictureUrl) {
            setProfileImage(customer.profilePictureUrl);
          }
        }
      }
    };
    reader.readAsDataURL(file);
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
      case "food":
        return <FoodSection />; // Add this case
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
                  style: 'mapbox://styles/murombo/cmdq9jyzw00hd01s87etkezgc'
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
              
              {/* Fixed Book Now Button - Top Center */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                <button
                  onClick={handleBookDelivery}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-2xl shadow-2xl shadow-purple-900/60 transition-all duration-300 flex items-center justify-center transform hover:scale-105 animate-pulse-glow border-2 border-purple-400/30 whitespace-nowrap"
                >
                  <span className="mr-2 text-lg">🚚</span>
                  <span className="text-base">Book Now</span>
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  // Show loading state while checking authentication
  if (!customer || isLoading) {
    return (
      <div className="flex h-screen bg-gray-950 items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
          <div className="text-purple-400 text-lg">Loading your dashboard...</div>
          <div className="text-gray-500 text-sm mt-2">Please wait a moment</div>
        </div>
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
        {/* Profile Section with Logout Button */}
        <div className="p-4 lg:p-6 border-b border-purple-900/30">
          <div className="flex items-center justify-between mb-4">
            {/* Logout Button - Top Right Corner */}
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 rounded-xl bg-gradient-to-r from-red-600/20 to-red-700/20 text-red-400 hover:from-red-700/30 hover:to-red-800/30 hover:text-red-300 transition-all duration-300 border border-red-600/30 hover:border-red-500/40 shadow-lg shadow-red-500/5 hover:shadow-red-600/10 group transform hover:scale-105"
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
                <span className="ml-2 font-medium text-sm">Logout</span>
              )}
            </button>
          </div>

          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-full overflow-hidden border-2 border-purple-600/80 shadow-lg shadow-purple-600/20 transition-all duration-300 group-hover:border-purple-500 group-hover:shadow-purple-500/30">
                <Image
                  src={profileImage}
                  alt="Profile"
                  width={96}
                  height={96}
                  className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
                  priority
                />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full p-1 lg:p-2 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg shadow-purple-600/30 hover:shadow-purple-700/40 transform hover:scale-110"
                aria-label="Change profile picture"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 lg:h-4 lg:w-4 text-white"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 001.414.586L11.707 4.707A1 1 0 0112.414 5H14a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h1.586a1 1 0 01.707.293l1.121 1.121A2 2 0 0011.172 5H8.828a2 2 0 00-1.414.586L6.293 6.707A1 1 0 015.586 7H4z" clipRule="evenodd" />
                </svg>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleProfileImageChange}
                  className="hidden"
                  accept="image/*"
                  aria-label="Upload profile picture"
                />
              </button>
            </div>
            {isSidebarOpen && (
              <>
                <h2 className="mt-3 lg:mt-4 text-sm lg:text-lg font-semibold text-white bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent text-center">
                  {customer.username}
                </h2>
                <p className="text-xs lg:text-sm text-gray-400 mt-1 text-center">{customer.phoneNumber}</p>
                {unreadMessageCount > 0 && (
                  <div className="mt-2 flex items-center justify-center">
                    <span className="text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white px-2 py-1 rounded-full">
                      {unreadMessageCount} unread message{unreadMessageCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
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
                id: "food", // Add this new section
                name: "Food Delivery", 
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h5a1 1 0 000-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM13 16a1 1 0 102 0 1 1 0 00-2 0z" />
                    <path d="M16 7a1 1 0 00-1 1v3.586a1 1 0 01-.293.707l-2.828 2.828A1 1 0 0111.586 16H8a1 1 0 00-1 1v1a1 1 0 001 1h4.586a1 1 0 00.707-.293l3.414-3.414A1 1 0 0017 14.586V8a1 1 0 00-1-1z" />
                  </svg>
                )
              },
              { 
                id: "notifications", 
                name: "Notifications", 
                icon: (
                  <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                    </svg>
                    {unreadMessageCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-4 h-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] rounded-full flex items-center justify-center px-1 border-2 border-gray-900">
                        {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                      </span>
                    )}
                  </div>
                ),
                badge: unreadMessageCount
              },
              { 
                id: "help", 
                name: "Help Center", 
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5a1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
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
                  aria-label={item.name}
                  aria-current={activeSection === item.id ? "page" : undefined}
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
                        <div className="ml-auto flex items-center">
                          {item.badge && item.badge > 0 && (
                            <span className="mr-2 min-w-5 h-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs rounded-full flex items-center justify-center px-1">
                              {item.badge > 9 ? '9+' : item.badge}
                            </span>
                          )}
                          <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
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
                aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              >
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>
              
              <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                {activeSection === 'notifications' && unreadMessageCount > 0 ? (
                  <>Messages ({unreadMessageCount} unread)</>
                ) : activeSection === 'notifications' ? (
                  <>Messages</>
                ) : activeSection === 'food' ? ( // Add this condition
                  <>Food Delivery</>
                ) : (
                  activeSection.charAt(0).toUpperCase() + activeSection.slice(1)
                )}
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

      {/* Add custom CSS for the glowing animation */}
      <style jsx global>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px 0px rgba(168, 85, 247, 0.4);
          }
          50% {
            box-shadow: 0 0 30px 5px rgba(168, 85, 247, 0.6);
          }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}