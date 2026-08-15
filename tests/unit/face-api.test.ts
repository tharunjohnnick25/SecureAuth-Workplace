import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

const { faceapiMock, descriptor } = vi.hoisted(() => {
  const descriptor = Array.from({ length: 128 }, (_, i) => (i + 1) / 128);
  const withFaceDescriptor = () =>
    Promise.resolve({
      descriptor: Float32Array.from(descriptor),
      landmarks: { getPositions: () => [{ x: 10, y: 20 }, { x: 15, y: 22 }] },
      detection: { box: { x: 0, y: 0, width: 100, height: 100 }, score: 0.99 },
    });
  const withFaceLandmarks = () => ({ withFaceDescriptor });
  const detectSingleFace = () => ({ withFaceLandmarks });

  const faceapiMock = {
    nets: {
      ssdMobilenetv1: { loadFromUri: vi.fn(async () => undefined) },
      faceLandmark68Net: { loadFromUri: vi.fn(async () => undefined) },
      faceRecognitionNet: { loadFromUri: vi.fn(async () => undefined) },
    },
    detectAllFaces: vi.fn(),
    detectSingleFace,
    SsdMobilenetv1Options: class {},
  };
  return { faceapiMock, descriptor };
});

vi.mock('face-api.js', () => {
  return { default: faceapiMock, ...faceapiMock };
});

import { extractFaceEmbedding, countFaces, ensureModelsLoaded } from '@/lib/face/face-api-client';

describe('embedding generation (mocked face-api.js)', () => {
  beforeEach(() => {
    vi.resetModules();
    // Provide a browser-like global so the client module is allowed to run.
    Object.defineProperty(globalThis, 'window', { value: {}, configurable: true, writable: true });
    faceapiMock.detectAllFaces.mockReset();
  });

  afterEach(() => {
    // restore window
    delete globalThis.window;
    vi.clearAllMocks();
  });

  it('loads the three required model sets from the local URI', async () => {
    await ensureModelsLoaded();
    expect(faceapiMock.nets.ssdMobilenetv1.loadFromUri).toHaveBeenCalledWith('/models');
    expect(faceapiMock.nets.faceLandmark68Net.loadFromUri).toHaveBeenCalledWith('/models');
    expect(faceapiMock.nets.faceRecognitionNet.loadFromUri).toHaveBeenCalledWith('/models');
  });

  it('extracts a 128-dim descriptor for a single face', async () => {
    faceapiMock.detectAllFaces.mockResolvedValue([{ detection: { score: 0.99 } }]);
    const sample = await extractFaceEmbedding('data:image/jpeg;base64,AAAA');
    expect(sample).not.toBeNull();
    expect(sample!.embedding).toHaveLength(128);
    expect(sample!.embedding[0]).toBeCloseTo(descriptor[0], 5);
    expect(sample!.landmarks).toHaveLength(2);
    expect(sample!.detection.score).toBe(0.99);
  });

  it('returns null when no face is detected', async () => {
    faceapiMock.detectAllFaces.mockResolvedValue([]);
    expect(await extractFaceEmbedding('data:image/jpeg;base64,AAAA')).toBeNull();
  });

  it('throws a multiple-faces error when more than one face is present', async () => {
    faceapiMock.detectAllFaces.mockResolvedValue([{}, {}, {}]);
    await expect(extractFaceEmbedding('data:image/jpeg;base64,AAAA')).rejects.toThrow('multiple-faces');
  });

  it('counts faces for upload validation', async () => {
    faceapiMock.detectAllFaces.mockResolvedValue([{}, {}]);
    expect(await countFaces('data:image/jpeg;base64,AAAA')).toBe(2);
  });
});
