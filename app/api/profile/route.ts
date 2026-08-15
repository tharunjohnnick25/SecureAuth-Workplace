import { NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';
import { MockEmployees } from '@/lib/mock-employees';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const authUser = MockEmployees.getById(userId);
  if (!authUser) {
    return NextResponse.json({ error: 'User not found in authentication system' }, { status: 404 });
  }

  let dbUser = MockDB.employees.find((e: any) => e.id === userId);
  
  if (!dbUser) {
    // Fallback: Create a default preferences profile for users so the UI doesn't crash
    dbUser = ({
      id: userId,
      theme_preference: 'Dark',
      language_preference: 'English',
      timezone: 'UTC',
      appearance_preferences: { theme: 'Dark', accent_color: 'Blue', font_size: 'Medium', sidebar: 'Expanded', language: 'English' },
      notification_preferences: { leave_approval: true, new_tasks: true, meetings: true, chat_messages: true, file_access: true, security_alerts: true, weekly_reports: false, notification_type: 'In-App Notification' },
      privacy_preferences: { profile_visibility: 'Everyone', contact_visibility: 'Team', status_visibility: 'Online' },
      attendance_stats: { today_login: '09:00 AM', today_logout: 'N/A', total_working_hours: '0 Hrs', attendance_percentage: '100%', present_days: 0, absent_days: 0, leave_days: 0 },
      leave_balance: { casual: 5, sick: 5, paid: 15 },
      drive_integration: { connected: false, account: '', storage_used: '0 GB', total_storage: '15 GB', last_sync: null },
      ai_risk_history: [ { date: 'Mon', score: 10 }, { date: 'Tue', score: 10 }, { date: 'Wed', score: 10 }, { date: 'Thu', score: 10 }, { date: 'Fri', score: 10 }, { date: 'Sat', score: 10 } ],
      security_info: { risk_score: 10, last_login: new Date().toISOString(), last_location: 'Unknown', registered_devices: ['Current Device'], password_last_changed: new Date().toISOString(), face_verified: false }
    }) as any;
    MockDB.employees.push(dbUser);
    saveMockDB();
  }

  let manager_name = 'Admin (Default)';
  if (authUser.manager_id) {
    const manager = MockEmployees.getById(authUser.manager_id);
    if (manager) {
      manager_name = manager.full_name || manager.email || 'Manager';
    }
  }

  // Merge authentication identity (source of truth) with local DB preferences
  const user = {
     ...dbUser,
     ...authUser,
     manager_name
  };

  return NextResponse.json({ success: true, data: user });
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { 
      user_id, 
      phone, address, city, state, country, postal_code,
      emergency_contact, emergency_contact_name, 
      dob, gender, blood_group, marital_status, nationality,
      language_preference, theme_preference, timezone, 
      profile_picture, github_username, two_factor_enabled, 
      security_info,
      appearance_preferences, notification_preferences, privacy_preferences, drive_integration
    } = data;

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const index = MockDB.employees.findIndex((e: any) => e.id === user_id);
    if (index === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only update allowed editable fields
    if (phone !== undefined) MockDB.employees[index].phone = phone;
    if (address !== undefined) MockDB.employees[index].address = address;
    if (city !== undefined) MockDB.employees[index].city = city;
    if (state !== undefined) MockDB.employees[index].state = state;
    if (country !== undefined) MockDB.employees[index].country = country;
    if (postal_code !== undefined) MockDB.employees[index].postal_code = postal_code;
    
    if (emergency_contact !== undefined) MockDB.employees[index].emergency_contact = emergency_contact;
    if (emergency_contact_name !== undefined) MockDB.employees[index].emergency_contact_name = emergency_contact_name;
    
    if (dob !== undefined) MockDB.employees[index].dob = dob;
    if (gender !== undefined) MockDB.employees[index].gender = gender;
    if (blood_group !== undefined) MockDB.employees[index].blood_group = blood_group;
    if (marital_status !== undefined) MockDB.employees[index].marital_status = marital_status;
    if (nationality !== undefined) MockDB.employees[index].nationality = nationality;

    if (language_preference !== undefined) MockDB.employees[index].language_preference = language_preference;
    if (theme_preference !== undefined) MockDB.employees[index].theme_preference = theme_preference;
    if (timezone !== undefined) MockDB.employees[index].timezone = timezone;
    if (profile_picture !== undefined) MockDB.employees[index].profile_picture = profile_picture;
    if (github_username !== undefined) MockDB.employees[index].github_username = github_username;
    
    if (two_factor_enabled !== undefined) MockDB.employees[index].two_factor_enabled = two_factor_enabled;
    if (security_info !== undefined) MockDB.employees[index].security_info = security_info;

    if (appearance_preferences !== undefined) MockDB.employees[index].appearance_preferences = appearance_preferences;
    if (notification_preferences !== undefined) MockDB.employees[index].notification_preferences = notification_preferences;
    if (privacy_preferences !== undefined) MockDB.employees[index].privacy_preferences = privacy_preferences;
    if (drive_integration !== undefined) MockDB.employees[index].drive_integration = drive_integration;

    // Update MockEmployees (Core Identity)
    const authUpdatePayload: any = {};
    const coreFields = ['phone', 'department', 'designation', 'date_of_joining', 'dob', 'gender', 'emergency_contact_name', 'emergency_contact_phone', 'employment_type', 'blood_group', 'marital_status', 'nationality', 'city', 'state', 'country', 'postal_code', 'address', 'full_name'];
    
    // Check request payload to see if core identity fields are updated
    for (const f of coreFields) {
       if (data[f] !== undefined) authUpdatePayload[f] = data[f];
    }
    
    // Also accept emergency_contact aliases
    if (emergency_contact !== undefined) authUpdatePayload['emergency_contact_phone'] = emergency_contact;
    if (emergency_contact_name !== undefined) authUpdatePayload['emergency_contact_name'] = emergency_contact_name;
    if (dob !== undefined) authUpdatePayload['date_of_birth'] = dob;

    if (Object.keys(authUpdatePayload).length > 0) {
       MockEmployees.update(user_id, authUpdatePayload);
    }

    saveMockDB();

    const mergedUser = {
      ...MockDB.employees[index],
      ...MockEmployees.getById(user_id)
    };

    return NextResponse.json({ success: true, data: mergedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
