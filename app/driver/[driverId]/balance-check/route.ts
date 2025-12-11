// app/api/drivers/[driverId]/balance-check/route.ts
import { db } from '@/src/db';
import { driversTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

interface RouteContext {
  params: Promise<{ driverId: string }>;
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const driverId = parseInt(params.driverId);
    const { fare, commissionPercentage = 0.135 } = await request.json();
    
    if (isNaN(driverId)) {
      return Response.json({ error: 'Invalid driver ID' }, { status: 400 });
    }
    
    const driver = await db.select()
      .from(driversTable)
      .where(eq(driversTable.id, driverId))
      .limit(1);
    
    if (!driver || driver.length === 0) {
      return Response.json({ error: 'Driver not found' }, { status: 404 });
    }
    
    const currentBalance = driver[0].balance / 100; // Convert to dollars
    const requiredCommission = fare * commissionPercentage;
    const hasSufficientBalance = currentBalance >= requiredCommission;
    
    return Response.json({
      hasSufficientBalance,
      currentBalance,
      requiredCommission,
      shortfall: hasSufficientBalance ? 0 : requiredCommission - currentBalance,
      message: hasSufficientBalance 
        ? `Sufficient balance: $${currentBalance.toFixed(2)} available`
        : `Insufficient balance: Need $${requiredCommission.toFixed(2)} but only have $${currentBalance.toFixed(2)}`
    });
    
  } catch (error) {
    console.error('Error checking balance:', error);
    return Response.json({ 
      error: 'Failed to check balance',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}