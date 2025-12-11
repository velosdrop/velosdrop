//app/api/delivery/arrived/route.ts
import { db } from '@/src/db';
import { deliveryRequestsTable, messagesTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { deliveryId } = await request.json();
    
    console.log('📍 Marking delivery as arrived:', deliveryId);
    
    await db.transaction(async (tx) => {
      // Update delivery status
      await tx.update(deliveryRequestsTable)
        .set({ 
          status: 'arrived',
          deliveryStatus: 'arrived',
          driverArrivedAt: new Date().toISOString()
        })
        .where(eq(deliveryRequestsTable.id, deliveryId));
      
      // Add system message to chat
      await tx.insert(messagesTable).values({
        deliveryId,
        senderType: 'system',
        senderId: 0,
        messageType: 'status_update',
        content: 'Driver has arrived at the delivery location.',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });
    
    return Response.json({ success: true });
    
  } catch (error) {
    console.error('Error marking arrived:', error);
    return Response.json({ error: 'Failed to update status' }, { status: 500 });
  }
}