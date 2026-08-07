import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { isMockMode } from '@/lib/mock-employees';

export async function POST(req: NextRequest) {
  try {
    const { amount, planId, currency = 'INR' } = await req.json();

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (isMockMode()) {
      const mockId = `order_mock_${Date.now()}`;
      return NextResponse.json({
        id: mockId,
        amount: Math.round((amount || 1) * 100),
        currency: currency || 'INR',
        key: keyId || 'rzp_test_mock',
        isMock: true,
      });
    }

    if (keyId && keySecret && !keyId.includes('dummy') && !keyId.includes('placeholder')) {
      try {
        const instance = new Razorpay({
          key_id: keyId,
          key_secret: keySecret,
        });

        const order = await instance.orders.create({
          amount: Math.round((amount || 1) * 100),
          currency: currency || 'INR',
          receipt: `receipt_${planId || 'sub'}_${Date.now()}`,
          notes: { planId: planId || 'pro' },
        });

        return NextResponse.json({
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          key: keyId,
          isMock: false,
        });
      } catch (sdkError: any) {
        console.error('Razorpay SDK order creation error:', sdkError);
        return NextResponse.json(
          { error: sdkError?.error?.description || sdkError?.message || 'Failed to create order with Razorpay' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Razorpay keys not configured. Please enter your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local',
        isMock: true,
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error in Razorpay create-order route:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
