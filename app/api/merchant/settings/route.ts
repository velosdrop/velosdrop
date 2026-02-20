// app/api/merchant/settings/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { merchantsTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { id: number };
    const merchantId = decoded.id;

    const data = await request.json();

    // Create update object with proper typing - NO COMMISSION
    const updateData: any = {
      deliveryRadius: data.deliveryRadius,
      minimumOrder: data.minimumOrder,
      deliveryFee: data.deliveryFee, // per km rate
      bankName: data.bankName,
      bankAccountName: data.bankAccountName,
      bankAccountNumber: data.bankAccountNumber,
      updatedAt: new Date().toISOString()
    };

    // Only add deliveryType if it exists in the data
    if (data.deliveryType) {
      updateData.deliveryType = data.deliveryType;
    }

    const [updatedMerchant] = await db
      .update(merchantsTable)
      .set(updateData)
      .where(eq(merchantsTable.id, merchantId))
      .returning();

    const { password, ...merchantWithoutPassword } = updatedMerchant;

    return NextResponse.json({ 
      success: true, 
      merchant: merchantWithoutPassword 
    });

  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}