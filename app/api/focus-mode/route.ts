import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isMockMode } from '@/lib/mock-employees';
import {
  DEFAULT_FOCUS_SETTINGS,
  FocusSettings,
  getFocusSettings,
  isNowInBlock,
  normalizeFocusSettings,
  saveFocusSettingsMock,
} from '@/lib/focus-mode';

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error';
}

async function resolveUserId(req: NextRequest, supabase: SupabaseClient | null): Promise<string | null> {
  if (isMockMode()) {
    const { searchParams } = new URL(req.url);
    return searchParams.get('user_id') || 'mock';
  }
  const { data: { user } } = await supabase!.auth.getUser();
  return user?.id || null;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = isMockMode() ? null : await createServerSupabaseClient();
    const userId = await resolveUserId(req, supabase);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    let settings: FocusSettings;
    if (isMockMode()) {
      settings = (await getFocusSettings(null, userId)) || { ...DEFAULT_FOCUS_SETTINGS };
    } else {
      const { data } = await supabase.from('focus_mode').select('*').eq('user_id', userId).maybeSingle();
      settings = normalizeFocusSettings(data);
    }

    return NextResponse.json({
      success: true,
      data: settings,
      active: isNowInBlock(settings.blocks, settings.timezone),
    });
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = isMockMode() ? null : await createServerSupabaseClient();
    const userId = await resolveUserId(req, supabase);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json();
    const blocks = Array.isArray(body.blocks) ? body.blocks : [];
    const settings: FocusSettings = {
      enabled: body.enabled !== false,
      timezone: body.timezone || DEFAULT_FOCUS_SETTINGS.timezone,
      blocks,
      allow_critical: body.allow_critical !== false,
    };

    if (isMockMode()) {
      const saved = saveFocusSettingsMock(userId, settings);
      return NextResponse.json({
        success: true,
        data: saved,
        active: isNowInBlock(saved.blocks, saved.timezone),
      });
    }

    const { data, error } = await supabase
      .from('focus_mode')
      .upsert({ user_id: userId, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: normalizeFocusSettings(data),
      active: isNowInBlock(data?.blocks, data?.timezone),
    });
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
