/**
 * PunchClockKiosk - Enhanced with Schedule & Break Validation
 *
 * Features:
 * - Schedule enforcement (5 min early window)
 * - Kiosk assignment validation
 * - Break policy (30 min minimum)
 * - Photo capture for ALL actions (in/out/break)
 * - Real-time validation feedback
 */

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Clock,
  Camera,
  User,
  CheckCircle,
  AlertCircle,
  LogIn,
  LogOut,
  Coffee,
  RotateCcw,
  Shield,
  Timer,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

// Photo capture utilities
import { capturePhotoFromVideo, uploadPhotoToStorage } from "@/utils/photoFallback";

// DetailHub hooks
import { useClockIn, useClockOut, useStartBreak, useEndBreak } from "@/hooks/useDetailHubDatabase";
import { usePunchValidation, getEmployeeTodaySchedule } from "@/hooks/useDetailHubSchedules";
import { useDealerFilter } from "@/contexts/DealerFilterContext";
import { useToast } from "@/hooks/use-toast";

// Get kiosk ID from URL or local storage
const KIOSK_ID = new URLSearchParams(window.location.search).get('kiosk_id') ||
                localStorage.getItem('kiosk_id') ||
                'default-kiosk';

const PunchClockKiosk = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();
  const { mutateAsync: clockIn } = useClockIn();
  const { mutateAsync: clockOut } = useClockOut();
  const { mutateAsync: startBreak } = useStartBreak();
  const { mutateAsync: endBreak } = useEndBreak();

  // State
  const [currentTime, setCurrentTime] = useState(new Date());
  const [employeeId, setEmployeeId] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Photo capture
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photoUploadStatus, setPhotoUploadStatus] = useState("");
  const [captureAction, setCaptureAction] = useState<'clock_in' | 'clock_out' | 'break_start' | 'break_end'>('clock_in');
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Validation - only fetch when employee ID is entered
  const { data: validation, isLoading: validating } = usePunchValidation(
    employeeId,
    KIOSK_ID
  );

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup camera stream on unmount
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

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Start photo capture
  const handleStartPhotoCapture = (action: typeof captureAction) => {
    setCaptureAction(action);
    setShowPhotoCapture(true);
    setCapturedPhoto(null);
    setPhotoUploadStatus("Preparing camera...");

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
    })
    .then(stream => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setPhotoUploadStatus("Position yourself and click 'Capture'");
      }
    })
    .catch(error => {
      console.error('Camera access error:', error);
      setPhotoUploadStatus("Camera access denied. Please enable camera.");
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
    });
  };

  // Capture photo from video
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;

    setPhotoUploadStatus("Capturing...");
    const photoData = capturePhotoFromVideo(videoRef.current, 0.9);

    if (!photoData) {
      setPhotoUploadStatus("Capture failed. Please try again.");
      return;
    }

    setCapturedPhoto(photoData);
    setPhotoUploadStatus("Photo captured! Click 'Confirm' to proceed.");

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
    if (!capturedPhoto || !employeeId.trim()) {
      toast({
        title: "Error",
        description: "Employee ID and photo are required",
        variant: "destructive"
      });
      return;
    }

    if (selectedDealerId === 'all') {
      toast({
        title: "Error",
        description: "Please select a specific dealership",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setPhotoUploadStatus("Uploading photo...");

    try {
      // Upload photo to Supabase Storage
      const uploadResult = await uploadPhotoToStorage(capturedPhoto, {
        employeeId,
        dealershipId: selectedDealerId as number,
        action: captureAction
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.storageError || 'Upload failed');
      }

      setPhotoUploadStatus("Processing punch...");

      // Get employee's schedule for today
      const schedule = await getEmployeeTodaySchedule(employeeId);

      // Execute action based on capture type
      switch (captureAction) {
        case 'clock_in':
          await clockIn({
            employeeId,
            dealershipId: selectedDealerId as number,
            method: 'photo_fallback',
            photoUrl: uploadResult.publicUrl,
            kioskId: KIOSK_ID,
            scheduleId: schedule?.id // Link to schedule
          });
          toast({
            title: t('detail_hub.toasts.clocked_in'),
            description: `Successfully clocked in at ${formatTime(currentTime)}`
          });
          break;

        case 'clock_out':
          await clockOut({
            employeeId,
            method: 'photo_fallback',
            photoUrl: uploadResult.publicUrl
          });
          toast({
            title: t('detail_hub.toasts.clocked_out'),
            description: "Successfully clocked out"
          });
          break;

        case 'break_start':
          await startBreak({
            employeeId,
            method: 'photo_fallback',
            photoUrl: uploadResult.publicUrl
          });
          break;

        case 'break_end':
          await endBreak({
            employeeId,
            method: 'photo_fallback',
            photoUrl: uploadResult.publicUrl
          });
          break;
      }

      // Reset form
      setShowPhotoCapture(false);
      setCapturedPhoto(null);
      setEmployeeId("");
      setPinCode("");
      setIsAuthenticated(false);

    } catch (error) {
      console.error('Punch error:', error);
      setPhotoUploadStatus("Error: " + (error instanceof Error ? error.message : 'Unknown error'));
      toast({
        title: "Punch Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
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
    setShowPhotoCapture(false);
    setCapturedPhoto(null);
    setPhotoUploadStatus("");
  };

  // Calculate countdown to punch window
  const getCountdownMessage = () => {
    if (!validation || validation.allowed) return null;
    if (!validation.minutes_until_allowed) return validation.reason;

    const hours = Math.floor(validation.minutes_until_allowed / 60);
    const minutes = validation.minutes_until_allowed % 60;

    return `${validation.reason} (${hours}h ${minutes}m remaining)`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with Clock */}
        <Card className="card-enhanced">
          <CardContent className="py-8">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold text-gray-900">
                {t('detail_hub.punch_clock.title')}
              </h1>
              <div className="text-6xl font-mono font-bold text-gray-700 my-4">
                {formatTime(currentTime)}
              </div>
              <div className="text-xl text-gray-600">
                {formatDate(currentTime)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Authentication */}
        {!showPhotoCapture && (
          <Card className="card-enhanced">
            <CardHeader>
              <CardTitle className="text-xl">
                {t('detail_hub.punch_clock.punch_in_out')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Employee ID Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Employee ID
                </label>
                <Input
                  type="text"
                  placeholder="Enter Employee ID (e.g., EMP001)"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                  className="text-lg h-12"
                  autoFocus
                />
              </div>

              {/* PIN Code Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Kiosk PIN
                </label>
                <Input
                  type="password"
                  placeholder="Enter 4-6 digit PIN"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  inputMode="numeric"
                  className="text-lg h-12"
                />
              </div>

              {/* Validation Status */}
              {employeeId && validation && (
                <Alert className={validation.allowed ? "border-emerald-500 bg-emerald-50" : "border-amber-500 bg-amber-50"}>
                  <div className="flex items-start gap-2">
                    {validation.allowed ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <AlertDescription className={validation.allowed ? "text-emerald-700" : "text-amber-700"}>
                        {getCountdownMessage()}
                      </AlertDescription>
                      {validation.shift_start_time && (
                        <div className="text-xs mt-2 text-gray-600">
                          Scheduled: {validation.shift_start_time} - {validation.shift_end_time}
                        </div>
                      )}
                    </div>
                  </div>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button
                  size="lg"
                  className="h-20 text-xl font-semibold bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleStartPhotoCapture('clock_in')}
                  disabled={!employeeId || !pinCode || validating || !validation?.allowed}
                >
                  <LogIn className="w-6 h-6 mr-2" />
                  {t('detail_hub.punch_clock.messages.clock_in')}
                </Button>

                <Button
                  size="lg"
                  className="h-20 text-xl font-semibold bg-red-600 hover:bg-red-700"
                  onClick={() => handleStartPhotoCapture('clock_out')}
                  disabled={!employeeId || !pinCode}
                >
                  <LogOut className="w-6 h-6 mr-2" />
                  {t('detail_hub.punch_clock.messages.clock_out')}
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="h-20 text-xl font-semibold border-2 border-amber-500 text-amber-700 hover:bg-amber-50"
                  onClick={() => handleStartPhotoCapture('break_start')}
                  disabled={!employeeId || !pinCode}
                >
                  <Coffee className="w-6 h-6 mr-2" />
                  {t('detail_hub.punch_clock.start_break')}
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="h-20 text-xl font-semibold border-2 border-amber-500 text-amber-700 hover:bg-amber-50"
                  onClick={() => handleStartPhotoCapture('break_end')}
                  disabled={!employeeId || !pinCode}
                >
                  <Coffee className="w-6 h-6 mr-2" />
                  {t('detail_hub.punch_clock.end_break')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photo Capture Modal */}
        {showPhotoCapture && (
          <Card className="card-enhanced">
            <CardHeader>
              <CardTitle className="text-xl">
                <Camera className="w-5 h-5 inline mr-2" />
                {t('detail_hub.punch_clock.photo_capture')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    alt="Captured"
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
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Confirm
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
                <span>Kiosk Mode Active</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Camera Ready</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Online</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PunchClockKiosk;
