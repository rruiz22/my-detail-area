/**
 * PunchClockKioskModal - Enterprise-Grade Time Clock with Intelligent Multi-View Flow
 *
 * REFACTORED VERSION (v2.0)
 *
 * Multi-view intelligent flow:
 * 1. SEARCH VIEW - Fuzzy search by name/ID with visual employee cards
 * 2. PIN AUTH VIEW - Secure 6-digit PIN entry with numeric keypad
 * 3. EMPLOYEE DETAIL VIEW - Contextual actions based on current state
 * 4. PHOTO CAPTURE VIEW - Camera verification for all actions
 *
 * Features:
 * - Real-time employee state tracking (not_clocked_in | clocked_in | on_break)
 * - Week statistics display (total/regular/overtime hours, days worked)
 * - Contextual action buttons (clock in, start/end break, clock out)
 * - PIN security with lockout after 3 failed attempts
 * - Photo verification for all punch actions
 * - Responsive design (full-screen on mobile, 90% viewport on desktop)
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Camera,
  User,
  CheckCircle,
  LogIn,
  LogOut,
  Coffee,
  RotateCcw,
  Loader2,
  X,
  Clock
} from "lucide-react";

// Photo capture utilities
import { capturePhotoFromVideo, uploadPhotoToStorage } from "@/utils/photoFallback";

// Face recognition
import { useFaceRecognition } from "@/hooks/useFaceRecognition";

// Supabase
import { supabase } from "@/integrations/supabase/client";

// New hooks and components
import { useEmployeeSearch } from "@/hooks/useEmployeeSearch";
import { useEmployeeCurrentState } from "@/hooks/useEmployeeCurrentState";
import { useEmployeeById } from "@/hooks/useEmployeeById";
import { EmployeeHeader } from "./punch-clock/EmployeeHeader";
import { WeekStatsCard } from "./punch-clock/WeekStatsCard";
import { NumericKeypad } from "./punch-clock/NumericKeypad";
import { PinInputDisplay } from "./punch-clock/PinInputDisplay";
import { PunchHistoryCard } from "./punch-clock/PunchHistoryCard";

// DetailHub hooks
import { useClockIn, useClockOut, useStartBreak, useEndBreak, DetailHubEmployee } from "@/hooks/useDetailHubDatabase";
import { getEmployeeTodaySchedule } from "@/hooks/useDetailHubSchedules";
import { useDealerFilter } from "@/contexts/DealerFilterContext";
import { useToast } from "@/hooks/use-toast";

interface PunchClockKioskModalProps {
  open: boolean;
  onClose: () => void;
  kioskId?: string;
}

type KioskView = 'search' | 'pin_auth' | 'employee_detail' | 'photo_capture';
type CaptureAction = 'clock_in' | 'clock_out' | 'break_start' | 'break_end';

export function PunchClockKioskModal({ open, onClose, kioskId }: PunchClockKioskModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();
  const { mutateAsync: clockIn } = useClockIn();
  const { mutateAsync: clockOut } = useClockOut();
  const { mutateAsync: startBreak } = useStartBreak();
  const { mutateAsync: endBreak } = useEndBreak();

  // Face recognition hook
  const {
    isLoaded: faceApiLoaded,
    isLoading: faceApiLoading,
    loadingProgress: faceApiProgress,
    error: faceApiError,
    findBestMatch,
    initializeMatcher
  } = useFaceRecognition();

  // Kiosk ID from props or localStorage (NO FALLBACK - must be configured)
  const KIOSK_ID = kioskId || localStorage.getItem('kiosk_id') || null;

  // Helper to check if string is valid UUID
  const isValidUUID = (str: string | null): str is string => {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Kiosk Configuration (loaded from database)
  const [kioskConfig, setKioskConfig] = useState<{
    face_recognition_enabled: boolean;
    allow_manual_entry: boolean;
    sleep_timeout_minutes: number;
    kiosk_code: string | null;
    name: string | null;
  }>({
    face_recognition_enabled: true,
    allow_manual_entry: true,
    sleep_timeout_minutes: 10, // Default 10 seconds
    kiosk_code: null,
    name: null,
  });

  // Fetch kiosk configuration from database
  useEffect(() => {
    if (isValidUUID(KIOSK_ID)) {
      console.log('[Kiosk] Fetching configuration for kiosk ID:', KIOSK_ID);
      supabase
        .from('detail_hub_kiosks')
        .select('face_recognition_enabled, allow_manual_entry, sleep_timeout_minutes, kiosk_code, name')
        .eq('id', KIOSK_ID)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('[Kiosk] Error fetching configuration:', error);
            return;
          }
          if (data) {
            console.log('[Kiosk] Configuration loaded:', data);
            setKioskConfig({
              face_recognition_enabled: data.face_recognition_enabled ?? true,
              allow_manual_entry: data.allow_manual_entry ?? true,
              sleep_timeout_minutes: data.sleep_timeout_minutes ?? 10,
              kiosk_code: data.kiosk_code,
              name: data.name,
            });
          }
        });
    }
  }, [KIOSK_ID]);

  // State machine
  const [currentView, setCurrentView] = useState<KioskView>('search');
  const [selectedEmployee, setSelectedEmployee] = useState<DetailHubEmployee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pin, setPin] = useState("");
  const [pinAttempts, setPinAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  // Face scan toggle (auto-starts when modal opens)
  const [showFaceScan, setShowFaceScan] = useState(false);
  const faceScanTimeoutRef = useRef<number | null>(null); // Changed from useState to useRef to fix timeout cleanup
  const [faceMatchedEmployeeId, setFaceMatchedEmployeeId] = useState<string | null>(null);

  // Inactivity timer for employee detail view (uses kiosk config)
  const inactivityTimeoutRef = useRef<number | null>(null);
  const [inactivitySecondsLeft, setInactivitySecondsLeft] = useState<number>(kioskConfig.sleep_timeout_minutes);

  // Photo capture
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photoUploadStatus, setPhotoUploadStatus] = useState("");
  const [captureAction, setCaptureAction] = useState<CaptureAction>('clock_in');
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Current time (updates every second)
  const [currentTime, setCurrentTime] = useState(new Date());

  // Use hooks
  const { data: searchResults = [], isLoading: searching } = useEmployeeSearch(searchQuery);
  const { data: employeeState, refetch: refetchEmployeeState } = useEmployeeCurrentState(selectedEmployee?.id || null);
  const { data: faceMatchedEmployee, isLoading: loadingFaceEmployee } = useEmployeeById(faceMatchedEmployeeId);

  // Live break timer (updates every second)
  const [breakSecondsRemaining, setBreakSecondsRemaining] = useState<number | null>(null);

  // Inactivity timer for employee_detail AND photo_capture views with countdown
  useEffect(() => {
    if (currentView === 'employee_detail' || currentView === 'photo_capture') {
      console.log('[Kiosk] 🚀 Starting 10-second inactivity timer');

      // Reset countdown to configured timeout
      setInactivitySecondsLeft(kioskConfig.sleep_timeout_minutes);

      // Countdown interval
      const countdownInterval = setInterval(() => {
        setInactivitySecondsLeft(prev => {
          if (prev <= 1) {
            console.log('[Kiosk] ⏰ Timeout reached - closing modal');
            clearInterval(countdownInterval);

            // Schedule modal close for next tick to avoid setState during render
            setTimeout(() => {
              toast({
                title: t('detail_hub.punch_clock.messages.session_timeout'),
                description: t('detail_hub.punch_clock.messages.please_try_again'),
                variant: "default"
              });

              // Close modal completely instead of returning to search
              onClose();
            }, 0);

            return kioskConfig.sleep_timeout_minutes;
          }
          return prev - 1;
        });
      }, 1000);

      // Reset timer on user activity
      const resetTimer = (event: Event) => {
        console.log('[Kiosk] 🔄 Activity detected:', event.type, `- resetting to ${kioskConfig.sleep_timeout_minutes}s`);
        setInactivitySecondsLeft(kioskConfig.sleep_timeout_minutes);
      };

      // Listen for user activity (including scroll on modal container)
      const events = ['mousedown', 'touchstart', 'keydown', 'mousemove', 'wheel', 'touchmove'];

      // Get modal content element for scroll events
      const modalContent = document.querySelector('[role="dialog"]');

      // Add listeners to window
      events.forEach(event => {
        window.addEventListener(event, resetTimer, { passive: true });
      });

      // Add scroll listener specifically to modal content
      if (modalContent) {
        modalContent.addEventListener('scroll', resetTimer, { passive: true });
        console.log('[Kiosk] ✓ Scroll listener attached to modal content');
      }

      return () => {
        console.log('[Kiosk] 🧹 Cleaning up inactivity timer');
        clearInterval(countdownInterval);
        events.forEach(event => {
          window.removeEventListener(event, resetTimer);
        });
        if (modalContent) {
          modalContent.removeEventListener('scroll', resetTimer);
        }
      };
    } else {
      // Reset countdown when leaving employee_detail view
      setInactivitySecondsLeft(kioskConfig.sleep_timeout_minutes);
    }
  }, [currentView, t, toast, kioskConfig.sleep_timeout_minutes]);

  useEffect(() => {
    if (employeeState?.state === 'on_break' && employeeState.currentEntry?.break_start) {
      const updateBreakTimer = () => {
        const breakStart = new Date(employeeState.currentEntry.break_start!);
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - breakStart.getTime()) / 1000);
        const requiredSeconds = 30 * 60; // 30 minutes
        const remaining = Math.max(0, requiredSeconds - elapsedSeconds);
        setBreakSecondsRemaining(remaining);
      };

      // Update immediately
      updateBreakTimer();

      // Update every second
      const interval = setInterval(updateBreakTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setBreakSecondsRemaining(null);
    }
  }, [employeeState?.state, employeeState?.currentEntry?.break_start]);

  const formatBreakTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // CRITICAL: Validate kiosk configuration on modal open (with ref to prevent duplicate toasts)
  const hasShownErrorRef = useRef(false);

  useEffect(() => {
    if (open) {
      // Case 1: kioskId is null (never configured)
      if (KIOSK_ID === null) {
        console.error('[Kiosk] ❌ No kiosk configured on this device', {
          timestamp: new Date().toISOString(),
          localStorage_keys: {
            kiosk_id: localStorage.getItem('kiosk_id'),
            fingerprint: localStorage.getItem('kiosk_device_fingerprint'),
            configured_at: localStorage.getItem('kiosk_configured_at'),
            username: localStorage.getItem('kiosk_username')
          }
        });

        if (!hasShownErrorRef.current) {
          toast({
            title: t('detail_hub.punch_clock.error'),
            description: 'This device is not configured as a kiosk. Please configure it in the Kiosk Manager.',
            variant: "destructive",
            duration: 5000
          });
          hasShownErrorRef.current = true;
        }

        setTimeout(() => onClose(), 100);
        return;
      }

      // Case 2: kioskId is invalid UUID
      if (!isValidUUID(KIOSK_ID)) {
        console.error('[Kiosk] ❌ Invalid kiosk ID format:', {
          timestamp: new Date().toISOString(),
          kioskId: KIOSK_ID,
          localStorage_keys: {
            kiosk_id: localStorage.getItem('kiosk_id'),
            fingerprint: localStorage.getItem('kiosk_device_fingerprint'),
            configured_at: localStorage.getItem('kiosk_configured_at')
          }
        });

        if (!hasShownErrorRef.current) {
          toast({
            title: t('detail_hub.punch_clock.error'),
            description: 'Corrupted kiosk configuration detected. Please reconfigure this device.',
            variant: "destructive",
            duration: 5000
          });
          hasShownErrorRef.current = true;
        }

        setTimeout(() => onClose(), 100);
        return;
      }

      // Case 3: Valid UUID - Verify it exists in database
      console.log('[Kiosk] ✅ Valid UUID format detected:', KIOSK_ID);

      // Check if kiosk exists in database
      supabase
        .from('detail_hub_kiosks')
        .select('id, name, kiosk_code, dealership_id, status')
        .eq('id', KIOSK_ID)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            // UUID is valid format BUT kiosk doesn't exist in database
            console.error('[Kiosk] 🚨 CRITICAL: Valid UUID but kiosk NOT FOUND in database!', {
              timestamp: new Date().toISOString(),
              kioskId: KIOSK_ID,
              error: error?.message || 'not found',
              possibleCauses: [
                '1. Kiosk was deleted by admin',
                '2. Dealership was deleted (CASCADE)',
                '3. Database migration reset',
                '4. Wrong database environment'
              ],
              localStorage_keys: {
                kiosk_id: localStorage.getItem('kiosk_id'),
                fingerprint: localStorage.getItem('kiosk_device_fingerprint'),
                configured_at: localStorage.getItem('kiosk_configured_at'),
                username: localStorage.getItem('kiosk_username')
              }
            });

            // This is a CRITICAL diagnostic finding - kiosk was deleted from database
            // but localStorage still has the UUID
          } else {
            // Kiosk exists in database - everything is OK
            console.log('[Kiosk] ✅ Kiosk validated against database:', {
              timestamp: new Date().toISOString(),
              kioskId: data.id,
              name: data.name,
              code: data.kiosk_code,
              dealershipId: data.dealership_id,
              status: data.status, // ✅ FIX: Use 'status' instead of 'is_active'
              localStorage_age: localStorage.getItem('kiosk_configured_at')
                ? `${Math.floor((Date.now() - new Date(localStorage.getItem('kiosk_configured_at')!).getTime()) / (1000 * 60 * 60 * 24))} days`
                : 'unknown'
            });
          }
        });
    }
  }, [open, KIOSK_ID, toast, t, onClose]);

  // IP Detection - Shared utility for heartbeat and punch operations
  const detectAndCacheIP = useCallback(async () => {
    try {
      // Try to import network detection utility
      const { detectBestIP } = await import('@/utils/networkDetection');
      const { ip } = await detectBestIP();
      console.log('[Kiosk] 🌐 IP detected:', ip || 'none');
      return ip;
    } catch (error) {
      console.error('[Kiosk] ⚠️ IP detection failed:', error);
      return null;
    }
  }, []);

  // Kiosk Heartbeat System - Updates kiosk status to "online" and sends periodic heartbeats with IP
  useEffect(() => {
    if (open && kioskConfig.kiosk_code) {
      console.log('[Kiosk] 💓 Starting heartbeat system for kiosk:', kioskConfig.kiosk_code);

      // Send heartbeat with IP
      const sendHeartbeat = async () => {
        try {
          const ip = await detectAndCacheIP();

          const { error } = await supabase.rpc('update_kiosk_heartbeat', {
            p_kiosk_code: kioskConfig.kiosk_code,
            p_ip_address: ip || null
          });

          if (error) {
            console.error('[Kiosk] ❌ Heartbeat failed:', error);
          } else {
            console.log('[Kiosk] ✅ Heartbeat sent successfully', ip ? `(IP: ${ip})` : '');
          }
        } catch (err) {
          console.error('[Kiosk] ❌ Heartbeat error:', err);
        }
      };

      // Send initial heartbeat
      sendHeartbeat();

      // Send heartbeat every 30 seconds while modal is open
      const heartbeatInterval = setInterval(sendHeartbeat, 30000);

      return () => {
        console.log('[Kiosk] 🛑 Stopping heartbeat system');
        clearInterval(heartbeatInterval);
      };
    }
  }, [open, kioskConfig.kiosk_code]);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Lockout timer
  useEffect(() => {
    if (isLocked && lockTimer > 0) {
      const timer = setTimeout(() => setLockTimer(lockTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (lockTimer === 0 && isLocked) {
      setIsLocked(false);
      setPinAttempts(0);
    }
  }, [isLocked, lockTimer]);

  // Auto-start face recognition when modal opens (only if enabled and loaded successfully)
  useEffect(() => {
    if (open && faceApiLoaded && !faceApiError && currentView === 'search' && kioskConfig.face_recognition_enabled) {
      console.log('[Kiosk] Auto-starting face scan (enabled in config)');
      setShowFaceScan(true);
    } else if (open && currentView === 'search' && !kioskConfig.face_recognition_enabled) {
      console.log('[Kiosk] Face recognition disabled in kiosk config - skipping auto-start');
    }
  }, [open, faceApiLoaded, faceApiError, currentView, kioskConfig.face_recognition_enabled]);

  // Handle face-matched employee selection
  useEffect(() => {
    if (faceMatchedEmployee && !loadingFaceEmployee) {
      // Employee loaded successfully from face match
      console.log('[FaceScan] ✓ Employee loaded via facial recognition, skipping PIN');
      setSelectedEmployee(faceMatchedEmployee);
      setCurrentView('employee_detail'); // Skip PIN auth - go directly to actions
      setFaceMatchedEmployeeId(null); // Reset for next match
    }
  }, [faceMatchedEmployee, loadingFaceEmployee]);

  // Cleanup camera stream on unmount or modal close
  useEffect(() => {
    if (!open) {
      // CRITICAL: Stop ALL camera tracks and clear srcObject
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();

        console.log('[Kiosk] Stopping camera - tracks:', tracks.length);

        tracks.forEach(track => {
          track.stop();
          console.log('[Kiosk] Stopped track:', track.kind, track.label);
        });

        // CRITICAL: Clear the srcObject to release the camera
        videoRef.current.srcObject = null;
        console.log('[Kiosk] ✓ Camera released and srcObject cleared');
      }

      // Clear any pending timeout using ref
      if (faceScanTimeoutRef.current !== null) {
        console.log('[Kiosk] Clearing face scan timeout on modal close');
        clearTimeout(faceScanTimeoutRef.current);
        faceScanTimeoutRef.current = null;
      }

      // Reset state when modal closes
      setCurrentView('search');
      setSelectedEmployee(null);
      setSearchQuery("");
      setPin("");
      setPinAttempts(0);
      setIsLocked(false);
      setCapturedPhoto(null);
      setPhotoUploadStatus("");
      setShowFaceScan(false);
      setFaceScanning(false);
      setFaceScanMessage("");
    }
  }, [open]);

  // Cleanup on unmount (backup safety)
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();

        console.log('[Kiosk] Component unmounting - stopping camera');

        tracks.forEach(track => {
          track.stop();
        });

        videoRef.current.srcObject = null;
      }
    };
  }, []);

  // Format helpers
  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const formatElapsedTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // PIN validation (useCallback to avoid re-creating function) - MUST BE BEFORE useEffect that uses it
  const handlePinSubmit = useCallback(() => {
    if (!selectedEmployee || pin.length < 4) return;

    if (pin === selectedEmployee.pin_code) {
      // PIN correct
      setCurrentView('employee_detail');
      setPin("");
      setPinAttempts(0);
      setIsLocked(false);
    } else {
      // PIN incorrect
      const newAttempts = pinAttempts + 1;
      setPinAttempts(newAttempts);

      if (newAttempts >= 3) {
        // Lock for 30 seconds
        setIsLocked(true);
        setLockTimer(30);
        setPin("");
        toast({
          title: t('detail_hub.punch_clock.error'),
          description: t('detail_hub.punch_clock.pin_locked', { seconds: 30 }),
          variant: "destructive"
        });
      } else {
        setPin(""); // Clear PIN automatically for new attempt
        toast({
          title: t('detail_hub.punch_clock.error'),
          description: t('detail_hub.punch_clock.pin_incorrect', { attempts: 3 - newAttempts }),
          variant: "destructive"
        });
      }
    }
  }, [selectedEmployee, pin, pinAttempts, t, toast]);

  // Keyboard support for PIN entry (AFTER handlePinSubmit is defined)
  useEffect(() => {
    if (currentView !== 'pin_auth' || isLocked) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Numbers 0-9
      if (/^[0-9]$/.test(e.key) && pin.length < 6) {
        setPin(pin + e.key);
        e.preventDefault();
      }
      // Backspace
      else if (e.key === 'Backspace') {
        setPin(pin.slice(0, -1));
        e.preventDefault();
      }
      // Enter to submit
      else if (e.key === 'Enter' && pin.length >= 4) {
        handlePinSubmit();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentView, pin, isLocked, handlePinSubmit]);

  // Start photo capture (always required, even after facial recognition)
  const handleStartPhotoCapture = (action: CaptureAction) => {
    setCaptureAction(action);
    setCurrentView('photo_capture');
    setCapturedPhoto(null); // Clear any previous photo (including from facial recognition)
    setPhotoUploadStatus(t('detail_hub.punch_clock.messages.preparing_camera'));

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
    })
    .then(stream => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setPhotoUploadStatus(t('detail_hub.punch_clock.messages.position_and_capture'));
      }
    })
    .catch(error => {
      console.error('Camera access error:', error);
      setPhotoUploadStatus(t('detail_hub.punch_clock.messages.camera_denied'));
      toast({
        title: t('detail_hub.punch_clock.camera_error'),
        description: t('detail_hub.punch_clock.messages.camera_denied'),
        variant: "destructive"
      });
    });
  };

  // Capture photo from video
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;

    setPhotoUploadStatus(t('detail_hub.punch_clock.messages.capturing_photo'));
    const photoData = capturePhotoFromVideo(videoRef.current, 0.9);

    if (!photoData) {
      setPhotoUploadStatus(t('detail_hub.punch_clock.messages.photo_capture_failed'));
      return;
    }

    setCapturedPhoto(photoData);
    setPhotoUploadStatus(t('detail_hub.punch_clock.messages.photo_captured'));

    // Stop camera stream
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPhoto(null);
    handleStartPhotoCapture(captureAction);
  };

  // Confirm and submit punch
  const handleConfirmPunch = async () => {
    if (!capturedPhoto || !selectedEmployee) {
      toast({
        title: t('detail_hub.punch_clock.error'),
        description: t('detail_hub.punch_clock.messages.id_and_photo_required'),
        variant: "destructive"
      });
      return;
    }

    if (selectedDealerId === 'all') {
      toast({
        title: t('detail_hub.punch_clock.error'),
        description: t('detail_hub.punch_clock.messages.select_dealership'),
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setPhotoUploadStatus(t('detail_hub.punch_clock.messages.uploading'));

    try {
      // Get current IP address for audit trail
      const currentIp = await detectAndCacheIP();

      // Debug: Log kiosk info before punch
      console.log('[Punch Debug] Kiosk Code:', kioskConfig.kiosk_code);
      console.log('[Punch Debug] IP Address:', currentIp);

      // Upload photo to Supabase Storage
      const uploadResult = await uploadPhotoToStorage(capturedPhoto, {
        employeeId: selectedEmployee.id,
        dealershipId: selectedDealerId as number,
        action: captureAction
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.storageError || t('detail_hub.punch_clock.messages.upload_failed'));
      }

      setPhotoUploadStatus(t('detail_hub.punch_clock.messages.processing'));

      // Get employee's schedule for today
      // NOTE: Temporarily disabled schedule linking due to trigger foreign key issue
      // const schedule = await getEmployeeTodaySchedule(selectedEmployee.id);

      // Execute action based on capture type
      switch (captureAction) {
        case 'clock_in':
          await clockIn({
            employeeId: selectedEmployee.id,
            dealershipId: selectedDealerId as number,
            method: 'photo_fallback',
            photoUrl: uploadResult.photoUrl,
            kioskId: kioskConfig.kiosk_code || undefined,
            ipAddress: currentIp || undefined
            // scheduleId: schedule?.id // Disabled until trigger is fixed
          });
          toast({
            title: t('detail_hub.toasts.clocked_in'),
            description: t('detail_hub.punch_clock.messages.clock_in_success', { time: formatTime(currentTime) })
          });
          break;

        case 'clock_out':
          await clockOut({
            employeeId: selectedEmployee.id,
            method: 'photo_fallback',
            photoUrl: uploadResult.photoUrl,
            kioskId: kioskConfig.kiosk_code || undefined,
            ipAddress: currentIp || undefined
          });
          toast({
            title: t('detail_hub.toasts.clocked_out'),
            description: t('detail_hub.punch_clock.messages.clock_out_success')
          });
          break;

        case 'break_start':
          await startBreak({
            employeeId: selectedEmployee.id,
            method: 'photo_fallback',
            photoUrl: uploadResult.photoUrl,
            kioskId: kioskConfig.kiosk_code || undefined,
            ipAddress: currentIp || undefined
          });
          toast({
            title: t('detail_hub.toasts.break_started'),
            description: t('detail_hub.punch_clock.messages.processing')
          });
          break;

        case 'break_end':
          await endBreak({
            employeeId: selectedEmployee.id,
            method: 'photo_fallback',
            photoUrl: uploadResult.photoUrl,
            kioskId: kioskConfig.kiosk_code || undefined,
            ipAddress: currentIp || undefined
          });
          toast({
            title: t('detail_hub.toasts.break_ended'),
            description: t('detail_hub.punch_clock.messages.processing')
          });
          break;
      }

      // Increment kiosk punch counter
      if (kioskConfig.kiosk_code) {
        try {
          console.log('[Kiosk] 📊 Incrementing punch counter for:', kioskConfig.kiosk_code);
          await supabase.rpc('increment_kiosk_punch_counter', {
            p_kiosk_code: kioskConfig.kiosk_code
          });
          console.log('[Kiosk] ✅ Punch counter incremented');
        } catch (counterError) {
          console.error('[Kiosk] ❌ Failed to increment punch counter:', counterError);
          // Don't fail the entire operation if counter update fails
        }
      }

      // Refresh employee state and return to employee detail view
      await refetchEmployeeState();
      setCurrentView('employee_detail');
      setCapturedPhoto(null);
      setPhotoUploadStatus("");

    } catch (error) {
      console.error('Punch error:', error);
      setPhotoUploadStatus(t('detail_hub.punch_clock.messages.punch_failed'));
      toast({
        title: t('detail_hub.punch_clock.punch_failed'),
        description: error instanceof Error ? error.message : t('detail_hub.punch_clock.messages.unknown_error'),
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel photo capture
  const handleCancelCapture = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setCurrentView('employee_detail');
    setCapturedPhoto(null);
    setPhotoUploadStatus("");
  };

  // Face recognition state
  const [faceScanning, setFaceScanning] = useState(false);
  const [faceScanMessage, setFaceScanMessage] = useState("");
  const [faceScanSecondsLeft, setFaceScanSecondsLeft] = useState(15);

  // Start face scan when showFaceScan is toggled on, with 15-second auto-stop
  useEffect(() => {
    if (showFaceScan && !faceScanning) {
      handleStartFaceScan();

      // Set timeout to auto-stop after 15 seconds if no recognition
      const timeout = window.setTimeout(() => {
        console.log('[FaceScan] ⏰ 15-second timeout - no face recognized');
        setFaceScanMessage(t('detail_hub.punch_clock.messages.face_not_recognized_timeout'));
        handleStopFaceScan();
        setShowFaceScan(false);

        // Schedule toast for next tick to avoid setState during render
        setTimeout(() => {
          toast({
            title: t('detail_hub.punch_clock.messages.face_scan_timeout_title'),
            description: t('detail_hub.punch_clock.messages.face_scan_timeout_description'),
            variant: "destructive"
          });
        }, 0);
      }, 15000); // 15 seconds

      faceScanTimeoutRef.current = timeout; // Store in ref instead of state
      console.log('[FaceScan] ✓ Timeout set (ID:', timeout, ')');
    } else if (!showFaceScan && faceScanning) {
      handleStopFaceScan();

      // Clear timeout if manually stopped using ref
      if (faceScanTimeoutRef.current !== null) {
        console.log('[FaceScan] Clearing timeout (manual stop)');
        clearTimeout(faceScanTimeoutRef.current);
        faceScanTimeoutRef.current = null;
      }
    }
  }, [showFaceScan]);

  const handleStartFaceScan = async () => {
    setFaceScanning(true);
    setFaceScanSecondsLeft(15);
    setFaceScanMessage(t('detail_hub.punch_clock.messages.preparing_camera'));

    try {
      // Step 1: Load enrolled employees and initialize face matcher
      console.log('[FaceScan] Loading enrolled employees...');
      const { data: enrolledEmployees, error: loadError } = await supabase
        .from('detail_hub_employees')
        .select('id, first_name, last_name, face_descriptor')
        .eq('dealership_id', selectedDealerId)
        .eq('status', 'active')
        .not('face_descriptor', 'is', null);

      if (loadError) {
        console.error('[FaceScan] Error loading enrolled employees:', loadError);
        toast({
          title: t('detail_hub.punch_clock.messages.face_scan_error'),
          description: 'Failed to load enrolled employees',
          variant: "destructive"
        });
        setFaceScanning(false);
        return;
      }

      if (!enrolledEmployees || enrolledEmployees.length === 0) {
        console.warn('[FaceScan] ❌ No enrolled employees found');
        setFaceScanMessage(t('detail_hub.punch_clock.messages.no_enrolled_faces'));
        toast({
          title: t('detail_hub.punch_clock.messages.no_enrolled_employees'),
          description: t('detail_hub.punch_clock.messages.try_again_or_search'),
          variant: "destructive"
        });
        setFaceScanning(false);
        setShowFaceScan(false);
        return;
      }

      console.log(`[FaceScan] Found ${enrolledEmployees.length} enrolled employees`);

      // Step 2: Initialize face matcher with validation
      const employeesForMatcher = enrolledEmployees
        .filter(emp => {
          // Validate descriptor exists and is array
          if (!emp.face_descriptor || !Array.isArray(emp.face_descriptor)) {
            console.warn(`[FaceScan] ⚠️ Invalid descriptor for ${emp.first_name} ${emp.last_name}`);
            return false;
          }
          // Validate descriptor length (should be 128)
          if (emp.face_descriptor.length !== 128) {
            console.warn(`[FaceScan] ⚠️ Invalid descriptor length for ${emp.first_name} ${emp.last_name}: ${emp.face_descriptor.length}, expected 128`);
            return false;
          }
          return true;
        })
        .map(emp => ({
          id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
          descriptor: emp.face_descriptor as number[]
        }));

      if (employeesForMatcher.length === 0) {
        console.error('[FaceScan] ❌ No valid face descriptors found (all employees have corrupted data)');
        setFaceScanMessage(t('detail_hub.punch_clock.messages.no_enrolled_faces'));
        toast({
          title: t('detail_hub.punch_clock.messages.face_scan_error'),
          description: 'Face recognition data is corrupted. Please re-enroll employees.',
          variant: "destructive"
        });
        setFaceScanning(false);
        setShowFaceScan(false);
        return;
      }

      console.log(`[FaceScan] ✓ ${employeesForMatcher.length} valid face descriptors`);

      const matcherInitialized = await initializeMatcher(employeesForMatcher);

      if (!matcherInitialized) {
        console.error('[FaceScan] ❌ Failed to initialize face matcher - stopping scan');
        setFaceScanMessage('Face recognition unavailable');

        // Don't show toast - just hide face scan UI
        setFaceScanning(false);
        setShowFaceScan(false);
        return;
      }

      console.log('[FaceScan] Face matcher initialized successfully');

      // Step 3: Initialize camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setFaceScanMessage(t('detail_hub.punch_clock.messages.position_face'));

        // Countdown timer
        const countdownInterval = setInterval(() => {
          setFaceScanSecondsLeft(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        // Start continuous scanning every 2 seconds
        const scanInterval = setInterval(async () => {
          if (videoRef.current && findBestMatch) {
            try {
              setFaceScanMessage(t('detail_hub.punch_clock.messages.detecting_face'));

              const match = await findBestMatch(videoRef.current);

              if (match) {
                // Found a match!
                console.log('[FaceScan] ✅ Match found:', match.employeeName);
                clearInterval(scanInterval);

                // CRITICAL: Clear the auto-stop timeout since we found a match (using ref)
                if (faceScanTimeoutRef.current !== null) {
                  console.log('[FaceScan] ✅ Clearing timeout after successful match (ID:', faceScanTimeoutRef.current, ')');
                  clearTimeout(faceScanTimeoutRef.current);
                  faceScanTimeoutRef.current = null;
                }

                // Stop camera and clear srcObject
                if (videoRef.current?.srcObject) {
                  const stream = videoRef.current.srcObject as MediaStream;
                  const tracks = stream.getTracks();
                  tracks.forEach(track => track.stop());
                  videoRef.current.srcObject = null;
                  console.log('[FaceScan] ✓ Camera stopped after match');
                }

                // Show success message
                toast({
                  title: t('detail_hub.punch_clock.messages.employee_recognized'),
                  description: t('detail_hub.punch_clock.messages.welcome_back', { name: match.employeeName }),
                  className: "bg-emerald-50 border-emerald-500"
                });

                // Hide face scan UI
                setFaceScanning(false);
                setShowFaceScan(false);

                // Trigger employee fetch by ID (useEffect will handle selection)
                setFaceMatchedEmployeeId(match.employeeId);
              } else {
                // No match found - show message
                console.log('[FaceScan] ❌ No match found this scan');
                setFaceScanMessage(t('detail_hub.punch_clock.messages.no_face_detected'));
              }
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : String(err);

              // Suppress TensorFlow tensor shape errors (corrupted descriptors)
              if (errorMessage.includes('tensor should have') || errorMessage.includes('values but has')) {
                console.warn('[FaceScan] ⚠️ Corrupted face descriptor detected, skipping this scan');
                // Don't update UI - let scanning continue
              } else {
                console.error('[FaceScan] ❌ Error during scan:', err);
                setFaceScanMessage(t('detail_hub.punch_clock.messages.face_scan_error'));
              }
            }
          }
        }, 2000);

        // Store interval to clear on unmount
        return () => clearInterval(scanInterval);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Suppress TensorFlow internal errors (validation already handled above)
      if (errorMessage.includes('tensor should have') || errorMessage.includes('values but has')) {
        console.warn('[FaceScan] ⚠️ TensorFlow internal error (likely corrupted descriptor), stopping scan');
        setFaceScanMessage(t('detail_hub.punch_clock.messages.face_scan_error'));
        setFaceScanning(false);
        setShowFaceScan(false);
        return;
      }

      console.error('Camera access error:', error);
      setFaceScanMessage(t('detail_hub.punch_clock.messages.camera_denied'));
      toast({
        title: t('detail_hub.punch_clock.camera_error'),
        description: t('detail_hub.punch_clock.messages.camera_denied'),
        variant: "destructive"
      });
      setFaceScanning(false);
    }
  };

  const handleStopFaceScan = () => {
    // Stop camera and clear srcObject
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();

      console.log('[FaceScan] Manually stopping face scan - tracks:', tracks.length);

      tracks.forEach(track => {
        track.stop();
        console.log('[FaceScan] Stopped track:', track.kind);
      });

      videoRef.current.srcObject = null;
      console.log('[FaceScan] ✓ Camera stopped and srcObject cleared');
    }

    setFaceScanning(false);
    setFaceScanMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-screen h-screen lg:max-w-7xl lg:w-[90vw] lg:h-[90vh] p-0 gap-0 overflow-hidden lg:rounded-xl">
        {/* Hidden title and description for accessibility */}
        <VisuallyHidden>
          <DialogTitle>{t('detail_hub.punch_clock.title')}</DialogTitle>
          <DialogDescription>
            {t('detail_hub.punch_clock.kiosk_description')}
          </DialogDescription>
        </VisuallyHidden>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">{t('common.close')}</span>
        </button>

        {/* Modal Content - Scrollable */}
        <div className="h-full overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* ============================= */}
            {/* VIEW 1: SEARCH */}
            {/* ============================= */}
            {currentView === 'search' && (
              <>
                {/* Header - Compact */}
                <Card className="card-enhanced lg:rounded-t-xl">
                  <CardContent className="py-4">
                    <h1 className="text-2xl font-bold text-gray-900 text-center">
                      {t('detail_hub.punch_clock.title')}
                    </h1>
                    <div className="text-5xl font-mono font-bold text-gray-800 my-2 text-center tracking-tight animate-pulse-subtle">
                      {formatTime(currentTime)}
                    </div>
                  </CardContent>
                </Card>

                {/* Face Scan Section - Only if enabled in kiosk config */}
                {kioskConfig.face_recognition_enabled && showFaceScan && (
                  <Card className="card-enhanced">
                    <CardContent className="py-6 space-y-4">
                      {/* Header with Dynamic Status */}
                      <div className="text-center space-y-1">
                        <h2 className="text-xl font-bold text-gray-900">
                          {t('detail_hub.punch_clock.messages.use_face_recognition')}
                        </h2>
                        <p className={`text-sm font-medium ${
                          faceScanMessage.includes('error') || faceScanMessage.includes('Error') || faceScanMessage.includes('No')
                            ? 'text-red-600'
                            : faceScanMessage.includes('Detecting') || faceScanMessage.includes('detecting')
                            ? 'text-emerald-600 animate-pulse'
                            : 'text-gray-600'
                        }`}>
                          {faceScanMessage || t('detail_hub.punch_clock.messages.position_face')}
                        </p>
                      </div>

                      {/* Video Feed with Face Guide Overlay */}
                      <div className="relative rounded-xl overflow-hidden bg-black" style={{ maxHeight: '500px' }}>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />

                        {/* Face Guide Overlay */}
                        {faceScanning && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="relative">
                              {/* Face outline guide */}
                              <div className="w-64 h-80 border-4 border-emerald-500 rounded-2xl animate-pulse-border" />

                              {/* Instruction badge */}
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg animate-fade-in whitespace-nowrap">
                                {t('detail_hub.punch_clock.messages.position_face')}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Scanning Indicator with Countdown */}
                        {faceScanning && (
                          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                            <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {t('detail_hub.punch_clock.scanning')}
                            </div>
                            <div className={`px-3 py-2 rounded-full text-sm font-mono font-bold transition-all duration-300 ${
                              faceScanSecondsLeft <= 5
                                ? 'bg-red-500 text-white animate-pulse'
                                : 'bg-emerald-500 text-white'
                            }`}>
                              {faceScanSecondsLeft}s
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Loading Status - Face API */}
                      {faceApiLoading && (
                        <Alert>
                          <AlertDescription className="text-center">
                            {t('detail_hub.punch_clock.messages.loading_models')} ({faceApiProgress}%)
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* No Enrolled Faces Warning */}
                      {!faceApiLoading && faceApiLoaded && (
                        <Alert>
                          <AlertDescription className="text-center">
                            {t('detail_hub.punch_clock.messages.no_enrolled_faces')}
                            <br />
                            {t('detail_hub.punch_clock.messages.use_search_instead')}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Cancel Face Scan Button */}
                      {faceScanning && (
                        <Button
                          onClick={() => {
                            console.log('[FaceScan] 🛑 User cancelled face scan');
                            handleStopFaceScan();
                            setShowFaceScan(false);
                            toast({
                              title: t('detail_hub.punch_clock.messages.face_scan_cancelled'),
                              description: t('detail_hub.punch_clock.messages.use_search_instead'),
                              variant: "default"
                            });
                          }}
                          variant="destructive"
                          className="w-full h-12"
                          size="lg"
                        >
                          <X className="w-5 h-5 mr-2" />
                          {t('detail_hub.punch_clock.cancel_face_scan')}
                        </Button>
                      )}

                      {/* Use Search Instead Button (when not scanning) */}
                      {!faceScanning && (
                        <Button
                          onClick={() => setShowFaceScan(false)}
                          variant="outline"
                          className="w-full h-12 text-gray-700"
                          size="lg"
                        >
                          {t('detail_hub.punch_clock.messages.use_search_instead')}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Manual Search - Only if enabled in kiosk config */}
                {kioskConfig.allow_manual_entry && (
                  <Card className="card-enhanced">
                    <CardContent className="py-6 space-y-4">
                      {!showFaceScan && (
                        <div className="text-center text-sm text-gray-600 mb-2">
                          {t('detail_hub.punch_clock.search_placeholder')}
                        </div>
                      )}

                      {showFaceScan && (
                        <div className="text-center text-sm text-gray-600 mb-2">
                          {t('detail_hub.punch_clock.messages.use_search_instead')}
                        </div>
                      )}

                      <Input
                        type="text"
                        placeholder={t('detail_hub.punch_clock.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="text-xl h-16"
                      />

                    {/* Face API Loading Status */}
                    {faceApiLoading && (
                      <div className="text-center text-sm text-gray-600">
                        {t('detail_hub.punch_clock.messages.loading_models')} ({faceApiProgress}%)
                      </div>
                    )}

                    {/* Face API Error (filter out TensorFlow internal errors) */}
                    {faceApiError && !faceApiError.includes('tensor should have') && !faceApiError.includes('values but has') && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          {faceApiError}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Manual Face Scan Toggle (only if enabled and models loaded successfully) */}
                    {kioskConfig.face_recognition_enabled && !showFaceScan && faceApiLoaded && !faceApiLoading && !faceApiError && (
                      <Button
                        onClick={() => setShowFaceScan(true)}
                        className="w-full h-14 bg-indigo-500 hover:bg-indigo-600 text-white"
                        size="lg"
                      >
                        <Camera className="w-5 h-5 mr-2" />
                        {t('detail_hub.punch_clock.messages.use_face_recognition')}
                      </Button>
                    )}

                    {/* Face Recognition Unavailable Message */}
                    {!faceApiLoading && faceApiError && (
                      <Alert>
                        <AlertDescription className="text-center text-sm text-gray-600">
                          {t('detail_hub.punch_clock.messages.face_recognition_unavailable')}
                        </AlertDescription>
                      </Alert>
                    )}
                    </CardContent>
                  </Card>
                )}

                {/* Search Results - Only if manual entry is allowed */}
                {kioskConfig.allow_manual_entry && searchQuery.length >= 2 && (
                  <Card className="card-enhanced">
                    <CardContent className="py-4">
                      {searching ? (
                        <div className="text-center py-8 text-gray-500">
                          {t('detail_hub.punch_clock.loading_employees')}
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          {t('detail_hub.punch_clock.no_results')}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {searchResults.map(employee => (
                            <button
                              key={employee.id}
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setCurrentView('pin_auth');
                              }}
                              className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-emerald-100 text-left"
                            >
                              <div className="flex items-center gap-3">
                                {/* Photo or Avatar */}
                                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                  {employee.fallback_photo_url ? (
                                    <img src={employee.fallback_photo_url} alt="" className="w-full h-full object-cover rounded-full" />
                                  ) : (
                                    <User className="w-6 h-6 text-gray-400" />
                                  )}
                                </div>

                                {/* Info */}
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900">
                                    {employee.first_name} {employee.last_name}
                                  </div>
                                  <div className="flex gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">{employee.employee_number}</Badge>
                                    <Badge variant="secondary" className="text-xs">{employee.department}</Badge>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* ============================= */}
            {/* VIEW 2: PIN AUTH */}
            {/* ============================= */}
            {currentView === 'pin_auth' && selectedEmployee && (
              <>
                {/* Employee Header (compact) */}
                <EmployeeHeader employee={selectedEmployee} compact />

                {/* PIN Entry */}
                <Card className="card-enhanced">
                  <CardContent className="py-8 space-y-6">
                    <h2 className="text-2xl font-bold text-center">
                      {t('detail_hub.punch_clock.enter_pin')}
                    </h2>

                    {/* PIN Display */}
                    <PinInputDisplay pin={pin} length={6} error={pinAttempts > 0 && pin.length >= 4} />

                    {/* Error Message */}
                    {pinAttempts > 0 && !isLocked && (
                      <p className="text-center text-red-600 text-sm">
                        {t('detail_hub.punch_clock.pin_incorrect', { attempts: 3 - pinAttempts })}
                      </p>
                    )}

                    {/* Lock Message */}
                    {isLocked && (
                      <p className="text-center text-red-600 text-sm font-semibold">
                        {t('detail_hub.punch_clock.pin_locked', { seconds: lockTimer })}
                      </p>
                    )}

                    {/* Numeric Keypad */}
                    <NumericKeypad
                      onNumberClick={(num) => {
                        if (pin.length < 6 && !isLocked) setPin(pin + num);
                      }}
                      onBackspace={() => setPin(pin.slice(0, -1))}
                      onSubmit={handlePinSubmit}
                      disabled={isLocked || pin.length < 4}
                    />

                    {/* Back Button */}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentView('search');
                        setSelectedEmployee(null);
                        setPin("");
                        setPinAttempts(0);
                        setIsLocked(false);
                      }}
                      className="w-full"
                    >
                      {t('detail_hub.punch_clock.back_to_search')}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {/* ============================= */}
            {/* VIEW 3: EMPLOYEE DETAIL */}
            {/* ============================= */}
            {currentView === 'employee_detail' && selectedEmployee && employeeState && (
              <>
                {/* Inactivity Timer Badge - Bottom Right */}
                <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
                  <div className={`px-4 py-2 rounded-full text-sm font-medium shadow-lg transition-all duration-300 ${
                    inactivitySecondsLeft <= 3
                      ? 'bg-red-500 text-white animate-pulse'
                      : inactivitySecondsLeft <= 5
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-800/90 text-white'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{inactivitySecondsLeft}s</span>
                    </div>
                  </div>
                </div>

                {/* Employee Header with Status - Combined */}
                <Card className="card-enhanced">
                  <CardContent className="py-4">
                    {/* Employee Info */}
                    <div className="flex items-center gap-3 mb-3">
                      {/* Photo or Avatar */}
                      <div className="w-16 h-16">
                        {selectedEmployee.fallback_photo_url ? (
                          <img
                            src={selectedEmployee.fallback_photo_url}
                            alt={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
                            className="w-full h-full object-cover rounded-full border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                            <User className="w-7 h-7" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900">
                          {selectedEmployee.first_name} {selectedEmployee.last_name}
                        </h2>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {selectedEmployee.employee_number}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {selectedEmployee.department}
                          </Badge>
                          <Badge
                            variant={
                              employeeState.state === 'clocked_in' ? 'success' :
                              employeeState.state === 'on_break' ? 'warning' :
                              'default'
                            }
                            className={
                              employeeState.state === 'clocked_in'
                                ? 'bg-emerald-500 text-white'
                                : employeeState.state === 'on_break'
                                ? 'bg-amber-500 text-white'
                                : ''
                            }
                          >
                            {employeeState.state === 'clocked_in' ? t('detail_hub.live_dashboard.active') :
                             employeeState.state === 'on_break' ? t('detail_hub.live_dashboard.on_break') :
                             t('detail_hub.punch_clock.status.online')}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Current Status Info - Grid Layout */}
                    {employeeState.currentEntry && (
                      <div className="pt-3 border-t border-gray-200">
                        {employeeState.state === 'clocked_in' && (
                          <div className="grid grid-cols-2 gap-4">
                            {/* Left: Clock In Info */}
                            <div>
                              <p className="text-xs text-gray-500 mb-1">
                                {t('detail_hub.punch_clock.clocked_in_at', {
                                  time: formatTime(new Date(employeeState.currentEntry.clock_in))
                                })}
                              </p>
                              <p className="text-xs text-gray-500">
                                📍 {kioskConfig.name || KIOSK_ID || 'Not Configured'}
                              </p>
                            </div>

                            {/* Right: Elapsed Time */}
                            <div className="text-right">
                              <p className="text-xs text-gray-500 mb-1">{t('detail_hub.punch_clock.elapsed')}</p>
                              <p className="text-2xl font-bold text-gray-900">
                                {formatElapsedTime(employeeState.currentEntry.elapsed_minutes)}
                              </p>
                            </div>
                          </div>
                        )}

                        {employeeState.state === 'on_break' && (
                          <div className="grid grid-cols-2 gap-4">
                            {/* Left: Break Start Info */}
                            <div>
                              <p className="text-xs text-amber-600 mb-1">
                                {t('detail_hub.punch_clock.on_break_since', {
                                  time: formatTime(new Date(employeeState.currentEntry.break_start!))
                                })}
                              </p>
                              <p className="text-xs text-gray-500">
                                📍 {kioskConfig.name || KIOSK_ID || 'Not Configured'}
                              </p>
                              {(employeeState.currentEntry.break_elapsed_minutes || 0) < 30 && (
                                <p className="text-xs text-amber-600 mt-1">
                                  {30 - (employeeState.currentEntry.break_elapsed_minutes || 0)} min {t('detail_hub.punch_clock.until_minimum')}
                                </p>
                              )}
                            </div>

                            {/* Right: Break Duration */}
                            <div className="text-right">
                              <p className="text-xs text-amber-600 mb-1">{t('detail_hub.punch_clock.break_time')}</p>
                              <p className="text-2xl font-bold text-amber-700">
                                {formatElapsedTime(employeeState.currentEntry.break_elapsed_minutes || 0)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Week Stats */}
                <WeekStatsCard
                  totalHours={employeeState.weekStats.total_hours}
                  regularHours={employeeState.weekStats.regular_hours}
                  overtimeHours={employeeState.weekStats.overtime_hours}
                  daysWorked={employeeState.weekStats.days_worked}
                />

                {/* Contextual Action Buttons */}
                <Card className="card-enhanced">
                  <CardContent className="py-6">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Show Clock In if not clocked in */}
                      {employeeState.state === 'not_clocked_in' && (
                        <Button
                          size="lg"
                          className="h-24 text-xl font-semibold bg-emerald-600 hover:bg-emerald-700 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-emerald-200 col-span-2"
                          onClick={() => handleStartPhotoCapture('clock_in')}
                        >
                          <LogIn className="w-8 h-8 mr-3" />
                          <div className="text-left">
                            <div>{t('detail_hub.live_dashboard.clock_in')}</div>
                            <div className="text-xs font-normal opacity-90">Start Your Shift</div>
                          </div>
                        </Button>
                      )}

                      {/* Show Start Break + Clock Out if clocked in */}
                      {employeeState.state === 'clocked_in' && (
                        <>
                          <Button
                            size="lg"
                            variant="outline"
                            className="h-24 text-xl font-semibold border-2 border-amber-500 text-amber-700 hover:bg-amber-50"
                            onClick={() => handleStartPhotoCapture('break_start')}
                          >
                            <Coffee className="w-8 h-8 mr-2" />
                            {t('detail_hub.punch_clock.start_break')}
                          </Button>

                          <Button
                            size="lg"
                            className="h-24 text-xl font-semibold bg-red-600 hover:bg-red-700"
                            onClick={() => handleStartPhotoCapture('clock_out')}
                          >
                            <LogOut className="w-8 h-8 mr-2" />
                            {t('detail_hub.punch_clock.messages.clock_out')}
                          </Button>
                        </>
                      )}

                      {/* Show End Break + Clock Out if on break */}
                      {employeeState.state === 'on_break' && (
                        <>
                          <Button
                            size="lg"
                            className="h-24 text-xl font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleStartPhotoCapture('break_end')}
                            disabled={breakSecondsRemaining !== null && breakSecondsRemaining > 0}
                            title={breakSecondsRemaining !== null && breakSecondsRemaining > 0
                              ? `Break must be at least 30 minutes. ${formatBreakTimer(breakSecondsRemaining)} remaining.`
                              : undefined
                            }
                          >
                            <Coffee className="w-8 h-8 mr-2" />
                            <span>{t('detail_hub.punch_clock.end_break')}</span>
                            {breakSecondsRemaining !== null && breakSecondsRemaining > 0 && (
                              <span className="ml-2 font-mono">
                                {formatBreakTimer(breakSecondsRemaining)}
                              </span>
                            )}
                          </Button>

                          <Button
                            size="lg"
                            className="h-24 text-xl font-semibold bg-red-600 hover:bg-red-700"
                            onClick={() => handleStartPhotoCapture('clock_out')}
                          >
                            <LogOut className="w-8 h-8 mr-2" />
                            {t('detail_hub.punch_clock.messages.clock_out')}
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Back to Search */}
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setCurrentView('search');
                        setSelectedEmployee(null);
                      }}
                      className="w-full mt-4"
                    >
                      {t('detail_hub.punch_clock.back_to_search')}
                    </Button>
                  </CardContent>
                </Card>

                {/* Punch History */}
                <PunchHistoryCard
                  employeeId={selectedEmployee.id}
                  limit={5}
                />
              </>
            )}

            {/* ============================= */}
            {/* VIEW 4: PHOTO CAPTURE */}
            {/* ============================= */}
            {currentView === 'photo_capture' && selectedEmployee && (
              <>
                {/* Inactivity Timer Badge - Photo Capture */}
                <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
                  <div className={`px-4 py-2 rounded-full text-sm font-medium shadow-lg transition-all duration-300 ${
                    inactivitySecondsLeft <= 3
                      ? 'bg-red-500 text-white animate-pulse'
                      : inactivitySecondsLeft <= 5
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-800/90 text-white'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{inactivitySecondsLeft}s</span>
                    </div>
                  </div>
                </div>

                <Card className="card-enhanced">
                <CardContent className="py-8 space-y-4">
                  {/* Employee and Action Info */}
                  <div className="text-center space-y-2 mb-4">
                    <h2 className="text-2xl font-bold">
                      <Camera className="w-6 h-6 inline mr-2" />
                      {t('detail_hub.punch_clock.photo_capture')}
                    </h2>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">{selectedEmployee.first_name} {selectedEmployee.last_name}</span>
                      <span>•</span>
                      <span>{selectedEmployee.employee_number}</span>
                      <span>•</span>
                      <Badge variant="outline" className="text-xs">
                        📍 {kioskConfig.name || KIOSK_ID || 'Not Configured'}
                      </Badge>
                      <span>•</span>
                      <span className="text-gray-500">{format(new Date(), 'MMM d, HH:mm')}</span>
                    </div>
                  </div>

                  {/* Camera preview or captured photo */}
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                    {!capturedPhoto ? (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        {/* Face guide overlay - ENHANCED */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="relative">
                            <div className="w-64 h-80 border-4 border-emerald-500 rounded-2xl animate-pulse-border" />
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg animate-fade-in whitespace-nowrap">
                              {t('detail_hub.punch_clock.messages.position_face')}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <img
                        src={capturedPhoto}
                        alt={t('detail_hub.punch_clock.captured_photo_alt')}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Status message */}
                  <Alert>
                    <AlertDescription className="text-center">
                      {photoUploadStatus}
                    </AlertDescription>
                  </Alert>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    {!capturedPhoto ? (
                      <>
                        <Button
                          variant="outline"
                          size="lg"
                          className="flex-1"
                          onClick={handleCancelCapture}
                        >
                          {t('detail_hub.punch_clock.cancel')}
                        </Button>
                        <Button
                          size="lg"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={handleCapturePhoto}
                        >
                          <Camera className="w-5 h-5 mr-2" />
                          {t('detail_hub.punch_clock.capture')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="lg"
                          className="flex-1"
                          onClick={handleRetake}
                        >
                          <RotateCcw className="w-5 h-5 mr-2" />
                          {t('detail_hub.punch_clock.retake_photo')}
                        </Button>
                        <Button
                          size="lg"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={handleConfirmPunch}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              {t('detail_hub.punch_clock.messages.processing')}
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-5 h-5 mr-2" />
                              {t('detail_hub.punch_clock.confirm')}
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
              </>
            )}

            {/* Kiosk Info */}
            <Card className="card-enhanced">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Badge variant="outline">{kioskConfig.name || KIOSK_ID || 'Not Configured'}</Badge>
                    <span>{t('detail_hub.punch_clock.kiosk_mode_active')}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>{t('detail_hub.punch_clock.camera_ready')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>{t('detail_hub.punch_clock.status.online')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Custom Animations - Notion Style */}
        <style>{`
          @keyframes pulse-subtle {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.95; }
          }

          @keyframes pulse-border {
            0%, 100% { border-color: rgb(16, 185, 129); }
            50% { border-color: rgb(52, 211, 153); }
          }

          @keyframes fade-in {
            0% { opacity: 0; transform: translateY(-5px); }
            100% { opacity: 1; transform: translateY(0); }
          }

          .animate-pulse-subtle {
            animation: pulse-subtle 2s ease-in-out infinite;
          }

          .animate-pulse-border {
            animation: pulse-border 2s ease-in-out infinite;
          }

          .animate-fade-in {
            animation: fade-in 0.4s ease-out;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
