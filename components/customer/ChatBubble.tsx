//components/customer/ChatBubble.tsx
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FiMessageSquare, FiX, FiImage, FiSend, FiCheckCircle, 
  FiMapPin, FiClock, FiPaperclip, FiSmile, FiMoreVertical,
  FiCamera, FiMic, FiMoreHorizontal
} from 'react-icons/fi';
import { 
  FaTruck, FaMapMarkerAlt, FaCheckCircle, FaExclamationTriangle,
  FaRegSmile, FaRegImage, FaRegPaperPlane
} from 'react-icons/fa';
import { MdCameraAlt, MdCameraRoll, MdAttachFile } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import { createPubNubClient } from '@/lib/pubnub-booking';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface CustomerChatBubbleProps {
  customerId: number;
  deliveryId: number;
  driverId: number;
  onSendImage?: (file: File) => Promise<string>;
}

interface Message {
  id?: number;
  deliveryId: number;
  senderType: 'driver' | 'customer' | 'system';
  senderId: number;
  messageType: 'text' | 'image' | 'status_update' | 'location' | 'voice';
  content: string;
  imageUrl?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export default function CustomerChatBubble({ customerId, deliveryId, driverId, onSendImage }: CustomerChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pubnub, setPubnub] = useState<any>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize PubNub
  useEffect(() => {
    if (customerId && deliveryId) {
      const pubnubClient = createPubNubClient(`customer_${customerId}`);
      setPubnub(pubnubClient);
      
      // Subscribe to delivery chat channel
      const channel = `delivery_${deliveryId}`;
      
      const listener = {
        message: (event: any) => {
          console.log('📨 Customer chat message received:', event);
          
          if (event.channel === channel && event.message.type === 'CHAT_MESSAGE') {
            const newMessage = event.message.data;
            
            // Only add if not already in messages
            setMessages(prev => {
              const exists = prev.some(m => 
                m.createdAt === newMessage.createdAt && 
                m.content === newMessage.content &&
                m.senderId === newMessage.senderId
              );
              
              if (!exists) {
                return [...prev, newMessage];
              }
              return prev;
            });
            
            // Mark as read if from driver
            if (newMessage.senderType === 'driver') {
              markMessageAsRead(newMessage);
            }
          }
        },
        status: (event: any) => {
          console.log('📡 Customer chat PubNub status:', event.category);
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
  }, [customerId, deliveryId]);

  // Fetch driver info
  useEffect(() => {
    if (driverId) {
      fetchDriverInfo();
    }
  }, [driverId]);

  const fetchDriverInfo = async () => {
    try {
      const response = await fetch(`/api/drivers/${driverId}`);
      if (response.ok) {
        const data = await response.json();
        setDriverInfo(data.driver);
      }
    } catch (error) {
      console.error('Error fetching driver info:', error);
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [cameraStream]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [messages, isOpen]);

  // Load chat history
  useEffect(() => {
    if (isOpen && deliveryId) {
      loadChatHistory();
    }
  }, [isOpen, deliveryId]);

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
          readerId: customerId,
          readerType: 'customer'
        }),
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendMessage = useCallback(async (content: string, type: Message['messageType'] = 'text', imageUrl?: string) => {
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
          message: {
            type: 'CHAT_MESSAGE',
            data: savedMessage
          }
        });

        // Also send to driver's personal channel
        await pubnub.publish({
          channel: `driver_${driverId}_chat`,
          message: {
            type: 'NEW_MESSAGE',
            data: {
              ...savedMessage,
              deliveryId,
              customerId,
              isFromCustomer: true
            }
          }
        });

        // Update local state
        setMessages(prev => [...prev, savedMessage]);
        setMessage('');
        setCapturedPhoto(null);
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setIsUploading(true);
    try {
      let imageUrl;
      if (onSendImage) {
        imageUrl = await onSendImage(file);
      } else {
        // Fallback to local URL
        imageUrl = URL.createObjectURL(file);
      }
      await sendMessage('Photo', 'image', imageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      setShowAttachmentMenu(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false 
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      setShowAttachmentMenu(false);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please check permissions.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photoDataUrl = canvas.toDataURL('image/jpeg');
        setCapturedPhoto(photoDataUrl);
        
        // Stop camera stream
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
        }
        setIsCameraOpen(false);
      }
    }
  };

  const uploadCapturedPhoto = async () => {
    if (!capturedPhoto) return;

    setIsUploading(true);
    try {
      // Convert data URL to blob
      const response = await fetch(capturedPhoto);
      const blob = await response.blob();
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      let imageUrl;
      if (onSendImage) {
        imageUrl = await onSendImage(file);
      } else {
        imageUrl = capturedPhoto;
      }
      
      await sendMessage('Photo', 'image', imageUrl);
    } catch (error) {
      console.error('Error uploading captured photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setIsUploading(false);
      setCapturedPhoto(null);
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    setShowAttachmentMenu(false);
  };

  const stopRecording = () => {
    setIsRecording(false);
    // In a real app, you would send the voice message here
    alert('Voice recording would be sent here');
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
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

  const unreadCount = messages.filter(m => !m.isRead && m.senderType === 'driver').length;

  return (
    <>
      {/* Floating Chat Button */}
      <motion.button
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        whileHover={{ 
          scale: 1.1, 
          rotate: 5,
          boxShadow: "0 20px 60px -15px rgba(147, 51, 234, 0.8)"
        }}
        whileTap={{ scale: 0.95 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 20
        }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-br from-purple-600 via-purple-500 to-blue-500 text-white p-4 rounded-2xl shadow-2xl shadow-purple-900/40 flex items-center justify-center transition-all duration-300 group"
      >
        <div className="relative">
          <FiMessageSquare size={24} className="transform group-hover:scale-110 transition-transform" />
          
          {/* Animated pulse effect */}
          <motion.div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400 to-blue-400 opacity-20"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Unread count badge */}
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 min-w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold px-1.5 shadow-lg shadow-red-500/30"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </div>
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Main Chat Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25
              }}
              className="fixed bottom-20 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
              style={{
                maxHeight: 'calc(100vh - 140px)',
                height: '560px'
              }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
                      whileHover={{ rotate: 15 }}
                    >
                      <FiMessageSquare size={20} />
                    </motion.div>
                    <div>
                      <h3 className="font-bold text-lg">Chat with Driver</h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-purple-100 opacity-90">
                          {driverInfo ? `${driverInfo.firstName} ${driverInfo.lastName}` : 'Driver'}
                        </span>
                        <span className="w-1 h-1 bg-white/60 rounded-full"></span>
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <FiX size={20} />
                  </motion.button>
                </div>
              </div>

              {/* Messages Container */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-gray-100"
                style={{
                  height: 'calc(560px - 200px)',
                  minHeight: '280px'
                }}
              >
                {messages.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-full flex flex-col items-center justify-center text-gray-400"
                  >
                    <div className="w-20 h-20 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mb-4">
                      <FiMessageSquare size={32} className="text-purple-400" />
                    </div>
                    <p className="text-gray-500 font-medium text-center">No messages yet</p>
                    <p className="text-sm text-gray-400 mt-1 text-center">Start the conversation with your driver</p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                      <div key={date}>
                        {/* Date separator */}
                        <div className="flex items-center justify-center my-4">
                          <div className="flex-1 h-px bg-gray-300"></div>
                          <span className="mx-3 text-xs text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
                            {date}
                          </span>
                          <div className="flex-1 h-px bg-gray-300"></div>
                        </div>
                        
                        {/* Messages for this date */}
                        {dateMessages.map((msg, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`flex ${msg.senderType === 'customer' ? 'justify-end' : 'justify-start'} mb-3`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl p-3 relative ${
                                msg.senderType === 'customer'
                                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-br-none'
                                  : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                              }`}
                            >
                              {/* Sender indicator */}
                              <div className="flex items-center mb-1">
                                <span className="text-xs font-medium opacity-90">
                                  {msg.senderType === 'customer' ? 'You' : 'Driver'}
                                </span>
                              </div>
                              
                              {/* Message content */}
                              {msg.messageType === 'image' ? (
                                <div className="mb-2">
                                  <img
                                    src={msg.imageUrl}
                                    alt="Photo"
                                    className="rounded-lg max-w-full h-auto max-h-48 object-cover"
                                    loading="lazy"
                                  />
                                  <p className="text-sm mt-1 opacity-90">{msg.content}</p>
                                </div>
                              ) : (
                                <p className="text-sm">{msg.content}</p>
                              )}
                              
                              {/* Time and status */}
                              <div className={`text-xs mt-1 flex items-center justify-between ${
                                msg.senderType === 'customer' ? 'text-purple-200' : 'text-gray-500'
                              }`}>
                                <span>{formatTime(msg.createdAt)}</span>
                                {msg.senderType === 'driver' && !msg.isRead && (
                                  <span className="ml-2 text-xs text-purple-300">● New</span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Camera Preview Modal */}
              <AnimatePresence>
                {(isCameraOpen || capturedPhoto) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black z-50"
                  >
                    {isCameraOpen && (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-4">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              if (cameraStream) {
                                cameraStream.getTracks().forEach(track => track.stop());
                                setCameraStream(null);
                              }
                              setIsCameraOpen(false);
                            }}
                            className="px-4 py-2 bg-red-500 text-white rounded-full"
                          >
                            Cancel
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={capturePhoto}
                            className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl"
                          >
                            <div className="w-14 h-14 bg-white border-4 border-gray-300 rounded-full"></div>
                          </motion.button>
                        </div>
                      </>
                    )}
                    
                    {capturedPhoto && (
                      <div className="relative h-full">
                        <img
                          src={capturedPhoto}
                          alt="Captured"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-4">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setCapturedPhoto(null)}
                            className="px-4 py-2 bg-gray-600 text-white rounded-full"
                          >
                            Retake
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={uploadCapturedPhoto}
                            disabled={isUploading}
                            className="px-4 py-2 bg-green-500 text-white rounded-full disabled:opacity-50"
                          >
                            {isUploading ? 'Uploading...' : 'Send Photo'}
                          </motion.button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Voice Recording UI */}
              <AnimatePresence>
                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute inset-x-0 bottom-20 bg-red-500 text-white p-4 mx-4 rounded-xl shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center">
                          <FiMic size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-medium">Recording...</div>
                          <div className="text-xs opacity-90">{formatRecordingTime(recordingTime)}</div>
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={stopRecording}
                        className="px-4 py-2 bg-white text-red-500 rounded-full text-sm font-medium"
                      >
                        Send
                      </motion.button>
                    </div>
                    {/* Recording animation */}
                    <div className="mt-3 flex space-x-1">
                      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <motion.div
                          key={i}
                          className="flex-1 bg-white/40 rounded"
                          animate={{
                            height: [5, 20, 5],
                          }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            delay: i * 0.1,
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Attachment Menu */}
              <AnimatePresence>
                {showAttachmentMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-20 left-4 right-4 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="grid grid-cols-3 gap-4">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={startCamera}
                          className="flex flex-col items-center justify-center p-4 hover:bg-purple-50 rounded-xl transition-colors"
                        >
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                            <MdCameraAlt size={24} className="text-blue-600" />
                          </div>
                          <span className="text-xs font-medium text-gray-700">Camera</span>
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => fileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center p-4 hover:bg-purple-50 rounded-xl transition-colors"
                        >
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                            <MdCameraRoll size={24} className="text-green-600" />
                          </div>
                          <span className="text-xs font-medium text-gray-700">Gallery</span>
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={startRecording}
                          className="flex flex-col items-center justify-center p-4 hover:bg-purple-50 rounded-xl transition-colors"
                        >
                          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
                            <FiMic size={24} className="text-red-600" />
                          </div>
                          <span className="text-xs font-medium text-gray-700">Voice</span>
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {}}
                          className="flex flex-col items-center justify-center p-4 hover:bg-purple-50 rounded-xl transition-colors"
                        >
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                            <MdAttachFile size={24} className="text-purple-600" />
                          </div>
                          <span className="text-xs font-medium text-gray-700">Document</span>
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {}}
                          className="flex flex-col items-center justify-center p-4 hover:bg-purple-50 rounded-xl transition-colors"
                        >
                          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-2">
                            <FiMapPin size={24} className="text-amber-600" />
                          </div>
                          <span className="text-xs font-medium text-gray-700">Location</span>
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowEmojiPicker(true)}
                          className="flex flex-col items-center justify-center p-4 hover:bg-purple-50 rounded-xl transition-colors"
                        >
                          <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-2">
                            <FaRegSmile size={24} className="text-pink-600" />
                          </div>
                          <span className="text-xs font-medium text-gray-700">Emoji</span>
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Emoji Picker */}
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-20 right-0 z-50"
                  >
                    <div className="relative">
                      <EmojiPicker
                        onEmojiClick={handleEmojiClick}
                        width={350}
                        height={400}
                      />
                      <button
                        onClick={() => setShowEmojiPicker(false)}
                        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                      >
                        <FiX size={20} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Message Input Area */}
              <div className="p-3 border-t border-gray-200 bg-white">
                <div className="flex items-center space-x-2">
                  {/* Attachment button */}
                  <motion.button
                    whileHover={{ rotate: 15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                    className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
                    title="Attach"
                  >
                    <FiPaperclip size={22} />
                  </motion.button>

                  {/* Hidden file inputs */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {/* Message input */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Type a message..."
                      disabled={isSending}
                      className="w-full px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all disabled:opacity-50 placeholder-gray-400"
                    />
                    {message.length === 0 && (
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <FaRegSmile size={20} />
                      </button>
                    )}
                  </div>

                  {/* Send button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    disabled={!message.trim() || isSending}
                    className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    {isSending ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : (
                      <FaRegPaperPlane size={18} />
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}