//app/api/deliveries/active/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { deliveryRequestsTable } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const driverId = searchParams.get('driverId');

    if (!customerId && !driverId) {
      return NextResponse.json(
        { error: 'customerId or driverId is required' },
        { status: 400 }
      );
    }

    let delivery;

    if (customerId) {
      delivery = await db.query.deliveryRequestsTable.findFirst({
        where: and(
          eq(deliveryRequestsTable.customerId, parseInt(customerId)),
          eq(deliveryRequestsTable.status, 'accepted')
        ),
        orderBy: (deliveryRequestsTable, { desc }) => [desc(deliveryRequestsTable.createdAt)],
      });
    } else if (driverId) {
      delivery = await db.query.deliveryRequestsTable.findFirst({
        where: and(
          eq(deliveryRequestsTable.assignedDriverId, parseInt(driverId)),
          eq(deliveryRequestsTable.status, 'accepted')
        ),
        orderBy: (deliveryRequestsTable, { desc }) => [desc(deliveryRequestsTable.createdAt)],
      });
    }

    return NextResponse.json({ 
      delivery: delivery || null,
      hasActiveDelivery: !!delivery 
    });

  } catch (error) {
    console.error('Error fetching active delivery:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active delivery' },
      { status: 500 }
    );
  }
}