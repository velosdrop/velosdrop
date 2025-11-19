// app/api/customer/orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { deliveryRequestsTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);
    
    console.log('🗑️ Attempting to delete order:', orderId);

    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    // First, check if the order exists
    const order = await db.query.deliveryRequestsTable.findFirst({
      where: eq(deliveryRequestsTable.id, orderId),
      columns: {
        id: true,
        status: true,
        customerId: true
      }
    });

    if (!order) {
      console.log('❌ Order not found:', orderId);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log('📋 Order found with status:', order.status);

    // Delete the order regardless of status
    await db
      .delete(deliveryRequestsTable)
      .where(eq(deliveryRequestsTable.id, orderId));

    console.log('✅ Order deleted successfully:', orderId);

    return NextResponse.json({ 
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}