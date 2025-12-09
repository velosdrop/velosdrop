//app/api/bookings/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { deliveryRequestsTable, customersTable, driverResponsesTable, driversTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { publishBookingRequest, publishBookingResponse, MESSAGE_TYPES } from '@/lib/pubnub-booking';

// Improved nearby driver matching
const findNearbyDrivers = async (userLocation: { lat: number; lng: number }, vehicleType?: string, radius: number = 5) => {
  try {
    const params = new URLSearchParams({
      lat: userLocation.lat.toString(),
      lng: userLocation.lng.toString(),
      radius: radius.toString()
    });
    
    if (vehicleType) {
      params.append('vehicleType', vehicleType);
    }

    const response = await fetch(
      `${process.env.NEXTAUTH_URL || ''}/api/drivers/nearby?${params.toString()}`
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
    
    const { 
      customerId, 
      customerUsername,
      recipientPhone,
      pickupAddress,
      pickupLatitude,
      pickupLongitude,
      dropoffAddress,
      dropoffLatitude,
      dropoffLongitude,
      fare, 
      distance,
      packageDetails,
      vehicleType,
      userLocation,
      selectedDriverId
    } = body;

    // Updated validation to include all new fields
    if (
      !customerId || 
      !pickupAddress || 
      !pickupLatitude === undefined ||
      !pickupLongitude === undefined ||
      !dropoffAddress || 
      !dropoffLatitude === undefined ||
      !dropoffLongitude === undefined ||
      !fare || 
      !userLocation
    ) {
      console.log('Missing required fields:', { 
        customerId, 
        pickupAddress, 
        pickupLatitude,
        pickupLongitude,
        dropoffAddress,
        dropoffLatitude,
        dropoffLongitude,
        fare, 
        userLocation 
      });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get customer details
    const customer = await db.query.customersTable.findFirst({
      where: eq(customersTable.id, customerId),
      columns: { 
        id: true, 
        username: true, 
        phoneNumber: true,
        profilePictureUrl: true
      }
    });

    if (!customer) {
      console.log('Customer not found:', customerId);
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Create delivery request with NEW schema fields
    const expiresAt = new Date(Date.now() + 30000);
    
    const [deliveryRequest] = await db.insert(deliveryRequestsTable).values({
      customerId,
      customerUsername: customerUsername || customer.username,
      pickupAddress: pickupAddress,
      pickupLatitude: parseFloat(pickupLatitude),
      pickupLongitude: parseFloat(pickupLongitude),
      dropoffAddress: dropoffAddress,
      dropoffLatitude: parseFloat(dropoffLatitude),
      dropoffLongitude: parseFloat(dropoffLongitude),
      fare: parseFloat(fare),
      distance: parseFloat(distance),
      vehicleType: vehicleType || 'car',
      packageDetails: packageDetails || '',
      recipientPhoneNumber: recipientPhone || '',
      expiresAt: expiresAt.toISOString(),
      status: 'pending',
      ...(selectedDriverId && { assignedDriverId: selectedDriverId })
    }).returning();

    console.log('Delivery request created:', deliveryRequest);

    if (!deliveryRequest) {
      throw new Error('Failed to create booking');
    }

    let driverIdsToNotify = [];
    
    if (selectedDriverId) {
      driverIdsToNotify = [selectedDriverId];
      console.log('Specific driver selected:', selectedDriverId);
    } else {
      const driverIds = await findNearbyDrivers(userLocation, vehicleType, 5);
      console.log(`Found ${driverIds.length} nearby drivers for vehicle type: ${vehicleType || 'all'}`);
      driverIdsToNotify = driverIds;
    }

    // Publish booking request via PubNub
    if (driverIdsToNotify.length > 0) {
      try {
        const bookingData = {
          bookingId: deliveryRequest.id,
          customerId: customerId,
          customerUsername: customerUsername || customer.username,
          customerProfilePictureUrl: customer.profilePictureUrl || '', 
          customerPhoneNumber: customer.phoneNumber || '',
          pickupAddress: pickupAddress,
          pickupLatitude: pickupLatitude,
          pickupLongitude: pickupLongitude,
          dropoffAddress: dropoffAddress,
          dropoffLatitude: dropoffLatitude,
          dropoffLongitude: dropoffLongitude,
          fare: parseFloat(fare),
          distance: parseFloat(distance),
          vehicleType: vehicleType || 'car',
          expiresAt: expiresAt.toISOString(),
          packageDetails: packageDetails || '',
          isDirectAssignment: !!selectedDriverId,
          recipientPhoneNumber: recipientPhone || ''
        };

        console.log('Publishing booking data to drivers:', bookingData);
        
        const publishResult = await publishBookingRequest(driverIdsToNotify, bookingData);
        
        console.log('PubNub publish results:', publishResult);
      } catch (publishError) {
        console.error('PubNub publish error:', publishError);
      }
    } else {
      console.log('No drivers available for notification');
      
      await db.update(deliveryRequestsTable)
        .set({ status: 'expired' })
        .where(eq(deliveryRequestsTable.id, deliveryRequest.id));
      
      await publishBookingResponse(customerId, {
        bookingId: deliveryRequest.id,
        driverId: 0,
        driverName: '',
        driverPhone: '',
        vehicleType: '',
        carName: '',
        profilePictureUrl: '',
        wasDirectAssignment: false,
        expired: true,
        message: 'No drivers available for your selected vehicle type',
        requestedVehicleType: vehicleType || 'car'
      }, MESSAGE_TYPES.BOOKING_REJECTED);
      
      return NextResponse.json({
        success: false,
        request: deliveryRequest,
        status: 'expired',
        message: 'No drivers available for your selected vehicle type'
      });
    }

    if (selectedDriverId) {
      return NextResponse.json({
        success: true,
        request: deliveryRequest,
        message: 'Request sent to specific driver',
        status: 'pending'
      });
    }

    // Wait for driver responses with timeout (only for broadcast requests)
    const responseTimeout = 30000; // 30 seconds
    const responsePromise = new Promise((resolve) => {
      let responded = false;
      let timeoutHandled = false;
      
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

    const responseResult = await responsePromise as any;

    if (responseResult.accepted && responseResult.driver) {
      await db.update(deliveryRequestsTable)
        .set({ 
          status: 'accepted',
          assignedDriverId: responseResult.driver.id
        })
        .where(eq(deliveryRequestsTable.id, deliveryRequest.id));
      
      await publishBookingResponse(customerId, {
        bookingId: deliveryRequest.id,
        driverId: responseResult.driver.id,
        driverName: `${responseResult.driver.firstName} ${responseResult.driver.lastName}`,
        driverPhone: responseResult.driver.phoneNumber || '',
        vehicleType: responseResult.driver.vehicleType || '',
        carName: responseResult.driver.carName || '',
        profilePictureUrl: responseResult.driver.profilePictureUrl,
        wasDirectAssignment: false,
        requestedVehicleType: vehicleType || 'car'
      }, MESSAGE_TYPES.BOOKING_ACCEPTED);
      
      return NextResponse.json({
        success: true,
        request: deliveryRequest,
        driver: responseResult.driver,
        status: 'accepted'
      });
    } else {
      await db.update(deliveryRequestsTable)
        .set({ status: 'expired' })
        .where(eq(deliveryRequestsTable.id, deliveryRequest.id));
      
      await publishBookingResponse(customerId, {
        bookingId: deliveryRequest.id,
        driverId: 0,
        driverName: '',
        driverPhone: '',
        vehicleType: '',
        carName: '',
        profilePictureUrl: '',
        wasDirectAssignment: false,
        expired: true,
        message: 'No drivers accepted the request',
        requestedVehicleType: vehicleType || 'car'
      }, MESSAGE_TYPES.BOOKING_REJECTED);
      
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