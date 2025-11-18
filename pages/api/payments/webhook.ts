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

// Helper function to create transaction record
async function createTransactionRecord(driverId: number, amount: number, reference: string, status: string) {
  try {
    // Convert amount to cents for consistent storage
    const amountInCents = Math.round(amount * 100);
    
    const transaction = await db.insert(driverTransactions).values({
      driver_id: driverId,
      amount: amountInCents,
      payment_intent_id: reference,
      status: status,
      created_at: new Date().toISOString()
    }).returning();

    console.log('✅ Transaction record created:', {
      transactionId: transaction[0].id,
      driverId: driverId,
      amount: amountInCents,
      status: status
    });

    return transaction[0];
  } catch (error) {
    console.error('❌ Error creating transaction record:', error);
    throw error;
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
    
    console.log('🔔 LIVE PAYNOW WEBHOOK RECEIVED:', {
      reference: paymentStatus.reference,
      amount: paymentStatus.amount,
      status: paymentStatus.status,
      method: paymentStatus.method,
      pollUrl: paymentStatus.pollUrl,
      receivedAt: new Date().toISOString()
    });

    // Process LIVE payment based on status
    if (paymentStatus.status && paymentStatus.status.toLowerCase() === 'paid') {
      console.log('💰 LIVE PAYMENT SUCCESSFUL - Processing...', {
        reference: paymentStatus.reference,
        amount: paymentStatus.amount,
        method: paymentStatus.method
      });
      
      // Get driver ID from payment reference
      const driverId = await getDriverIdFromReference(paymentStatus.reference);
      
      if (driverId) {
        // Update driver's wallet balance
        await updateDriverWallet(
          driverId,
          parseFloat(paymentStatus.amount),
          paymentStatus.reference
        );
        
        // Update payment reference status
        await db
          .update(paymentReferencesTable)
          .set({
            status: 'completed',
            updatedAt: new Date().toISOString()
          })
          .where(eq(paymentReferencesTable.reference, paymentStatus.reference));
        
        // ✅ CREATE TRANSACTION RECORD
        const transaction = await createTransactionRecord(
          driverId,
          parseFloat(paymentStatus.amount),
          paymentStatus.reference,
          'completed'
        );
        
        // ✅ GET DRIVER DETAILS FOR REAL-TIME UPDATE
        const driverDetails = await getDriverDetails(driverId);
        
        // ✅ PUBLISH REAL-TIME UPDATE TO PUBNUB
        await publishTransactionUpdate({
          ...transaction,
          driver: driverDetails
        });
        
        console.log('✅ LIVE PAYMENT PROCESSED COMPLETELY:', {
          reference: paymentStatus.reference,
          driverId: driverId,
          amount: paymentStatus.amount,
          transactionId: transaction.id
        });
      } else {
        console.error('❌ Could not find driver ID for reference:', paymentStatus.reference);
      }
      
    } else if (paymentStatus.status && paymentStatus.status.toLowerCase() === 'cancelled') {
      console.log('❌ LIVE PAYMENT CANCELLED:', paymentStatus.reference);
      
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
      
      // ✅ CREATE FAILED TRANSACTION RECORD
      if (driverId) {
        const transaction = await createTransactionRecord(
          driverId,
          parseFloat(paymentStatus.amount),
          paymentStatus.reference,
          'failed'
        );
        
        // ✅ GET DRIVER DETAILS FOR REAL-TIME UPDATE
        const driverDetails = await getDriverDetails(driverId);
        
        // ✅ PUBLISH REAL-TIME UPDATE TO PUBNUB
        await publishTransactionUpdate({
          ...transaction,
          driver: driverDetails
        });
        
        console.log('❌ FAILED TRANSACTION RECORD CREATED:', {
          transactionId: transaction.id,
          driverId: driverId,
          status: 'failed'
        });
      }
      
    } else if (paymentStatus.status && paymentStatus.status.toLowerCase() === 'sent') {
      console.log('📨 LIVE PAYMENT SENT (Awaiting confirmation):', paymentStatus.reference);
      
      // Get driver ID from payment reference
      const driverId = await getDriverIdFromReference(paymentStatus.reference);
      
      // ✅ CREATE PENDING TRANSACTION RECORD
      if (driverId) {
        const transaction = await createTransactionRecord(
          driverId,
          parseFloat(paymentStatus.amount),
          paymentStatus.reference,
          'pending'
        );
        
        // ✅ GET DRIVER DETAILS FOR REAL-TIME UPDATE
        const driverDetails = await getDriverDetails(driverId);
        
        // ✅ PUBLISH REAL-TIME UPDATE TO PUBNUB
        await publishTransactionUpdate({
          ...transaction,
          driver: driverDetails
        });
        
        console.log('📨 PENDING TRANSACTION RECORD CREATED:', {
          transactionId: transaction.id,
          driverId: driverId,
          status: 'pending'
        });
      }
      
    } else {
      console.log('⚠️ UNKNOWN LIVE PAYMENT STATUS:', {
        status: paymentStatus.status,
        reference: paymentStatus.reference
      });
      
      // Get driver ID from payment reference
      const driverId = await getDriverIdFromReference(paymentStatus.reference);
      
      // ✅ CREATE TRANSACTION RECORD FOR UNKNOWN STATUS
      if (driverId) {
        const transaction = await createTransactionRecord(
          driverId,
          parseFloat(paymentStatus.amount),
          paymentStatus.reference,
          'pending' // Default to pending for unknown status
        );
        
        // ✅ GET DRIVER DETAILS FOR REAL-TIME UPDATE
        const driverDetails = await getDriverDetails(driverId);
        
        // ✅ PUBLISH REAL-TIME UPDATE TO PUBNUB
        await publishTransactionUpdate({
          ...transaction,
          driver: driverDetails
        });
        
        console.log('⚠️ TRANSACTION RECORD CREATED FOR UNKNOWN STATUS:', {
          transactionId: transaction.id,
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