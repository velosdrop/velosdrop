// app/api/merchant/orders/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { merchantOrdersTable } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export async function GET(request: Request) {
  try {
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
    
    if (!merchantId) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    // Fetch all orders for this merchant, newest first
    const orders = await db
      .select()
      .from(merchantOrdersTable)
      .where(eq(merchantOrdersTable.merchantId, merchantId))
      .orderBy(desc(merchantOrdersTable.createdAt));

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}