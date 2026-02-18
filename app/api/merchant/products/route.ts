// app/api/merchant/products/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { merchantProductsTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let merchantId;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: number };
      merchantId = decoded.id;
    } catch (jwtError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const products = await db
      .select()
      .from(merchantProductsTable)
      .where(eq(merchantProductsTable.merchantId, merchantId));

    return NextResponse.json({ products });
  } catch (error) {
    console.error('GET products error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let merchantId;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: number };
      merchantId = decoded.id;
    } catch (jwtError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.price) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
    }

    // Insert product matching your schema
    const [product] = await db
      .insert(merchantProductsTable)
      .values({
        merchantId,
        name: data.name,
        description: data.description || null,
        price: parseFloat(data.price),
        category: data.category || null,
        imageUrl: data.imageUrl || null,
        additionalImages: [],
        isAvailable: data.isAvailable ?? true,
        isPopular: data.isPopular ?? false,
        options: [],
        preparationTime: null,
        stock: -1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json({ product });
  } catch (error) {
    console.error('POST products error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}