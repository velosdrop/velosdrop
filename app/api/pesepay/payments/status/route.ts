//app/api/pesepay/payments/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { sql, eq } from 'drizzle-orm';
import { paymentReferencesTable, driversTable } from '@/src/db/schema';
const { Pesepay } = require('pesepay');

const pesepay = new Pesepay(
  process.env.NEXT_PUBLIC_PESEPAY_INTEGRATION_KEY,
  process.env.PESEPAY_ENCRYPTION_KEY
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pollUrl = searchParams.get('pollUrl');
    const driverId = searchParams.get('driverId');

    console.log('🔍 Payment status check:', { pollUrl, driverId });

    // Extract reference from pollUrl or use driverId to find payment
    const reference = pollUrl?.split('/').pop() || driverId;
    
    if (!reference) {
      return NextResponse.json({
        success: true,
        paid: false,
        status: 'pending',
        message: 'No reference found'
      });
    }

    // Check database for any payments for this driver
    const payments = await db
      .select()
      .from(paymentReferencesTable)
      .where(eq(paymentReferencesTable.driverId, parseInt(driverId || '0')))
      .orderBy(paymentReferencesTable.createdAt)
      .limit(5);

    console.log('📊 Found payments for driver:', payments.length);

    // Check the most recent payment
    const recentPayment = payments[0];
    
    if (recentPayment) {
      console.log('📊 Recent payment:', {
        reference: recentPayment.reference,
        status: recentPayment.status,
        amount: recentPayment.amount
      });

      // If payment is completed, return wallet balance too
      if (recentPayment.status === 'completed') {
        const driver = await db
          .select({ balance: driversTable.balance })
          .from(driversTable)
          .where(eq(driversTable.id, recentPayment.driverId))
          .limit(1);

        return NextResponse.json({
          success: true,
          paid: true,
          status: 'completed',
          amount: (recentPayment.amount / 100).toFixed(2),
          reference: recentPayment.reference,
          balance: driver[0]?.balance || 0,
          balanceDollars: driver[0]?.balance ? (driver[0].balance / 100).toFixed(2) : '0.00'
        });
      }

      // If pending, check with PesaPay
      if (recentPayment.status === 'pending' && recentPayment.gatewayReference) {
        try {
          const status = await pesepay.checkPayment(recentPayment.gatewayReference);
          
          console.log('🌐 PesaPay status:', {
            paid: status.paid,
            status: status.transactionStatus
          });

          const isPaid = status.paid === true || 
                        status.transactionStatus === 'PAID' || 
                        status.transactionStatus === 'SUCCESS';

          if (isPaid) {
            // Update database
            await db
              .update(paymentReferencesTable)
              .set({
                status: 'completed',
                updatedAt: new Date().toISOString()
              })
              .where(eq(paymentReferencesTable.id, recentPayment.id));

            // Update driver balance
            await db
              .update(driversTable)
              .set({
                balance: sql`${driversTable.balance} + ${recentPayment.amount}`,
                updatedAt: new Date().toISOString()
              })
              .where(eq(driversTable.id, recentPayment.driverId));
          }

          return NextResponse.json({
            success: true,
            paid: isPaid,
            status: isPaid ? 'completed' : (status.transactionStatus || 'pending'),
            amount: (recentPayment.amount / 100).toFixed(2),
            reference: recentPayment.reference
          });
        } catch (error) {
          console.error('PesaPay check error:', error);
        }
      }

      return NextResponse.json({
        success: true,
        paid: recentPayment.status === 'completed',
        status: recentPayment.status || 'pending',
        amount: (recentPayment.amount / 100).toFixed(2),
        reference: recentPayment.reference
      });
    }

    // No payment found
    return NextResponse.json({
      success: true,
      paid: false,
      status: 'not_found',
      message: 'No payment found for this driver'
    });

  } catch (error) {
    console.error('❌ Payment status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check payment status'
      },
      { status: 500 }
    );
  }
}