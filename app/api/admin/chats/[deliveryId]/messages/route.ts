//app/api/admin/chats/[deliveryId]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { messagesTable, customersTable, driversTable } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deliveryId: string }> }
) {
  try {
    const { deliveryId } = await params;
    const deliveryIdNum = parseInt(deliveryId);
    
    if (isNaN(deliveryIdNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid delivery ID' },
        { status: 400 }
      );
    }

    // Get all messages for this delivery
    const messages = await db
      .select({
        id: messagesTable.id,
        deliveryId: messagesTable.deliveryId,
        senderType: messagesTable.senderType,
        senderId: messagesTable.senderId,
        messageType: messagesTable.messageType,
        content: messagesTable.content,
        imageUrl: messagesTable.imageUrl,
        metadata: messagesTable.metadata,
        isRead: messagesTable.isRead,
        createdAt: messagesTable.createdAt
      })
      .from(messagesTable)
      .where(eq(messagesTable.deliveryId, deliveryIdNum))
      .orderBy(desc(messagesTable.createdAt))
      .limit(100);

    // Enrich messages with sender names
    const enrichedMessages = await Promise.all(
      messages.map(async (message) => {
        let senderName = 'Unknown';
        
        if (message.senderType === 'customer') {
          const customer = await db
            .select({ username: customersTable.username })
            .from(customersTable)
            .where(eq(customersTable.id, message.senderId))
            .limit(1);
          
          senderName = customer[0]?.username || 'Customer';
        } else if (message.senderType === 'driver') {
          const driver = await db
            .select({ 
              firstName: driversTable.firstName,
              lastName: driversTable.lastName
            })
            .from(driversTable)
            .where(eq(driversTable.id, message.senderId))
            .limit(1);
          
          if (driver[0]) {
            senderName = `${driver[0].firstName} ${driver[0].lastName}`;
          }
        } else {
          senderName = 'System';
        }

        return {
          ...message,
          senderName
        };
      })
    );

    return NextResponse.json({
      success: true,
      messages: enrichedMessages.reverse()
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}