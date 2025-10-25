// pages/api/payments/initiate.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Paynow } from 'paynow';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { amount, phone } = req.body;

  // Validate input
  if (!amount || !phone) {
    return res.status(400).json({ success: false, error: 'Amount and phone number are required.' });
  }

  // Validate environment variables
  if (!process.env.PAYNOW_ID || !process.env.PAYNOW_KEY) {
    console.error('PayNow LIVE configuration is missing');
    return res.status(500).json({ success: false, error: 'Payment gateway configuration error.' });
  }

  try {
    // Get the base URL for webhooks - USE YOUR PRODUCTION DOMAIN
    const baseUrl = process.env.NEXTAUTH_URL || 
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   'https://your-production-domain.com'; // ⚠️ UPDATE THIS

    console.log('🚀 INITIATING LIVE PAYNOW TRANSACTION');

    // Initialize Paynow with LIVE webhook URLs
    const paynow = new Paynow(
      process.env.PAYNOW_ID, // Your new LIVE Integration ID
      process.env.PAYNOW_KEY, // Your new LIVE Integration Key
      `${baseUrl}/api/payments/webhook`, // LIVE webhook URL
      `${baseUrl}/driver/payment/success` // LIVE return URL
    );

    // Create a unique payment reference
    const paymentReference = `VELOS-${Date.now()}`;
    const payment = paynow.createPayment(paymentReference, 'harmonysvinurai1@gmail.com');

    // Add items to the payment
    payment.add('Driver Wallet Top Up', Number(amount));

    console.log(`💰 LIVE PAYMENT: ${phone}, amount: $${amount}, reference: ${paymentReference}`);
    
    // Send mobile payment request
    const response = await paynow.sendMobile(payment, String(phone), 'ecocash');
    
    console.log('📨 Paynow LIVE Response:', {
      success: response.success,
      error: response.error,
      pollUrl: response.pollUrl,
      instructions: response.instructions
    });

    // Handle response
    if (response.success) {
      res.status(200).json({
        success: true,
        pollUrl: response.pollUrl,
        instructions: response.instructions,
        message: 'Payment initiated! You will receive an EcoCash prompt on your phone.'
      });
    } else {
      const errorMessage = response.error || 'Payment initiation failed';
      console.error('❌ Paynow LIVE error:', errorMessage);
      res.status(400).json({ 
        success: false, 
        error: errorMessage 
      });
    }
  } catch (error) {
    console.error('❌ LIVE Payment initiation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'An internal server error occurred. Please try again.' 
    });
  }
}