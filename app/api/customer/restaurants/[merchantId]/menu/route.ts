// app/api/customer/restaurants/[merchantId]/menu/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { merchantProductsTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  try {
    const { merchantId } = await params;

    if (!merchantId) {
      return NextResponse.json(
        { error: 'Merchant ID is required' },
        { status: 400 }
      );
    }

    // Get all available products for this merchant
    const products = await db
      .select({
        id: merchantProductsTable.id,
        name: merchantProductsTable.name,
        description: merchantProductsTable.description,
        price: merchantProductsTable.price,
        category: merchantProductsTable.category,
        imageUrl: merchantProductsTable.imageUrl,
        isPopular: merchantProductsTable.isPopular,
        isAvailable: merchantProductsTable.isAvailable,
        preparationTime: merchantProductsTable.preparationTime,
      })
      .from(merchantProductsTable)
      .where(
        eq(merchantProductsTable.merchantId, parseInt(merchantId))
      );

    // Filter to only show available items
    const availableProducts = products.filter(p => p.isAvailable);

    return NextResponse.json(availableProducts);

  } catch (error) {
    console.error('Error fetching merchant menu:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu' },
      { status: 500 }
    );
  }
}