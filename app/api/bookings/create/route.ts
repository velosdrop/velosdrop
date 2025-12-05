//app/api/bookings/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { deliveryRequestsTable, customersTable, driverResponsesTable, driversTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { publishBookingRequest, publishBookingResponse, MESSAGE_TYPES } from '@/lib/pubnub-booking';

// Improved nearby driver matching
const findNearbyDrivers = async (userLocation: { lat: number; lng: number }, vehicleType?: string, radius: number = 5) => {
  try {
    // Build query parameters
    const params = new URLSearchParams({
      lat: userLocation.lat.toString(),
      lng: userLocation.lng.toString(),
      radius: radius.toString()
    });
    
    // Add vehicleType filter if provided
    if (vehicleType) {
      params.append('vehicleType', vehicleType);
    }

    // Use relative path instead of absolute URL for internal API calls
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
    
    // Updated field names to include vehicleType
    const { 
      customerId, 
      customerUsername,
      recipientPhone,
      pickupAddress,
      dropoffAddress,
      fare, 
      distance,
      packageDetails,
      vehicleType,          // NEW: Vehicle type parameter
      userLocation,
      selectedDriverId
    } = body;

    // Updated validation to include vehicleType
    if (!customerId || !pickupAddress || !dropoffAddress || !fare || !userLocation) {
      console.log('Missing required fields:', { customerId, pickupAddress, dropoffAddress, fare, userLocation });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get customer details with ALL required fields for driver notification
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

    // Create delivery request - ADD vehicleType to database insert
    const expiresAt = new Date(Date.now() + 30000);
    
    // Map frontend field names to database field names
    const [deliveryRequest] = await db.insert(deliveryRequestsTable).values({
      customerId,
      customerUsername: customerUsername || customer.username,
      pickupLocation: pickupAddress,
      dropoffLocation: dropoffAddress,
      fare: parseFloat(fare),
      distance: parseFloat(distance),
      vehicleType: vehicleType || 'car', // NEW: Store vehicle type
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
      // If a specific driver is selected, only notify that driver
      driverIdsToNotify = [selectedDriverId];
      console.log('Specific driver selected:', selectedDriverId);
    } else {
      // Broadcast to nearby drivers with optional vehicleType filter
      const driverIds = await findNearbyDrivers(userLocation, vehicleType, 5);
      console.log(`Found ${driverIds.length} nearby drivers for vehicle type: ${vehicleType || 'all'}`);
      driverIdsToNotify = driverIds;
    }

    // Publish booking request via PubNub - ADD vehicleType to notification data
    if (driverIdsToNotify.length > 0) {
      try {
        // Create the booking data object with all required fields
        const bookingData = {
          bookingId: deliveryRequest.id,
          customerId: customerId,
          customerUsername: customerUsername || customer.username,
          customerProfilePictureUrl: customer.profilePictureUrl || '', 
          customerPhoneNumber: customer.phoneNumber || '',
          pickupLocation: pickupAddress,
          dropoffLocation: dropoffAddress,
          fare: parseFloat(fare),
          distance: parseFloat(distance),
          vehicleType: vehicleType || 'car', // NEW: Include vehicle type
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
      // No drivers found - handle this case
      console.log('No drivers available for notification');
      
      // Update status immediately to expired
      await db.update(deliveryRequestsTable)
        .set({ status: 'expired' })
        .where(eq(deliveryRequestsTable.id, deliveryRequest.id));
      
      // Notify customer via PubNub - Use updated interface
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

    // For direct assignments, return immediately without waiting for responses
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
      
      // Notify customer via PubNub - Use updated interface
      await publishBookingResponse(customerId, {
        bookingId: deliveryRequest.id,
        driverId: responseResult.driver.id,
        driverName: `${responseResult.driver.firstName} ${responseResult.driver.lastName}`,
        driverPhone: responseResult.driver.phoneNumber || '',
        vehicleType: responseResult.driver.vehicleType || '',
        carName: responseResult.driver.carName || '',
        profilePictureUrl: responseResult.driver.profilePictureUrl,
        wasDirectAssignment: false,
        requestedVehicleType: vehicleType || 'car' // NEW: Include requested vehicle type
      }, MESSAGE_TYPES.BOOKING_ACCEPTED);
      
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
      
      // Notify customer of expiration via PubNub - Use updated interface
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
        requestedVehicleType: vehicleType || 'car' // NEW: Include requested vehicle type
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