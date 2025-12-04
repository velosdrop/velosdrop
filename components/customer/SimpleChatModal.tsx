// components/customer/SimpleChatModal.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FiMessageSquare, FiX, FiSend, FiPaperclip, FiSmile, FiImage } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { createPubNubClient } from '@/lib/pubnub-booking';

interface SimpleChatModalProps {
  customerId: number;
  deliveryId: number;
  driverId: number;
  driverName?: string;
  onClose: () => void;
}

interface Message {
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

export default function SimpleChatModal({ 
  customerId, 
  deliveryId, 
  driverId, 
  driverName = 'Driver',
  onClose 
}: SimpleChatModalProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [pubnub, setPubnub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize PubNub
  useEffect(() => {
    if (customerId && deliveryId) {
      const pubnubClient = createPubNubClient(`customer_${customerId}`);
      setPubnub(pubnubClient);
      
      const channel = `delivery_${deliveryId}`;
      
      const listener = {
        message: (event: any) => {
          if (event.channel === channel && event.message.type === 'CHAT_MESSAGE') {
            const newMessage = event.message.data;
            
            setMessages(prev => {
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
  }, [customerId, deliveryId]);

  // Load chat history
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const response = await fetch(`/api/messages?deliveryId=${deliveryId}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChatHistory();
  }, [deliveryId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (content: string, type: 'text' | 'image' = 'text', imageUrl?: string) => {
    if (!content.trim() || !pubnub || isSending) return;

    setIsSending(true);
    
    const newMessage: Message = {
      deliveryId,
      senderType: 'customer',
      senderId: customerId,
      messageType: type,
      content,
      imageUrl,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    try {
      // Save to database
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMessage),
      });

      if (response.ok) {
        const savedMessage = await response.json();
        
        // Publish to PubNub
        await pubnub.publish({
          channel: `delivery_${deliveryId}`,
          message: { type: 'CHAT_MESSAGE', data: savedMessage }
        });

        // Update local state
        setMessages(prev => [...prev, savedMessage]);
        setMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  }, [pubnub, deliveryId, customerId, driverId, isSending]);

  const handleSend = () => {
    if (message.trim()) {
      sendMessage(message);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
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
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                <FiMessageSquare size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Chat with {driverName}</h3>
                <p className="text-sm text-purple-300">
                  Delivery #{deliveryId}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>
        
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-900 to-gray-950">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiMessageSquare size={32} className="text-purple-400" />
              </div>
              <p className="text-lg font-medium text-gray-300">Start a conversation</p>
              <p className="text-sm text-gray-500 mt-1">No messages yet. Say hello!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
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
                        {msg.senderType === 'customer' ? 'You' : driverName}
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
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Input Area */}
        <div className="p-4 border-t border-purple-900/30 bg-gray-900">
          <div className="flex items-center space-x-3">
            <button
              className="p-2 text-gray-400 hover:text-purple-400 hover:bg-gray-800 rounded-lg transition-colors"
              title="Attach"
            >
              <FiPaperclip size={20} />
            </button>
            
            <div className="flex-1">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                disabled={isSending}
                className="w-full px-4 py-3 bg-gray-800 border border-purple-900/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white placeholder-gray-500 disabled:opacity-50"
              />
            </div>
            
            <button
              onClick={handleSend}
              disabled={!message.trim() || isSending}
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
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Press Enter to send • All messages are saved
          </p>
        </div>
      </motion.div>
    </div>
  );
}