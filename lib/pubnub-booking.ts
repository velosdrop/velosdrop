//lib/pubnub-booking.ts
import { pubnub } from './pubnub';

// Channel naming conventions
export const CHANNELS = {
  // Customer channels
  customer: (customerId: number) => `customer_${customerId}`,

  // Driver channels
  driver: (driverId: number) => `driver_${driverId}`,

  // Broadcast channels
  driversNearby: (locationKey: string) => `drivers_nearby_${locationKey}`,

  // Booking specific channels
  booking: (bookingId: number) => `booking_${bookingId}`,
  
  // Location channels
  driverLocations: 'driver_locations',
  
  // General drivers broadcast channel
  drivers: 'drivers',

  // Admin monitoring channels
  admin: (adminId: number) => `admin_${adminId}`,
  deliveryAdmin: (deliveryId: number) => `delivery_${deliveryId}_admin`,
  adminChats: 'admin_chats_monitor',
} as const;

// Message types
export const MESSAGE_TYPES = {
  // Customer -> Drivers
  BOOKING_REQUEST: 'booking_request',

  // Driver -> Customer
  BOOKING_ACCEPTED: 'booking_accepted',
  BOOKING_REJECTED: 'booking_rejected',

  // System messages
  DRIVER_LOCATION_UPDATE: 'driver_location_update',
  BOOKING_STATUS_UPDATE: 'booking_status_update',
  DRIVER_ONLINE_STATUS: 'driver_online_status',

  // Chat messages
  CHAT_MESSAGE: 'chat_message',
  NEW_MESSAGE: 'new_message',
  MESSAGE_READ: 'message_read',
  
  // Driver notifications
  REQUEST_ACCEPTED: 'request_accepted',
  REQUEST_REBROADCAST: 'request_rebroadcast',
  
  // Admin monitoring
  ADMIN_MESSAGE_ALERT: 'admin_message_alert',
  DELIVERY_CHAT_UPDATE: 'delivery_chat_update',
  ADMIN_CHAT_NOTIFICATION: 'admin_chat_notification',
} as const;

// PubNub message interface
export interface PubNubMessage {
  type: string;
  data: any;
  timestamp: number;
  senderId: string;
  [key: string]: any;
}

// Type for publishing messages
export type PubNubPublishMessage = Omit<PubNubMessage, 'timestamp' | 'senderId'> & {
  [key: string]: any;
};

// Chat message interface for admin monitoring
export interface ChatMessageForAdmin {
  type: typeof MESSAGE_TYPES.CHAT_MESSAGE;
  data: {
    deliveryId: number;
    messageId: number;
    senderType: 'customer' | 'driver' | 'system';
    senderId: number;
    senderName: string;
    messageType: 'text' | 'image' | 'status_update' | 'location';
    content: string;
    imageUrl?: string;
    metadata?: Record<string, any>;
    isRead: boolean;
    createdAt: string;
  };
}

// UPDATED: Booking request message with separate address and coordinates
export interface BookingRequestMessage extends PubNubMessage {
  type: typeof MESSAGE_TYPES.BOOKING_REQUEST;
  data: {
    bookingId: number;
    customerId: number;
    customerUsername: string;
    customerProfilePictureUrl: string;
    customerPhoneNumber?: string;
    recipientPhoneNumber?: string;
    // UPDATED: Now includes separate address and coordinates
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    dropoffAddress: string;
    dropoffLatitude: number;
    dropoffLongitude: number;
    fare: number;
    distance: number;
    vehicleType?: string;
    packageDetails?: string;
    expiresAt: string;
    isDirectAssignment?: boolean;
  };
}

// UPDATED: Booking response message
export interface BookingResponseMessage extends PubNubMessage {
  type: typeof MESSAGE_TYPES.BOOKING_ACCEPTED | typeof MESSAGE_TYPES.BOOKING_REJECTED;
  data: {
    bookingId: number;
    driverId: number;
    driverName: string;
    driverPhone: string;
    vehicleType: string;
    carName: string;
    profilePictureUrl?: string;
    wasDirectAssignment?: boolean;
    expired?: boolean;
    rejected?: boolean;
    message?: string;
    requestedVehicleType?: string;
  };
}

// Create PubNub client instance
export const createPubNubClient = (userId: string) => {
  return pubnub;
};

// Export the getPubNubInstance function
export const getPubNubInstance = () => {
  return pubnub;
};

// UPDATED: Publish booking request with new address/coordinates schema
export const publishBookingRequest = async (
  driverIds: number[],
  bookingData: BookingRequestMessage['data']
) => {
  const message: PubNubPublishMessage = {
    type: MESSAGE_TYPES.BOOKING_REQUEST,
    data: {
      ...bookingData,
      recipientPhoneNumber: bookingData.recipientPhoneNumber || '',
      vehicleType: bookingData.vehicleType || 'car'
    },
  };

  try {
    if (bookingData.isDirectAssignment && driverIds.length === 1) {
      await pubnub.publish({
        channel: CHANNELS.driver(driverIds[0]),
        message,
      });
    } else {
      const publishPromises = driverIds.map(driverId =>
        pubnub.publish({
          channel: CHANNELS.driver(driverId),
          message,
        })
      );
      await Promise.all(publishPromises);
    }

    console.log(`Booking request published to ${driverIds.length} drivers`, {
      bookingId: bookingData.bookingId,
      pickupAddress: bookingData.pickupAddress,
      dropoffAddress: bookingData.dropoffAddress,
      vehicleType: bookingData.vehicleType,
    });
    return { success: true };
  } catch (error) {
    console.error('Error publishing booking request:', error);
    return { success: false, error };
  }
};

export const publishBookingResponse = async (
  customerId: number,
  responseData: BookingResponseMessage['data'],
  responseType: typeof MESSAGE_TYPES.BOOKING_ACCEPTED | typeof MESSAGE_TYPES.BOOKING_REJECTED
) => {
  const message: PubNubPublishMessage = {
    type: responseType,
    data: responseData,
  };

  try {
    await pubnub.publish({
      channel: CHANNELS.customer(customerId),
      message,
    });

    console.log(`Booking ${responseType} published to customer ${customerId}`);
    return { success: true };
  } catch (error) {
    console.error('Error publishing booking response:', error);
    return { success: false, error };
  }
};

export const publishDriverLocationUpdate = async (
  driverId: number,
  location: { latitude: number; longitude: number }
) => {
  const message: PubNubPublishMessage = {
    type: MESSAGE_TYPES.DRIVER_LOCATION_UPDATE,
    data: {
      driverId,
      location,
      timestamp: Date.now()
    },
  };

  try {
    await pubnub.publish({
      channel: CHANNELS.driverLocations,
      message,
    });

    console.log(`Driver location update published for driver ${driverId}`);
    return { success: true };
  } catch (error) {
    console.error('Error publishing driver location:', error);
    return { success: false, error };
  }
};

export const publishDriverLocationUpdateWithOrder = async (
  driverId: number,
  location: { latitude: number; longitude: number; heading?: number; speed?: number },
  orderId: number
) => {
  const message: PubNubPublishMessage = {
    type: MESSAGE_TYPES.DRIVER_LOCATION_UPDATE,
    data: {
      driverId,
      location,
      orderId,
      timestamp: Date.now()
    },
  };

  try {
    await pubnub.publish({
      channel: CHANNELS.driverLocations,
      message,
    });

    console.log(`Driver location update published for driver ${driverId}, order ${orderId}`);
    return { success: true };
  } catch (error) {
    console.error('Error publishing driver location with order context:', error);
    return { success: false, error };
  }
};

export const publishToDriversChannel = async (
  messageData: any,
  messageType: string
) => {
  const message: PubNubPublishMessage = {
    type: messageType,
    data: messageData,
  };

  try {
    await pubnub.publish({
      channel: CHANNELS.drivers,
      message,
    });

    console.log(`Message published to drivers channel: ${messageType}`);
    return { success: true };
  } catch (error) {
    console.error('Error publishing to drivers channel:', error);
    return { success: false, error };
  }
};

export const publishRequestAccepted = async (
  requestId: number,
  driverId: number
) => {
  return await publishToDriversChannel(
    {
      requestId,
      driverId,
      acceptedAt: new Date().toISOString()
    },
    MESSAGE_TYPES.REQUEST_ACCEPTED
  );
};

export const publishRequestRebroadcast = async (
  requestId: number,
  rejectedBy: number,
  availableFor: number
) => {
  return await publishToDriversChannel(
    {
      requestId,
      reason: 'driver_rejected',
      rejectedBy,
      availableFor
    },
    MESSAGE_TYPES.REQUEST_REBROADCAST
  );
};

export const forwardMessageToAdmin = async (
  deliveryId: number,
  messageData: {
    senderType: 'customer' | 'driver' | 'system';
    senderId: number;
    senderName: string;
    messageType: 'text' | 'image' | 'status_update' | 'location';
    content: string;
    imageUrl?: string;
    metadata?: Record<string, any>;
  }
) => {
  const message: PubNubPublishMessage = {
    type: MESSAGE_TYPES.ADMIN_MESSAGE_ALERT,
    data: {
      ...messageData,
      deliveryId,
      timestamp: Date.now()
    },
  };

  try {
    await pubnub.publish({
      channel: CHANNELS.deliveryAdmin(deliveryId),
      message,
    });

    await pubnub.publish({
      channel: CHANNELS.adminChats,
      message: {
        type: MESSAGE_TYPES.DELIVERY_CHAT_UPDATE,
        data: {
          deliveryId,
          messageType: messageData.messageType,
          senderType: messageData.senderType,
          senderName: messageData.senderName,
          contentPreview: messageData.content.substring(0, 100),
          timestamp: Date.now()
        }
      }
    });

    console.log(`Message forwarded to admin monitoring for delivery ${deliveryId}`);
    return { success: true };
  } catch (error) {
    console.error('Error forwarding message to admin:', error);
    return { success: false, error };
  }
};

export const notifyAdminAboutNewDeliveryChat = async (
  deliveryId: number,
  customerId: number,
  customerName: string,
  driverId?: number,
  driverName?: string
) => {
  const message: PubNubPublishMessage = {
    type: MESSAGE_TYPES.ADMIN_CHAT_NOTIFICATION,
    data: {
      deliveryId,
      customerId,
      customerName,
      driverId,
      driverName,
      timestamp: Date.now(),
      createdAt: new Date().toISOString()
    },
  };

  try {
    await pubnub.publish({
      channel: CHANNELS.adminChats,
      message,
    });

    console.log(`Admin notified about new delivery chat for delivery ${deliveryId}`);
    return { success: true };
  } catch (error) {
    console.error('Error notifying admin about new chat:', error);
    return { success: false, error };
  }
};

export const subscribeAdminToDeliveryChat = async (
  adminId: number,
  deliveryId: number
) => {
  try {
    await pubnub.subscribe({
      channels: [
        CHANNELS.deliveryAdmin(deliveryId),
        CHANNELS.adminChats
      ],
    });

    console.log(`Admin ${adminId} subscribed to delivery ${deliveryId} chat`);
    return { success: true };
  } catch (error) {
    console.error('Error subscribing admin to delivery chat:', error);
    return { success: false, error };
  }
};

export const unsubscribeAdminFromDeliveryChat = async (
  adminId: number,
  deliveryId: number
) => {
  try {
    await pubnub.unsubscribe({
      channels: [CHANNELS.deliveryAdmin(deliveryId)],
    });

    console.log(`Admin ${adminId} unsubscribed from delivery ${deliveryId} chat`);
    return { success: true };
  } catch (error) {
    console.error('Error unsubscribing admin from delivery chat:', error);
    return { success: false, error };
  }
};

export const publishSystemMessageToAdmin = async (
  adminId: number,
  message: string,
  data?: any
) => {
  const pubnubMessage: PubNubPublishMessage = {
    type: 'system_message',
    data: {
      message,
      ...data,
      timestamp: Date.now()
    },
  };

  try {
    await pubnub.publish({
      channel: CHANNELS.admin(adminId),
      message: pubnubMessage,
    });

    console.log(`System message published to admin ${adminId}`);
    return { success: true };
  } catch (error) {
    console.error('Error publishing system message to admin:', error);
    return { success: false, error };
  }
};

export const publishBookingStatusUpdate = async (
  orderId: number,
  status: string,
  driverId?: number
) => {
  const message: PubNubPublishMessage = {
    type: MESSAGE_TYPES.BOOKING_STATUS_UPDATE,
    data: {
      orderId,
      status,
      driverId,
      timestamp: Date.now()
    },
  };

  try {
    await pubnub.publish({
      channel: CHANNELS.booking(orderId),
      message,
    });

    console.log(`Booking status update published for order ${orderId}: ${status}`);
    return { success: true };
  } catch (error) {
    console.error('Error publishing booking status update:', error);
    return { success: false, error };
  }
};

export const getActiveDeliveryChats = async (): Promise<number[]> => {
  return [];
};

export const broadcastToAllAdmins = async (
  messageType: string,
  messageData: any
) => {
  const message: PubNubPublishMessage = {
    type: messageType,
    data: {
      ...messageData,
      timestamp: Date.now()
    },
  };

  try {
    await pubnub.publish({
      channel: CHANNELS.adminChats,
      message,
    });

    console.log(`Message broadcast to all admins: ${messageType}`);
    return { success: true };
  } catch (error) {
    console.error('Error broadcasting to admins:', error);
    return { success: false, error };
  }
};

export const formatChatMessageForAdmin = (
  messageId: number,
  deliveryId: number,
  senderType: 'customer' | 'driver' | 'system',
  senderId: number,
  senderName: string,
  messageType: 'text' | 'image' | 'status_update' | 'location',
  content: string,
  imageUrl?: string,
  metadata?: Record<string, any>
): ChatMessageForAdmin => {
  return {
    type: MESSAGE_TYPES.CHAT_MESSAGE,
    data: {
      deliveryId,
      messageId,
      senderType,
      senderId,
      senderName,
      messageType,
      content,
      imageUrl,
      metadata,
      isRead: false,
      createdAt: new Date().toISOString()
    }
  };
};

export const ADMIN_MESSAGE_TYPES = {
  ...MESSAGE_TYPES,
  SYSTEM_MESSAGE: 'system_message',
} as const;