//app/api/admin/drivers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { driversTable, driverRatingsTable, deliveryRequestsTable } from '@/src/db/schema';
import { eq, sql, and, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get all drivers with their stats AND document URLs
    const drivers = await db
      .select({
        id: driversTable.id,
        phoneNumber: driversTable.phoneNumber,
        firstName: driversTable.firstName,
        lastName: driversTable.lastName,
        email: driversTable.email,
        profilePictureUrl: driversTable.profilePictureUrl,
        balance: driversTable.balance,
        
        // ✅ ADDED: Document URLs
        licenseFrontUrl: driversTable.licenseFrontUrl,
        licenseBackUrl: driversTable.licenseBackUrl,
        registrationFrontUrl: driversTable.registrationFrontUrl,
        registrationBackUrl: driversTable.registrationBackUrl,
        nationalIdFrontUrl: driversTable.nationalIdFrontUrl,
        nationalIdBackUrl: driversTable.nationalIdBackUrl,
        vehicleFrontUrl: driversTable.vehicleFrontUrl,
        vehicleBackUrl: driversTable.vehicleBackUrl,

        // Vehicle details
        vehicleType: driversTable.vehicleType,
        carName: driversTable.carName,
        numberPlate: driversTable.numberPlate,

        // License and registration details
        licenseExpiry: driversTable.licenseExpiry,
        registrationExpiry: driversTable.registrationExpiry,

        // Online status
        isOnline: driversTable.isOnline,
        lastLocation: driversTable.lastLocation,
        latitude: driversTable.latitude,
        longitude: driversTable.longitude,
        lastOnline: driversTable.lastOnline,

        // Status and timestamps
        status: driversTable.status,
        createdAt: driversTable.createdAt,
        updatedAt: driversTable.updatedAt,

        // Get total deliveries count
        totalDeliveries: sql<number>`(
          SELECT COUNT(*) FROM ${deliveryRequestsTable} 
          WHERE ${deliveryRequestsTable.assignedDriverId} = ${driversTable.id}
          AND ${deliveryRequestsTable.status} = 'completed'
        )`.as('totalDeliveries'),

        // Get average rating
        averageRating: sql<number>`(
          SELECT COALESCE(AVG(${driverRatingsTable.rating}), 0) FROM ${driverRatingsTable}
          WHERE ${driverRatingsTable.driverId} = ${driversTable.id}
        )`.as('averageRating'),

        // Get total earnings (sum of completed delivery fares)
        totalEarnings: sql<number>`(
          SELECT COALESCE(SUM(${deliveryRequestsTable.fare}), 0) FROM ${deliveryRequestsTable}
          WHERE ${deliveryRequestsTable.assignedDriverId} = ${driversTable.id}
          AND ${deliveryRequestsTable.status} = 'completed'
        )`.as('totalEarnings'),

        // Get completed deliveries count
        completedDeliveries: sql<number>`(
          SELECT COUNT(*) FROM ${deliveryRequestsTable} 
          WHERE ${deliveryRequestsTable.assignedDriverId} = ${driversTable.id}
          AND ${deliveryRequestsTable.status} = 'completed'
        )`.as('completedDeliveries'),
      })
      .from(driversTable)
      .orderBy(driversTable.createdAt);

    // Transform the data to ensure proper formatting
    const formattedDrivers = drivers.map(driver => ({
      ...driver,
      // Ensure document URLs are properly formatted
      licenseFrontUrl: driver.licenseFrontUrl || null,
      licenseBackUrl: driver.licenseBackUrl || null,
      registrationFrontUrl: driver.registrationFrontUrl || null,
      registrationBackUrl: driver.registrationBackUrl || null,
      nationalIdFrontUrl: driver.nationalIdFrontUrl || null,
      nationalIdBackUrl: driver.nationalIdBackUrl || null,
      vehicleFrontUrl: driver.vehicleFrontUrl || null,
      vehicleBackUrl: driver.vehicleBackUrl || null,
      profilePictureUrl: driver.profilePictureUrl || null,
      
      // Ensure numbers are properly formatted
      totalDeliveries: Number(driver.totalDeliveries) || 0,
      averageRating: Number(driver.averageRating) || 0,
      totalEarnings: Number(driver.totalEarnings) || 0,
      completedDeliveries: Number(driver.completedDeliveries) || 0,
      onTimeRate: 98, // Default value, you can calculate this later
    }));

    return NextResponse.json({ 
      success: true, 
      drivers: formattedDrivers 
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

    // ✅ ADDED: Validate status values based on your database schema
    const validStatuses = ['pending', 'active', 'suspended', 'inactive'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid status value. Must be one of: ${validStatuses.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Check if driver exists
    const existingDriver = await db.query.driversTable.findFirst({
      where: eq(driversTable.id, driverId),
    });

    if (!existingDriver) {
      return NextResponse.json(
        { success: false, error: 'Driver not found' },
        { status: 404 }
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

    // ✅ ADDED: If suspending a driver, also set them offline
    if (status === 'suspended') {
      await db
        .update(driversTable)
        .set({ 
          isOnline: false,
          updatedAt: new Date().toISOString()
        })
        .where(eq(driversTable.id, driverId));
    }

    return NextResponse.json({ 
      success: true, 
      message: `Driver status updated to ${status} successfully` 
    });
  } catch (error) {
    console.error('Error updating driver status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update driver status' },
      { status: 500 }
    );
  }
}