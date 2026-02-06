// pages/api/payments/status.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Paynow } from 'paynow';
import { db } from '@/src/db/index';
import { paymentReferencesTable, driverTransactions, driversTable } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { updateDriverWallet } from '@/lib/updateWallet';

// ✅ ADDED: Function to extract reference from pollUrl
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

// ✅ ADDED: Function to get payment details from database
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

// ✅ ADDED: Type definition for Paynow status response
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

// ✅ ADDED: Helper function to safely determine if payment is paid
function determinePaymentStatus(status: PaynowStatusResponse): { isPaid: boolean; statusMessage: string } {
  let isPaid = false;
  let statusMessage = 'pending';

  if (!status || typeof status !== 'object') {
    return { isPaid, statusMessage };
  }

  // ✅ FIXED: Properly handle the paid status - check if it's a function and call it
  if (status.paid !== undefined) {
    if (typeof status.paid === 'function') {
      // Call the function and convert to boolean
      isPaid = Boolean(status.paid());
      console.log('✅ Using paid() method - Result:', isPaid);
    } else if (typeof status.paid === 'boolean') {
      isPaid = status.paid;
      console.log('✅ Using paid property - Result:', isPaid);
    } else {
      console.log('⚠️ Unknown paid type:', typeof status.paid, status.paid);
    }
  }

  // Additional status checks from status field
  if (status.status) {
    const statusStr = String(status.status).toLowerCase();
    statusMessage = statusStr;
    
    // Override isPaid based on status string if it indicates payment
    if (statusStr === 'paid' || statusStr === 'success' || statusStr === 'completed') {
      isPaid = true;
      console.log('✅ Setting paid=true based on status:', statusStr);
    } else if (statusStr === 'cancelled' || statusStr === 'failed' || statusStr === 'expired') {
      isPaid = false;
      console.log('❌ Setting paid=false based on status:', statusStr);
    }
  }

  // Also check success flag if available
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

  // Validate environment variables
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
    
    // ✅ FIXED: Use the helper function to safely determine payment status
    const { isPaid, statusMessage } = determinePaymentStatus(status);

    console.log('🎯 FINAL STATUS DETERMINATION:', {
      paid: isPaid,
      status: statusMessage,
      driverId: driverId
    });

    // ✅ CRITICAL FIX: Get payment details from database when status is paid
    if (isPaid) {
      console.log('💰 PAYMENT CONFIRMED - ATTEMPTING WALLET UPDATE');
      
      try {
        // Get the latest pending payment for this driver
        const paymentDetails = await getPaymentDetails(driverId as string);
        
        if (paymentDetails) {
          console.log('📋 FOUND PAYMENT DETAILS IN DATABASE:', {
            reference: paymentDetails.reference,
            amount: paymentDetails.amount,
            driverId: paymentDetails.driverId
          });

          // Convert amount from cents to dollars
          const amountInDollars = paymentDetails.amount / 100;
          
          console.log('🚀 CALLING updateDriverWallet WITH DATABASE DATA:', {
            driverId: paymentDetails.driverId,
            amount: amountInDollars,
            reference: paymentDetails.reference
          });

          // Update driver wallet
          const updateResult = await updateDriverWallet(
            paymentDetails.driverId,
            amountInDollars,
            paymentDetails.reference
          );

          console.log('✅ updateDriverWallet RESULT:', updateResult);

          // Update payment reference status
          try {
            console.log('🔄 UPDATING PAYMENT REFERENCE STATUS TO "completed"');
            
            const referenceUpdate = await db
              .update(paymentReferencesTable)
              .set({
                status: 'completed',
                updatedAt: new Date().toISOString()
              })
              .where(eq(paymentReferencesTable.reference, paymentDetails.reference));

            console.log('✅ PAYMENT REFERENCE SUCCESSFULLY UPDATED');
          } catch (referenceError) {
            console.error('❌ ERROR UPDATING PAYMENT REFERENCE:', referenceError);
          }

          // Return success with actual payment details
          return res.status(200).json({
            paid: true,
            status: statusMessage,
            amount: amountInDollars,
            reference: paymentDetails.reference,
            timestamp: new Date().toISOString()
          });
        } else {
          console.error('❌ NO PENDING PAYMENT FOUND FOR DRIVER:', driverId);
          
          // Try alternative: extract reference from pollUrl
          const extractedReference = extractReferenceFromPollUrl(pollUrl);
          if (extractedReference) {
            console.log('🔄 TRYING WITH EXTRACTED REFERENCE:', extractedReference);
            
            // Look up payment by extracted reference
            const paymentByRef = await db
              .select()
              .from(paymentReferencesTable)
              .where(eq(paymentReferencesTable.reference, extractedReference))
              .limit(1);

            if (paymentByRef[0]) {
              const amountInDollars = paymentByRef[0].amount / 100;
              await updateDriverWallet(
                paymentByRef[0].driverId,
                amountInDollars,
                paymentByRef[0].reference
              );

              await db
                .update(paymentReferencesTable)
                .set({
                  status: 'completed',
                  updatedAt: new Date().toISOString()
                })
                .where(eq(paymentReferencesTable.reference, paymentByRef[0].reference));

              return res.status(200).json({
                paid: true,
                status: statusMessage,
                amount: amountInDollars,
                reference: paymentByRef[0].reference,
                timestamp: new Date().toISOString()
              });
            }
          }

          // If we still can't find payment details, return paid status but with null data
          console.warn('⚠️ Payment confirmed but no payment details found');
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
        // Even if wallet update fails, return the paid status
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

    // Return current status (even if not paid yet)
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