// pages/api/payments/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { updateDriverWallet } from '@/lib/updateWallet';
import { db } from '@/src/db/index';
import { paymentReferencesTable, driverTransactions, driversTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const paymentStatus = req.body;
    
    const requestId = Math.random().toString(36).substr(2, 9);
    console.log('🔔 LIVE PAYNOW WEBHOOK RECEIVED - REQUEST ID:', requestId, {
      reference: paymentStatus.reference,
      amount: paymentStatus.amount,
      status: paymentStatus.status,
      method: paymentStatus.method,
      pollUrl: paymentStatus.pollUrl,
      receivedAt: new Date().toISOString()
    });

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

    if (paymentStatus.status && paymentStatus.status.toLowerCase() === 'paid') {
      console.log('💰 LIVE PAYMENT SUCCESSFUL - Processing...', {
        requestId: requestId,
        reference: paymentStatus.reference,
        paynowAmount: paymentStatus.amount,
        method: paymentStatus.method
      });
      
      const driverId = await getDriverIdFromReference(paymentStatus.reference);
      
      if (driverId) {
        // ✅ GET AMOUNT FROM DATABASE, NOT FROM PAYNOW
        const paymentDetails = await db
          .select()
          .from(paymentReferencesTable)
          .where(eq(paymentReferencesTable.reference, paymentStatus.reference))
          .limit(1);
        
        if (paymentDetails[0]) {
          const correctAmountInDollars = paymentDetails[0].amount / 100;
          
          console.log('🔍 WEBHOOK AMOUNT COMPARISON:', {
            requestId: requestId,
            fromPaynow: paymentStatus.amount,
            fromDatabase: correctAmountInDollars,
            using: 'DATABASE (correct)',
            reason: 'Paynow converts currency'
          });
          
          // ✅ Use database amount, NOT Paynow amount
          const updateResult = await updateDriverWallet(
            driverId,
            correctAmountInDollars, // ✅ Correct amount from database
            paymentStatus.reference
          );
          
          console.log('✅ WALLET UPDATE RESULT:', {
            requestId: requestId,
            driverId: driverId,
            reference: paymentStatus.reference,
            updateResult: updateResult
          });
          
          await db
            .update(paymentReferencesTable)
            .set({
              status: 'completed',
              updatedAt: new Date().toISOString()
            })
            .where(eq(paymentReferencesTable.reference, paymentStatus.reference));
          
          console.log('✅ LIVE PAYMENT PROCESSED COMPLETELY:', {
            requestId: requestId,
            reference: paymentStatus.reference,
            driverId: driverId,
            correctAmount: correctAmountInDollars
          });
        }
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
      
      await db
        .update(paymentReferencesTable)
        .set({
          status: 'failed',
          updatedAt: new Date().toISOString()
        })
        .where(eq(paymentReferencesTable.reference, paymentStatus.reference));
      
    } else if (paymentStatus.status && paymentStatus.status.toLowerCase() === 'sent') {
      console.log('📨 LIVE PAYMENT SENT (Awaiting confirmation):', {
        requestId: requestId,
        reference: paymentStatus.reference
      });
    } else {
      console.log('⚠️ UNKNOWN LIVE PAYMENT STATUS:', {
        requestId: requestId,
        status: paymentStatus.status,
        reference: paymentStatus.reference
      });
    }

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