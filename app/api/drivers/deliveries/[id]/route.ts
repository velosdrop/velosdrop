// app/api/drivers/deliveries/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { deliveryRequestsTable, driverResponsesTable } from '@/src/db/schema';
import { and, eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const resolvedParams = await params;
    const deliveryId = parseInt(resolvedParams.id);
    const { driverId } = await request.json();

    if (!driverId || isNaN(deliveryId)) {
      return NextResponse.json(
        { error: 'Valid driver ID and delivery ID are required' },
        { status: 400 }
      );
    }

    // Check if the delivery belongs to the driver
    const delivery = await db
      .select()
      .from(deliveryRequestsTable)
      .where(
        and(
          eq(deliveryRequestsTable.id, deliveryId),
          eq(deliveryRequestsTable.assignedDriverId, driverId)
        )
      )
      .then(results => results[0]);

    if (!delivery) {
      return NextResponse.json(
        { error: 'Delivery not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    // Delete driver responses first (due to foreign key constraints)
    await db
      .delete(driverResponsesTable)
      .where(eq(driverResponsesTable.requestId, deliveryId));

    // Delete the delivery request
    await db
      .delete(deliveryRequestsTable)
      .where(eq(deliveryRequestsTable.id, deliveryId));

    return NextResponse.json({ 
      success: true,
      message: 'Delivery deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting delivery:', error);
    return NextResponse.json(
      { error: 'Failed to delete delivery' },
      { status: 500 }
    );
  }
}