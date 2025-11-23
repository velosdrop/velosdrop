//lib/updateWallet.ts
import { driversTable, driverTransactions } from '@/src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/src/db/index';

export async function updateDriverWallet(
  driverId: number, 
  amount: number, 
  paymentReference: string
) {
  // ✅ ADDED: Unique update ID for tracking
  const updateId = Math.random().toString(36).substr(2, 9);
  
  try {
    console.log('💰 STARTING updateDriverWallet - UPDATE ID:', updateId, { 
      driverId, 
      amount, 
      paymentReference 
    });

    // ✅ ADDED: Check for existing transaction with this payment reference
    const existingTransaction = await db
      .select()
      .from(driverTransactions)
      .where(eq(driverTransactions.payment_intent_id, paymentReference))
      .limit(1);

    if (existingTransaction.length > 0) {
      console.log('⚠️ DUPLICATE TRANSACTION DETECTED - SKIPPING:', {
        updateId: updateId,
        paymentReference: paymentReference,
        existingTransactionId: existingTransaction[0].id,
        existingStatus: existingTransaction[0].status
      });
      
      // Return the existing transaction instead of creating a new one
      return { 
        id: driverId, 
        newBalance: existingTransaction[0].amount,
        skipped: true,
        reason: 'duplicate_transaction'
      };
    }

    // Convert amount to cents for storage
    const amountInCents = Math.round(amount * 100);
    console.log('💰 AMOUNT CONVERSION - UPDATE ID:', updateId, { 
      originalAmount: amount, 
      amountInCents,
      expectedFor$0_10: amount === 0.10 ? '10 cents' : 'check_amount'
    });

    // Update driver balance and create transaction record in a transaction
    const result = await db.transaction(async (tx) => {
      console.log('🔄 STARTING DATABASE TRANSACTION - UPDATE ID:', updateId);
      
      // 1. Get current balance first for debugging
      const currentBalance = await tx
        .select({ balance: driversTable.balance })
        .from(driversTable)
        .where(eq(driversTable.id, driverId))
        .limit(1);

      const currentBalanceCents = currentBalance[0]?.balance || 0;
      console.log('💰 CURRENT BALANCE BEFORE UPDATE - UPDATE ID:', updateId, {
        currentBalanceCents: currentBalanceCents,
        currentBalanceDollars: (currentBalanceCents / 100).toFixed(2),
        driverId: driverId
      });

      // 2. Calculate what the new balance should be
      const expectedNewBalance = currentBalanceCents + amountInCents;
      console.log('🧮 BALANCE CALCULATION - UPDATE ID:', updateId, {
        currentBalance: currentBalanceCents,
        adding: amountInCents,
        expectedNewBalance: expectedNewBalance,
        expectedNewBalanceDollars: (expectedNewBalance / 100).toFixed(2)
      });

      // 3. Update driver's balance
      console.log('🔄 UPDATING DRIVER BALANCE - UPDATE ID:', updateId);
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

      console.log('✅ BALANCE UPDATE RESULT - UPDATE ID:', updateId, {
        driverId: updateResult[0]?.id,
        newBalance: updateResult[0]?.newBalance,
        newBalanceDollars: updateResult[0]?.newBalance ? (updateResult[0].newBalance / 100).toFixed(2) : 'unknown'
      });

      // 4. Create transaction record
      console.log('🔄 CREATING TRANSACTION RECORD - UPDATE ID:', updateId);
      const transactionResult = await tx.insert(driverTransactions).values({
        driver_id: driverId,
        amount: amountInCents,
        payment_intent_id: paymentReference,
        status: 'completed',
        created_at: new Date().toISOString()
      }).returning();

      console.log('✅ TRANSACTION CREATED - UPDATE ID:', updateId, {
        transactionId: transactionResult[0]?.id,
        driverId: driverId,
        amount: amountInCents,
        paymentReference: paymentReference
      });

      return {
        ...updateResult[0],
        transactionId: transactionResult[0]?.id,
        updateId: updateId
      };
    });

    console.log('✅ TRANSACTION COMPLETED SUCCESSFULLY - UPDATE ID:', updateId, {
      driverId: result.id,
      newBalance: result.newBalance,
      newBalanceDollars: (result.newBalance / 100).toFixed(2),
      transactionId: result.transactionId
    });
    
    // Verify the update worked
    const verifyBalance = await db
      .select({ balance: driversTable.balance })
      .from(driversTable)
      .where(eq(driversTable.id, driverId))
      .limit(1);

    const verifiedBalance = verifyBalance[0]?.balance || 0;
    console.log('🔍 VERIFICATION - CURRENT BALANCE AFTER UPDATE - UPDATE ID:', updateId, {
      verifiedBalanceCents: verifiedBalance,
      verifiedBalanceDollars: (verifiedBalance / 100).toFixed(2),
      matchesExpected: verifiedBalance === result.newBalance
    });

    // ✅ ADDED: Final validation
    if (verifiedBalance !== result.newBalance) {
      console.error('❌ BALANCE VERIFICATION FAILED - UPDATE ID:', updateId, {
        expected: result.newBalance,
        actual: verifiedBalance,
        difference: verifiedBalance - result.newBalance
      });
    } else {
      console.log('🎉 BALANCE VERIFICATION PASSED - UPDATE ID:', updateId, {
        finalBalance: verifiedBalance,
        finalBalanceDollars: (verifiedBalance / 100).toFixed(2)
      });
    }

    return result;

  } catch (error) {
    console.error('❌ ERROR IN updateDriverWallet - UPDATE ID:', updateId, error);
    console.error('❌ ERROR DETAILS - UPDATE ID:', updateId, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
      driverId: driverId,
      amount: amount,
      paymentReference: paymentReference
    });
    
    throw new Error(`Failed to update wallet balance - Update ID: ${updateId}`);
  }
}