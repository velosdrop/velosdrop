//app/api/admin/recent-orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { deliveryRequestsTable, customersTable, driversTable } from '@/src/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
    const status = searchParams.get('status'); // Optional filter by status

    // Build where conditions
    const conditions = [];
    if (status) {
      conditions.push(eq(deliveryRequestsTable.status, status));
    }

    // Fetch recent orders with customer and driver info
    const orders = await db
      .select({
        id: deliveryRequestsTable.id,
        customerId: deliveryRequestsTable.customerId,
        customerUsername: deliveryRequestsTable.customerUsername,
        assignedDriverId: deliveryRequestsTable.assignedDriverId,
        pickupAddress: deliveryRequestsTable.pickupAddress,
        dropoffAddress: deliveryRequestsTable.dropoffAddress,
        fare: deliveryRequestsTable.fare,
        distance: deliveryRequestsTable.distance,
        vehicleType: deliveryRequestsTable.vehicleType,
        status: deliveryRequestsTable.status,
        deliveryStatus: deliveryRequestsTable.deliveryStatus,
        createdAt: deliveryRequestsTable.createdAt,
        expiresAt: deliveryRequestsTable.expiresAt,
        // Customer info
        customerEmail: customersTable.email,
        customerPhone: customersTable.phoneNumber,
        // Driver info
        driverFirstName: driversTable.firstName,
        driverLastName: driversTable.lastName,
        driverPhone: driversTable.phoneNumber,
        driverStatus: driversTable.status,
      })
      .from(deliveryRequestsTable)
      .leftJoin(customersTable, eq(deliveryRequestsTable.customerId, customersTable.id))
      .leftJoin(driversTable, eq(deliveryRequestsTable.assignedDriverId, driversTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(deliveryRequestsTable.createdAt))
      .limit(limit);

    // Transform the data for the dashboard
    const transformedOrders = orders.map(order => ({
      id: `ORD-${order.id.toString().padStart(4, '0')}`,
      customer: order.customerUsername || `Customer ${order.customerId}`,
      driver: order.assignedDriverId 
        ? `${order.driverFirstName || ''} ${order.driverLastName || ''}`.trim() 
        : 'Unassigned',
      status: mapDeliveryStatus(order.status, order.deliveryStatus),
      amount: order.fare || 0,
      time: formatTimeAgo(order.createdAt),
      pickup: order.pickupAddress || 'N/A',
      dropoff: order.dropoffAddress || 'N/A',
      distance: order.distance ? `${order.distance.toFixed(1)} km` : 'N/A',
      vehicleType: order.vehicleType || 'car',
      customerAvatar: order.customerUsername ? order.customerUsername.charAt(0).toUpperCase() : 'C',
      driverAvatar: order.driverFirstName 
        ? (order.driverFirstName.charAt(0) || '') + (order.driverLastName?.charAt(0) || '')
        : 'U',
      rawStatus: order.status,
      deliveryStatus: order.deliveryStatus,
    }));

    return NextResponse.json({
      success: true,
      data: transformedOrders,
      total: transformedOrders.length,
    });
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent orders' },
      { status: 500 }
    );
  }
}

// Helper function to map database status to dashboard status
function mapDeliveryStatus(status: string, deliveryStatus: string): string {
  if (deliveryStatus === 'completed') return 'delivered';
  if (deliveryStatus === 'en_route' || deliveryStatus === 'arrived') return 'in_progress';
  if (status === 'pending' || deliveryStatus === 'pending') return 'pending';
  if (status === 'expired') return 'expired';
  if (status === 'cancelled') return 'cancelled';
  return status;
}

// Helper function to format time ago
function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}