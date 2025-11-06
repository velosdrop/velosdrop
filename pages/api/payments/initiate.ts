//pages/api/payments/initiate.ts
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

  // Updated: More flexible Zimbabwean phone number validation for LIVE mode
  const validateZimbabweNumber = (phone: string): boolean => {
    // Remove all spaces and special characters
    const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Allow: +263780517601, 0780517601, 263780517601, 780517601 (auto-corrected)
    const zimRegex = /^(\+?263|0)?(77|78|71|73)\d{7}$/;
    return zimRegex.test(cleanedPhone);
  };

  if (!validateZimbabweNumber(phone)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Please enter a valid Zimbabwean mobile number (e.g., 0771234567, 0780517601, or +263771234567).' 
    });
  }

  // Validate amount for LIVE transactions
  const amountNum = Number(amount);
  if (amountNum < 1) {
    return res.status(400).json({ 
      success: false, 
      error: 'Minimum top-up amount is $2' 
    });
  }

  if (amountNum > 1000) {
    return res.status(400).json({ 
      success: false, 
      error: 'Maximum top-up amount is $100' 
    });
  }

  // Validate environment variables
  if (!process.env.PAYNOW_ID || !process.env.PAYNOW_KEY) {
    console.error('PayNow LIVE configuration is missing');
    return res.status(500).json({ success: false, error: 'Payment gateway configuration error.' });
  }

  try {
    // Use production domain
    const baseUrl = 'https://velosdrop.vercel.app';

    console.log('🚀 INITIATING LIVE PAYNOW PAYMENT', {
      phone: phone,
      amount: amountNum,
      domain: baseUrl
    });

    // Initialize Paynow with LIVE credentials
    const paynow = new Paynow(
      process.env.PAYNOW_ID, // LIVE: 22326
      process.env.PAYNOW_KEY, // LIVE: 2eef093c-34ca-40d2-aaa9-0af6e41ef3c8
      `${baseUrl}/api/payments/webhook`, // LIVE webhook URL
      `${baseUrl}/driver/payment/success` // LIVE return URL
    );

    // Create a unique payment reference
    const paymentReference = `VELOS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const payment = paynow.createPayment(paymentReference, 'harmonysvinurai1@gmail.com');

    // Add items to the payment
    payment.add('VelosDrop Wallet Top Up', amountNum);

    // Updated: Better phone number formatting for Paynow
    let formattedPhone = phone;
    
    // Remove all non-digit characters first
    const digits = formattedPhone.replace(/\D/g, '');
    
    // Format based on different input patterns
    if (digits.startsWith('263') && digits.length === 12) {
      formattedPhone = `+${digits}`;
    } else if (digits.startsWith('0') && digits.length === 10) {
      formattedPhone = `+263${digits.substring(1)}`;
    } else if (digits.length === 9) {
      // Handle numbers missing prefix like 780517601
      formattedPhone = `+263${digits}`;
    } else if (!formattedPhone.startsWith('+263')) {
      formattedPhone = `+263${digits}`;
    }
    
    console.log('💰 LIVE PAYMENT DETAILS:', {
      originalPhone: phone,
      formattedPhone: formattedPhone,
      amount: `$${amountNum}`,
      reference: paymentReference,
      merchantEmail: 'harmonysvinurai1@gmail.com'
    });
    
    // Send mobile payment request
    const response = await paynow.sendMobile(payment, formattedPhone, 'ecocash');
    
    console.log('📨 PAYNOW LIVE RESPONSE:', {
      success: response.success,
      error: response.error,
      pollUrl: response.pollUrl,
      instructions: response.instructions,
      reference: paymentReference
    });

    // Handle response
    if (response.success) {
      res.status(200).json({
        success: true,
        pollUrl: response.pollUrl,
        instructions: response.instructions,
        reference: paymentReference,
        message: 'Payment initiated successfully! Please check your phone for the EcoCash prompt and enter your PIN to complete the payment.'
      });
    } else {
      const errorMessage = response.error || 'Payment initiation failed. Please try again.';
      console.error('❌ PAYNOW LIVE ERROR:', errorMessage);
      res.status(400).json({ 
        success: false, 
        error: errorMessage 
      });
    }
  } catch (error) {
    console.error('❌ LIVE PAYMENT INITIATION ERROR:', error);
    res.status(500).json({ 
      success: false, 
      error: 'An internal server error occurred. Please try again.' 
    });
  }
}