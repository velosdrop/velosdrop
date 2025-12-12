//app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { 
  platformEarnings, 
  deliveryRequestsTable, 
  driversTable, 
  customersTable, 
  driverRatingsTable,
  driverCommissionDeductions
} from '@/src/db/schema';
import { sql, and, gte, lte, desc, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || 'month'; // day, week, month, year, all
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (timeRange) {
      case 'day':
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
      case 'custom':
        startDate = startDateParam ? new Date(startDateParam) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = endDateParam ? new Date(endDateParam) : now;
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build date filter
    const dateFilter = and(
      gte(deliveryRequestsTable.createdAt, startDate.toISOString()),
      lte(deliveryRequestsTable.createdAt, endDate.toISOString())
    );

    // 1. REVENUE ANALYTICS
    const revenueData = await db
      .select({
        date: sql<string>`DATE(${platformEarnings.created_at})`,
        totalRevenue: sql<number>`SUM(${platformEarnings.commission_amount})`,
        deliveries: sql<number>`COUNT(*)`,
      })
      .from(platformEarnings)
      .where(gte(platformEarnings.created_at, startDate.toISOString()))
      .groupBy(sql`DATE(${platformEarnings.created_at})`)
      .orderBy(asc(sql`DATE(${platformEarnings.created_at})`));

    // 2. DELIVERY PERFORMANCE
    const deliveryStats = await db
      .select({
        totalDeliveries: sql<number>`COUNT(*)`,
        completedDeliveries: sql<number>`SUM(CASE WHEN ${deliveryRequestsTable.status} = 'completed' THEN 1 ELSE 0 END)`,
        pendingDeliveries: sql<number>`SUM(CASE WHEN ${deliveryRequestsTable.status} = 'pending' THEN 1 ELSE 0 END)`,
        cancelledDeliveries: sql<number>`SUM(CASE WHEN ${deliveryRequestsTable.status} = 'cancelled' THEN 1 ELSE 0 END)`,
        totalFareValue: sql<number>`SUM(${deliveryRequestsTable.fare})`,
        averageDistance: sql<number>`AVG(${deliveryRequestsTable.distance})`,
        averageFare: sql<number>`AVG(${deliveryRequestsTable.fare})`,
      })
      .from(deliveryRequestsTable)
      .where(dateFilter)
      .then(rows => rows[0]);

    // 3. DRIVER PERFORMANCE
    const driverStats = await db
      .select({
        totalDrivers: sql<number>`COUNT(*)`,
        activeDrivers: sql<number>`SUM(CASE WHEN ${driversTable.status} = 'active' THEN 1 ELSE 0 END)`,
        onlineDrivers: sql<number>`SUM(CASE WHEN ${driversTable.isOnline} = 1 THEN 1 ELSE 0 END)`,
        averageRating: sql<number>`AVG(${driverRatingsTable.rating})`,
      })
      .from(driversTable)
      .leftJoin(driverRatingsTable, sql`${driversTable.id} = ${driverRatingsTable.driverId}`);

    // 4. CUSTOMER ANALYTICS
    const customerStats = await db
      .select({
        totalCustomers: sql<number>`COUNT(*)`,
        newCustomers: sql<number>`SUM(CASE WHEN ${customersTable.createdAt} >= ${startDate.toISOString()} THEN 1 ELSE 0 END)`,
        activeCustomers: sql<number>`SUM(CASE WHEN ${customersTable.lastLogin} >= ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()} THEN 1 ELSE 0 END)`,
      })
      .from(customersTable)
      .then(rows => rows[0]);

    // 5. VEHICLE TYPE ANALYTICS
    const vehicleTypeStats = await db
      .select({
        vehicleType: deliveryRequestsTable.vehicleType,
        count: sql<number>`COUNT(*)`,
        totalFare: sql<number>`SUM(${deliveryRequestsTable.fare})`,
        averageFare: sql<number>`AVG(${deliveryRequestsTable.fare})`,
      })
      .from(deliveryRequestsTable)
      .where(and(dateFilter, sql`${deliveryRequestsTable.vehicleType} IS NOT NULL`))
      .groupBy(deliveryRequestsTable.vehicleType)
      .orderBy(desc(sql`COUNT(*)`));

    // 6. TOP PERFORMERS
    const topDrivers = await db
      .select({
        driverId: driversTable.id,
        firstName: driversTable.firstName,
        lastName: driversTable.lastName,
        totalDeliveries: sql<number>`COUNT(${deliveryRequestsTable.id})`,
        totalEarnings: sql<number>`SUM(${driverCommissionDeductions.fare_amount} - ${driverCommissionDeductions.commission_amount})`,
        averageRating: sql<number>`AVG(${driverRatingsTable.rating})`,
      })
      .from(driversTable)
      .leftJoin(deliveryRequestsTable, sql`${driversTable.id} = ${deliveryRequestsTable.assignedDriverId}`)
      .leftJoin(driverCommissionDeductions, sql`${driversTable.id} = ${driverCommissionDeductions.driver_id}`)
      .leftJoin(driverRatingsTable, sql`${driversTable.id} = ${driverRatingsTable.driverId}`)
      .groupBy(driversTable.id)
      .orderBy(desc(sql`COUNT(${deliveryRequestsTable.id})`))
      .limit(10);

    // 7. HOURLY DISTRIBUTION
    const hourlyStats = await db
      .select({
        hour: sql<number>`CAST(strftime('%H', ${deliveryRequestsTable.createdAt}) AS INTEGER)`,
        deliveries: sql<number>`COUNT(*)`,
      })
      .from(deliveryRequestsTable)
      .where(dateFilter)
      .groupBy(sql`strftime('%H', ${deliveryRequestsTable.createdAt})`)
      .orderBy(sql`strftime('%H', ${deliveryRequestsTable.createdAt})`);

    // 8. GEOGRAPHIC DATA
    const locationStats = await db
      .select({
        pickupArea: sql<string>`SUBSTR(${deliveryRequestsTable.pickupAddress}, 1, 20)`,
        dropoffArea: sql<string>`SUBSTR(${deliveryRequestsTable.dropoffAddress}, 1, 20)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(deliveryRequestsTable)
      .where(and(
        dateFilter,
        sql`${deliveryRequestsTable.pickupAddress} IS NOT NULL`,
        sql`${deliveryRequestsTable.dropoffAddress} IS NOT NULL`
      ))
      .groupBy(
        sql`SUBSTR(${deliveryRequestsTable.pickupAddress}, 1, 20)`,
        sql`SUBSTR(${deliveryRequestsTable.dropoffAddress}, 1, 20)`
      )
      .orderBy(desc(sql`COUNT(*)`))
      .limit(15);

    // 9. COMPLETION RATE OVER TIME
    const dailyCompletion = await db
      .select({
        date: sql<string>`DATE(${deliveryRequestsTable.createdAt})`,
        total: sql<number>`COUNT(*)`,
        completed: sql<number>`SUM(CASE WHEN ${deliveryRequestsTable.status} = 'completed' THEN 1 ELSE 0 END)`,
        completionRate: sql<number>`(SUM(CASE WHEN ${deliveryRequestsTable.status} = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*))`,
      })
      .from(deliveryRequestsTable)
      .where(dateFilter)
      .groupBy(sql`DATE(${deliveryRequestsTable.createdAt})`)
      .orderBy(asc(sql`DATE(${deliveryRequestsTable.createdAt})`));

    // 10. REVENUE BREAKDOWN
    const revenueBreakdown = {
      totalCommission: await db
        .select({ total: sql<number>`SUM(${platformEarnings.commission_amount})` })
        .from(platformEarnings)
        .where(gte(platformEarnings.created_at, startDate.toISOString()))
        .then(rows => rows[0]?.total || 0),
      
      totalFareValue: deliveryStats.totalFareValue || 0,
      
      averageCommissionRate: deliveryStats.totalFareValue 
        ? ((deliveryStats.totalFareValue * 0.135) / deliveryStats.totalFareValue) * 100 
        : 13.5,
    };

    return NextResponse.json({
      success: true,
      data: {
        timeRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          range: timeRange,
        },
        summary: {
          totalRevenue: revenueData.reduce((sum, day) => sum + (day.totalRevenue || 0), 0),
          totalDeliveries: deliveryStats.totalDeliveries || 0,
          completionRate: deliveryStats.totalDeliveries 
            ? ((deliveryStats.completedDeliveries || 0) / deliveryStats.totalDeliveries) * 100 
            : 0,
          activeDrivers: driverStats[0]?.activeDrivers || 0,
          totalCustomers: customerStats.totalCustomers || 0,
          averageRating: driverStats[0]?.averageRating || 0,
          averageFare: deliveryStats.averageFare || 0,
        },
        charts: {
          revenueTrend: revenueData,
          hourlyDistribution: hourlyStats,
          vehicleTypeBreakdown: vehicleTypeStats,
          dailyCompletionRate: dailyCompletion,
        },
        tables: {
          topDrivers,
          popularRoutes: locationStats,
          vehicleTypeStats,
        },
        metrics: {
          deliveryStats,
          driverStats: driverStats[0],
          customerStats,
          revenueBreakdown,
        },
      },
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

// Get real-time statistics
export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json();

    if (type === 'realtime') {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const realtimeStats = await Promise.all([
        // Active deliveries in last hour
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(deliveryRequestsTable)
          .where(and(
            gte(deliveryRequestsTable.createdAt, oneHourAgo.toISOString()),
            sql`${deliveryRequestsTable.status} IN ('pending', 'in_progress')`
          ))
          .then(rows => rows[0]?.count || 0),

        // New drivers today
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(driversTable)
          .where(gte(driversTable.createdAt, today.toISOString()))
          .then(rows => rows[0]?.count || 0),

        // New customers today
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(customersTable)
          .where(gte(customersTable.createdAt, today.toISOString()))
          .then(rows => rows[0]?.count || 0),

        // Revenue today
        db
          .select({ total: sql<number>`SUM(${platformEarnings.commission_amount})` })
          .from(platformEarnings)
          .where(gte(platformEarnings.created_at, today.toISOString()))
          .then(rows => rows[0]?.total || 0),

        // Online drivers
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(driversTable)
          .where(sql`${driversTable.isOnline} = 1`)
          .then(rows => rows[0]?.count || 0),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          activeDeliveriesLastHour: realtimeStats[0],
          newDriversToday: realtimeStats[1],
          newCustomersToday: realtimeStats[2],
          revenueToday: realtimeStats[3],
          onlineDriversNow: realtimeStats[4],
          updatedAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request type' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error fetching realtime stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch realtime statistics' },
      { status: 500 }
    );
  }
}