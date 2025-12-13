'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FiX, FiClock, FiMapPin, FiCheckCircle, FiXCircle, FiPackage, FiActivity, FiRadio, FiZap, FiTrendingUp, FiSearch, FiUser, FiTruck } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import PubNub from 'pubnub';
import Image from 'next/image';

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
  originalMessage?: any; // Track original message to prevent duplicates
}

interface LiveFeedPopupProps {
  isOpen: boolean;
  onClose: () => void;
  driverId?: number;
}

// Initialize PubNub
const initializePubNub = () => {
  const uniqueId = `driver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return new PubNub({
    publishKey: process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY || 'demo',
    subscribeKey: process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY || 'demo',
    uuid: uniqueId,
    restore: true,
    heartbeatInterval: 60,
  });
};

// Track seen messages to prevent duplicates
const seenMessages = new Set<string>();

export default function LiveFeedPopup({ isOpen, onClose, driverId }: LiveFeedPopupProps) {
  const [events, setEvents] = useState<LiveFeedEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pubnubRef = useRef<PubNub | null>(null);
  const eventsRef = useRef<LiveFeedEvent[]>([]);
  
  // Keep ref in sync with state
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Format time ago
  const getTimeAgo = useCallback((timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }, []);

  // Generate unique ID for message tracking
  const generateMessageId = useCallback((parsedData: any) => {
    if (!parsedData) return null;
    
    // Create a unique ID based on requestId + eventType + timestamp
    return `${parsedData.requestId}-${parsedData.eventType}-${parsedData.timestamp}`;
  }, []);

  // Parse the message data and check for duplicates
  const parseMessageData = useCallback((messageData: any) => {
    try {
      let parsedData;
      
      if (typeof messageData === 'string') {
        parsedData = JSON.parse(messageData);
      } else {
        parsedData = messageData;
      }
      
      // Check if we've seen this message before
      const messageId = generateMessageId(parsedData);
      if (messageId && seenMessages.has(messageId)) {
        console.log('⚠️ Duplicate message detected, skipping:', messageId);
        return null;
      }
      
      // Mark as seen
      if (messageId) {
        seenMessages.add(messageId);
        
        // Clean up old messages from set (keep last 1000)
        if (seenMessages.size > 1000) {
          const keys = Array.from(seenMessages);
          for (let i = 0; i < 200; i++) {
            seenMessages.delete(keys[i]);
          }
        }
      }
      
      return parsedData;
    } catch (error) {
      console.error('Error parsing message data:', error);
      return null;
    }
  }, [generateMessageId]);

  // Get event icon based on type
  const getEventIcon = (eventType: LiveFeedEvent['eventType']) => {
    switch (eventType) {
      case 'new_request':
        return { icon: FiPackage, emoji: '📦' };
      case 'request_accepted':
        return { icon: FiCheckCircle, emoji: '✅' };
      case 'request_rejected':
        return { icon: FiXCircle, emoji: '❌' };
      case 'delivery_completed':
        return { icon: FiZap, emoji: '⚡' };
      default:
        return { icon: FiPackage, emoji: '📦' };
    }
  };

  // Get event description with detailed info
  const getEventDescription = (event: LiveFeedEvent) => {
    switch (event.eventType) {
      case 'new_request':
        return `New delivery request in ${event.generalArea}`;
      case 'request_accepted':
        return `${event.driverName || 'A driver'} accepted delivery #${event.requestId}`;
      case 'request_rejected':
        return `Delivery #${event.requestId} was rejected${event.driverName ? ` by ${event.driverName}` : ''}`;
      case 'delivery_completed':
        return `Delivery #${event.requestId} completed in ${event.generalArea}`;
      default:
        return 'New activity';
    }
  };

  // Initialize PubNub connection
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = false;

    const setupPubNub = async () => {
      if (!pubnubRef.current) {
        pubnubRef.current = initializePubNub();
      }

      const pubnub = pubnubRef.current;

      // Clear previous listeners
      pubnub.removeAllListeners();

      // Subscribe to live feed channel
      try {
        await pubnub.subscribe({
          channels: ['live_delivery_feed'],
        });
        isSubscribed = true;
      } catch (error) {
        console.error('❌ Failed to subscribe to live feed:', error);
        return;
      }

      const handleMessage = (event: any) => {
        if (event.channel === 'live_delivery_feed' && event.message.type === 'live_feed_update') {
          const parsedData = parseMessageData(event.message.data);
          
          if (parsedData) {
            console.log('📡 Live feed message received:', {
              eventType: parsedData.eventType,
              requestId: parsedData.requestId,
              area: parsedData.generalArea,
              fare: parsedData.fare,
              driverName: parsedData.driverName,
              customerInitial: parsedData.customerInitial
            });

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
              originalMessage: parsedData,
            };
            
            // Check for duplicates in current events before adding
            const isDuplicate = eventsRef.current.some(
              existingEvent => 
                existingEvent.requestId === newEvent.requestId && 
                existingEvent.eventType === newEvent.eventType &&
                Math.abs(existingEvent.timestamp - newEvent.timestamp) < 1000 // Same second
            );
            
            if (!isDuplicate) {
              setEvents(prev => {
                // Keep only last 30 events and filter out any potential duplicates
                const newEvents = [newEvent, ...prev].slice(0, 30);
                
                // Additional duplicate check within the new array
                const uniqueEvents = newEvents.filter((event, index, self) =>
                  index === self.findIndex(e => 
                    e.requestId === event.requestId && 
                    e.eventType === event.eventType &&
                    Math.abs(e.timestamp - event.timestamp) < 1000
                  )
                );
                
                return uniqueEvents;
              });
            }
            
            setIsLoading(false);
          }
        }
      };

      const handleStatus = (statusEvent: any) => {
        console.log('📡 PubNub Status:', statusEvent.category);
        
        if (statusEvent.category === 'PNConnectedCategory') {
          setIsConnected(true);
          setTimeout(() => setIsLoading(false), 1000);
        } else if (statusEvent.category === 'PNNetworkDownCategory') {
          setIsConnected(false);
        } else if (statusEvent.category === 'PNNetworkUpCategory') {
          setIsConnected(true);
        }
      };

      pubnub.addListener({
        message: handleMessage,
        status: handleStatus,
      });

      // Simulate initial loading
      setTimeout(() => {
        if (eventsRef.current.length === 0) {
          setIsLoading(false);
        }
      }, 1500);
    };

    setupPubNub();

    return () => {
      if (pubnubRef.current && isSubscribed) {
        pubnubRef.current.unsubscribe({
          channels: ['live_delivery_feed'],
        });
        pubnubRef.current.removeAllListeners();
      }
      // Clear seen messages when component unmounts
      seenMessages.clear();
    };
  }, [isOpen, getTimeAgo, parseMessageData]);

  // Get icon and color based on event type - ALL STATUSES INCLUDED
  const getEventConfig = (eventType: LiveFeedEvent['eventType']) => {
    switch (eventType) {
      case 'new_request':
        return { 
          icon: FiPackage, 
          emoji: '📦',
          color: 'bg-purple-500/20 text-purple-600', 
          borderColor: 'border-purple-200',
          bgColor: 'bg-purple-50/50', 
          label: 'New Request',
          pulse: true,
          description: 'New delivery request'
        };
      case 'request_accepted':
        return { 
          icon: FiCheckCircle, 
          emoji: '✅',
          color: 'bg-emerald-500/20 text-emerald-600', 
          borderColor: 'border-emerald-200',
          bgColor: 'bg-emerald-50/50', 
          label: 'Accepted',
          pulse: false,
          description: 'Delivery accepted'
        };
      case 'request_rejected':
        return { 
          icon: FiXCircle, 
          emoji: '❌',
          color: 'bg-rose-500/20 text-rose-600', 
          borderColor: 'border-rose-200',
          bgColor: 'bg-rose-50/50', 
          label: 'Rejected',
          pulse: false,
          description: 'Delivery rejected'
        };
      case 'delivery_completed':
        return { 
          icon: FiZap, 
          emoji: '⚡',
          color: 'bg-violet-500/20 text-violet-600', 
          borderColor: 'border-violet-200',
          bgColor: 'bg-violet-50/50', 
          label: 'Completed',
          pulse: false,
          description: 'Delivery completed'
        };
      default:
        return { 
          icon: FiPackage, 
          emoji: '📦',
          color: 'bg-gray-100 text-gray-600', 
          borderColor: 'border-gray-200',
          bgColor: 'bg-gray-50', 
          label: 'Activity',
          pulse: false,
          description: 'New activity'
        };
    }
  };

  // Clear all events
  const clearEvents = () => {
    setEvents([]);
    seenMessages.clear();
  };

  // Professional Radar Scanner Component
  const RadarScanner = () => {
    return (
      <div className="relative w-64 h-64 mx-auto mb-8">
        {/* Radar Background */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-gray-900 to-black border-2 border-gray-800 shadow-2xl">
          {/* Radar Grid Lines */}
          <div className="absolute inset-0 rounded-full border border-gray-700/50"></div>
          <div className="absolute inset-8 rounded-full border border-gray-700/40"></div>
          <div className="absolute inset-16 rounded-full border border-gray-700/30"></div>
          <div className="absolute inset-24 rounded-full border border-gray-700/20"></div>
          
          {/* Crosshairs */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-700/40 transform -translate-x-1/2"></div>
          <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-700/40 transform -translate-y-1/2"></div>
          
          {/* Sweeping Radar Line */}
          <motion.div
            className="absolute top-1/2 left-1/2 w-1/2 h-px origin-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute right-0 w-32 h-px bg-gradient-to-l from-purple-500 via-purple-400 to-transparent"></div>
            <div className="absolute right-0 w-4 h-4 bg-purple-500 rounded-full transform -translate-y-1/2 shadow-lg shadow-purple-500/50"></div>
          </motion.div>
          
          {/* Pulsing Detection Dots - Representing different event types */}
          <motion.div
            className="absolute top-1/4 left-1/4 w-3 h-3 bg-purple-500 rounded-full shadow-lg shadow-purple-500/50"
            animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
            title="New Request"
          />
          <motion.div
            className="absolute top-1/3 right-1/3 w-3 h-3 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50"
            animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
            title="Accepted"
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-3 h-3 bg-rose-500 rounded-full shadow-lg shadow-rose-500/50"
            animate={{ scale: [1, 1.6, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.8 }}
            title="Rejected"
          />
          <motion.div
            className="absolute bottom-1/3 left-1/3 w-3 h-3 bg-violet-500 rounded-full shadow-lg shadow-violet-500/50"
            animate={{ scale: [1, 1.7, 1], opacity: [0.6, 0.9, 0.6] }}
            transition={{ duration: 2.8, repeat: Infinity, delay: 1.1 }}
            title="Completed"
          />
          
          {/* Center Logo Container - BLACK BACKGROUND */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-black flex items-center justify-center shadow-2xl border-2 border-gray-800">
            <div className="w-14 h-14 relative">
              <Image
                src="/velosdroplogo.svg"
                alt="VeloDrop"
                fill
                className="object-contain p-1.5"
                priority
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-full h-full flex items-center justify-center">
                        <span class="text-white font-bold text-lg">VD</span>
                      </div>
                    `;
                  }
                }}
              />
            </div>
          </div>
          
          {/* Radar Sweep Glow Effect */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-purple-500/10 to-transparent"></div>
          </motion.div>
        </div>
        
        {/* Outer Glow */}
        <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-purple-900/20 to-transparent blur-xl opacity-50"></div>
        
        {/* Status Indicator */}
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-2">
          <motion.div
            className="w-2 h-2 bg-emerald-500 rounded-full"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-sm font-medium text-gray-600">Active Scan</span>
        </div>
      </div>
    );
  };

  // Empty state with enhanced radar animation
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      {/* Radar Scanner */}
      <RadarScanner />
      
      {/* Status Text */}
      <div className="text-center max-w-md">
        <h3 className="text-2xl font-bold text-gray-900 mb-3 flex items-center justify-center gap-2">
          <FiSearch className="h-6 w-6 text-purple-600" />
          Scanning Zimbabwe Network
        </h3>
        <p className="text-gray-600 mb-6 leading-relaxed">
          Our radar is actively searching for delivery activity across all provinces. 
          All event types will appear here: New Requests, Acceptances, Rejections, and Completions.
        </p>
        
        {/* Event Type Legend */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">New Requests</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">Accepted</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-rose-50 rounded-lg">
            <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">Rejected</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-violet-50 rounded-lg">
            <div className="w-3 h-3 bg-violet-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">Completed</span>
          </div>
        </div>
        
        {/* Live Stats */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full mb-4">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-gray-700">Live • Waiting for activity</span>
        </div>
      </div>
    </div>
  );

  // Calculate stats for ALL event types
  const stats = {
    newRequests: events.filter(e => e.eventType === 'new_request').length,
    accepted: events.filter(e => e.eventType === 'request_accepted').length,
    rejected: events.filter(e => e.eventType === 'request_rejected').length,
    completed: events.filter(e => e.eventType === 'delivery_completed').length,
    totalEvents: events.length,
    totalFare: events.reduce((sum, event) => sum + event.fare, 0)
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Enhanced Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-40"
            onClick={onClose}
          />
          
          {/* Mobile-Optimized Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 sm:inset-4 md:inset-8 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 w-full lg:w-auto lg:max-w-4xl bg-white rounded-none lg:rounded-3xl shadow-2xl z-50 max-h-screen lg:max-h-[90vh] flex flex-col border-0 lg:border border-gray-300 overflow-hidden"
          >
            {/* Enhanced Header */}
            <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-black via-gray-900 to-purple-900 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="relative">
                    <div className={`p-2.5 rounded-xl ${isConnected ? 'bg-emerald-500/20' : 'bg-rose-500/20'} backdrop-blur-sm`}>
                      <FiRadio size={22} className={isConnected ? 'text-emerald-300' : 'text-rose-300'} />
                    </div>
                    {isConnected && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold truncate">
                      Live Market Radar
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-purple-200 truncate">All delivery activity</p>
                      {stats.totalEvents > 0 && (
                        <span className="text-xs bg-rose-500 text-white px-2 py-1 rounded-full animate-pulse flex-shrink-0">
                          {stats.totalEvents} EVENTS
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 active:scale-95 flex-shrink-0"
                  aria-label="Close live feed"
                >
                  <FiX size={22} />
                </button>
              </div>
            </div>

            {/* Real-time Stats Dashboard - SHOWING ALL STATUSES */}
            <div className="p-3 sm:p-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-white rounded-lg sm:rounded-xl p-3 shadow-sm border border-purple-100">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 font-medium truncate">New</p>
                      <p className="text-xl sm:text-2xl font-bold text-purple-600 truncate">{stats.newRequests}</p>
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiPackage className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg sm:rounded-xl p-3 shadow-sm border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 font-medium truncate">Accepted</p>
                      <p className="text-xl sm:text-2xl font-bold text-emerald-600 truncate">{stats.accepted}</p>
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiCheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg sm:rounded-xl p-3 shadow-sm border border-rose-100">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 font-medium truncate">Rejected</p>
                      <p className="text-xl sm:text-2xl font-bold text-rose-600 truncate">{stats.rejected}</p>
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiXCircle className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg sm:rounded-xl p-3 shadow-sm border border-violet-100">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 font-medium truncate">Completed</p>
                      <p className="text-xl sm:text-2xl font-bold text-violet-600 truncate">{stats.completed}</p>
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiZap className="h-4 w-4 sm:h-5 sm:w-5 text-violet-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Events List Container */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-medium">Initializing radar...</p>
                    <p className="text-sm text-gray-400 mt-2">Listening for all event types</p>
                  </div>
                </div>
              ) : events.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="p-3 sm:p-4 md:p-6 space-y-3">
                  {events.map((event) => {
                    const { icon: Icon, emoji, color, borderColor, bgColor, label, pulse } = getEventConfig(event.eventType);
                    const { icon: eventIcon } = getEventIcon(event.eventType);
                    
                    return (
                      <motion.div
                        key={`${event.id}-${event.timestamp}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`relative rounded-xl p-4 border ${borderColor} ${bgColor} hover:shadow-md transition-all duration-200 active:scale-[0.998] ${pulse ? 'animate-pulse-subtle' : ''}`}
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          {/* Icon with Status and Emoji */}
                          <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${color} flex items-center justify-center relative`}>
                            <Icon size={18} className="sm:w-5 sm:h-5" />
                            <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                              <span className="text-xs">{emoji}</span>
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className={`text-xs font-semibold px-2 sm:px-3 py-1 rounded-full ${color.replace('text-', 'text-').replace('bg-', 'bg-opacity-100 ')} flex-shrink-0`}>
                                    {label}
                                  </span>
                                  {event.fare > 0 && (
                                    <span className="text-sm font-bold text-gray-900 bg-white/50 px-2 py-1 rounded flex-shrink-0">
                                      ${event.fare.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                                  {getEventDescription(event)}
                                </p>
                              </div>
                              <span className="text-xs text-gray-500 whitespace-nowrap bg-white/50 px-2 py-1 rounded flex-shrink-0">
                                {event.timeAgo}
                              </span>
                            </div>
                            
                            {/* Detailed Meta Information */}
                            <div className="flex flex-wrap items-center gap-2 text-xs mt-3">
                              <span className="flex items-center text-gray-600 bg-white/50 px-2 py-1 rounded flex-shrink-0">
                                <FiMapPin className="mr-1.5" size={10} />
                                <span className="truncate max-w-[120px] sm:max-w-none">{event.generalArea}</span>
                              </span>
                              
                              {event.customerInitial && (
                                <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full flex-shrink-0">
                                  <FiUser size={10} />
                                  {event.customerInitial}
                                </span>
                              )}
                              
                              {event.driverName && (
                                <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex-shrink-0">
                                  <FiTruck size={10} />
                                  {event.driverName.split(' ')[0]}
                                </span>
                              )}
                              
                              <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded-full flex-shrink-0">
                                ID: #{event.requestId}
                              </span>
                            </div>
                            
                            {/* Event Type Badge */}
                            <div className="mt-3 text-xs">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-black/5 text-gray-600">
                                <span className="w-2 h-2 rounded-full bg-current"></span>
                                Event: {event.eventType.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Enhanced Footer */}
            <div className="p-3 sm:p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto justify-between sm:justify-start">
                  <div className="flex items-center">
                    <span className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full mr-2 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    <span className="text-sm font-medium text-gray-700 truncate">
                      {isConnected ? 'Live • All events enabled' : 'Connection Lost'}
                    </span>
                  </div>
                  <button
                    onClick={clearEvents}
                    className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 hover:bg-gray-200 rounded-lg transition-colors duration-200 flex-shrink-0"
                    disabled={events.length === 0}
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-start mt-2 sm:mt-0">
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">{stats.totalEvents}</span> total events
                  </div>
                  <div className="text-sm font-medium text-purple-600 bg-purple-100 px-3 py-1.5 rounded-lg flex-shrink-0">
                    {new Date().toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    }).toLowerCase()}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}