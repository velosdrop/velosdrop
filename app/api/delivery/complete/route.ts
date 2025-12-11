//app/api/delivery/complete/route.ts
import { db } from '@/src/db';
import { deliveryRequestsTable, messagesTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { deliveryId, driverId } = await request.json();
    
    console.log('✅ Marking delivery as completed:', { deliveryId, driverId });
    
    await db.transaction(async (tx) => {
      // Update delivery status
      await tx.update(deliveryRequestsTable)
        .set({ 
          status: 'completed',
          deliveryCompletedAt: new Date().toISOString(),
          deliveryStatus: 'awaiting_confirmation'
        })
        .where(eq(deliveryRequestsTable.id, deliveryId));
      
      // Add driver message to chat
      await tx.insert(messagesTable).values({
        deliveryId,
        senderType: 'driver',
        senderId: driverId,
        messageType: 'status_update',
        content: 'Delivery completed!',
        isRead: false,
        createdAt: new Date().toISOString()
      });
      
      // Add system message
      await tx.insert(messagesTable).values({
        deliveryId,
        senderType: 'system',
        senderId: 0,
        messageType: 'status_update',
        content: 'Driver has marked the delivery as complete. Awaiting customer confirmation.',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });
    
    return Response.json({ success: true });
    
  } catch (error) {
    console.error('Error completing delivery:', error);
    return Response.json({ error: 'Failed to complete delivery' }, { status: 500 });
  }
}