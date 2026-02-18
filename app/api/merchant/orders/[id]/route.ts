// app/api/merchant/orders/[id]/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { merchantOrdersTable } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

// FIX: params is now a Promise that needs to be awaited
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params
    const { id } = await params;
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const merchantId = (decodedToken as any).id;
    const orderId = parseInt(id);

    if (!merchantId || isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const [order] = await db
      .select()
      .from(merchantOrdersTable)
      .where(
        and(
          eq(merchantOrdersTable.id, orderId),
          eq(merchantOrdersTable.merchantId, merchantId)
        )
      );

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

// FIX: Same fix for PUT
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params
    const { id } = await params;
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const merchantId = (decodedToken as any).id;
    const orderId = parseInt(id);
    const { status, note } = await request.json();

    if (!merchantId || isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // First, get the current order to access its status history
    const [currentOrder] = await db
      .select()
      .from(merchantOrdersTable)
      .where(
        and(
          eq(merchantOrdersTable.id, orderId),
          eq(merchantOrdersTable.merchantId, merchantId)
        )
      );

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Prepare status history update
    const statusHistory = currentOrder.statusHistory || [];
    const newStatusEntry = {
      status,
      timestamp: new Date().toISOString(),
      note: note || `Order marked as ${status.replace('_', ' ')}`
    };

    // Prepare timestamps based on status
    const updates: any = {
      status,
      statusHistory: [...statusHistory, newStatusEntry],
      updatedAt: new Date().toISOString()
    };

    // Set specific timestamps based on status
    switch (status) {
      case 'confirmed':
        updates.confirmedAt = new Date().toISOString();
        break;
      case 'ready':
        updates.readyAt = new Date().toISOString();
        break;
      case 'picked_up':
        updates.pickedUpAt = new Date().toISOString();
        break;
      case 'delivered':
        updates.deliveredAt = new Date().toISOString();
        break;
      case 'cancelled':
        updates.cancelledAt = new Date().toISOString();
        break;
    }

    // Update the order
    const [updatedOrder] = await db
      .update(merchantOrdersTable)
      .set(updates)
      .where(
        and(
          eq(merchantOrdersTable.id, orderId),
          eq(merchantOrdersTable.merchantId, merchantId)
        )
      )
      .returning();

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}