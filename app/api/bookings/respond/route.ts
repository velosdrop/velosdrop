//app/api/bookings/respond/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { deliveryRequestsTable, driverResponsesTable, driversTable, customersTable, driverRatingsTable } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { publishBookingResponse, MESSAGE_TYPES, getPubNubInstance, publishRequestAccepted, publishRequestRebroadcast } from '@/lib/pubnub-booking';
import { getGeneralAreaFromCoordinates, getCachedAreaName, cacheAreaName } from '@/lib/location-utils';

//Function for the live feed
async function getGeneralArea(latitude: number, longitude: number): Promise<string> {
  // Use the new utility with real Zimbabwe data
  const areaName = await getGeneralAreaFromCoordinates(latitude, longitude);
  return areaName;
}

// NEW FUNCTION: Publish to Live Feed - FIXED TYPE ISSUE
const publishToLiveFeed = async (
  eventType: 'new_request' | 'request_accepted' | 'request_rejected' | 'delivery_completed',
  data: {
    requestId: number;
    generalArea: string;
    fare: number;
    customerInitial?: string;
    driverName?: string;
    pickupLatitude?: number;
    pickupLongitude?: number;
    status?: string;
  }
) => {
  try {
    const pubnub = getPubNubInstance();
    
    // FIX: Create properly typed message for PubNub
    const liveFeedMessage = {
      type: 'live_feed_update',
      data: JSON.stringify({
        eventType,
        requestId: data.requestId,
        generalArea: data.generalArea,
        fare: data.fare,
        customerInitial: data.customerInitial || '',
        driverName: data.driverName || '',
        timestamp: Date.now(),
        status: data.status || 'active',
        pickupZone: data.pickupLatitude && data.pickupLongitude ? {
          latitude: data.pickupLatitude,
          longitude: data.pickupLongitude,
          radius: 500
        } : null
      })
    };

    await pubnub.publish({
      channel: 'live_delivery_feed',
      message: liveFeedMessage
    });

    console.log(`✅ Live feed update published: ${eventType} for request #${data.requestId}`);
  } catch (error) {
    console.error('❌ Failed to publish to live feed:', error);
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, driverId, response, customerId } = body;

    console.log('📨 Processing driver response:', { requestId, driverId, response });

    if (!requestId || !driverId || !response) {
      console.error('❌ Missing required fields:', { requestId, driverId, response });
      return NextResponse.json(
        { error: 'Missing required fields: requestId, driverId, and response are required' },
        { status: 400 }
      );
    }

    if (!['accepted', 'rejected'].includes(response)) {
      console.error('❌ Invalid response type:', response);
      return NextResponse.json(
        { error: 'Invalid response type. Must be "accepted" or "rejected"' },
        { status: 400 }
      );
    }

    const parsedRequestId = Number(requestId);
    const parsedDriverId = Number(driverId);

    if (isNaN(parsedRequestId) || parsedRequestId <= 0) {
      console.error('❌ Invalid requestId:', requestId);
      return NextResponse.json(
        { error: 'Invalid request ID format' },
        { status: 400 }
      );
    }

    if (isNaN(parsedDriverId) || parsedDriverId <= 0) {
      console.error('❌ Invalid driverId:', driverId);
      return NextResponse.json(
        { error: 'Invalid driver ID format' },
        { status: 400 }
      );
    }

    const driver = await db.query.driversTable.findFirst({
      where: eq(driversTable.id, parsedDriverId)
    });

    if (!driver) {
      console.error('❌ Driver not found:', parsedDriverId);
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    if (!driver.isOnline) {
      console.error('❌ Driver is offline:', parsedDriverId);
      return NextResponse.json(
        { error: 'Driver is currently offline' },
        { status: 400 }
      );
    }

    const deliveryRequest = await db.query.deliveryRequestsTable.findFirst({
      where: eq(deliveryRequestsTable.id, parsedRequestId)
    });

    if (!deliveryRequest) {
      console.error('❌ Delivery request not found:', parsedRequestId);
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    if (deliveryRequest.status !== 'pending') {
      console.error('❌ Request already processed:', { requestId: parsedRequestId, status: deliveryRequest.status });
      return NextResponse.json(
        { error: `Request has already been ${deliveryRequest.status}` },
        { status: 400 }
      );
    }

    if (new Date(deliveryRequest.expiresAt) < new Date()) {
      console.error('❌ Request expired:', { requestId: parsedRequestId, expiresAt: deliveryRequest.expiresAt });
      
      await db.update(deliveryRequestsTable)
        .set({ status: 'expired' })
        .where(eq(deliveryRequestsTable.id, parsedRequestId));

      const generalArea = await getGeneralArea(
        deliveryRequest.pickupLatitude || 0,
        deliveryRequest.pickupLongitude || 0
      );
      
      // PUBLISH TO LIVE FEED: Request Expired
      await publishToLiveFeed('request_rejected', {
        requestId: parsedRequestId,
        generalArea,
        fare: deliveryRequest.fare,
        status: 'expired'
      });

      const expiredDriverData = {
        driverId: 0,
        driverName: 'System',
        driverPhone: '',
        vehicleType: '',
        carName: '',
        profilePictureUrl: '',
        wasDirectAssignment: false
      };

      const expiredData = {
        bookingId: parsedRequestId,
        ...expiredDriverData,
        expired: true,
        rejected: false,
        message: 'Request expired. No drivers accepted in time.',
        timestamp: new Date().toISOString()
      };

      try {
        await publishBookingResponse(deliveryRequest.customerId, expiredData, MESSAGE_TYPES.BOOKING_REJECTED);
        console.log('✅ Customer notified of expiration via PubNub');
      } catch (pubnubError) {
        console.error('❌ Failed to notify customer of expiration via PubNub:', pubnubError);
      }

      return NextResponse.json(
        { error: 'Request has expired' },
        { status: 400 }
      );
    }

    const existingResponse = await db.query.driverResponsesTable.findFirst({
      where: and(
        eq(driverResponsesTable.requestId, parsedRequestId),
        eq(driverResponsesTable.driverId, parsedDriverId)
      )
    });

    if (existingResponse) {
      console.error('❌ Driver already responded:', { requestId: parsedRequestId, driverId: parsedDriverId, existingResponse: existingResponse.response });
      return NextResponse.json(
        { error: `You have already ${existingResponse.response} this request` },
        { status: 400 }
      );
    }

    await db.insert(driverResponsesTable).values({
      requestId: parsedRequestId,
      driverId: parsedDriverId,
      response,
      respondedAt: new Date().toISOString()
    });

    console.log('✅ Driver response recorded:', { requestId: parsedRequestId, driverId: parsedDriverId, response });

    const generalArea = await getGeneralArea(
      deliveryRequest.pickupLatitude || 0,
      deliveryRequest.pickupLongitude || 0
    );

    const customer = await db.query.customersTable.findFirst({
      where: eq(customersTable.id, deliveryRequest.customerId)
    });

    const driverRatings = await db.query.driverRatingsTable.findMany({
      where: eq(driverRatingsTable.driverId, parsedDriverId)
    });

    const totalRatings = driverRatings.length;
    const averageRating = totalRatings > 0 
      ? driverRatings.reduce((sum, rating) => sum + rating.rating, 0) / totalRatings 
      : 4.5;

    const driverData = {
      driverId: parsedDriverId,
      driverName: `${driver.firstName} ${driver.lastName}`.trim(),
      driverPhone: driver.phoneNumber || '',
      vehicleType: driver.vehicleType || 'Standard Vehicle',
      carName: driver.carName || 'Vehicle',
      profilePictureUrl: driver.profilePictureUrl || '/default-driver.png',
      wasDirectAssignment: false,
      rating: averageRating,
      totalRatings: totalRatings
    };

    if (response === 'accepted') {
      await db.update(deliveryRequestsTable)
        .set({ 
          status: 'accepted',
          assignedDriverId: parsedDriverId
        })
        .where(eq(deliveryRequestsTable.id, parsedRequestId));

      console.log('✅ Request accepted and assigned to driver:', { requestId: parsedRequestId, driverId: parsedDriverId });

      // PUBLISH TO LIVE FEED: Request Accepted
      await publishToLiveFeed('request_accepted', {
        requestId: parsedRequestId,
        generalArea,
        fare: deliveryRequest.fare,
        driverName: driverData.driverName.substring(0, 12) + '...',
        status: 'accepted'
      });

      const notificationData = {
        bookingId: parsedRequestId,
        ...driverData,
        customerId: deliveryRequest.customerId,
        customerName: customer?.username || deliveryRequest.customerUsername,
        pickupLocation: deliveryRequest.pickupLocation,
        dropoffLocation: deliveryRequest.dropoffLocation,
        fare: deliveryRequest.fare,
        distance: deliveryRequest.distance,
        packageDetails: deliveryRequest.packageDetails || '',
        estimatedArrival: calculateEstimatedArrival(driver.lastLocation, deliveryRequest.pickupAddress || deliveryRequest.pickupLocation || 'Unknown location'),
        timestamp: new Date().toISOString(),
        accepted: true,
        rejected: false,
        expired: false
      };

      try {
        await publishBookingResponse(deliveryRequest.customerId, notificationData, MESSAGE_TYPES.BOOKING_ACCEPTED);
        console.log('✅ Customer notified of acceptance via PubNub:', deliveryRequest.customerId);
        
        await getPubNubInstance().publish({
          channel: `booking_${parsedRequestId}`,
          message: {
            type: MESSAGE_TYPES.BOOKING_ACCEPTED,
            data: notificationData
          }
        });
        console.log('✅ Redundant notification sent to booking channel');
        
      } catch (pubnubError) {
        console.error('❌ Failed to notify customer via PubNub:', pubnubError);
      }

      try {
        await publishRequestAccepted(parsedRequestId, parsedDriverId);
        console.log('✅ Other drivers notified that request was accepted');
      } catch (broadcastError) {
        console.warn('⚠️ Failed to broadcast to other drivers:', broadcastError);
      }

      return NextResponse.json({
        success: true,
        message: 'Request accepted successfully',
        requestId: parsedRequestId,
        driver: driverData,
        customer: {
          id: deliveryRequest.customerId,
          username: deliveryRequest.customerUsername
        },
        notificationSent: true
      });

    } else {
      console.log('✅ Request rejected by driver:', { requestId: parsedRequestId, driverId: parsedDriverId });

      // PUBLISH TO LIVE FEED: Request Rejected
      await publishToLiveFeed('request_rejected', {
        requestId: parsedRequestId,
        generalArea,
        fare: deliveryRequest.fare,
        driverName: driverData.driverName.substring(0, 12) + '...',
        status: 'rejected'
      });

      const rejectionData = {
        bookingId: parsedRequestId,
        ...driverData,
        rejected: true,
        expired: false,
        accepted: false,
        timestamp: new Date().toISOString(),
        message: `${driver.firstName} declined your request. Automatically searching for other drivers...`,
        customerId: deliveryRequest.customerId,
        customerName: customer?.username || deliveryRequest.customerUsername,
        pickupLocation: deliveryRequest.pickupLocation,
        dropoffLocation: deliveryRequest.dropoffLocation,
        fare: deliveryRequest.fare,
        retryAvailable: true
      };

      try {
        await publishBookingResponse(deliveryRequest.customerId, rejectionData, MESSAGE_TYPES.BOOKING_REJECTED);
        console.log('✅ Customer notified of rejection via PubNub');
        
        await getPubNubInstance().publish({
          channel: `booking_${parsedRequestId}`,
          message: {
            type: MESSAGE_TYPES.BOOKING_REJECTED,
            data: rejectionData
          }
        });
        console.log('✅ Redundant rejection notification sent to booking channel');
        
      } catch (pubnubError) {
        console.error('❌ Failed to notify customer of rejection via PubNub:', pubnubError);
      }

      const availableFor = Math.floor((new Date(deliveryRequest.expiresAt).getTime() - Date.now()) / 1000);
      
      if (availableFor > 10 && deliveryRequest.status === 'pending') {
        try {
          await publishRequestRebroadcast(parsedRequestId, parsedDriverId, availableFor);
          console.log('✅ Request rebroadcast to other drivers, remaining time:', availableFor, 'seconds');
          
          await getPubNubInstance().publish({
            channel: `search_${deliveryRequest.customerId}`,
            message: {
              type: 'CONTINUE_SEARCH',
              data: {
                requestId: parsedRequestId,
                remainingTime: availableFor,
                declinedBy: parsedDriverId,
                timestamp: new Date().toISOString()
              }
            }
          });
          console.log('✅ Continue search notification sent');
          
        } catch (rebroadcastError) {
          console.warn('⚠️ Failed to rebroadcast request:', rebroadcastError);
        }
      } else {
        console.log('⏰ Not enough time remaining for rebroadcast or request no longer pending:', { 
          availableFor, 
          status: deliveryRequest.status 
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Request rejected',
        requestId: parsedRequestId,
        rebroadcast: availableFor > 10 && deliveryRequest.status === 'pending',
        remainingTime: availableFor,
        notificationSent: true,
        customerNotified: true
      });
    }

  } catch (error) {
    console.error('❌ Error processing driver response:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }

    try {
      const body = await request.json();
      const { requestId, customerId } = body;
      
      if (requestId && customerId) {
        const errorDriverData = {
          driverId: 0,
          driverName: 'System',
          driverPhone: '',
          vehicleType: '',
          carName: '',
          profilePictureUrl: '',
          wasDirectAssignment: false
        };

        const errorData = {
          bookingId: requestId,
          ...errorDriverData,
          error: true,
          message: 'System error processing driver response. Please try again.',
          timestamp: new Date().toISOString()
        };
        
        await getPubNubInstance().publish({
          channel: `customer_${customerId}`,
          message: {
            type: 'SYSTEM_ERROR',
            data: errorData
          }
        });
        console.log('✅ Customer notified of system error');
      }
    } catch (notificationError) {
      console.error('❌ Failed to notify customer of system error:', notificationError);
    }

    return NextResponse.json(
      { 
        error: 'Failed to process response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function calculateEstimatedArrival(driverLocation: any, pickupLocation: string | null): string {
  const defaultEstimate = '10-15 minutes';
  
  if (!driverLocation || !pickupLocation) {
    return defaultEstimate;
  }

  try {
    const location = typeof driverLocation === 'string' 
      ? JSON.parse(driverLocation) 
      : driverLocation;
    
    if (location && location.latitude && location.longitude) {
      const baseTime = 8;
      const trafficBuffer = 4;
      
      return `${baseTime}-${baseTime + trafficBuffer} minutes`;
    }
  } catch (parseError) {
    console.warn('Failed to parse driver location for ETA calculation:', parseError);
  }

  return defaultEstimate;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get('requestId');
  const driverId = searchParams.get('driverId');

  if (!requestId || !driverId) {
    return NextResponse.json(
      { error: 'Missing requestId or driverId' },
      { status: 400 }
    );
  }

  try {
    const parsedRequestId = parseInt(requestId);
    const parsedDriverId = parseInt(driverId);

    if (isNaN(parsedRequestId) || isNaN(parsedDriverId)) {
      return NextResponse.json(
        { error: 'Invalid requestId or driverId format' },
        { status: 400 }
      );
    }

    const response = await db.query.driverResponsesTable.findFirst({
      where: and(
        eq(driverResponsesTable.requestId, parsedRequestId),
        eq(driverResponsesTable.driverId, parsedDriverId)
      )
    });

    const deliveryRequest = await db.query.deliveryRequestsTable.findFirst({
      where: eq(deliveryRequestsTable.id, parsedRequestId)
    });

    if (!response) {
      return NextResponse.json({
        hasResponded: false,
        response: null,
        requestStatus: deliveryRequest?.status || 'unknown',
        isExpired: deliveryRequest ? new Date(deliveryRequest.expiresAt) < new Date() : false
      });
    }

    return NextResponse.json({
      hasResponded: true,
      response: response.response,
      respondedAt: response.respondedAt,
      requestStatus: deliveryRequest?.status || 'unknown',
      isExpired: deliveryRequest ? new Date(deliveryRequest.expiresAt) < new Date() : false,
      assignedDriverId: deliveryRequest?.assignedDriverId
    });

  } catch (error) {
    console.error('Error checking response status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check response status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    
    if (!requestId) {
      return NextResponse.json(
        { error: 'Missing requestId' },
        { status: 400 }
      );
    }

    const parsedRequestId = parseInt(requestId);
    
    if (isNaN(parsedRequestId)) {
      return NextResponse.json(
        { error: 'Invalid requestId format' },
        { status: 400 }
      );
    }

    await db.delete(driverResponsesTable)
      .where(eq(driverResponsesTable.requestId, parsedRequestId));

    console.log('✅ Cleaned up responses for request:', parsedRequestId);

    return NextResponse.json({
      success: true,
      message: `Responses for request ${parsedRequestId} deleted successfully`,
      deletedRequestId: parsedRequestId
    });

  } catch (error) {
    console.error('Error cleaning up responses:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup responses' },
      { status: 500 }
    );
  }
}