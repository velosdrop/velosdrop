// /app/api/fix-pending-payments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { paymentReferencesTable, driversTable, driverTransactions } from '@/src/db/schema';
import { eq, sql, and, isNull, or } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting to fix pending payments...');
    
    // Get all pending payments
    const pendingPayments = await db
      .select()
      .from(paymentReferencesTable)
      .where(
        or(
          eq(paymentReferencesTable.status, 'pending'),
          isNull(paymentReferencesTable.status)
        )
      );

    console.log(`📊 Found ${pendingPayments.length} pending payments`);
    
    const results = [];
    
    for (const payment of pendingPayments) {
      console.log(`🔄 Processing payment ${payment.id}:`, {
        reference: payment.reference,
        gatewayReference: payment.gatewayReference,
        amount: payment.amount,
        driverId: payment.driverId
      });
      
      try {
        // Update payment status to completed (assuming they're successful)
        await db
          .update(paymentReferencesTable)
          .set({
            status: 'completed',
            updatedAt: new Date().toISOString()
          })
          .where(eq(paymentReferencesTable.id, payment.id));
        
        // Update driver wallet
        await db
          .update(driversTable)
          .set({
            balance: sql`${driversTable.balance} + ${payment.amount}`,
            updatedAt: new Date().toISOString()
          })
          .where(eq(driversTable.id, payment.driverId));
        
        // Check if transaction exists
        const existingTx = await db
          .select()
          .from(driverTransactions)
          .where(eq(driverTransactions.payment_intent_id, `pesepay_${payment.reference}`))
          .limit(1);
        
        if (existingTx.length === 0) {
          await db
            .insert(driverTransactions)
            .values({
              driver_id: payment.driverId,
              amount: payment.amount,
              payment_intent_id: `pesepay_${payment.reference}`,
              status: 'completed',
              created_at: new Date().toISOString()
            });
        }
        
        results.push({
          paymentId: payment.id,
          reference: payment.reference,
          status: 'fixed',
          driverId: payment.driverId,
          amount: payment.amount
        });
        
        console.log(`✅ Fixed payment ${payment.id}`);
        
      } catch (paymentError) {
        console.error(`❌ Error fixing payment ${payment.id}:`, paymentError);
        results.push({
          paymentId: payment.id,
          reference: payment.reference,
          status: 'failed',
          error: paymentError instanceof Error ? paymentError.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${results.filter(r => r.status === 'fixed').length} payments`,
      total: pendingPayments.length,
      fixed: results.filter(r => r.status === 'fixed').length,
      failed: results.filter(r => r.status === 'failed').length,
      results
    });
    
  } catch (error) {
    console.error('❌ Fix pending payments error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fix pending payments',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}