//app/api/admin/drivers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { driversTable, driverRatingsTable, deliveryRequestsTable, driverCommissionDeductions } from '@/src/db/schema';
import { eq, sql, and, or } from 'drizzle-orm';
import { hash } from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverIdParam = searchParams.get('id');

    // =================================================================================
    // SCENARIO 1: GET SINGLE DRIVER DETAILS (Originally your second POST)
    // Usage: /api/admin/drivers?id=123
    // =================================================================================
    if (driverIdParam) {
      const driverId = parseInt(driverIdParam);

      if (isNaN(driverId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid Driver ID' },
          { status: 400 }
        );
      }

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
    }

    // =================================================================================
    // SCENARIO 2: GET ALL DRIVERS LIST (Your original GET)
    // Usage: /api/admin/drivers
    // =================================================================================
    
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Received driver data:', body);
    
    // Validate required fields based on your schema
    const requiredFields = [
      'firstName', 'lastName', 'email', 'phoneNumber', 'password',
      'vehicleType', 'carName', 'numberPlate', 'licenseExpiry', 'registrationExpiry'
    ];
    
    const missingFields = requiredFields.filter(field => !body[field] || body[field].trim() === '');
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}`,
          missingFields 
        },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const existingDriver = await db.query.driversTable.findFirst({
      where: (drivers, { eq }) => eq(drivers.email, body.email)
    });
    
    if (existingDriver) {
      return NextResponse.json(
        { success: false, error: 'A driver with this email already exists' },
        { status: 409 }
      );
    }
    
    // Check if phone number already exists
    const existingPhone = await db.query.driversTable.findFirst({
      where: (drivers, { eq }) => eq(drivers.phoneNumber, body.phoneNumber)
    });
    
    if (existingPhone) {
      return NextResponse.json(
        { success: false, error: 'A driver with this phone number already exists' },
        { status: 409 }
      );
    }
    
    // Hash password
    const hashedPassword = await hash(body.password, 12);
    
    // Validate dates
    const today = new Date();
    const licenseExpiry = new Date(body.licenseExpiry);
    const registrationExpiry = new Date(body.registrationExpiry);
    
    if (licenseExpiry <= today) {
      return NextResponse.json(
        { success: false, error: 'Driver license must be future dated' },
        { status: 400 }
      );
    }
    
    if (registrationExpiry <= today) {
      return NextResponse.json(
        { success: false, error: 'Vehicle registration must be future dated' },
        { status: 400 }
      );
    }
    
    // Create driver data object matching your schema
    const driverData = {
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email: body.email.trim(),
      phoneNumber: body.phoneNumber.trim(),
      password: hashedPassword,
      
      // Vehicle details
      vehicleType: body.vehicleType,
      carName: body.carName.trim(),
      numberPlate: body.numberPlate.trim().toUpperCase(),
      
      // License and registration
      licenseExpiry: body.licenseExpiry,
      registrationExpiry: body.registrationExpiry,
      
      // Status and balance
      status: body.status || 'pending',
      balance: body.balance || 0,
      isOnline: false, // Default to offline
      
      // Optional fields with defaults
      profilePictureUrl: body.profilePictureUrl || '',
      licenseFrontUrl: body.licenseFrontUrl || '',
      licenseBackUrl: body.licenseBackUrl || '',
      registrationFrontUrl: body.registrationFrontUrl || '',
      registrationBackUrl: body.registrationBackUrl || '',
      nationalIdFrontUrl: body.nationalIdFrontUrl || '',
      nationalIdBackUrl: body.nationalIdBackUrl || '',
      vehicleFrontUrl: body.vehicleFrontUrl || '',
      vehicleBackUrl: body.vehicleBackUrl || '',
      
      // Location fields
      lastLocation: null,
      latitude: null,
      longitude: null,
      lastOnline: new Date().toISOString(),
      
      // Timestamps will be auto-generated by database defaults
    };
    
    console.log('Inserting driver data:', driverData);
    
    // Insert into database
    const [driver] = await db.insert(driversTable).values(driverData).returning();
    
    console.log('Driver created successfully:', driver.id);
    
    // Return the created driver without password
    return NextResponse.json({
      success: true,
      driver: {
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        email: driver.email,
        phoneNumber: driver.phoneNumber,
        status: driver.status,
        vehicleType: driver.vehicleType,
        carName: driver.carName,
        numberPlate: driver.numberPlate,
        licenseExpiry: driver.licenseExpiry,
        registrationExpiry: driver.registrationExpiry,
        balance: driver.balance,
        isOnline: driver.isOnline,
        createdAt: driver.createdAt,
        updatedAt: driver.updatedAt
      },
      message: 'Driver added successfully'
    });
    
  } catch (error) {
    console.error('Error adding driver:', error);
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return NextResponse.json(
          { success: false, error: 'Email or phone number already exists' },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to add driver. Please try again.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('id');

    if (!driverId) {
      return NextResponse.json(
        { success: false, error: 'Driver ID is required' },
        { status: 400 }
      );
    }

    // Check if driver exists
    const existingDriver = await db.query.driversTable.findFirst({
      where: eq(driversTable.id, parseInt(driverId)),
    });

    if (!existingDriver) {
      return NextResponse.json(
        { success: false, error: 'Driver not found' },
        { status: 404 }
      );
    }

    // Check if driver has any active deliveries
    const activeDeliveries = await db.query.deliveryRequestsTable.findFirst({
      where: (deliveries, { eq, and, or }) => 
        and(
          eq(deliveries.assignedDriverId, parseInt(driverId)),
          or(
            eq(deliveries.status, 'pending'),
            eq(deliveries.status, 'in_progress')
          )
        )
    });

    if (activeDeliveries) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete driver with active deliveries. Please reassign or complete deliveries first.' 
        },
        { status: 400 }
      );
    }

    // Delete driver (cascade will handle related records based on your schema)
    await db
      .delete(driversTable)
      .where(eq(driversTable.id, parseInt(driverId)));

    return NextResponse.json({ 
      success: true, 
      message: 'Driver deleted successfully',
      driverId: parseInt(driverId)
    });
  } catch (error) {
    console.error('Error deleting driver:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete driver' },
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

    // Validate status values based on your database schema
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

    // If suspending a driver, also set them offline
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