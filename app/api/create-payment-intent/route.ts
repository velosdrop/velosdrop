import { NextRequest, NextResponse } from "next/server";
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json();
    
    // In a real app, get driver ID from session/auth
    const driverId = 1;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: { 
        driverId: String(driverId),
        // Add any other relevant metadata
      }
    });

    console.log('🔔 Created PaymentIntent:', paymentIntent.id);

    return NextResponse.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id // Optional: return for debugging
    });
  } catch (error) {
    console.error("❌ Payment Intent creation failed:", error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error}` },
      { status: 500 }
    );
  }
}