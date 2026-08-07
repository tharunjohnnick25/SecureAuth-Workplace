import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Check for the mock authentication cookie
  const authToken = req.cookies.get('gmail_auth_token');
  
  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Mock Gmail data
  const mockGmails = [
    {
      id: 'g1',
      sender: { name: 'Google Workspace', email: 'workspace-noreply@google.com', avatar: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png' },
      recipient: { name: 'You', email: 'user@company.com' },
      subject: 'Security Alert: New sign-in on Windows',
      body: 'We noticed a new sign-in to your Google Account on a Windows device. If this was you, you don\'t need to do anything. If not, we\'ll help you secure your account.',
      folder: 'gmail',
      is_read: false,
      is_starred: true,
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 mins ago
    },
    {
      id: 'g2',
      sender: { name: 'LinkedIn', email: 'messages-noreply@linkedin.com', avatar: '' },
      recipient: { name: 'You', email: 'user@company.com' },
      subject: 'You appeared in 14 searches this week',
      body: 'Hi there, you appeared in 14 searches this week. Check out who\'s looking for you on LinkedIn.',
      folder: 'gmail',
      is_read: true,
      is_starred: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() // 5 hours ago
    },
    {
      id: 'g3',
      sender: { name: 'AWS Notifications', email: 'no-reply-aws@amazon.com', avatar: '' },
      recipient: { name: 'You', email: 'user@company.com' },
      subject: 'AWS Billing Alert: Estimate exceeds $50.00',
      body: 'Your estimated charges for the current month have exceeded the threshold of $50.00. Please log in to the AWS Billing Console to view your usage.',
      folder: 'gmail',
      is_read: false,
      is_starred: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
    },
    {
      id: 'g4',
      sender: { name: 'GitHub', email: 'notifications@github.com', avatar: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png' },
      recipient: { name: 'You', email: 'user@company.com' },
      subject: '[IAM-Cybersecurity] Pull request #42 approved',
      body: 'Your pull request "Implement Biometric Authentication" has been approved by @admin. You can now merge it.',
      folder: 'gmail',
      is_read: true,
      is_starred: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() // 2 days ago
    }
  ];

  return NextResponse.json({ success: true, data: mockGmails });
}
