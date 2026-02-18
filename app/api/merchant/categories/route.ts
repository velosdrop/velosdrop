// app/api/merchant/categories/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { merchantCategoriesTable } from '@/src/db/schema';
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

    const categories = await db
      .select()
      .from(merchantCategoriesTable)
      .where(eq(merchantCategoriesTable.merchantId, merchantId))
      .orderBy(merchantCategoriesTable.displayOrder);

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('GET categories error:', error);
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

    const body = await request.json();
    const { name, imageUrl } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Category name required' }, { status: 400 });
    }

    // Get max display order
    const existingCategories = await db
      .select()
      .from(merchantCategoriesTable)
      .where(eq(merchantCategoriesTable.merchantId, merchantId));

    const displayOrder = existingCategories.length;

    // Insert new category matching your schema
    const [newCategory] = await db
      .insert(merchantCategoriesTable)
      .values({
        merchantId,
        name: name.trim(),
        imageUrl: imageUrl || null,
        description: null, // Optional field from your schema
        displayOrder,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json({ category: newCategory });
  } catch (error) {
    console.error('POST categories error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}