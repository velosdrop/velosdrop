import { NextResponse } from 'next/server';
import { db } from '@/src/db/index'; // Your database connection
import { merchantsTable } from '@/src/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessName, ownerName, city, address, email, phone, password } = body;

    // Validate required fields
    if (!businessName || !ownerName || !city || !address || !email || !phone || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if merchant already exists
    const existingMerchant = await db
      .select()
      .from(merchantsTable)
      .where(eq(merchantsTable.email, email))
      .limit(1);

    if (existingMerchant.length > 0) {
      return NextResponse.json(
        { error: 'Merchant with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new merchant
    const [newMerchant] = await db
      .insert(merchantsTable)
      .values({
        businessName,
        ownerName,
        city,
        address,
        email,
        phoneNumber: phone,
        password: hashedPassword,
        status: 'pending', // New merchants start as pending
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    // Remove password from response
    const { password: _, ...merchantWithoutPassword } = newMerchant;

    // Generate a simple token (in production, use JWT)
    const token = Buffer.from(`${newMerchant.id}-${Date.now()}`).toString('base64');

    return NextResponse.json({
      message: 'Merchant registered successfully',
      merchant: merchantWithoutPassword,
      token,
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}