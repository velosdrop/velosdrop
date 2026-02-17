//app/api/whatsapp/verify-otp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { otpTable } from '@/src/db/schema';
import { eq, and, gt } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, otp } = await request.json();

    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      );
    }

    // Find valid OTP
    const validOtp = await db.query.otpTable.findFirst({
      where: and(
        eq(otpTable.phoneNumber, phoneNumber),
        eq(otpTable.code, otp),
        gt(otpTable.expiresAt, new Date().toISOString())
      ),
    });

    if (!validOtp) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // Delete used OTP
    await db.delete(otpTable).where(eq(otpTable.id, validOtp.id));

    return NextResponse.json({ 
      success: true, 
      message: 'OTP verified successfully' 
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}