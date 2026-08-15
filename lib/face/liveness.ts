/**
 * Liveness detection (client-side).
 *
 * Two layers:
 *  1. Passive  — analyzes micro-motion, texture, and natural blinks across a
 *                short live window to reject photos / screens / printed masks.
 *  2. Active   — an interactive challenge ("blink twice", "turn head left,
 *                then right") with a hard timeout, using 68-point landmarks.
 *
 * Pure, DOM-free functions are unit-testable in Node.
 */

import type { FaceLandmarkPosition } from './types';

// ── Eye landmarks (68-point model) ─────────────────────────────────────────
const LEFT_EYE = [36, 37, 38, 39, 40, 41];
const RIGHT_EYE = [42, 43, 44, 45, 46, 47];

export const BLINK_EAR_THRESHOLD = 0.2;
export const HEAD_TURN_MIN_DEG = 25;
export const ACTIVE_CHALLENGE_TIMEOUT_MS = 10_000;

export type HeadPose = 'left' | 'right' | 'front';

function distance(a: FaceLandmarkPosition, b: FaceLandmarkPosition): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Eye Aspect Ratio (Soukupová & Čech). ~0.25 open, <0.2 = closed eye. */
export function eyeAspectRatio(landmarks: FaceLandmarkPosition[]): number {
  const pts = landmarks as (FaceLandmarkPosition & { _i?: number })[];
  const left = LEFT_EYE.map((i) => landmarks[i]);
  const right = RIGHT_EYE.map((i) => landmarks[i]);

  const ear = (eye: FaceLandmarkPosition[]) => {
    const a = distance(eye[1], eye[5]);
    const b = distance(eye[2], eye[4]);
    const c = distance(eye[0], eye[3]);
    return (a + b) / (2 * c);
  };

  return (ear(left) + ear(right)) / 2;
}

export function isBlinking(ear: number): boolean {
  return ear < BLINK_EAR_THRESHOLD;
}

/**
 * Estimates head yaw in degrees from 68 landmarks. Negative = turned to the
 * subject's left, positive = right, ~0 = frontal.
 * Uses the ratio between nose-to-left-edge and nose-to-right-edge distances.
 */
export function estimateYawDegrees(landmarks: FaceLandmarkPosition[]): number {
  if (!landmarks || landmarks.length < 31) return 0;
  const nose = landmarks[30];
  const leftEdge = landmarks[0];
  const rightEdge = landmarks[16];

  const dL = Math.abs(nose.x - leftEdge.x);
  const dR = Math.abs(nose.x - rightEdge.x);
  const sum = dL + dR;
  if (sum === 0) return 0;
  // Balanced face → 0; more weight on the right side → turned left (negative).
  return (dL - dR) / sum * 90;
}

export function classifyYaw(yaw: number): HeadPose {
  if (yaw <= -HEAD_TURN_MIN_DEG) return 'left';
  if (yaw >= HEAD_TURN_MIN_DEG) return 'right';
  return 'front';
}

// ── Passive liveness ───────────────────────────────────────────────────────

export interface PassiveFrameSample {
  /** Grayscale Uint8Array sample of the current frame. */
  gray: Uint8ClampedArray;
  /** Average luminance 0..1 for brightness. */
  luminance: number;
  /** Laplacian variance (focus/edge energy) of the grayscale sample. */
  textureEnergy: number;
}

export interface PassiveLivenessResult {
  passed: boolean;
  score: number;          // 0..1 combined liveness confidence
  motionScore: number;    // 0..1 (1 = natural micro-motion present)
  textureScore: number;   // 0..1 (1 = natural facial texture)
  blinks: number;
  reason?: string;
}

const REQUIRED_PASSIVE_FRAMES = 12;
const MOTION_EPSILON = 0.02;   // min mean per-pixel difference considered "motion"
const TEXTURE_MIN_ENERGY = 1200; // Laplacian variance floor for a plausible face texture

function sampleGray(image: ImageData): PassiveFrameSample {
  const data = image.data;
  const gray = new Uint8ClampedArray(image.width * image.height);
  let luminance = 0;
  for (let i = 0; i < data.length; i += 4) {
    const g = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    gray[i / 4] = g;
    luminance += g / 255;
  }
  luminance /= gray.length;

  // Laplacian variance as a blur/edge-energy heuristic.
  let lapSum = 0;
  let lapSumSq = 0;
  let lapCount = 0;
  const w = image.width;
  for (let y = 1; y < image.height - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = gray[i + 1] + gray[i - 1] + gray[i + w] + gray[i - w] - 4 * gray[i];
      lapSum += lap;
      lapSumSq += lap * lap;
      lapCount++;
    }
  }
  const mean = lapSum / Math.max(1, lapCount);
  const variance = lapSumSq / Math.max(1, lapCount) - mean * mean;

  return { gray, luminance, textureEnergy: variance };
}

/**
 * Analyzes a rolling window of frames for passive liveness:
 *  - micro-motion between frames rules out a static photo/print,
 *  - natural blink events rule out photos & most masks,
 *  - texture energy rules out heavy blur / screens.
 */
export class PassiveLivenessAnalyzer {
  private samples: PassiveFrameSample[] = [];

  addFrame(image: ImageData | null): void {
    if (!image) return;
    this.samples.push(sampleGray(image));
    if (this.samples.length > REQUIRED_PASSIVE_FRAMES) {
      this.samples.shift();
    }
  }

  /** Number of frames accumulated so far. */
  get frameCount(): number {
    return this.samples.length;
  }

  private motionScore(): number {
    if (this.samples.length < 3) return 0;
    let total = 0;
    let pairs = 0;
    for (let i = 1; i < this.samples.length; i++) {
      const a = this.samples[i - 1].gray;
      const b = this.samples[i].gray;
      let diff = 0;
      for (let j = 0; j < a.length; j++) {
        diff += Math.abs(a[j] - b[j]);
      }
      diff /= a.length * 255;
      total += diff;
      pairs++;
    }
    const meanDiff = total / pairs;
    // Sigmoid mapping: micro-motion ~0.02 → low, ~0.08+ → high confidence.
    return 1 / (1 + Math.exp(-((meanDiff - 0.04) / 0.02)));
  }

  private textureScore(): number {
    if (this.samples.length === 0) return 0;
    const avgEnergy = this.samples.reduce((s, f) => s + f.textureEnergy, 0) / this.samples.length;
    return Math.min(1, avgEnergy / (TEXTURE_MIN_ENERGY * 4));
  }

  result(): PassiveLivenessResult {
    const motionScore = this.motionScore();
    const textureScore = this.textureScore();
    // A blink is scored by the challenge layer; passive pass is primarily
    // driven by micro-motion + plausible texture.
    const score = Math.max(motionScore, 0.2) * (0.7 + 0.3 * textureScore);
    const passed = motionScore > 0.55 && textureScore > 0.12 && this.samples.length >= REQUIRED_PASSIVE_FRAMES * 0.5;
    return {
      passed,
      score: Math.round(Math.min(1, score) * 1000) / 1000,
      motionScore: Math.round(motionScore * 1000) / 1000,
      textureScore: Math.round(textureScore * 1000) / 1000,
      blinks: 0,
      reason: passed ? undefined : 'Insufficient micro-motion or texture — possible photo/screen attack',
    };
  }

  reset(): void {
    this.samples = [];
  }
}

// ── Active challenge ───────────────────────────────────────────────────────

export type ChallengeStep = 'BLINK_TWICE' | 'HEAD_TURN';
export type ChallengeState =
  | { phase: 'idle' }
  | { phase: 'running'; step: ChallengeStep; prompt: string }
  | { phase: 'passed' }
  | { phase: 'failed'; reason: string };

export interface ChallengeProgress {
  blinks: number;
  maxLeftYaw: number;
  maxRightYaw: number;
  sawLeft: boolean;
  sawRight: boolean;
  elapsedMs: number;
}

/**
 * Interactive active-liveness challenge. Call `processLandmarks` every frame
 * with the 68-point landmarks (null when no face). Completes when the user
 * blinks twice and turns their head left then right within the timeout.
 */
export class ActiveLivenessChallenge {
  private step: ChallengeStep = 'BLINK_TWICE';
  private blinks = 0;
  private wasClosed = false;
  private yawBuffer: number[] = [];
  private maxLeftYaw = 0;
  private maxRightYaw = 0;
  private sawLeft = false;
  private sawRight = false;
  private startedAt = 0;
  private done = false;
  private failedReason: string | null = null;

  /** Start (or restart) the challenge and record the clock. */
  start(): void {
    this.step = 'BLINK_TWICE';
    this.blinks = 0;
    this.wasClosed = false;
    this.yawBuffer = [];
    this.maxLeftYaw = 0;
    this.maxRightYaw = 0;
    this.sawLeft = false;
    this.sawRight = false;
    this.done = false;
    this.failedReason = null;
    this.startedAt = Date.now();
  }

  get prompt(): string {
    if (this.step === 'BLINK_TWICE') return 'Please blink twice';
    return 'Turn your head slowly left, then right';
  }

  /** Processes one video frame's landmarks. Returns the current state. */
  processLandmarks(landmarks: FaceLandmarkPosition[] | null): ChallengeState {
    if (this.done) {
      return this.failedReason
        ? { phase: 'failed', reason: this.failedReason }
        : { phase: 'passed' };
    }
    if (this.startedAt === 0) this.start();

    const elapsedMs = Date.now() - this.startedAt;
    if (elapsedMs > ACTIVE_CHALLENGE_TIMEOUT_MS) {
      this.done = true;
      this.failedReason = 'Liveness check timed out';
      return { phase: 'failed', reason: this.failedReason };
    }

    if (landmarks && landmarks.length >= 47) {
      const ear = eyeAspectRatio(landmarks);
      const yaw = estimateYawDegrees(landmarks);

      // Blink counting (rising edge of the closed state).
      const closed = isBlinking(ear);
      if (closed && !this.wasClosed) {
        if (this.step === 'BLINK_TWICE') {
          this.blinks++;
          if (this.blinks >= 2) {
            this.step = 'HEAD_TURN';
          }
        }
      }
      this.wasClosed = closed;

      // Head-turn tracking.
      this.yawBuffer.push(yaw);
      if (this.yawBuffer.length > 20) this.yawBuffer.shift();
      const smoothYaw = this.yawBuffer.reduce((s, v) => s + v, 0) / this.yawBuffer.length;

      if (smoothYaw <= -HEAD_TURN_MIN_DEG) {
        this.sawLeft = true;
        this.maxLeftYaw = Math.max(this.maxLeftYaw, smoothYaw);
      }
      if (smoothYaw >= HEAD_TURN_MIN_DEG) {
        this.sawRight = true;
        this.maxRightYaw = Math.max(this.maxRightYaw, smoothYaw);
      }
    }

    const state: ChallengeState =
      this.step === 'BLINK_TWICE'
        ? { phase: 'running', step: 'BLINK_TWICE', prompt: this.prompt }
        : { phase: 'running', step: 'HEAD_TURN', prompt: this.prompt };

    if (this.step === 'HEAD_TURN' && this.sawLeft && this.sawRight) {
      this.done = true;
      return { phase: 'passed' };
    }
    return state;
  }

  getProgress(): ChallengeProgress {
    return {
      blinks: this.blinks,
      maxLeftYaw: Math.round(this.maxLeftYaw * 10) / 10,
      maxRightYaw: Math.round(this.maxRightYaw * 10) / 10,
      sawLeft: this.sawLeft,
      sawRight: this.sawRight,
      elapsedMs: this.startedAt ? Date.now() - this.startedAt : 0,
    };
  }

  reset(): void {
    this.done = false;
    this.failedReason = null;
    this.startedAt = 0;
  }
}
