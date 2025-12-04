'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/app/context/UserContext';
import { FiMessageSquare, FiMapPin, FiX } from 'react-icons/fi';
import { motion } from 'framer-motion';
import CustomerChatBubble from './ChatBubble';

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

export default function NotificationsSection() {
  const { customer } = useUser();
  const [notifications, setNotifications] = useState<MessageNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<{
    deliveryId: number;
    driverId: number;
    customerId: number;
  } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread message count
  useEffect(() => {
    if (customer?.id) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 10000);
      return () => clearInterval(interval);
    }
  }, [customer]);

  // Fetch notifications/messages
  useEffect(() => {
    if (customer?.id) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [customer]);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`/api/customer/${customer?.id}/unread-message-count`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // First get active deliveries
      const deliveriesResponse = await fetch(`/api/customer/${customer?.id}/active-deliveries`);
      if (!deliveriesResponse.ok) {
        setNotifications([]);
        return;
      }

      const deliveriesData = await deliveriesResponse.json();
      const deliveries = deliveriesData.deliveries || [];
      
      const allNotifications: MessageNotification[] = [];
      
      // For each active delivery, get unread messages
      for (const delivery of deliveries) {
        const messagesResponse = await fetch(`/api/messages?deliveryId=${delivery.id}`);
        if (messagesResponse.ok) {
          const messages = await messagesResponse.json();
          
          // Filter unread messages from driver
          const unreadDriverMessages = messages.filter((msg: any) => 
            !msg.isRead && msg.senderType === 'driver'
          );
          
          if (unreadDriverMessages.length > 0) {
            const driverName = delivery.driver 
              ? `${delivery.driver.firstName} ${delivery.driver.lastName}`
              : 'Driver';
            
            unreadDriverMessages.forEach((msg: any) => {
              allNotifications.push({
                id: msg.id,
                type: 'message',
                senderType: msg.senderType,
                senderId: msg.senderId,
                deliveryId: delivery.id,
                driverId: delivery.assignedDriverId,
                content: msg.content,
                timestamp: msg.createdAt,
                read: msg.isRead,
                driverName: driverName,
                deliveryDetails: {
                  pickupLocation: delivery.pickupLocation,
                  dropoffLocation: delivery.dropoffLocation,
                  fare: delivery.fare,
                  status: delivery.status
                }
              });
            });
          }
        }
      }
      
      // Sort by timestamp (newest first)
      allNotifications.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setNotifications(allNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
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
      const unreadNotifications = notifications.filter(n => !n.read);
      
      for (const notification of unreadNotifications) {
        await markAsRead(notification.id);
      }
      
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const openChat = (deliveryId: number, driverId: number) => {
    if (!customer?.id) return;
    
    setSelectedDelivery({
      deliveryId,
      driverId,
      customerId: customer.id
    });
    setShowChatModal(true);
    
    // Mark all notifications for this delivery as read
    notifications
      .filter(n => n.deliveryId === deliveryId && !n.read)
      .forEach(n => markAsRead(n.id));
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-purple-400">Messages</h2>
          <p className="text-sm text-gray-400 mt-1">
            Chat with your delivery drivers
          </p>
        </div>
        
        {unreadCount > 0 ? (
          <div className="flex items-center space-x-3">
            <button
              onClick={markAllAsRead}
              className="text-sm text-purple-400 hover:text-purple-300 px-3 py-1 rounded-lg border border-purple-900/50 hover:border-purple-700/50 transition-colors"
            >
              Mark all read
            </button>
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium px-3 py-1 rounded-full">
              {unreadCount} unread
            </span>
          </div>
        ) : notifications.length > 0 && (
          <span className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full">
            All caught up
          </span>
        )}
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
          {notifications.map((notification) => (
            <motion.div
              key={`${notification.id}-${notification.timestamp}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-gradient-to-br from-gray-900 to-black p-4 lg:p-6 rounded-2xl border shadow-lg cursor-pointer transform transition-all duration-300 hover:scale-[1.02] ${
                notification.read 
                  ? 'border-gray-800 hover:border-purple-800/50' 
                  : 'border-purple-900/50 hover:border-purple-600'
              }`}
              onClick={() => notification.driverId && openChat(notification.deliveryId, notification.driverId)}
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
                      "{notification.content}"
                    </p>
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
                      <div className="mt-3 flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          Tap to reply
                        </span>
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="text-xs text-purple-400 hover:text-purple-300"
                          >
                            Mark as read
                          </button>
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
      {showChatModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-purple-900/30 shadow-2xl">
            <div className="p-6 border-b border-purple-900/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                    <FiMessageSquare size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Chat with Driver</h3>
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
            
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {/* Chat interface */}
              <div className="bg-gray-800/30 rounded-xl p-4 mb-4">
                <p className="text-gray-300 text-center">
                  Chat will open in a new window. You can send and receive messages here.
                </p>
              </div>
              
              {/* Integrated Chat Bubble Component */}
              {customer && (
                <div className="scale-75 origin-top">
                  <CustomerChatBubble
                    customerId={selectedDelivery.customerId}
                    deliveryId={selectedDelivery.deliveryId}
                    driverId={selectedDelivery.driverId}
                  />
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-purple-900/30">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-400">
                  All messages are saved for future reference
                </p>
                <button
                  onClick={() => setShowChatModal(false)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
                >
                  Close Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}