// pages/api/payments/status.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Paynow } from 'paynow';
import { db } from '@/src/db/index';
import { paymentReferencesTable, driverTransactions, driversTable } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { updateDriverWallet } from '@/lib/updateWallet';

function extractReferenceFromPollUrl(pollUrl: string): string | null {
  try {
    const url = new URL(pollUrl);
    const guid = url.searchParams.get('guid');
    return guid ? `PAYNOW-${guid}` : null;
  } catch (error) {
    console.error('Error extracting reference from pollUrl:', error);
    return null;
  }
}

async function getPaymentDetails(driverId: string) {
  try {
    const latestPayment = await db
      .select()
      .from(paymentReferencesTable)
      .where(
        and(
          eq(paymentReferencesTable.driverId, parseInt(driverId)),
          eq(paymentReferencesTable.status, 'pending')
        )
      )
      .orderBy(paymentReferencesTable.createdAt)
      .limit(1);

    return latestPayment[0] || null;
  } catch (error) {
    console.error('Error fetching payment details:', error);
    return null;
  }
}

interface PaynowStatusResponse {
  paid?: boolean | (() => boolean);
  status?: string;
  amount?: string | number;
  reference?: string;
  success?: boolean;
  hasRedirect?: boolean;
  isInnbucks?: boolean;
  error?: any;
  [key: string]: any;
}

function determinePaymentStatus(status: PaynowStatusResponse): { isPaid: boolean; statusMessage: string } {
  let isPaid = false;
  let statusMessage = 'pending';

  if (!status || typeof status !== 'object') {
    return { isPaid, statusMessage };
  }

  if (status.paid !== undefined) {
    if (typeof status.paid === 'function') {
      isPaid = Boolean(status.paid());
      console.log('✅ Using paid() method - Result:', isPaid);
    } else if (typeof status.paid === 'boolean') {
      isPaid = status.paid;
      console.log('✅ Using paid property - Result:', isPaid);
    } else {
      console.log('⚠️ Unknown paid type:', typeof status.paid, status.paid);
    }
  }

  if (status.status) {
    const statusStr = String(status.status).toLowerCase();
    statusMessage = statusStr;
    
    if (statusStr === 'paid' || statusStr === 'success' || statusStr === 'completed') {
      isPaid = true;
      console.log('✅ Setting paid=true based on status:', statusStr);
    } else if (statusStr === 'cancelled' || statusStr === 'failed' || statusStr === 'expired') {
      isPaid = false;
      console.log('❌ Setting paid=false based on status:', statusStr);
    }
  }

  if (status.success === true && !isPaid) {
    isPaid = true;
    console.log('✅ Setting paid=true based on success flag');
  }

  return { isPaid, statusMessage };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { pollUrl, driverId } = req.query;

  if (!pollUrl || typeof pollUrl !== 'string' || !driverId) {
    return res.status(400).json({ error: 'Poll URL and driver ID are required' });
  }

  if (!process.env.PAYNOW_ID || !process.env.PAYNOW_KEY) {
    console.error('PayNow LIVE credentials missing');
    return res.status(500).json({ error: 'Payment gateway configuration error' });
  }

  try {
    console.log('🔍 POLLING LIVE PAYMENT STATUS:', { pollUrl, driverId });
    
    const paynow = new Paynow(
      process.env.PAYNOW_ID,
      process.env.PAYNOW_KEY
    );

    const status = await paynow.pollTransaction(pollUrl) as PaynowStatusResponse;
    
    console.log('📊 LIVE STATUS RESPONSE:', status);
    
    const { isPaid, statusMessage } = determinePaymentStatus(status);

    console.log('🎯 FINAL STATUS DETERMINATION:', {
      paid: isPaid,
      status: statusMessage,
      driverId: driverId
    });

    // ✅ FIXED: Get payment details from DATABASE when status is paid
    if (isPaid) {
      console.log('💰 PAYMENT CONFIRMED - ATTEMPTING WALLET UPDATE');
      
      try {
        const paymentDetails = await getPaymentDetails(driverId as string);
        
        if (paymentDetails) {
          // ✅ USE DATABASE AMOUNT, NOT PAYNOW AMOUNT (fixes currency conversion issue)
          const amountInDollars = paymentDetails.amount / 100;
          
          console.log('🔍 AMOUNT SOURCE:', {
            fromPaynow: status.amount,
            fromDatabase: amountInDollars,
            using: 'DATABASE (correct)',
            reference: paymentDetails.reference
          });

          const updateResult = await updateDriverWallet(
            paymentDetails.driverId,
            amountInDollars, // ✅ Use database amount
            paymentDetails.reference
          );

          console.log('✅ updateDriverWallet RESULT:', updateResult);

          await db
            .update(paymentReferencesTable)
            .set({
              status: 'completed',
              updatedAt: new Date().toISOString()
            })
            .where(eq(paymentReferencesTable.reference, paymentDetails.reference));

          return res.status(200).json({
            paid: true,
            status: statusMessage,
            amount: amountInDollars, // ✅ Return correct amount
            reference: paymentDetails.reference,
            timestamp: new Date().toISOString()
          });
        } else {
          console.error('❌ NO PENDING PAYMENT FOUND FOR DRIVER:', driverId);
          return res.status(200).json({
            paid: true,
            status: statusMessage,
            amount: null,
            reference: null,
            timestamp: new Date().toISOString()
          });
        }
      } catch (walletError) {
        console.error('❌ ERROR UPDATING WALLET VIA STATUS POLL:', walletError);
        return res.status(200).json({
          paid: true,
          status: statusMessage,
          amount: null,
          reference: null,
          error: 'Wallet update failed but payment confirmed',
          timestamp: new Date().toISOString()
        });
      }
    }

    res.status(200).json({
      paid: isPaid,
      status: statusMessage,
      amount: null,
      reference: null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ LIVE STATUS POLLING ERROR:', error);
    res.status(500).json({ 
      error: 'Failed to check payment status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}