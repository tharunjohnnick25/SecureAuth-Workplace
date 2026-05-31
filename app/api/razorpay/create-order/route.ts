import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: NextRequest) {
  try {
    const { amount, planId } = await req.json();

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
    }

    const options = {
      amount: amount * 100, // amount in smallest currency unit
      currency: "USD",
      receipt: `receipt_order_${Math.floor(Math.random() * 10000)}`,
      notes: {
        planId,
      }
    };

    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await instance.orders.create(options);
    
    return NextResponse.json(order);
  } catch (error) {
    console.error("Error creating razorpay order:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
