// app/api/delivery/[deliveryId]/route.ts
import { db } from '@/src/db';
import { deliveryRequestsTable, driversTable, customersTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

// Define the type for route context
interface RouteContext {
  params: Promise<{ deliveryId: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Wait for params to resolve (Next.js 15 makes params async)
    const params = await context.params;
    const deliveryId = parseInt(params.deliveryId);
    
    if (isNaN(deliveryId)) {
      return Response.json({ error: 'Invalid delivery ID' }, { status: 400 });
    }

    console.log('🔍 Fetching delivery details for ID:', deliveryId);

    // Fetch delivery
    const delivery = await db.select()
      .from(deliveryRequestsTable)
      .where(eq(deliveryRequestsTable.id, deliveryId))
      .limit(1);

    if (!delivery || delivery.length === 0) {
      return Response.json({ error: 'Delivery not found' }, { status: 404 });
    }

    const deliveryData = delivery[0];

    // Fetch driver details if assigned (using only fields that exist in schema)
    let driverDetails = null;
    if (deliveryData.assignedDriverId) {
      const driver = await db.select({
        id: driversTable.id,
        firstName: driversTable.firstName,
        lastName: driversTable.lastName,
        phoneNumber: driversTable.phoneNumber,
        email: driversTable.email,
        vehicleType: driversTable.vehicleType,
        carName: driversTable.carName,
        numberPlate: driversTable.numberPlate,
        balance: driversTable.balance,
        profilePictureUrl: driversTable.profilePictureUrl
      })
        .from(driversTable)
        .where(eq(driversTable.id, deliveryData.assignedDriverId))
        .limit(1);

      if (driver && driver.length > 0) {
        driverDetails = driver[0];
      }
    }

    // Fetch customer details (using only fields that exist in schema)
    let customerDetails = null;
    if (deliveryData.customerId) {
      const customer = await db.select({
        id: customersTable.id,
        username: customersTable.username,
        phoneNumber: customersTable.phoneNumber,
        profilePictureUrl: customersTable.profilePictureUrl,
        homeAddress: customersTable.homeAddress,
        workAddress: customersTable.workAddress
      })
        .from(customersTable)
        .where(eq(customersTable.id, deliveryData.customerId))
        .limit(1);

      if (customer && customer.length > 0) {
        customerDetails = customer[0];
      }
    }

    // Return complete delivery information
    return Response.json({
      id: deliveryData.id,
      customerId: deliveryData.customerId,
      customerUsername: deliveryData.customerUsername,
      assignedDriverId: deliveryData.assignedDriverId,
      
      // Old location format (deprecated but kept for compatibility)
      pickupLocation: deliveryData.pickupLocation,
      dropoffLocation: deliveryData.dropoffLocation,
      
      // New location format
      pickupAddress: deliveryData.pickupAddress,
      pickupLatitude: deliveryData.pickupLatitude,
      pickupLongitude: deliveryData.pickupLongitude,
      dropoffAddress: deliveryData.dropoffAddress,
      dropoffLatitude: deliveryData.dropoffLatitude,
      dropoffLongitude: deliveryData.dropoffLongitude,
      
      fare: deliveryData.fare,
      distance: deliveryData.distance,
      vehicleType: deliveryData.vehicleType,
      packageDetails: deliveryData.packageDetails,
      recipientPhoneNumber: deliveryData.recipientPhoneNumber,
      
      status: deliveryData.status,
      deliveryStatus: deliveryData.deliveryStatus,
      
      createdAt: deliveryData.createdAt,
      expiresAt: deliveryData.expiresAt,
      driverArrivedAt: deliveryData.driverArrivedAt,
      deliveryCompletedAt: deliveryData.deliveryCompletedAt,
      deliveryPhotoUrl: deliveryData.deliveryPhotoUrl,
      customerConfirmedAt: deliveryData.customerConfirmedAt,
      autoConfirmedAt: deliveryData.autoConfirmedAt,
      
      commissionTaken: deliveryData.commissionTaken,
      commissionAmount: deliveryData.commissionAmount,
      
      driver: driverDetails,
      customer: customerDetails
    });

  } catch (error) {
    console.error('❌ Error fetching delivery details:', error);
    return Response.json({ 
      error: 'Failed to fetch delivery details',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}