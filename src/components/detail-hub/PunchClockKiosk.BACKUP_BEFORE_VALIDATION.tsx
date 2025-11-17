/**
 * PunchClockKiosk - Simplified Version
 *
 * SIMPLIFIED: Only photo capture for punch in/out (no face recognition)
 * - Removed: Face detection, face scanning, model loading
 * - Kept: Manual photo capture, employee ID entry, database integration
 * - Added: Clock OUT with photo support
 */

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Clock, Camera, User, CheckCircle, AlertCircle, LogIn, LogOut, Settings, RotateCcw } from "lucide-react";
// Photo capture utilities (MAIN METHOD)
import { capturePhotoFromVideo, uploadPhotoToStorage } from "@/utils/photoFallback";
// Detail Hub hooks
import { useDetailHubIntegration } from "@/hooks/useDetailHubIntegration";
import { useClockIn, useClockOut } from "@/hooks/useDetailHubDatabase";
import { useDealerFilter } from "@/contexts/DealerFilterContext";

const PunchClockKiosk = () => {
  const { t } = useTranslation();
  const { clockIn: mockClockIn, clockOut: mockClockOut } = useDetailHubIntegration();
  const { mutateAsync: realClockIn } = useClockIn();
  const { mutateAsync: realClockOut } = useClockOut();
  const { selectedDealerId } = useDealerFilter();

  // State
  const [currentTime, setCurrentTime] = useState(new Date());
  const [employeeId, setEmployeeId] = useState("");
  const [lastAction, setLastAction] = useState<{
    employee: string;
    action: string;
    time: string;
    status: 'success' | 'error';
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Database mode toggle (optional)
  const [useRealDatabase, setUseRealDatabase] = useState(false);

  // Photo capture states
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photoUploadStatus, setPhotoUploadStatus] = useState<string>("");
  const [captureMode, setCaptureMode] = useState<'in' | 'out'>('in');

  // Update clock every second
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Action display helper
  const handlePunchAction = (action: string, employee: string, id: string) => {
    setLastAction({
      employee: `${employee} (${id})`,
      action,
      time: formatTime(currentTime),
      status: 'success'
    });
  };

  // Start photo capture (for clock in OR clock out)
  const handleStartPhotoCapture = (mode: 'in' | 'out') => {
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
      console.error('Camera access error:', error);
      setPhotoUploadStatus(t('detail_hub.punch_clock.messages.camera_denied'));
      setShowPhotoCapture(false);
    });
  };

  // Capture and upload photo
  const captureAndUploadPhoto = async () => {
    if (!videoRef.current || !employeeId.trim()) {
      setPhotoUploadStatus("Please enter Employee ID first");
      return;
    }

    setPhotoUploadStatus(t('detail_hub.punch_clock.messages.capturing_photo'));

    try {
      // Capture photo
      const photoData = capturePhotoFromVideo(videoRef.current, 0.85);
      if (!photoData) {
        setPhotoUploadStatus(t('detail_hub.punch_clock.messages.photo_capture_failed'));
        return;
      }

      setCapturedPhoto(photoData);
      setPhotoUploadStatus(t('detail_hub.punch_clock.messages.uploading'));

      // Upload to Storage
      const dealershipId = selectedDealerId !== 'all' ? selectedDealerId : 5;
      const result = await uploadPhotoToStorage(photoData, {
        employeeId: employeeId,
        dealershipId,
        action: captureMode === 'in' ? 'clock_in' : 'clock_out'
      });

      if (!result.success) {
        setPhotoUploadStatus(t('detail_hub.punch_clock.messages.upload_failed', { error: result.storageError }));
        return;
      }

      setPhotoUploadStatus("Creating time entry...");

      // Create time entry (clock in or clock out)
      if (useRealDatabase) {
        // REAL DATABASE
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
        // MOCK DATABASE
        if (captureMode === 'in') {
          await mockClockIn(employeeId, 'photo_fallback', { photoUrl: result.photoUrl });
        } else {
          await mockClockOut(employeeId);
        }
        setPhotoUploadStatus(t('detail_hub.punch_clock.messages.punch_recorded_mock'));
      }

      // UI feedback
      const actionText = captureMode === 'in' ? 'Clock In (Photo)' : 'Clock Out (Photo)';
      handlePunchAction(actionText, employeeId, employeeId);

      // Auto-close after 3s
      setTimeout(() => {
        cancelPhotoCapture();
        setEmployeeId("");
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

  // Recent punches (mock data for display)
  const recentPunches = [
    { employee: 'John Smith', action: 'Clock In', time: '8:00 AM', status: 'success' as const },
    { employee: 'Maria Garcia', action: 'Clock Out', time: '5:30 PM', status: 'success' as const },
    { employee: 'Mike Johnson', action: 'Clock In', time: '8:15 AM', status: 'success' as const }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold">{t('detail_hub.punch_clock.title')}</h1>
              <div className="text-3xl font-mono font-bold text-blue-600">
                {formatTime(currentTime)}
              </div>
              <p className="text-lg text-muted-foreground">
                {formatDate(currentTime)}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Punch Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {t('detail_hub.punch_clock.punch_in_out')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Employee ID Input */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Employee ID
                </h3>
                <Input
                  placeholder={t('detail_hub.punch_clock.placeholders.enter_employee_id')}
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="text-lg"
                  autoFocus
                />
              </div>

              {/* Photo Capture Section */}
              {!showPhotoCapture ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleStartPhotoCapture('in')}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      size="lg"
                      disabled={!employeeId.trim()}
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Clock In
                    </Button>
                    <Button
                      onClick={() => handleStartPhotoCapture('out')}
                      className="w-full bg-red-600 hover:bg-red-700"
                      size="lg"
                      disabled={!employeeId.trim()}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Clock Out
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Enter Employee ID above, then click Clock In or Clock Out
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    {captureMode === 'in' ? 'Clock In Photo' : 'Clock Out Photo'}
                  </h3>

                  {/* Photo Preview or Video Stream */}
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

                  {/* Status Feedback */}
                  {photoUploadStatus && (
                    <div className="text-center">
                      <Badge variant="outline">
                        {photoUploadStatus}
                      </Badge>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {!capturedPhoto ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={cancelPhotoCapture}
                          className="flex-1"
                        >
                          {t('detail_hub.punch_clock.cancel')}
                        </Button>
                        <Button
                          onClick={captureAndUploadPhoto}
                          className="flex-1"
                        >
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
            </CardContent>
          </Card>

          {/* Status & Activity */}
          <div className="space-y-6">
            {/* Last Action */}
            {lastAction && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {lastAction.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    {t('detail_hub.punch_clock.last_action')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`p-4 rounded-lg ${
                    lastAction.status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{lastAction.employee}</p>
                        <p className="text-sm text-muted-foreground">{lastAction.action}</p>
                      </div>
                      <Badge variant="outline">
                        {lastAction.time}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>{t('detail_hub.punch_clock.recent_activity')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentPunches.map((punch, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          punch.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <p className="font-medium">{punch.employee}</p>
                          <p className="text-sm text-muted-foreground">{punch.action}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {punch.time}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle>{t('detail_hub.punch_clock.status.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {t('detail_hub.punch_clock.status.camera_status')}
                    </span>
                    <Badge className="bg-green-100 text-green-800">
                      {t('detail_hub.punch_clock.status.online')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {t('detail_hub.punch_clock.status.network_connection')}
                    </span>
                    <Badge className="bg-green-100 text-green-800">
                      {t('detail_hub.punch_clock.status.connected')}
                    </Badge>
                  </div>

                  {/* Database Mode Toggle (Developer feature) */}
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t('detail_hub.punch_clock.toggles.use_real_database')}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUseRealDatabase(!useRealDatabase)}
                      >
                        {useRealDatabase ? t('detail_hub.punch_clock.toggles.enabled') : t('detail_hub.punch_clock.toggles.disabled')}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {useRealDatabase
                        ? t('detail_hub.punch_clock.toggles.saving_to_supabase')
                        : t('detail_hub.punch_clock.toggles.using_mock_data')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            {t('detail_hub.punch_clock.kiosk_settings')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PunchClockKiosk;
