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
            
            const newRequest = {
              ...message.data,
              status: 'pending',
              expiresIn: Math.max(0, Math.floor((new Date(message.data.expiresAt).getTime() - Date.now()) / 1000))
            };

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
            setIsConnected(true);
          } else if (event.category === 'PNDisconnectedCategory') {
            setIsConnected(false);
          }
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
        pubnubRef.current.removeListener(listenerRef.current);
        pubnubRef.current.unsubscribeAll();
      }
      setIsConnected(false);
    };
  }, [setupPubNubConnection]);

  return { isConnected };
}