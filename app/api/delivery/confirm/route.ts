// app/api/delivery/confirm/route.ts - CORRECTED VERSION
import { db } from '@/src/db';
import { deliveryRequestsTable, driversTable, messagesTable, driverTransactions } from '@/src/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { deliveryId, customerId } = await request.json();
    
    console.log('🔍 Processing delivery confirmation:', { deliveryId, customerId });
    
    // Get delivery to calculate commission
    const delivery = await db.select()
      .from(deliveryRequestsTable)
      .where(eq(deliveryRequestsTable.id, deliveryId))
      .limit(1);
    
    if (!delivery || delivery.length === 0) {
      return Response.json({ error: 'Delivery not found' }, { status: 404 });
    }
    
    const deliveryData = delivery[0];
    const fare = deliveryData.fare; // e.g., $10.00
    const commission = fare * 0.135; // 13.5% = $1.35
    
    // Check if driver is assigned
    if (!deliveryData.assignedDriverId) {
      return Response.json({ error: 'No driver assigned to this delivery' }, { status: 400 });
    }
    
    const driverId = deliveryData.assignedDriverId; // Get this as a number
    
    // Get driver's current balance
    const driver = await db.select()
      .from(driversTable)
      .where(eq(driversTable.id, driverId))
      .limit(1);
    
    if (!driver || driver.length === 0) {
      return Response.json({ error: 'Driver not found' }, { status: 404 });
    }
    
    const currentBalance = driver[0].balance; // Stored in cents
    const commissionInCents = Math.round(commission * 100);
    const newBalance = currentBalance - commissionInCents;
    
    console.log('💰 Commission calculation:', {
      fare,
      commission,
      commissionInCents,
      currentBalance,
      newBalance,
      driverId
    });
    
    // Update driver's balance AND create a commission transaction
    await db.transaction(async (tx) => {
      // 1. Update driver's balance
      await tx.update(driversTable)
        .set({ balance: newBalance })
        .where(eq(driversTable.id, driverId));
      
      // 2. ✅ CORRECTED: Create commission deduction transaction record
      // Use the transaction object directly
      await tx.insert(driverTransactions).values({
        driver_id: driverId,
        amount: -commissionInCents,
        payment_intent_id: `commission_${deliveryId}_${Date.now()}`,
        status: 'completed',
        created_at: new Date().toISOString()
      });
      
      // 3. Update delivery as confirmed and commission taken
      await tx.update(deliveryRequestsTable)
        .set({ 
          status: 'confirmed',
          customerConfirmedAt: new Date().toISOString(),
          commissionTaken: true,
          commissionAmount: commission,
          deliveryStatus: 'paid'
        })
        .where(eq(deliveryRequestsTable.id, deliveryId));
      
      // 4. Add system message
      await tx.insert(messagesTable).values({
        deliveryId,
        senderType: 'system',
        senderId: 0,
        messageType: 'status_update',
        content: `Customer confirmed delivery. Commission of $${commission.toFixed(2)} (13.5%) deducted from driver balance.`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });
    
    console.log('✅ Delivery confirmed and commission processed');
    
    return Response.json({ 
      success: true, 
      commissionDeducted: commission,
      newDriverBalance: newBalance / 100, // Convert cents to dollars
      message: `Commission of $${commission.toFixed(2)} deducted successfully`
    });
    
  } catch (error) {
    console.error('❌ Error confirming delivery:', error);
    return Response.json({ 
      error: 'Failed to confirm delivery',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}