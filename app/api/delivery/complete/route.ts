//app/api/delivery/complete/route.ts
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
import { getPubNubInstance } from '@/lib/pubnub-booking';
import { getGeneralAreaFromCoordinates, getCachedAreaName, cacheAreaName } from '@/lib/location-utils';

//Function for Live Feed Requests
async function getGeneralArea(latitude: number, longitude: number): Promise<string> {
  // Use the new utility with real Zimbabwe data
  const areaName = await getGeneralAreaFromCoordinates(latitude, longitude);
  return areaName;
}

// NEW FUNCTION: Publish to Live Feed - FIXED TYPE ISSUE
const publishToLiveFeed = async (
  eventType: 'new_request' | 'request_accepted' | 'request_rejected' | 'delivery_completed',
  data: {
    requestId: number;
    generalArea: string;
    fare: number;
    customerInitial?: string;
    driverName?: string;
    pickupLatitude?: number;
    pickupLongitude?: number;
    status?: string;
  }
) => {
  try {
    const pubnub = getPubNubInstance();
    
    // FIX: Create properly typed message for PubNub
    const liveFeedMessage = {
      type: 'live_feed_update',
      data: JSON.stringify({
        eventType,
        requestId: data.requestId,
        generalArea: data.generalArea,
        fare: data.fare,
        customerInitial: data.customerInitial || '',
        driverName: data.driverName || '',
        timestamp: Date.now(),
        status: data.status || 'active',
        pickupZone: data.pickupLatitude && data.pickupLongitude ? {
          latitude: data.pickupLatitude,
          longitude: data.pickupLongitude,
          radius: 500
        } : null
      })
    };

    await pubnub.publish({
      channel: 'live_delivery_feed',
      message: liveFeedMessage
    });

    console.log(`✅ Live feed update published: ${eventType} for request #${data.requestId}`);
  } catch (error) {
    console.error('❌ Failed to publish to live feed:', error);
  }
};

export async function POST(request: Request) {
  try {
    const { deliveryId, driverId } = await request.json();
    
    console.log('💰 Processing delivery completion with commission:', { deliveryId, driverId });
    
    const delivery = await db.select()
      .from(deliveryRequestsTable)
      .where(eq(deliveryRequestsTable.id, deliveryId))
      .limit(1);
    
    if (!delivery || delivery.length === 0) {
      return Response.json({ error: 'Delivery not found' }, { status: 404 });
    }
    
    const deliveryData = delivery[0];
    
    const generalArea = await getGeneralArea(
      deliveryData.pickupLatitude || 0,
      deliveryData.pickupLongitude || 0
    );
    
    if (deliveryData.deliveryStatus === 'completed' || deliveryData.status === 'completed') {
      return Response.json({ error: 'Delivery already completed' }, { status: 400 });
    }
    
    const driver = await db.select()
      .from(driversTable)
      .where(eq(driversTable.id, driverId))
      .limit(1);
    
    if (!driver || driver.length === 0) {
      return Response.json({ error: 'Driver not found' }, { status: 404 });
    }
    
    const driverData = driver[0];
    const currentBalance = driverData.balance;
    
    const fare = deliveryData.fare;
    const commissionPercentage = 0.09;
    const commissionAmount = fare * commissionPercentage;
    const commissionInCents = Math.round(commissionAmount * 100);
    
    if (currentBalance < commissionInCents) {
      return Response.json({ 
        error: 'Insufficient balance',
        message: `You need $${commissionAmount.toFixed(2)} commission but only have $${(currentBalance / 100).toFixed(2)} in your wallet. Please top up.`,
        requiredBalance: commissionAmount,
        currentBalance: currentBalance / 100,
        shortfall: (commissionInCents - currentBalance) / 100
      }, { status: 400 });
    }
    
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
    
    await db.transaction(async (tx) => {
      await tx.update(driversTable)
        .set({ balance: newBalance })
        .where(eq(driversTable.id, driverId));
      
      await tx.insert(driverTransactions).values({
        driver_id: driverId,
        amount: -commissionInCents,
        payment_intent_id: `commission_${deliveryId}_${Date.now()}`,
        status: 'completed',
        created_at: new Date().toISOString()
      });
      
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
      
      await tx.insert(platformEarnings).values({
        delivery_id: deliveryId,
        commission_amount: commissionAmount,
        driver_id: driverId,
        customer_id: deliveryData.customerId,
        created_at: new Date().toISOString()
      });
      
      await tx.update(deliveryRequestsTable)
        .set({ 
          status: 'completed',
          deliveryCompletedAt: new Date().toISOString(),
          deliveryStatus: 'completed',
          commissionTaken: true,
          commissionAmount: commissionAmount
        })
        .where(eq(deliveryRequestsTable.id, deliveryId));
      
      await tx.insert(messagesTable).values({
        deliveryId,
        senderType: 'driver',
        senderId: driverId,
        messageType: 'status_update',
        content: 'Delivery completed!',
        isRead: false,
        createdAt: new Date().toISOString()
      });      
      
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
    
    // PUBLISH TO LIVE FEED: Delivery Completed
    await publishToLiveFeed('delivery_completed', {
      requestId: deliveryId,
      generalArea,
      fare: fare,
      driverName: `${driverData.firstName} ${driverData.lastName}`.substring(0, 12) + '...',
      status: 'completed'
    });
    
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