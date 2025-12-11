// app/api/delivery/auto-confirm/route.ts
import { db } from '@/src/db';
import { deliveryRequestsTable, driversTable, messagesTable, driverTransactions } from '@/src/db/schema';
import { eq, and, lt, isNull } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deliveryId = searchParams.get('deliveryId');
    
    // If specific delivery ID provided, auto-confirm just that one
    if (deliveryId) {
      const result = await autoConfirmSingleDelivery(parseInt(deliveryId));
      return Response.json(result); // ✅ FIXED: Wrap in Response.json()
    }
    
    // Otherwise run as a cron job to check all pending confirmations
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    // Find deliveries completed over 30 minutes ago but not confirmed
    const pendingDeliveries = await db.select()
      .from(deliveryRequestsTable)
      .where(
        and(
          eq(deliveryRequestsTable.deliveryStatus, 'completed'),
          lt(deliveryRequestsTable.deliveryCompletedAt!, thirtyMinutesAgo),
          isNull(deliveryRequestsTable.customerConfirmedAt),
          eq(deliveryRequestsTable.commissionTaken, false)
        )
      );
    
    console.log(`🔍 Found ${pendingDeliveries.length} deliveries ready for auto-confirm`);
    
    let processedCount = 0;
    let errors = [];
    
    for (const delivery of pendingDeliveries) {
      try {
        await autoConfirmSingleDelivery(delivery.id);
        processedCount++;
      } catch (error) {
        console.error(`❌ Failed to auto-confirm delivery ${delivery.id}:`, error);
        errors.push({ deliveryId: delivery.id, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    
    return Response.json({ 
      success: true, 
      processed: processedCount,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('❌ Auto-confirm error:', error);
    return Response.json({ 
      error: 'Failed to auto-confirm deliveries',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// ✅ FIXED: Helper function returns plain object (not Response)
async function autoConfirmSingleDelivery(deliveryId: number) {
  console.log(`🔄 Auto-confirming delivery ${deliveryId}`);
  
  const delivery = await db.select()
    .from(deliveryRequestsTable)
    .where(eq(deliveryRequestsTable.id, deliveryId))
    .limit(1);
  
  if (!delivery || delivery.length === 0) {
    throw new Error('Delivery not found');
  }
  
  const deliveryData = delivery[0];
  
  if (!deliveryData.assignedDriverId) {
    throw new Error('No driver assigned to this delivery');
  }
  
  // Check if already confirmed
  if (deliveryData.customerConfirmedAt || deliveryData.commissionTaken) {
    throw new Error('Delivery already confirmed or commission taken');
  }
  
  const fare = deliveryData.fare;
  const commission = fare * 0.135; // 13.5%
  const driverId = deliveryData.assignedDriverId;
  
  // Get driver's current balance
  const driver = await db.select()
    .from(driversTable)
    .where(eq(driversTable.id, driverId))
    .limit(1);
  
  if (!driver || driver.length === 0) {
    throw new Error('Driver not found');
  }
  
  const currentBalance = driver[0].balance; // Stored in cents
  const commissionInCents = Math.round(commission * 100);
  const newBalance = currentBalance - commissionInCents;
  
  // Ensure driver has sufficient balance
  if (newBalance < 0) {
    throw new Error(`Driver has insufficient balance: $${(currentBalance / 100).toFixed(2)} needed $${commission.toFixed(2)}`);
  }
  
  console.log('💰 Auto-confirm commission calculation:', {
    deliveryId,
    fare,
    commission,
    driverId,
    currentBalance: currentBalance / 100,
    newBalance: newBalance / 100
  });
  
  // Update everything in a transaction
  await db.transaction(async (tx) => {
    // 1. Update driver's balance
    await tx.update(driversTable)
      .set({ balance: newBalance })
      .where(eq(driversTable.id, driverId));
    
    // 2. Create commission deduction transaction
    await tx.insert(driverTransactions).values({
      driver_id: driverId,
      amount: -commissionInCents, // Negative for deduction
      payment_intent_id: `auto_commission_${deliveryId}_${Date.now()}`,
      status: 'completed',
      created_at: new Date().toISOString()
    });
    
    // 3. Update delivery status
    await tx.update(deliveryRequestsTable)
      .set({ 
        autoConfirmedAt: new Date().toISOString(),
        commissionTaken: true,
        commissionAmount: commission,
        deliveryStatus: 'paid',
        status: 'confirmed'
      })
      .where(eq(deliveryRequestsTable.id, deliveryId));
    
    // 4. Add system message to chat
    await tx.insert(messagesTable).values({
      deliveryId,
      senderType: 'system',
      senderId: 0,
      messageType: 'status_update',
      content: `⚠️ Delivery auto-confirmed after 30 minutes (customer did not respond). Commission of $${commission.toFixed(2)} (13.5%) deducted from driver's wallet.`,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  });
  
  console.log(`✅ Auto-confirmed delivery ${deliveryId}, deducted $${commission}`);
  
  // ✅ Return plain object (not Response)
  return {
    deliveryId,
    commissionDeducted: commission,
    newDriverBalance: newBalance / 100,
    autoConfirmed: true
  };
}