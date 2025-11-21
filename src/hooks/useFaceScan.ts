/**
 * useFaceScan - Custom Hook for Face Recognition Scanning
 *
 * Extracts the complex face scanning logic from PunchClockKioskModal
 * into a reusable, testable hook with feature flag support.
 *
 * Features:
 * - Automatic camera initialization and cleanup
 * - Face detection with continuous scanning (2-second intervals)
 * - 15-second auto-timeout with countdown
 * - Real-time status messages
 * - Graceful error handling with TensorFlow error suppression
 * - Face descriptor validation (length 128)
 * - Employee face matcher initialization
 *
 * @example
 * ```tsx
 * const { scanning, message, secondsLeft, startScan, stopScan } = useFaceScan({
 *   videoRef,
 *   dealershipId,
 *   onSuccess: (employeeId, employeeName) => {
 *     console.log('Employee matched:', employeeName);
 *   },
 *   onError: (message) => {
 *     toast.error(message);
 *   },
 *   onStatusChange: (message, secondsLeft) => {
 *     console.log('Status:', message, secondsLeft);
 *   }
 * });
 * ```
 */

import { useState, useCallback, useRef, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { handleUnknownError } from '@/utils/errorHandling';
import { supabase } from '@/integrations/supabase/client';

/**
 * Face scan callback options
 */
export interface FaceScanOptions {
  /** Ref to video element for camera feed */
  videoRef: RefObject<HTMLVideoElement>;

  /** Current dealership ID for filtering enrolled employees */
  dealershipId: string | number;

  /**
   * Face matcher initialization callback
   * Should initialize the FaceMatcher with enrolled employees
   */
  initializeMatcher: (
    employees: Array<{
      id: string;
      name: string;
      descriptor: number[];
    }>
  ) => Promise<boolean>;

  /**
   * Face matching callback
   * Should find best match from video element
   */
  findBestMatch: (
    videoElement: HTMLVideoElement
  ) => Promise<{ employeeId: string; employeeName: string; distance: number; confidence: number } | null>;

  /**
   * Camera cleanup callback
   * Should stop all tracks and clear srcObject
   */
  cleanupCamera: (context: string) => void;

  /**
   * Success callback - called when employee face is recognized
   * @param employeeId - Matched employee UUID
   * @param employeeName - Matched employee full name
   */
  onSuccess: (employeeId: string, employeeName: string) => void;

  /**
   * Error callback - called on critical errors (camera denied, no enrolled employees)
   * @param message - Localized error message
   */
  onError: (message: string) => void;

  /**
   * Status change callback - called on status updates (messages + countdown)
   * @param message - Localized status message
   * @param secondsLeft - Countdown seconds remaining (0-15)
   */
  onStatusChange: (message: string, secondsLeft: number) => void;

  /**
   * Toast notification callback
   * @param title - Toast title
   * @param description - Toast description
   * @param variant - Toast variant ('default' | 'destructive' | 'success')
   * @param className - Optional className for custom styling
   */
  showToast: (
    title: string,
    description: string,
    variant?: 'default' | 'destructive',
    className?: string
  ) => void;

  /**
   * Optional: Auto-stop timeout in milliseconds
   * @default 15000 (15 seconds)
   */
  timeout?: number;

  /**
   * Optional: Scan interval in milliseconds (continuous face detection)
   * @default 2000 (2 seconds)
   */
  scanInterval?: number;
}

/**
 * Face scan return values
 */
export interface FaceScanResult {
  /** Whether face scanning is currently active */
  scanning: boolean;

  /** Current status message (localized) */
  message: string;

  /** Countdown seconds remaining (0-15) */
  secondsLeft: number;

  /** Start face scan - initializes camera and begins scanning */
  startScan: () => Promise<void>;

  /** Stop face scan - cleanup camera and reset state */
  stopScan: () => void;
}

/**
 * Custom hook for face recognition scanning
 */
export function useFaceScan(options: FaceScanOptions): FaceScanResult {
  const { t } = useTranslation();

  const {
    videoRef,
    dealershipId,
    initializeMatcher,
    findBestMatch,
    cleanupCamera,
    onSuccess,
    onError,
    onStatusChange,
    showToast,
    timeout = 15000, // 15 seconds default
    scanInterval = 2000, // 2 seconds default
  } = options;

  // State
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(15);

  // Refs for cleanup
  const scanIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  /**
   * Update status and notify parent via callback
   */
  const updateStatus = useCallback(
    (statusMessage: string, seconds: number) => {
      setMessage(statusMessage);
      setSecondsLeft(seconds);
      onStatusChange(statusMessage, seconds);
    },
    [onStatusChange]
  );

  /**
   * Stop face scan and cleanup resources
   */
  const stopScan = useCallback(() => {
    console.log('[useFaceScan] 🛑 Stopping face scan');

    // Clear all intervals and timeouts
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Stop camera
    cleanupCamera('stop-face-scan');

    // Reset state
    setScanning(false);
    setMessage('');
    setSecondsLeft(15);
  }, [cleanupCamera]);

  /**
   * Start face scan - main logic
   */
  const startScan = useCallback(async () => {
    console.log('[useFaceScan] 🚀 Starting face scan');

    setScanning(true);
    setSecondsLeft(15);
    updateStatus(t('detail_hub.punch_clock.messages.preparing_camera'), 15);

    try {
      // Step 1: Load enrolled employees with face descriptors
      console.log('[useFaceScan] Loading enrolled employees...');
      const { data: enrolledEmployees, error: loadError } = await supabase
        .from('detail_hub_employees')
        .select('id, first_name, last_name, face_descriptor')
        .eq('dealership_id', dealershipId)
        .eq('status', 'active')
        .not('face_descriptor', 'is', null);

      if (loadError) {
        console.error('[useFaceScan] Error loading enrolled employees:', loadError);
        const errorMessage = t('detail_hub.punch_clock.messages.face_scan_error');
        onError(errorMessage);
        showToast(
          t('detail_hub.punch_clock.messages.face_scan_error'),
          'Failed to load enrolled employees',
          'destructive'
        );
        setScanning(false);
        return;
      }

      // Step 2: Validate enrolled employees exist
      if (!enrolledEmployees || enrolledEmployees.length === 0) {
        console.warn('[useFaceScan] ❌ No enrolled employees found');
        const errorMessage = t('detail_hub.punch_clock.messages.no_enrolled_faces');
        updateStatus(errorMessage, 0);
        onError(errorMessage);
        showToast(
          t('detail_hub.punch_clock.messages.no_enrolled_employees'),
          t('detail_hub.punch_clock.messages.try_again_or_search'),
          'destructive'
        );
        setScanning(false);
        return;
      }

      console.log(`[useFaceScan] Found ${enrolledEmployees.length} enrolled employees`);

      // Step 3: Validate and filter face descriptors (length must be 128)
      const employeesForMatcher = enrolledEmployees
        .filter((emp) => {
          // Validate descriptor exists and is array
          if (!emp.face_descriptor || !Array.isArray(emp.face_descriptor)) {
            console.warn(
              `[useFaceScan] ⚠️ Invalid descriptor for ${emp.first_name} ${emp.last_name}`
            );
            return false;
          }

          // Validate descriptor length (must be 128 for face-api.js)
          if (emp.face_descriptor.length !== 128) {
            console.warn(
              `[useFaceScan] ⚠️ Invalid descriptor length for ${emp.first_name} ${emp.last_name}: ${emp.face_descriptor.length}, expected 128`
            );
            return false;
          }

          return true;
        })
        .map((emp) => ({
          id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
          descriptor: emp.face_descriptor as number[],
        }));

      // Step 4: Check if any valid descriptors exist
      if (employeesForMatcher.length === 0) {
        console.error(
          '[useFaceScan] ❌ No valid face descriptors found (all employees have corrupted data)'
        );
        const errorMessage = t('detail_hub.punch_clock.messages.no_enrolled_faces');
        updateStatus(errorMessage, 0);
        onError(errorMessage);
        showToast(
          t('detail_hub.punch_clock.messages.face_scan_error'),
          'Face recognition data is corrupted. Please re-enroll employees.',
          'destructive'
        );
        setScanning(false);
        return;
      }

      console.log(`[useFaceScan] ✓ ${employeesForMatcher.length} valid face descriptors`);

      // Step 5: Initialize face matcher
      const matcherInitialized = await initializeMatcher(employeesForMatcher);

      if (!matcherInitialized) {
        console.error('[useFaceScan] ❌ Failed to initialize face matcher - stopping scan');
        updateStatus('Face recognition unavailable', 0);

        // Don't show toast - just hide face scan UI
        setScanning(false);
        return;
      }

      console.log('[useFaceScan] Face matcher initialized successfully');

      // Step 6: Initialize camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      if (!videoRef.current) {
        console.error('[useFaceScan] ❌ Video element not available');
        setScanning(false);
        return;
      }

      videoRef.current.srcObject = stream;
      updateStatus(t('detail_hub.punch_clock.messages.position_face'), 15);

      // Step 7: Start countdown timer (15 seconds)
      const countdownInterval = window.setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      countdownIntervalRef.current = countdownInterval;

      // Step 8: Start continuous face scanning (every 2 seconds)
      const scanIntervalId = window.setInterval(async () => {
        if (videoRef.current && findBestMatch) {
          try {
            updateStatus(
              t('detail_hub.punch_clock.messages.detecting_face'),
              secondsLeft
            );

            const match = await findBestMatch(videoRef.current);

            if (match) {
              // Found a match!
              console.log('[useFaceScan] ✅ Match found:', match.employeeName);

              // Clear intervals and timeout
              stopScan();

              // Stop camera
              cleanupCamera('face-match-success');

              // Show success toast
              showToast(
                t('detail_hub.punch_clock.messages.employee_recognized'),
                t('detail_hub.punch_clock.messages.welcome_back', { name: match.employeeName }),
                'default',
                'bg-emerald-50 border-emerald-500'
              );

              // Trigger success callback
              onSuccess(match.employeeId, match.employeeName);
            } else {
              // No match found - show message
              console.log('[useFaceScan] ❌ No match found this scan');
              updateStatus(
                t('detail_hub.punch_clock.messages.no_face_detected'),
                secondsLeft
              );
            }
          } catch (error: unknown) {
            const errorMessage = handleUnknownError(
              error,
              'useFaceScan.startScan.scanInterval'
            );

            // Suppress TensorFlow tensor shape errors (corrupted descriptors)
            if (
              errorMessage.includes('tensor should have') ||
              errorMessage.includes('values but has')
            ) {
              console.warn(
                '[useFaceScan] ⚠️ Corrupted face descriptor detected, skipping this scan'
              );
              // Don't update UI - let scanning continue
            } else {
              updateStatus(t('detail_hub.punch_clock.messages.face_scan_error'), secondsLeft);
            }
          }
        }
      }, scanInterval);

      scanIntervalRef.current = scanIntervalId;

      // Step 9: Set auto-stop timeout (15 seconds)
      const timeoutId = window.setTimeout(() => {
        console.log('[useFaceScan] ⏰ Timeout reached - no face recognized');
        updateStatus(t('detail_hub.punch_clock.messages.face_not_recognized_timeout'), 0);

        // Stop scan
        stopScan();

        // Show timeout toast
        showToast(
          t('detail_hub.punch_clock.messages.face_scan_timeout_title'),
          t('detail_hub.punch_clock.messages.face_scan_timeout_description'),
          'destructive'
        );
      }, timeout);

      timeoutRef.current = timeoutId;
    } catch (error: unknown) {
      const errorMessage = handleUnknownError(error, 'useFaceScan.startScan');

      // Suppress TensorFlow internal errors (validation already handled above)
      if (
        errorMessage.includes('tensor should have') ||
        errorMessage.includes('values but has')
      ) {
        console.warn(
          '[useFaceScan] ⚠️ TensorFlow internal error (likely corrupted descriptor), stopping scan'
        );
        updateStatus(t('detail_hub.punch_clock.messages.face_scan_error'), 0);
        setScanning(false);
        return;
      }

      // Camera denied or other critical error
      updateStatus(t('detail_hub.punch_clock.messages.camera_denied'), 0);
      onError(t('detail_hub.punch_clock.messages.camera_denied'));
      showToast(
        t('detail_hub.punch_clock.camera_error'),
        t('detail_hub.punch_clock.messages.camera_denied'),
        'destructive'
      );
      setScanning(false);
    }
  }, [
    videoRef,
    dealershipId,
    initializeMatcher,
    findBestMatch,
    cleanupCamera,
    onSuccess,
    onError,
    showToast,
    timeout,
    scanInterval,
    t,
    updateStatus,
    stopScan,
    secondsLeft,
  ]);

  return {
    scanning,
    message,
    secondsLeft,
    startScan,
    stopScan,
  };
}
