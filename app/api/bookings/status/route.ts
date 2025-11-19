//app/api/bookings/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { deliveryRequestsTable, driversTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    
    if (!requestId || isNaN(parseInt(requestId))) {
      return NextResponse.json(
        { error: 'Valid Request ID is required' },
        { status: 400 }
      );
    }
    
    // USE MANUAL JOIN INSTEAD OF with CLAUSE
    const result = await db
      .select({
        request: deliveryRequestsTable,
        driver: driversTable
      })
      .from(deliveryRequestsTable)
      .leftJoin(driversTable, eq(deliveryRequestsTable.assignedDriverId, driversTable.id))
      .where(eq(deliveryRequestsTable.id, parseInt(requestId)))
      .then(results => results[0]);

    if (!result || !result.request) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      status: result.request.status,
      driver: result.driver || null,
      request: result.request
    });
    
  } catch (error) {
    console.error('Error checking booking status:', error);
    return NextResponse.json(
      { error: 'Failed to check booking status' },
      { status: 500 }
    );
  }
}