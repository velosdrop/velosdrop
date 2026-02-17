//app/api/whatsapp/send-otp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { otpTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Delete any existing OTP for this phone number
    await db.delete(otpTable).where(eq(otpTable.phoneNumber, phoneNumber));

    // Save new OTP to database
    await db.insert(otpTable).values({
      phoneNumber,
      code: otp,
      expiresAt,
    });

    // SEND VIA WHATSAPP USING TEST NUMBER
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'text',  // TEST NUMBERS CAN USE TEXT
          text: {
            body: `Your Velosdrop verification code is: ${otp}. Valid for 5 minutes.`
          }
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API error:', data);
      return NextResponse.json(
        { error: 'Failed to send OTP' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'OTP sent successfully' 
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}