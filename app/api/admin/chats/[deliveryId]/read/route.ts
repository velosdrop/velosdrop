//app/api/admin/chats/[deliveryId]/read/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { messagesTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
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

    // Mark all messages as read for this delivery
    await db
      .update(messagesTable)
      .set({ isRead: true })
      .where(eq(messagesTable.deliveryId, deliveryIdNum));

    return NextResponse.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
}