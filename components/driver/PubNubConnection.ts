// components/driver/usePubNubConnection.ts - Custom hook
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPubNubClient, CHANNELS, MESSAGE_TYPES } from '@/lib/pubnub-booking';

export function usePubNubConnection(
  driverId: number | undefined,
  isOnline: boolean,
  setBookingRequest: React.Dispatch<React.SetStateAction<any>>,
  setHasNewNotification: React.Dispatch<React.SetStateAction<boolean>>,
  setBookingRequests: React.Dispatch<React.SetStateAction<any[]>>
) {
  const [isConnected, setIsConnected] = useState(false);
  const pubnubRef = useRef<any>(null);
  const listenerRef = useRef<any>(null);

  const setupPubNubConnection = useCallback(() => {
    if (!isOnline || !driverId) {
      setIsConnected(false);
      return;
    }

    // Clean up existing connection
    if (pubnubRef.current && listenerRef.current) {
      pubnubRef.current.removeListener(listenerRef.current);
      pubnubRef.current.unsubscribeAll();
    }

    console.log('🚀 Setting up PubNub connection for driver:', driverId);

    try {
      // Create PubNub client for this driver
      pubnubRef.current = createPubNubClient(`driver_${driverId}`);
      
      // Set up message listener
      listenerRef.current = {
        message: (event: any) => {
          console.log('PubNub message received:', event);
          
          const { channel, message } = event;
          
          if (message.type === MESSAGE_TYPES.BOOKING_REQUEST) {
            console.log('🎯 Received booking request:', message);
            
            // FIX: Map bookingId to id and ensure all required fields are present
            const newRequest = {
              id: message.data.bookingId, // Map bookingId to id for component compatibility
              bookingId: message.data.bookingId, // Keep original for reference
              customerId: message.data.customerId,
              customerUsername: message.data.customerUsername,
              customerProfilePictureUrl: message.data.customerProfilePictureUrl,
              customerPhoneNumber: message.data.customerPhoneNumber,
              pickupLocation: message.data.pickupLocation,
              dropoffLocation: message.data.dropoffLocation,
              fare: message.data.fare,
              distance: message.data.distance,
              expiresIn: Math.max(0, Math.floor((new Date(message.data.expiresAt).getTime() - Date.now()) / 1000)),
              createdAt: new Date().toISOString(),
              packageDetails: message.data.packageDetails,
              isDirectAssignment: message.data.isDirectAssignment || false,
              status: 'pending'
            };

            console.log('📦 Processed booking request for notification:', newRequest);

            // Update state
            setBookingRequest(newRequest);
            setHasNewNotification(true);
            setBookingRequests(prev => [newRequest, ...prev]);

            // Auto-dismiss popup after 30 seconds
            setTimeout(() => {
              setBookingRequest(null);
              setHasNewNotification(false);
            }, 30000);
          }
        },
        status: (event: any) => {
          console.log('PubNub status:', event);
          if (event.category === 'PNConnectedCategory') {
            console.log('✅ PubNub connected successfully');
            setIsConnected(true);
          } else if (event.category === 'PNDisconnectedCategory') {
            console.log('❌ PubNub disconnected');
            setIsConnected(false);
          } else if (event.category === 'PNNetworkDownCategory') {
            console.log('🌐 Network connectivity issues');
            setIsConnected(false);
          } else if (event.category === 'PNNetworkUpCategory') {
            console.log('🌐 Network restored');
            setIsConnected(true);
          }
        },
        presence: (event: any) => {
          console.log('Presence event:', event);
          // Handle driver online/offline status if needed
        }
      };

      pubnubRef.current.addListener(listenerRef.current);

      // Subscribe to driver channel
      pubnubRef.current.subscribe({
        channels: [CHANNELS.driver(driverId)],
        withPresence: true
      });

      console.log('✅ PubNub connection established for driver:', driverId);
      setIsConnected(true);

    } catch (error) {
      console.error('Failed to create PubNub connection:', error);
      setIsConnected(false);
    }
  }, [driverId, isOnline, setBookingRequest, setHasNewNotification, setBookingRequests]);

  useEffect(() => {
    setupPubNubConnection();

    return () => {
      // Cleanup on unmount
      if (pubnubRef.current && listenerRef.current) {
        console.log('🧹 Cleaning up PubNub connection for driver:', driverId);
        pubnubRef.current.removeListener(listenerRef.current);
        pubnubRef.current.unsubscribeAll();
      }
      setIsConnected(false);
    };
  }, [setupPubNubConnection]);

  return { isConnected };
}