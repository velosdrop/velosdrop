// app/api/admin/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { deliveryRequestsTable, customersTable, driversTable, driverResponsesTable } from '@/src/db/schema';
import { desc, eq, and, or } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get all delivery requests with customer and driver information
    const orders = await db
      .select({
        // Delivery request fields
        id: deliveryRequestsTable.id,
        customerId: deliveryRequestsTable.customerId,
        customerUsername: deliveryRequestsTable.customerUsername,
        pickupLocation: deliveryRequestsTable.pickupLocation,
        dropoffLocation: deliveryRequestsTable.dropoffLocation,
        fare: deliveryRequestsTable.fare,
        distance: deliveryRequestsTable.distance,
        packageDetails: deliveryRequestsTable.packageDetails,
        recipientPhoneNumber: deliveryRequestsTable.recipientPhoneNumber,
        status: deliveryRequestsTable.status,
        assignedDriverId: deliveryRequestsTable.assignedDriverId,
        createdAt: deliveryRequestsTable.createdAt,
        expiresAt: deliveryRequestsTable.expiresAt,
        
        // Customer fields
        customerPhoneNumber: customersTable.phoneNumber,
        customerProfilePictureUrl: customersTable.profilePictureUrl,
        
        // Driver fields
        driverFirstName: driversTable.firstName,
        driverLastName: driversTable.lastName,
        driverPhoneNumber: driversTable.phoneNumber,
        driverProfilePictureUrl: driversTable.profilePictureUrl,
        
        // Response fields
        respondedAt: driverResponsesTable.respondedAt,
      })
      .from(deliveryRequestsTable)
      .leftJoin(customersTable, eq(deliveryRequestsTable.customerId, customersTable.id))
      .leftJoin(driversTable, eq(deliveryRequestsTable.assignedDriverId, driversTable.id))
      .leftJoin(
        driverResponsesTable,
        and(
          eq(driverResponsesTable.requestId, deliveryRequestsTable.id),
          eq(driverResponsesTable.response, 'accepted')
        )
      )
      .orderBy(desc(deliveryRequestsTable.createdAt));

    // Transform the data for the frontend
    const transformedOrders = orders.map(order => ({
      id: order.id,
      customerId: order.customerId,
      customerUsername: order.customerUsername,
      customerPhoneNumber: order.customerPhoneNumber,
      customerProfilePictureUrl: order.customerProfilePictureUrl,
      pickupLocation: order.pickupLocation,
      dropoffLocation: order.dropoffLocation,
      fare: order.fare,
      distance: order.distance,
      packageDetails: order.packageDetails,
      recipientPhoneNumber: order.recipientPhoneNumber,
      status: order.status,
      assignedDriverId: order.assignedDriverId,
      driverName: order.driverFirstName && order.driverLastName 
        ? `${order.driverFirstName} ${order.driverLastName}`
        : undefined,
      driverPhoneNumber: order.driverPhoneNumber,
      driverProfilePictureUrl: order.driverProfilePictureUrl,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt,
      respondedAt: order.respondedAt,
      completedAt: order.status === 'completed' ? order.respondedAt : undefined
    }));

    return NextResponse.json({ 
      orders: transformedOrders,
      total: transformedOrders.length
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}