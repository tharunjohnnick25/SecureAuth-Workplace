import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, amount } = await req.json();

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!keySecret) {
      return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body.toString())
      .digest('hex');
    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // 1. Create/Update Subscription
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          plan_id: planId || 'pro',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (subError) throw subError;

      // 2. Record Payment
      await supabase.from('payments').insert({
        user_id: user.id,
        subscription_id: subscription.id,
        razorpay_order_id,
        razorpay_payment_id,
        amount: amount || 0,
        currency: 'USD',
        status: 'successful'
      });

      // 3. Update User Role if needed
      await supabase.from('users').update({
        status: 'active'
      }).eq('id', user.id);
      
      return NextResponse.json({ success: true, message: "Subscription activated successfully" });
    } else {
      return NextResponse.json({ success: false, message: "Invalid payment signature" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return NextResponse.json({ error: error.message || "Failed to verify payment" }, { status: 500 });
  }
}
