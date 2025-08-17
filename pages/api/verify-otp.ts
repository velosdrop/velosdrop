// pages/api/verify-otp.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/src/db';
import { otpTable } from '@/src/db/schema';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phoneNumber, otp } = req.body;

  if (!phoneNumber || !otp) {
    return res.status(400).json({ error: 'Phone number and OTP required' });
  }

  try {
    // Find the most recent valid OTP for this number
    const storedOtp = await db.select()
      .from(otpTable)
      .where(
        sql`${otpTable.phoneNumber} = ${phoneNumber} 
        AND ${otpTable.code} = ${otp} 
        AND ${otpTable.expiresAt} > datetime('now')`
      )
      .limit(1)
      .get();

    if (!storedOtp) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Delete the OTP so it can't be reused
    await db.delete(otpTable)
      .where(sql`${otpTable.id} = ${storedOtp.id}`);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}