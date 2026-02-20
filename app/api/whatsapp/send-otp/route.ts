// app/api/whatsapp/send-otp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { otpTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatPhoneNumber(phone: string): string {
  // Remove any non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If it starts with 0, remove it (Zimbabwe numbers)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Add Zimbabwe country code if not present
  if (!cleaned.startsWith('263')) {
    cleaned = '263' + cleaned;
  }
  
  return cleaned;
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

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log('Original phone:', phoneNumber);
    console.log('Formatted phone:', formattedPhone);

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

    console.log('Sending OTP:', otp, 'to:', formattedPhone);

    // SEND VIA WHATSAPP USING TEMPLATE WITH BUTTON
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
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'template',
          template: {
            name: 'otp_velos',
            language: {
              code: 'en_US'
            },
            components: [
              {
                type: 'body',
                parameters: [
                  {
                    type: 'text',
                    text: otp
                  }
                ]
              },
              {
                type: 'button',
                sub_type: 'url',
                index: 0,
                parameters: [
                  {
                    type: 'text',
                    text: otp  // The URL button likely needs the OTP as a parameter
                  }
                ]
              }
            ]
          }
        }),
      }
    );

    const data = await response.json();
    
    // Log the full API response for debugging
    console.log('WhatsApp API Response Status:', response.status);
    console.log('WhatsApp API Response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('WhatsApp API error details:', {
        status: response.status,
        statusText: response.statusText,
        data: data,
      });

      return NextResponse.json(
        { 
          error: 'Failed to send OTP', 
          details: data.error || data,
          code: response.status
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'OTP sent successfully',
      messageId: data.messages?.[0]?.id,
      to: formattedPhone
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}