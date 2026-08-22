import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { verifyStepUpToken } from '@/lib/auth/step-up';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: deviceId } = await params;
        const supabase = await createServerSupabaseClient();
        
        // Ensure session is AAL2 or they have the custom step-up token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const hasAal2 = (session as any).aal === 'aal2';
        let hasCustomAal2 = false;

        try {
            const token = req.cookies.get('secureauth_assurance_level')?.value;
            if (token) {
                const stepUpResult = await verifyStepUpToken(token);
                if (stepUpResult?.sub === session.user.id) {
                    hasCustomAal2 = true;
                }
            }
        } catch (e) {
            // No custom step-up token
        }

        if (!hasAal2 && !hasCustomAal2) {
            return NextResponse.json({ error: 'Strong authentication required to trust a device.' }, { status: 403 });
        }

        // Verify the user owns the device
        const { data: device, error: deviceError } = await supabase
            .from('devices')
            .select('*')
            .eq('id', deviceId)
            .eq('user_id', session.user.id)
            .single();

        if (deviceError || !device) {
            return NextResponse.json({ error: 'Device not found or not authorized' }, { status: 404 });
        }

        const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

        // Trust the device
        await adminClient.from('devices')
            .update({ is_trusted: true })
            .eq('id', deviceId)
            .eq('user_id', session.user.id);

        // Security event
        const reqIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
        await adminClient.from('security_events').insert({
            user_id: session.user.id,
            event_type: 'DEVICE_TRUSTED',
            severity: 'low',
            ip_address: reqIp,
            details: { device_id: deviceId, os: device.os, browser: device.browser }
        });

        // Audit log
        await adminClient.from('audit_logs').insert({
            actor_id: session.user.id,
            action: 'DEVICE_TRUSTED',
            entity_type: 'device',
            entity_id: deviceId,
            ip_address: reqIp,
            metadata: { device_type: device.device_type }
        });

        return NextResponse.json({ success: true, message: 'Device trusted successfully' });
    } catch (err: any) {
        console.error('Failed to trust device:', err);
        return NextResponse.json({ error: 'Failed to trust device' }, { status: 500 });
    }
}
