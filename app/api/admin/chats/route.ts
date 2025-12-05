//app/api/admin/chats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { 
  messagesTable, 
  deliveryRequestsTable, 
  customersTable, 
  driversTable 
} from '@/src/db/schema';
import { eq, desc, and, or, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get all deliveries with their messages
    const deliveriesWithMessages = await db
      .select({
        delivery: deliveryRequestsTable,
        customer: customersTable,
        driver: driversTable,
        lastMessage: messagesTable,
        messageCount: sql<number>`count(${messagesTable.id})`,
        unreadCount: sql<number>`sum(case when ${messagesTable.isRead} = 0 then 1 else 0 end)`
      })
      .from(deliveryRequestsTable)
      .leftJoin(customersTable, eq(deliveryRequestsTable.customerId, customersTable.id))
      .leftJoin(driversTable, eq(deliveryRequestsTable.assignedDriverId, driversTable.id))
      .leftJoin(messagesTable, eq(deliveryRequestsTable.id, messagesTable.deliveryId))
      .groupBy(deliveryRequestsTable.id, customersTable.id, driversTable.id, messagesTable.id)
      .orderBy(desc(sql`max(${messagesTable.createdAt})`));

    const chats = deliveriesWithMessages.map((row: any) => ({
      id: row.delivery.id,
      deliveryId: row.delivery.id,
      customer: {
        id: row.customer.id,
        type: 'customer' as const,
        name: row.customer.username,
        phoneNumber: row.customer.phoneNumber,
        profilePictureUrl: row.customer.profilePictureUrl
      },
      driver: row.driver ? {
        id: row.driver.id,
        type: 'driver' as const,
        name: `${row.driver.firstName} ${row.driver.lastName}`,
        phoneNumber: row.driver.phoneNumber,
        profilePictureUrl: row.driver.profilePictureUrl
      } : undefined,
      lastMessage: row.lastMessage?.content?.substring(0, 100) || 'No messages yet',
      lastMessageTime: row.lastMessage?.createdAt || row.delivery.createdAt,
      unreadCount: Number(row.unreadCount) || 0,
      messageCount: Number(row.messageCount) || 0,
      status: row.delivery.status
    }));

    return NextResponse.json({
      success: true,
      chats
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chats' },
      { status: 500 }
    );
  }
}