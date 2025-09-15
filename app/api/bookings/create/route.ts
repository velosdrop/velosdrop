// app/api/bookings/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { deliveryRequestsTable, customersTable, driverResponsesTable, driversTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { broadcastBookingRequest, broadcastBookingUpdate } from '@/lib/sse';

// Improved nearby driver matching
const findNearbyDrivers = async (userLocation: { lat: number; lng: number }, radius: number = 5) => {
  try {
    // Use relative path instead of absolute URL for internal API calls
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || ''}/api/drivers/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=${radius}`
    );

    if (response.ok) {
      const drivers = await response.json();
      console.log('Nearby drivers API response:', drivers);
      return drivers.map((driver: any) => driver.id);
    } else {
      console.error('Failed to fetch nearby drivers:', response.status, response.statusText);
      return [];
    }
  } catch (error) {
    console.error('Error fetching nearby drivers:', error);
    return [];
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Booking request received:', body);
    
    // Updated field names to match what the frontend is sending
    const { 
      customerId, 
      pickupAddress,       // Changed from pickupLocation
      dropoffAddress,      // Changed from dropoffLocation
      fare, 
      distance,
      packageDetails,
      userLocation 
    } = body;

    // Updated validation to match new field names
    if (!customerId || !pickupAddress || !dropoffAddress || !fare || !userLocation) {
      console.log('Missing required fields:', { customerId, pickupAddress, dropoffAddress, fare, userLocation });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get customer details
    const customer = await db.query.customersTable.findFirst({
      where: eq(customersTable.id, customerId),
      columns: { username: true, id: true }
    });

    if (!customer) {
      console.log('Customer not found:', customerId);
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Create delivery request
    const expiresAt = new Date(Date.now() + 30000);
    
    // Map frontend field names to database field names
    const [deliveryRequest] = await db.insert(deliveryRequestsTable).values({
      customerId,
      customerUsername: customer.username,
      pickupLocation: pickupAddress,      // Map to database field
      dropoffLocation: dropoffAddress,    // Map to database field
      fare: parseFloat(fare),
      distance: parseFloat(distance),
      packageDetails: packageDetails || '',
      expiresAt: expiresAt.toISOString(),
      status: 'pending'
    }).returning();

    console.log('Delivery request created:', deliveryRequest);

    if (!deliveryRequest) {
      throw new Error('Failed to create booking');
    }

    // Find nearby drivers using the improved function
    const driverIds = await findNearbyDrivers(userLocation, 5);
    console.log('Nearby drivers found:', driverIds.length);

    // Broadcast to nearby drivers with connection check
    if (driverIds.length > 0) {
      try {
        const broadcastResult = broadcastBookingRequest(driverIds, {
          id: deliveryRequest.id,
          customerUsername: customer.username,
          pickupLocation: pickupAddress,
          dropoffLocation: dropoffAddress,
          fare: parseFloat(fare),
          distance: parseFloat(distance),
          expiresIn: 30,
          createdAt: new Date().toISOString()
        });
        
        console.log('Broadcast results:', broadcastResult);
      } catch (broadcastError) {
        console.error('Broadcast error:', broadcastError);
      }
    }

    // Wait for driver responses with timeout
    const responseTimeout = 30000; // 30 seconds
    const responsePromise = new Promise((resolve) => {
      let responded = false;
      let timeoutHandled = false;
      
      // Listen for driver responses
      const checkResponses = setInterval(async () => {
        if (timeoutHandled) {
          clearInterval(checkResponses);
          return;
        }
        
        try {
          const responses = await db.select()
            .from(driverResponsesTable)
            .where(eq(driverResponsesTable.requestId, deliveryRequest.id));
          
          const acceptedResponse = responses.find(r => r.response === 'accepted');
          
          if (acceptedResponse) {
            responded = true;
            clearInterval(checkResponses);
            
            // Get driver details
            const driver = await db.query.driversTable.findFirst({
              where: eq(driversTable.id, acceptedResponse.driverId)
            });
            
            resolve({
              accepted: true,
              driver: driver,
              response: acceptedResponse
            });
          }
        } catch (error) {
          console.error('Error checking responses:', error);
        }
      }, 1000);
      
      // Timeout if no response
      setTimeout(() => {
        if (!responded) {
          timeoutHandled = true;
          clearInterval(checkResponses);
          resolve({
            accepted: false,
            driver: null,
            response: null
          });
        }
      }, responseTimeout);
    });

    // Wait for response or timeout
    const responseResult = await responsePromise as any;

    if (responseResult.accepted && responseResult.driver) {
      // Update request status to accepted
      await db.update(deliveryRequestsTable)
        .set({ 
          status: 'accepted',
          assignedDriverId: responseResult.driver.id
        })
        .where(eq(deliveryRequestsTable.id, deliveryRequest.id));
      
      // Notify customer
      broadcastBookingUpdate(customerId, {
        type: 'bookingUpdate',
        requestId: deliveryRequest.id,
        updateType: 'DRIVER_ACCEPTED',
        driver: responseResult.driver
      });
      
      return NextResponse.json({
        success: true,
        request: deliveryRequest,
        driver: responseResult.driver,
        status: 'accepted'
      });
    } else {
      // No drivers accepted, set status to expired
      await db.update(deliveryRequestsTable)
        .set({ status: 'expired' })
        .where(eq(deliveryRequestsTable.id, deliveryRequest.id));
      
      // Notify customer of expiration
      broadcastBookingUpdate(customerId, {
        type: 'bookingUpdate',
        requestId: deliveryRequest.id,
        updateType: 'REQUEST_EXPIRED'
      });
      
      return NextResponse.json({
        success: true,
        request: deliveryRequest,
        status: 'expired',
        message: 'No drivers accepted the request'
      });
    }

  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create booking',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}