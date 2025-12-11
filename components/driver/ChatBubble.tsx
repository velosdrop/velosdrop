//components/driver/ChatBubble.tsx
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FiMessageSquare, 
  FiX, 
  FiImage, 
  FiSend, 
  FiCheckCircle, 
  FiMaximize,
  FiUpload,
  FiCheck
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { createPubNubClient } from '@/lib/pubnub-booking';

// --- Interfaces ---
interface ChatBubbleProps {
  driverId: number;
  deliveryId: number;
  customerId: number;
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
  metadata?: Record<string, any>;
}

export default function ChatBubble({ driverId, deliveryId, customerId }: ChatBubbleProps) {
  // --- State ---
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Image Preview State
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [completionModal, setCompletionModal] = useState<{
    isOpen: boolean;
    requiresPhoto: boolean;
    photoUploaded: boolean;
  }>({
    isOpen: false,
    requiresPhoto: false,
    photoUploaded: false
  });

  // PubNub State
  const [pubnub, setPubnub] = useState<any>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const completionFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatButtonRef = useRef<HTMLButtonElement>(null);

  // --- PubNub Initialization ---
  useEffect(() => {
    if (driverId && deliveryId) {
      const pubnubClient = createPubNubClient(`driver_${driverId}`);
      setPubnub(pubnubClient);
      
      const channel = `delivery_${deliveryId}`;
      
      const listener = {
        message: (event: any) => {
          if (event.channel === channel && event.message.type === 'CHAT_MESSAGE') {
            const newMessage = event.message.data;
            
            setMessages(prev => {
              const exists = prev.some(m => 
                m.createdAt === newMessage.createdAt && 
                m.content === newMessage.content &&
                m.senderId === newMessage.senderId
              );
              
              if (!exists) return [...prev, newMessage];
              return prev;
            });
            
            if (newMessage.senderType === 'customer') {
              markMessageAsRead(newMessage);
            }
          }
        }
      };

      pubnubClient.addListener(listener);
      pubnubClient.subscribe({ channels: [channel], withPresence: true });

      return () => {
        pubnubClient.removeListener(listener);
        pubnubClient.unsubscribeAll();
      };
    }
  }, [driverId, deliveryId]);

  // --- Auto Scroll ---
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // --- Load History ---
  useEffect(() => {
    if (isOpen && deliveryId) loadChatHistory();
  }, [isOpen, deliveryId]);

  // --- Image Upload Function ---
  const uploadImageToVercelBlob = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('deliveryId', deliveryId.toString());
    formData.append('driverId', driverId.toString());
    formData.append('senderType', 'driver');

    console.log('📤 Uploading image to Vercel Blob...', {
      deliveryId,
      driverId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    const response = await fetch('/api/upload/delivery-proof-vercel', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload failed:', response.status, errorText);
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Upload successful:', data.imageUrl);
    return data.imageUrl;
  };

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`/api/messages?deliveryId=${deliveryId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const markMessageAsRead = async (message: Message) => {
    try {
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: message.id,
          deliveryId: deliveryId,
          readerId: driverId,
          readerType: 'driver'
        }),
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // --- Message Sending Logic ---
  const sendMessage = useCallback(async (content: string, type: Message['messageType'] = 'text', imageUrl?: string) => {
    if ((!content.trim() && !imageUrl) || !pubnub || isSending) return;

    setIsSending(true);
    
    const newMessage: Message = {
      deliveryId,
      senderType: 'driver',
      senderId: driverId,
      messageType: type,
      content,
      imageUrl,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMessage),
      });

      if (response.ok) {
        const savedMessage = await response.json();
        
        // Publish to delivery channel
        await pubnub.publish({
          channel: `delivery_${deliveryId}`,
          message: { type: 'CHAT_MESSAGE', data: savedMessage }
        });

        // Notify customer specifically
        await pubnub.publish({
          channel: `customer_${customerId}_chat`,
          message: {
            type: 'NEW_MESSAGE',
            data: { ...savedMessage, deliveryId, driverId, isFromDriver: true }
          }
        });

        setMessages(prev => [...prev, savedMessage]);
        setMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  }, [pubnub, deliveryId, driverId, customerId, isSending]);

  const handleSend = () => {
    if (message.trim()) sendMessage(message);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const imageUrl = await uploadImageToVercelBlob(file);
      await sendMessage('Image attachment', 'image', imageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCompletionPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const imageUrl = await uploadImageToVercelBlob(file);
      
      // Send photo as message
      await sendMessage('Delivery completion photo', 'image', imageUrl);
      
      // Update completion modal state
      setCompletionModal(prev => ({
        ...prev,
        photoUploaded: true
      }));
      
      alert('Photo uploaded successfully! You can now mark delivery as complete.');
      
    } catch (error) {
      console.error('Error uploading completion image:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setIsUploading(false);
      if (completionFileInputRef.current) completionFileInputRef.current.value = '';
    }
  };

  const markDeliveryAsComplete = async () => {
    try {
      const response = await fetch('/api/delivery/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          deliveryId,
          driverId 
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        // Handle insufficient balance error
        if (result.error === 'Insufficient balance') {
          alert(`❌ ${result.message}\n\nPlease top up your wallet to continue.`);
          return;
        }
        throw new Error(result.error || 'Failed to complete delivery');
      }
      
      // Send completion message to chat
      await sendMessage("Delivery completed!", 'status_update');
      
      // Show success message with commission details
      alert(`✅ Delivery marked as complete!\n\nCommission: $${result.commissionDeducted.toFixed(2)} deducted.\nNew balance: $${result.newBalance.toFixed(2)}`);
      
      // Close modal
      setCompletionModal({
        isOpen: false,
        requiresPhoto: false,
        photoUploaded: false
      });
      
      // Refresh wallet balance if on wallet page
      if (typeof window !== 'undefined' && window.location.pathname.includes('/wallet')) {
        window.location.reload();
      }
      
    } catch (error) {
      console.error('Error completing delivery:', error);
      alert(`Failed to mark delivery as complete: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const quickActions = [
    { 
      text: 'Arrived', 
      message: "I've arrived at the location.", 
      icon: '📍',
      trigger: async () => {
        try {
          await fetch('/api/delivery/arrived', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deliveryId })
          });
        } catch (error) {
          console.error('Error marking arrived:', error);
        }
        sendMessage("I've arrived at the location.", 'status_update');
      }
    },
    { 
      text: 'Completed', 
      message: "Delivery completed!", 
      icon: '📦',
      trigger: () => {
        // Open completion modal instead of asking for camera
        setCompletionModal({
          isOpen: true,
          requiresPhoto: true,
          photoUploaded: false
        });
      }
    },
    { 
      text: 'Upload Photo', 
      message: "Uploading photo...", 
      icon: '📸',
      trigger: () => fileInputRef.current?.click()
    }
  ];

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
        disabled={isUploading || isSending}
      />
      
      <input
        type="file"
        ref={completionFileInputRef}
        onChange={handleCompletionPhotoUpload}
        accept="image/*"
        className="hidden"
        disabled={isUploading || isSending}
      />

      {/* Floating Toggle Button - FIXED with higher z-index */}
      <motion.button
        ref={chatButtonRef}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => {
          e.stopPropagation();
          console.log('Chat button clicked, setting isOpen to:', !isOpen);
          setIsOpen(true);
        }}
        className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 text-white p-4 rounded-full shadow-xl shadow-gray-900/30 flex items-center justify-center transition-all duration-300 hover:bg-black"
        style={{ zIndex: 9999 }}
      >
        <FiMessageSquare size={24} />
        {messages.some(m => !m.isRead && m.senderType === 'customer') && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            {messages.filter(m => !m.isRead && m.senderType === 'customer').length}
          </span>
        )}
      </motion.button>

      {/* Main Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop - FIXED with higher z-index */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9990]"
              onClick={() => {
                console.log('Backdrop clicked, closing chat');
                setIsOpen(false);
              }}
            />
            
            {/* Modal Container - FIXED with proper positioning */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[9991] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              style={{ 
                maxHeight: 'calc(100vh - 180px)',
                height: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Header */}
              <div className="bg-gray-900 p-4 text-white shrink-0 flex items-center justify-between shadow-md z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                    <FiMessageSquare className="text-white" size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm md:text-base">Delivery Chat</h3>
                    <p className="text-xs text-gray-400">Order #{deliveryId}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>

              {/* Chat List Interface */}
              <div className="flex-1 overflow-hidden relative bg-gray-50 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60 py-8">
                      <FiMessageSquare size={48} className="mb-2" />
                      <p>Start messaging</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={index}
                        className={`flex ${msg.senderType === 'driver' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                          msg.senderType === 'driver' 
                            ? 'bg-gray-900 text-white rounded-br-none' 
                            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                        }`}>
                          {/* Image Message */}
                          {msg.messageType === 'image' && msg.imageUrl && (
                            <div className="mb-2 rounded-lg overflow-hidden cursor-pointer">
                              <img 
                                src={msg.imageUrl} 
                                alt="Sent content" 
                                className="max-w-full h-auto object-cover hover:opacity-90 transition-opacity"
                                onClick={() => setPreviewImage(msg.imageUrl || null)}
                              />
                            </div>
                          )}
                          
                          {/* Status Badge */}
                          {msg.messageType === 'status_update' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1 border border-current px-1.5 py-0.5 rounded">
                              <FiCheckCircle /> Status
                            </span>
                          )}

                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          
                          <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${
                            msg.senderType === 'driver' ? 'text-gray-400' : 'text-gray-400'
                          }`}>
                            {formatTime(msg.createdAt)}
                            {msg.senderType === 'driver' && (
                              <span>{msg.isRead ? '• Read' : '• Sent'}</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 overflow-x-auto no-scrollbar shrink-0">
                  <div className="flex gap-2">
                    {quickActions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => action.trigger ? action.trigger() : sendMessage(action.message, 'status_update')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all whitespace-nowrap"
                      >
                        <span>{action.icon}</span>
                        {action.text}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer: Input Area */}
              <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                <div className="flex items-end gap-2">
                  {/* Action Buttons */}
                  <div className="flex gap-1 pb-1">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || isSending}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Upload Image"
                    >
                      <FiUpload size={20} />
                    </button>
                  </div>

                  {/* Text Input */}
                  <div className="flex-1 relative">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Type a message..."
                      disabled={isSending || isUploading}
                      rows={1}
                      className="w-full px-4 py-3 bg-gray-100 border-0 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-gray-900 focus:bg-white resize-none text-sm max-h-32 min-h-[44px] disabled:opacity-50"
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleSend}
                    disabled={(!message.trim() && !isUploading) || isSending}
                    className="p-3 bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSending || isUploading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FiSend size={18} />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Completion Modal - FIXED FOR MOBILE */}
      <AnimatePresence>
        {completionModal.isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10000]"
              onClick={() => setCompletionModal(prev => ({ ...prev, isOpen: false }))}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-[10001] max-h-[85vh] overflow-y-auto mx-auto max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gray-900 p-5 text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <FiCheck size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Complete Delivery</h3>
                      <p className="text-sm text-gray-300">Order #{deliveryId}</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <FiImage className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">Upload Delivery Proof Photo</h4>
                        <p className="text-sm text-gray-600">
                          Please upload a photo showing the delivered package at the destination. 
                          This helps confirm successful delivery.
                        </p>
                      </div>
                    </div>
                    
                    {/* Status Indicator */}
                    <div className="mt-6 mb-4">
                      <div className={`flex items-center gap-2 p-3 rounded-lg ${completionModal.photoUploaded ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${completionModal.photoUploaded ? 'bg-green-500' : 'bg-gray-300'}`}>
                          {completionModal.photoUploaded ? (
                            <FiCheck className="text-white" size={14} />
                          ) : (
                            <span className="text-white text-xs">1</span>
                          )}
                        </div>
                        <span className={`font-medium ${completionModal.photoUploaded ? 'text-green-700' : 'text-gray-700'}`}>
                          {completionModal.photoUploaded ? 'Photo uploaded successfully' : 'Upload delivery photo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3">
                    {!completionModal.photoUploaded ? (
                      <>
                        <button
                          onClick={() => completionFileInputRef.current?.click()}
                          disabled={isUploading}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isUploading ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <FiUpload size={18} />
                              <span>Upload Photo from Gallery</span>
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => setCompletionModal(prev => ({ ...prev, isOpen: false }))}
                          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-xl font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={markDeliveryAsComplete}
                          disabled={isSending}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSending ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Completing...</span>
                            </>
                          ) : (
                            <>
                              <FiCheck size={18} />
                              <span>Mark Delivery as Complete</span>
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => completionFileInputRef.current?.click()}
                          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-3"
                        >
                          <FiImage size={18} />
                          <span>Upload Another Photo</span>
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* Skip option (only before photo uploaded) */}
                  {!completionModal.photoUploaded && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => {
                          if (confirm("Are you sure you want to complete delivery without a photo? It's recommended to upload proof of delivery.")) {
                            markDeliveryAsComplete();
                            setCompletionModal(prev => ({ ...prev, isOpen: false }));
                          }
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700 underline"
                      >
                        Complete without photo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10002] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-4xl max-h-[80vh]">
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-12 right-0 text-white p-2 hover:bg-white/10 rounded-full"
              >
                <FiX size={24} />
              </button>
              <img 
                src={previewImage} 
                alt="Preview" 
                className="w-full h-auto rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(previewImage, '_blank');
                }}
                className="absolute bottom-4 right-4 bg-white text-black px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-100"
              >
                <FiMaximize size={18} />
                Open Full Size
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add CSS for no-scrollbar */}
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}