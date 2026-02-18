// app/api/merchant/logo/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { merchantsTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const merchantId = (decodedToken as any).id;
    
    if (!merchantId) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    const { logoUrl } = await request.json();

    if (!logoUrl) {
      return NextResponse.json({ error: 'Logo URL required' }, { status: 400 });
    }

    // Update merchant with new logo URL
    const [updatedMerchant] = await db
      .update(merchantsTable)
      .set({ 
        logoUrl,
        updatedAt: new Date().toISOString()
      })
      .where(eq(merchantsTable.id, merchantId))
      .returning();

    if (!updatedMerchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // Remove password from response
    const { password, ...merchantWithoutPassword } = updatedMerchant;

    return NextResponse.json({ 
      success: true, 
      merchant: merchantWithoutPassword 
    });

  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}