/**
 * Browser camera helpers for face login / enrollment.
 * Runs client-side only — never import this in Server Components.
 */

export const MIN_CAMERA_WIDTH = 1280; // 720p
export const MIN_CAMERA_HEIGHT = 720;
export const MAX_ANGLE_DEG = 45;

export interface CameraHandle {
  stream: MediaStream;
  width: number;
  height: number;
  deviceLabel: string;
}

export interface CameraQuality {
  ok: boolean;
  resolutionOk: boolean;
  width: number;
  height: number;
}

export class CameraError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CameraError';
  }
}

/**
 * Requests the webcam at 720p or higher (preferred). Throws CameraError when
 * permission is denied or no camera is available.
 */
export async function startCamera(preferBack = false): Promise<CameraHandle> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new CameraError('Camera access is not supported by this browser.');
  }

  const constraints: MediaStreamConstraints = {
    video: {
      facingMode: preferBack ? 'environment' : 'user',
      width: { ideal: 1920, min: MIN_CAMERA_WIDTH },
      height: { ideal: 1080, min: MIN_CAMERA_HEIGHT },
    },
    audio: false,
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints).catch(() => {
    // Fall back to any available camera rather than failing outright.
    return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  });

  const track = stream.getVideoTracks()[0];
  const settings = track.getSettings?.() ?? {};
  const width = settings.width ?? MIN_CAMERA_WIDTH;
  const height = settings.height ?? MIN_CAMERA_HEIGHT;

  return {
    stream,
    width,
    height,
    deviceLabel: settings.deviceId ?? track.label ?? 'unknown-camera',
  };
}

export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

/** Renders the current video frame to an offscreen canvas and returns JPEG base64 (no data: prefix). */
export function captureFrame(
  video: HTMLVideoElement,
  width: number,
  height: number,
  quality = 0.92,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new CameraError('Canvas rendering is unavailable.');

  // Mirror for a natural selfie view.
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', quality).replace(/^data:image\/jpeg;base64,/, '');
}

/** Checks that the camera delivers at least 720p. */
export function checkCameraQuality(width: number, height: number): CameraQuality {
  const resolutionOk = width >= MIN_CAMERA_WIDTH && height >= MIN_CAMERA_HEIGHT;
  return { ok: resolutionOk, resolutionOk, width, height };
}

/**
 * Approximates ambient illumination from the live video feed.
 * Average pixel luminance is mapped to an estimated lux; the spec thresholds
 * at 100 lux for "low-light mode".
 */
export function estimateAmbientLux(video: HTMLVideoElement): number {
  const canvas = document.createElement('canvas');
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 250; // Unknown → assume adequate light.

  ctx.drawImage(video, 0, 0, size, size);
  let data: Uint8ClampedArray | null = null;
  try {
    data = ctx.getImageData(0, 0, size, size).data;
  } catch {
    return 250;
  }

  let luminance = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    luminance += (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  const avgLuminance = luminance / (data.length / 4);

  // Approximate: full daylight ~ 2000+ lux at luminance ~0.9; office ~ 300-500 lux
  // at luminance ~0.5; a dim room < 100 lux is roughly luminance < 0.35.
  const lux = Math.round(Math.pow(avgLuminance, 2.2) * 3000);
  return lux;
}

export const IS_LOW_LIGHT_THRESHOLD_LUX = 100;

/** Forces a screen-flash on the video element (used as the low-light fallback). */
export function applyScreenFlash(video: HTMLVideoElement | null, on: boolean): boolean {
  if (!video) return false;
  const existing = video.parentElement?.querySelector<HTMLDivElement>('[data-screen-flash]');
  if (on && !existing && video.parentElement) {
    const overlay = document.createElement('div');
    overlay.setAttribute('data-screen-flash', 'true');
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(255,255,255,0.85)';
    overlay.style.mixBlendMode = 'overlay';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '5';
    overlay.style.borderRadius = 'inherit';
    video.parentElement.appendChild(overlay);
    return true;
  }
  if (!on && existing) {
    existing.remove();
  }
  return false;
}
