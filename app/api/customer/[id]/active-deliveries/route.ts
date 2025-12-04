//app/api/customer/[id]/active-deliveries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { deliveryRequestsTable, driversTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params
    const { id } = await params;
    const customerId = parseInt(id);
    
    if (isNaN(customerId)) {
      return NextResponse.json(
        { error: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    // Get deliveries for this customer (all statuses for now)
    const deliveries = await db.select({
      id: deliveryRequestsTable.id,
      pickupLocation: deliveryRequestsTable.pickupLocation,
      dropoffLocation: deliveryRequestsTable.dropoffLocation,
      fare: deliveryRequestsTable.fare,
      status: deliveryRequestsTable.status,
      assignedDriverId: deliveryRequestsTable.assignedDriverId,
      createdAt: deliveryRequestsTable.createdAt,
    })
    .from(deliveryRequestsTable)
    .where(
      eq(deliveryRequestsTable.customerId, customerId)
    )
    .orderBy(deliveryRequestsTable.createdAt);

    // Get driver info for each delivery
    const deliveriesWithDrivers = await Promise.all(
      deliveries.map(async (delivery) => {
        let driverInfo = null;
        if (delivery.assignedDriverId) {
          const driver = await db.select({
            id: driversTable.id,
            firstName: driversTable.firstName,
            lastName: driversTable.lastName,
            phoneNumber: driversTable.phoneNumber,
            vehicleType: driversTable.vehicleType,
            profilePictureUrl: driversTable.profilePictureUrl,
          })
          .from(driversTable)
          .where(eq(driversTable.id, delivery.assignedDriverId))
          .get();
          
          if (driver) {
            driverInfo = {
              id: driver.id,
              firstName: driver.firstName,
              lastName: driver.lastName,
              phoneNumber: driver.phoneNumber,
              vehicleType: driver.vehicleType,
              profilePictureUrl: driver.profilePictureUrl,
            };
          }
        }

        return {
          id: delivery.id,
          pickupLocation: delivery.pickupLocation,
          dropoffLocation: delivery.dropoffLocation,
          fare: delivery.fare,
          status: delivery.status,
          assignedDriverId: delivery.assignedDriverId,
          createdAt: delivery.createdAt,
          driver: driverInfo,
        };
      })
    );

    return NextResponse.json({ 
      success: true,
      customerId,
      deliveries: deliveriesWithDrivers,
      count: deliveriesWithDrivers.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching customer deliveries:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch deliveries',
        deliveries: [],
        count: 0
      },
      { status: 500 }
    );
  }
}