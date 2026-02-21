// app/api/customer/restaurants/orders/save/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { merchantOrdersTable } from '@/src/db/schema';
import { getCustomerFromToken } from '@/src/lib/auth';

export async function POST(request: Request) {
  try {
    // Get customer from token
    const customer = await getCustomerFromToken(request);
    
    if (!customer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Generate a unique order number
    const orderNumber = `FOOD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Calculate commission and merchant payout (assuming 15% commission from your schema)
    const commissionRate = 0.15; // 15% from your merchantsTable default
    const commission = body.subtotal * commissionRate;
    const merchantPayout = body.subtotal - commission;

    // Create the order in database with ALL required fields
    const [order] = await db.insert(merchantOrdersTable).values({
      // Required fields from your schema
      merchantId: body.restaurantId,
      orderNumber: orderNumber,
      items: body.items,
      subtotal: body.subtotal,
      deliveryFee: body.deliveryFee || 0,
      totalAmount: body.total,
      commission: commission,
      merchantPayout: merchantPayout,
      
      // Optional fields
      customerId: customer.id,
      customerName: customer.username,
      customerPhone: body.customerPhone,
      paymentMethod: body.paymentMethod || 'online',
      paymentStatus: 'pending',
      deliveryAddress: body.deliveryAddress,
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        timestamp: new Date().toISOString(),
        note: 'Order placed'
      }],
      customerNotes: body.notes,
      estimatedPreparationTime: body.estimatedPreparationTime || 25,
      
      // Driver fields (null initially)
      driverId: null,
      deliveryLatitude: null,
      deliveryLongitude: null,
      
      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // These can be null initially
      confirmedAt: null,
      readyAt: null,
      pickedUpAt: null,
      deliveredAt: null,
      cancelledAt: null,
      
    }).returning();

    return NextResponse.json({ 
      success: true, 
      order: order 
    });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ 
      error: 'Failed to create order' 
    }, { status: 500 });
  }
}