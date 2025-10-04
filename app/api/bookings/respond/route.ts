import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { deliveryRequestsTable, driverResponsesTable, driversTable } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { publishBookingResponse, MESSAGE_TYPES } from '@/lib/pubnub-booking';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, driverId, response } = body;

    if (!requestId || !driverId || !response) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['accepted', 'rejected'].includes(response)) {
      return NextResponse.json(
        { error: 'Invalid response type' },
        { status: 400 }
      );
    }

    // Check if request is still valid
    const deliveryRequest = await db.query.deliveryRequestsTable.findFirst({
      where: eq(deliveryRequestsTable.id, requestId)
    });

    if (!deliveryRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    if (deliveryRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Request already processed' },
        { status: 400 }
      );
    }

    if (new Date(deliveryRequest.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Request has expired' },
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

    if (response === 'accepted') {
      // Update request status and assign driver
      await db.update(deliveryRequestsTable)
        .set({ 
          status: 'accepted',
          assignedDriverId: driverId
        })
        .where(eq(deliveryRequestsTable.id, requestId));

      // Get complete driver details for notification
      const driver = await db.query.driversTable.findFirst({
        where: eq(driversTable.id, driverId)
      });

      // Notify customer with complete driver information via PubNub
      await publishBookingResponse(deliveryRequest.customerId, {
        bookingId: requestId,
        driverId: driverId,
        driverName: `${driver?.firstName} ${driver?.lastName}`,
        driverPhone: driver?.phoneNumber || '', // Ensure this is never null
        vehicleType: driver?.vehicleType || '',
        carName: driver?.carName || '',
        profilePictureUrl: driver?.profilePictureUrl || undefined, // Ensure this is undefined if null
        wasDirectAssignment: deliveryRequest.assignedDriverId === driverId
      }, MESSAGE_TYPES.BOOKING_ACCEPTED);
      
      return NextResponse.json({
        success: true,
        message: 'Request accepted successfully',
        requestId
      });

    } else {
      // For rejection, notify customer via PubNub
      await publishBookingResponse(deliveryRequest.customerId, {
        bookingId: requestId,
        driverId: driverId,
        driverName: '',
        driverPhone: '',
        vehicleType: '',
        carName: '',
        profilePictureUrl: '',
        wasDirectAssignment: deliveryRequest.assignedDriverId === driverId,
        rejected: true
      }, MESSAGE_TYPES.BOOKING_REJECTED);

      return NextResponse.json({
        success: true,
        message: 'Request rejected',
        requestId
      });
    }

  } catch (error) {
    console.error('Error processing driver response:', error);
    return NextResponse.json(
      { error: 'Failed to process response' },
      { status: 500 }
    );
  }
}