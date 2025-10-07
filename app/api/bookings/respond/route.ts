//app/api/bookings/respond/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { deliveryRequestsTable, driverResponsesTable, driversTable, customersTable } from '@/src/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { publishBookingResponse, MESSAGE_TYPES, getPubNubInstance, publishRequestAccepted, publishRequestRebroadcast } from '@/lib/pubnub-booking';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, driverId, response } = body;

    console.log('📨 Processing driver response:', { requestId, driverId, response });

    // Validate required fields
    if (!requestId || !driverId || !response) {
      console.error('❌ Missing required fields:', { requestId, driverId, response });
      return NextResponse.json(
        { error: 'Missing required fields: requestId, driverId, and response are required' },
        { status: 400 }
      );
    }

    // Validate response type
    if (!['accepted', 'rejected'].includes(response)) {
      console.error('❌ Invalid response type:', response);
      return NextResponse.json(
        { error: 'Invalid response type. Must be "accepted" or "rejected"' },
        { status: 400 }
      );
    }

    // Check if driver exists and is online
    const driver = await db.query.driversTable.findFirst({
      where: eq(driversTable.id, driverId)
    });

    if (!driver) {
      console.error('❌ Driver not found:', driverId);
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    if (!driver.isOnline) {
      console.error('❌ Driver is offline:', driverId);
      return NextResponse.json(
        { error: 'Driver is currently offline' },
        { status: 400 }
      );
    }

    // Check if request is still valid
    const deliveryRequest = await db.query.deliveryRequestsTable.findFirst({
      where: eq(deliveryRequestsTable.id, requestId)
    });

    if (!deliveryRequest) {
      console.error('❌ Delivery request not found:', requestId);
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    if (deliveryRequest.status !== 'pending') {
      console.error('❌ Request already processed:', { requestId, status: deliveryRequest.status });
      return NextResponse.json(
        { error: `Request has already been ${deliveryRequest.status}` },
        { status: 400 }
      );
    }

    // Check if request has expired
    if (new Date(deliveryRequest.expiresAt) < new Date()) {
      console.error('❌ Request expired:', { requestId, expiresAt: deliveryRequest.expiresAt });
      
      // Update request status to expired
      await db.update(deliveryRequestsTable)
        .set({ status: 'expired' })
        .where(eq(deliveryRequestsTable.id, requestId));

      return NextResponse.json(
        { error: 'Request has expired' },
        { status: 400 }
      );
    }

    // Check if this driver has already responded to this request
    const existingResponse = await db.query.driverResponsesTable.findFirst({
      where: and(
        eq(driverResponsesTable.requestId, requestId),
        eq(driverResponsesTable.driverId, driverId)
      )
    });

    if (existingResponse) {
      console.error('❌ Driver already responded:', { requestId, driverId, existingResponse: existingResponse.response });
      return NextResponse.json(
        { error: `You have already ${existingResponse.response} this request` },
        { status: 400 }
      );
    }

    // Record driver response
    await db.insert(driverResponsesTable).values({
      requestId,
      driverId,
      response,
      respondedAt: new Date().toISOString()
    });

    console.log('✅ Driver response recorded:', { requestId, driverId, response });

    if (response === 'accepted') {
      // Update request status and assign driver - ONLY use fields that exist in schema
      await db.update(deliveryRequestsTable)
        .set({ 
          status: 'accepted',
          assignedDriverId: driverId
        })
        .where(eq(deliveryRequestsTable.id, requestId));

      console.log('✅ Request accepted and assigned to driver:', { requestId, driverId });

      // Get customer details for enhanced notification
      const customer = await db.query.customersTable.findFirst({
        where: eq(customersTable.id, deliveryRequest.customerId)
      });

      // Prepare driver data for notification using only available driver data
      const driverData = {
        driverId: driverId,
        driverName: `${driver.firstName} ${driver.lastName}`.trim(),
        driverPhone: driver.phoneNumber || '',
        vehicleType: driver.vehicleType || 'Standard Vehicle',
        carName: driver.carName || 'Vehicle',
        profilePictureUrl: driver.profilePictureUrl || '/default-driver.png'
      };

      // Prepare notification data
      const notificationData = {
        bookingId: requestId,
        ...driverData,
        customerId: deliveryRequest.customerId,
        customerName: customer?.username || deliveryRequest.customerUsername,
        pickupLocation: deliveryRequest.pickupLocation,
        dropoffLocation: deliveryRequest.dropoffLocation,
        fare: deliveryRequest.fare,
        distance: deliveryRequest.distance,
        packageDetails: deliveryRequest.packageDetails || '',
        timestamp: new Date().toISOString()
      };

      // Notify customer with complete driver information via PubNub
      try {
        await publishBookingResponse(deliveryRequest.customerId, notificationData, MESSAGE_TYPES.BOOKING_ACCEPTED);
        console.log('✅ Customer notified of acceptance via PubNub');
      } catch (pubnubError) {
        console.error('❌ Failed to notify customer via PubNub:', pubnubError);
        // Continue - the booking is still accepted even if PubNub fails
      }

      // Notify other drivers that this request is no longer available
      try {
        await publishRequestAccepted(requestId, driverId);
        console.log('✅ Other drivers notified that request was accepted');
      } catch (broadcastError) {
        console.warn('⚠️ Failed to broadcast to other drivers:', broadcastError);
      }

      return NextResponse.json({
        success: true,
        message: 'Request accepted successfully',
        requestId,
        driver: driverData,
        customer: {
          id: deliveryRequest.customerId,
          username: deliveryRequest.customerUsername
        }
      });

    } else {
      // For rejection
      console.log('✅ Request rejected by driver:', { requestId, driverId });

      // Prepare rejection notification data with only required fields
      const rejectionData = {
        bookingId: requestId,
        driverId: driverId,
        driverName: `${driver.firstName} ${driver.lastName}`.trim(),
        driverPhone: driver.phoneNumber || '',
        vehicleType: driver.vehicleType || 'Standard Vehicle',
        carName: driver.carName || 'Vehicle',
        profilePictureUrl: driver.profilePictureUrl || '/default-driver.png',
        rejected: true,
        timestamp: new Date().toISOString()
      };

      // Notify customer of rejection via PubNub
      try {
        await publishBookingResponse(deliveryRequest.customerId, rejectionData, MESSAGE_TYPES.BOOKING_REJECTED);
        console.log('✅ Customer notified of rejection via PubNub');
      } catch (pubnubError) {
        console.error('❌ Failed to notify customer of rejection via PubNub:', pubnubError);
      }

      // Calculate remaining time for the request and rebroadcast to other drivers
      const availableFor = Math.floor((new Date(deliveryRequest.expiresAt).getTime() - Date.now()) / 1000);
      
      if (availableFor > 0) {
        try {
          await publishRequestRebroadcast(requestId, driverId, availableFor);
          console.log('✅ Request rebroadcast to other drivers');
        } catch (rebroadcastError) {
          console.warn('⚠️ Failed to rebroadcast request:', rebroadcastError);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Request rejected',
        requestId,
        rebroadcast: availableFor > 0
      });
    }

  } catch (error) {
    console.error('❌ Error processing driver response:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
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

// Helper function to calculate estimated arrival time
function calculateEstimatedArrival(driverLocation: any, pickupLocation: string): string {
  // This is a simplified calculation
  const defaultEstimate = '10-15 minutes';
  
  if (!driverLocation) {
    return defaultEstimate;
  }

  try {
    // Parse driver location
    const location = typeof driverLocation === 'string' 
      ? JSON.parse(driverLocation) 
      : driverLocation;
    
    if (location && location.latitude && location.longitude) {
      return '8-12 minutes';
    }
  } catch (parseError) {
    console.warn('Failed to parse driver location for ETA calculation:', parseError);
  }

  return defaultEstimate;
}

// Optional: Add GET endpoint to check response status
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
    const response = await db.query.driverResponsesTable.findFirst({
      where: and(
        eq(driverResponsesTable.requestId, parseInt(requestId)),
        eq(driverResponsesTable.driverId, parseInt(driverId))
      )
    });

    if (!response) {
      return NextResponse.json({
        hasResponded: false,
        response: null
      });
    }

    return NextResponse.json({
      hasResponded: true,
      response: response.response,
      respondedAt: response.respondedAt
    });

  } catch (error) {
    console.error('Error checking response status:', error);
    return NextResponse.json(
      { error: 'Failed to check response status' },
      { status: 500 }
    );
  }
}