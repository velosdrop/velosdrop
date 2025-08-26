import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { customersTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { customerId, profilePictureUrl } = await request.json();

    if (!customerId || !profilePictureUrl) {
      return NextResponse.json(
        { error: 'Customer ID and profile picture URL are required' },
        { status: 400 }
      );
    }

    // Update the customer's profile picture in the database
    const updatedCustomers = await db
      .update(customersTable)
      .set({ 
        profilePictureUrl,
        updatedAt: new Date().toISOString()
      })
      .where(eq(customersTable.id, customerId))
      .returning();

    if (updatedCustomers.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      customer: updatedCustomers[0]
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}