//components/driver/DeliveryHistoryChat.tsx
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageSquare, FiX, FiClock, FiUser, FiImage } from 'react-icons/fi';

interface DeliveryHistoryChatProps {
  deliveryId: number;
  customerId: number;
  driverId: number;
  onClose: () => void;
}

interface Message {
  id?: number;
  deliveryId: number;
  senderType: 'driver' | 'customer' | 'system';
  senderId: number;
  messageType: 'text' | 'image' | 'status_update' | 'location';
  content: string;
  imageUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export default function DeliveryHistoryChat({ deliveryId, customerId, driverId, onClose }: DeliveryHistoryChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<any>(null);

  useEffect(() => {
    fetchChatHistory();
    fetchCustomerInfo();
  }, [deliveryId]);

  const fetchChatHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/messages?deliveryId=${deliveryId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerInfo = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}`);
      if (response.ok) {
        const data = await response.json();
        setCustomerInfo(data.customer);
      }
    } catch (error) {
      console.error('Error fetching customer info:', error);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups: { [key: string]: Message[] }, message) => {
    const date = formatDate(message.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-h-[600px] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <FiMessageSquare size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Delivery Chat History</h3>
              <p className="text-sm text-purple-100">
                {customerInfo?.username || 'Customer'} • Delivery #{deliveryId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mb-4">
              <FiMessageSquare size={32} className="text-purple-400" />
            </div>
            <p className="text-gray-500 font-medium">No messages in this delivery</p>
            <p className="text-sm text-gray-400 mt-1">Chat history is empty</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <div className="mx-3">
                    <div className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full flex items-center">
                      <FiClock className="mr-1" size={12} />
                      {date}
                    </div>
                  </div>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>
                
                {/* Messages for this date */}
                <div className="space-y-3">
                  {dateMessages.map((msg, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex ${msg.senderType === 'driver' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-3 relative ${
                          msg.senderType === 'driver'
                            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-br-none'
                            : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                        }`}
                      >
                        {/* Sender indicator */}
                        <div className="flex items-center mb-1">
                          <div className="flex items-center space-x-1">
                            {msg.senderType === 'customer' ? (
                              <FiUser size={12} />
                            ) : (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                            <span className="text-xs font-medium opacity-90">
                              {msg.senderType === 'driver' ? 'You' : 'Customer'}
                            </span>
                          </div>
                          {msg.messageType === 'status_update' && (
                            <span className="ml-2 text-xs opacity-80">📋 Update</span>
                          )}
                        </div>
                        
                        {/* Message content */}
                        {msg.messageType === 'image' ? (
                          <div className="mb-2">
                            <div className="relative">
                              <img
                                src={msg.imageUrl}
                                alt="Photo"
                                className="rounded-lg max-w-full h-auto max-h-40 object-cover"
                                loading="lazy"
                              />
                              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                                <FiImage size={10} className="inline mr-1" />
                                Photo
                              </div>
                            </div>
                            <p className="text-sm mt-2 opacity-90">{msg.content}</p>
                          </div>
                        ) : (
                          <p className="text-sm">{msg.content}</p>
                        )}
                        
                        {/* Time */}
                        <div className={`text-xs mt-2 ${msg.senderType === 'driver' ? 'text-purple-200' : 'text-gray-500'}`}>
                          {formatTime(msg.createdAt)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="text-center text-sm text-gray-500">
          <p>This is a read-only view of the delivery chat</p>
          <p className="text-xs text-gray-400 mt-1">
            {messages.length} message{messages.length !== 1 ? 's' : ''} in total
          </p>
        </div>
      </div>
    </div>
  );
}