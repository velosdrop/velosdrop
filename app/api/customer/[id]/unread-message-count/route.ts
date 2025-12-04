//app/api/customer/[id]/unread-message-count/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { deliveryRequestsTable, messagesTable } from '@/src/db/schema';
import { eq, and, count } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params
    const { id } = await params;
    const customerId = parseInt(id);
    
    if (isNaN(customerId)) {
      return NextResponse.json(
        { error: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    // Get deliveries for this customer
    const deliveries = await db.select({
      id: deliveryRequestsTable.id,
    })
    .from(deliveryRequestsTable)
    .where(
      eq(deliveryRequestsTable.customerId, customerId)
    );

    let totalUnread = 0;
    
    // Count unread messages for each delivery
    for (const delivery of deliveries) {
      const unreadCountResult = await db
        .select({ count: count() })
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.deliveryId, delivery.id),
            eq(messagesTable.senderType, 'driver'),
            eq(messagesTable.isRead, false)
          )
        )
        .get();
      
      totalUnread += unreadCountResult?.count || 0;
    }

    return NextResponse.json({ 
      success: true,
      customerId,
      count: totalUnread,
      deliveriesCount: deliveries.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching unread message count:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch unread message count',
        count: 0 
      },
      { status: 500 }
    );
  }
}