//app/api/admin/customers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { customersTable, deliveryRequestsTable } from '@/src/db/schema';
import { eq, sql, count, sum } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // First, get basic customer data
    const customers = await db
      .select({
        id: customersTable.id,
        username: customersTable.username,
        phoneNumber: customersTable.phoneNumber,
        profilePictureUrl: customersTable.profilePictureUrl,
        isVerified: customersTable.isVerified,
        status: customersTable.status,
        homeAddress: customersTable.homeAddress,
        workAddress: customersTable.workAddress,
        lastLogin: customersTable.lastLogin,
        createdAt: customersTable.createdAt,
      })
      .from(customersTable)
      .limit(limit)
      .offset(offset);

    // Get order statistics for these customers
    const customerIds = customers.map(c => c.id);
    
    // If there are customers, get their order stats, otherwise use empty arrays
    let orderStats: { customerId: number; totalOrders: number; totalSpent: number }[] = [];
    
    if (customerIds.length > 0) {
      const statsResult = await db
        .select({
          customerId: deliveryRequestsTable.customerId,
          totalOrders: count(deliveryRequestsTable.id).as('totalOrders'),
          totalSpent: sum(deliveryRequestsTable.fare).as('totalSpent')
        })
        .from(deliveryRequestsTable)
        .where(eq(deliveryRequestsTable.status, 'completed'))
        .groupBy(deliveryRequestsTable.customerId);

      // Convert totalSpent from string | null to number safely
      orderStats = statsResult.map(stat => ({
        customerId: stat.customerId,
        totalOrders: stat.totalOrders,
        totalSpent: stat.totalSpent ? parseFloat(stat.totalSpent.toString()) : 0
      }));
    }

    // Combine customer data with order statistics
    const customersWithStats = customers.map(customer => {
      const stats = orderStats.find(stat => stat.customerId === customer.id);
      return {
        ...customer,
        totalOrders: stats?.totalOrders || 0,
        totalSpent: stats?.totalSpent || 0
      };
    });

    return NextResponse.json(customersWithStats);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}