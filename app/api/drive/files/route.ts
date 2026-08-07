import { NextRequest, NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';

// List files, enforcing RBAC
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');
    const role = searchParams.get('role'); // e.g. ADMIN or USER

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    let files = MockDB.drive_files_metadata;

    // RBAC Logic: Admins see everything. Employees only see non-confidential,
    // unless they have an approved access request.
    if (role !== 'ADMIN') {
      // Find all approved requests for this user
      const approvedRequests = MockDB.file_access_requests.filter(
        (r: any) => r.user_id === userId && r.status === 'APPROVED'
      );
      const approvedFileIds = new Set(approvedRequests.map((r: any) => r.file_id));

      files = files.filter((f: any) => {
        if (!f.is_confidential) return true;
        if (f.owner_id === userId) return true;
        if (approvedFileIds.has(f.id)) return true;
        return false;
      });
    }

    return NextResponse.json({ data: files, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Upload a new file
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('user_id') as string;
    const folder = formData.get('folder') as string || 'General';
    const isConfidential = formData.get('is_confidential') === 'true';

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or user_id' }, { status: 400 });
    }

    // Check application storage limits (1 GB)
    const totalUsed = MockDB.drive_files_metadata.reduce((acc: number, f: any) => acc + (f.size || 0), 0);
    const maxStorage = 1024 * 1024 * 1024; // 1 GB
    if (totalUsed + file.size > maxStorage) {
      return NextResponse.json({ error: 'Storage limit exceeded (1 GB)' }, { status: 403 });
    }

    // In a real app, this streams the file buffer to Google Drive API
    // const drive = google.drive({ version: 'v3', auth: oauth2Client });
    // const driveFile = await drive.files.create({...});
    const mockDriveFileId = `goog-mock-${Date.now()}`;

    const newFile = {
      id: `file-${Date.now()}`,
      drive_file_id: mockDriveFileId,
      name: file.name,
      mime_type: file.type || 'application/octet-stream',
      size: file.size,
      owner_id: userId,
      folder,
      is_confidential: isConfidential,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    MockDB.drive_files_metadata.push(newFile as any);

    // Create Audit Log
    MockDB.drive_audit_logs.push({
      id: `audit-${Date.now()}`,
      user_id: userId,
      file_id: newFile.id,
      action: 'UPLOAD',
      file_name: file.name,
      timestamp: new Date().toISOString(),
      ip_address: '192.168.1.1',
      risk_score: 12
    } as any);

    saveMockDB();

    return NextResponse.json({ data: newFile, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
