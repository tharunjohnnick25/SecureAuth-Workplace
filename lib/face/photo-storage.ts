import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { isMockMode } from '@/lib/mock-mode';

/**
 * Temporary enrollment-photo storage.
 *
 * Raw enrollment photos are kept ONLY long enough to extract embeddings, then
 * scheduled for deletion 24 hours later (the spec's requirement). In cloud
 * deployments, map FACE_PHOTO_ROOT to S3/GCS with an object lifecycle rule of
 * 24h — this module then only manages the manifest bookkeeping.
 */

export const PHOTO_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface PhotoManifest {
  folderId: string;
  employeeId: string;
  createdAt: string;
  expiresAt: string;
  photoCount: number;
}

const DEFAULT_ROOT = join(process.cwd(), '.data', 'face-photos');

export function photoRoot(): string {
  return process.env.FACE_PHOTO_ROOT || DEFAULT_ROOT;
}

function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}

function manifestPath(folderId: string): string {
  return join(photoRoot(), folderId, 'manifest.json');
}

/**
 * Writes the enrollment photos and a 24h manifest. Returns the folder id.
 * In mock mode nothing is written to disk.
 */
export function saveEnrollmentPhotos(
  employeeId: string,
  photos: Array<{ index: number; base64: string }>,
): string {
  const folderId = crypto.randomUUID();

  if (isMockMode()) return folderId;

  const dir = join(photoRoot(), folderId);
  ensureDir(dir);

  for (const photo of photos) {
    const buffer = Buffer.from(photo.base64, 'base64');
    writeFileSync(join(dir, `photo-${photo.index}.jpg`), buffer);
  }

  const now = Date.now();
  const manifest: PhotoManifest = {
    folderId,
    employeeId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + PHOTO_TTL_MS).toISOString(),
    photoCount: photos.length,
  };
  writeFileSync(manifestPath(folderId), JSON.stringify(manifest, null, 2));

  return folderId;
}

/** Reads the manifest for a folder, or null. */
export function readManifest(folderId: string): PhotoManifest | null {
  try {
    const raw = readFileSync(manifestPath(folderId), 'utf-8');
    return JSON.parse(raw) as PhotoManifest;
  } catch {
    return null;
  }
}

/**
 * Deletes every enrollment folder whose 24h TTL has elapsed. Returns the
 * number of folders purged. Intended to be invoked by a cron/cloud function.
 */
export function cleanupExpiredPhotos(now = Date.now()): number {
  if (isMockMode()) return 0;
  const root = photoRoot();
  if (!existsSync(root)) return 0;

  let purged = 0;
  for (const folderId of readdirSync(root)) {
    const manifest = readManifest(folderId);
    if (manifest && new Date(manifest.expiresAt).getTime() <= now) {
      try {
        rmSync(join(root, folderId), { recursive: true, force: true });
        purged++;
      } catch {
        // Ignore individual failures; retried next run.
      }
    }
  }
  return purged;
}

/** True if the raw bytes look like a JPEG or PNG image. */
export function looksLikeJpegOrPng(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  // JPEG SOI FFD8
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return true;
  // PNG signature 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return true;
  }
  return false;
}
