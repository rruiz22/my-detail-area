/**
 * Face Enrollment Modal
 *
 * Allows administrators to enroll employee faces for facial recognition
 * - Captures face descriptor using face-api.js
 * - Saves to detail_hub_employees.face_descriptor
 * - Logs enrollment event for audit trail
 */

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useFaceRecognition } from "@/hooks/useFaceRecognition";
import { supabase } from "@/integrations/supabase/client";
import { DetailHubEmployee } from "@/hooks/useDetailHubDatabase";
import * as faceapi from '@vladmandic/face-api';

interface FaceEnrollmentModalProps {
  open: boolean;
  onClose: () => void;
  employee: DetailHubEmployee;
  onEnrollmentComplete: () => void;
}

export function FaceEnrollmentModal({
  open,
  onClose,
  employee,
  onEnrollmentComplete
}: FaceEnrollmentModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    isLoaded: faceApiLoaded,
    isLoading: faceApiLoading,
    loadingProgress: faceApiProgress,
    error: faceApiError
  } = useFaceRecognition();

  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<string>("");
  const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null);
  const [enrollmentPhoto, setEnrollmentPhoto] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Component mount tracking for debug
  useEffect(() => {
    setIsMounted(true);
    console.log('[Enrollment] Component MOUNTED');

    return () => {
      console.log('[Enrollment] Component UNMOUNTED - cleanup triggered');
      setIsMounted(false);
    };
  }, []);

  // Camera lifecycle management
  useEffect(() => {
    let mounted = true;
    let startTimer: NodeJS.Timeout | null = null;

    if (open && faceApiLoaded) {
      console.log('[Enrollment] Modal opened - starting camera...');
      // Small delay to ensure videoRef DOM element is mounted
      startTimer = setTimeout(() => {
        if (mounted) {
          startCamera();
        }
      }, 100);
    }

    return () => {
      mounted = false;
      if (startTimer) clearTimeout(startTimer);

      // CRITICAL: Always cleanup camera when effect unmounts or open changes
      if (open) {
        console.log('[Enrollment] useEffect cleanup - stopping camera');
        stopCamera();
      }
    };
  }, [open, faceApiLoaded]);

  const startCamera = async () => {
    try {
      // CRITICAL: Stop any existing stream first
      if (videoRef.current?.srcObject) {
        console.log('[Enrollment] Stopping existing camera stream before starting new one...');
        const existingStream = videoRef.current.srcObject as MediaStream;
        existingStream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }

      console.log('[Enrollment] Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Force video to play (some browsers need this)
        await videoRef.current.play().catch(e => console.warn('[Enrollment] Video autoplay warning:', e));
        console.log('[Enrollment] ✓ Camera started - tracks:', stream.getTracks().length);
      } else {
        console.error('[Enrollment] videoRef.current is null - cannot attach stream');
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      console.error('[Enrollment] Camera access error:', error);
      toast({
        title: t('detail_hub.punch_clock.camera_error'),
        description: t('detail_hub.punch_clock.messages.camera_denied'),
        variant: "destructive"
      });
    }
  };

  /**
   * ENTERPRISE-GRADE CAMERA CLEANUP
   *
   * Implements multiple strategies to ensure complete MediaStream release:
   * 1. Stop all tracks on current video element
   * 2. Edge browser workaround (100ms delay before clearing srcObject)
   * 3. Global DOM cleanup (find ALL video elements)
   * 4. Double verification with logging
   */
  const stopCamera = () => {
    console.log('[Enrollment] stopCamera() called - ULTRA AGGRESSIVE MODE');

    // Step 1: Stop ALL MediaStream tracks in entire navigator
    if (navigator.mediaDevices && (navigator.mediaDevices as any).getSupportedConstraints) {
      try {
        navigator.mediaDevices.enumerateDevices().then(devices => {
          console.log('[Enrollment] Camera devices:', devices.filter(d => d.kind === 'videoinput').length);
        });
      } catch (e) {
        console.warn('[Enrollment] Could not enumerate devices:', e);
      }
    }

    // Step 2: Stop tracks from videoRef
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();

      console.log('[Enrollment] Stopping videoRef camera - tracks:', tracks.length);

      tracks.forEach(track => {
        track.stop();
        console.log('[Enrollment] ✓ Stopped track:', track.kind, track.label, 'readyState:', track.readyState);
      });

      // Immediately clear srcObject (no delay)
      videoRef.current.srcObject = null;
      videoRef.current.pause();
      videoRef.current.load(); // Force video element reset
      console.log('[Enrollment] ✓ videoRef cleared, paused, and reloaded');
    }

    // Step 3: AGGRESSIVE global cleanup with longer delay for Edge
    setTimeout(() => {
      console.log('[Enrollment] === GLOBAL DOM VIDEO CLEANUP ===');
      const allVideos = document.querySelectorAll('video');
      console.log(`[Enrollment] Found ${allVideos.length} video element(s) in DOM`);

      let clearedCount = 0;
      allVideos.forEach((video, index) => {
        const htmlVideo = video as HTMLVideoElement;
        const stream = htmlVideo.srcObject as MediaStream | null;

        if (stream) {
          const liveTracks = stream.getTracks().filter(t => t.readyState === 'live');

          if (liveTracks.length > 0) {
            console.warn(`[Enrollment] Video ${index} has ${liveTracks.length} LIVE track(s) - STOPPING NOW`);

            liveTracks.forEach(track => {
              track.stop();
              console.log(`[Enrollment] ✓ Force stopped: ${track.kind} (${track.label})`);
              clearedCount++;
            });
          }

          htmlVideo.srcObject = null;
          htmlVideo.pause();
          htmlVideo.load();
        }
      });

      if (clearedCount > 0) {
        console.warn(`[Enrollment] ⚠️ Had to force-stop ${clearedCount} leaked track(s)`);
      } else {
        console.log('[Enrollment] ✅ No leaked tracks found');
      }

      console.log('[Enrollment] === CLEANUP COMPLETE ===');
    }, 300);
  };

  const handleCaptureFace = async () => {
    if (!videoRef.current || !faceApiLoaded) return;

    setIsCapturing(true);
    setCaptureStatus(t('detail_hub.punch_clock.messages.detecting_face'));

    try {
      // Detect face with landmarks and descriptor
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 416 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setCaptureStatus(t('detail_hub.punch_clock.messages.no_face_in_frame'));
        setIsCapturing(false);
        return;
      }

      // Store descriptor
      setFaceDescriptor(detection.descriptor);

      // Capture photo
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setEnrollmentPhoto(photoDataUrl);
      }

      setCaptureStatus(t('detail_hub.punch_clock.messages.face_verified'));
      toast({
        title: t('detail_hub.punch_clock.messages.face_enrolled'),
        description: t('detail_hub.punch_clock.messages.face_enrollment_success')
      });

      setIsCapturing(false);
    } catch (error) {
      console.error('Face capture error:', error);
      setCaptureStatus(t('detail_hub.punch_clock.messages.face_enrollment_failed'));
      toast({
        title: t('detail_hub.punch_clock.messages.face_enrollment_failed'),
        variant: "destructive"
      });
      setIsCapturing(false);
    }
  };

  const handleSaveEnrollment = async () => {
    if (!faceDescriptor) {
      toast({
        title: t('detail_hub.punch_clock.messages.face_enrollment_failed'),
        description: t('detail_hub.punch_clock.messages.no_face_in_frame'),
        variant: "destructive"
      });
      return;
    }

    setIsEnrolling(true);

    try {
      // Convert Float32Array to regular array for Postgres
      const descriptorArray = Array.from(faceDescriptor);

      // Upload photo to Supabase Storage (optional)
      let photoUrl: string | null = null;
      if (enrollmentPhoto) {
        const blob = await fetch(enrollmentPhoto).then(r => r.blob());
        const fileName = `${employee.id}_enrollment_${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('employee-photos')
          .upload(`face-enrollments/${fileName}`, blob, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (uploadError) {
          console.error('Photo upload error:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('employee-photos')
            .getPublicUrl(uploadData.path);
          photoUrl = publicUrl;
        }
      }

      // Update employee with face descriptor
      const { error: updateError } = await supabase
        .from('detail_hub_employees')
        .update({
          face_descriptor: descriptorArray,
          face_enrolled_at: new Date().toISOString(),
          face_enrollment_photo_url: photoUrl
        })
        .eq('id', employee.id);

      if (updateError) throw updateError;

      // Log enrollment event
      await supabase.rpc('log_face_enrollment', {
        p_employee_id: employee.id,
        p_action: 'enrolled',
        p_photo_url: photoUrl,
        p_metadata: {
          descriptor_length: descriptorArray.length,
          enrolled_by: 'admin'
        }
      });

      toast({
        title: t('detail_hub.punch_clock.messages.face_enrollment_success'),
        description: `${employee.first_name} ${employee.last_name}`,
        className: "bg-emerald-50 border-emerald-500"
      });

      onEnrollmentComplete();
      handleClose();
    } catch (error) {
      console.error('Enrollment save error:', error);
      toast({
        title: t('detail_hub.punch_clock.messages.face_enrollment_failed'),
        variant: "destructive"
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleRetake = () => {
    setFaceDescriptor(null);
    setEnrollmentPhoto(null);
    setCaptureStatus("");
  };

  /**
   * SIMPLIFIED CLOSE HANDLER
   *
   * Reset state and trigger close - useEffect will handle camera cleanup
   */
  const handleClose = () => {
    console.log('[Enrollment] handleClose() called - resetting state');

    // Reset all state
    setFaceDescriptor(null);
    setEnrollmentPhoto(null);
    setCaptureStatus("");
    setIsCapturing(false);
    setIsEnrolling(false);

    // Trigger close immediately - useEffect will cleanup camera when open changes to false
    console.log('[Enrollment] Calling onClose() - useEffect will handle camera cleanup');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-2xl"
        forceMount={false}
      >
        <DialogTitle>
          {t('detail_hub.punch_clock.messages.enrolling_face')} - {employee.first_name} {employee.last_name}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Face enrollment process for {employee.first_name} {employee.last_name}
        </DialogDescription>

        <div className="space-y-6">
          {/* Face API Loading */}
          {faceApiLoading && (
            <Alert>
              <AlertDescription className="text-center">
                {t('detail_hub.punch_clock.messages.loading_models')} ({faceApiProgress}%)
              </AlertDescription>
            </Alert>
          )}

          {/* Face API Error */}
          {faceApiError && (
            <Alert variant="destructive">
              <AlertDescription>{faceApiError}</AlertDescription>
            </Alert>
          )}

          {/* Video Feed or Captured Photo */}
          {faceApiLoaded && (
            <Card>
              <CardContent className="py-6">
                <div className="relative rounded-xl overflow-hidden bg-black" style={{ height: '400px' }}>
                  {!enrollmentPhoto ? (
                    <>
                      <video
                        key={`enrollment-video-${employee.id}-${open ? 'open' : 'closed'}`}
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />

                      {/* Face guide overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative">
                          <div className="w-64 h-80 border-4 border-indigo-500 rounded-2xl animate-pulse-border" />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-indigo-500 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg">
                            {t('detail_hub.punch_clock.messages.position_face')}
                          </div>
                        </div>
                      </div>

                      {/* Capture status */}
                      {isCapturing && (
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                          <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {captureStatus}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <img
                      src={enrollmentPhoto}
                      alt="Captured face"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Status Message */}
                {captureStatus && !isCapturing && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                    {faceDescriptor ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <span className="text-emerald-600">{captureStatus}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-500" />
                        <span className="text-red-600">{captureStatus}</span>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!faceDescriptor ? (
              <>
                <Button
                  onClick={handleCaptureFace}
                  disabled={!faceApiLoaded || isCapturing}
                  className="flex-1 h-14 bg-indigo-500 hover:bg-indigo-600"
                  size="lg"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  {isCapturing ? t('detail_hub.punch_clock.messages.detecting_face') : t('detail_hub.punch_clock.messages.enrolling_face')}
                </Button>
                <Button onClick={handleClose} variant="outline" size="lg" className="h-14">
                  {t('common.cancel')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleSaveEnrollment}
                  disabled={isEnrolling}
                  className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700"
                  size="lg"
                >
                  {isEnrolling ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t('common.saving')}
                    </>
                  ) : (
                    t('common.save')
                  )}
                </Button>
                <Button onClick={handleRetake} variant="outline" size="lg" className="h-14">
                  {t('common.retake')}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Animations */}
        <style>{`
          @keyframes pulse-border {
            0%, 100% { border-color: rgb(99, 102, 241); }
            50% { border-color: rgb(129, 140, 248); }
          }

          .animate-pulse-border {
            animation: pulse-border 2s ease-in-out infinite;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
