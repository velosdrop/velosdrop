//components/MessageNotifications.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { createPubNubClient } from '@/lib/pubnub-booking';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageSquare, FiX, FiBell } from 'react-icons/fi';

interface MessageNotificationsProps {
  userId: number;
  userType: 'driver' | 'customer';
  deliveryId?: number;
}

export default function MessageNotifications({ userId, userType, deliveryId }: MessageNotificationsProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pubnub, setPubnub] = useState<any>(null);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize PubNub
  useEffect(() => {
    if (userId) {
      const pubnubClient = createPubNubClient(`${userType}_${userId}`);
      setPubnub(pubnubClient);
      
      // Subscribe to personal chat channel
      const channel = `${userType}_${userId}_chat`;
      
      const listener = {
        message: (event: any) => {
          console.log('🔔 Notification received:', event);
          
          if (event.message.type === 'NEW_MESSAGE') {
            const message = event.message.data;
            
            // Create notification
            const newNotification = {
              id: Date.now(),
              type: 'message',
              senderType: userType === 'driver' ? 'customer' : 'driver',
              senderId: message.senderId,
              deliveryId: message.deliveryId,
              content: message.content,
              timestamp: new Date().toISOString(),
              read: false
            };
            
            // Add to notifications
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Play notification sound
            playNotificationSound();
            
            // Show browser notification if permission is granted
            showBrowserNotification(message);
          }
        },
        status: (event: any) => {
          console.log('📡 Notification PubNub status:', event.category);
        }
      };

      pubnubClient.addListener(listener);
      pubnubClient.subscribe({
        channels: [channel],
        withPresence: true
      });

      return () => {
        pubnubClient.removeListener(listener);
        pubnubClient.unsubscribeAll();
      };
    }
  }, [userId, userType]);

  // Request notification permission on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
    
    // Create notification sound element
    notificationSoundRef.current = new Audio('/notification.mp3');
  }, []);

  const playNotificationSound = () => {
    if (notificationSoundRef.current) {
      notificationSoundRef.current.currentTime = 0;
      notificationSoundRef.current.play().catch(console.error);
    }
  };

  const showBrowserNotification = (message: any) => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('New Message', {
          body: message.content,
          icon: '/notification-icon.png',
          tag: 'message-notification'
        });
      }
    }
  };

  const markAsRead = (notificationId: number) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-purple-600 transition-colors"
      >
        <FiBell size={24} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setShowNotifications(false)}
            />
            
            {/* Notifications Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FiMessageSquare size={20} />
                    <h3 className="font-semibold">Messages</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30 transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 hover:bg-white/20 rounded transition-colors"
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FiMessageSquare size={24} className="text-gray-400" />
                    </div>
                    <p className="text-sm">No notifications yet</p>
                    <p className="text-xs text-gray-400 mt-1">New messages will appear here</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            notification.senderType === 'driver' 
                              ? 'bg-blue-100 text-blue-600' 
                              : 'bg-green-100 text-green-600'
                          }`}>
                            <FiMessageSquare size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {notification.senderType === 'driver' ? 'Driver' : 'Customer'}
                              </span>
                              {!notification.read && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {notification.content}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-500">
                                Delivery #{notification.deliveryId}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatTime(notification.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="border-t border-gray-200 p-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={clearNotifications}
                      className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded transition-colors"
                    >
                      Clear all
                    </button>
                    <span className="text-xs text-gray-500">
                      {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}