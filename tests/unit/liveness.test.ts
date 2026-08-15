import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  eyeAspectRatio,
  estimateYawDegrees,
  isBlinking,
  classifyYaw,
  PassiveLivenessAnalyzer,
  ActiveLivenessChallenge,
  BLINK_EAR_THRESHOLD,
  HEAD_TURN_MIN_DEG,
} from '@/lib/face/liveness';
import type { FaceLandmarkPosition } from '@/lib/face/types';

type Landmark = { x: number; y: number };

/** Builds a 68-point landmark set with a controlled EAR and yaw. */
function makeLandmarks(options: { ear: number; yawDeg: number }): Landmark[] {
  const { ear, yawDeg } = options;
  const pts: Landmark[] = Array.from({ length: 68 }, (_, i) => ({ x: 100, y: 100 }));

  const placeEye = (centerX: number, vertical: number) => {
    const h = 16; // horizontal eye width
    const cx = centerX;
    const cy = 100;
    const v = vertical; // vertical openness → EAR = v / h
    const eye = [
      { x: cx - h / 2, y: cy },
      { x: cx - h / 4, y: cy - v / 2 },
      { x: cx + h / 4, y: cy - v / 2 },
      { x: cx + h / 2, y: cy },
      { x: cx + h / 4, y: cy + v / 2 },
      { x: cx - h / 4, y: cy + v / 2 },
    ];
    return eye;
  };

  const left = placeEye(80, ear * 16);
  const right = placeEye(120, ear * 16);
  for (let i = 0; i < 6; i++) {
    pts[36 + i] = left[i];
    pts[42 + i] = right[i];
  }

  // Face edges: index 0 (left edge) and 16 (right edge).
  const faceWidth = 200;
  const noseX = 100 + (yawDeg / 90) * (faceWidth / 2);
  pts[0] = { x: 0, y: 100 };
  pts[16] = { x: faceWidth, y: 100 };
  pts[30] = { x: noseX, y: 100 };

  return pts;
}

describe('eye aspect ratio (EAR) & blink detection', () => {
  it('computes a high EAR for open eyes and low for closed', () => {
    const open = eyeAspectRatio(makeLandmarks({ ear: 0.25, yawDeg: 0 }));
    const closed = eyeAspectRatio(makeLandmarks({ ear: 0.0625, yawDeg: 0 }));
    expect(open).toBeCloseTo(0.25, 2);
    expect(closed).toBeLessThan(BLINK_EAR_THRESHOLD);
    expect(isBlinking(closed)).toBe(true);
    expect(isBlinking(open)).toBe(false);
  });
});

describe('head yaw estimation', () => {
  it('returns ~0° for a frontal face', () => {
    expect(Math.abs(estimateYawDegrees(makeLandmarks({ ear: 0.25, yawDeg: 0 })))).toBeLessThan(2);
  });

  it('detects a left turn beyond the threshold', () => {
    const yaw = estimateYawDegrees(makeLandmarks({ ear: 0.25, yawDeg: -40 }));
    expect(yaw).toBeLessThan(-HEAD_TURN_MIN_DEG);
    expect(classifyYaw(yaw)).toBe('left');
  });

  it('detects a right turn beyond the threshold', () => {
    const yaw = estimateYawDegrees(makeLandmarks({ ear: 0.25, yawDeg: 40 }));
    expect(yaw).toBeGreaterThan(HEAD_TURN_MIN_DEG);
    expect(classifyYaw(yaw)).toBe('right');
  });
});

describe('PassiveLivenessAnalyzer (micro-motion + texture)', () => {
  const frame = (base: number, noise: number) =>
    new Uint8ClampedArray(48 * 48 * 4).map((_, i) => {
      const isGray = i % 4 !== 3; // alpha channel untouched
      return isGray ? Math.max(0, Math.min(255, base + Math.round(noise * (i % 7)))) : 255;
    });

  function imageDataFor(data: Uint8ClampedArray) {
    return { data, width: 48, height: 48 } as unknown as ImageData;
  }

  it('flags a static (photo-like) sequence as not passed', () => {
    const analyzer = new PassiveLivenessAnalyzer();
    for (let i = 0; i < 12; i++) {
      analyzer.addFrame(imageDataFor(frame(128, 0)));
    }
    const result = analyzer.result();
    expect(result.passed).toBe(false);
    expect(result.motionScore).toBeLessThan(0.55);
  });

  it('passes when frames contain natural micro-motion', () => {
    const analyzer = new PassiveLivenessAnalyzer();
    for (let i = 0; i < 12; i++) {
      analyzer.addFrame(imageDataFor(frame(128, i % 2 === 0 ? 18 : 3)));
    }
    const result = analyzer.result();
    expect(result.motionScore).toBeGreaterThan(0.55);
  });
});

describe('ActiveLivenessChallenge (blink twice → head turn)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const advanceFrames = (frames: number) => {
    vi.advanceTimersByTime(frames * 33); // ~30fps
  };

  it('rejects when the user never blinks', () => {
    const challenge = new ActiveLivenessChallenge();
    challenge.start();
    for (let i = 0; i < 360; i++) {
      challenge.processLandmarks(makeLandmarks({ ear: 0.25, yawDeg: 0 }));
      advanceFrames(1);
    }
    const state = challenge.processLandmarks(makeLandmarks({ ear: 0.25, yawDeg: 0 }));
    expect(state.phase).toBe('failed');
    expect(state.phase === 'failed' && state.reason).toContain('timed out');
  });

  it('completes after two blinks and a left-then-right head turn', () => {
    const challenge = new ActiveLivenessChallenge();
    challenge.start();

    // Two natural blinks.
    for (let blink = 0; blink < 2; blink++) {
      for (let i = 0; i < 5; i++) {
        challenge.processLandmarks(makeLandmarks({ ear: 0.0625, yawDeg: 0 })); // closed
        advanceFrames(1);
      }
      for (let i = 0; i < 5; i++) {
        challenge.processLandmarks(makeLandmarks({ ear: 0.25, yawDeg: 0 })); // open
        advanceFrames(1);
      }
    }

    // Head turn: left, then right (must fill the smoothing buffer).
    for (let i = 0; i < 25; i++) {
      challenge.processLandmarks(makeLandmarks({ ear: 0.25, yawDeg: -40 }));
      advanceFrames(1);
    }
    for (let i = 0; i < 25; i++) {
      challenge.processLandmarks(makeLandmarks({ ear: 0.25, yawDeg: 40 }));
      advanceFrames(1);
    }

    const state = challenge.processLandmarks(makeLandmarks({ ear: 0.25, yawDeg: 40 }));
    expect(state.phase).toBe('passed');
    const progress = challenge.getProgress();
    expect(progress.blinks).toBeGreaterThanOrEqual(2);
    expect(progress.sawLeft).toBe(true);
    expect(progress.sawRight).toBe(true);
  });

  it('does not count one sustained blink as two', () => {
    const challenge = new ActiveLivenessChallenge();
    challenge.start();
    // One long closed-eye period (should be a single blink).
    for (let i = 0; i < 20; i++) {
      challenge.processLandmarks(makeLandmarks({ ear: 0.0625, yawDeg: 0 }));
      advanceFrames(1);
    }
    expect(challenge.getProgress().blinks).toBe(1);
  });
});
