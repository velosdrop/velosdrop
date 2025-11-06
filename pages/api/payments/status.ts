//pages/api/payments/status.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Paynow } from 'paynow';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { pollUrl } = req.query;

  if (!pollUrl || typeof pollUrl !== 'string') {
    return res.status(400).json({ error: 'Poll URL is required' });
  }

  // Validate environment variables
  if (!process.env.PAYNOW_ID || !process.env.PAYNOW_KEY) {
    console.error('PayNow LIVE credentials missing');
    return res.status(500).json({ error: 'Payment gateway configuration error' });
  }

  try {
    console.log('🔍 POLLING LIVE PAYMENT STATUS:', pollUrl);
    
    const paynow = new Paynow(
      process.env.PAYNOW_ID, // LIVE: 22326
      process.env.PAYNOW_KEY // LIVE: 2eef093c-34ca-40d2-aaa9-0af6e41ef3c8
    );

    const status = await paynow.pollTransaction(pollUrl);
    
    console.log('📊 LIVE STATUS RESPONSE:', {
      statusType: typeof status,
      statusData: status
    });
    
    // Type assertion to handle the status object safely
    const statusObj = status as any;
    
    let isPaid = false;
    let statusMessage = 'pending';
    let amount = null;
    let reference = null;
    
    if (statusObj && typeof statusObj === 'object') {
      // Extract payment details
      amount = statusObj.amount || null;
      reference = statusObj.reference || null;
      
      // Method 1: Check if paid is a function
      if (typeof statusObj.paid === 'function') {
        isPaid = statusObj.paid();
        statusMessage = isPaid ? 'paid' : 'pending';
        console.log('✅ Using status.paid() method:', isPaid);
      } 
      // Method 2: Check if paid is a boolean property
      else if (typeof statusObj.paid === 'boolean') {
        isPaid = statusObj.paid;
        statusMessage = isPaid ? 'paid' : 'pending';
        console.log('✅ Using status.paid property:', isPaid);
      }
      // Method 3: Check status property
      else if (statusObj.status) {
        const statusStr = String(statusObj.status).toLowerCase();
        isPaid = statusStr === 'paid' || statusStr === 'success' || statusStr === 'completed';
        statusMessage = statusStr;
        console.log('✅ Using status.status:', statusStr, 'Paid:', isPaid);
      }
      // Method 4: Check for payment confirmation
      else if (amount && reference) {
        isPaid = true;
        statusMessage = 'paid';
        console.log('✅ Payment confirmed via details');
      }
      
      // Log all properties for debugging
      console.log('🔍 LIVE STATUS PROPERTIES:');
      for (const key in statusObj) {
        if (statusObj.hasOwnProperty(key)) {
          console.log(`   ${key}:`, statusObj[key]);
        }
      }
    } else {
      console.log('❌ Invalid status object:', statusObj);
    }
    
    console.log('🎯 FINAL LIVE STATUS:', {
      paid: isPaid,
      status: statusMessage,
      amount: amount,
      reference: reference
    });
    
    res.status(200).json({
      paid: isPaid,
      status: statusMessage,
      amount: amount,
      reference: reference,
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