import { db } from '@/src/db';
import { driversTable } from '@/src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

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
    // Stringify the location object properly
    const locationString = JSON.stringify(location);
    
    await db.update(driversTable)
      .set({ 
        lastLocation: sql`${locationString}`, // Directly pass the stringified JSON
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(driversTable.id, driverId));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating driver location:', error);
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}