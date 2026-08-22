import { NextResponse, NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || session.user.id;

    // Default mock preferences since they aren't stored in the DB but UI expects them
    const mockPreferences = {
      theme_preference: 'Dark',
      language_preference: 'English',
      timezone: 'UTC',
      appearance_preferences: { theme: 'Dark', accent_color: 'Blue', font_size: 'Medium', sidebar: 'Expanded', language: 'English' },
      notification_preferences: { leave_approval: true, new_tasks: true, meetings: true, chat_messages: true, file_access: true, security_alerts: true, weekly_reports: false, notification_type: 'In-App Notification' },
      privacy_preferences: { profile_visibility: 'Everyone', contact_visibility: 'Team', status_visibility: 'Online' },
      drive_integration: { connected: false, account: '', storage_used: '0 GB', total_storage: '15 GB', last_sync: null }
    };

    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      const { MockEmployees } = await import('@/lib/mock-employees');
      const mockUser = MockEmployees.getById(userId);
      if (mockUser) {
        return NextResponse.json({ success: true, data: { ...mockPreferences, ...mockUser, manager_name: 'Manager' } });
      }
    }

    // Optional: enforce org isolation if a non-admin requests another user's profile
    // But typically you can just rely on RLS or backend checks
    const { data: currentUser } = await supabase.from('users').select('company_id, role').eq('id', session.user.id).single();
    const { data: profile, error } = await supabase.from('users').select('*').eq('id', userId).single();

    if (error || !profile) {
      return NextResponse.json({ success: false, error: 'User not found in authentication system' }, { status: 404 });
    }

    if (currentUser?.company_id && profile.company_id && currentUser.company_id !== profile.company_id) {
       return NextResponse.json({ success: false, error: 'Forbidden: Different organization' }, { status: 403 });
    }

    // Get manager name if possible
    let manager_name = 'Manager';
    if (profile.manager_id) {
       const { data: manager } = await supabase.from('users').select('full_name, email').eq('id', profile.manager_id).maybeSingle();
       if (manager) manager_name = manager.full_name || manager.email || 'Manager';
    }

    let userMetadata = {};
    if (process.env.NEXT_PUBLIC_MOCK_AUTH !== 'true') {
      const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data: authUser } = await adminClient.auth.admin.getUserById(userId);
      userMetadata = authUser?.user?.user_metadata || {};
    }

    const user = {
       ...mockPreferences,
       ...userMetadata,
       ...profile,
       profile_picture: profile.avatar_url || userMetadata.avatar_url || null,
       manager_name
    };

    return NextResponse.json({ success: true, data: user });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    const { 
      user_id, 
      phone, address, city, state, country, postal_code,
      emergency_contact, emergency_contact_name, 
      dob, gender, blood_group, marital_status, nationality, personal_email,
      appearance_preferences, notification_preferences, privacy_preferences,
      profile_picture
    } = data;

    const targetUserId = user_id || session.user.id;

    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      const { MockEmployees } = await import('@/lib/mock-employees');
      const updateData: any = {};
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (city !== undefined) updateData.city = city;
      if (state !== undefined) updateData.state = state;
      if (country !== undefined) updateData.country = country;
      if (postal_code !== undefined) updateData.postal_code = postal_code;
      if (emergency_contact !== undefined) updateData.emergency_contact = emergency_contact;
      if (emergency_contact_name !== undefined) updateData.emergency_contact_name = emergency_contact_name;
      if (dob !== undefined) updateData.date_of_birth = dob;
      if (gender !== undefined) updateData.gender = gender;
      if (blood_group !== undefined) updateData.blood_group = blood_group;
      if (marital_status !== undefined) updateData.marital_status = marital_status;
      if (nationality !== undefined) updateData.nationality = nationality;
      if (personal_email !== undefined) updateData.personal_email = personal_email;
      if (appearance_preferences !== undefined) updateData.appearance_preferences = appearance_preferences;
      if (notification_preferences !== undefined) updateData.notification_preferences = notification_preferences;
      if (privacy_preferences !== undefined) updateData.privacy_preferences = privacy_preferences;
      if (profile_picture !== undefined) updateData.profile_picture = profile_picture;

      const updated = MockEmployees.update(targetUserId, updateData);
      if (updated) {
        return NextResponse.json({ success: true, data: updated });
      } else {
        return NextResponse.json({ success: false, error: 'Mock User not found' }, { status: 404 });
      }
    }

    if (targetUserId !== session.user.id) {
       // Only allow admins to update other profiles
       const { data: currentUser } = await supabase.from('users').select('company_id, role').eq('id', session.user.id).single();
       if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
           return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
       }
       // Check org isolation
       if (currentUser.company_id) {
           const { data: targetUser } = await supabase.from('users').select('company_id').eq('id', targetUserId).single();
           if (targetUser?.company_id !== currentUser.company_id) {
               return NextResponse.json({ success: false, error: 'Forbidden: Different organization' }, { status: 403 });
           }
       }
    }

    const updatePayload: any = {};
    if (phone !== undefined) updatePayload.phone = phone;
    if (address !== undefined) updatePayload.address = address;
    
    if (emergency_contact !== undefined) updatePayload.emergency_contact = emergency_contact;
    if (emergency_contact_name !== undefined) updatePayload.emergency_contact_name = emergency_contact_name;
    
    if (dob !== undefined) updatePayload.date_of_birth = dob;
    if (gender !== undefined) updatePayload.gender = gender;
    if (blood_group !== undefined) updatePayload.blood_group = blood_group;
    if (profile_picture !== undefined) updatePayload.avatar_url = profile_picture;

    if (Object.keys(updatePayload).length > 0) {
      const { error } = await supabase.from('users').update(updatePayload).eq('id', targetUserId);
      if (error) throw error;
    }

    // Save extra fields to auth user metadata so they persist in Supabase without schema changes
    const metadataPayload: any = {};
    if (city !== undefined) metadataPayload.city = city;
    if (state !== undefined) metadataPayload.state = state;
    if (country !== undefined) metadataPayload.country = country;
    if (postal_code !== undefined) metadataPayload.postal_code = postal_code;
    if (marital_status !== undefined) metadataPayload.marital_status = marital_status;
    if (nationality !== undefined) metadataPayload.nationality = nationality;
    if (personal_email !== undefined) metadataPayload.personal_email = personal_email;
    if (appearance_preferences !== undefined) metadataPayload.appearance_preferences = appearance_preferences;
    if (notification_preferences !== undefined) metadataPayload.notification_preferences = notification_preferences;
    if (privacy_preferences !== undefined) metadataPayload.privacy_preferences = privacy_preferences;

    if (Object.keys(metadataPayload).length > 0 && process.env.NEXT_PUBLIC_MOCK_AUTH !== 'true') {
      const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data: authUser } = await adminClient.auth.admin.getUserById(targetUserId);
      const existingMetadata = authUser?.user?.user_metadata || {};
      
      const { error: metaError } = await adminClient.auth.admin.updateUserById(targetUserId, {
        user_metadata: { ...existingMetadata, ...metadataPayload }
      });
      if (metaError) throw metaError;
    }

    // Fetch updated profile and merge with new metadata so the response has the latest changes
    const { data: updatedProfile } = await supabase.from('users').select('*').eq('id', targetUserId).single();
    const finalData = { ...updatedProfile, ...metadataPayload };

    return NextResponse.json({ success: true, data: finalData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
