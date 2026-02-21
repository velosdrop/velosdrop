import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import { merchantOrdersTable, driversTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> } // params is a Promise
) {
  try {
    // Await the params before using them
    const { orderId } = await params;
    const orderIdNum = parseInt(orderId);
    
    // Fetch order with driver details if assigned
    const order = await db
      .select({
        id: merchantOrdersTable.id,
        status: merchantOrdersTable.status,
        statusHistory: merchantOrdersTable.statusHistory,
        estimatedPreparationTime: merchantOrdersTable.estimatedPreparationTime,
        driver: {
          id: driversTable.id,
          name: driversTable.firstName,
          phone: driversTable.phoneNumber,
          vehicleType: driversTable.vehicleType,
          numberPlate: driversTable.numberPlate,
        }
      })
      .from(merchantOrdersTable)
      .leftJoin(driversTable, eq(merchantOrdersTable.driverId, driversTable.id))
      .where(eq(merchantOrdersTable.id, orderIdNum))
      .limit(1);

    if (!order.length) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order[0]);
  } catch (error) {
    console.error('Error fetching order status:', error);
    return NextResponse.json({ error: 'Failed to fetch order status' }, { status: 500 });
  }
}