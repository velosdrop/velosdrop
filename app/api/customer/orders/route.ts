// app/api/customer/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { deliveryRequestsTable, driversTable } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    // Fetch orders with driver information
    const orders = await db
      .select({
        id: deliveryRequestsTable.id,
        customerId: deliveryRequestsTable.customerId,
        driverId: deliveryRequestsTable.assignedDriverId,
        status: deliveryRequestsTable.status,
        pickupLocation: deliveryRequestsTable.pickupLocation,
        dropoffLocation: deliveryRequestsTable.dropoffLocation,
        fare: deliveryRequestsTable.fare,
        distance: deliveryRequestsTable.distance,
        packageDetails: deliveryRequestsTable.packageDetails,
        recipientPhoneNumber: deliveryRequestsTable.recipientPhoneNumber,
        createdAt: deliveryRequestsTable.createdAt,
        driver: {
          firstName: driversTable.firstName,
          lastName: driversTable.lastName,
          profilePictureUrl: driversTable.profilePictureUrl,
          carName: driversTable.carName,
          numberPlate: driversTable.numberPlate,
          phoneNumber: driversTable.phoneNumber,
        }
      })
      .from(deliveryRequestsTable)
      .leftJoin(driversTable, eq(deliveryRequestsTable.assignedDriverId, driversTable.id))
      .where(eq(deliveryRequestsTable.customerId, parseInt(customerId)))
      .orderBy(desc(deliveryRequestsTable.createdAt));

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}