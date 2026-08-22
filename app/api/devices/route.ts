import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getDeviceCookie } from '@/lib/security/device';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: devices, error } = await supabase
            .from('devices')
            .select('*')
            .eq('user_id', user.id)
            .order('last_active', { ascending: false });

        if (error) {
            throw error;
        }

        const currentDeviceId = getDeviceCookie(req);

        // Mark the current device
        const mappedDevices = devices.map(d => ({
            ...d,
            is_current: d.id === currentDeviceId
        }));

        return NextResponse.json({ devices: mappedDevices });
    } catch (err: any) {
        console.error('Failed to fetch devices:', err);
        return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
    }
}
