//app/api/pesepay/check-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
const { Pesepay } = require('pesepay');

const pesepay = new Pesepay(
  process.env.NEXT_PUBLIC_PESEPAY_INTEGRATION_KEY,
  process.env.PESEPAY_ENCRYPTION_KEY
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const referenceNumber = searchParams.get('reference');

    if (!referenceNumber) {
      return NextResponse.json(
        { error: 'Reference number is required' },
        { status: 400 }
      );
    }

    // Check transaction status with Pesepay
    const status = await pesepay.checkPayment(referenceNumber);

    console.log('🔍 Payment status check:', {
      reference: referenceNumber,
      status: status
    });

    return NextResponse.json({
      success: true,
      paid: status.paid || false,
      status: status.transactionStatus,
      amount: status.amount,
      reference: referenceNumber
    });

  } catch (error) {
    console.error('❌ Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}