//app/api/customer/[id]/unread-message-count/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { deliveryRequestsTable, messagesTable } from '@/src/db/schema';
import { eq, and, count, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);
    
    if (isNaN(customerId)) {
      return NextResponse.json(
        { error: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    // Single optimized query for unread count
    const result = await db
      .select({ count: count() })
      .from(messagesTable)
      .innerJoin(
        deliveryRequestsTable,
        eq(messagesTable.deliveryId, deliveryRequestsTable.id)
      )
      .where(
        and(
          eq(deliveryRequestsTable.customerId, customerId),
          eq(messagesTable.senderType, 'driver'),
          eq(messagesTable.isRead, false)
        )
      )
      .get();

    return NextResponse.json({ 
      success: true,
      customerId,
      count: result?.count || 0,
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