//lib/updateWallet.ts
import { driversTable, driverTransactions } from '@/src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/src/db/index';

export async function updateDriverWallet(
  driverId: number, 
  amount: number, 
  paymentReference: string
) {
  try {
    console.log('💰 STARTING updateDriverWallet:', { driverId, amount, paymentReference });

    // Convert amount to cents for storage
    const amountInCents = Math.round(amount * 100);
    console.log('💰 AMOUNT CONVERSION:', { originalAmount: amount, amountInCents });

    // Update driver balance and create transaction record in a transaction
    const result = await db.transaction(async (tx) => {
      console.log('🔄 STARTING DATABASE TRANSACTION');
      
      // 1. Get current balance first for debugging
      const currentBalance = await tx
        .select({ balance: driversTable.balance })
        .from(driversTable)
        .where(eq(driversTable.id, driverId))
        .limit(1);

      console.log('💰 CURRENT BALANCE BEFORE UPDATE:', currentBalance[0]?.balance);

      // 2. Update driver's balance
      console.log('🔄 UPDATING DRIVER BALANCE...');
      const updateResult = await tx
        .update(driversTable)
        .set({
          balance: sql`${driversTable.balance} + ${amountInCents}`,
          updatedAt: new Date().toISOString()
        })
        .where(eq(driversTable.id, driverId))
        .returning({ 
          id: driversTable.id,
          newBalance: driversTable.balance 
        });

      console.log('✅ BALANCE UPDATE RESULT:', updateResult);

      // 3. Create transaction record
      console.log('🔄 CREATING TRANSACTION RECORD...');
      const transactionResult = await tx.insert(driverTransactions).values({
        driver_id: driverId,
        amount: amountInCents,
        payment_intent_id: paymentReference,
        status: 'completed',
        created_at: new Date().toISOString()
      });

      console.log('✅ TRANSACTION CREATED:', transactionResult);

      return updateResult[0];
    });

    console.log('✅ TRANSACTION COMPLETED SUCCESSFULLY:', result);
    
    // Verify the update worked
    const verifyBalance = await db
      .select({ balance: driversTable.balance })
      .from(driversTable)
      .where(eq(driversTable.id, driverId))
      .limit(1);

    console.log('🔍 VERIFICATION - CURRENT BALANCE AFTER UPDATE:', verifyBalance[0]?.balance);

    return result;

  } catch (error) {
    console.error('❌ ERROR IN updateDriverWallet:', error);
    console.error('❌ ERROR DETAILS:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack'
    });
    throw new Error('Failed to update wallet balance');
  }
}