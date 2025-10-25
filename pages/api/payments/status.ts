// pages/api/payments/status.ts
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
    return res.status(500).json({ error: 'Payment gateway configuration error' });
  }

  try {
    console.log('🔍 Polling payment status for:', pollUrl);
    
    const paynow = new Paynow(
      process.env.PAYNOW_ID,
      process.env.PAYNOW_KEY
    );

    const status = await paynow.pollTransaction(pollUrl);
    
    // Debug: Log the entire status object to understand its structure
    console.log('📊 Status object type:', typeof status);
    console.log('📊 Status object:', status);
    
    // Type assertion to handle the status object safely
    const statusObj = status as any;
    
    // Check if status is an object and has the paid method
    let isPaid = false;
    
    if (statusObj && typeof statusObj === 'object') {
      // Method 1: Check if paid is a function (as per documentation)
      if (typeof statusObj.paid === 'function') {
        isPaid = statusObj.paid();
        console.log('✅ Using status.paid() method, result:', isPaid);
      } 
      // Method 2: Check if paid is a boolean property
      else if (typeof statusObj.paid === 'boolean') {
        isPaid = statusObj.paid;
        console.log('✅ Using status.paid property, result:', isPaid);
      }
      // Method 3: Check common payment status properties
      else if (statusObj.status) {
        isPaid = statusObj.status.toLowerCase() === 'paid' || statusObj.status.toLowerCase() === 'success';
        console.log('✅ Using status.status property, result:', isPaid);
      }
      // Method 4: Check if there are payment details (assume paid)
      else if (statusObj.amount && statusObj.reference) {
        isPaid = true;
        console.log('✅ Using payment details, assuming paid');
      }
      
      // Log all available properties for debugging
      console.log('🔍 All status properties:', Object.keys(statusObj));
      for (const key in statusObj) {
        if (statusObj.hasOwnProperty(key)) {
          console.log(`   ${key}:`, statusObj[key], `(type: ${typeof statusObj[key]})`);
        }
      }
    } else {
      console.log('❌ Status is not an object:', statusObj);
    }
    
    console.log('🎯 Final payment status - Paid:', isPaid);
    
    res.status(200).json({
      paid: isPaid,
      status: isPaid ? 'paid' : 'pending',
      debug: {
        pollUrl: pollUrl,
        hasPaidFunction: typeof statusObj?.paid === 'function',
        hasPaidProperty: statusObj && 'paid' in statusObj,
        allProperties: statusObj ? Object.keys(statusObj) : []
      }
    });
    
  } catch (error) {
    console.error('❌ Error polling payment status:', error);
    res.status(500).json({ 
      error: 'Failed to check payment status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}