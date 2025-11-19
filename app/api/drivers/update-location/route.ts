//app/api/drivers/update-location/route.ts
import { db } from '@/src/db';
import { driversTable, deliveryRequestsTable } from '@/src/db/schema';
import { eq, sql, and, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { publishDriverLocationUpdate, getPubNubInstance, MESSAGE_TYPES, publishDriverLocationUpdateWithOrder } from "@/lib/pubnub-booking";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { driverId, location, timestamp } = body;

    console.log('📍 Processing location update:', { driverId, location });

    if (!driverId || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: driverId and location are required' },
        { status: 400 }
      );
    }

    // Enhanced location validation
    if (
      typeof location !== 'object' ||
      location.latitude === undefined ||
      location.longitude === undefined
    ) {
      return NextResponse.json(
        { error: 'Invalid location format. Must include latitude and longitude' },
        { status: 400 }
      );
    }

    // Parse and validate coordinates with better error handling
    const latitude = parseFloat(String(location.latitude));
    const longitude = parseFloat(String(location.longitude));

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Latitude and longitude must be valid numbers' },
        { status: 400 }
      );
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinate values. Latitude must be between -90 and 90, longitude between -180 and 180' },
        { status: 400 }
      );
    }

    // Create normalized location object
    const normalizedLocation = {
      latitude,
      longitude,
      accuracy: location.accuracy || null,
      heading: location.heading || null,
      speed: location.speed || null,
      altitude: location.altitude || null,
      timestamp: timestamp || new Date().toISOString()
    };

    const locationString = JSON.stringify(normalizedLocation);

    // Update driver location in database
    await db
      .update(driversTable)
      .set({
        lastLocation: sql`${locationString}`,
        latitude,
        longitude,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(driversTable.id, driverId));

    console.log('✅ Driver location updated in database:', { driverId, latitude, longitude });

    // Find active delivery for this driver to notify customer
    const activeDelivery = await db.query.deliveryRequestsTable.findFirst({
      where: and(
        eq(deliveryRequestsTable.assignedDriverId, driverId),
        eq(deliveryRequestsTable.status, 'accepted')
      ),
      orderBy: [desc(deliveryRequestsTable.createdAt)]
    });

    // ENHANCED: Broadcast location update to customer with order context
    if (activeDelivery) {
      try {
        const pubnub = getPubNubInstance();
        
        await pubnub.publish({
          channel: `customer_${activeDelivery.customerId}`,
          message: {
            type: MESSAGE_TYPES.DRIVER_LOCATION_UPDATE,
            data: {
              driverId,
              orderId: activeDelivery.id, // Include orderId
              location: normalizedLocation,
              timestamp: normalizedLocation.timestamp
            }
          }
        });
        
        // Also publish with the enhanced function that includes order context
        await publishDriverLocationUpdateWithOrder(
          driverId,
          normalizedLocation,
          activeDelivery.id
        );
        
        console.log('✅ Location broadcast to customer with order context:', { 
          customerId: activeDelivery.customerId,
          orderId: activeDelivery.id 
        });
      } catch (pubnubError) {
        console.warn('⚠️ PubNub location broadcast failed, but DB update succeeded:', pubnubError);
      }
    }

    // Also broadcast to general drivers channel for potential fleet management
    try {
      await publishDriverLocationUpdate(driverId, normalizedLocation);
      console.log('✅ Location broadcast to drivers channel');
    } catch (broadcastError) {
      console.warn('⚠️ Failed to broadcast to drivers channel:', broadcastError);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Location updated successfully',
      location: normalizedLocation,
      hasActiveDelivery: !!activeDelivery,
      orderId: activeDelivery?.id || null
    });

  } catch (error) {
    console.error('❌ Error updating driver location:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update location',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to retrieve driver's current location
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get('driverId');

  if (!driverId) {
    return NextResponse.json(
      { error: 'Missing driverId parameter' },
      { status: 400 }
    );
  }

  try {
    const driver = await db.query.driversTable.findFirst({
      where: eq(driversTable.id, parseInt(driverId)),
      columns: {
        lastLocation: true,
        latitude: true,
        longitude: true,
        updatedAt: true
      }
    });

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    let locationData = null;
    if (driver.lastLocation) {
      try {
        locationData = typeof driver.lastLocation === 'string' 
          ? JSON.parse(driver.lastLocation) 
          : driver.lastLocation;
      } catch (parseError) {
        console.warn('Failed to parse driver location:', parseError);
      }
    }

    return NextResponse.json({
      driverId: parseInt(driverId),
      location: locationData,
      coordinates: driver.latitude && driver.longitude ? {
        latitude: driver.latitude,
        longitude: driver.longitude
      } : null,
      lastUpdated: driver.updatedAt
    });

  } catch (error) {
    console.error('Error retrieving driver location:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve location' },
      { status: 500 }
    );
  }
}