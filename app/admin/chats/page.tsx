//app/admin/chats/page.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  MessageSquare, 
  User, 
  Car, 
  Package, 
  Image as ImageIcon,
  Calendar,
  Clock,
  ChevronRight,
  Download,
  Filter,
  Eye,
  RefreshCw,
  X,
  MapPin,
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react';
import { getPubNubInstance } from '@/lib/pubnub-booking';

// Type definitions
interface ChatParticipant {
  id: number;
  type: 'customer' | 'driver';
  name: string;
  phoneNumber: string;
  profilePictureUrl?: string;
}

interface ChatMessage {
  id: number;
  deliveryId: number;
  senderType: 'customer' | 'driver' | 'system';
  senderId: number;
  senderName: string;
  messageType: 'text' | 'image' | 'status_update' | 'location';
  content: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  deliveryDetails?: {
    pickupLocation: string;
    dropoffLocation: string;
    status: string;
    fare: number;
  };
}

interface DeliveryChat {
  id: number;
  deliveryId: number;
  customer: ChatParticipant;
  driver?: ChatParticipant;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messageCount: number;
  status: string;
}

export default function AdminChatsPage() {
  const [chats, setChats] = useState<DeliveryChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<DeliveryChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pubnub = getPubNubInstance();

  // Load all chat conversations
  const loadChats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/chats');
      const data = await response.json();
      
      if (data.success) {
        setChats(data.chats);
        if (data.chats.length > 0 && !selectedChat) {
          setSelectedChat(data.chats[0]);
          loadMessages(data.chats[0].deliveryId);
        }
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load messages for a specific delivery
  const loadMessages = async (deliveryId: number) => {
    try {
      const response = await fetch(`/api/admin/chats/${deliveryId}/messages`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Subscribe to real-time messages
  const subscribeToChats = () => {
    // Subscribe to all delivery channels for real-time monitoring
    chats.forEach(chat => {
      const channel = `delivery_${chat.deliveryId}_admin`;
      
      pubnub.subscribe({
        channels: [channel],
      });
      
      // Listen for new messages
      pubnub.addListener({
        message: (event: any) => {
          if (event.message.type === 'CHAT_MESSAGE' || event.message.type === 'new_message') {
            const newMessage: ChatMessage = {
              id: Date.now(), // Temporary ID, will be replaced by database ID
              deliveryId: chat.deliveryId,
              senderType: event.message.data.senderType,
              senderId: event.message.data.senderId,
              senderName: event.message.data.senderName,
              messageType: event.message.data.messageType,
              content: event.message.data.content,
              imageUrl: event.message.data.imageUrl,
              metadata: event.message.data.metadata,
              isRead: false,
              createdAt: new Date().toISOString(),
            };
            
            // Add message to state
            setMessages(prev => [...prev, newMessage]);
            
            // Update chat list
            setChats(prev => prev.map(c => {
              if (c.deliveryId === chat.deliveryId) {
                return {
                  ...c,
                  lastMessage: newMessage.content.substring(0, 50),
                  lastMessageTime: new Date().toISOString(),
                  unreadCount: c.unreadCount + 1,
                  messageCount: c.messageCount + 1
                };
              }
              return c;
            }));
          }
        }
      });
    });
  };

  // Mark messages as read
  const markMessagesAsRead = async (deliveryId: number) => {
    try {
      await fetch(`/api/admin/chats/${deliveryId}/read`, {
        method: 'POST'
      });
      
      // Update local state
      setChats(prev => prev.map(chat => 
        chat.deliveryId === deliveryId 
          ? { ...chat, unreadCount: 0 }
          : chat
      ));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  useEffect(() => {
    loadChats();
    
    // Set up real-time subscription when chats are loaded
    if (chats.length > 0) {
      subscribeToChats();
    }
    
    return () => {
      // Unsubscribe from all channels
      pubnub.unsubscribeAll();
    };
  }, [chats.length]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.deliveryId);
      markMessagesAsRead(selectedChat.deliveryId);
    }
  }, [selectedChat]);

  const filteredChats = chats.filter(chat => {
    const matchesSearch = 
      chat.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.driver?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || chat.status === filterStatus;
    
    const chatDate = new Date(chat.lastMessageTime);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);
    
    const matchesDate = chatDate >= startDate && chatDate <= endDate;
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const exportChat = async () => {
    if (!selectedChat) return;
    
    try {
      const response = await fetch(`/api/admin/chats/${selectedChat.deliveryId}/export`);
      const data = await response.json();
      
      if (data.success && data.chatData) {
        const chatData = JSON.stringify(data.chatData, null, 2);
        const blob = new Blob([chatData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-delivery-${selectedChat.deliveryId}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting chat:', error);
    }
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="border-b border-purple-500/20 bg-gray-800/50 backdrop-blur-sm">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                Chat Monitoring
              </h1>
              <p className="text-purple-300 text-lg">
                Monitor all customer-driver conversations in real-time
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadChats}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-800 rounded-xl border border-purple-500/20 text-purple-300 hover:border-purple-500/40 hover:text-purple-200 transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              {selectedChat && (
                <button
                  onClick={exportChat}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 rounded-xl text-white hover:bg-purple-700 transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Chat</span>
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
              <input
                type="text"
                placeholder="Search chats by customer, driver, or message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-purple-500/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all duration-200"
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-purple-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-gray-700/50 border border-purple-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all duration-200"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 flex-1">
                <Calendar className="w-5 h-5 text-purple-400" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-gray-700/50 border border-purple-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all duration-200"
                />
                <span className="text-purple-300">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-gray-700/50 border border-purple-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all duration-200"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat List */}
        <div className="w-full md:w-1/3 border-r border-purple-500/20 bg-gray-800/30 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
              <p className="text-purple-300 mt-4">Loading chats...</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-purple-400 mx-auto mb-4 opacity-50" />
              <p className="text-purple-300">No chat conversations found</p>
              <p className="text-purple-400 text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-purple-500/10">
              {filteredChats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`w-full p-4 text-left transition-all duration-200 hover:bg-gray-700/30 ${
                    selectedChat?.id === chat.id ? 'bg-gray-700/50 border-l-4 border-purple-500' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            chat.status === 'completed' ? 'bg-emerald-500' :
                            chat.status === 'in_progress' ? 'bg-blue-500' :
                            chat.status === 'pending' ? 'bg-amber-500' :
                            'bg-gray-500'
                          }`}></div>
                          <span className="text-white font-medium">
                            Delivery #{chat.deliveryId}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {chat.unreadCount > 0 && (
                            <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                              {chat.unreadCount}
                            </span>
                          )}
                          <span className="text-purple-400 text-sm">
                            {formatTime(chat.lastMessageTime)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <User className="w-4 h-4 text-cyan-400" />
                          <span className="text-cyan-300">{chat.customer.name}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-purple-400" />
                        <div className="flex items-center space-x-2 text-sm">
                          <Car className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-300">
                            {chat.driver ? chat.driver.name : 'No driver assigned'}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-purple-300 text-sm truncate">
                        {chat.lastMessage}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-4 text-xs text-purple-400">
                          <span className="flex items-center space-x-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>{chat.messageCount} messages</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Package className="w-3 h-3" />
                            <span className="capitalize">{chat.status}</span>
                          </span>
                        </div>
                        <Eye className="w-4 h-4 text-purple-400" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="border-b border-purple-500/20 p-4 bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-purple-500/20 rounded-xl">
                      <MessageSquare className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        Delivery #{selectedChat.deliveryId}
                      </h2>
                      <div className="flex items-center space-x-4 text-sm text-purple-300">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>{selectedChat.customer.name}</span>
                          <span className="text-purple-400">•</span>
                          <span>{selectedChat.customer.phoneNumber}</span>
                        </div>
                        {selectedChat.driver && (
                          <>
                            <ChevronRight className="w-4 h-4" />
                            <div className="flex items-center space-x-2">
                              <Car className="w-4 h-4" />
                              <span>{selectedChat.driver.name}</span>
                              <span className="text-purple-400">•</span>
                              <span>{selectedChat.driver.phoneNumber}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedChat.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                      selectedChat.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                      selectedChat.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {selectedChat.status}
                    </span>
                    <button
                      onClick={exportChat}
                      className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors duration-200"
                      title="Export chat"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 text-purple-400 mx-auto mb-4 opacity-50" />
                      <p className="text-purple-300">No messages yet</p>
                      <p className="text-purple-400 text-sm mt-2">Messages will appear here in real-time</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-center">
                      <span className="inline-block px-4 py-2 bg-gray-700/50 text-purple-300 text-sm rounded-full">
                        Chat started
                      </span>
                    </div>
                    
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderType === 'customer' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-lg rounded-2xl p-4 ${
                            message.senderType === 'customer'
                              ? 'bg-gray-700/50 border border-cyan-500/20'
                              : message.senderType === 'driver'
                              ? 'bg-gray-800/50 border border-blue-500/20'
                              : 'bg-purple-500/10 border border-purple-500/20'
                          }`}
                        >
                          {/* Message Header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                message.senderType === 'customer' ? 'bg-cyan-500' :
                                message.senderType === 'driver' ? 'bg-blue-500' :
                                'bg-purple-500'
                              }`}></div>
                              <span className={`text-sm font-medium ${
                                message.senderType === 'customer' ? 'text-cyan-300' :
                                message.senderType === 'driver' ? 'text-blue-300' :
                                'text-purple-300'
                              }`}>
                                {message.senderName}
                              </span>
                              <span className="text-gray-400 text-xs">
                                {message.senderType === 'customer' ? 'Customer' :
                                 message.senderType === 'driver' ? 'Driver' : 'System'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-purple-400 text-xs">
                                {new Date(message.createdAt).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                              {!message.isRead && (
                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                              )}
                            </div>
                          </div>

                          {/* Message Content */}
                          {message.messageType === 'text' && (
                            <p className="text-white">{message.content}</p>
                          )}
                          
                          {message.messageType === 'image' && message.imageUrl && (
                            <div className="space-y-2">
                              <div className="relative rounded-lg overflow-hidden bg-black/20">
                                <img
                                  src={message.imageUrl}
                                  alt="Chat image"
                                  className="max-w-full max-h-64 object-contain"
                                  onError={(e) => {
                                    e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%232d3748"/><text x="200" y="150" font-family="Arial" font-size="20" fill="%239f7aea" text-anchor="middle">Image not available</text></svg>';
                                  }}
                                />
                                <div className="absolute bottom-2 right-2 bg-black/50 px-2 py-1 rounded text-xs text-white flex items-center space-x-1">
                                  <ImageIcon className="w-3 h-3" />
                                  <span>Image</span>
                                </div>
                              </div>
                              {message.content && (
                                <p className="text-white text-sm mt-2">{message.content}</p>
                              )}
                            </div>
                          )}
                          
                          {message.messageType === 'location' && message.metadata && (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2 text-blue-300">
                                <MapPin className="w-4 h-4" />
                                <span className="font-medium">Location Shared</span>
                              </div>
                              <div className="bg-gray-900/50 p-3 rounded-lg">
                                <div className="text-sm text-gray-300">
                                  <div>Latitude: {message.metadata.latitude}</div>
                                  <div>Longitude: {message.metadata.longitude}</div>
                                  {message.metadata.address && (
                                    <div className="mt-2 text-xs text-gray-400">
                                      {message.metadata.address}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <a
                                href={`https://maps.google.com/?q=${message.metadata.latitude},${message.metadata.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300"
                              >
                                <span>View on Google Maps</span>
                                <ChevronRight className="w-4 h-4" />
                              </a>
                            </div>
                          )}
                          
                          {message.messageType === 'status_update' && (
                            <div className="flex items-center space-x-2 text-amber-300">
                              <AlertCircle className="w-4 h-4" />
                              <span className="font-medium">Status Update:</span>
                              <span>{message.content}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Real-time Indicator */}
              <div className="border-t border-purple-500/20 p-3 bg-gray-800/50">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-emerald-400 text-sm">Connected - receiving real-time updates</span>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-purple-400 mx-auto mb-6 opacity-50" />
                <h3 className="text-2xl font-bold text-white mb-2">Select a Chat</h3>
                <p className="text-purple-300 max-w-md">
                  Choose a conversation from the list to monitor customer-driver communications in real-time.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}