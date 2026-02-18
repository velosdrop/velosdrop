// app/api/merchant/login/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import { merchantsTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find merchant by email
    const merchant = await db.query.merchantsTable.findFirst({
      where: eq(merchantsTable.email, email.toLowerCase())
    });

    if (!merchant) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if merchant is approved
    if (merchant.status !== 'approved' && merchant.status !== 'pending') {
      return NextResponse.json(
        { error: 'Your account is not active. Please contact support.' },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, merchant.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login
    await db.update(merchantsTable)
      .set({ 
        lastLogin: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(merchantsTable.id, merchant.id));

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: merchant.id,
        email: merchant.email,
        businessName: merchant.businessName
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Return merchant data (excluding password)
    const { password: _, ...merchantWithoutPassword } = merchant;

    return NextResponse.json({
      message: 'Login successful',
      token,
      merchant: merchantWithoutPassword
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}