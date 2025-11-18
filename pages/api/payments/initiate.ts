// pages/api/payments/initiate.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Paynow } from 'paynow';
import { db } from '@/src/db/index';
import { paymentReferencesTable, driversTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { amount, phone, driverId } = req.body;

  // ✅ FIXED: Validate all required fields including driverId
  if (!amount || !phone || !driverId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Amount, phone number, and driver ID are required.' 
    });
  }

  // ✅ FIXED: Validate driver exists
  try {
    const driver = await db.select().from(driversTable).where(eq(driversTable.id, driverId)).limit(1);
    if (driver.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid driver ID. Please log in again.' 
      });
    }
  } catch (error) {
    console.error('❌ Error validating driver:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Error validating driver account.' 
    });
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
  if (isNaN(amountNum)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid amount format' 
    });
  }

  if (amountNum < 0.10) {
    return res.status(400).json({ 
      success: false, 
      error: 'Minimum top-up amount is $0.10' 
    });
  }

  if (amountNum > 100) {
    return res.status(400).json({ 
      success: false, 
      error: 'Maximum top-up amount is $100' 
    });
  }

  // Validate environment variables
  if (!process.env.PAYNOW_ID || !process.env.PAYNOW_KEY) {
    console.error('PayNow LIVE configuration is missing');
    return res.status(500).json({ 
      success: false, 
      error: 'Payment gateway configuration error.' 
    });
  }

  try {
    // Use production domain
    const baseUrl = 'https://velosdrop.vercel.app';

    console.log('🚀 INITIATING LIVE PAYNOW PAYMENT', {
      driverId: driverId,
      phone: phone,
      amount: amountNum,
      domain: baseUrl
    });

    // Initialize Paynow with LIVE credentials
    const paynow = new Paynow(
      process.env.PAYNOW_ID,
      process.env.PAYNOW_KEY,
      `${baseUrl}/api/payments/webhook`,
      `${baseUrl}/driver/payment/success`
    );

    // ✅ FIXED: Create a more descriptive payment reference
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substr(2, 9);
    const paymentReference = `VELOS-${driverId}-${timestamp}-${randomString}`;
    
    console.log('💰 CREATING PAYMENT WITH REFERENCE:', paymentReference);

    const payment = paynow.createPayment(paymentReference, 'harmonysvinurai1@gmail.com');

    // Add items to the payment
    payment.add('VelosDrop Wallet Top Up', amountNum);

    // ✅ FIXED: Store payment reference in database BEFORE initiating payment
    // Convert amount to cents for consistent storage
    const amountInCents = Math.round(amountNum * 100);
    
    console.log('💾 STORING PAYMENT REFERENCE IN DATABASE:', {
      driverId: driverId,
      reference: paymentReference,
      amountInCents: amountInCents,
      amountInDollars: amountNum
    });

    try {
      await db.insert(paymentReferencesTable).values({
        driverId: driverId,
        reference: paymentReference,
        amount: amountInCents, // Store in cents for consistency
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('✅ Payment reference stored successfully for driver:', { 
        driverId, 
        reference: paymentReference,
        amount: amountInCents 
      });
    } catch (dbError) {
      console.error('❌ CRITICAL: Error storing payment reference:', dbError);
      // Don't proceed if we can't store the reference
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to initialize payment. Please try again.' 
      });
    }

    // ✅ FIXED: Enhanced phone number formatting for Paynow
    let formattedPhone = phone;
    
    // Remove all non-digit characters first
    const digits = formattedPhone.replace(/\D/g, '');
    
    console.log('📱 PHONE NUMBER PROCESSING:', {
      original: phone,
      digits: digits,
      length: digits.length
    });

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
      driverId: driverId,
      originalPhone: phone,
      formattedPhone: formattedPhone,
      amount: amountNum,
      reference: paymentReference,
      merchantEmail: 'harmonysvinurai1@gmail.com'
    });
    
    // Send mobile payment request
    console.log('📨 SENDING MOBILE PAYMENT REQUEST TO PAYNOW...');
    const response = await paynow.sendMobile(payment, formattedPhone, 'ecocash');
    
    console.log('📨 PAYNOW LIVE RESPONSE:', {
      driverId: driverId,
      success: response.success,
      error: response.error,
      pollUrl: response.pollUrl,
      instructions: response.instructions,
      reference: paymentReference
    });

    // Handle response
    if (response.success) {
      console.log('✅ PAYMENT INITIATED SUCCESSFULLY FOR DRIVER:', driverId);
      
      res.status(200).json({
        success: true,
        pollUrl: response.pollUrl,
        instructions: response.instructions,
        reference: paymentReference,
        amount: amountNum, // ✅ ADDED: Return amount for frontend reference
        driverId: driverId, // ✅ ADDED: Return driverId for confirmation
        message: 'Payment initiated successfully! Please check your phone for the EcoCash prompt and enter your PIN to complete the payment.'
      });
    } else {
      const errorMessage = response.error || 'Payment initiation failed. Please try again.';
      console.error('❌ PAYNOW LIVE ERROR:', { 
        driverId, 
        error: errorMessage,
        formattedPhone: formattedPhone,
        amount: amountNum
      });
      
      // ✅ FIXED: Update payment reference status to failed
      try {
        await db.update(paymentReferencesTable)
          .set({ 
            status: 'failed',
            updatedAt: new Date().toISOString()
          })
          .where(eq(paymentReferencesTable.reference, paymentReference));
        console.log('✅ Updated payment reference status to failed');
      } catch (dbError) {
        console.error('❌ Error updating payment reference status:', dbError);
      }
      
      res.status(400).json({ 
        success: false, 
        error: errorMessage 
      });
    }
  } catch (error) {
    console.error('❌ LIVE PAYMENT INITIATION ERROR:', { 
      driverId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack'
    });
    
    res.status(500).json({ 
      success: false, 
      error: 'An internal server error occurred. Please try again.' 
    });
  }
}