//pages/api/payments/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { updateDriverWallet } from '@/lib/updateWallet';
import { db } from '@/src/db/index';
import { paymentReferencesTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

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
        
        console.log('✅ LIVE PAYMENT PROCESSED AND WALLET UPDATED:', {
          reference: paymentStatus.reference,
          driverId: driverId,
          amount: paymentStatus.amount
        });
      } else {
        console.error('❌ Could not find driver ID for reference:', paymentStatus.reference);
      }
      
    } else if (paymentStatus.status && paymentStatus.status.toLowerCase() === 'cancelled') {
      console.log('❌ LIVE PAYMENT CANCELLED:', paymentStatus.reference);
      
      // Update payment reference status to failed
      await db
        .update(paymentReferencesTable)
        .set({
          status: 'failed',
          updatedAt: new Date().toISOString()
        })
        .where(eq(paymentReferencesTable.reference, paymentStatus.reference));
      
    } else if (paymentStatus.status && paymentStatus.status.toLowerCase() === 'sent') {
      console.log('📨 LIVE PAYMENT SENT (Awaiting confirmation):', paymentStatus.reference);
      
    } else {
      console.log('⚠️ UNKNOWN LIVE PAYMENT STATUS:', {
        status: paymentStatus.status,
        reference: paymentStatus.reference
      });
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