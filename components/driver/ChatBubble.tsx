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
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  
  // Image Preview State
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // PubNub State
  const [pubnub, setPubnub] = useState<any>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraContainerRef = useRef<HTMLDivElement>(null);

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
  }, [messages, isCameraOpen, capturedImage]);

  // --- Load History ---
  useEffect(() => {
    if (isOpen && deliveryId) loadChatHistory();
  }, [isOpen, deliveryId]);

  // --- Cleanup Camera on Close ---
  useEffect(() => {
    if (!isOpen) stopCamera();
  }, [isOpen]);

  // --- Video Playback Handling ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !cameraStream) return;

    const handleCanPlay = () => {
      console.log('🎥 Video can play, attempting to play...');
      video.play().catch(error => {
        console.error('Failed to play video:', error);
        if (error.name === 'NotAllowedError') {
          setCameraError("Camera access was denied. Please allow camera permissions.");
        }
      });
    };

    const handlePlaying = () => {
      console.log('✅ Video is now playing');
      setIsCameraLoading(false);
    };

    const handleError = (e: any) => {
      console.error('Video error:', e);
      setCameraError("Failed to load camera feed. Please try again.");
      setIsCameraLoading(false);
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
    };
  }, [cameraStream]);

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

  // --- Camera Logic ---
  const startCamera = async () => {
    setIsCameraOpen(true);
    setIsCameraLoading(true);
    setCapturedImage(null);
    setCameraError(null);
    
    try {
      // Stop any existing stream first
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }

      // Request camera with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      setCameraStream(stream);
      
      // Give a small delay for video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log('📷 Camera stream set to video element');
        }
      }, 100);
      
    } catch (err: any) {
      console.error("Camera Error:", err);
      let errorMessage = "Could not access camera. ";
      
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage += "No camera found.";
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage += "Permission was denied.";
      } else if (err.name === 'NotSupportedError' || err.name === 'ConstraintNotSatisfiedError') {
        errorMessage += "Camera constraints could not be satisfied.";
      } else {
        errorMessage += "Please check permissions and try again.";
      }
      
      setCameraError(errorMessage);
      setIsCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Stopped camera track:', track.kind);
      });
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    setIsCameraLoading(false);
    setCapturedImage(null);
    setCameraError(null);
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && cameraStream) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Wait for video to be ready
      if (video.readyState < 2) {
        console.log('⏳ Video not ready yet, waiting...');
        video.addEventListener('loadeddata', () => {
          capturePhoto();
        }, { once: true });
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageUrl);
        console.log('📸 Photo captured:', imageUrl.substring(0, 50) + '...');
      }
    }
  };

  const sendCapturedPhoto = async () => {
    if (!capturedImage) return;

    try {
      // Convert base64 to File object
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { 
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      stopCamera();
      setIsUploading(true);

      const uploadedUrl = await uploadImageToVercelBlob(file);
      await sendMessage('Photo from camera', 'image', uploadedUrl);
    } catch (error) {
      console.error('Error uploading captured image:', error);
      alert('Failed to upload image. Please try again.');
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
              className="fixed bottom-24 right-4 md:right-6 z-50 w-[95vw] md:w-96 max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              
              {/* Header */}
              <div className="bg-gray-900 p-4 text-white shrink-0 flex items-center justify-between shadow-md z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                    <FiMessageSquare className="text-white" size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm md:text-base">
                      {isCameraOpen ? 'Take Photo' : 'Delivery Chat'}
                    </h3>
                    <p className="text-xs text-gray-400">Order #{deliveryId}</p>
                  </div>
                </div>
                <button 
                  onClick={() => isCameraOpen ? stopCamera() : setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>

              {/* BODY: Swaps between Message List and Camera View */}
              <div className="flex-1 overflow-hidden relative bg-gray-50 flex flex-col" ref={cameraContainerRef}>
                
                {isCameraOpen ? (
                  // --- Camera Interface ---
                  <div className="absolute inset-0 z-20 bg-black flex flex-col">
                    {/* Camera Header Bar */}
                    <div className="h-12 bg-black/70 backdrop-blur-sm flex items-center justify-between px-4 text-white shrink-0">
                      <span className="text-sm font-medium">Camera</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (cameraStream) {
                              const videoTrack = cameraStream.getVideoTracks()[0];
                              if (videoTrack) {
                                const currentMode = videoTrack.getSettings().facingMode;
                                const newMode = currentMode === 'user' ? 'environment' : 'user';
                                videoTrack.applyConstraints({
                                  facingMode: newMode
                                });
                              }
                            }
                          }}
                          className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                          title="Switch Camera"
                        >
                          <FiRefreshCw size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Live Video Area */}
                    <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                      {/* Live Video */}
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted
                        className={`w-full h-full object-contain ${capturedImage || cameraError ? 'opacity-0' : 'opacity-100'}`}
                      />
                      
                      {/* Camera Loading Overlay */}
                      {isCameraLoading && !cameraError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
                          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
                          <p className="text-white text-sm">Starting camera...</p>
                        </div>
                      )}
                      
                      {/* Captured Preview */}
                      {capturedImage && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
                          <img 
                            src={capturedImage} 
                            alt="Preview" 
                            className="max-w-full max-h-full object-contain"
                          />
                          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs">
                            Preview
                          </div>
                        </div>
                      )}
                      
                      {/* Camera Error */}
                      {cameraError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-black/90">
                          <div className="mb-4 p-3 bg-red-500/20 rounded-full">
                            <FiCamera size={32} />
                          </div>
                          <p className="text-lg font-medium mb-2">Camera Error</p>
                          <p className="text-gray-300 mb-6">{cameraError}</p>
                          <button 
                            onClick={stopCamera}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                          >
                            Go Back to Chat
                          </button>
                        </div>
                      )}
                      
                      {/* Viewfinder Frame */}
                      {!capturedImage && !cameraError && !isCameraLoading && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="w-64 h-64 border-2 border-white/50 rounded-lg">
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                              <div className="w-8 h-8 border-4 border-white/70 rounded-full"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Hidden Canvas for processing */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Camera Controls */}
                    <div className="h-28 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-center gap-8 px-6 shrink-0 backdrop-blur-sm">
                      {!capturedImage ? (
                        <>
                          <button 
                            onClick={stopCamera}
                            className="flex flex-col items-center text-white gap-1 active:scale-95 transition-transform"
                          >
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                              <FiX size={24} />
                            </div>
                            <span className="text-xs mt-1">Cancel</span>
                          </button>
                          
                          <button 
                            onClick={capturePhoto}
                            disabled={isCameraLoading || !!cameraError}
                            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/10 active:scale-95 transition-transform hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="w-16 h-16 bg-white rounded-full" />
                          </button>
                          
                          <div className="w-12"></div> {/* Spacer for alignment */}
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => setCapturedImage(null)}
                            className="flex flex-col items-center text-white gap-1 active:scale-95 transition-transform"
                          >
                            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                              <FiRefreshCw size={24} />
                            </div>
                            <span className="text-xs mt-1">Retake</span>
                          </button>
                          
                          <button 
                            onClick={sendCapturedPhoto}
                            disabled={isUploading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-medium transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isUploading ? (
                              <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Sending...</span>
                              </>
                            ) : (
                              <>
                                <FiSend size={18} /> 
                                <span>Send Photo</span>
                              </>
                            )}
                          </button>
                          
                          <div className="w-12"></div>
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
                      disabled={isUploading || isSending}
                    />

                    {/* Action Buttons */}
                    <div className="flex gap-1 pb-1">
                      <button
                        onClick={startCamera}
                        disabled={isUploading || isSending}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Take Photo"
                      >
                        <FiCamera size={20} />
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || isSending}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              )}
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
            className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
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
    </>
  );
}