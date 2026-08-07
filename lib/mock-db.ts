const INITIAL_DB = {
  tasks: [
    {
      id: 'task-1',
      title: 'Complete Security Training',
      description: 'Finish the Q3 security awareness training module.',
      assigned_to: 'mock',
      assigned_by: 'admin-1',
      priority: 'High',
      deadline: new Date(Date.now() + 86400000 * 2).toISOString(), // +2 days
      status: 'In Progress',
      progress: 45,
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'task-missed-1',
      title: 'Submit Annual Compliance Report',
      description: 'The report was due last week.',
      assigned_to: 'mock',
      assigned_by: 'admin-1',
      priority: 'High',
      deadline: new Date(Date.now() - 86400000 * 7).toISOString(), // -7 days
      status: 'Pending',
      progress: 0,
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'task-2',
      title: 'Update SSH Keys',
      description: 'Rotate your SSH keys on the production bastion hosts.',
      assigned_to: 'mock',
      assigned_by: 'admin-1',
      priority: 'Medium',
      deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
      status: 'Pending',
      progress: 0,
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  approvals: [
    {
      id: 'app-1',
      type: 'LEAVE',
      requester_id: 'mock',
      approver_id: null,
      data_payload: { startDate: '2026-08-10', endDate: '2026-08-12', reason: 'Personal' },
      status: 'PENDING',
      comments: '',
      created_at: new Date().toISOString()
    }
  ],
  notifications: [
    {
      id: 'notif-1',
      user_id: 'mock',
      type: 'TASK_ASSIGNED',
      title: 'New Task Assigned',
      message: 'You have been assigned a new task: Complete Security Training',
      is_read: false,
      action_url: '/tasks',
      created_at: new Date().toISOString()
    }
  ],
  focusMode: [
    {
      user_id: 'mock',
      enabled: true,
      timezone: 'America/Los_Angeles',
      blocks: [
        { id: 'focus-block-1', start: '09:00', end: '11:00', days: [1, 2, 3, 4, 5] },
        { id: 'focus-block-2', start: '14:00', end: '16:00', days: [1, 2, 3, 4, 5] }
      ],
      allow_critical: true,
      updated_at: new Date().toISOString()
    }
  ],
  attendance: [
    {
      id: 'att-1',
      employee_id: 'mock',
      date: new Date().toISOString().split('T')[0],
      check_in: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
      check_out: null,
      status: 'present',
      created_at: new Date().toISOString()
    }
  ],
  documents: [
    {
      id: 'doc-1',
      employee_id: 'mock',
      document_type: 'Resume',
      document_name: 'resume_2026.pdf',
      file_url: 'https://example.com/resume.pdf',
      is_verified: true,
      created_at: new Date().toISOString()
    }
  ],
  leaves: [
    {
      id: 'leave-1',
      employee_id: 'mock',
      leave_type: 'Annual',
      total_days: 20,
      used_days: 5,
      pending_days: 2,
      year: new Date().getFullYear(),
      created_at: new Date().toISOString()
    }
  ],
  leave_requests: [
    {
      id: 'lr-1',
      user_id: 'mock',
      user_name: 'John Employee',
      type: 'Annual Leave',
      start_date: '2026-08-20',
      end_date: '2026-08-25',
      reason: 'Family vacation',
      status: 'Pending',
      created_at: new Date().toISOString()
    }
  ],
  employees: [
    {
      id: 'mock',
      email: 'employee@test.com',
      full_name: 'John Employee',
      role: 'USER',
      department: 'Engineering',
      designation: 'Software Engineer',
      manager_id: 'admin-1',
      date_of_joining: '2024-01-15',
      status: 'active', // Legacy field
      phone: '+1 555-0192',
      address: '123 Tech Lane, CA',
      blood_group: 'O+',
      emergency_contact: '+1 555-9999',
      emergency_contact_name: 'Jane Employee',
      profile_picture: '',
      company_name: 'SecureTech Solutions Inc.',
      gender: 'Male',
      work_location: 'California',
      office_branch: 'HQ - Silicon Valley',
      employment_status: 'Active',
      employee_type: 'Full-Time',
      dob: '1990-05-24',
      language_preference: 'English',
      theme_preference: 'Dark',
      timezone: 'America/Los_Angeles',
      two_factor_enabled: false,
      github_username: 'octocat',
      marital_status: 'Single',
      nationality: 'American',
      city: 'San Jose',
      state: 'California',
      country: 'United States',
      postal_code: '95112',
      shift_timing: '09:00 AM - 05:00 PM',
      working_hours: '8 Hours',
      reporting_manager: 'Alice Admin',
      appearance_preferences: {
        theme: 'Dark',
        accent_color: 'Blue',
        font_size: 'Medium',
        sidebar: 'Expanded',
        language: 'English'
      },
      notification_preferences: {
        leave_approval: true,
        new_tasks: true,
        meetings: true,
        chat_messages: true,
        file_access: true,
        security_alerts: true,
        weekly_reports: false,
        notification_type: 'In-App Notification'
      },
      privacy_preferences: {
        profile_visibility: 'Everyone',
        contact_visibility: 'Team',
        status_visibility: 'Online'
      },
      attendance_stats: {
        today_login: '09:05 AM',
        today_logout: 'N/A',
        total_working_hours: '142 Hrs',
        attendance_percentage: '96%',
        present_days: 18,
        absent_days: 1,
        leave_days: 1
      },
      leave_balance: {
        casual: 4,
        sick: 5,
        paid: 12
      },
      drive_integration: {
        connected: true,
        account: 'john.employee@gmail.com',
        storage_used: '12.5 GB',
        total_storage: '15 GB',
        last_sync: new Date().toISOString()
      },
      ai_risk_history: [
        { date: 'Mon', score: 12 }, { date: 'Tue', score: 15 }, { date: 'Wed', score: 14 },
        { date: 'Thu', score: 18 }, { date: 'Fri', score: 12 }, { date: 'Sat', score: 8 }
      ],
      security_info: {
        risk_score: 12,
        last_login: new Date().toISOString(),
        last_location: 'San Jose, CA (IP: 192.168.1.105)',
        registered_devices: ['MacBook Pro 14"', 'iPhone 13'],
        password_last_changed: '2025-11-20',
        face_verified: true
      },
      admin_info: {
        performance_metrics: 'Exceeds Expectations',
        weekly_tasks: 14,
        assigned_projects: ['Project Alpha', 'IAM Rollout'],
        leave_balance: 15,
        risk_score_trends: 'Stable (Low Risk)'
      }
    },
    {
      id: 'admin-1',
      email: 'admin@test.com',
      full_name: 'Alice Admin',
      role: 'ADMIN',
      department: 'HR',
      designation: 'HR Manager',
      status: 'active',
      phone: '+1 555-0193',
      address: '456 Admin Ave, NY',
      blood_group: 'A+',
      emergency_contact: '+1 555-8888',
      emergency_contact_name: 'Bob Admin',
      profile_picture: '',
      company_name: 'SecureTech Solutions Inc.',
      gender: 'Female',
      work_location: 'New York',
      office_branch: 'East Coast Branch',
      employment_status: 'Active',
      employee_type: 'Full-Time',
      dob: '1985-08-12',
      language_preference: 'English',
      theme_preference: 'Dark',
      timezone: 'America/New_York',
      two_factor_enabled: true,
      github_username: 'alice_admin',
      marital_status: 'Married',
      nationality: 'American',
      city: 'New York',
      state: 'New York',
      country: 'United States',
      postal_code: '10001',
      shift_timing: '08:00 AM - 04:00 PM',
      working_hours: '8 Hours',
      reporting_manager: 'CEO',
      appearance_preferences: {
        theme: 'Dark',
        accent_color: 'Purple',
        font_size: 'Medium',
        sidebar: 'Expanded',
        language: 'English'
      },
      notification_preferences: {
        leave_approval: true,
        new_tasks: true,
        meetings: true,
        chat_messages: true,
        file_access: true,
        security_alerts: true,
        weekly_reports: true,
        notification_type: 'Push Notification'
      },
      privacy_preferences: {
        profile_visibility: 'Everyone',
        contact_visibility: 'Everyone',
        status_visibility: 'Busy'
      },
      attendance_stats: {
        today_login: '08:00 AM',
        today_logout: 'N/A',
        total_working_hours: '150 Hrs',
        attendance_percentage: '100%',
        present_days: 20,
        absent_days: 0,
        leave_days: 0
      },
      leave_balance: {
        casual: 5,
        sick: 5,
        paid: 15
      },
      drive_integration: {
        connected: false,
        account: '',
        storage_used: '0 GB',
        total_storage: '15 GB',
        last_sync: null
      },
      ai_risk_history: [
        { date: 'Mon', score: 5 }, { date: 'Tue', score: 4 }, { date: 'Wed', score: 6 },
        { date: 'Thu', score: 3 }, { date: 'Fri', score: 5 }, { date: 'Sat', score: 2 }
      ],
      security_info: {
        risk_score: 5,
        last_login: new Date().toISOString(),
        last_location: 'New York, NY (IP: 10.0.0.50)',
        registered_devices: ['Dell XPS 15', 'iPad Pro'],
        password_last_changed: '2026-01-05',
        face_verified: true
      },
      admin_info: {
        performance_metrics: 'Outstanding',
        weekly_tasks: 28,
        assigned_projects: ['HR Automation', 'Compliance Audit 2026'],
        leave_balance: 22,
        risk_score_trends: 'Stable (Low Risk)'
      }
    }
  ],
  drive_tokens: [],
  drive_files_metadata: [
    {
      id: 'file-mock-1',
      drive_file_id: 'goog-mock-12345',
      name: 'Q3_Financial_Projections.xlsx',
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 1048576 * 2.5, // 2.5 MB
      owner_id: 'admin-1',
      folder: 'Finance',
      is_confidential: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'file-mock-2',
      drive_file_id: 'goog-mock-67890',
      name: 'Employee_Handbook.pdf',
      mime_type: 'application/pdf',
      size: 1048576 * 1.2, // 1.2 MB
      owner_id: 'admin-1',
      folder: 'HR',
      is_confidential: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  file_access_requests: [],
  drive_audit_logs: [],
  meetings: [
    {
      id: 'meet-12345',
      title: 'Q3 Security Strategy Sync',
      description: 'Discuss upcoming security protocols and IAM rollouts.',
      date: '2026-08-10',
      start_time: '10:00',
      end_time: '11:00',
      type: 'Private',
      password: '',
      waiting_room: true,
      recording_enabled: true,
      face_auth_required: true,
      host_id: 'admin-1',
      status: 'SCHEDULED', // SCHEDULED, LIVE, ENDED
      created_at: new Date().toISOString()
    }
  ],
  meeting_participants: [
    {
      meeting_id: 'meet-12345',
      user_id: 'mock',
      status: 'INVITED' // INVITED, WAITING, IN_CALL, LEFT
    }
  ],
  meeting_chats: [],
  certifications: [
    {
      id: 'cert-1',
      user_id: 'mock',
      name: 'Cybersecurity Fundamentals 2026',
      expires_on: new Date(Date.now() + 86400000 * 5).toISOString() // expires in 5 days
    }
  ],
  shifts: [
    {
      id: 'shift-1',
      user_id: 'mock',
      role: 'Security Operations',
      current_shift: '09:00 AM - 05:00 PM',
      new_shift: '11:00 AM - 07:00 PM',
      effective_from: new Date(Date.now() + 86400000 * 2).toISOString() // in 2 days
    }
  ],
  notes: [
    {
      id: 'note-1',
      user_id: 'mock',
      title: 'Project Alpha Requirements',
      content: 'Need to review the IAM module and test the biometric fallback mechanisms before Tuesday.',
      color: 'bg-blue-900/40',
      is_pinned: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  bookmarks: [
    {
      id: 'bm-1',
      user_id: 'mock',
      title: 'Google Cloud Console',
      url: 'https://console.cloud.google.com',
      description: 'GCP Management Console',
      favicon: 'https://www.google.com/s2/favicons?domain=console.cloud.google.com&sz=128',
      created_at: new Date().toISOString()
    }
  ],
  emails: [
    {
      id: 'email-1',
      owner_id: 'mock',
      sender_id: 'admin-1',
      recipient_id: 'mock',
      subject: 'Action Required: Update your Security Keys',
      body: 'Hi John,\n\nPlease ensure that your SSH keys for the production environment are rotated by the end of this week. Failure to do so will result in an automated lock-out from the bastion hosts.\n\nThanks,\nAlice Admin',
      folder: 'inbox', // 'inbox', 'sent', 'trash', 'drafts'
      is_read: false,
      is_starred: true,
      created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    },
    {
      id: 'email-2',
      owner_id: 'mock',
      sender_id: 'mock',
      recipient_id: 'admin-1',
      subject: 'Re: Project Alpha Requirements',
      body: 'Hi Alice,\n\nI have reviewed the requirements. I will begin testing the biometric fallback mechanisms tomorrow morning.\n\nBest,\nJohn',
      folder: 'sent',
      is_read: true,
      is_starred: false,
      created_at: new Date(Date.now() - 43200000).toISOString() // 12 hours ago
    },
    {
      id: 'email-3',
      owner_id: 'mock',
      sender_id: 'admin-1',
      recipient_id: 'mock',
      subject: 'Company Townhall Meeting',
      body: 'A reminder that the company townhall is scheduled for this Friday at 3 PM EST. We will be discussing the new Q4 roadmap and the upcoming IAM rollout.',
      folder: 'inbox',
      is_read: true,
      is_starred: false,
      created_at: new Date(Date.now() - 172800000).toISOString() // 2 days ago
    }
  ],
  employee_requests: [
    { id: 'req-1', user_id: 'emp-101', email: 'j.smith@tcs.com', user_name: 'John Smith', reason: 'Need access to production AWS logs for debugging issue #543.', status: 'pending', created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 'req-2', user_id: 'emp-102', email: 'm.doe@tcs.com', user_name: 'Mary Doe', reason: 'GitHub Enterprise repository access for project Phoenix.', status: 'approved', created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date(Date.now() - 80000000).toISOString() },
  ],
  integrations: [
    { id: 'int-1', name: 'Okta SSO', type: 'Identity', status: 'Active', target_url: 'https://okta.com/api', secret_key: '', last_sync: new Date(Date.now() - 60000).toISOString(), created_at: new Date().toISOString() },
    { id: 'int-2', name: 'Slack Alerts', type: 'Webhook', status: 'Active', target_url: 'https://hooks.slack.com/services/T000/B000/XXX', secret_key: '', last_sync: new Date(Date.now() - 600000).toISOString(), created_at: new Date().toISOString() },
    { id: 'int-3', name: 'Splunk SIEM', type: 'Log Forwarding', status: 'Error', target_url: 'https://splunk.corp.local:8088/services/collector', secret_key: '', last_sync: new Date(Date.now() - 7200000).toISOString(), created_at: new Date().toISOString() },
    { id: 'int-4', name: 'Workday HRIS', type: 'Directory', status: 'Active', target_url: 'https://wd5.myworkday.com/api', secret_key: '', last_sync: new Date(Date.now() - 86400000).toISOString(), created_at: new Date().toISOString() },
  ]
};

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), '.data');
const DATA_FILE = join(DATA_DIR, 'mock-db.json');

function loadDB() {
  let db = { ...INITIAL_DB };
  try {
    if (existsSync(DATA_FILE)) {
      const saved = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
      db = { ...db, ...saved };
    }
  } catch (e) {}
  return db;
}

export const MockDB = loadDB();

export function saveMockDB() {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(MockDB, null, 2), 'utf-8');
  } catch (e) {}
}

export const getMockDB = () => MockDB;
