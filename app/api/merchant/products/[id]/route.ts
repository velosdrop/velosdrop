// app/api/merchant/products/[id]/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { merchantProductsTable } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

// FIX: params is now a Promise
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params
    const { id } = await params;
    
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

    const productId = parseInt(id);
    const data = await request.json();

    const [updatedProduct] = await db
      .update(merchantProductsTable)
      .set({
        name: data.name,
        description: data.description || null,
        price: parseFloat(data.price),
        category: data.category || null,
        imageUrl: data.imageUrl || null,
        isAvailable: data.isAvailable ?? true,
        isPopular: data.isPopular ?? false,
        updatedAt: new Date().toISOString()
      })
      .where(
        and(
          eq(merchantProductsTable.id, productId),
          eq(merchantProductsTable.merchantId, merchantId)
        )
      )
      .returning();

    if (!updatedProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product: updatedProduct });
  } catch (error) {
    console.error('PUT product error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// FIX: Same fix for DELETE
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params
    const { id } = await params;
    
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

    const productId = parseInt(id);

    await db
      .delete(merchantProductsTable)
      .where(
        and(
          eq(merchantProductsTable.id, productId),
          eq(merchantProductsTable.merchantId, merchantId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE product error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}