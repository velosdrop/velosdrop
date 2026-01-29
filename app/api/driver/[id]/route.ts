// app/api/driver/[id]/route.ts
import { db } from '@/src/db';
import { driverRatingsTable, driversTable } from '@/src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }  // <-- CHANGE THIS LINE
) {
  try {
    // Await the params
    const params = await context.params;  // <-- ADD THIS LINE
    const driverId = parseInt(params.id);
    
    if (isNaN(driverId)) {
      return NextResponse.json(
        { error: 'Invalid driver ID' },
        { status: 400 }
      );
    }

    // Subquery for average ratings
    const avgRatingSubquery = db
      .select({
        driverId: driverRatingsTable.driverId,
        averageRating: sql`coalesce(avg(${driverRatingsTable.rating}), 0)`.as('averageRating'),
        totalRatings: sql`count(*)`.as('totalRatings'),
      })
      .from(driverRatingsTable)
      .groupBy(driverRatingsTable.driverId)
      .as('ratings');

    const driver = await db
      .select({
        id: driversTable.id,
        firstName: driversTable.firstName,
        lastName: driversTable.lastName,
        phoneNumber: driversTable.phoneNumber,
        vehicleType: driversTable.vehicleType,
        carName: driversTable.carName,
        numberPlate: driversTable.numberPlate, // ✅ Include number plate
        profilePictureUrl: driversTable.profilePictureUrl,
        latitude: driversTable.latitude,
        longitude: driversTable.longitude,
        isOnline: driversTable.isOnline,
        averageRating: sql`coalesce(${avgRatingSubquery.averageRating}, 0)`.as('averageRating'),
        totalRatings: sql`coalesce(${avgRatingSubquery.totalRatings}, 0)`.as('totalRatings'),
      })
      .from(driversTable)
      .leftJoin(avgRatingSubquery, eq(avgRatingSubquery.driverId, driversTable.id))
      .where(eq(driversTable.id, driverId))
      .limit(1);

    if (!driver || driver.length === 0) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    const driverData = {
      ...driver[0],
      // Aliases for compatibility
      first_name: driver[0].firstName,
      last_name: driver[0].lastName,
      phone_number: driver[0].phoneNumber,
      vehicle_type: driver[0].vehicleType,
      car_name: driver[0].carName,
      number_plate: driver[0].numberPlate, // ✅ Include alias too
      profile_picture_url: driver[0].profilePictureUrl,
    };

    return NextResponse.json(driverData);
  } catch (error) {
    console.error('Error fetching driver:', error);
    return NextResponse.json(
      { error: 'Failed to fetch driver' },
      { status: 500 }
    );
  }
}