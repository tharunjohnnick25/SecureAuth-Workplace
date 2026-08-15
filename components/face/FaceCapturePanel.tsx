'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, AlertTriangle, ScanFace, CheckCircle2, Sun, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  startCamera,
  stopCamera,
  checkCameraQuality,
  estimateAmbientLux,
  IS_LOW_LIGHT_THRESHOLD_LUX,
  applyScreenFlash,
  captureFrame,
  type CameraHandle,
} from '@/lib/face/camera';
import {
  extractFaceEmbedding,
  ensureModelsLoaded,
  type FaceSample,
} from '@/lib/face/face-api-client';
import {
  PassiveLivenessAnalyzer,
  ActiveLivenessChallenge,
  estimateYawDegrees,
  type ChallengeState,
} from '@/lib/face/liveness';
import { FACE_ERROR_MESSAGES } from '@/lib/face/errors';
import { reportError } from '@/lib/face/monitoring';

export interface FaceCaptureResult {
  embeddings: number[][];
  photos: string[];
  liveness: {
    passivePassed: boolean;
    activePassed: boolean;
    score: number;
  };
}

interface FaceCapturePanelProps {
  mode: 'enroll' | 'login';
  onComplete: (result: FaceCaptureResult) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

type Status =
  | 'idle'
  | 'starting'
  | 'camera-error'
  | 'quality-error'
  | 'running'
  | 'capture'
  | 'processing'
  | 'complete';

/**
 * Full camera pipeline: 720p quality gate, low-light detection with screen
 * flash, passive liveness (micro-motion + texture), active liveness challenge
 * (blink twice → head turn), and FaceNet embedding extraction.
 *
 * enroll: captures 3 samples (front / left / right) and reports all of them.
 * login: requires both liveness layers, then reports the live embedding.
 */
export function FaceCapturePanel({
  mode,
  onComplete,
  onError,
  disabled = false,
}: FaceCapturePanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<CameraHandle | null>(null);
  const analyzerRef = useRef(new PassiveLivenessAnalyzer());
  const challengeRef = useRef(new ActiveLivenessChallenge());
  const modelsReadyRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);

  const [status, setStatus] = useState<Status>('idle');
  const [prompt, setPrompt] = useState('Preparing camera…');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lowLight, setLowLight] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [challengeState, setChallengeState] = useState<ChallengeState>({ phase: 'idle' });
  const [sampleIndex, setSampleIndex] = useState(0);
  const [passivePassed, setPassivePassed] = useState(false);
  const [blinks, setBlinks] = useState(0);
  const [samples, setSamples] = useState<FaceSample[]>([]);
  const [samplePhotos, setSamplePhotos] = useState<string[]>([]);

  const samplesRef = useRef<FaceSample[]>([]);
  const samplePhotosRef = useRef<string[]>([]);
  const passivePassedRef = useRef(false);
  const lowLightRef = useRef(false);

  const captureRef = useRef<{ video: HTMLVideoElement; width: number; height: number } | null>(null);

  const fail = useCallback(
    (message: string) => {
      setErrorMessage(message);
      setStatus('camera-error');
      onError?.(message);
      reportError('face-capture', new Error(message));
    },
    [onError],
  );

  const processFrame = useCallback(async () => {
    if (!cameraRef.current || !videoRef.current) return;

    const { width, height } = cameraRef.current;
    const video = videoRef.current;

    // Low-light estimation (throttled).
    if (frameCountRef.current % 15 === 0) {
      const lux = estimateAmbientLux(video);
      const isLow = lux < IS_LOW_LIGHT_THRESHOLD_LUX;
      lowLightRef.current = isLow;
      setLowLight(isLow);
      if (isLow && mode === 'login') {
        applyScreenFlash(video, true);
        setFlashOn(true);
      }
    }

    // Passive liveness sampling (every frame, cheap).
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(video, 0, 0, 48, 48);
      const imageData = ctx.getImageData(0, 0, 48, 48);
      analyzerRef.current.addFrame(imageData);
    }

    // Face + landmark detection (throttled to every 4th frame).
    if (frameCountRef.current % 4 === 0) {
      try {
        const faceapi = await ensureModelsLoaded();
        modelsReadyRef.current = true;
        const result = await faceapi
          .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (result) {
          const landmarks = result.landmarks.getPositions().map(({ x, y }) => ({ x, y }));
          const state = challengeRef.current.processLandmarks(landmarks);
          setChallengeState(state);
          setBlinks(challengeRef.current.getProgress().blinks);
          if (state.phase === 'passed') {
            setPrompt('Liveness verified — capturing identity…');
          }
        } else {
          challengeRef.current.processLandmarks(null);
          setChallengeState((prev) => prev.phase === 'running' ? prev : { phase: 'running', step: 'BLINK_TWICE', prompt: 'Please blink twice' });
        }
      } catch (err) {
        // Detection may transiently fail; don't kill the loop.
      }
    }

    frameCountRef.current++;

    // Passive result — start the active challenge once enough frames exist.
    const passive = analyzerRef.current.result();
    if (!passivePassedRef.current && analyzerRef.current.frameCount >= 6) {
      if (passive.passed) {
        passivePassedRef.current = true;
        setPassivePassed(true);
        setPrompt('Great — now follow the liveness prompts');
        if (challengeRef.current.getProgress().elapsedMs === 0) {
          challengeRef.current.start();
          setChallengeState({ phase: 'running', step: 'BLINK_TWICE', prompt: 'Please blink twice' });
        }
      } else if (analyzerRef.current.frameCount >= 18) {
        // Give the user a moment to produce micro-motion.
        setPrompt('Please look directly at the camera and move slightly');
      }
    }

    // Login completion: passive + active passed.
    if (mode === 'login' && passivePassedRef.current && challengeRef.current.getProgress().elapsedMs > 0) {
      const state = challengeRef.current.processLandmarks(null); // returns current state
      if (state.phase === 'passed') {
        await finishLogin();
        return;
      }
    }

    rafRef.current = requestAnimationFrame(processFrame);
  }, [mode]);

  const finishLogin = useCallback(async () => {
    if (!cameraRef.current || !videoRef.current) return;
    setStatus('processing');
    setPrompt('Verifying your identity…');
    const activeState = challengeRef.current.processLandmarks(null);
    const passive = analyzerRef.current.result();

    try {
      const sample = await extractFaceEmbedding(videoRef.current);
      if (!sample) {
        fail(FACE_ERROR_MESSAGES.NO_FACE);
        return;
      }
      onComplete({
        embeddings: [sample.embedding],
        photos: [captureFrame(videoRef.current, cameraRef.current.width, cameraRef.current.height)],
        liveness: {
          passivePassed: passive.passed && passivePassedRef.current,
          activePassed: activeState.phase === 'passed',
          score: passive.score,
        },
      });
      setStatus('complete');
    } catch (err) {
      fail(FACE_ERROR_MESSAGES.LIVENESS_FAILED);
    }
  }, [fail, onComplete]);

  const captureSample = useCallback(async () => {
    if (!cameraRef.current || !videoRef.current || mode !== 'enroll') return;
    setStatus('processing');
    setPrompt(`Analyzing sample ${sampleIndex + 1} of 3…`);

    try {
      const sample = await extractFaceEmbedding(videoRef.current);
      if (!sample) {
        fail(FACE_ERROR_MESSAGES.NO_FACE);
        return;
      }
      // Angle gate: samples should be reasonably frontal (±45°).
      const yaw = estimateYawDegrees(sample.landmarks);
      if (Math.abs(yaw) > 45) {
        fail(FACE_ERROR_MESSAGES.BAD_ANGLE);
        return;
      }

      samplesRef.current.push(sample);
      samplePhotosRef.current.push(
        captureFrame(videoRef.current, cameraRef.current.width, cameraRef.current.height),
      );

      const next = samplesRef.current.length;
      setSamples([...samplesRef.current]);
      setSamplePhotos([...samplePhotosRef.current]);
      setSampleIndex(next);

      if (next >= 3) {
        setPrompt('Enrollment samples captured');
        setStatus('complete');
        onComplete({
          embeddings: samplesRef.current.map((s) => s.embedding),
          photos: samplePhotosRef.current,
          liveness: { passivePassed: true, activePassed: true, score: 1 },
        });
      } else {
        setStatus('capture');
        const labels = ['Front', 'Left 15°', 'Right 15°'];
        setPrompt(`Capture ${labels[next]} — sample ${next + 1}/3`);
      }
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      fail(code === 'multiple-faces' ? FACE_ERROR_MESSAGES.MULTIPLE_FACES : FACE_ERROR_MESSAGES.NO_FACE);
    }
  }, [mode, sampleIndex, fail, onComplete]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setStatus('starting');
      setPrompt('Requesting camera access (720p+)…');
      try {
        const camera = await startCamera();
        if (cancelled) {
          stopCamera(camera.stream);
          return;
        }
        cameraRef.current = camera;

        const quality = checkCameraQuality(camera.width, camera.height);
        if (!quality.resolutionOk) {
          stopCamera(camera.stream);
          cameraRef.current = null;
          setStatus('quality-error');
          setErrorMessage(FACE_ERROR_MESSAGES.LOW_QUALITY);
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = camera.stream;
          await videoRef.current.play().catch(() => {});
          captureRef.current = { video: videoRef.current, width: camera.width, height: camera.height };
        }

        await ensureModelsLoaded().catch(() => {
          throw new Error('Face recognition models failed to load');
        });

        if (cancelled) return;
        analyzerRef.current.reset();
        challengeRef.current.start();
        setStatus(mode === 'enroll' ? 'capture' : 'running');
        setPrompt(
          mode === 'enroll'
            ? 'Capture front — sample 1/3'
            : 'Look at the camera — liveness check starting',
        );
        setChallengeState({ phase: 'running', step: 'BLINK_TWICE', prompt: 'Please blink twice' });
        rafRef.current = requestAnimationFrame(processFrame);
      } catch (err) {
        if (!cancelled) fail('Camera access denied or unavailable. Please check permissions.');
      }
    }

    init();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stopCamera(cameraRef.current?.stream ?? null);
      applyScreenFlash(cameraRef.current ? document.querySelector('video') : null, false);
      cameraRef.current = null;
    };
  }, [mode, processFrame, fail]);

  const isBusy = disabled || status === 'processing' || status === 'starting';

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {errorMessage ? (
        <div className="flex items-center gap-3 w-full p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span className="text-sm">{errorMessage}</span>
        </div>
      ) : (
        <div className="relative w-full rounded-2xl overflow-hidden border-2 border-slate-700 bg-black aspect-video">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-44 h-44 md:w-64 md:h-64 rounded-full border-4 ${passivePassed ? 'border-emerald-400/70' : 'border-blue-400/40'}`} />
          </div>

          {lowLight && mode === 'login' && (
            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs">
              <Sun className="w-4 h-4" />
              {flashOn ? 'Screen flash active' : 'Low light detected'}
            </div>
          )}

          {isBusy && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 text-white">
                <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
                <span className="text-sm">{prompt}</span>
              </div>
            </div>
          )}

          {status === 'running' && !isBusy && (
            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className={`px-2.5 py-1 rounded-lg ${passivePassed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/70'}`}>
                {passivePassed ? 'Liveness verified' : 'Detecting liveness…'}
              </span>
              {challengeState.phase === 'running' && (
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-200">
                  {challengeState.prompt} • blinks: {blinks}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="min-h-6 text-center text-sm text-slate-300">{prompt}</div>

      {mode === 'enroll' && status === 'capture' && !errorMessage && (
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`w-10 h-1.5 rounded-full ${sampleIndex > i ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            ))}
          </div>
          <Button onClick={captureSample} disabled={isBusy} className="w-full max-w-xs">
            <ScanFace className="w-4 h-4 mr-2" />
            Capture sample {sampleIndex + 1} of 3
          </Button>
        </div>
      )}

      {status === 'running' && !errorMessage && mode === 'login' && (
        <Button onClick={() => { challengeRef.current.start(); setChallengeState({ phase: 'running', step: 'BLINK_TWICE', prompt: 'Please blink twice' }); }} disabled={isBusy} variant="outline" className="w-full max-w-xs">
          Restart liveness check
        </Button>
      )}

      {status === 'camera-error' && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <AlertTriangle className="w-4 h-4" />
          Camera unavailable
        </div>
      )}
    </div>
  );
}
