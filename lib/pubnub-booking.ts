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
  
  // Add the missing message types for driver notifications
  REQUEST_ACCEPTED: 'request_accepted',
  REQUEST_REBROADCAST: 'request_rebroadcast',
} as const;

// PubNub message interface
export interface PubNubMessage {
  type: string;
  data: any;
  timestamp: number;
  senderId: string;
  [key: string]: any; // Index signature
}

// Type for publishing messages
export type PubNubPublishMessage = Omit<PubNubMessage, 'timestamp' | 'senderId'> & {
  [key: string]: any;
};

// Booking request message - UPDATED: Add recipientPhoneNumber to the interface
export interface BookingRequestMessage extends PubNubMessage {
  type: typeof MESSAGE_TYPES.BOOKING_REQUEST;
  data: {
    bookingId: number;
    customerId: number;
    customerUsername: string;
    customerProfilePictureUrl: string;
    customerPhoneNumber?: string;
    recipientPhoneNumber?: string;
    pickupLocation: string;
    dropoffLocation: string;
    fare: number;
    distance: number;
    packageDetails?: string;
    expiresAt: string;
    isDirectAssignment?: boolean;
  };
}

// Booking response message
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
  };
}

// Create PubNub client instance
export const createPubNubClient = (userId: string) => {
  return pubnub;
};

// Export the getPubNubInstance function that was missing
export const getPubNubInstance = () => {
  return pubnub;
};

// Publish functions - UPDATED: Ensure recipientPhoneNumber is included in published data
export const publishBookingRequest = async (
  driverIds: number[],
  bookingData: BookingRequestMessage['data']
) => {
  const message: PubNubPublishMessage = {
    type: MESSAGE_TYPES.BOOKING_REQUEST,
    data: {
      ...bookingData,
      recipientPhoneNumber: bookingData.recipientPhoneNumber || ''
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
      recipientPhoneNumber: bookingData.recipientPhoneNumber,
      bookingData: bookingData
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

// NEW: Enhanced driver location update with order context
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
      orderId, // Add orderId to the context
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

// Additional publish functions for driver notifications
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

// Helper function to publish request accepted notification to other drivers
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

// Helper function to publish request rebroadcast notification
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