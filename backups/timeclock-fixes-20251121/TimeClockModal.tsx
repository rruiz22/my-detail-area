/**
 * TimeClockModal Component
 *
 * @deprecated This component is deprecated and will be removed in a future version.
 * Use PunchClockKioskModal instead for enhanced security and features.
 *
 * Issues with this component:
 * - No PIN authentication (security risk)
 * - No schedule validation
 * - No break management
 * - Database toggle in production (security risk)
 * - Uses forbidden bright blue colors
 *
 * Migration path: Replace with <PunchClockKioskModal />
 */

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Clock, Camera, LogIn, LogOut, CheckCircle, RotateCcw } from "lucide-react";
// Photo capture utilities
import { capturePhotoFromVideo, uploadPhotoToStorage } from "@/utils/photoFallback";
// Database hooks
import { useDetailHubIntegration } from "@/hooks/useDetailHubIntegration";
import { useClockIn, useClockOut } from "@/hooks/useDetailHubDatabase";
import { useDealerFilter } from "@/contexts/DealerFilterContext";

interface TimeClockModalProps {
  open: boolean;
  onClose: () => void;
}

export function TimeClockModal({ open, onClose }: TimeClockModalProps) {
  const { t } = useTranslation();
  const { clockIn: mockClockIn, clockOut: mockClockOut } = useDetailHubIntegration();
  const { mutateAsync: realClockIn } = useClockIn();
  const { mutateAsync: realClockOut } = useClockOut();
  const { selectedDealerId } = useDealerFilter();

  // State
  const [currentTime, setCurrentTime] = useState(new Date());
  const [employeeId, setEmployeeId] = useState("");
  const [lastAction, setLastAction] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Database toggle
  const [useRealDatabase, setUseRealDatabase] = useState(true); // Default: REAL for production

  // Photo capture states
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photoUploadStatus, setPhotoUploadStatus] = useState<string>("");
  const [captureMode, setCaptureMode] = useState<'in' | 'out'>('in');

  // Update clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Format helpers
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Start photo capture
  const handleStartPhotoCapture = (mode: 'in' | 'out') => {
    if (!employeeId.trim()) {
      setPhotoUploadStatus("Please enter Employee ID first");
      return;
    }

    setCaptureMode(mode);
    setShowPhotoCapture(true);
    setPhotoUploadStatus(t('detail_hub.punch_clock.messages.preparing_camera'));

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
    })
    .then(stream => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setPhotoUploadStatus(t('detail_hub.punch_clock.messages.position_and_capture'));
      }
    })
    .catch(error => {
      console.error('Camera error:', error);
      setPhotoUploadStatus(t('detail_hub.punch_clock.messages.camera_denied'));
      setShowPhotoCapture(false);
    });
  };

  // Capture and upload
  const captureAndUploadPhoto = async () => {
    if (!videoRef.current) return;

    setPhotoUploadStatus(t('detail_hub.punch_clock.messages.capturing_photo'));

    try {
      const photoData = capturePhotoFromVideo(videoRef.current, 0.85);
      if (!photoData) {
        setPhotoUploadStatus(t('detail_hub.punch_clock.messages.photo_capture_failed'));
        return;
      }

      setCapturedPhoto(photoData);
      setPhotoUploadStatus(t('detail_hub.punch_clock.messages.uploading'));

      const dealershipId = selectedDealerId !== 'all' ? selectedDealerId : 5;
      const result = await uploadPhotoToStorage(photoData, {
        employeeId,
        dealershipId,
        action: captureMode === 'in' ? 'clock_in' : 'clock_out'
      });

      if (!result.success) {
        setPhotoUploadStatus(t('detail_hub.punch_clock.messages.upload_failed', { error: result.storageError }));
        return;
      }

      setPhotoUploadStatus("Creating time entry...");

      // Create/update time entry
      if (useRealDatabase) {
        if (captureMode === 'in') {
          await realClockIn({
            employeeId,
            dealershipId,
            method: 'photo_fallback',
            photoUrl: result.photoUrl
          });
        } else {
          await realClockOut({
            employeeId,
            method: 'photo_fallback',
            photoUrl: result.photoUrl
          });
        }
        setPhotoUploadStatus(t('detail_hub.punch_clock.messages.punch_recorded_real'));
      } else {
        if (captureMode === 'in') {
          await mockClockIn(employeeId, 'photo_fallback', { photoUrl: result.photoUrl });
        } else {
          await mockClockOut(employeeId);
        }
        setPhotoUploadStatus(t('detail_hub.punch_clock.messages.punch_recorded_mock'));
      }

      const actionText = captureMode === 'in' ? t('detail_hub.toasts.clocked_in') : t('detail_hub.toasts.clocked_out');
      setLastAction(`${actionText} - ${employeeId}`);

      // Auto-close camera after 3s
      setTimeout(() => {
        cancelPhotoCapture();
      }, 3000);

    } catch (error) {
      console.error('Photo capture error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setPhotoUploadStatus(t('detail_hub.punch_clock.messages.time_entry_failed', { error: errorMsg }));
    }
  };

  // Cancel photo capture
  const cancelPhotoCapture = () => {
    setShowPhotoCapture(false);
    setCapturedPhoto(null);
    setPhotoUploadStatus("");

    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        {/* Deprecation Warning */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                {t('detail_hub.punch_clock.deprecated_warning')}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                {t('detail_hub.punch_clock.deprecated_message')}
              </p>
            </div>
          </div>
        </div>

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {t('detail_hub.punch_clock.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Time Display */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="text-3xl font-mono font-bold text-blue-600">
                  {formatTime(currentTime)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee ID Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Employee ID</label>
            <Input
              placeholder={t('detail_hub.punch_clock.placeholders.enter_employee_id')}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="text-lg"
              autoFocus
            />
          </div>

          {/* Photo Capture or Buttons */}
          {!showPhotoCapture ? (
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleStartPhotoCapture('in')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-20"
                size="lg"
                disabled={!employeeId.trim()}
              >
                <div className="flex flex-col items-center">
                  <LogIn className="w-6 h-6 mb-1" />
                  <span>Clock In</span>
                </div>
              </Button>
              <Button
                onClick={() => handleStartPhotoCapture('out')}
                className="w-full bg-red-600 hover:bg-red-700 h-20"
                size="lg"
                disabled={!employeeId.trim()}
              >
                <div className="flex flex-col items-center">
                  <LogOut className="w-6 h-6 mb-1" />
                  <span>Clock Out</span>
                </div>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Camera className="w-4 h-4" />
                {captureMode === 'in' ? 'Clock In Photo' : 'Clock Out Photo'}
              </h3>

              {/* Photo Preview or Video */}
              {capturedPhoto ? (
                <div className="relative">
                  <img
                    src={capturedPhoto}
                    alt="Captured photo"
                    className="w-full h-64 rounded-lg object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-600 text-white">
                      {t('detail_hub.photo_review.captured')}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-64 bg-black rounded-lg object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-64 border-2 border-emerald-500 rounded-lg" />
                  </div>
                </div>
              )}

              {/* Status */}
              {photoUploadStatus && (
                <div className="text-center">
                  <Badge variant="outline">{photoUploadStatus}</Badge>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {!capturedPhoto ? (
                  <>
                    <Button variant="outline" onClick={cancelPhotoCapture} className="flex-1">
                      {t('detail_hub.punch_clock.cancel')}
                    </Button>
                    <Button onClick={captureAndUploadPhoto} className="flex-1">
                      <Camera className="w-4 h-4 mr-2" />
                      {t('detail_hub.punch_clock.capture')}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCapturedPhoto(null);
                      setPhotoUploadStatus("");
                    }}
                    className="w-full"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {t('detail_hub.punch_clock.retake_photo')}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Last Action Feedback */}
          {lastAction && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-sm font-medium text-green-800">{lastAction}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
