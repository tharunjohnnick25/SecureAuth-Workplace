/**
 * Minimal structural type for the subset of face-api.js that the app uses.
 * Keeps tests and mocks independent of the real (heavy) face-api.js typings.
 */

export interface FaceDetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceLandmarkPosition {
  x: number;
  y: number;
}

export interface FaceDetectionResult {
  detection: {
    box: FaceDetectionBox;
    score: number;
  };
  landmarks: {
    getPositions(): FaceLandmarkPosition[];
  };
  descriptor: Float32Array;
}

export interface FaceDetectorOptions {
  minConfidence: number;
}

export interface FaceApi {
  nets: {
    ssdMobilenetv1: { loadFromUri(uri: string): Promise<void> };
    faceLandmark68Net: { loadFromUri(uri: string): Promise<void> };
    faceRecognitionNet: { loadFromUri(uri: string): Promise<void> };
  };
  SsdMobilenetv1Options: new (options?: { minConfidence?: number }) => FaceDetectorOptions;
  detectAllFaces(input: unknown, options?: FaceDetectorOptions): Promise<FaceDetectionResult[]>;
  detectSingleFace(
    input: unknown,
    options?: FaceDetectorOptions,
  ): {
    withFaceLandmarks(): {
      withFaceDescriptor(): Promise<FaceDetectionResult | undefined>;
    };
  };
}
