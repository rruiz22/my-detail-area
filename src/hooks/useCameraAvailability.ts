/**
 * useCameraAvailability Hook
 *
 * Detects camera availability and permission status for kiosk/photo features.
 *
 * Returns real-time camera status:
 * - checking: Initial detection in progress
 * - available: Camera detected and accessible
 * - not_found: No camera device detected
 * - denied: Camera permission denied by user
 * - blocked: Camera blocked by browser/system security
 * - in_use: Camera currently in use by another application
 * - error: Unknown error occurred
 *
 * Usage:
 * ```tsx
 * const { status, hasCamera, isReady, error, checkCamera } = useCameraAvailability();
 *
 * if (!isReady) {
 *   return <Alert>Camera not available</Alert>;
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';

export type CameraStatus =
  | 'checking'       // Initial state
  | 'available'      // Camera detected and accessible
  | 'not_found'      // No camera device
  | 'denied'         // Permission denied
  | 'blocked'        // Blocked by browser/system
  | 'in_use'         // Camera in use by another app
  | 'error';         // Unknown error

export interface CameraAvailability {
  status: CameraStatus;
  hasCamera: boolean;
  isReady: boolean;
  error: string | null;
  deviceCount: number;
  checkCamera: () => Promise<void>;
}

export function useCameraAvailability(autoCheck = false): CameraAvailability {
  const [status, setStatus] = useState<CameraStatus>('checking');
  const [error, setError] = useState<string | null>(null);
  const [deviceCount, setDeviceCount] = useState(0);

  const checkCamera = useCallback(async () => {
    console.log('[CameraCheck] Starting camera detection...');
    setStatus('checking');
    setError(null);

    try {
      // Step 1: Check if MediaDevices API exists
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('[CameraCheck] MediaDevices API not supported');
        setStatus('not_found');
        setError('MediaDevices API not supported in this browser');
        return;
      }

      // Step 2: Enumerate devices to count cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setDeviceCount(videoDevices.length);

      console.log('[CameraCheck] Video devices found:', videoDevices.length);

      if (videoDevices.length === 0) {
        console.warn('[CameraCheck] No camera devices detected');
        setStatus('not_found');
        setError('No camera devices found on this system');
        return;
      }

      // Step 3: Check permission without activating camera (non-invasive)
      console.log('[CameraCheck] Checking camera permission (non-invasive)...');

      try {
        // Use Permissions API to check without activating camera hardware
        const permissionStatus = await navigator.permissions.query({
          name: 'camera' as PermissionName
        });

        console.log('[CameraCheck] Permission status:', permissionStatus.state);

        if (permissionStatus.state === 'granted') {
          // Camera available and permitted
          setStatus('available');
          setError(null);
          console.log('[CameraCheck] ✅ Camera permission granted (no activation)');
        } else if (permissionStatus.state === 'denied') {
          setStatus('denied');
          setError('Camera permission denied by user');
          console.warn('[CameraCheck] Camera permission denied');
        } else {
          // 'prompt' - Permission not yet requested
          // Assume available, will prompt on first actual use
          setStatus('available');
          setError(null);
          console.log('[CameraCheck] ✅ Camera available (permission will be requested on use)');
        }
      } catch (permError) {
        // Fallback: Permissions API not supported in this browser
        console.warn('[CameraCheck] Permissions API not available, assuming camera accessible');
        setStatus('available');
        setError(null);
      }

    } catch (err: any) {
      console.error('[CameraCheck] ❌ Camera detection failed:', err);

      // Parse MediaDevices error types
      if (err.name === 'NotAllowedError') {
        console.warn('[CameraCheck] Permission denied by user');
        setStatus('denied');
        setError('Camera permission denied by user');
      } else if (err.name === 'NotFoundError') {
        console.warn('[CameraCheck] No camera device found');
        setStatus('not_found');
        setError('No camera device found');
      } else if (err.name === 'NotReadableError') {
        console.warn('[CameraCheck] Camera in use by another application');
        setStatus('in_use');
        setError('Camera is currently in use by another application');
      } else if (err.name === 'SecurityError') {
        console.error('[CameraCheck] Camera blocked by security policy');
        setStatus('blocked');
        setError('Camera access blocked by browser security policy');
      } else {
        console.error('[CameraCheck] Unknown error:', err.message);
        setStatus('error');
        setError(err.message || 'Unknown camera error');
      }
    }
  }, []);

  // Conditionally auto-check camera on mount (only if autoCheck=true)
  useEffect(() => {
    if (autoCheck) {
      checkCamera();
    }
  }, [checkCamera, autoCheck]);

  return {
    status,
    hasCamera: status === 'available',
    isReady: status === 'available',
    error,
    deviceCount,
    checkCamera
  };
}
