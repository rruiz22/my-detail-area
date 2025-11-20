/**
 * Face Detection Utilities
 *
 * Provides face detection and quality validation using @vladmandic/face-api
 * Used by Detail Hub for facial recognition time clock system
 *
 * Features:
 * - Face detection with TinyFaceDetector (fast, lightweight)
 * - Face quality validation (size, angle, lighting)
 * - Frame capture with metadata
 * - Model loading and caching
 */

import * as faceapi from '@vladmandic/face-api';

// =====================================================
// CONFIGURATION
// =====================================================

// Model URLs (served from public/models/)
const MODEL_URL = '/models';

// Quality thresholds
export const QUALITY_THRESHOLDS = {
  MIN_FACE_SIZE: 100, // Minimum face size in pixels
  MAX_FACE_ANGLE: 15, // Maximum head rotation in degrees
  MIN_CONFIDENCE: 0.7, // Minimum detection confidence (0-1)
  MIN_BRIGHTNESS: 40, // Minimum average brightness (0-255)
  MAX_BRIGHTNESS: 220, // Maximum average brightness (0-255)
} as const;

// =====================================================
// TYPES
// =====================================================

export interface FaceDetectionResult {
  detected: boolean;
  confidence: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  landmarks: faceapi.FaceLandmarks68 | null;
  qualityCheck: FaceQualityCheck;
}

export interface FaceQualityCheck {
  passed: boolean;
  issues: string[];
  faceSize: number | null;
  faceAngle: number | null;
  brightness: number | null;
  multipleFaces: boolean;
}

export interface CapturedFrame {
  imageData: string; // base64 encoded JPEG
  width: number;
  height: number;
  timestamp: number;
  detectionResult: FaceDetectionResult;
}

// =====================================================
// MODEL LOADING
// =====================================================

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

/**
 * Load face-api.js models from public/models/
 * Only loads TinyFaceDetector and FaceLandmark68Net for performance
 *
 * Models are cached in memory after first load
 */
export async function loadFaceDetectionModels(): Promise<void> {
  // If already loaded, return immediately
  if (modelsLoaded) {
    return;
  }

  // If currently loading, wait for that promise
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading
  loadingPromise = (async () => {
    try {
      console.log('🔄 Loading face-api.js models...');

      // Load TinyFaceDetector (fast, lightweight - 190KB)
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

      // Load FaceLandmark68Net for face angle calculation (350KB)
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

      modelsLoaded = true;
      console.log('✅ Face-api.js models loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load face-api.js models:', error);
      loadingPromise = null; // Allow retry
      throw new Error('Failed to load face detection models. Please check if models are available in public/models/');
    }
  })();

  return loadingPromise;
}

/**
 * Check if models are loaded
 */
export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

// =====================================================
// FACE DETECTION
// =====================================================

/**
 * Detect faces in a video element or image
 * Returns detection result with confidence and landmarks
 */
export async function detectFace(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<FaceDetectionResult> {
  if (!modelsLoaded) {
    throw new Error('Face detection models not loaded. Call loadFaceDetectionModels() first.');
  }

  try {
    // Use TinyFaceDetector for speed
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416, // Higher = more accurate but slower (options: 128, 160, 224, 320, 416, 512, 608)
      scoreThreshold: QUALITY_THRESHOLDS.MIN_CONFIDENCE,
    });

    // Detect single face with landmarks
    const detection = await faceapi
      .detectSingleFace(input, options)
      .withFaceLandmarks();

    // No face detected
    if (!detection) {
      return {
        detected: false,
        confidence: 0,
        box: null,
        landmarks: null,
        qualityCheck: {
          passed: false,
          issues: ['No face detected'],
          faceSize: null,
          faceAngle: null,
          brightness: null,
          multipleFaces: false,
        },
      };
    }

    // Extract detection data
    const box = detection.detection.box;
    const landmarks = detection.landmarks;
    const confidence = detection.detection.score;

    // Perform quality checks
    const qualityCheck = await validateFaceQuality(input, detection);

    return {
      detected: true,
      confidence,
      box: {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      },
      landmarks,
      qualityCheck,
    };
  } catch (error) {
    console.error('Error detecting face:', error);
    throw error;
  }
}

/**
 * Detect multiple faces (for quality check - should only be 1)
 */
async function detectMultipleFaces(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<number> {
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 224, // Smaller for speed since just counting
    scoreThreshold: QUALITY_THRESHOLDS.MIN_CONFIDENCE,
  });

  const detections = await faceapi.detectAllFaces(input, options);
  return detections.length;
}

// =====================================================
// QUALITY VALIDATION
// =====================================================

/**
 * Validate face quality for recognition
 * Checks: size, angle, lighting, multiple faces
 */
async function validateFaceQuality(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  detection: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>
): Promise<FaceQualityCheck> {
  const issues: string[] = [];
  const box = detection.detection.box;
  const landmarks = detection.landmarks;

  // 1. Check face size
  const faceSize = Math.min(box.width, box.height);
  if (faceSize < QUALITY_THRESHOLDS.MIN_FACE_SIZE) {
    issues.push(`Face too small (${faceSize}px). Move closer to camera.`);
  }

  // 2. Check face angle (using landmarks)
  const faceAngle = calculateFaceAngle(landmarks);
  if (Math.abs(faceAngle) > QUALITY_THRESHOLDS.MAX_FACE_ANGLE) {
    issues.push(`Face angle too steep (${faceAngle.toFixed(1)}°). Face camera directly.`);
  }

  // 3. Check brightness in face region
  const brightness = await calculateBrightness(input, box);
  if (brightness < QUALITY_THRESHOLDS.MIN_BRIGHTNESS) {
    issues.push(`Too dark (${brightness}/255). Improve lighting.`);
  } else if (brightness > QUALITY_THRESHOLDS.MAX_BRIGHTNESS) {
    issues.push(`Too bright (${brightness}/255). Reduce lighting.`);
  }

  // 4. Check for multiple faces
  const faceCount = await detectMultipleFaces(input);
  const multipleFaces = faceCount > 1;
  if (multipleFaces) {
    issues.push(`Multiple faces detected (${faceCount}). Only one person should be visible.`);
  }

  return {
    passed: issues.length === 0,
    issues,
    faceSize,
    faceAngle,
    brightness,
    multipleFaces,
  };
}

/**
 * Calculate face angle (yaw rotation) using landmarks
 * Returns angle in degrees (-90 to +90)
 */
function calculateFaceAngle(landmarks: faceapi.FaceLandmarks68): number {
  // Use nose and eye landmarks to calculate head rotation
  const nose = landmarks.getNose()[3]; // Nose tip
  const leftEye = landmarks.getLeftEye()[0]; // Left eye outer corner
  const rightEye = landmarks.getRightEye()[3]; // Right eye outer corner

  // Calculate eye center
  const eyeCenterX = (leftEye.x + rightEye.x) / 2;

  // Calculate horizontal offset of nose from eye center
  const horizontalOffset = nose.x - eyeCenterX;
  const faceWidth = Math.abs(leftEye.x - rightEye.x);

  // Convert to angle (rough approximation)
  const angle = (horizontalOffset / faceWidth) * 45; // Max ±45° for full face turn

  return angle;
}

/**
 * Calculate average brightness in face region
 * Returns value 0-255
 */
async function calculateBrightness(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  box: faceapi.Box
): Promise<number> {
  // Create temporary canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 128; // Default mid-brightness if canvas fails

  // Set canvas size to face box
  canvas.width = box.width;
  canvas.height = box.height;

  // Draw face region
  ctx.drawImage(
    input,
    box.x,
    box.y,
    box.width,
    box.height,
    0,
    0,
    box.width,
    box.height
  );

  // Get pixel data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Calculate average brightness (convert RGB to grayscale using luminosity formula)
  let totalBrightness = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Luminosity formula (weighted average)
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    totalBrightness += brightness;
  }

  return totalBrightness / pixelCount;
}

// =====================================================
// FRAME CAPTURE
// =====================================================

/**
 * Capture frame from video element with face detection
 * Returns base64 encoded JPEG with metadata
 */
export async function captureFrameWithFaceDetection(
  videoElement: HTMLVideoElement,
  quality: number = 0.85
): Promise<CapturedFrame> {
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw video frame to canvas
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  // Detect face in captured frame
  const detectionResult = await detectFace(canvas);

  // Convert to base64 JPEG
  const imageData = canvas.toDataURL('image/jpeg', quality);

  return {
    imageData,
    width: canvas.width,
    height: canvas.height,
    timestamp: Date.now(),
    detectionResult,
  };
}

/**
 * Capture multiple frames with delay between captures
 * Returns only frames that pass quality checks
 */
export async function captureMultipleFrames(
  videoElement: HTMLVideoElement,
  count: number = 5,
  delayMs: number = 500,
  quality: number = 0.85
): Promise<CapturedFrame[]> {
  const frames: CapturedFrame[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const frame = await captureFrameWithFaceDetection(videoElement, quality);

      // Only keep frames with detected faces that pass quality checks
      if (frame.detectionResult.detected && frame.detectionResult.qualityCheck.passed) {
        frames.push(frame);
      }

      // Delay before next capture (except after last one)
      if (i < count - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.warn(`Failed to capture frame ${i + 1}/${count}:`, error);
    }
  }

  return frames;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Draw face detection box and landmarks on canvas (for preview/debugging)
 */
export function drawFaceDetection(
  canvas: HTMLCanvasElement,
  detection: FaceDetectionResult
): void {
  if (!detection.detected || !detection.box) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { x, y, width, height } = detection.box;

  // Draw bounding box
  const color = detection.qualityCheck.passed ? '#10b981' : '#ef4444'; // green or red
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, height);

  // Draw landmarks if available
  if (detection.landmarks) {
    ctx.fillStyle = color;
    const points = detection.landmarks.positions;
    points.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  // Draw confidence score
  ctx.fillStyle = color;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(
    `${(detection.confidence * 100).toFixed(0)}%`,
    x,
    y - 10
  );
}

/**
 * Get quality feedback message for user
 */
export function getQualityFeedbackMessage(qualityCheck: FaceQualityCheck): string {
  if (qualityCheck.passed) {
    return '✓ Face quality good';
  }

  if (qualityCheck.issues.length > 0) {
    return qualityCheck.issues[0]; // Show first issue
  }

  return 'Face quality check failed';
}

/**
 * Calculate overall quality score (0-100)
 */
export function calculateQualityScore(qualityCheck: FaceQualityCheck): number {
  if (!qualityCheck.passed) {
    // Deduct points for each issue
    const baseScore = 100;
    const deduction = qualityCheck.issues.length * 20;
    return Math.max(0, baseScore - deduction);
  }

  return 100;
}
