//app/api/customer/restaurants/orders/[orderId]/cancel/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import { merchantOrdersTable } from '@/src/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> } // params is a Promise
) {
  try {
    // Await the params before using them
    const { orderId } = await params;
    const orderIdNum = parseInt(orderId);
    
    // First, check if order can be cancelled
    const [order] = await db
      .select({
        status: merchantOrdersTable.status,
      })
      .from(merchantOrdersTable)
      .where(eq(merchantOrdersTable.id, orderIdNum))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if order can be cancelled (only pending or confirmed orders)
    if (order.status !== 'pending' && order.status !== 'confirmed') {
      return NextResponse.json({ 
        error: 'Order cannot be cancelled at this stage' 
      }, { status: 400 });
    }

    // Update order status to cancelled
    const [updatedOrder] = await db
      .update(merchantOrdersTable)
      .set({
        status: 'cancelled',
        statusHistory: sql`json_array(
          CASE 
            WHEN ${merchantOrdersTable.statusHistory} IS NOT NULL 
            THEN json(${merchantOrdersTable.statusHistory})
            ELSE json_array()
          END,
          json_object(
            'status', 'cancelled',
            'timestamp', ${new Date().toISOString()},
            'note', 'Cancelled by customer'
          )
        )`,
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(merchantOrdersTable.id, orderIdNum))
      .returning();

    return NextResponse.json({ 
      success: true, 
      order: updatedOrder,
      message: 'Order cancelled successfully' 
    });

  } catch (error) {
    console.error('Error cancelling order:', error);
    return NextResponse.json({ 
      error: 'Failed to cancel order' 
    }, { status: 500 });
  }
}