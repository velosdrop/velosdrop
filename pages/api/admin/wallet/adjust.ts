// pages/api/admin/wallet/adjust.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/src/db/index';
import { driversTable, adminWalletAdjustments, driverTransactions } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';

// Helper function to check admin authentication from cookies
async function getAdminSession(req: NextApiRequest) {
  try {
    const sessionCookie = req.cookies['admin-session'];
    if (!sessionCookie) {
      return null;
    }
    
    const sessionData = JSON.parse(sessionCookie);
    return sessionData;
  } catch (error) {
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Check admin authentication using your cookie system
  const session = await getAdminSession(req);
  if (!session?.isAuthenticated) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { driverId, amount, type, reason, note } = req.body;

  // Validate required fields
  if (!driverId || amount === undefined || !type || !reason) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate amount
  if (typeof amount !== 'number' || amount === 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Get current driver and balance
      const driver = await tx
        .select({ balance: driversTable.balance })
        .from(driversTable)
        .where(eq(driversTable.id, driverId))
        .limit(1);

      if (driver.length === 0) {
        throw new Error('Driver not found');
      }

      const currentBalance = driver[0].balance;
      let newBalance = currentBalance;

      // 2. Calculate new balance based on type
      switch (type) {
        case 'add_funds':
          newBalance = currentBalance + amount;
          break;
        case 'deduct_funds':
          newBalance = currentBalance - amount;
          // Prevent negative balance
          if (newBalance < 0) {
            throw new Error('Balance cannot be negative');
          }
          break;
        case 'set_balance':
          newBalance = amount;
          if (newBalance < 0) {
            throw new Error('Balance cannot be negative');
          }
          break;
        default:
          throw new Error('Invalid adjustment type');
      }

      // 3. Update driver's balance
      await tx
        .update(driversTable)
        .set({ 
          balance: newBalance,
          updatedAt: new Date().toISOString()
        })
        .where(eq(driversTable.id, driverId));

      // 4. Create admin wallet adjustment record
      const adjustment = await tx
        .insert(adminWalletAdjustments)
        .values({
          adminId: session.id, // Use session ID from your cookie
          driverId,
          amount,
          type,
          reason,
          note: note || null,
          previousBalance: currentBalance,
          newBalance,
          createdAt: new Date().toISOString()
        })
        .returning();

      // 5. Create driver transaction record for audit
      const transactionDescription = getTransactionDescription(type, reason);
      await tx
        .insert(driverTransactions)
        .values({
          driver_id: driverId,
          amount: type === 'deduct_funds' ? -amount : amount,
          payment_intent_id: `admin_adjustment_${adjustment[0].id}`,
          status: 'completed',
          created_at: new Date().toISOString()
        });

      return {
        adjustment: adjustment[0],
        previousBalance: currentBalance,
        newBalance,
        change: newBalance - currentBalance
      };
    });

    res.status(200).json({
      success: true,
      message: 'Wallet balance updated successfully',
      data: result
    });

  } catch (error) {
    console.error('Wallet adjustment error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to update wallet balance' 
    });
  }
}

function getTransactionDescription(type: string, reason: string): string {
  const reasonMap: { [key: string]: string } = {
    reward: 'Admin Reward',
    refund: 'Admin Refund',
    correction: 'System Correction',
    penalty: 'Admin Penalty',
    other: 'Admin Adjustment'
  };

  const typeMap: { [key: string]: string } = {
    add_funds: 'Funds Added',
    deduct_funds: 'Funds Deducted',
    set_balance: 'Balance Set'
  };

  return `${typeMap[type]} - ${reasonMap[reason]}`;
}