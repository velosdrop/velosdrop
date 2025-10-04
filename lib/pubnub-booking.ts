// lib/pubnub-booking.ts
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

// Booking request message
export interface BookingRequestMessage extends PubNubMessage {
  type: typeof MESSAGE_TYPES.BOOKING_REQUEST;
  data: {
    bookingId: number;
    customerId: number;
    customerUsername: string;
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
  return pubnub; // Return the shared instance
};

// Publish functions
export const publishBookingRequest = async (
  driverIds: number[],
  bookingData: BookingRequestMessage['data']
) => {
  const message: PubNubPublishMessage = {
    type: MESSAGE_TYPES.BOOKING_REQUEST,
    data: bookingData,
  };

  try {
    // Publish to specific driver channels for direct assignments
    if (bookingData.isDirectAssignment && driverIds.length === 1) {
      await pubnub.publish({
        channel: CHANNELS.driver(driverIds[0]),
        message,
      });
    } else {
      // Broadcast to all specified drivers
      const publishPromises = driverIds.map(driverId =>
        pubnub.publish({
          channel: CHANNELS.driver(driverId),
          message,
        })
      );
      await Promise.all(publishPromises);
    }

    console.log(`Booking request published to ${driverIds.length} drivers`);
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
    // Use a single, predictable channel for all driver locations
    await pubnub.publish({
      channel: CHANNELS.driverLocations,
      message,
    });

    console.log(`Driver location update published for driver ${driverId}`);
    return { success: true };
  } catch (error) {
    console.error('Error publishing driver location:', error);
    // Don't throw the error - just return failure
    return { success: false, error };
  }
};