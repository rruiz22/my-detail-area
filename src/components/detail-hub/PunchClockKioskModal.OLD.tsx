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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
  X
} from "lucide-react";

// Photo capture utilities
import { capturePhotoFromVideo, uploadPhotoToStorage } from "@/utils/photoFallback";

// New hooks and components
import { useEmployeeSearch } from "@/hooks/useEmployeeSearch";
import { useEmployeeCurrentState } from "@/hooks/useEmployeeCurrentState";
import { EmployeeHeader } from "./punch-clock/EmployeeHeader";
import { WeekStatsCard } from "./punch-clock/WeekStatsCard";
import { NumericKeypad } from "./punch-clock/NumericKeypad";
import { PinInputDisplay } from "./punch-clock/PinInputDisplay";

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

  // Kiosk ID from props or localStorage
  const KIOSK_ID = kioskId || localStorage.getItem('kiosk_id') || 'default-kiosk';

  // Helper to check if string is valid UUID
  const isValidUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // State machine
  const [currentView, setCurrentView] = useState<KioskView>('search');
  const [selectedEmployee, setSelectedEmployee] = useState<DetailHubEmployee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pin, setPin] = useState("");
  const [pinAttempts, setPinAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

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

  // Live break timer (updates every second)
  const [breakSecondsRemaining, setBreakSecondsRemaining] = useState<number | null>(null);

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

  // Cleanup camera stream on unmount or modal close
  useEffect(() => {
    if (!open) {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
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
    }
  }, [open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
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

  // Start photo capture
  const handleStartPhotoCapture = (action: CaptureAction) => {
    setCaptureAction(action);
    setCurrentView('photo_capture');
    setCapturedPhoto(null);
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
            kioskId: isValidUUID(KIOSK_ID) ? KIOSK_ID : undefined
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
            photoUrl: uploadResult.photoUrl
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
            photoUrl: uploadResult.photoUrl
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
            photoUrl: uploadResult.photoUrl
          });
          toast({
            title: t('detail_hub.toasts.break_ended'),
            description: t('detail_hub.punch_clock.messages.processing')
          });
          break;
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-screen h-screen lg:max-w-7xl lg:w-[90vw] lg:h-[90vh] p-0 gap-0 overflow-hidden lg:rounded-xl">
        {/* Hidden title for accessibility */}
        <VisuallyHidden>
          <DialogTitle>{t('detail_hub.punch_clock.title')}</DialogTitle>
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
                {/* Header */}
                <Card className="card-enhanced lg:rounded-t-xl">
                  <CardContent className="py-8">
                    <h1 className="text-4xl font-bold text-gray-900 text-center">
                      {t('detail_hub.punch_clock.title')}
                    </h1>
                    <div className="text-6xl font-mono font-bold text-gray-700 my-4 text-center">
                      {formatTime(currentTime)}
                    </div>
                  </CardContent>
                </Card>

                {/* Search Input */}
                <Card className="card-enhanced">
                  <CardContent className="py-6">
                    <Input
                      type="text"
                      placeholder={t('detail_hub.punch_clock.search_placeholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="text-xl h-16"
                      autoFocus
                    />
                  </CardContent>
                </Card>

                {/* Search Results */}
                {searchQuery.length >= 2 && (
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
                              className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left"
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
                {/* Employee Header with Status */}
                <EmployeeHeader
                  employee={selectedEmployee}
                  statusBadge={
                    employeeState.state === 'clocked_in' ? { text: t('detail_hub.live_dashboard.active'), variant: 'success' } :
                    employeeState.state === 'on_break' ? { text: t('detail_hub.live_dashboard.on_break'), variant: 'warning' } :
                    { text: t('detail_hub.punch_clock.status.online'), variant: 'default' }
                  }
                />

                {/* Current Status Info */}
                {employeeState.currentEntry && (
                  <Card className="card-enhanced">
                    <CardContent className="py-4">
                      {employeeState.state === 'clocked_in' && (
                        <div className="text-center space-y-2">
                          <p className="text-sm text-gray-600">
                            {t('detail_hub.punch_clock.clocked_in_at', {
                              time: formatTime(new Date(employeeState.currentEntry.clock_in))
                            })}
                          </p>
                          <p className="text-xs text-gray-500">
                            📍 {KIOSK_ID}
                          </p>
                          <p className="text-3xl font-bold text-gray-900 mt-1">
                            {t('detail_hub.punch_clock.elapsed')}: {formatElapsedTime(employeeState.currentEntry.elapsed_minutes)}
                          </p>
                        </div>
                      )}

                      {employeeState.state === 'on_break' && (
                        <div className="text-center space-y-2">
                          <p className="text-sm text-amber-600">
                            {t('detail_hub.punch_clock.on_break_since', {
                              time: formatTime(new Date(employeeState.currentEntry.break_start!))
                            })}
                          </p>
                          <p className="text-xs text-gray-500">
                            📍 {KIOSK_ID}
                          </p>
                          <p className="text-3xl font-bold text-amber-700 mt-1">
                            {t('detail_hub.punch_clock.break_time')}: {formatElapsedTime(employeeState.currentEntry.break_elapsed_minutes || 0)}
                          </p>
                          {(employeeState.currentEntry.break_elapsed_minutes || 0) < 30 && (
                            <p className="text-xs text-amber-600 mt-2">
                              {30 - (employeeState.currentEntry.break_elapsed_minutes || 0)} min {t('detail_hub.punch_clock.until_minimum')}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

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
                          className="h-24 text-xl font-semibold bg-emerald-600 hover:bg-emerald-700 col-span-2"
                          onClick={() => handleStartPhotoCapture('clock_in')}
                        >
                          <LogIn className="w-8 h-8 mr-2" />
                          {t('detail_hub.live_dashboard.clock_in')}
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
              </>
            )}

            {/* ============================= */}
            {/* VIEW 4: PHOTO CAPTURE */}
            {/* ============================= */}
            {currentView === 'photo_capture' && selectedEmployee && (
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
                        📍 {KIOSK_ID}
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
                        {/* Overlay guide */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-64 h-80 border-4 border-emerald-500 rounded-lg" />
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
            )}

            {/* Kiosk Info */}
            <Card className="card-enhanced">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Badge variant="outline">{KIOSK_ID}</Badge>
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
      </DialogContent>
    </Dialog>
  );
}
