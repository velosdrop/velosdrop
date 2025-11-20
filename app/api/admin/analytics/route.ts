// app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { 
  deliveryRequestsTable, 
  customersTable, 
  driversTable, 
  driverRatingsTable,
  driverResponsesTable 
} from '@/src/db/schema';
import { desc, eq, and, gte, count, sum, avg, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (range) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    const startDateString = startDate.toISOString();

    // Get overview stats
    const [totalOrders, completedOrders, activeDrivers, totalCustomers, revenueData, averageRating] = await Promise.all([
      // Total orders in date range
      db.select({ count: count() })
        .from(deliveryRequestsTable)
        .where(gte(deliveryRequestsTable.createdAt, startDateString)),
      
      // Completed orders in date range
      db.select({ count: count() })
        .from(deliveryRequestsTable)
        .where(and(
          eq(deliveryRequestsTable.status, 'completed'),
          gte(deliveryRequestsTable.createdAt, startDateString)
        )),
      
      // Active drivers (online)
      db.select({ count: count() })
        .from(driversTable)
        .where(eq(driversTable.isOnline, true)),
      
      // Total customers
      db.select({ count: count() })
        .from(customersTable),
      
      // Revenue data from completed orders in date range
      db.select({ totalRevenue: sum(deliveryRequestsTable.fare) })
        .from(deliveryRequestsTable)
        .where(and(
          eq(deliveryRequestsTable.status, 'completed'),
          gte(deliveryRequestsTable.createdAt, startDateString)
        )),
      
      // Average rating
      db.select({ avgRating: avg(driverRatingsTable.rating) })
        .from(driverRatingsTable)
    ]);

    // Get order status distribution in date range
    const orderStatus = await db
      .select({
        status: deliveryRequestsTable.status,
        count: count()
      })
      .from(deliveryRequestsTable)
      .where(gte(deliveryRequestsTable.createdAt, startDateString))
      .groupBy(deliveryRequestsTable.status);

    // FIXED: Driver performance query - use the actual column in ORDER BY
    const driverPerformance = await db
      .select({
        driverId: driversTable.id,
        driverName: sql<string>`${driversTable.firstName} || ' ' || ${driversTable.lastName}`,
        completedOrders: count(),
        totalEarnings: sum(deliveryRequestsTable.fare),
        averageRating: avg(driverRatingsTable.rating),
        acceptanceRate: sql<number>`CAST(COUNT(CASE WHEN ${driverResponsesTable.response} = 'accepted' THEN 1 END) AS FLOAT) / NULLIF(COUNT(*), 0)`
      })
      .from(driversTable)
      .leftJoin(deliveryRequestsTable, and(
        eq(deliveryRequestsTable.assignedDriverId, driversTable.id),
        eq(deliveryRequestsTable.status, 'completed'),
        gte(deliveryRequestsTable.createdAt, startDateString)
      ))
      .leftJoin(driverRatingsTable, eq(driverRatingsTable.driverId, driversTable.id))
      .leftJoin(driverResponsesTable, and(
        eq(driverResponsesTable.driverId, driversTable.id),
        gte(driverResponsesTable.respondedAt, startDateString)
      ))
      .groupBy(driversTable.id, driversTable.firstName, driversTable.lastName)
      .orderBy(desc(sum(deliveryRequestsTable.fare))) // FIXED: Use the actual column instead of alias
      .limit(10);

    // Get recent reviews
    const recentReviews = await db
      .select({
        id: driverRatingsTable.id,
        driverName: sql<string>`${driversTable.firstName} || ' ' || ${driversTable.lastName}`,
        customerName: customersTable.username,
        rating: driverRatingsTable.rating,
        comment: driverRatingsTable.comment,
        createdAt: driverRatingsTable.createdAt
      })
      .from(driverRatingsTable)
      .leftJoin(driversTable, eq(driverRatingsTable.driverId, driversTable.id))
      .leftJoin(customersTable, eq(driverRatingsTable.customerId, customersTable.id))
      .orderBy(desc(driverRatingsTable.createdAt))
      .limit(5);

    // Get rating distribution
    const ratingDistribution = await db
      .select({
        rating: driverRatingsTable.rating,
        count: count()
      })
      .from(driverRatingsTable)
      .groupBy(driverRatingsTable.rating)
      .orderBy(driverRatingsTable.rating);

    // FIXED: Revenue trends - use simpler date formatting for SQLite
    const revenueTrends = await db
      .select({
        date: sql<string>`date(${deliveryRequestsTable.createdAt}) as date`,
        revenue: sum(deliveryRequestsTable.fare),
        orders: count()
      })
      .from(deliveryRequestsTable)
      .where(and(
        eq(deliveryRequestsTable.status, 'completed'),
        gte(deliveryRequestsTable.createdAt, startDateString)
      ))
      .groupBy(sql`date(${deliveryRequestsTable.createdAt})`)
      .orderBy(sql`date(${deliveryRequestsTable.createdAt})`);

    // FIXED: Customer insights - use simpler date formatting
    const customerInsights = await db
      .select({
        period: sql<string>`date(${customersTable.createdAt}) as period`,
        newCustomers: count()
      })
      .from(customersTable)
      .where(gte(customersTable.createdAt, startDateString))
      .groupBy(sql`date(${customersTable.createdAt})`)
      .orderBy(sql`date(${customersTable.createdAt})`);

    // Get geographic data (top pickup locations)
    const geographicData = await db
      .select({
        location: deliveryRequestsTable.pickupLocation,
        orderCount: count(),
        revenue: sum(deliveryRequestsTable.fare)
      })
      .from(deliveryRequestsTable)
      .where(and(
        eq(deliveryRequestsTable.status, 'completed'),
        gte(deliveryRequestsTable.createdAt, startDateString)
      ))
      .groupBy(deliveryRequestsTable.pickupLocation)
      .orderBy(desc(count()))
      .limit(5);

    // FIXED: Hourly distribution - use simpler time formatting for SQLite
    const hourlyDistribution = await db
      .select({
        hour: sql<string>`strftime('%H', ${deliveryRequestsTable.createdAt}) || ':00' as hour`,
        orders: count(),
        revenue: sum(deliveryRequestsTable.fare)
      })
      .from(deliveryRequestsTable)
      .where(and(
        eq(deliveryRequestsTable.status, 'completed'),
        gte(deliveryRequestsTable.createdAt, startDateString)
      ))
      .groupBy(sql`strftime('%H', ${deliveryRequestsTable.createdAt})`)
      .orderBy(sql`strftime('%H', ${deliveryRequestsTable.createdAt})`);

    // Transform and return data
    const totalOrdersCount = totalOrders[0]?.count || 0;
    const completedOrdersCount = completedOrders[0]?.count || 0;
    
    // Ensure totalRevenue is a number
    const totalRevenueValue = revenueData[0]?.totalRevenue || 0;
    const totalRevenue = typeof totalRevenueValue === 'number' ? totalRevenueValue : parseFloat(totalRevenueValue as string);

    // Format revenue trends data
    const formattedRevenueTrends = revenueTrends.map(trend => ({
      date: trend.date,
      revenue: parseFloat(trend.revenue?.toString() || '0'),
      orders: trend.orders
    }));

    // Format customer insights - use actual data only
    const formattedCustomerInsights = customerInsights.map(insight => ({
      period: insight.period,
      newCustomers: insight.newCustomers
    }));

    // Format geographic data
    const formattedGeographicData = geographicData.map(location => ({
      location: location.location,
      orderCount: location.orderCount,
      revenue: parseFloat(location.revenue?.toString() || '0')
    }));

    // Format hourly distribution
    const formattedHourlyDistribution = hourlyDistribution.map(hour => ({
      hour: hour.hour,
      orders: hour.orders,
      revenue: parseFloat(hour.revenue?.toString() || '0')
    }));

    // Calculate rating distribution percentages
    const totalRatings = ratingDistribution.reduce((sum: number, item: any) => sum + item.count, 0);
    const formattedRatingDistribution = ratingDistribution.map(item => ({
      rating: item.rating,
      count: item.count,
      percentage: totalRatings > 0 ? Math.round((item.count / totalRatings) * 100) : 0
    }));

    const analyticsData = {
      overview: {
        totalRevenue,
        totalOrders: totalOrdersCount,
        completedOrders: completedOrdersCount,
        activeDrivers: activeDrivers[0]?.count || 0,
        totalCustomers: totalCustomers[0]?.count || 0,
        averageRating: parseFloat(averageRating[0]?.avgRating || '0'),
        completionRate: totalOrdersCount > 0 ? completedOrdersCount / totalOrdersCount : 0,
        averageFare: completedOrdersCount > 0 ? totalRevenue / completedOrdersCount : 0
      },
      revenueTrends: formattedRevenueTrends,
      orderStatus: orderStatus.map(status => ({
        ...status,
        percentage: totalOrdersCount > 0 ? Math.round((status.count / totalOrdersCount) * 100) : 0
      })),
      driverPerformance: driverPerformance.map(driver => ({
        ...driver,
        totalEarnings: typeof driver.totalEarnings === 'number' ? driver.totalEarnings : parseFloat(driver.totalEarnings || '0'),
        averageRating: typeof driver.averageRating === 'number' ? driver.averageRating : parseFloat(driver.averageRating || '0'),
        acceptanceRate: typeof driver.acceptanceRate === 'number' ? driver.acceptanceRate : parseFloat(driver.acceptanceRate || '0')
      })),
      customerInsights: formattedCustomerInsights,
      ratingDistribution: formattedRatingDistribution,
      geographicData: formattedGeographicData,
      hourlyDistribution: formattedHourlyDistribution,
      recentReviews
    };

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}