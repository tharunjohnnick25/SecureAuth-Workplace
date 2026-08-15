import { NextRequest, NextResponse } from 'next/server';
import { OtpService } from '@/lib/services/otpService';
import { SmsService } from '@/lib/services/smsService';
import { MockEmployees, forceReload } from '@/lib/mock-employees';

export async function POST(req: NextRequest) {
  try {
    const { tempToken, user, phone } = await req.json();

    if (!tempToken || !user) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Resolve the phone number from: submitted value > user record > mock employee store
    let targetPhone = OtpService.normalizePhone(phone || '');
    if (!targetPhone && typeof user.phone === 'string') {
      targetPhone = OtpService.normalizePhone(user.phone);
    }
    if (!targetPhone) {
      forceReload();
      const record =
        MockEmployees.getById(user.id) ||
        MockEmployees.findByEmail(user.email) ||
        MockEmployees.findByEmployeeId(user.employee_id);
      if (record?.phone) {
        targetPhone = OtpService.normalizePhone(record.phone);
      }
    }

    if (!targetPhone) {
      return NextResponse.json({ needsPhone: true, error: 'No phone number on file' }, { status: 200 });
    }

    const otp = OtpService.generate(tempToken, targetPhone);

    const body = `Your SecureAuth verification code is ${otp.code}. It is valid for 5 minutes. Do not share this code with anyone.`;

    let delivery: { provider: 'mock'; inboxId: string };
    try {
      delivery = await SmsService.send(targetPhone, body);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 502 });
    }

    // Persist the phone number back to the mock store so future logins remember it
    try {
      forceReload();
      const record =
        MockEmployees.getById(user.id) ||
        MockEmployees.findByEmail(user.email) ||
        MockEmployees.findByEmployeeId(user.employee_id);
      if (record && record.phone !== targetPhone) {
        MockEmployees.update(record.id, { phone: targetPhone });
      }
    } catch {
      // Persistence is best-effort.
    }

    return NextResponse.json({
      sent: true,
      phoneMasked: OtpService.maskPhone(targetPhone),
      provider: delivery.provider,
      resendAfterMs: 30000,
      // Only expose the code when no real SMS was delivered (mock/demo environments)
      ...(delivery.provider === 'mock' ? { code: otp.code } : {}),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
