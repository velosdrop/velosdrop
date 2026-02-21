// app/api/customer/login/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import { customersTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { phoneNumber, password } = await request.json();

    if (!phoneNumber || !password) {
      return NextResponse.json(
        { error: 'Phone number and password are required' },
        { status: 400 }
      );
    }

    // Find customer by phone number
    const result = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.phoneNumber, phoneNumber))
      .execute();

    const customer = result[0];

    if (!customer) {
      return NextResponse.json(
        { error: 'Invalid phone number or password' },
        { status: 401 }
      );
    }

    // Check if customer has a password
    if (!customer.password) {
      return NextResponse.json(
        { error: 'This account doesn\'t have a password. Please use OTP login.' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await compare(password, customer.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid phone number or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: customer.id, 
        phone: customer.phoneNumber,
        username: customer.username 
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    // Update last login
    await db
      .update(customersTable)
      .set({ lastLogin: new Date().toISOString() })
      .where(eq(customersTable.id, customer.id))
      .execute();

    // Prepare customer data (exclude password)
    const customerData = {
      id: customer.id,
      username: customer.username,
      phoneNumber: customer.phoneNumber,
      email: customer.email,
      profilePictureUrl: customer.profilePictureUrl,
      isVerified: customer.isVerified,
    };

    return NextResponse.json({
      success: true,
      token,
      customer: customerData
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}