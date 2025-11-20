/**
 * useFaceRecognition Hook
 *
 * Provides facial recognition capabilities for employee identification
 * in the PunchClockKiosk using face-api.js
 *
 * Features:
 * - Face enrollment (capture and store face descriptor)
 * - Face verification (1:1 matching)
 * - Face identification (1:N matching against enrolled employees)
 * - Offline-first (all processing client-side)
 *
 * @example
 * const { isLoaded, enrollFace, verifyFace, findBestMatch } = useFaceRecognition();
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { initializeFaceApi, isFaceApiReady } from '@/services/faceApiService';

interface UseFaceRecognitionOptions {
  modelUrl?: string;
  minConfidence?: number;
}

interface EnrollResult {
  success: boolean;
  descriptor?: Float32Array;
  error?: string;
}

interface VerifyResult {
  success: boolean;
  distance?: number;
  confidence?: number;
  error?: string;
}

interface BestMatch {
  employeeName: string;
  employeeId: string;
  distance: number;
  confidence: number;
}

export function useFaceRecognition(options: UseFaceRecognitionOptions = {}) {
  const {
    modelUrl = '/models',
    minConfidence = 0.6
  } = options;

  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const faceMatcher = useRef<faceapi.FaceMatcher | null>(null);

  // Load face-api.js models on mount using singleton service
  useEffect(() => {
    let mounted = true;

    const loadModels = async () => {
      try {
        // Check if already initialized by singleton
        if (isFaceApiReady()) {
          console.log('[FaceAPI Hook] Using already initialized face-api.js');
          if (mounted) {
            setIsLoaded(true);
            setIsLoading(false);
            setLoadingProgress(100);
          }
          return;
        }

        setIsLoading(true);
        setError(null);
        setLoadingProgress(0);

        console.log('[FaceAPI Hook] Initializing face-api.js via singleton service...');

        // Use singleton service to initialize (prevents multiple instances)
        await initializeFaceApi(modelUrl);

        // Simulate progress for UX (models load too fast to show real progress)
        if (mounted) setLoadingProgress(33);
        await new Promise(resolve => setTimeout(resolve, 100));
        if (mounted) setLoadingProgress(66);
        await new Promise(resolve => setTimeout(resolve, 100));
        if (mounted) setLoadingProgress(100);

        if (mounted) {
          setIsLoaded(true);
          setIsLoading(false);
          console.log('[FaceAPI Hook] Face-api.js ready');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);

        // Suppress TensorFlow tensor shape errors (model incompatibility)
        if (errorMessage.includes('tensor should have') || errorMessage.includes('values but has')) {
          console.warn('[FaceAPI Hook] ⚠️ Face recognition models incompatible - feature disabled');
          // Don't set error - just disable the feature silently
          if (mounted) {
            setIsLoaded(false);
            setIsLoading(false);
            // Don't set error to avoid showing Alert
          }
        } else {
          console.error('[FaceAPI Hook] Model loading error:', err);
          if (mounted) {
            setError(err instanceof Error ? err.message : 'Failed to load face recognition models');
            setIsLoading(false);
          }
        }
      }
    };

    loadModels();

    return () => {
      mounted = false;
    };
  }, [modelUrl]);

  /**
   * Enroll a new employee face
   * Captures 128D face descriptor from image/video element
   *
   * @param imageElement - HTMLImageElement or HTMLVideoElement with face
   * @param employeeId - Employee UUID
   * @param employeeName - Employee full name
   * @returns EnrollResult with descriptor on success
   */
  const enrollFace = useCallback(async (
    imageElement: HTMLImageElement | HTMLVideoElement,
    employeeId: string,
    employeeName: string
  ): Promise<EnrollResult> => {
    if (!isLoaded) {
      return { success: false, error: 'Face recognition models not loaded' };
    }

    try {
      console.log(`[FaceAPI] Enrolling face for ${employeeName} (${employeeId})`);

      // Detect single face with landmarks and descriptor
      const detection = await faceapi
        .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 416 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        console.warn('[FaceAPI] No face detected in enrollment image');
        return {
          success: false,
          error: 'No face detected. Please ensure face is clearly visible and well-lit.'
        };
      }

      console.log('[FaceAPI] ✓ Face detected, descriptor extracted');
      const descriptor = detection.descriptor;

      return {
        success: true,
        descriptor: descriptor
      };
    } catch (err) {
      console.error('[FaceAPI] Enrollment error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Face enrollment failed'
      };
    }
  }, [isLoaded]);

  /**
   * Verify if captured face matches enrolled employee (1:1 matching)
   *
   * @param imageElement - HTMLImageElement or HTMLVideoElement with face
   * @param enrolledDescriptor - Previously stored face descriptor (Float32Array)
   * @returns VerifyResult with distance and confidence
   */
  const verifyFace = useCallback(async (
    imageElement: HTMLImageElement | HTMLVideoElement,
    enrolledDescriptor: Float32Array
  ): Promise<VerifyResult> => {
    if (!isLoaded) {
      return { success: false, error: 'Face recognition models not loaded' };
    }

    try {
      console.log('[FaceAPI] Verifying face...');

      const detection = await faceapi
        .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 416 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        console.warn('[FaceAPI] No face detected in verification image');
        return {
          success: false,
          error: 'No face detected. Please position your face clearly in frame.'
        };
      }

      // Calculate euclidean distance between descriptors
      // Lower distance = better match (typically < 0.6 is same person)
      const distance = faceapi.euclideanDistance(
        detection.descriptor,
        enrolledDescriptor
      );

      const confidence = Math.max(0, Math.min(100, (1 - distance) * 100));
      const isMatch = distance < minConfidence;

      console.log(`[FaceAPI] Distance: ${distance.toFixed(3)}, Confidence: ${confidence.toFixed(1)}%, Match: ${isMatch}`);

      return {
        success: isMatch,
        distance: distance,
        confidence: confidence
      };
    } catch (err) {
      console.error('[FaceAPI] Verification error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Face verification failed'
      };
    }
  }, [isLoaded, minConfidence]);

  /**
   * Initialize FaceMatcher with multiple enrolled employees (1:N matching)
   * Call this before using findBestMatch()
   *
   * @param enrolledEmployees - Array of employees with face descriptors
   * @returns true if successfully initialized
   */
  const initializeMatcher = useCallback(async (
    enrolledEmployees: Array<{
      id: string;
      name: string;
      descriptor: Float32Array | number[];
    }>
  ): Promise<boolean> => {
    try {
      console.log(`[FaceAPI] Initializing matcher with ${enrolledEmployees.length} employees`);

      // Validate and filter descriptors
      const validDescriptors: faceapi.LabeledFaceDescriptors[] = [];
      const invalidCount = 0;

      for (const employee of enrolledEmployees) {
        try {
          // Convert number[] to Float32Array if needed
          const descriptor = Array.isArray(employee.descriptor)
            ? new Float32Array(employee.descriptor)
            : employee.descriptor;

          // Validate descriptor length (should be 128 for face-api.js)
          if (descriptor.length !== 128) {
            console.warn(`[FaceAPI] ⚠️ Invalid descriptor for ${employee.name} - length ${descriptor.length}, expected 128`);
            continue;
          }

          // Label format: "employeeId|employeeName"
          const label = `${employee.id}|${employee.name}`;

          validDescriptors.push(new faceapi.LabeledFaceDescriptors(
            label,
            [descriptor]
          ));
        } catch (descError) {
          console.warn(`[FaceAPI] ⚠️ Failed to process descriptor for ${employee.name}:`, descError);
        }
      }

      if (validDescriptors.length === 0) {
        console.error('[FaceAPI] ❌ No valid face descriptors found');
        return false;
      }

      console.log(`[FaceAPI] ✓ ${validDescriptors.length} valid descriptors (${invalidCount} invalid skipped)`);

      faceMatcher.current = new faceapi.FaceMatcher(
        validDescriptors,
        minConfidence
      );

      console.log('[FaceAPI] ✓ Face matcher initialized');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Gracefully handle TensorFlow tensor shape errors
      if (errorMessage.includes('tensor should have') || errorMessage.includes('values but has')) {
        console.error('[FaceAPI] ❌ TensorFlow tensor error - face descriptors may be incompatible with current model version');
        console.error('[FaceAPI] Suggested fix: Re-enroll all employees to regenerate face descriptors');
        return false;
      }

      console.error('[FaceAPI] Failed to initialize face matcher:', err);
      return false;
    }
  }, [minConfidence]);

  /**
   * Find best matching employee from enrolled set (1:N identification)
   * Must call initializeMatcher() first
   *
   * @param imageElement - HTMLImageElement or HTMLVideoElement with face
   * @returns BestMatch with employee info or null if no match
   */
  const findBestMatch = useCallback(async (
    imageElement: HTMLImageElement | HTMLVideoElement
  ): Promise<BestMatch | null> => {
    if (!isLoaded) {
      console.warn('[FaceAPI] Models not loaded');
      return null;
    }

    if (!faceMatcher.current) {
      console.warn('[FaceAPI] Face matcher not initialized. Call initializeMatcher() first.');
      return null;
    }

    try {
      console.log('[FaceAPI] Finding best match...');

      const detection = await faceapi
        .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 416 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        console.warn('[FaceAPI] No face detected');
        return null;
      }

      const bestMatch = faceMatcher.current.findBestMatch(detection.descriptor);

      // 'unknown' means no match found (distance > minConfidence)
      if (bestMatch.label === 'unknown') {
        console.log('[FaceAPI] No matching employee found (all distances > threshold)');
        return null;
      }

      // Parse label back to get employeeId and name
      const [employeeId, employeeName] = bestMatch.label.split('|');
      const confidence = Math.max(0, Math.min(100, (1 - bestMatch.distance) * 100));

      console.log(`[FaceAPI] ✓ Match found: ${employeeName}, Distance: ${bestMatch.distance.toFixed(3)}, Confidence: ${confidence.toFixed(1)}%`);

      return {
        employeeName: employeeName,
        employeeId: employeeId,
        distance: bestMatch.distance,
        confidence: confidence
      };
    } catch (err) {
      console.error('[FaceAPI] Face matching error:', err);
      return null;
    }
  }, [isLoaded]);

  /**
   * Get detection options for best accuracy
   * Can be used to customize face-api.js detection parameters
   */
  const getDetectionOptions = useCallback(() => {
    return new faceapi.TinyFaceDetectorOptions({
      inputSize: 416, // 160, 224, 320, 416, 512, 608 (higher = more accurate but slower)
      scoreThreshold: 0.5 // Minimum confidence score for face detection
    });
  }, []);

  return {
    // State
    isLoaded,
    isLoading,
    loadingProgress,
    error,

    // Methods
    enrollFace,
    verifyFace,
    initializeMatcher,
    findBestMatch,
    getDetectionOptions
  };
}
