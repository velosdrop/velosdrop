// app/api/merchant/dashboard/stats/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { merchantOrdersTable, merchantProductsTable, customersTable } from '@/src/db/schema';
import { eq, and, sql, gte } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: number };
    const merchantId = decoded.id;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = yesterday.toISOString();

    // Fetch today's orders
    const todayOrders = await db
      .select({
        count: sql<number>`count(*)`,
        total: sql<number>`sum(${merchantOrdersTable.totalAmount})`
      })
      .from(merchantOrdersTable)
      .where(
        and(
          eq(merchantOrdersTable.merchantId, merchantId),
          gte(merchantOrdersTable.createdAt, todayStart)
        )
      );

    // Fetch yesterday's orders for comparison
    const yesterdayOrders = await db
      .select({
        count: sql<number>`count(*)`,
        total: sql<number>`sum(${merchantOrdersTable.totalAmount})`
      })
      .from(merchantOrdersTable)
      .where(
        and(
          eq(merchantOrdersTable.merchantId, merchantId),
          gte(merchantOrdersTable.createdAt, yesterdayStart),
          sql`${merchantOrdersTable.createdAt} < ${todayStart}`
        )
      );

    // Fetch pending orders count
    const pendingOrders = await db
      .select({ count: sql<number>`count(*)` })
      .from(merchantOrdersTable)
      .where(
        and(
          eq(merchantOrdersTable.merchantId, merchantId),
          eq(merchantOrdersTable.status, 'pending')
        )
      );

    // Fetch total products count
    const totalProducts = await db
      .select({ count: sql<number>`count(*)` })
      .from(merchantProductsTable)
      .where(eq(merchantProductsTable.merchantId, merchantId));

    // Fetch unique customers count
    const totalCustomers = await db
      .select({ count: sql<number>`count(distinct ${merchantOrdersTable.customerId})` })
      .from(merchantOrdersTable)
      .where(eq(merchantOrdersTable.merchantId, merchantId));

    // Fetch recent orders
    const recentOrders = await db
      .select({
        id: merchantOrdersTable.id,
        orderNumber: merchantOrdersTable.orderNumber,
        items: merchantOrdersTable.items,
        totalAmount: merchantOrdersTable.totalAmount,
        status: merchantOrdersTable.status,
        createdAt: merchantOrdersTable.createdAt,
        customerName: merchantOrdersTable.customerName
      })
      .from(merchantOrdersTable)
      .where(eq(merchantOrdersTable.merchantId, merchantId))
      .orderBy(sql`${merchantOrdersTable.createdAt} DESC`)
      .limit(5);

    // Fetch popular items today
    const popularItems = await db
      .select({
        id: sql<number>`json_extract(value, '$.productId')`,
        name: sql<string>`json_extract(value, '$.name')`,
        price: sql<number>`json_extract(value, '$.price')`,
        orderCount: sql<number>`count(*)`,
        totalQuantity: sql<number>`sum(json_extract(value, '$.quantity'))`
      })
      .from(merchantOrdersTable)
      .crossJoin(sql`json_each(${merchantOrdersTable.items})`)
      .where(
        and(
          eq(merchantOrdersTable.merchantId, merchantId),
          gte(merchantOrdersTable.createdAt, todayStart)
        )
      )
      .groupBy(sql`json_extract(value, '$.productId')`)
      .orderBy(sql`count(*) DESC`)
      .limit(5);

    // Get product images for popular items
    const popularItemsWithImages = await Promise.all(
      popularItems.map(async (item) => {
        const [product] = await db
          .select({ imageUrl: merchantProductsTable.imageUrl })
          .from(merchantProductsTable)
          .where(eq(merchantProductsTable.id, item.id))
          .limit(1);
        
        return {
          ...item,
          imageUrl: product?.imageUrl || null
        };
      })
    );

    // Calculate averages and changes
    const todayCount = Number(todayOrders[0]?.count || 0);
    const todayTotal = Number(todayOrders[0]?.total || 0);
    const yesterdayCount = Number(yesterdayOrders[0]?.count || 0);
    const yesterdayTotal = Number(yesterdayOrders[0]?.total || 0);

    const avgOrderValue = todayCount > 0 ? todayTotal / todayCount : 0;
    const ordersChange = yesterdayCount > 0 
      ? ((todayCount - yesterdayCount) / yesterdayCount) * 100 
      : todayCount > 0 ? 100 : 0;
    const revenueChange = yesterdayTotal > 0 
      ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 
      : todayTotal > 0 ? 100 : 0;

    return NextResponse.json({
      todayOrders: todayCount,
      totalRevenue: todayTotal,
      pendingOrders: Number(pendingOrders[0]?.count || 0),
      totalProducts: Number(totalProducts[0]?.count || 0),
      totalCustomers: Number(totalCustomers[0]?.count || 0),
      avgOrderValue,
      revenueChange: Math.round(revenueChange * 10) / 10,
      ordersChange: Math.round(ordersChange * 10) / 10,
      recentOrders,
      popularItems: popularItemsWithImages
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}