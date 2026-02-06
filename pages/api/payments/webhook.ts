//pages/api/payments/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { updateDriverWallet } from '@/lib/updateWallet';
import { db } from '@/src/db/index';
import { paymentReferencesTable, driverTransactions, driversTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { createPubNubClient } from '@/lib/pubnub-booking';

// Helper function to extract driver ID from payment reference
async function getDriverIdFromReference(reference: string): Promise<number | null> {
  try {
    const result = await db
      .select({ driverId: paymentReferencesTable.driverId })
      .from(paymentReferencesTable)
      .where(eq(paymentReferencesTable.reference, reference))
      .limit(1);

    if (result.length > 0) {
      return result[0].driverId;
    }
    
    console.error('❌ No payment reference found:', reference);
    return null;
  } catch (error) {
    console.error('❌ Error looking up payment reference:', error);
    return null;
  }
}

// Helper function to get driver details for real-time updates
async function getDriverDetails(driverId: number) {
  try {
    const driver = await db
      .select({
        id: driversTable.id,
        firstName: driversTable.firstName,
        lastName: driversTable.lastName,
        phoneNumber: driversTable.phoneNumber,
        email: driversTable.email,
        profilePictureUrl: driversTable.profilePictureUrl
      })
      .from(driversTable)
      .where(eq(driversTable.id, driverId))
      .limit(1);

    return driver[0] || null;
  } catch (error) {
    console.error('❌ Error fetching driver details:', error);
    return null;
  }
}

// Helper function to publish real-time updates to PubNub
async function publishTransactionUpdate(transactionData: any) {
  try {
    const pubnub = createPubNubClient('payment_webhook');
    
    await pubnub.publish({
      channel: 'driver-transactions-updates',
      message: {
        type: 'TRANSACTION_UPDATE',
        data: transactionData,
        timestamp: Date.now()
      }
    });
    
    console.log('✅ Real-time transaction update published:', {
      transactionId: transactionData.id,
      driverId: transactionData.driver_id,
      status: transactionData.status
    });
  } catch (error) {
    console.error('❌ Error publishing real-time update:', error);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const paymentStatus = req.body;
    
    // ✅ ADDED: Unique request ID to track multiple calls
    const requestId = Math.random().toString(36).substr(2, 9);
    console.log('🔔 LIVE PAYNOW WEBHOOK RECEIVED - REQUEST ID:', requestId, {
      reference: paymentStatus.reference,
      amount: paymentStatus.amount,
      status: paymentStatus.status,
      method: paymentStatus.method,
      pollUrl: paymentStatus.pollUrl,
      receivedAt: new Date().toISOString()
    });

    // ✅ ADDED: Duplicate payment protection
    const existingTransactions = await db
      .select()
      .from(driverTransactions)
      .where(eq(driverTransactions.payment_intent_id, paymentStatus.reference))
      .limit(1);

    if (existingTransactions.length > 0 && existingTransactions[0].status === 'completed') {
      console.log('⚠️ DUPLICATE WEBHOOK CALL - PAYMENT ALREADY PROCESSED:', {
        requestId: requestId,
        reference: paymentStatus.reference,
        existingTransactionId: existingTransactions[0].id,
        existingStatus: existingTransactions[0].status
      });
      
      return res.status(200).json({ 
        status: 'OK',
        message: 'Payment already processed',
        reference: paymentStatus.reference,
        requestId: requestId
      });
    }

    // Process LIVE payment based on status
    if (paymentStatus.status && paymentStatus.status.toLowerCase() === 'paid') {
      console.log('💰 LIVE PAYMENT SUCCESSFUL - Processing...', {
        requestId: requestId,
        reference: paymentStatus.reference,
        amount: paymentStatus.amount,
        method: paymentStatus.method
      });
      
      // Get driver ID from payment reference
      const driverId = await getDriverIdFromReference(paymentStatus.reference);
      
      if (driverId) {
        // ✅ ADDED: Debug amount analysis
        console.log('🔍 AMOUNT ANALYSIS:', {
          requestId: requestId,
          rawAmount: paymentStatus.amount,
          parsedAmount: parseFloat(paymentStatus.amount),
          type: typeof paymentStatus.amount,
          expectedFor$0_10: '0.10'
        });

        // ✅ FIXED: Only call updateDriverWallet - it already creates the transaction record
        const updateResult = await updateDriverWallet(
          driverId,
          parseFloat(paymentStatus.amount),
          paymentStatus.reference
        );
        
        console.log('✅ WALLET UPDATE RESULT:', {
          requestId: requestId,
          driverId: driverId,
          reference: paymentStatus.reference,
          updateResult: updateResult
        });
        
        // ✅ FIXED: Update payment reference status (separate from transaction)
        await db
          .update(paymentReferencesTable)
          .set({
            status: 'completed',
            updatedAt: new Date().toISOString()
          })
          .where(eq(paymentReferencesTable.reference, paymentStatus.reference));
        
        // ✅ FIXED: Get driver details for real-time update
        const driverDetails = await getDriverDetails(driverId);
        
        // ✅ FIXED: Get the created transaction for real-time update
        const latestTransaction = await db
          .select()
          .from(driverTransactions)
          .where(eq(driverTransactions.payment_intent_id, paymentStatus.reference))
          .limit(1);
        
        if (latestTransaction.length > 0) {
          // ✅ FIXED: Publish real-time update
          await publishTransactionUpdate({
            ...latestTransaction[0],
            driver: driverDetails
          });
        }
        
        console.log('✅ LIVE PAYMENT PROCESSED COMPLETELY:', {
          requestId: requestId,
          reference: paymentStatus.reference,
          driverId: driverId,
          amount: paymentStatus.amount,
          transactionId: latestTransaction[0]?.id
        });
      } else {
        console.error('❌ Could not find driver ID for reference:', {
          requestId: requestId,
          reference: paymentStatus.reference
        });
      }
      
    } else if (paymentStatus.status && paymentStatus.status.toLowerCase() === 'cancelled') {
      console.log('❌ LIVE PAYMENT CANCELLED:', {
        requestId: requestId,
        reference: paymentStatus.reference
      });
      
      // Get driver ID from payment reference
      const driverId = await getDriverIdFromReference(paymentStatus.reference);
      
      // Update payment reference status to failed
      await db
        .update(paymentReferencesTable)
        .set({
          status: 'failed',
          updatedAt: new Date().toISOString()
        })
        .where(eq(paymentReferencesTable.reference, paymentStatus.reference));
      
      // ✅ FIXED: Only create transaction record for failed status
      if (driverId) {
        const transaction = await db.insert(driverTransactions).values({
          driver_id: driverId,
          amount: Math.round(parseFloat(paymentStatus.amount) * 100),
          payment_intent_id: paymentStatus.reference,
          status: 'failed',
          created_at: new Date().toISOString()
        }).returning();

        // ✅ FIXED: Get driver details for real-time update
        const driverDetails = await getDriverDetails(driverId);
        
        // ✅ FIXED: Publish real-time update
        await publishTransactionUpdate({
          ...transaction[0],
          driver: driverDetails
        });
        
        console.log('❌ FAILED TRANSACTION RECORD CREATED:', {
          requestId: requestId,
          transactionId: transaction[0].id,
          driverId: driverId,
          status: 'failed'
        });
      }
      
    } else if (paymentStatus.status && paymentStatus.status.toLowerCase() === 'sent') {
      console.log('📨 LIVE PAYMENT SENT (Awaiting confirmation):', {
        requestId: requestId,
        reference: paymentStatus.reference
      });
      
      // Get driver ID from payment reference
      const driverId = await getDriverIdFromReference(paymentStatus.reference);
      
      // ✅ FIXED: Only create pending transaction record
      if (driverId) {
        const transaction = await db.insert(driverTransactions).values({
          driver_id: driverId,
          amount: Math.round(parseFloat(paymentStatus.amount) * 100),
          payment_intent_id: paymentStatus.reference,
          status: 'pending',
          created_at: new Date().toISOString()
        }).returning();

        // ✅ FIXED: Get driver details for real-time update
        const driverDetails = await getDriverDetails(driverId);
        
        // ✅ FIXED: Publish real-time update
        await publishTransactionUpdate({
          ...transaction[0],
          driver: driverDetails
        });
        
        console.log('📨 PENDING TRANSACTION RECORD CREATED:', {
          requestId: requestId,
          transactionId: transaction[0].id,
          driverId: driverId,
          status: 'pending'
        });
      }
      
    } else {
      console.log('⚠️ UNKNOWN LIVE PAYMENT STATUS:', {
        requestId: requestId,
        status: paymentStatus.status,
        reference: paymentStatus.reference
      });
      
      // Get driver ID from payment reference
      const driverId = await getDriverIdFromReference(paymentStatus.reference);
      
      // ✅ FIXED: Only create transaction record for unknown status
      if (driverId) {
        const transaction = await db.insert(driverTransactions).values({
          driver_id: driverId,
          amount: Math.round(parseFloat(paymentStatus.amount) * 100),
          payment_intent_id: paymentStatus.reference,
          status: 'pending', // Default to pending for unknown status
          created_at: new Date().toISOString()
        }).returning();

        // ✅ FIXED: Get driver details for real-time update
        const driverDetails = await getDriverDetails(driverId);
        
        // ✅ FIXED: Publish real-time update
        await publishTransactionUpdate({
          ...transaction[0],
          driver: driverDetails
        });
        
        console.log('⚠️ TRANSACTION RECORD CREATED FOR UNKNOWN STATUS:', {
          requestId: requestId,
          transactionId: transaction[0].id,
          driverId: driverId,
          status: 'pending'
        });
      }
    }

    // Always return success to Paynow to acknowledge receipt
    res.status(200).json({ 
      status: 'OK',
      message: 'Webhook processed successfully',
      reference: paymentStatus.reference,
      requestId: requestId,
      processedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ LIVE WEBHOOK PROCESSING ERROR:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}