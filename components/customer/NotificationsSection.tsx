// components/customer/NotificationsSection.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@/app/context/UserContext';
import { FiMessageSquare, FiMapPin, FiX, FiSend, FiPaperclip, FiArrowRight, FiCornerUpLeft } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { createPubNubClient } from '@/lib/pubnub-booking';

interface MessageNotification {
  id: number;
  type: 'message';
  senderType: 'driver' | 'customer';
  senderId: number;
  deliveryId: number;
  content: string;
  timestamp: string;
  read: boolean;
  driverName?: string;
  driverId?: number;
  customerName?: string;
  deliveryDetails?: {
    pickupLocation: string;
    dropoffLocation: string;
    fare: number;
    status: string;
  };
}

interface ChatMessage {
  id?: number;
  deliveryId: number;
  senderType: 'driver' | 'customer' | 'system';
  senderId: number;
  messageType: 'text' | 'image';
  content: string;
  imageUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsSection() {
  const { customer } = useUser();
  const [notifications, setNotifications] = useState<MessageNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<{
    deliveryId: number;
    driverId: number;
    customerId: number;
    driverName: string;
  } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNotification, setHoveredNotification] = useState<number | null>(null);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [pubnub, setPubnub] = useState<any>(null);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const notificationContainerRef = useRef<HTMLDivElement>(null);

  // Single function to fetch both notifications and count
  const fetchAllNotifications = useCallback(async () => {
    if (!customer?.id) return;

    try {
      // Fetch unread count
      const countResponse = await fetch(`/api/customer/${customer.id}/unread-message-count`);
      if (countResponse.ok) {
        const countData = await countResponse.json();
        setUnreadCount(countData.count || 0);
      }

      // Fetch notifications
      const notificationsResponse = await fetch(`/api/customer/${customer.id}/notifications`);
      
      if (!notificationsResponse.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const { notifications: rawNotifications } = await notificationsResponse.json();
      
      // Transform the data
      const formattedNotifications = rawNotifications.map((item: any) => ({
        id: item.message.id,
        type: 'message' as const,
        senderType: item.message.senderType as 'driver',
        senderId: item.message.senderId,
        deliveryId: item.delivery.id,
        content: item.message.content,
        timestamp: item.message.createdAt,
        read: item.message.isRead,
        driverName: item.driver 
          ? `${item.driver.firstName} ${item.driver.lastName}`
          : 'Driver',
        driverId: item.delivery.assignedDriverId,
        deliveryDetails: {
          pickupLocation: item.delivery.pickupLocation,
          dropoffLocation: item.delivery.dropoffLocation,
          fare: item.delivery.fare,
          status: item.delivery.status
        }
      }));

      setNotifications(formattedNotifications);
      setError(null);
      
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load messages. Please try again.');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [customer]);

  // Initial fetch and setup polling
  useEffect(() => {
    if (customer?.id) {
      // Initial fetch
      fetchAllNotifications();
      
      // Set up polling every 30 seconds instead of 15
      pollingIntervalRef.current = setInterval(fetchAllNotifications, 30000);
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [customer, fetchAllNotifications]);

  // Initialize PubNub when chat modal opens
  useEffect(() => {
    if (showChatModal && selectedDelivery && customer) {
      const pubnubClient = createPubNubClient(`customer_${customer.id}`);
      setPubnub(pubnubClient);
      
      const channel = `delivery_${selectedDelivery.deliveryId}`;
      
      const listener = {
        message: (event: any) => {
          if (event.channel === channel && event.message.type === 'CHAT_MESSAGE') {
            const newMessage = event.message.data;
            setChatMessages(prev => {
              const exists = prev.some(m => 
                m.createdAt === newMessage.createdAt && 
                m.content === newMessage.content
              );
              return !exists ? [...prev, newMessage] : prev;
            });
          }
        }
      };

      pubnubClient.addListener(listener);
      pubnubClient.subscribe({ channels: [channel] });

      return () => {
        pubnubClient.removeListener(listener);
        pubnubClient.unsubscribeAll();
      };
    }
  }, [showChatModal, selectedDelivery, customer]);

  // Load chat messages when modal opens
  useEffect(() => {
    if (showChatModal && selectedDelivery) {
      loadChatMessages();
    }
  }, [showChatModal, selectedDelivery]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadChatMessages = async () => {
    if (!selectedDelivery) return;
    
    setChatLoading(true);
    try {
      const response = await fetch(`/api/messages?deliveryId=${selectedDelivery.deliveryId}`);
      if (response.ok) {
        const data = await response.json();
        setChatMessages(data);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    } finally {
      setChatLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !pubnub || !selectedDelivery || !customer || isSending) return;

    setIsSending(true);
    
    const messageToSend: ChatMessage = {
      deliveryId: selectedDelivery.deliveryId,
      senderType: 'customer',
      senderId: customer.id,
      messageType: 'text',
      content: newMessage.trim(),
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    try {
      // Save to database
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageToSend),
      });

      if (response.ok) {
        const savedMessage = await response.json();
        
        // Publish to PubNub
        await pubnub.publish({
          channel: `delivery_${selectedDelivery.deliveryId}`,
          message: { 
            type: 'CHAT_MESSAGE', 
            data: savedMessage 
          }
        });

        // Update local state
        setChatMessages(prev => [...prev, savedMessage]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: notificationId,
          readerId: customer?.id,
          readerType: 'customer'
        }),
      });
      
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      
      if (unreadIds.length === 0) return;
      
      // Mark all unread messages as read
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryId: unreadIds.length > 0 ? notifications[0].deliveryId : null,
          readerId: customer?.id,
          readerType: 'customer'
        }),
      });
      
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const openChat = (deliveryId: number, driverId: number, driverName: string) => {
    if (!customer?.id) return;
    
    setSelectedDelivery({
      deliveryId,
      driverId,
      customerId: customer.id,
      driverName
    });
    setShowChatModal(true);
    
    // Mark all notifications for this delivery as read
    const deliveryNotifications = notifications.filter(n => 
      n.deliveryId === deliveryId && !n.read
    );
    
    deliveryNotifications.forEach(n => markAsRead(n.id));
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatChatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="h-full">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-800 rounded-lg animate-pulse"></div>
            <div className="h-4 w-64 bg-gray-800 rounded animate-pulse"></div>
          </div>
          <div className="h-8 w-24 bg-gray-800 rounded-lg animate-pulse"></div>
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-900/50 rounded-2xl p-6 animate-pulse">
              <div className="flex items-start space-x-3">
                <div className="w-12 h-12 bg-gray-800 rounded-full"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-1/3 bg-gray-800 rounded"></div>
                  <div className="h-12 bg-gray-800 rounded-lg"></div>
                  <div className="h-16 bg-gray-800 rounded-lg"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="w-24 h-24 bg-gradient-to-br from-gray-900 to-gray-800 rounded-full flex items-center justify-center mb-6 border-2 border-red-900/30">
          <FiMessageSquare size={40} className="text-red-400/50" />
        </div>
        <h3 className="text-xl font-medium text-red-400 mb-2">Error Loading Messages</h3>
        <p className="text-gray-400 text-center max-w-md mb-6">{error}</p>
        <button
          onClick={fetchAllNotifications}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="h-full" ref={notificationContainerRef}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-purple-400">Messages</h2>
          <p className="text-sm text-gray-400 mt-1">
            Chat with your delivery drivers
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {unreadCount > 0 ? (
            <>
              <button
                onClick={markAllAsRead}
                className="text-sm text-purple-400 hover:text-purple-300 px-3 py-1 rounded-lg border border-purple-900/50 hover:border-purple-700/50 transition-colors"
                disabled={notifications.length === 0}
              >
                Mark all read
              </button>
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium px-3 py-1 rounded-full">
                {unreadCount} unread
              </span>
            </>
          ) : notifications.length > 0 ? (
            <span className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full">
              All caught up
            </span>
          ) : null}
        </div>
      </div>
      
      {notifications.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
          <div className="w-24 h-24 bg-gradient-to-br from-gray-900 to-gray-800 rounded-full flex items-center justify-center mb-6 border-2 border-purple-900/30">
            <FiMessageSquare size={40} className="text-purple-400/50" />
          </div>
          <h3 className="text-xl font-medium text-gray-300 mb-2">No messages yet</h3>
          <p className="text-gray-500 text-center max-w-md">
            Messages from drivers will appear here once they accept your delivery requests
          </p>
          <div className="mt-6 text-xs text-gray-600 flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
            <span>Make sure you have active deliveries</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification, index) => (
            <motion.div
              key={`${notification.id}-${notification.timestamp}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gradient-to-br from-gray-900 to-black p-4 lg:p-6 rounded-2xl border shadow-lg cursor-pointer transform transition-all duration-300 hover:scale-[1.02] ${
                notification.read 
                  ? 'border-gray-800 hover:border-purple-800/50' 
                  : 'border-purple-900/50 hover:border-purple-600'
              }`}
              onClick={() => notification.driverId && openChat(notification.deliveryId, notification.driverId, notification.driverName || 'Driver')}
              onMouseEnter={() => setHoveredNotification(notification.id)}
              onMouseLeave={() => setHoveredNotification(null)}
            >
              <div className="flex items-start space-x-3">
                {/* Notification Icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center relative ${
                  notification.read 
                    ? 'bg-gray-800 text-gray-400' 
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                }`}>
                  <FiMessageSquare size={20} />
                  {!notification.read && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full border-2 border-gray-900"
                    />
                  )}
                </div>
                
                {/* Notification Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-base truncate text-white">
                        {notification.driverName || 'Driver'}
                      </span>
                      {notification.deliveryDetails?.status === 'accepted' && (
                        <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {!notification.read && (
                        <span className="text-xs text-purple-400 font-medium">NEW</span>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatTime(notification.timestamp)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Message Preview */}
                  <div className="bg-gray-800/30 rounded-lg p-3 mb-3">
                    <p className="text-gray-300 text-sm line-clamp-2">
                      {notification.content}
                    </p>
                    {notification.content.startsWith('Photo') && (
                      <div className="mt-2 flex items-center text-xs text-purple-300">
                        <FiMessageSquare size={12} className="mr-1" />
                        Photo message
                      </div>
                    )}
                  </div>
                  
                  {/* Delivery Details */}
                  {notification.deliveryDetails && (
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <div className="flex items-center space-x-2 text-gray-400">
                          <FiMapPin size={12} />
                          <span>Delivery #{notification.deliveryId}</span>
                        </div>
                        <span className="text-gray-300 font-medium">
                          ${notification.deliveryDetails.fare.toFixed(2)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="text-gray-400 truncate">
                          <span className="text-gray-300">From: </span>
                          {notification.deliveryDetails.pickupLocation}
                        </div>
                        <div className="text-gray-400 truncate">
                          <span className="text-gray-300">To: </span>
                          {notification.deliveryDetails.dropoffLocation}
                        </div>
                      </div>
                      
                      {/* ENHANCED "Tap to reply" Section */}
                      <div className="mt-4 pt-3 border-t border-gray-700/50">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <motion.div
                              animate={{
                                x: hoveredNotification === notification.id ? [0, 5, 0] : 0,
                              }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                repeatType: "reverse"
                              }}
                              className="mr-2"
                            >
                              <span className="text-xs text-gray-500">
                                Click to reply →
                              </span>
                            </motion.div>
                          </div>
                          
                          {/* Animated Reply Button */}
                          <AnimatePresence>
                            <motion.button
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ 
                                opacity: hoveredNotification === notification.id ? 1 : 0.8,
                                scale: hoveredNotification === notification.id ? 1.05 : 1
                              }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                notification.driverId && openChat(notification.deliveryId, notification.driverId, notification.driverName || 'Driver');
                              }}
                              className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-900/30"
                            >
                              <FiCornerUpLeft size={12} />
                              <span className="text-xs font-medium">Reply Now</span>
                              <motion.div
                                animate={{
                                  x: hoveredNotification === notification.id ? [0, 3, 0] : 0,
                                }}
                                transition={{
                                  duration: 0.8,
                                  repeat: Infinity,
                                  repeatType: "reverse"
                                }}
                              >
                                <FiArrowRight size={12} />
                              </motion.div>
                            </motion.button>
                          </AnimatePresence>
                        </div>
                        
                        {/* Pulsing Indicator for Unread Messages */}
                        {!notification.read && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center justify-center mt-2"
                          >
                            <div className="flex items-center space-x-1">
                              <motion.div
                                animate={{
                                  scale: [1, 1.2, 1],
                                  opacity: [0.5, 1, 0.5]
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  repeatType: "reverse"
                                }}
                                className="w-1.5 h-1.5 bg-purple-500 rounded-full"
                              />
                              <span className="text-xs text-purple-400">
                                New message • Tap to respond
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Chat Modal */}
      <AnimatePresence>
        {showChatModal && selectedDelivery && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gradient-to-br from-gray-900 to-black rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-purple-900/30 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-purple-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                      className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center"
                    >
                      <FiMessageSquare size={20} className="text-white" />
                    </motion.div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Chat with {selectedDelivery.driverName}</h3>
                      <p className="text-sm text-purple-300">
                        Delivery #{selectedDelivery.deliveryId}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowChatModal(false)}
                    className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <FiX size={24} />
                  </button>
                </div>
              </div>
              
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-900 to-gray-950">
                {chatLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  </div>
                ) : chatMessages.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-gray-400 py-12"
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiMessageSquare size={32} className="text-purple-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-300">Start a conversation</p>
                    <p className="text-sm text-gray-500 mt-1">No messages yet. Say hello!</p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {chatMessages.map((msg, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex ${msg.senderType === 'customer' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl p-4 ${
                            msg.senderType === 'customer'
                              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-br-none'
                              : 'bg-gray-800 text-gray-200 rounded-bl-none'
                          }`}
                        >
                          <div className="flex items-center mb-1">
                            <span className="text-xs font-medium opacity-90">
                              {msg.senderType === 'customer' ? 'You' : selectedDelivery.driverName}
                            </span>
                          </div>
                          
                          {msg.messageType === 'image' ? (
                            <div className="mb-2">
                              <img
                                src={msg.imageUrl}
                                alt="Shared photo"
                                className="rounded-lg max-w-full h-auto max-h-48 object-cover"
                                loading="lazy"
                              />
                              <p className="text-sm mt-1 opacity-90">{msg.content}</p>
                            </div>
                          ) : (
                            <p className="text-sm">{msg.content}</p>
                          )}
                          
                          <div className="text-xs mt-2 opacity-70">
                            {formatChatTime(msg.createdAt)}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
              
              {/* Input Area */}
              <div className="p-4 border-t border-purple-900/30 bg-gray-900">
                <div className="flex items-center space-x-3">
                  <motion.button
                    whileHover={{ rotate: 15 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 text-gray-400 hover:text-purple-400 hover:bg-gray-800 rounded-lg transition-colors"
                    title="Attach"
                  >
                    <FiPaperclip size={20} />
                  </motion.button>
                  
                  <div className="flex-1">
                    <motion.input
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      disabled={isSending}
                      className="w-full px-4 py-3 bg-gray-800 border border-purple-900/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white placeholder-gray-500 disabled:opacity-50"
                    />
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || isSending}
                    className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isSending ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : (
                      <>
                        <span className="font-medium">Send</span>
                        <FiSend size={16} />
                      </>
                    )}
                  </motion.button>
                </div>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-xs text-gray-500 mt-3 text-center"
                >
                  Press Enter to send • All messages are saved
                </motion.p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}