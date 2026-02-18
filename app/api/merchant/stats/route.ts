// app/api/merchant/stats/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import { merchantOrdersTable, merchantProductsTable } from '@/src/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const merchantId = decoded.id;

    // Get today's orders
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = await db.select({ count: sql<number>`count(*)` })
      .from(merchantOrdersTable)
      .where(
        and(
          eq(merchantOrdersTable.merchantId, merchantId),
          sql`date(${merchantOrdersTable.createdAt}) = ${today}`
        )
      );

    // Get total revenue
    const revenue = await db.select({ total: sql<number>`sum(${merchantOrdersTable.totalAmount})` })
      .from(merchantOrdersTable)
      .where(eq(merchantOrdersTable.merchantId, merchantId));

    // Get pending orders
    const pendingOrders = await db.select({ count: sql<number>`count(*)` })
      .from(merchantOrdersTable)
      .where(
        and(
          eq(merchantOrdersTable.merchantId, merchantId),
          eq(merchantOrdersTable.status, 'pending')
        )
      );

    // Get total products
    const products = await db.select({ count: sql<number>`count(*)` })
      .from(merchantProductsTable)
      .where(eq(merchantProductsTable.merchantId, merchantId));

    return NextResponse.json({
      todayOrders: todayOrders[0]?.count || 0,
      totalRevenue: revenue[0]?.total || 0,
      pendingOrders: pendingOrders[0]?.count || 0,
      totalProducts: products[0]?.count || 0
    });

  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}