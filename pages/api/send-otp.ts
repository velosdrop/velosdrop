// pages/api/send-otp.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Twilio } from 'twilio';
import { db } from '@/src/db';
import { otpTable } from '@/src/db/schema';
import { sql } from 'drizzle-orm';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = new Twilio(accountSid!, authToken!);

function generateOtp(length = 6) {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: "Phone number required" });
  }

  // Validate Zimbabwean number format
  if (!phoneNumber.startsWith('+263')) {
    return res.status(400).json({ 
      error: "Please use a Zimbabwean number starting with +263" 
    });
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

  try {
    // First, delete any existing OTPs for this number
    await db.delete(otpTable)
      .where(sql`${otpTable.phoneNumber} = ${phoneNumber}`);

    // Store the new OTP
    await db.insert(otpTable).values({
      phoneNumber,
      code: otp,
      expiresAt: expiresAt.toISOString(),
    });

    // Send SMS via Twilio
    const message = await client.messages.create({
      body: `Your VelosDrop verification code is: ${otp}`,
      from: twilioPhoneNumber,
      to: phoneNumber,
    });

    res.status(200).json({ success: true, sid: message.sid });
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to send OTP" 
    });
  }
}