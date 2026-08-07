import { NextRequest, NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';

// Update file metadata (rename, move)
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { user_id, role, name, folder } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const fileIdx = MockDB.drive_files_metadata.findIndex((f: any) => f.id === id);
    if (fileIdx === -1) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const file = MockDB.drive_files_metadata[fileIdx];

    // RBAC: Only admin or owner can rename/move
    if (role !== 'ADMIN' && file.owner_id !== user_id) {
      return NextResponse.json({ error: 'Access Denied: You do not have permission to modify this file' }, { status: 403 });
    }

    if (name) file.name = name;
    if (folder) file.folder = folder;
    file.updated_at = new Date().toISOString();

    // Audit Log
    MockDB.drive_audit_logs.push({
      id: `audit-${Date.now()}`,
      user_id,
      file_id: id,
      action: 'EDIT',
      file_name: file.name,
      timestamp: new Date().toISOString(),
      ip_address: '192.168.1.1',
      risk_score: 12
    } as any);

    saveMockDB();

    return NextResponse.json({ data: file, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete file
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');
    const role = searchParams.get('role');

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const fileIdx = MockDB.drive_files_metadata.findIndex((f: any) => f.id === id);
    if (fileIdx === -1) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const file = MockDB.drive_files_metadata[fileIdx];

    if (role !== 'ADMIN' && file.owner_id !== userId) {
      // Audit log the failed attempt
      MockDB.drive_audit_logs.push({
        id: `audit-${Date.now()}`,
        user_id: userId,
        file_id: id,
        action: 'DELETE_DENIED',
        file_name: file.name,
        timestamp: new Date().toISOString(),
        ip_address: '192.168.1.1',
        risk_score: 85
      } as any);
      saveMockDB();
      return NextResponse.json({ error: 'Access Denied: You cannot delete this file' }, { status: 403 });
    }

    // In a real app, delete from Google Drive via API here
    MockDB.drive_files_metadata.splice(fileIdx, 1);

    MockDB.drive_audit_logs.push({
      id: `audit-${Date.now()}`,
      user_id: userId,
      file_id: id,
      action: 'DELETE',
      file_name: file.name,
      timestamp: new Date().toISOString(),
      ip_address: '192.168.1.1',
      risk_score: 12
    } as any);

    saveMockDB();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
