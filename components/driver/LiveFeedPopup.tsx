// components/driver/LiveFeedPopup.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { FiX, FiClock, FiMapPin, FiCheckCircle, FiXCircle, FiPackage, FiActivity } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import PubNub from 'pubnub';
import { useMediaQuery } from 'react-responsive'; // <-- New import for responsiveness

interface LiveFeedEvent {
  id: string;
  eventType: 'new_request' | 'request_accepted' | 'request_rejected' | 'delivery_completed';
  requestId: number;
  generalArea: string;
  fare: number;
  customerInitial?: string;
  driverName?: string;
  timestamp: number;
  status: string;
  timeAgo: string;
}

interface LiveFeedPopupProps {
  isOpen: boolean;
  onClose: () => void;
  driverId?: number;
}

// Initialize PubNub
const initializePubNub = () => {
  // Create a unique UUID for this driver session
  const uniqueId = `driver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return new PubNub({
    publishKey: process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY || 'demo',
    subscribeKey: process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY || 'demo',
    uuid: uniqueId,
    restore: true,
    heartbeatInterval: 60,
  });
};

// **Note:** You need to install 'react-responsive' for this hook: npm install react-responsive
const useIsMobile = () => useMediaQuery({ maxWidth: 767 });


export default function LiveFeedPopup({ isOpen, onClose, driverId }: LiveFeedPopupProps) {
  const [events, setEvents] = useState<LiveFeedEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const pubnubRef = useRef<PubNub | null>(null);
  const isMobile = useIsMobile(); // <-- Use the responsiveness hook

  // Format time ago
  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  // Parse the message data (since we stringified it in the backend)
  const parseMessageData = (messageData: any) => {
    try {
      if (typeof messageData === 'string') {
        return JSON.parse(messageData);
      }
      return messageData;
    } catch (error) {
      console.error('Error parsing message data:', error);
      return null;
    }
  };

  // Initialize PubNub connection
  useEffect(() => {
    if (!isOpen) return;

    if (!pubnubRef.current) {
      pubnubRef.current = initializePubNub();
    }

    const pubnub = pubnubRef.current;

    // Subscribe to live feed channel
    pubnub.subscribe({
      channels: ['live_delivery_feed'],
    });

    const handleMessage = (event: any) => {
      console.log('Live feed message received:', event);
      
      if (event.channel === 'live_delivery_feed' && event.message.type === 'live_feed_update') {
        const parsedData = parseMessageData(event.message.data);
        
        if (parsedData) {
          const newEvent: LiveFeedEvent = {
            id: `${parsedData.requestId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            eventType: parsedData.eventType,
            requestId: parsedData.requestId,
            generalArea: parsedData.generalArea || 'Unknown Area',
            fare: parsedData.fare || 0,
            customerInitial: parsedData.customerInitial || '',
            driverName: parsedData.driverName || '',
            timestamp: parsedData.timestamp || Date.now(),
            status: parsedData.status || 'active',
            timeAgo: getTimeAgo(parsedData.timestamp || Date.now()),
          };
          
          setEvents(prev => [newEvent, ...prev.slice(0, 49)]); // Keep last 50 events
        }
      }
    };

    const handleStatus = (statusEvent: any) => {
      console.log('PubNub status:', statusEvent);
      if (statusEvent.category === 'PNConnectedCategory') {
        setIsConnected(true);
      } else if (statusEvent.category === 'PNNetworkDownCategory' || 
                 statusEvent.category === 'PNNetworkUpCategory') {
        setIsConnected(statusEvent.category === 'PNNetworkUpCategory');
      }
    };

    pubnub.addListener({
      message: handleMessage,
      status: handleStatus,
    });

    setIsConnected(true);

    return () => {
      if (pubnubRef.current) {
        pubnubRef.current.removeListener({
          message: handleMessage,
          status: handleStatus,
        });
        
        pubnubRef.current.unsubscribe({
          channels: ['live_delivery_feed'],
        });
      }
    };
  }, [isOpen]);

  // Get icon and color based on event type
  const getEventConfig = (eventType: LiveFeedEvent['eventType']) => {
    switch (eventType) {
      case 'new_request':
        return { icon: FiPackage, color: 'bg-blue-100 text-blue-600', bgColor: 'bg-blue-50', label: 'New Request' };
      case 'request_accepted':
        return { icon: FiCheckCircle, color: 'bg-green-100 text-green-600', bgColor: 'bg-green-50', label: 'Accepted' };
      case 'request_rejected':
        return { icon: FiXCircle, color: 'bg-red-100 text-red-600', bgColor: 'bg-red-50', label: 'Rejected' };
      case 'delivery_completed':
        return { icon: FiCheckCircle, color: 'bg-purple-100 text-purple-600', bgColor: 'bg-purple-50', label: 'Completed' };
      default:
        return { icon: FiPackage, color: 'bg-gray-100 text-gray-600', bgColor: 'bg-gray-50', label: 'Activity' };
    }
  };

  // Get event description
  const getEventDescription = (event: LiveFeedEvent) => {
    switch (event.eventType) {
      case 'new_request':
        return `New delivery request in ${event.generalArea}`;
      case 'request_accepted':
        return `${event.driverName || 'A driver'} accepted delivery`;
      case 'request_rejected':
        return `Delivery #${event.requestId} was rejected`;
      case 'delivery_completed':
        return `Delivery completed in ${event.generalArea}`;
      default:
        return 'New activity';
    }
  };

  // Clear all events
  const clearEvents = () => {
    setEvents([]);
  };
  
  // Define motion properties based on device size
  const popupVariants = {
    initial: isMobile 
      ? { opacity: 0, y: '100%' } // Slide up from bottom on mobile
      : { opacity: 0, scale: 0.95, y: 20 }, // Centered standard on desktop
    animate: isMobile 
      ? { opacity: 1, y: 0 } 
      : { opacity: 1, scale: 1, y: 0 },
    exit: isMobile 
      ? { opacity: 0, y: '100%' }
      : { opacity: 0, scale: 0.95, y: 20 },
  };

  const popupClasses = isMobile
    ? 'fixed bottom-0 left-0 w-full h-full sm:h-[85vh] bg-white rounded-t-2xl shadow-2xl z-50 flex flex-col'
    : 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-2xl z-50 max-h-[80vh] flex flex-col';


  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={onClose}
          />
          
          {/* Popup */}
          <motion.div
            variants={popupVariants} // Use variants for motion
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'spring', damping: 25, stiffness: isMobile ? 200 : 500 }}
            className={popupClasses} // Apply responsive classes
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-xl">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
                  <FiActivity size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Live Delivery Activity</h2>
                  <p className="text-sm text-purple-200">Real-time market feed</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between flex-wrap gap-2"> {/* Added flex-wrap and gap */}
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-700 whitespace-nowrap">
                      New: {events.filter(e => e.eventType === 'new_request').length}
                    </span>
                  </span>
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-700 whitespace-nowrap">
                      Active: {events.filter(e => e.eventType === 'request_accepted').length}
                    </span>
                  </span>
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-700 whitespace-nowrap">
                      Completed: {events.filter(e => e.eventType === 'delivery_completed').length}
                    </span>
                  </span>
                </div>
                <div className="flex items-center space-x-3 flex-shrink-0">
                  <button
                    onClick={clearEvents}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    Clear
                  </button>
                  <span className="text-xs text-gray-500">
                    {events.length} events
                  </span>
                </div>
              </div>
            </div>

            {/* Events List */}
            <div className="flex-1 overflow-y-auto p-4">
              {events.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiClock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">Waiting for delivery activity...</p>
                  <p className="text-sm mt-2">Activity will appear here in real-time</p>
                  <div className="mt-4 text-xs text-gray-400">
                    <p>• New delivery requests</p>
                    <p>• Driver acceptances</p>
                    <p>• Delivery completions</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => {
                    const { icon: Icon, color, bgColor, label } = getEventConfig(event.eventType);
                    
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-3 rounded-lg border ${bgColor} border-gray-200 hover:shadow-sm transition-shadow`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${color} flex-shrink-0`}>
                            <Icon size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color.replace('bg-', 'bg-opacity-20 ')} ${color.replace('text-', '')}`}>
                                    {label}
                                  </span>
                                  {event.fare > 0 && (
                                    <span className="text-sm font-bold text-gray-900">
                                      ${event.fare.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                <p className="font-medium text-gray-900 text-sm break-words">
                                  {getEventDescription(event)}
                                </p>
                              </div>
                              <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0 ml-2">
                                {event.timeAgo}
                              </span>
                            </div>
                            
                            <div className="mt-2 flex items-center flex-wrap gap-2 text-xs"> {/* Added flex-wrap and gap */}
                              <span className="flex items-center text-gray-600">
                                <FiMapPin className="mr-1" size={12} />
                                {event.generalArea}
                              </span>
                              {event.customerInitial && (
                                <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full flex-shrink-0">
                                  Customer {event.customerInitial}
                                </span>
                              )}
                              {event.driverName && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full flex-shrink-0">
                                  {event.driverName}
                                </span>
                              )}
                            </div>
                            
                            <div className="mt-2 text-xs text-gray-500">
                              Request #{event.requestId}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  <span className="flex items-center">
                    <span className={`h-2 w-2 rounded-full mr-1 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}