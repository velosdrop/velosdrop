//components/driver/ChatBubble.tsx
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FiMessageSquare, 
  FiX, 
  FiImage, 
  FiSend, 
  FiCheckCircle, 
  FiCamera, 
  FiRefreshCw, 
  FiMaximize 
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { createPubNubClient } from '@/lib/pubnub-booking';

// --- Interfaces ---
interface ChatBubbleProps {
  driverId: number;
  deliveryId: number;
  customerId: number;
  onSendImage: (file: File) => Promise<string>;
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

export default function ChatBubble({ driverId, deliveryId, customerId, onSendImage }: ChatBubbleProps) {
  // --- State ---
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // PubNub State
  const [pubnub, setPubnub] = useState<any>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
  }, [messages, isCameraOpen, capturedImage]); // Scroll when view changes

  // --- Load History ---
  useEffect(() => {
    if (isOpen && deliveryId) loadChatHistory();
  }, [isOpen, deliveryId]);

  // --- Cleanup Camera on Close ---
  useEffect(() => {
    if (!isOpen) stopCamera();
  }, [isOpen]);

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

  // --- Camera Logic ---
  const startCamera = async () => {
    setIsCameraOpen(true);
    setCapturedImage(null);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Prefer rear camera for drivers
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera Error:", err);
      setCameraError("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    setCapturedImage(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageUrl);
        // Don't stop camera stream yet in case they want to retake
      }
    }
  };

  const sendCapturedPhoto = async () => {
    if (!capturedImage) return;

    // Convert base64 to File object
    const res = await fetch(capturedImage);
    const blob = await res.blob();
    const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });

    stopCamera(); // Close camera view
    setIsUploading(true);

    try {
      const uploadedUrl = await onSendImage(file);
      await sendMessage('Photo from camera', 'image', uploadedUrl);
    } catch (error) {
      console.error('Error uploading captured image:', error);
      alert('Failed to upload image.');
    } finally {
      setIsUploading(false);
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
        
        await pubnub.publish({
          channel: `delivery_${deliveryId}`,
          message: { type: 'CHAT_MESSAGE', data: savedMessage }
        });

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
      const imageUrl = await onSendImage(file);
      await sendMessage('Image attachment', 'image', imageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const quickActions = [
    { text: 'Arrived', message: "I've arrived at the location.", icon: '📍' },
    { text: 'Dropped', message: "Package delivered successfully!", icon: '📦' },
    { text: 'Late', message: "Running slightly late due to traffic.", icon: '⏰' },
  ];

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-gray-900 text-white p-4 rounded-full shadow-xl shadow-gray-900/30 flex items-center justify-center transition-all duration-300 hover:bg-black"
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
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              // Dynamic height fix: Max height 80vh, never cuts off top
              className="fixed bottom-24 right-4 md:right-6 z-50 w-[95vw] md:w-96 max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
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

              {/* BODY: Swaps between Message List and Camera View */}
              <div className="flex-1 overflow-hidden relative bg-gray-50 flex flex-col">
                
                {isCameraOpen ? (
                  // --- Camera Interface ---
                  <div className="absolute inset-0 z-20 bg-black flex flex-col">
                    <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
                      {/* Live Video */}
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className={`w-full h-full object-cover ${capturedImage ? 'hidden' : 'block'}`}
                      />
                      {/* Captured Preview */}
                      {capturedImage && (
                        <img src={capturedImage} alt="Preview" className="w-full h-full object-contain" />
                      )}
                      {/* Hidden Canvas for processing */}
                      <canvas ref={canvasRef} className="hidden" />
                      
                      {cameraError && (
                        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white bg-black/80">
                          <p>{cameraError}</p>
                        </div>
                      )}
                    </div>

                    {/* Camera Controls */}
                    <div className="h-24 bg-gray-900 flex items-center justify-around px-6 shrink-0">
                      {!capturedImage ? (
                        <>
                          <button onClick={stopCamera} className="text-white p-2">Cancel</button>
                          <button 
                            onClick={capturePhoto}
                            className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-white/20 active:scale-95 transition-transform"
                          >
                            <div className="w-12 h-12 bg-white rounded-full" />
                          </button>
                          <div className="w-12" /> {/* Spacer */}
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => setCapturedImage(null)} 
                            className="flex flex-col items-center text-white gap-1"
                          >
                            <FiRefreshCw size={24} />
                            <span className="text-xs">Retake</span>
                          </button>
                          <button 
                            onClick={sendCapturedPhoto}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition-colors flex items-center gap-2"
                          >
                            <FiSend /> Send Photo
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  // --- Chat List Interface ---
                  <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
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
                              {msg.messageType === 'image' && (
                                <div className="mb-2 rounded-lg overflow-hidden">
                                  <img 
                                    src={msg.imageUrl} 
                                    alt="Sent content" 
                                    className="max-w-full h-auto object-cover" 
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

                    {/* Quick Actions (Sticky bottom of list) */}
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 overflow-x-auto no-scrollbar">
                      <div className="flex gap-2">
                        {quickActions.map((action, i) => (
                          <button
                            key={i}
                            onClick={() => sendMessage(action.message, 'status_update')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all whitespace-nowrap"
                          >
                            <span>{action.icon}</span>
                            {action.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer: Input Area (Hidden if camera is open) */}
              {!isCameraOpen && (
                <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                  <div className="flex items-end gap-2">
                    {/* Hidden File Input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />

                    {/* Action Buttons */}
                    <div className="flex gap-1 pb-1">
                      <button
                        onClick={() => startCamera()}
                        disabled={isUploading || isSending}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                        title="Take Photo"
                      >
                        <FiCamera size={20} />
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || isSending}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                        title="Upload Image"
                      >
                        <FiImage size={20} />
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
                        disabled={isSending}
                        rows={1}
                        className="w-full px-4 py-3 bg-gray-100 border-0 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-gray-900 focus:bg-white resize-none text-sm max-h-32 min-h-[44px]"
                        style={{ height: '44px' }} // Fallback min height
                      />
                    </div>

                    {/* Send Button */}
                    <button
                      onClick={handleSend}
                      disabled={!message.trim() || isSending}
                      className="p-3 bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors pb-3"
                    >
                      {isSending || isUploading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <FiSend size={18} />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
