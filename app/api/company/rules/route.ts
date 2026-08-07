import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyName = searchParams.get('company') || 'SecureTech Solutions Inc.';

  // Mocking different rules per company
  const companyRulesDB: Record<string, any[]> = {
    'SecureTech Solutions Inc.': [
      { id: 1, title: 'Zero Trust Network Access', description: 'All access must be verified through the IAM portal. Direct IP access to staging is prohibited.' },
      { id: 2, title: 'Data Classification', description: 'Internal data must not be shared on public repositories. Tag all PII accordingly.' },
      { id: 3, title: 'Remote Work Policy', description: 'Use company-issued VPNs when connecting from public Wi-Fi networks.' },
      { id: 4, title: 'Phishing Protocol', description: 'Report suspicious emails using the Report button. Do not forward them.' }
    ],
    'Acme Corp': [
      { id: 1, title: 'Mandatory Office Days', description: 'Employees must be in the office on Tuesdays and Thursdays.' },
      { id: 2, title: 'Clean Desk Policy', description: 'No sensitive documents left on desks overnight.' }
    ]
  };

  // Default fallback if company not found
  const rules = companyRulesDB[companyName] || [
    { id: 1, title: 'General IT Policy', description: 'Ensure all devices are locked when stepping away.' },
    { id: 2, title: 'Security Audits', description: 'Subject to quarterly internal security audits.' }
  ];

  return NextResponse.json({ success: true, data: rules });
}
