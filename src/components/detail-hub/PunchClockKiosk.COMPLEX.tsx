import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Clock, Camera, User, CheckCircle, AlertCircle, LogIn, LogOut, Coffee, Settings, RotateCcw } from "lucide-react";
// Face detection utilities (DISABLED - omitido por ahora, solo photo capture)
// import { loadFaceDetectionModels, detectFace, areModelsLoaded } from "@/utils/faceDetection";
// Photo capture utilities (MAIN METHOD - no longer fallback)
import { capturePhotoFromVideo, uploadPhotoToStorage } from "@/utils/photoFallback";
// Detail Hub integration hook (PHASE 5 - for real time entry creation)
import { useDetailHubIntegration } from "@/hooks/useDetailHubIntegration";
// OPCIÓN A: Real database queries (NEW - optional, toggle with useMockData)
import { useClockIn, getEmployeeByNumber } from "@/hooks/useDetailHubDatabase";
import { useDealerFilter } from "@/contexts/DealerFilterContext";

const PunchClockKiosk = () => {
  const { t } = useTranslation();
  const { clockIn: mockClockIn } = useDetailHubIntegration(); // Mock hook
  const { mutateAsync: realClockIn } = useClockIn(); // OPCIÓN A: Real database hook
  const { selectedDealerId } = useDealerFilter();
  const [currentTime, setCurrentTime] = useState(new Date());

  // OPCIÓN A: Toggle between mock and real database (default: MOCK for safety)
  const [useRealDatabase, setUseRealDatabase] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [lastAction, setLastAction] = useState<{
    employee: string;
    action: string;
    time: string;
    status: 'success' | 'error';
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Face detection states (DISABLED - omitido por ahora)
  // const [isScanning, setIsScanning] = useState(false);
  // const [useFaceDetection, setUseFaceDetection] = useState(false);
  // const [modelsLoaded, setModelsLoaded] = useState(false);
  // const [faceDetectionStatus, setFaceDetectionStatus] = useState<string>("Loading models...");
  // const detectionIntervalRef = useRef<number | null>(null);

  // Photo capture states (NOW MAIN METHOD - not fallback)
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photoUploadStatus, setPhotoUploadStatus] = useState<string>("");
  const [captureMode, setCaptureMode] = useState<'in' | 'out'>('in'); // Track if capturing for clock in or out

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load face detection models (DISABLED - omitido, solo usando photo capture)
  // useEffect(() => {
  //   const loadModels = async () => {
  //     if (!useFaceDetection) {
  //       setFaceDetectionStatus("Simulated mode (no models needed)");
  //       return;
  //     }
  //     try {
  //       setFaceDetectionStatus("Loading face detection models...");
  //       await loadFaceDetectionModels();
  //       setModelsLoaded(true);
  //       setFaceDetectionStatus("Ready for face detection");
  //     } catch (error) {
  //       console.error("❌ Failed to load face detection models:", error);
  //       setFaceDetectionStatus("Failed to load models - using simulated mode");
  //       setUseFaceDetection(false);
  //     }
  //   };
  //   loadModels();
  // }, [useFaceDetection]);

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

  const startFaceScanning = async () => {
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Choose between real face detection or simulated mode
      if (useFaceDetection && modelsLoaded && videoRef.current) {
        // REAL FACE DETECTION MODE (NEW)
        setFaceDetectionStatus("Detecting face...");

        // Start detection loop (every 500ms)
        detectionIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current) return;

          try {
            const result = await detectFace(videoRef.current);

            if (result.detected && result.qualityCheck.passed) {
              // Face detected with good quality!
              setFaceDetectionStatus(`Face detected! Confidence: ${(result.confidence * 100).toFixed(0)}%`);

              // Simulate employee recognition (in real app, this would call AWS Rekognition Edge Function)
              handlePunchAction('Clock In', 'John Smith', 'EMP001');
              stopFaceScanning();
            } else {
              // Show quality feedback
              const issues = result.qualityCheck.issues;
              if (issues.length > 0) {
                setFaceDetectionStatus(issues[0]); // Show first issue
              } else {
                setFaceDetectionStatus("No face detected - please position yourself");
              }
            }
          } catch (error) {
            console.error("Face detection error:", error);
            // Continue trying
          }
        }, 500); // Check every 500ms
      } else {
        // SIMULATED MODE (ORIGINAL BEHAVIOR - PRESERVED)
        setFaceDetectionStatus("Simulated scan in progress...");
        setTimeout(() => {
          handlePunchAction('Clock In', 'John Smith', 'EMP001');
          stopFaceScanning();
        }, 3000);
      }

    } catch (error) {
      console.error('Error accessing camera:', error);
      setIsScanning(false);
      setFaceDetectionStatus("Camera access denied");
    }
  };

  const stopFaceScanning = () => {
    setIsScanning(false);

    // Clean up detection interval if running
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    // Clean up video stream
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    setFaceDetectionStatus(useFaceDetection && modelsLoaded ? "Ready for face detection" : "Simulated mode");
  };

  const handleManualPunch = () => {
    if (employeeId.trim()) {
      // Simulate employee lookup
      const employee = employeeId === 'EMP001' ? 'John Smith' : 
                     employeeId === 'EMP002' ? 'Maria Garcia' : 
                     employeeId === 'EMP003' ? 'Mike Johnson' : 
                     'Unknown Employee';
      
      if (employee !== 'Unknown Employee') {
        handlePunchAction('Clock In', employee, employeeId);
        setEmployeeId("");
      } else {
        setLastAction({
          employee: employeeId,
          action: 'Invalid ID',
          time: formatTime(currentTime),
          status: 'error'
        });
      }
    }
  };

  const handlePunchAction = (action: string, employee: string, id: string) => {
    setLastAction({
      employee: `${employee} (${id})`,
      action,
      time: formatTime(currentTime),
      status: 'success'
    });
  };

  // PHASE 5: Manual Photo Capture (NEW - alternative to face recognition)
  const handleManualPhotoCapture = async () => {
    setShowPhotoCapture(true);
    setPhotoUploadStatus("Preparing camera...");

    try {
      // Start camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setPhotoUploadStatus("Position yourself and click 'Capture'");
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setPhotoUploadStatus("Camera access denied");
      setShowPhotoCapture(false);
    }
  };

  const captureAndUploadPhoto = async () => {
    if (!videoRef.current) return;

    setPhotoUploadStatus("Capturing photo...");

    try {
      // Capture photo from video
      const photoData = capturePhotoFromVideo(videoRef.current, 0.85);

      if (!photoData) {
        setPhotoUploadStatus("Failed to capture photo");
        return;
      }

      setCapturedPhoto(photoData);
      setPhotoUploadStatus("Uploading to storage...");

      // Upload to Supabase Storage
      const result = await uploadPhotoToStorage(photoData, {
        employeeId: employeeId || 'unknown',
        dealershipId: 5, // TODO: Get from context
        action: 'clock_in'
      });

      if (result.success && result.photoUrl) {
        setPhotoUploadStatus(`✓ Photo saved! Creating time entry...`);

        try {
          // OPCIÓN A: Choose between mock or real database
          if (useRealDatabase) {
            // REAL DATABASE (Supabase + TanStack Query)
            const dealershipId = selectedDealerId !== 'all' ? selectedDealerId : 5; // Fallback to dealer 5

            await realClockIn({
              employeeId: employeeId || 'unknown',
              dealershipId,
              method: 'photo_fallback',
              photoUrl: result.photoUrl,
              faceConfidence: undefined
            });

            setPhotoUploadStatus(`✓ Punch recorded! Awaiting supervisor approval.`);
          } else {
            // MOCK DATABASE (Original behavior - SAFE)
            const timeEntryResult = await mockClockIn(
              employeeId || 'unknown',
              'photo_fallback',
              {
                photoUrl: result.photoUrl,
                faceConfidence: undefined
              }
            );

            if (!timeEntryResult.data) {
              setPhotoUploadStatus(`Time entry failed`);
              return;
            }

            setPhotoUploadStatus(`✓ Punch recorded! (Mock mode)`);
          }

          // Show success in UI (for visual feedback)
          handlePunchAction('Clock In (Photo)', employeeId || 'Manual Capture', employeeId || 'PHOTO');

          // Clean up after 3 seconds
          setTimeout(() => {
            cancelPhotoCapture();
            setEmployeeId(""); // Clear employee ID
          }, 3000);

        } catch (error) {
          console.error('Time entry creation failed:', error);
          setPhotoUploadStatus(`Time entry failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        setPhotoUploadStatus(`Upload failed: ${result.storageError}`);
      }

    } catch (error) {
      console.error('Photo capture error:', error);
      setPhotoUploadStatus("Photo capture failed");
    }
  };

  const cancelPhotoCapture = () => {
    setShowPhotoCapture(false);
    setCapturedPhoto(null);
    setPhotoUploadStatus("");

    // Stop camera
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const recentPunches = [
    { employee: 'John Smith', action: 'Clock In', time: '8:00 AM', status: 'success' as const },
    { employee: 'Maria Garcia', action: 'Break Start', time: '10:15 AM', status: 'success' as const },
    { employee: 'Mike Johnson', action: 'Clock Out', time: '5:30 PM', status: 'success' as const },
    { employee: 'Sarah Wilson', action: 'Clock In', time: '8:45 AM', status: 'error' as const }
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
              {/* Face Recognition */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  {t('detail_hub.punch_clock.face_recognition')}
                </h3>
                
                {isScanning ? (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-64 bg-black rounded-lg object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-blue-500 rounded-lg animate-pulse" />
                    </div>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-600 text-white">
                        {faceDetectionStatus}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <Camera className="w-16 h-16 text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground">{t('detail_hub.punch_clock.messages.position_face')}</p>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={isScanning ? stopFaceScanning : startFaceScanning}
                  className="w-full"
                  size="lg"
                  disabled={isScanning}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {isScanning ? t('detail_hub.punch_clock.scanning') : t('detail_hub.punch_clock.start_face_scan')}
                </Button>
              </div>

              {/* Manual Entry */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {t('detail_hub.punch_clock.manual_entry')}
                </h3>

                <div className="flex gap-2">
                  <Input
                    placeholder={t('detail_hub.punch_clock.placeholders.enter_employee_id')}
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="text-lg"
                  />
                  <Button onClick={handleManualPunch} size="lg">
                    {t('detail_hub.punch_clock.punch')}
                  </Button>
                </div>
              </div>

              {/* Photo Fallback (PHASE 5 - NEW) */}
              {!showPhotoCapture ? (
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handleManualPhotoCapture}
                    className="w-full"
                    disabled={isScanning}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {t('detail_hub.punch_clock.capture_photo_manually')}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {t('detail_hub.punch_clock.messages.for_manual_verification')}
                  </p>
                </div>
              ) : (
                <div className="pt-4 border-t space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    {t('detail_hub.punch_clock.photo_capture')}
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
                          ✓ Captured
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

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePunchAction('Break Start', 'Current User', 'EMP001')}
                >
                  <Coffee className="w-4 h-4 mr-2" />
                  {t('detail_hub.punch_clock.start_break')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePunchAction('Break End', 'Current User', 'EMP001')}
                >
                  <Coffee className="w-4 h-4 mr-2" />
                  {t('detail_hub.punch_clock.end_break')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Status & Recent Activity */}
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
                    <Badge className="bg-green-100 text-green-800">{t('detail_hub.punch_clock.status.online')}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {t('detail_hub.punch_clock.status.face_recognition')}
                    </span>
                    <Badge className={modelsLoaded ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                      {useFaceDetection ? (modelsLoaded ? t('detail_hub.punch_clock.status.real') : t('detail_hub.punch_clock.status.loading')) : t('detail_hub.punch_clock.status.simulated')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {t('detail_hub.punch_clock.status.network_connection')}
                    </span>
                    <Badge className="bg-green-100 text-green-800">{t('detail_hub.punch_clock.status.connected')}</Badge>
                  </div>

                  {/* Toggle for Real Face Detection (Developer/Testing feature) */}
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t('detail_hub.punch_clock.toggles.enable_real_face_detection')}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUseFaceDetection(!useFaceDetection)}
                        disabled={isScanning}
                      >
                        {useFaceDetection ? t('detail_hub.punch_clock.toggles.enabled') : t('detail_hub.punch_clock.toggles.disabled')}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {useFaceDetection
                        ? t('detail_hub.punch_clock.toggles.using_models')
                        : t('detail_hub.punch_clock.toggles.using_simulated')}
                    </p>
                  </div>

                  {/* Toggle for Real Database (OPCIÓN A - Developer/Testing feature) */}
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t('detail_hub.punch_clock.toggles.use_real_database')}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUseRealDatabase(!useRealDatabase)}
                        disabled={isScanning}
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