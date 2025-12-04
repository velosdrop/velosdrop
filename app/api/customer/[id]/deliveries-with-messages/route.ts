//app/api/customer/[id]/deliveries-with-messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { deliveryRequestsTable, driversTable, messagesTable } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params
    const { id } = await params;
    const customerId = parseInt(id);
    
    if (isNaN(customerId)) {
      return NextResponse.json(
        { error: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    // Get all deliveries for this customer
    const deliveries = await db.select({
      id: deliveryRequestsTable.id,
      pickupLocation: deliveryRequestsTable.pickupLocation,
      dropoffLocation: deliveryRequestsTable.dropoffLocation,
      fare: deliveryRequestsTable.fare,
      status: deliveryRequestsTable.status,
      createdAt: deliveryRequestsTable.createdAt,
      assignedDriverId: deliveryRequestsTable.assignedDriverId,
    })
    .from(deliveryRequestsTable)
    .where(eq(deliveryRequestsTable.customerId, customerId))
    .orderBy(desc(deliveryRequestsTable.createdAt));

    // Get messages for each delivery and driver info
    const deliveriesWithDetails = await Promise.all(
      deliveries.map(async (delivery) => {
        // Get messages for this delivery
        const messages = await db.select({
          id: messagesTable.id,
          content: messagesTable.content,
          senderType: messagesTable.senderType,
          senderId: messagesTable.senderId,
          messageType: messagesTable.messageType,
          isRead: messagesTable.isRead,
          createdAt: messagesTable.createdAt,
          imageUrl: messagesTable.imageUrl,
        })
        .from(messagesTable)
        .where(eq(messagesTable.deliveryId, delivery.id))
        .orderBy(desc(messagesTable.createdAt))
        .limit(20);

        // Get driver info if available
        let driverData = null;
        if (delivery.assignedDriverId) {
          const driver = await db.select({
            firstName: driversTable.firstName,
            lastName: driversTable.lastName,
            phoneNumber: driversTable.phoneNumber,
            vehicleType: driversTable.vehicleType,
            numberPlate: driversTable.numberPlate,
            profilePictureUrl: driversTable.profilePictureUrl,
          })
          .from(driversTable)
          .where(eq(driversTable.id, delivery.assignedDriverId))
          .get();

          driverData = driver || null;
        }

        return {
          ...delivery,
          assignedDriver: driverData,
          messages: messages.map(msg => ({
            ...msg,
            senderType: msg.senderType as 'driver' | 'customer' | 'system',
            messageType: msg.messageType as 'text' | 'image' | 'status_update' | 'location',
          }))
        };
      })
    );

    // Format the response
    const formattedDeliveries = deliveriesWithDetails.map(delivery => ({
      id: delivery.id,
      pickupLocation: delivery.pickupLocation,
      dropoffLocation: delivery.dropoffLocation,
      fare: delivery.fare,
      status: delivery.status,
      createdAt: delivery.createdAt,
      assignedDriverId: delivery.assignedDriverId,
      driverName: delivery.assignedDriver 
        ? `${delivery.assignedDriver.firstName} ${delivery.assignedDriver.lastName}`
        : null,
      driverPhone: delivery.assignedDriver?.phoneNumber,
      vehicleType: delivery.assignedDriver?.vehicleType,
      messages: delivery.messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        senderType: msg.senderType,
        senderId: msg.senderId,
        messageType: msg.messageType,
        isRead: msg.isRead,
        createdAt: msg.createdAt,
        imageUrl: msg.imageUrl
      }))
    }));

    return NextResponse.json({ 
      success: true,
      customerId,
      deliveries: formattedDeliveries 
    });

  } catch (error) {
    console.error('Error fetching deliveries with messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deliveries' },
      { status: 500 }
    );
  }
}