//app/api/drivers/nearby/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { driversTable, driverRatingsTable } from '@/src/db/schema';
import { eq, and, sql, isNotNull, or } from 'drizzle-orm';

// Helper function to calculate approximate distance (Haversine)
const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const toRad = (degree: number) => degree * (Math.PI / 180);
  const R = 6371; // Earth's radius in km

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Vehicle compatibility mapping
const VEHICLE_COMPATIBILITY = {
  motorcycle: ['motorcycle'], // Motorcycles can only handle motorcycle requests
  car: ['motorcycle', 'car'], // Cars can handle motorcycle and car requests
  truck: ['truck'] // Trucks can only handle truck requests
} as const;

// Get compatible vehicle types
const getCompatibleVehicleTypes = (requestedVehicle: string): string[] => {
  switch (requestedVehicle) {
    case 'motorcycle':
      return ['motorcycle', 'car']; // Motorcycle requests can be handled by motorcycles AND cars
    case 'car':
      return ['car']; // Car requests can only be handled by cars (not trucks)
    case 'truck':
      return ['truck']; // Truck requests can only be handled by trucks
    default:
      return ['motorcycle', 'car', 'truck']; // Show all if no specific type
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userLat = parseFloat(searchParams.get('lat') || '0');
    const userLng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseFloat(searchParams.get('radius') || '5');
    const vehicleType = searchParams.get('vehicleType'); // Get requested vehicle type

    console.log('Fetching nearby drivers with params:', { 
      userLat, 
      userLng, 
      radius, 
      vehicleType 
    });

    if (isNaN(userLat) || isNaN(userLng) || userLat === 0 || userLng === 0) {
      return NextResponse.json(
        { error: 'Valid location parameters are required' },
        { status: 400 }
      );
    }

    if (isNaN(radius) || radius <= 0 || radius > 100) {
      return NextResponse.json(
        { error: 'Radius must be a positive number between 1 and 100 kilometers' },
        { status: 400 }
      );
    }

    // Subquery for average ratings
    const avgRatingSubquery = db
      .select({
        driverId: driverRatingsTable.driverId,
        averageRating: sql`coalesce(avg(${driverRatingsTable.rating}), 0)`.as(
          'averageRating'
        ),
        totalRatings: sql`count(*)`.as('totalRatings'),
      })
      .from(driverRatingsTable)
      .groupBy(driverRatingsTable.driverId)
      .as('ratings');

    // Get compatible vehicle types
    const compatibleVehicleTypes = vehicleType 
      ? getCompatibleVehicleTypes(vehicleType)
      : ['motorcycle', 'car', 'truck']; // Default to all types

    console.log('Compatible vehicle types for', vehicleType, ':', compatibleVehicleTypes);

    // First get all online drivers with their locations
    let query = db
      .select({
        id: driversTable.id,
        firstName: driversTable.firstName,
        lastName: driversTable.lastName,
        phoneNumber: driversTable.phoneNumber,
        vehicleType: driversTable.vehicleType,
        carName: driversTable.carName,
        numberPlate: driversTable.numberPlate,
        profilePictureUrl: driversTable.profilePictureUrl,
        latitude: driversTable.latitude,
        longitude: driversTable.longitude,
        isOnline: driversTable.isOnline,
        averageRating: sql`coalesce(${avgRatingSubquery.averageRating}, 0)`.as(
          'averageRating'
        ),
        totalRatings: sql`coalesce(${avgRatingSubquery.totalRatings}, 0)`.as(
          'totalRatings'
        ),
      })
      .from(driversTable)
      .leftJoin(avgRatingSubquery, eq(avgRatingSubquery.driverId, driversTable.id))
      .where(
        and(
          eq(driversTable.isOnline, true),
          isNotNull(driversTable.latitude),
          isNotNull(driversTable.longitude),
          // Add vehicle type filter if specified
          ...(compatibleVehicleTypes.length > 0 
            ? [or(...compatibleVehicleTypes.map(type => eq(driversTable.vehicleType, type)))]
            : []
          )
        )
      )
      .limit(100);

    const allDrivers = await query;
    
    console.log('Filtered online drivers found:', allDrivers.length);
    console.log('Driver vehicle types:', allDrivers.map(d => ({ id: d.id, vehicle: d.vehicleType })));

    // Calculate distance and filter nearby
    const driversWithDistance = allDrivers
      .map((driver) => {
        const driverLat = driver.latitude
          ? parseFloat(String(driver.latitude))
          : NaN;
        const driverLng = driver.longitude
          ? parseFloat(String(driver.longitude))
          : NaN;

        const distance = calculateDistance(userLat, userLng, driverLat, driverLng);

        return {
          ...driver,
          distance,
          isOnline: Boolean(driver.isOnline),
          rating: parseFloat(String(driver.averageRating)) || 0,
          totalRatings: parseInt(String(driver.totalRatings)) || 0,
        };
      })
      .filter((driver) => !isNaN(driver.distance) && driver.distance <= radius) // allow distance === 0
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20);

    console.log('Found nearby drivers after distance filter:', driversWithDistance.length);
    
    // Log the final driver types for debugging
    driversWithDistance.forEach(driver => {
      console.log(`Driver ${driver.id}: ${driver.vehicleType} - ${driver.distance.toFixed(2)}km away`);
    });

    return NextResponse.json(driversWithDistance);
  } catch (error) {
    console.error('Error fetching nearby drivers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nearby drivers' },
      { status: 500 }
    );
  }
}