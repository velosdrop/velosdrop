//pages/api/payments/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Paynow sends payment status updates to this webhook
    const paymentStatus = req.body;
    
    console.log('🔔 LIVE PAYNOW WEBHOOK RECEIVED:', {
      reference: paymentStatus.reference,
      amount: paymentStatus.amount,
      status: paymentStatus.status,
      method: paymentStatus.method,
      pollUrl: paymentStatus.pollUrl,
      receivedAt: new Date().toISOString(),
      domain: 'velosdrop.vercel.app'
    });

    // Process LIVE payment based on status
    if (paymentStatus.status && paymentStatus.status.toLowerCase() === 'paid') {
      console.log('💰 LIVE PAYMENT SUCCESSFUL - Processing...', {
        reference: paymentStatus.reference,
        amount: paymentStatus.amount,
        method: paymentStatus.method
      });
      
      // TODO: Implement your LIVE database update logic here
      // Example:
      // await updateDriverWallet(
      //   paymentStatus.reference, 
      //   paymentStatus.amount, 
      //   'paid'
      // );
      
      console.log('✅ LIVE PAYMENT PROCESSED:', paymentStatus.reference);
      
    } else if (paymentStatus.status && paymentStatus.status.toLowerCase() === 'cancelled') {
      console.log('❌ LIVE PAYMENT CANCELLED:', paymentStatus.reference);
      
      // TODO: Handle cancelled payments
      // await updatePaymentStatus(paymentStatus.reference, 'cancelled');
      
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
      processedAt: new Date().toISOString(),
      domain: 'velosdrop.vercel.app'
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