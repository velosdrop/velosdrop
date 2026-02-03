//app/api/pesepay/result/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateDriverWallet } from '@/lib/updateWallet';
import { db } from '@/src/db/index';
import { paymentReferencesTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // PesaPay sends data as form-encoded
    const formData = await request.formData();
    
    const reference = formData.get('reference');
    const status = formData.get('status');
    const amount = formData.get('amount');
    
    console.log('📥 Pesepay result webhook received:', {
      reference,
      status,
      amount
    });

    if (status === 'PAID' || status === 'SUCCESS') {
      // Find payment in database by gateway reference
      const payment = await db
        .select()
        .from(paymentReferencesTable)
        .where(eq(paymentReferencesTable.gatewayReference, reference as string))
        .limit(1);

      if (payment[0]) {
        const paymentRecord = payment[0];
        const amountNum = parseFloat(amount as string);
        
        await updateDriverWallet(paymentRecord.driverId, amountNum, paymentRecord.reference);
        
        // Update payment status
        await db
          .update(paymentReferencesTable)
          .set({
            status: 'completed',
            updatedAt: new Date().toISOString()
          })
          .where(eq(paymentReferencesTable.reference, paymentRecord.reference));
        
        console.log('✅ Wallet updated for driver:', paymentRecord.driverId);
      } else {
        console.log('⚠️ Payment not found in database for reference:', reference);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Pesepay result error:', error);
    return NextResponse.json(
      { error: 'Failed to process result' },
      { status: 500 }
    );
  }
}

// Also handle GET requests for browser redirects
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reference = searchParams.get('reference');
    const status = searchParams.get('status');
    
    console.log('🔗 Pesepay redirect received:', { reference, status });
    
    // Redirect to payment success page
    const successUrl = `/driver/payment-success?reference=${reference}&status=${status}`;
    return NextResponse.redirect(new URL(successUrl, request.url));
    
  } catch (error) {
    console.error('❌ Pesepay redirect error:', error);
    return NextResponse.redirect(new URL('/driver/topup?error=redirect_failed', request.url));
  }
}