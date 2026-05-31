import { supabase } from './supabase/client';

export const BUCKETS = {
  PROFILE_IMAGES: 'profile-images',
  EMPLOYEE_DOCUMENTS: 'employee-documents',
  THREAT_SCREENSHOTS: 'threat-screenshots',
  AUDIT_FILES: 'audit-files',
  DEMO_VIDEOS: 'demo-videos',
  SECURITY_REPORTS: 'security-reports',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

export async function uploadFile(
  bucket: BucketName,
  path: string,
  file: File | Blob,
  options?: { upsert?: boolean; contentType?: string }
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: options?.upsert ?? true,
      contentType: options?.contentType,
    });

  if (error) throw error;
  return data;
}

export async function downloadFile(bucket: BucketName, path: string) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw error;
  return data;
}

export async function deleteFile(bucket: BucketName, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

export async function listFiles(bucket: BucketName, folder?: string) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder || '', { limit: 100, offset: 0 });

  if (error) throw error;
  return data || [];
}

export function getPublicUrl(bucket: BucketName, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadProfileImage(userId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/profile.${fileExt}`;

  await uploadFile(BUCKETS.PROFILE_IMAGES, filePath, file);

  const publicUrl = getPublicUrl(BUCKETS.PROFILE_IMAGES, filePath);

  const { error: updateError } = await (supabase.from('users') as any)
    .update({ avatar_url: publicUrl })
    .eq('id', userId);

  if (updateError) throw updateError;

  return publicUrl;
}

export async function uploadThreatScreenshot(
  threatId: string,
  file: File
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const filePath = `${threatId}/screenshot.${fileExt}`;
  await uploadFile(BUCKETS.THREAT_SCREENSHOTS, filePath, file);
  return getPublicUrl(BUCKETS.THREAT_SCREENSHOTS, filePath);
}

export async function uploadSecurityReport(
  userId: string,
  fileName: string,
  content: Blob
): Promise<string> {
  const filePath = `${userId}/${fileName}`;
  await uploadFile(BUCKETS.SECURITY_REPORTS, filePath, content, {
    contentType: 'application/pdf',
  });
  return getPublicUrl(BUCKETS.SECURITY_REPORTS, filePath);
}

export async function uploadEmployeeDocument(
  userId: string,
  file: File
): Promise<string> {
  const filePath = `${userId}/${file.name}`;
  await uploadFile(BUCKETS.EMPLOYEE_DOCUMENTS, filePath, file);
  return getPublicUrl(BUCKETS.EMPLOYEE_DOCUMENTS, filePath);
}
