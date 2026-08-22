import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: deviceId } = await params;
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify the user owns the device
        const { data: device, error: deviceError } = await supabase
            .from('devices')
            .select('*')
            .eq('id', deviceId)
            .eq('user_id', user.id)
            .single();

        if (deviceError || !device) {
            return NextResponse.json({ error: 'Device not found or not authorized' }, { status: 404 });
        }

        const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

        // Revoke the device
        await adminClient.from('devices')
            .update({ is_trusted: false })
            .eq('id', deviceId)
            .eq('user_id', user.id);

        // Revoke associated sessions
        await adminClient.from('sessions')
            .update({ is_active: false })
            .eq('device_id', deviceId)
            .eq('user_id', user.id);

        // Security event
        const reqIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
        await adminClient.from('security_events').insert({
            user_id: user.id,
            event_type: 'DEVICE_REVOKED',
            severity: 'low',
            ip_address: reqIp,
            details: { device_id: deviceId, os: device.os, browser: device.browser }
        });

        // Audit log
        await adminClient.from('audit_logs').insert({
            actor_id: user.id,
            action: 'DEVICE_REVOKED',
            entity_type: 'device',
            entity_id: deviceId,
            ip_address: reqIp,
            metadata: { device_type: device.device_type }
        });

        return NextResponse.json({ success: true, message: 'Device revoked successfully' });
    } catch (err: any) {
        console.error('Failed to revoke device:', err);
        return NextResponse.json({ error: 'Failed to revoke device' }, { status: 500 });
    }
}
