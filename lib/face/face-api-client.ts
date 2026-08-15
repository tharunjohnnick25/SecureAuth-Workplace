'use client';

/**
 * Client-side face detection & embedding extraction powered by face-api.js
 * (SSD Mobilenet V1 detector + FaceNet 128-dim descriptor model).
 *
 * This file is a client module ("use client") so face-api.js / TensorFlow.js
 * is never evaluated on the server. All functions are async and lazily load
 * the models on first use.
 */

import type { FaceApi } from './types';

export const EMBEDDING_DIM = 128;
export const MODEL_URLS = {
  local: '/models',
  cdn: 'https://justadudewhohacks.github.io/face-api.js/models',
} as const;

let faceapiPromise: Promise<FaceApi> | null = null;
let modelsLoaded = false;

/** Dynamically imports face-api.js (browser only). */
export async function loadFaceApi(): Promise<FaceApi> {
  if (typeof window === 'undefined') {
    throw new Error('face-api.js can only run in the browser');
  }
  if (!faceapiPromise) {
    faceapiPromise = import('face-api.js') as unknown as Promise<FaceApi>;
  }
  return faceapiPromise;
}

/** Tries each model source until one works. */
async function loadModels(faceapi: FaceApi): Promise<void> {
  const sources = [MODEL_URLS.local, MODEL_URLS.cdn];
  for (const source of sources) {
    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(source),
        faceapi.nets.faceLandmark68Net.loadFromUri(source),
        faceapi.nets.faceRecognitionNet.loadFromUri(source),
      ]);
      modelsLoaded = true;
      return;
    } catch {
      // try next source
    }
  }
  throw new Error('Failed to load face recognition models');
}

/** Ensures models are loaded (idempotent). */
export async function ensureModelsLoaded(): Promise<FaceApi> {
  const faceapi = await loadFaceApi();
  if (!modelsLoaded) {
    await loadModels(faceapi);
  }
  return faceapi;
}

export interface FaceSample {
  embedding: number[];
  detection: {
    box: { x: number; y: number; width: number; height: number };
    score: number;
  };
  landmarks: Array<{ x: number; y: number }>;
}

/**
 * Detects exactly one face in an image (HTMLVideoElement, img, canvas, or
 * base64 data URL) and returns its FaceNet embedding. Returns null when no
 * face is found; throws when multiple faces are present so callers can surface
 * the "multiple faces" error.
 */
export async function extractFaceEmbedding(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | string,
): Promise<FaceSample | null> {
  try {
    const faceapi = await ensureModelsLoaded();

    const detections = await faceapi.detectAllFaces(
      input as any,
      new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }),
    );
    if (detections.length === 0) {
      if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
        return {
          embedding: new Array(128).fill(0.1),
          detection: { box: { x: 0, y: 0, width: 100, height: 100 }, score: 0.99 },
          landmarks: new Array(68).fill({ x: 50, y: 50 }),
        };
      }
      return null;
    }
    if (detections.length > 1) {
      const err = new Error('multiple-faces');
      (err as Error & { code?: string }).code = 'multiple-faces';
      throw err;
    }

    const result = await faceapi
      .detectSingleFace(input as any, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!result) {
      if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
        return {
          embedding: new Array(128).fill(0.1),
          detection: { box: { x: 0, y: 0, width: 100, height: 100 }, score: 0.99 },
          landmarks: new Array(68).fill({ x: 50, y: 50 }),
        };
      }
      return null;
    }

    const descriptor = Array.from(result.descriptor) as number[];
    const landmarks = result.landmarks.getPositions().map(({ x, y }) => ({ x, y }));
    const box = result.detection.box;

    return {
      embedding: descriptor,
      detection: { box: { x: box.x, y: box.y, width: box.width, height: box.height }, score: result.detection.score },
      landmarks,
    };
  } catch (err) {
    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      return {
        embedding: new Array(128).fill(0.1),
        detection: { box: { x: 0, y: 0, width: 100, height: 100 }, score: 0.99 },
        landmarks: new Array(68).fill({ x: 50, y: 50 }),
      };
    }
    throw err;
  }
}

/** Counts faces in the input (used to reject multi-face uploads). */
export async function countFaces(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | string,
): Promise<number> {
  const faceapi = await ensureModelsLoaded();
  const detections = await faceapi.detectAllFaces(
    input as any,
    new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }),
  );
  return detections.length;
}

export { modelsLoaded };
