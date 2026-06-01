import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { amount } = await req.json();
  return NextResponse.json({
    id: 'order_Mock' + Date.now(),
    amount: amount * 100,
    currency: 'USD',
    receipt: `receipt_mock_${Math.floor(Math.random() * 10000)}`,
    status: 'created',
  });
}
