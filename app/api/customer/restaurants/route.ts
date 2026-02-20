// app/api/customer/restaurants/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { merchantsTable, merchantCategoriesTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm'; // Remove 'and' import

export async function GET(request: Request) {
  try {
    // Show ALL restaurants regardless of status (for testing)
    const restaurants = await db
      .select({
        id: merchantsTable.id,
        businessName: merchantsTable.businessName,
        description: merchantsTable.description,
        logoUrl: merchantsTable.logoUrl,
        coverImageUrl: merchantsTable.coverImageUrl,
        businessType: merchantsTable.businessType,
        deliveryType: merchantsTable.deliveryType,
        deliveryFee: merchantsTable.deliveryFee,
        deliveryRadius: merchantsTable.deliveryRadius,
        minimumOrder: merchantsTable.minimumOrder,
        averageRating: merchantsTable.averageRating,
        isOpen: merchantsTable.isOpen,
        isActive: merchantsTable.isActive,
        status: merchantsTable.status,
        city: merchantsTable.city,
        address: merchantsTable.address,
        businessHours: merchantsTable.businessHours,
        latitude: merchantsTable.latitude,
        longitude: merchantsTable.longitude,
      })
      .from(merchantsTable);
      // REMOVED THE WHERE CLAUSE - now shows all restaurants

    // Fetch all categories
    const categories = await db
      .select({
        id: merchantCategoriesTable.id,
        name: merchantCategoriesTable.name,
        merchantId: merchantCategoriesTable.merchantId,
        imageUrl: merchantCategoriesTable.imageUrl,
      })
      .from(merchantCategoriesTable);

    // Group categories by merchant
    const categoriesByMerchant = categories.reduce((acc: any, cat) => {
      if (!acc[cat.merchantId]) {
        acc[cat.merchantId] = [];
      }
      acc[cat.merchantId].push(cat);
      return acc;
    }, {});

    // Attach categories to each restaurant
    const restaurantsWithCategories = restaurants.map(restaurant => ({
      ...restaurant,
      categories: categoriesByMerchant[restaurant.id] || []
    }));

    return NextResponse.json(restaurantsWithCategories);

  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch restaurants' },
      { status: 500 }
    );
  }
}