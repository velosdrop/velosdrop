// pages/api/drivers/update-wallet.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@libsql/client/web';

// Simple auth helper for testing
async function verifyAuth(token: string): Promise<any> {
  try {
    // For testing, assume token is the driver ID
    const driverId = parseInt(token);
    return isNaN(driverId) ? null : { driverId };
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

  // For testing, get driverId from body instead of auth
  const { driverId, amount, reference, type = 'topup' } = req.body;

  // Validate input
  if (!driverId || !amount || !reference) {
    return res.status(400).json({ 
      success: false, 
      error: 'Driver ID, amount, and reference are required.' 
    });
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid amount provided.' 
    });
  }

  try {
    const turso = createClient({
      url: process.env.TURSO_CONNECTION_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    // Convert amount to cents for storage
    const amountInCents = Math.round(amountNum * 100);

    // Verify driver exists
    const driverResult = await turso.execute({
      sql: 'SELECT id, status FROM drivers WHERE id = ?',
      args: [driverId]
    });

    if (driverResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    // Update driver's balance
    const updateResult = await turso.execute({
      sql: 'UPDATE drivers SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [amountInCents, driverId]
    });

    if (updateResult.rowsAffected === 0) {
      throw new Error('Failed to update driver balance');
    }

    // Create transaction record
    await turso.execute({
      sql: `INSERT INTO driver_transactions 
            (driver_id, amount, payment_intent_id, status, created_at) 
            VALUES (?, ?, ?, 'completed', CURRENT_TIMESTAMP)`,
      args: [driverId, amountInCents, reference]
    });

    // Update EcoCash transaction status if it exists
    try {
      await turso.execute({
        sql: `UPDATE ecocash_transactions 
              SET status = 'paid', updated_at = CURRENT_TIMESTAMP 
              WHERE reference = ? AND driver_id = ?`,
        args: [reference, driverId]
      });
    } catch (error) {
      console.log('Note: EcoCash transaction not found for reference:', reference);
    }

    // Get updated balance
    const balanceResult = await turso.execute({
      sql: 'SELECT balance FROM drivers WHERE id = ?',
      args: [driverId]
    });

    const newBalance = balanceResult.rows[0]?.balance as number || 0;

    console.log(`✅ Wallet updated for driver ${driverId}: +$${amountNum} (ref: ${reference}), new balance: $${(newBalance / 100).toFixed(2)}`);

    res.status(200).json({
      success: true,
      message: 'Wallet updated successfully',
      newBalance: newBalance,
      amountAdded: amountInCents
    });

  } catch (error) {
    console.error('❌ Error updating wallet:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update wallet balance' 
    });
  }
}