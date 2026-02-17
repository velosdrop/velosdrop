//app/api/merchant/profile/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { merchantsTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    // Get token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Extract merchant ID from token (in production, use proper JWT verification)
    const merchantId = parseInt(token.split('-')[0]);
    
    if (isNaN(merchantId)) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Fetch merchant from database
    const [merchant] = await db
      .select()
      .from(merchantsTable)
      .where(eq(merchantsTable.id, merchantId))
      .limit(1);

    if (!merchant) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      );
    }

    // Remove password from response
    const { password, ...merchantWithoutPassword } = merchant;

    return NextResponse.json({
      merchant: merchantWithoutPassword
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}