// pages/api/payments/webhook.ts
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
    
    console.log('🔔 LIVE WEBHOOK RECEIVED:', paymentStatus);

    // TODO: Update your database with payment status for live transactions
    // Example: Update driver's wallet balance if payment is successful
    // await updateDriverWallet(paymentStatus.reference, paymentStatus.amount, paymentStatus.status);

    // Always return success to Paynow
    res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('❌ LIVE WEBHOOK ERROR:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}