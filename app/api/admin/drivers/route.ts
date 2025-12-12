//app/api/admin/drivers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { driversTable, driverRatingsTable, deliveryRequestsTable, driverCommissionDeductions } from '@/src/db/schema';
import { eq, sql } from 'drizzle-orm';

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

        // Get TOTAL deliveries assigned (all statuses)
        totalDeliveriesAssigned: sql<number>`(
          SELECT COUNT(*) FROM ${deliveryRequestsTable} 
          WHERE ${deliveryRequestsTable.assignedDriverId} = ${driversTable.id}
        )`.as('totalDeliveriesAssigned'),

        // Get COMPLETED deliveries count
        completedDeliveries: sql<number>`(
          SELECT COUNT(*) FROM ${deliveryRequestsTable} 
          WHERE ${deliveryRequestsTable.assignedDriverId} = ${driversTable.id}
          AND ${deliveryRequestsTable.status} = 'completed'
          AND ${deliveryRequestsTable.deliveryStatus} = 'completed'
        )`.as('completedDeliveries'),

        // Get PENDING deliveries count
        pendingDeliveries: sql<number>`(
          SELECT COUNT(*) FROM ${deliveryRequestsTable} 
          WHERE ${deliveryRequestsTable.assignedDriverId} = ${driversTable.id}
          AND ${deliveryRequestsTable.status} = 'pending'
        )`.as('pendingDeliveries'),

        // Get IN_PROGRESS deliveries count
        inProgressDeliveries: sql<number>`(
          SELECT COUNT(*) FROM ${deliveryRequestsTable} 
          WHERE ${deliveryRequestsTable.assignedDriverId} = ${driversTable.id}
          AND ${deliveryRequestsTable.status} = 'in_progress'
        )`.as('inProgressDeliveries'),

        // Get average rating (only for completed deliveries with ratings)
        averageRating: sql<number>`(
          SELECT COALESCE(AVG(${driverRatingsTable.rating}), 0) FROM ${driverRatingsTable}
          WHERE ${driverRatingsTable.driverId} = ${driversTable.id}
        )`.as('averageRating'),

        // Get total earnings from COMPLETED deliveries (after commission)
        totalEarnings: sql<number>`(
          SELECT COALESCE(SUM(${driverCommissionDeductions.fare_amount} - ${driverCommissionDeductions.commission_amount}), 0) 
          FROM ${driverCommissionDeductions}
          WHERE ${driverCommissionDeductions.driver_id} = ${driversTable.id}
          AND ${driverCommissionDeductions.status} = 'completed'
        )`.as('totalEarnings'),

        // Get total fare value of completed deliveries
        totalFareValue: sql<number>`(
          SELECT COALESCE(SUM(${deliveryRequestsTable.fare}), 0) 
          FROM ${deliveryRequestsTable}
          WHERE ${deliveryRequestsTable.assignedDriverId} = ${driversTable.id}
          AND ${deliveryRequestsTable.status} = 'completed'
          AND ${deliveryRequestsTable.deliveryStatus} = 'completed'
        )`.as('totalFareValue'),

        // Get total commission paid
        totalCommissionPaid: sql<number>`(
          SELECT COALESCE(SUM(${driverCommissionDeductions.commission_amount}), 0) 
          FROM ${driverCommissionDeductions}
          WHERE ${driverCommissionDeductions.driver_id} = ${driversTable.id}
          AND ${driverCommissionDeductions.status} = 'completed'
        )`.as('totalCommissionPaid'),

        // Get last delivery date
        lastDeliveryDate: sql<string>`(
          SELECT MAX(${deliveryRequestsTable.createdAt}) 
          FROM ${deliveryRequestsTable}
          WHERE ${deliveryRequestsTable.assignedDriverId} = ${driversTable.id}
          AND ${deliveryRequestsTable.status} = 'completed'
        )`.as('lastDeliveryDate'),

        // Get on-time delivery rate (deliveries completed before expiresAt)
        onTimeDeliveries: sql<number>`(
          SELECT COUNT(*) FROM ${deliveryRequestsTable} 
          WHERE ${deliveryRequestsTable.assignedDriverId} = ${driversTable.id}
          AND ${deliveryRequestsTable.status} = 'completed'
          AND ${deliveryRequestsTable.deliveryCompletedAt} IS NOT NULL
          AND datetime(${deliveryRequestsTable.deliveryCompletedAt}) <= datetime(${deliveryRequestsTable.expiresAt})
        )`.as('onTimeDeliveries'),
      })
      .from(driversTable)
      .orderBy(driversTable.createdAt);

    // Transform the data to ensure proper formatting and calculations
    const formattedDrivers = drivers.map(driver => {
      const totalDeliveriesAssigned = Number(driver.totalDeliveriesAssigned) || 0;
      const completedDeliveries = Number(driver.completedDeliveries) || 0;
      const pendingDeliveries = Number(driver.pendingDeliveries) || 0;
      const inProgressDeliveries = Number(driver.inProgressDeliveries) || 0;
      const onTimeDeliveries = Number(driver.onTimeDeliveries) || 0;
      
      // Calculate completion rate
      const completionRate = totalDeliveriesAssigned > 0 
        ? (completedDeliveries / totalDeliveriesAssigned) * 100 
        : 0;
      
      // Calculate on-time delivery rate
      const onTimeRate = completedDeliveries > 0 
        ? (onTimeDeliveries / completedDeliveries) * 100 
        : 0;

      return {
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
        
        // Delivery statistics
        totalDeliveries: totalDeliveriesAssigned, // All assigned deliveries
        completedDeliveries, // Only completed deliveries
        pendingDeliveries,
        inProgressDeliveries,
        
        // Ratings and earnings
        averageRating: Number(driver.averageRating) || 0,
        totalEarnings: Number(driver.totalEarnings) || 0,
        totalFareValue: Number(driver.totalFareValue) || 0,
        totalCommissionPaid: Number(driver.totalCommissionPaid) || 0,
        
        // Performance metrics
        completionRate: Math.round(completionRate),
        onTimeRate: Math.round(onTimeRate),
        onTimeDeliveries,
        
        // Dates
        lastDeliveryDate: driver.lastDeliveryDate || null,
        
        // For backward compatibility (use completedDeliveries for totalDeliveries in UI)
        // This ensures existing components continue to work
        totalDeliveriesDisplay: completedDeliveries,
      };
    });

    return NextResponse.json({ 
      success: true, 
      drivers: formattedDrivers,
      stats: {
        totalDrivers: formattedDrivers.length,
        activeDrivers: formattedDrivers.filter(d => d.status === 'active').length,
        onlineDrivers: formattedDrivers.filter(d => d.isOnline).length,
        totalCompletedDeliveries: formattedDrivers.reduce((sum, d) => sum + d.completedDeliveries, 0),
        totalEarnings: formattedDrivers.reduce((sum, d) => sum + d.totalEarnings, 0),
      }
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
      message: `Driver status updated to ${status} successfully`,
      driver: {
        id: driverId,
        status: status,
        isOnline: status === 'suspended' ? false : existingDriver.isOnline
      }
    });
  } catch (error) {
    console.error('Error updating driver status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update driver status' },
      { status: 500 }
    );
  }
}

// New endpoint to get driver details with more statistics
export async function POST(request: NextRequest) {
  try {
    const { driverId } = await request.json();

    if (!driverId) {
      return NextResponse.json(
        { success: false, error: 'Driver ID is required' },
        { status: 400 }
      );
    }

    // Get driver with detailed statistics
    const [driver] = await db
      .select({
        id: driversTable.id,
        phoneNumber: driversTable.phoneNumber,
        firstName: driversTable.firstName,
        lastName: driversTable.lastName,
        email: driversTable.email,
        profilePictureUrl: driversTable.profilePictureUrl,
        balance: driversTable.balance,
        
        // Document URLs
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

        // License and registration
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

        // Recent deliveries (last 10)
        recentDeliveries: sql<string>`(
          SELECT json_group_array(json_object(
            'id', id,
            'fare', fare,
            'status', status,
            'deliveryStatus', deliveryStatus,
            'createdAt', createdAt,
            'completedAt', deliveryCompletedAt,
            'pickupAddress', pickupAddress,
            'dropoffAddress', dropoffAddress
          ))
          FROM (
            SELECT * FROM ${deliveryRequestsTable}
            WHERE ${deliveryRequestsTable.assignedDriverId} = ${driversTable.id}
            ORDER BY ${deliveryRequestsTable.createdAt} DESC
            LIMIT 10
          )
        )`.as('recentDeliveries'),

        // Monthly earnings breakdown
        monthlyEarnings: sql<string>`(
          SELECT json_group_array(json_object(
            'month', month,
            'earnings', earnings,
            'deliveries', deliveries
          ))
          FROM (
            SELECT 
              strftime('%Y-%m', ${deliveryRequestsTable.createdAt}) as month,
              SUM(${deliveryRequestsTable.fare} * 0.865) as earnings,
              COUNT(*) as deliveries
            FROM ${deliveryRequestsTable}
            WHERE ${deliveryRequestsTable.assignedDriverId} = ${driversTable.id}
            AND ${deliveryRequestsTable.status} = 'completed'
            GROUP BY strftime('%Y-%m', ${deliveryRequestsTable.createdAt})
            ORDER BY month DESC
            LIMIT 6
          )
        )`.as('monthlyEarnings'),
      })
      .from(driversTable)
      .where(eq(driversTable.id, driverId))
      .limit(1);

    if (!driver) {
      return NextResponse.json(
        { success: false, error: 'Driver not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const recentDeliveries = driver.recentDeliveries ? JSON.parse(driver.recentDeliveries) : [];
    const monthlyEarnings = driver.monthlyEarnings ? JSON.parse(driver.monthlyEarnings) : [];

    return NextResponse.json({
      success: true,
      driver: {
        ...driver,
        recentDeliveries,
        monthlyEarnings,
      }
    });
  } catch (error) {
    console.error('Error fetching driver details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch driver details' },
      { status: 500 }
    );
  }
}