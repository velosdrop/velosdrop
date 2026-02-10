// /app/api/pesepay/result/route.ts - COMPLETELY UPDATED
import { NextRequest, NextResponse } from 'next/server';
import { updateDriverWallet } from '@/lib/updateWallet';
import { db } from '@/src/db/index';
import { paymentReferencesTable, driversTable, driverTransactions } from '@/src/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // PesaPay sends data as form-encoded
    const formData = await request.formData();
    
    const reference = formData.get('reference') as string;
    const status = formData.get('status') as string;
    const amount = formData.get('amount') as string;
    const currency = formData.get('currency') as string;
    const method = formData.get('method') as string;
    
    console.log('📥 PesaPay result webhook received:', {
      reference,
      status,
      amount,
      currency,
      method
    });

    // Find payment in database by gateway reference
    const payment = await db
      .select()
      .from(paymentReferencesTable)
      .where(eq(paymentReferencesTable.gatewayReference, reference))
      .limit(1);

    if (!payment[0]) {
      console.error('❌ Payment not found in database for reference:', reference);
      return NextResponse.json({ 
        success: false, 
        error: 'Payment not found',
        reference 
      }, { status: 404 });
    }

    const paymentRecord = payment[0];
    const amountNum = parseFloat(amount);
    const amountInCents = Math.round(amountNum * 100);
    
    console.log('📊 Processing payment:', {
      paymentId: paymentRecord.id,
      driverId: paymentRecord.driverId,
      amount: amountNum,
      amountInCents,
      status,
      reference: paymentRecord.reference
    });

    // Start database transaction
    const result = await db.transaction(async (tx) => {
      console.log('🔄 Starting database transaction for payment completion');
      
      // 1. Update payment status FIRST
      const updatedPayment = await tx
        .update(paymentReferencesTable)
        .set({
          status: status === 'PAID' || status === 'SUCCESS' ? 'completed' : 'failed',
          updatedAt: new Date().toISOString()
        })
        .where(eq(paymentReferencesTable.id, paymentRecord.id))
        .returning();

      console.log('✅ Payment status updated:', {
        paymentId: paymentRecord.id,
        oldStatus: paymentRecord.status,
        newStatus: updatedPayment[0]?.status
      });

      // 2. If payment is successful, update driver wallet
      if (status === 'PAID' || status === 'SUCCESS' || status === 'COMPLETED') {
        
        // Get current driver balance for logging
        const driver = await tx
          .select({ balance: driversTable.balance })
          .from(driversTable)
          .where(eq(driversTable.id, paymentRecord.driverId))
          .limit(1);

        const currentBalance = driver[0]?.balance || 0;
        console.log('💰 Current driver balance:', {
          driverId: paymentRecord.driverId,
          currentBalanceCents: currentBalance,
          currentBalanceDollars: (currentBalance / 100).toFixed(2),
          amountToAddCents: amountInCents,
          amountToAddDollars: (amountInCents / 100).toFixed(2)
        });

        // Update driver's balance
        const updatedDriver = await tx
          .update(driversTable)
          .set({
            balance: sql`${driversTable.balance} + ${amountInCents}`,
            updatedAt: new Date().toISOString()
          })
          .where(eq(driversTable.id, paymentRecord.driverId))
          .returning({ id: driversTable.id, balance: driversTable.balance });

        const newBalance = updatedDriver[0]?.balance || 0;
        console.log('✅ Driver balance updated:', {
          driverId: paymentRecord.driverId,
          newBalanceCents: newBalance,
          newBalanceDollars: (newBalance / 100).toFixed(2)
        });

        // 3. Check if transaction already exists (prevent duplicates)
        const existingTransaction = await tx
          .select()
          .from(driverTransactions)
          .where(eq(driverTransactions.payment_intent_id, `pesepay_${paymentRecord.reference}`))
          .limit(1);

        if (existingTransaction.length === 0) {
          // Create transaction record
          const transaction = await tx
            .insert(driverTransactions)
            .values({
              driver_id: paymentRecord.driverId,
              amount: amountInCents,
              payment_intent_id: `pesepay_${paymentRecord.reference}`,
              status: 'completed',
              created_at: new Date().toISOString()
            })
            .returning();

          console.log('✅ Transaction record created:', {
            transactionId: transaction[0]?.id,
            paymentReference: paymentRecord.reference
          });
        } else {
          console.log('⚠️ Transaction already exists, skipping:', {
            existingId: existingTransaction[0]?.id,
            paymentReference: paymentRecord.reference
          });
        }

        return {
          success: true,
          message: 'Payment completed and wallet updated',
          driverId: paymentRecord.driverId,
          amount: amountNum,
          newBalance: newBalance,
          newBalanceDollars: (newBalance / 100).toFixed(2),
          transactionCreated: existingTransaction.length === 0
        };
      } else {
        // Payment failed
        console.log('❌ Payment failed:', {
          status,
          reference,
          driverId: paymentRecord.driverId
        });
        
        return {
          success: false,
          message: 'Payment failed or cancelled',
          status,
          driverId: paymentRecord.driverId
        };
      }
    });

    console.log('🎉 Transaction completed successfully:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ PesaPay result error:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack'
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process payment result',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown' : undefined
      },
      { status: 500 }
    );
  }
}

// Handle GET requests for browser redirects
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reference = searchParams.get('reference');
    const status = searchParams.get('status');
    const amount = searchParams.get('amount');
    
    console.log('🔗 PesaPay redirect received:', { reference, status, amount });
    
    if (!reference) {
      console.error('❌ No reference in redirect');
      return NextResponse.redirect(new URL('/driver/topup?error=no_reference', request.url));
    }
    
    // Update payment status in database
    if (reference) {
      try {
        const payment = await db
          .select()
          .from(paymentReferencesTable)
          .where(eq(paymentReferencesTable.gatewayReference, reference))
          .limit(1);
        
        if (payment[0]) {
          const paymentRecord = payment[0];
          const paymentStatus = (status === 'PAID' || status === 'SUCCESS') ? 'completed' : 'failed';
          
          console.log('📝 Updating payment status from redirect:', {
            reference,
            oldStatus: paymentRecord.status,
            newStatus: paymentStatus,
            driverId: paymentRecord.driverId
          });
          
          // Use transaction to ensure consistency
          await db.transaction(async (tx) => {
            // Update payment status
            await tx
              .update(paymentReferencesTable)
              .set({
                status: paymentStatus,
                updatedAt: new Date().toISOString()
              })
              .where(eq(paymentReferencesTable.id, paymentRecord.id));
            
            // If payment is successful, update wallet
            if (paymentStatus === 'completed' && amount) {
              const amountNum = parseFloat(amount);
              const amountInCents = Math.round(amountNum * 100);
              
              // Update driver balance
              await tx
                .update(driversTable)
                .set({
                  balance: sql`${driversTable.balance} + ${amountInCents}`,
                  updatedAt: new Date().toISOString()
                })
                .where(eq(driversTable.id, paymentRecord.driverId));
              
              // Create transaction if it doesn't exist
              const existingTx = await tx
                .select()
                .from(driverTransactions)
                .where(eq(driverTransactions.payment_intent_id, `pesepay_${paymentRecord.reference}`))
                .limit(1);
              
              if (existingTx.length === 0) {
                await tx
                  .insert(driverTransactions)
                  .values({
                    driver_id: paymentRecord.driverId,
                    amount: amountInCents,
                    payment_intent_id: `pesepay_${paymentRecord.reference}`,
                    status: 'completed',
                    created_at: new Date().toISOString()
                  });
              }
              
              console.log('✅ Wallet updated from redirect:', {
                driverId: paymentRecord.driverId,
                amount: amountNum
              });
            }
          });
          
          console.log('✅ Payment status updated from redirect');
        } else {
          console.warn('⚠️ Payment not found for reference:', reference);
        }
      } catch (dbError) {
        console.error('❌ Error updating payment status from redirect:', dbError);
      }
    }
    
    // Redirect to payment success page with parameters
    const successUrl = new URL('/driver/payment-success', request.url);
    successUrl.searchParams.set('reference', reference || '');
    if (status) successUrl.searchParams.set('status', status);
    if (amount) successUrl.searchParams.set('amount', amount);
    successUrl.searchParams.set('fromRedirect', 'true');
    
    return NextResponse.redirect(successUrl);
    
  } catch (error) {
    console.error('❌ PesaPay redirect error:', error);
    return NextResponse.redirect(new URL('/driver/topup?error=redirect_failed', request.url));
  }
}