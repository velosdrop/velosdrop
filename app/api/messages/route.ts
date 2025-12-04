//app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { messagesTable } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET messages for a delivery
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deliveryId = searchParams.get('deliveryId');

    if (!deliveryId || isNaN(parseInt(deliveryId))) {
      return NextResponse.json(
        { error: 'Valid deliveryId is required' },
        { status: 400 }
      );
    }

    const messages = await db.query.messagesTable.findMany({
      where: eq(messagesTable.deliveryId, parseInt(deliveryId)),
      orderBy: desc(messagesTable.createdAt),
      limit: 50, // Get last 50 messages
    });

    // Reverse to show oldest first
    return NextResponse.json(messages.reverse());

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST a new message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      deliveryId, 
      senderType, 
      senderId, 
      messageType = 'text', 
      content, 
      imageUrl,
      metadata 
    } = body;

    // Validate required fields
    if (!deliveryId || !senderType || !senderId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate sender type
    if (!['driver', 'customer', 'system'].includes(senderType)) {
      return NextResponse.json(
        { error: 'Invalid sender type' },
        { status: 400 }
      );
    }

    // Validate message type
    if (!['text', 'image', 'status_update', 'location'].includes(messageType)) {
      return NextResponse.json(
        { error: 'Invalid message type' },
        { status: 400 }
      );
    }

    const newMessage = {
      deliveryId: parseInt(deliveryId),
      senderType,
      senderId: parseInt(senderId),
      messageType,
      content,
      imageUrl: imageUrl || null,
      metadata: metadata || null,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // Insert message into database
    const [insertedMessage] = await db.insert(messagesTable).values(newMessage).returning();

    console.log(`✅ Message saved: ${messageType} from ${senderType} ${senderId}`);

    return NextResponse.json(insertedMessage);

  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}