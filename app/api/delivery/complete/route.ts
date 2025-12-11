// app/api/delivery/complete/route.ts - ENHANCED VERSION
import { db } from '@/src/db';
import { 
  deliveryRequestsTable, 
  driversTable, 
  messagesTable, 
  driverTransactions,
  driverCommissionDeductions,
  platformEarnings 
} from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { deliveryId, driverId } = await request.json();
    
    console.log('💰 Processing delivery completion with commission:', { deliveryId, driverId });
    
    // Get delivery details including fare
    const delivery = await db.select()
      .from(deliveryRequestsTable)
      .where(eq(deliveryRequestsTable.id, deliveryId))
      .limit(1);
    
    if (!delivery || delivery.length === 0) {
      return Response.json({ error: 'Delivery not found' }, { status: 404 });
    }
    
    const deliveryData = delivery[0];
    
    // Check if already completed
    if (deliveryData.deliveryStatus === 'completed' || deliveryData.status === 'completed') {
      return Response.json({ error: 'Delivery already completed' }, { status: 400 });
    }
    
    // Get driver's current balance
    const driver = await db.select()
      .from(driversTable)
      .where(eq(driversTable.id, driverId))
      .limit(1);
    
    if (!driver || driver.length === 0) {
      return Response.json({ error: 'Driver not found' }, { status: 404 });
    }
    
    const driverData = driver[0];
    const currentBalance = driverData.balance; // Stored in cents
    
    // Calculate commission (13.5% of fare)
    const fare = deliveryData.fare; // e.g., $10.00
    const commissionPercentage = 0.135; // 13.5%
    const commissionAmount = fare * commissionPercentage; // e.g., $1.35
    const commissionInCents = Math.round(commissionAmount * 100);
    
    // Check if driver has sufficient balance
    if (currentBalance < commissionInCents) {
      return Response.json({ 
        error: 'Insufficient balance',
        message: `You need $${commissionAmount.toFixed(2)} commission but only have $${(currentBalance / 100).toFixed(2)} in your wallet. Please top up.`,
        requiredBalance: commissionAmount,
        currentBalance: currentBalance / 100,
        shortfall: (commissionInCents - currentBalance) / 100
      }, { status: 400 });
    }
    
    // Calculate new balance after commission deduction
    const newBalance = currentBalance - commissionInCents;
    
    console.log('💰 Commission calculation:', {
      fare,
      commissionPercentage: `${(commissionPercentage * 100)}%`,
      commissionAmount,
      commissionInCents,
      driverBalanceBefore: currentBalance / 100,
      driverBalanceAfter: newBalance / 100,
      driverId
    });
    
    // Process everything in a single transaction
    await db.transaction(async (tx) => {
      // 1. Update driver's balance (deduct commission)
      await tx.update(driversTable)
        .set({ balance: newBalance })
        .where(eq(driversTable.id, driverId));
      
      // 2. Create commission deduction transaction
      await tx.insert(driverTransactions).values({
        driver_id: driverId,
        amount: -commissionInCents, // Negative for deduction
        payment_intent_id: `commission_${deliveryId}_${Date.now()}`,
        status: 'completed',
        created_at: new Date().toISOString()
      });
      
      // 3. Record commission deduction details
      await tx.insert(driverCommissionDeductions).values({
        driver_id: driverId,
        delivery_id: deliveryId,
        fare_amount: fare,
        commission_percentage: commissionPercentage,
        commission_amount: commissionAmount,
        driver_balance_before: currentBalance,
        driver_balance_after: newBalance,
        status: 'completed',
        created_at: new Date().toISOString()
      });
      
      // 4. Record platform earnings
      await tx.insert(platformEarnings).values({
        delivery_id: deliveryId,
        commission_amount: commissionAmount,
        driver_id: driverId,
        customer_id: deliveryData.customerId,
        created_at: new Date().toISOString()
      });
      
      // 5. Update delivery status
      await tx.update(deliveryRequestsTable)
        .set({ 
          status: 'completed',
          deliveryCompletedAt: new Date().toISOString(),
          deliveryStatus: 'completed',
          commissionTaken: true,
          commissionAmount: commissionAmount
        })
        .where(eq(deliveryRequestsTable.id, deliveryId));
      
      // 6. Add driver message to chat
      await tx.insert(messagesTable).values({
        deliveryId,
        senderType: 'driver',
        senderId: driverId,
        messageType: 'status_update',
        content: 'Delivery completed!',
        isRead: false,
        createdAt: new Date().toISOString()
      });      
      // 8. Notify customer that delivery is complete
      await tx.insert(messagesTable).values({
        deliveryId,
        senderType: 'system',
        senderId: 0,
        messageType: 'status_update',
        content: 'Driver has marked the delivery as complete. Your order is now finished.',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });
    
    console.log('✅ Delivery completed with commission deducted successfully');
    
    return Response.json({ 
      success: true,
      commissionDeducted: commissionAmount,
      newBalance: newBalance / 100,
      message: `Delivery completed! $${commissionAmount.toFixed(2)} commission deducted from your wallet.`
    });
    
  } catch (error) {
    console.error('❌ Error completing delivery:', error);
    return Response.json({ 
      error: 'Failed to complete delivery',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}