import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const VALID_DOCUMENT_TYPES = ['Aadhaar', 'PAN', 'Passport', 'Resume', 'Offer Letter', 'Experience Certificate', 'Degree Certificate', 'Driving License', 'Other'];

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('employee_documents').select('*').eq('employee_id', id).order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ data: data || [], success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch documents', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('document_type') as string || 'Other';

    if (!file) return NextResponse.json({ error: 'No file provided', success: false }, { status: 400 });
    if (!VALID_DOCUMENT_TYPES.includes(documentType)) {
      return NextResponse.json({ error: `Invalid document type. Must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`, success: false }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: PDF, DOCX, PNG, JPEG', success: false }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit', success: false }, { status: 400 });
    }

    const fileName = `${id}/${documentType}_${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage.from('employee-documents').upload(fileName, file, {
      cacheControl: '3600', upsert: true,
    });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('employee-documents').getPublicUrl(fileName);

    const { data, error } = await supabase.from('employee_documents').insert([{
      employee_id: id, document_type: documentType, document_name: file.name, file_url: publicUrl, file_size: file.size, mime_type: file.type,
    }]).select().single();

    if (error) throw error;
    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to upload document', success: false }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('document_id');
    if (!documentId) return NextResponse.json({ error: 'Document ID required', success: false }, { status: 400 });

    const { data: doc } = await supabase.from('employee_documents').select('*').eq('id', documentId).eq('employee_id', id).single();
    if (!doc) return NextResponse.json({ error: 'Document not found', success: false }, { status: 404 });

    if (doc.file_url) {
      const parts = doc.file_url.split('/');
      const filePath = parts.slice(-2).join('/');
      await supabase.storage.from('employee-documents').remove([filePath]);
    }

    const { error } = await supabase.from('employee_documents').delete().eq('id', documentId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete document', success: false }, { status: 500 });
  }
}
