//app/api/messages/read/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { messagesTable } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';

// Mark messages as read
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { messageId, deliveryId, readerId, readerType } = body;

    if (!deliveryId || !readerId || !readerType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Mark specific message as read
    if (messageId) {
      await db.update(messagesTable)
        .set({ isRead: true })
        .where(eq(messagesTable.id, parseInt(messageId)));
      
      console.log(`✅ Message ${messageId} marked as read by ${readerType} ${readerId}`);
    } 
    // Mark all unread messages from other party as read
    else {
      const otherPartyType = readerType === 'driver' ? 'customer' : 'driver';
      
      await db.update(messagesTable)
        .set({ isRead: true })
        .where(
          and(
            eq(messagesTable.deliveryId, parseInt(deliveryId)),
            eq(messagesTable.senderType, otherPartyType),
            eq(messagesTable.isRead, false)
          )
        );
      
      console.log(`✅ All messages from ${otherPartyType} marked as read by ${readerType} ${readerId}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error marking message as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark message as read' },
      { status: 500 }
    );
  }
}