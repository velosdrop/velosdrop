// app/api/admin/drivers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { driversTable, driverRatingsTable, deliveryRequestsTable } from '@/src/db/schema';
import { eq, sql, and, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get all drivers with their stats
    const drivers = await db
      .select({
        id: driversTable.id,
        phoneNumber: driversTable.phoneNumber,
        firstName: driversTable.firstName,
        lastName: driversTable.lastName,
        email: driversTable.email,
        profilePictureUrl: driversTable.profilePictureUrl,
        balance: driversTable.balance,
        vehicleType: driversTable.vehicleType,
        carName: driversTable.carName,
        numberPlate: driversTable.numberPlate,
        licenseExpiry: driversTable.licenseExpiry,
        registrationExpiry: driversTable.registrationExpiry,
        isOnline: driversTable.isOnline,
        lastLocation: driversTable.lastLocation,
        latitude: driversTable.latitude,
        longitude: driversTable.longitude,
        lastOnline: driversTable.lastOnline,
        status: driversTable.status,
        createdAt: driversTable.createdAt,
        updatedAt: driversTable.updatedAt,
        // Get total deliveries count
        totalDeliveries: sql<number>`(
          SELECT COUNT(*) FROM ${deliveryRequestsTable} 
          WHERE ${deliveryRequestsTable.assignedDriverId} = ${driversTable.id}
          AND ${deliveryRequestsTable.status} = 'completed'
        )`,
        // Get average rating
        averageRating: sql<number>`(
          SELECT AVG(${driverRatingsTable.rating}) FROM ${driverRatingsTable}
          WHERE ${driverRatingsTable.driverId} = ${driversTable.id}
        )`,
        // Get total earnings (sum of completed delivery fares)
        totalEarnings: sql<number>`(
          SELECT COALESCE(SUM(${deliveryRequestsTable.fare}), 0) FROM ${deliveryRequestsTable}
          WHERE ${deliveryRequestsTable.assignedDriverId} = ${driversTable.id}
          AND ${deliveryRequestsTable.status} = 'completed'
        )`,
      })
      .from(driversTable)
      .orderBy(driversTable.createdAt);

    return NextResponse.json({ 
      success: true, 
      drivers 
    });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch drivers' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { driverId, status } = await request.json();

    if (!driverId || !status) {
      return NextResponse.json(
        { success: false, error: 'Driver ID and status are required' },
        { status: 400 }
      );
    }

    // Update driver status
    await db
      .update(driversTable)
      .set({ 
        status,
        updatedAt: new Date().toISOString()
      })
      .where(eq(driversTable.id, driverId));

    return NextResponse.json({ 
      success: true, 
      message: 'Driver status updated successfully' 
    });
  } catch (error) {
    console.error('Error updating driver status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update driver status' },
      { status: 500 }
    );
  }
}