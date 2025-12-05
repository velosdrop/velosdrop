// app/api/admin/chats/[deliveryId]/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { 
  messagesTable, 
  deliveryRequestsTable, 
  customersTable, 
  driversTable 
} from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deliveryId: string }> } // ✅ Correct for Next.js 15
) {
  try {
    // ✅ Await the params Promise
    const { deliveryId } = await params;
    
    const deliveryIdNum = parseInt(deliveryId);
    
    if (isNaN(deliveryIdNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid delivery ID' },
        { status: 400 }
      );
    }

    // Get delivery details
    const delivery = await db
      .select({
        delivery: deliveryRequestsTable,
        customer: customersTable,
        driver: driversTable
      })
      .from(deliveryRequestsTable)
      .leftJoin(customersTable, eq(deliveryRequestsTable.customerId, customersTable.id))
      .leftJoin(driversTable, eq(deliveryRequestsTable.assignedDriverId, driversTable.id))
      .where(eq(deliveryRequestsTable.id, deliveryIdNum))
      .limit(1);

    if (!delivery || delivery.length === 0 || !delivery[0]) {
      return NextResponse.json(
        { success: false, error: 'Delivery not found' },
        { status: 404 }
      );
    }

    const deliveryData = delivery[0];
    
    // Get all messages
    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.deliveryId, deliveryIdNum))
      .orderBy(messagesTable.createdAt);

    const chatData = {
      exportDate: new Date().toISOString(),
      deliveryId: deliveryIdNum,
      deliveryDetails: {
        ...deliveryData.delivery,
        customer: deliveryData.customer ? {
          id: deliveryData.customer.id,
          username: deliveryData.customer.username || 'Unknown',
          phoneNumber: deliveryData.customer.phoneNumber || 'Unknown'
        } : {
          id: 0,
          username: 'Unknown Customer',
          phoneNumber: 'Unknown'
        },
        driver: deliveryData.driver ? {
          id: deliveryData.driver.id,
          name: `${deliveryData.driver.firstName || ''} ${deliveryData.driver.lastName || ''}`.trim() || 'Unknown Driver',
          phoneNumber: deliveryData.driver.phoneNumber || 'Unknown'
        } : null
      },
      messages: messages.map(msg => ({
        ...msg,
        createdAt: new Date(msg.createdAt).toLocaleString()
      })),
      statistics: {
        totalMessages: messages.length,
        textMessages: messages.filter(m => m.messageType === 'text').length,
        imageMessages: messages.filter(m => m.messageType === 'image').length,
        locationMessages: messages.filter(m => m.messageType === 'location').length,
        firstMessage: messages[0]?.createdAt || null,
        lastMessage: messages[messages.length - 1]?.createdAt || null
      }
    };

    return NextResponse.json({
      success: true,
      chatData
    });
  } catch (error) {
    console.error('Error exporting chat:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export chat' },
      { status: 500 }
    );
  }
}