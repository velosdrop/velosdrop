// app/api/driver/update-location/route.ts
import { db } from '@/src/db';
import { driversTable } from '@/src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { broadcastDriverUpdate } from "@/lib/sse";

export async function POST(request: Request) {
  const { driverId, location } = await request.json();

  if (!driverId || !location) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Ensure lat/lng exist
  if (
    typeof location !== 'object' ||
    location.latitude === undefined ||
    location.longitude === undefined
  ) {
    return NextResponse.json(
      { error: 'Invalid location format' },
      { status: 400 }
    );
  }

  // Parse and validate lat/lng
  const latitude = parseFloat(String(location.latitude));
  const longitude = parseFloat(String(location.longitude));

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { error: 'Latitude and longitude must be valid numbers' },
      { status: 400 }
    );
  }

  try {
    // Stringify the normalized location object
    const locationString = JSON.stringify({ latitude, longitude });

    // Update the DB (numbers guaranteed)
    await db
      .update(driversTable)
      .set({
        lastLocation: sql`${locationString}`,
        latitude,
        longitude,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(driversTable.id, driverId));

    // Fetch updated driver
    const updatedDriver = await db
      .select()
      .from(driversTable)
      .where(eq(driversTable.id, driverId))
      .limit(1);

    // Broadcast location update
    if (updatedDriver.length > 0) {
      broadcastDriverUpdate({
        type: 'LOCATION_UPDATE',
        driver: updatedDriver[0],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating driver location:', error);
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}
