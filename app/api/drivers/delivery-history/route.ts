// app/api/drivers/delivery-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { deliveryRequestsTable, driverResponsesTable, customersTable } from '@/src/db/schema';
import { and, eq, desc, or } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');

    if (!driverId || isNaN(parseInt(driverId))) {
      return NextResponse.json(
        { error: 'Valid driver ID is required' },
        { status: 400 }
      );
    }

    // Get all delivery requests where the driver was assigned or responded
    const deliveries = await db
      .select({
        // Delivery request fields
        id: deliveryRequestsTable.id,
        customerId: deliveryRequestsTable.customerId,
        customerUsername: deliveryRequestsTable.customerUsername,
        pickupLocation: deliveryRequestsTable.pickupLocation,
        dropoffLocation: deliveryRequestsTable.dropoffLocation,
        fare: deliveryRequestsTable.fare,
        distance: deliveryRequestsTable.distance,
        packageDetails: deliveryRequestsTable.packageDetails,
        recipientPhoneNumber: deliveryRequestsTable.recipientPhoneNumber,
        status: deliveryRequestsTable.status,
        assignedDriverId: deliveryRequestsTable.assignedDriverId,
        createdAt: deliveryRequestsTable.createdAt,
        
        // Customer fields
        customerPhoneNumber: customersTable.phoneNumber,
        customerProfilePictureUrl: customersTable.profilePictureUrl,
        
        // Driver response fields
        respondedAt: driverResponsesTable.respondedAt,
      })
      .from(deliveryRequestsTable)
      .leftJoin(customersTable, eq(deliveryRequestsTable.customerId, customersTable.id))
      .leftJoin(
        driverResponsesTable,
        and(
          eq(driverResponsesTable.requestId, deliveryRequestsTable.id),
          eq(driverResponsesTable.driverId, parseInt(driverId))
        )
      )
      .where(
        or(
          eq(deliveryRequestsTable.assignedDriverId, parseInt(driverId)),
          eq(driverResponsesTable.driverId, parseInt(driverId))
        )
      )
      .orderBy(desc(deliveryRequestsTable.createdAt));

    return NextResponse.json({
      deliveries: deliveries.map(delivery => ({
        ...delivery,
        // Add completedAt timestamp for completed deliveries
        completedAt: delivery.status === 'completed' ? delivery.respondedAt : undefined
      }))
    });

  } catch (error) {
    console.error('Error fetching delivery history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delivery history' },
      { status: 500 }
    );
  }
}