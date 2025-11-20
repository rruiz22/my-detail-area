/**
 * Face API Service - Singleton Pattern
 *
 * Ensures face-api.js is initialized only once across the entire application
 * to avoid TensorFlow.js backend conflicts and multiple instance issues.
 *
 * This service manages:
 * - Model loading (one-time initialization)
 * - Backend configuration (FORCED CPU backend to avoid WebGL errors)
 * - Global state tracking
 * - Proper cleanup and error handling
 *
 * CRITICAL FIX: We import TensorFlow BEFORE face-api.js and force CPU backend
 * to prevent "Cannot read properties of undefined (reading 'backend')" errors.
 */

import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl'; // Import but won't use
import * as faceapi from '@vladmandic/face-api';

// Singleton state
let isInitialized = false;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;
let initializationError: Error | null = null;
let backendInitialized = false;

// Backend configuration
const FORCED_BACKEND = 'cpu'; // Enterprise-grade: CPU-only for stability
const MAX_BACKEND_RETRIES = 3;
const BACKEND_RETRY_DELAY = 500; // ms

/**
 * CRITICAL: Force TensorFlow.js to use CPU backend
 * This MUST be called BEFORE any face-api.js operations
 */
async function ensureCpuBackend(): Promise<void> {
  if (backendInitialized) {
    console.log('[FaceAPI Service] Backend already configured:', tf.getBackend());
    return;
  }

  console.log('[FaceAPI Service] Configuring TensorFlow.js backend...');

  let retries = 0;
  while (retries < MAX_BACKEND_RETRIES) {
    try {
      // Get current backend (might be undefined or 'webgl')
      const currentBackend = tf.getBackend();
      console.log(`[FaceAPI Service] Current backend: ${currentBackend || 'none'}`);

      // Force CPU backend registration
      if (currentBackend !== FORCED_BACKEND) {
        console.log(`[FaceAPI Service] Switching to ${FORCED_BACKEND} backend...`);
        await tf.setBackend(FORCED_BACKEND);
      }

      // Wait for backend to be ready
      await tf.ready();

      // Verify the backend is actually CPU
      const finalBackend = tf.getBackend();
      console.log(`[FaceAPI Service] Final backend: ${finalBackend}`);

      if (finalBackend !== FORCED_BACKEND) {
        throw new Error(`Backend mismatch: expected '${FORCED_BACKEND}', got '${finalBackend}'`);
      }

      // Get backend details for logging
      const engine = tf.engine();
      console.log('[FaceAPI Service] TensorFlow.js engine state:', {
        backend: finalBackend,
        memoryInfo: engine.memory(),
        registeredBackends: tf.engine().registryFactory ? 'available' : 'none'
      });

      backendInitialized = true;
      console.log('[FaceAPI Service] ✓ CPU backend successfully configured');
      return;

    } catch (error) {
      retries++;
      console.error(`[FaceAPI Service] Backend setup failed (attempt ${retries}/${MAX_BACKEND_RETRIES}):`, error);

      if (retries < MAX_BACKEND_RETRIES) {
        console.log(`[FaceAPI Service] Retrying in ${BACKEND_RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, BACKEND_RETRY_DELAY));
      } else {
        throw new Error(`Failed to configure CPU backend after ${MAX_BACKEND_RETRIES} attempts: ${error}`);
      }
    }
  }
}

/**
 * Initialize face-api.js models (singleton)
 * Only loads models once, subsequent calls return cached promise
 *
 * @param modelUrl - Path to face-api.js models (default: /models)
 * @returns Promise that resolves when models are loaded
 */
export async function initializeFaceApi(modelUrl: string = '/models'): Promise<void> {
  // Already initialized - return immediately
  if (isInitialized) {
    console.log('[FaceAPI Service] Already initialized');
    return Promise.resolve();
  }

  // Currently initializing - return existing promise
  if (isInitializing && initializationPromise) {
    console.log('[FaceAPI Service] Initialization in progress, waiting...');
    return initializationPromise;
  }

  // Had error before - throw cached error
  if (initializationError) {
    console.error('[FaceAPI Service] Previous initialization failed:', initializationError);
    throw initializationError;
  }

  // Start new initialization
  isInitializing = true;
  console.log('[FaceAPI Service] Starting initialization (FORCED CPU-only mode)...');

  initializationPromise = (async () => {
    try {
      // CRITICAL: Configure CPU backend FIRST, before loading any models
      await ensureCpuBackend();

      // Load models sequentially
      console.log('[FaceAPI Service] Loading models from:', modelUrl);

      // 1. Tiny Face Detector (lightweight, fast)
      await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
      console.log('[FaceAPI Service] ✓ Tiny face detector loaded');

      // 2. Face Landmarks (68-point alignment)
      await faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl);
      console.log('[FaceAPI Service] ✓ Face landmark detector loaded');

      // 3. Face Recognition (128D descriptors)
      await faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl);
      console.log('[FaceAPI Service] ✓ Face recognition model loaded');

      // Final backend verification
      const finalBackend = tf.getBackend();
      console.log('[FaceAPI Service] Models loaded successfully using backend:', finalBackend);

      if (finalBackend !== FORCED_BACKEND) {
        console.warn(`[FaceAPI Service] WARNING: Backend changed to ${finalBackend} during model loading`);
      }

      // Mark as initialized
      isInitialized = true;
      isInitializing = false;
      console.log('[FaceAPI Service] ✓ All models loaded successfully');
    } catch (error) {
      isInitializing = false;
      initializationError = error instanceof Error ? error : new Error('Face API initialization failed');
      console.error('[FaceAPI Service] Initialization error:', error);
      throw initializationError;
    }
  })();

  return initializationPromise;
}

/**
 * Check if face-api.js is ready to use
 */
export function isFaceApiReady(): boolean {
  return isInitialized;
}

/**
 * Get initialization status with detailed diagnostics
 */
export function getFaceApiStatus() {
  const currentBackend = backendInitialized ? tf.getBackend() : 'not initialized';
  const memoryInfo = backendInitialized ? tf.engine().memory() : null;

  return {
    isInitialized,
    isInitializing,
    hasError: !!initializationError,
    error: initializationError,
    // Backend diagnostics
    backend: {
      initialized: backendInitialized,
      current: currentBackend,
      expected: FORCED_BACKEND,
      isCorrect: currentBackend === FORCED_BACKEND,
      memoryInfo
    }
  };
}

/**
 * Get TensorFlow.js backend information (diagnostic utility)
 */
export function getTensorFlowBackendInfo() {
  try {
    return {
      currentBackend: tf.getBackend(),
      isReady: tf.engine() !== null,
      memory: tf.memory(),
      environment: tf.env().getFlags()
    };
  } catch (error) {
    console.error('[FaceAPI Service] Error getting TensorFlow backend info:', error);
    return null;
  }
}

/**
 * Reset initialization state (for testing or error recovery)
 * WARNING: Only use if you need to reinitialize after catastrophic failure
 */
export function resetFaceApi() {
  console.warn('[FaceAPI Service] Resetting initialization state');
  isInitialized = false;
  isInitializing = false;
  initializationPromise = null;
  initializationError = null;
  backendInitialized = false;

  // Optionally clear TensorFlow.js backend (commented out for safety)
  // This could cause issues if other parts of the app use TensorFlow
  // tf.removeBackend('cpu');
  // tf.removeBackend('webgl');

  console.log('[FaceAPI Service] Reset complete. Call initializeFaceApi() to reinitialize.');
}
