//app/api/customer/[id]/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { messagesTable, deliveryRequestsTable, driversTable } from '@/src/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);
    
    if (isNaN(customerId)) {
      return NextResponse.json(
        { error: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    // Get all unread driver messages for this customer's deliveries
    const notifications = await db
      .select({
        message: {
          id: messagesTable.id,
          content: messagesTable.content,
          senderType: messagesTable.senderType,
          senderId: messagesTable.senderId,
          messageType: messagesTable.messageType,
          isRead: messagesTable.isRead,
          createdAt: messagesTable.createdAt,
          imageUrl: messagesTable.imageUrl
        },
        delivery: {
          id: deliveryRequestsTable.id,
          pickupLocation: deliveryRequestsTable.pickupLocation,
          dropoffLocation: deliveryRequestsTable.dropoffLocation,
          fare: deliveryRequestsTable.fare,
          status: deliveryRequestsTable.status,
          assignedDriverId: deliveryRequestsTable.assignedDriverId,
          createdAt: deliveryRequestsTable.createdAt
        },
        driver: {
          id: driversTable.id,
          firstName: driversTable.firstName,
          lastName: driversTable.lastName,
          phoneNumber: driversTable.phoneNumber,
          vehicleType: driversTable.vehicleType,
          profilePictureUrl: driversTable.profilePictureUrl
        }
      })
      .from(messagesTable)
      .innerJoin(
        deliveryRequestsTable,
        eq(messagesTable.deliveryId, deliveryRequestsTable.id)
      )
      .leftJoin(
        driversTable,
        eq(deliveryRequestsTable.assignedDriverId, driversTable.id)
      )
      .where(
        and(
          eq(deliveryRequestsTable.customerId, customerId),
          eq(messagesTable.senderType, 'driver'),
          eq(messagesTable.isRead, false)
        )
      )
      .orderBy(desc(messagesTable.createdAt))
      .limit(20); // Limit to 20 most recent notifications

    return NextResponse.json({ 
      success: true,
      notifications,
      count: notifications.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch notifications',
        notifications: [],
        count: 0
      },
      { status: 500 }
    );
  }
}