// app/api/deliveries/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { deliveryRequestsTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { publishBookingStatusUpdate } from '@/lib/pubnub-booking';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // 🔥 FIX: Add Promise wrapper
) {
  try {
    // ✅ Await the params first
    const { id } = await params;  // 🔥 FIX: await params
    const orderId = parseInt(id);
    
    const { status, driverId } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update order status in database
    await db.update(deliveryRequestsTable)
      .set({
        status: status,
        assignedDriverId: driverId || undefined
      })
      .where(eq(deliveryRequestsTable.id, orderId));

    // Publish status update via PubNub
    await publishBookingStatusUpdate(orderId, status, driverId);

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}