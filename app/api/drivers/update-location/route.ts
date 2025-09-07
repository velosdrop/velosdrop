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

  // Validate location structure
  if (typeof location !== 'object' || !location.latitude || !location.longitude) {
    return NextResponse.json(
      { error: 'Invalid location format' },
      { status: 400 }
    );
  }

  try {
    // Stringify the location object for lastLocation field
    const locationString = JSON.stringify(location);
    
    // Update both the JSON field and separate latitude/longitude columns
    await db.update(driversTable)
      .set({ 
        lastLocation: sql`${locationString}`,
        latitude: location.latitude,
        longitude: location.longitude,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(driversTable.id, driverId));
    
    // Get updated driver data
    const updatedDriver = await db.select()
      .from(driversTable)
      .where(eq(driversTable.id, driverId))
      .limit(1);
    
    // Broadcast the update to all connected clients
    if (updatedDriver.length > 0) {
      broadcastDriverUpdate({
        type: 'LOCATION_UPDATE',
        driver: updatedDriver[0]
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