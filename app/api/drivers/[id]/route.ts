// app/api/drivers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { driversTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const resolvedParams = await params;
    const driverId = parseInt(resolvedParams.id);

    if (isNaN(driverId)) {
      return NextResponse.json(
        { error: 'Valid driver ID is required' },
        { status: 400 }
      );
    }

    const driver = await db
      .select()
      .from(driversTable)
      .where(eq(driversTable.id, driverId))
      .then(results => results[0]);

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ driver });

  } catch (error) {
    console.error('Error fetching driver info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch driver information' },
      { status: 500 }
    );
  }
}