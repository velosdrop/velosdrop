//app/api/pesepay/initiate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { paymentReferencesTable } from '@/src/db/schema';

// Import Pesepay properly
const { Pesepay } = require('pesepay');

// Initialize PesaPay with environment variables
const pesepay = new Pesepay(
  process.env.NEXT_PUBLIC_PESEPAY_INTEGRATION_KEY,
  process.env.PESEPAY_ENCRYPTION_KEY
);

// Configure URLs for redirect flow
pesepay.resultUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/pesepay/result`;
pesepay.returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/driver/payment-success`;

// Helper function to generate unique reference
const generateUniqueReference = (driverId: number): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9).toUpperCase();
  return `PESEPAY-${driverId}-${timestamp}-${random}`;
};

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { amount, driverId } = body;

    // Validate required fields
    if (!amount) {
      return NextResponse.json(
        { error: 'Amount is required' },
        { status: 400 }
      );
    }

    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      );
    }

    // Validate amount range
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 0.10 || amountNum > 100) {
      return NextResponse.json(
        { error: 'Amount must be between $0.10 and $100' },
        { status: 400 }
      );
    }

    // Validate driver ID is a number
    const driverIdNum = parseInt(driverId);
    if (isNaN(driverIdNum)) {
      return NextResponse.json(
        { error: 'Invalid driver ID format' },
        { status: 400 }
      );
    }

    // Check if PesaPay credentials are configured
    if (!process.env.NEXT_PUBLIC_PESEPAY_INTEGRATION_KEY || !process.env.PESEPAY_ENCRYPTION_KEY) {
      console.error('❌ PesaPay credentials not configured');
      return NextResponse.json(
        { error: 'Payment gateway configuration error' },
        { status: 500 }
      );
    }

    // Create PesaPay transaction
    const transaction = pesepay.createTransaction(
      amountNum,
      'USD',
      `Driver ${driverIdNum} wallet top-up - $${amountNum}`
    );

    // Initiate transaction with PesaPay
    console.log('🚀 Initiating PesaPay transaction:', {
      amount: amountNum,
      driverId: driverIdNum,
      currency: 'USD'
    });

    const response = await pesepay.initiateTransaction(transaction);

    // Check if PesaPay response is successful
    if (!response.success) {
      console.error('❌ PesaPay initiation failed:', response);
      return NextResponse.json(
        { 
          error: response.message || 'Failed to initiate payment with PesaPay',
          details: response
        },
        { status: 400 }
      );
    }

    const pesapayReference = response.referenceNumber;
    const redirectUrl = response.redirectUrl;

    // Generate unique reference for our database
    const uniqueReference = generateUniqueReference(driverIdNum);
    const amountInCents = Math.round(amountNum * 100);

    console.log('📝 Saving payment reference to database:', {
      driverId: driverIdNum,
      reference: uniqueReference,
      gatewayReference: pesapayReference,
      amount: amountNum,
      amountInCents: amountInCents
    });

    // Save payment reference to database
    try {
      await db.insert(paymentReferencesTable).values({
        driverId: driverIdNum,
        reference: uniqueReference,
        gatewayReference: pesapayReference,
        amount: amountInCents,
        status: 'pending',
        paymentMethod: 'card',
        redirectUrl: redirectUrl,
        currency: 'USD',
        paymentReason: `Driver ${driverIdNum} wallet top-up`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log('✅ Payment reference saved successfully:', uniqueReference);
    } catch (dbError) {
      console.error('❌ Database error saving payment reference:', dbError);
      return NextResponse.json(
        { error: 'Failed to save payment record' },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      redirectUrl: redirectUrl,
      referenceNumber: pesapayReference,
      transactionReference: uniqueReference,
      amount: amountNum,
      driverId: driverIdNum,
      message: 'Payment initiated successfully'
    });

  } catch (error) {
    console.error('❌ PesaPay initiation error:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('❌ Error details:', { message: errorMessage, stack: errorStack });

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

