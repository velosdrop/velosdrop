// pages/api/admin/wallet/history.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/src/db/index';
import { adminWalletAdjustments } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';

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
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Check admin authentication using your cookie system
  const session = await getAdminSession(req);
  if (!session?.isAuthenticated) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { driverId } = req.query;

  if (!driverId) {
    return res.status(400).json({ error: 'Driver ID is required' });
  }

  try {
    const adjustments = await db
      .select()
      .from(adminWalletAdjustments)
      .where(eq(adminWalletAdjustments.driverId, parseInt(driverId as string)))
      .orderBy(desc(adminWalletAdjustments.createdAt))
      .limit(50); // Limit to last 50 adjustments

    res.status(200).json({
      success: true,
      adjustments
    });

  } catch (error) {
    console.error('Error fetching wallet history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch wallet history' 
    });
  }
}