//app/api/admin/earnings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { platformEarnings, deliveryRequestsTable } from '@/src/db/schema';
import { eq, sql, desc, and, gte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || 'all'; // 'today', 'week', 'month', 'year', 'all'
    
    // Calculate date ranges
    const now = new Date();
    let startDate: Date | null = null;
    
    switch (timeRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = null;
    }

    // Build where clause
    let whereClause = undefined;
    if (startDate) {
      whereClause = gte(platformEarnings.created_at, startDate.toISOString());
    }

    // Get total commission earnings
    const totalEarningsResult = await db
      .select({
        totalEarnings: sql<number>`SUM(${platformEarnings.commission_amount})`,
        totalDeliveries: sql<number>`COUNT(*)`,
        averageCommission: sql<number>`AVG(${platformEarnings.commission_amount})`
      })
      .from(platformEarnings)
      .where(whereClause)
      .then(rows => rows[0]);

    // Get earnings by date for chart
    const earningsByDate = await db
      .select({
        date: sql<string>`DATE(${platformEarnings.created_at})`,
        earnings: sql<number>`SUM(${platformEarnings.commission_amount})`,
        deliveries: sql<number>`COUNT(*)`
      })
      .from(platformEarnings)
      .where(startDate ? gte(platformEarnings.created_at, startDate.toISOString()) : undefined)
      .groupBy(sql`DATE(${platformEarnings.created_at})`)
      .orderBy(desc(sql`DATE(${platformEarnings.created_at})`))
      .limit(30);

    // Get recent earnings with delivery details
    const recentEarnings = await db
      .select({
        id: platformEarnings.id,
        commission_amount: platformEarnings.commission_amount,
        created_at: platformEarnings.created_at,
        delivery_id: platformEarnings.delivery_id,
        driver_id: platformEarnings.driver_id,
        customer_id: platformEarnings.customer_id,
        fare_amount: deliveryRequestsTable.fare
      })
      .from(platformEarnings)
      .leftJoin(deliveryRequestsTable, eq(platformEarnings.delivery_id, deliveryRequestsTable.id))
      .orderBy(desc(platformEarnings.created_at))
      .limit(10);

    // Get daily, weekly, monthly trends
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

    const [todayEarnings] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${platformEarnings.commission_amount}), 0)`
      })
      .from(platformEarnings)
      .where(gte(platformEarnings.created_at, today.toISOString()));

    const [yesterdayEarnings] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${platformEarnings.commission_amount}), 0)`
      })
      .from(platformEarnings)
      .where(
        and(
          gte(platformEarnings.created_at, yesterday.toISOString()),
          sql`${platformEarnings.created_at} < ${today.toISOString()}`
        )
      );

    const [thisWeekEarnings] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${platformEarnings.commission_amount}), 0)`
      })
      .from(platformEarnings)
      .where(gte(platformEarnings.created_at, lastWeek.toISOString()));

    const [thisMonthEarnings] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${platformEarnings.commission_amount}), 0)`
      })
      .from(platformEarnings)
      .where(gte(platformEarnings.created_at, lastMonth.toISOString()));

    return NextResponse.json({
      success: true,
      data: {
        totalEarnings: totalEarningsResult.totalEarnings || 0,
        totalDeliveries: totalEarningsResult.totalDeliveries || 0,
        averageCommission: totalEarningsResult.averageCommission || 0,
        earningsByDate,
        recentEarnings,
        trends: {
          today: todayEarnings?.total || 0,
          yesterday: yesterdayEarnings?.total || 0,
          thisWeek: thisWeekEarnings?.total || 0,
          thisMonth: thisMonthEarnings?.total || 0,
        }
      }
    });

  } catch (error) {
    console.error('Error fetching earnings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings data' },
      { status: 500 }
    );
  }
}