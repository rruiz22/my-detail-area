import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, CheckCircle, AlertCircle, RotateCcw, User, Loader2 } from "lucide-react";

interface FacialEnrollmentProps {
  employeeId: string;
  employeeName: string;
  onComplete: (enrollmentData: any) => void;
  onCancel: () => void;
}

const FacialEnrollment = ({ employeeId, employeeName, onComplete, onCancel }: FacialEnrollmentProps) => {
  const { t } = useTranslation();
  const [enrollmentStep, setEnrollmentStep] = useState<'instructions' | 'capturing' | 'processing' | 'complete' | 'error'>('instructions');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startEnrollment = useCallback(async () => {
    try {
      setEnrollmentStep('capturing');
      setProgress(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }

      // Simulate enrollment process with multiple captures
      await performEnrollmentCaptures();

    } catch (error) {
      console.error('Error starting enrollment:', error);
      setErrorMessage('Unable to access camera. Please check permissions.');
      setEnrollmentStep('error');
    }
  }, [performEnrollmentCaptures]);

  const performEnrollmentCaptures = useCallback(async () => {
    const totalCaptures = 5;
    const captures: string[] = [];

    for (let i = 0; i < totalCaptures; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between captures

      // Capture frame
      const imageData = captureFrame();
      if (imageData) {
        captures.push(imageData);
        setCapturedImages([...captures]);
        setProgress(((i + 1) / totalCaptures) * 60); // 60% for capture phase
      }
    }

    // Processing phase
    setEnrollmentStep('processing');
    setProgress(70);

    // Simulate AWS Rekognition enrollment
    await simulateEnrollment(captures);
  }, [captureFrame, simulateEnrollment]);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return null;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  const simulateEnrollment = useCallback(async (images: string[]) => {
    try {
      // Simulate API call to AWS Rekognition
      setProgress(80);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setProgress(90);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate successful enrollment
      const enrollmentData = {
        employeeId,
        faceId: `face_${employeeId}_${Date.now()}`,
        enrollmentDate: new Date().toISOString(),
        images: images.length,
        confidence: 0.95
      };
      
      setProgress(100);
      setEnrollmentStep('complete');
      
      setTimeout(() => {
        onComplete(enrollmentData);
      }, 2000);
      
    } catch (error) {
      console.error('Enrollment failed:', error);
      setErrorMessage('Enrollment failed. Please try again.');
      setEnrollmentStep('error');
    }
  }, [employeeId, onComplete]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const resetEnrollment = () => {
    stopCamera();
    setEnrollmentStep('instructions');
    setProgress(0);
    setCapturedImages([]);
    setErrorMessage('');
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  const renderInstructions = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <User className="w-16 h-16 text-blue-600 mx-auto" />
        <div>
          <h3 className="text-xl font-semibold">Facial Recognition Enrollment</h3>
          <p className="text-muted-foreground">Setting up face ID for {employeeName}</p>
        </div>
      </div>
      
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please follow these instructions for successful enrollment:
        </AlertDescription>
      </Alert>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">1</span>
          </div>
          <p>Position your face in the center of the camera</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">2</span>
          </div>
          <p>Look directly at the camera</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">3</span>
          </div>
          <p>Remain still during the capture process</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">4</span>
          </div>
          <p>Ensure good lighting on your face</p>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={startEnrollment}>
          <Camera className="w-4 h-4 mr-2" />
          Start Enrollment
        </Button>
      </div>
    </div>
  );

  const renderCapturing = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-xl font-semibold">Capturing Face Data</h3>
        <p className="text-muted-foreground">Please remain still while we capture your face</p>
      </div>
      
      <div className="relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-64 bg-black rounded-lg object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Overlay guide */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 border-2 border-blue-500 rounded-full animate-pulse" />
        </div>
        
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-blue-600 text-white">
            Capturing... {capturedImages.length}/5
          </Badge>
        </div>
      </div>
      
      <Progress value={progress} className="w-full" />
      
      <div className="flex justify-center">
        <Button variant="outline" onClick={resetEnrollment}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Restart
        </Button>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="space-y-6 text-center">
      <Loader2 className="w-16 h-16 text-blue-600 mx-auto animate-spin" />
      <div>
        <h3 className="text-xl font-semibold">Processing Face Data</h3>
        <p className="text-muted-foreground">Creating your facial recognition profile...</p>
      </div>
      <Progress value={progress} className="w-full" />
    </div>
  );

  const renderComplete = () => (
    <div className="space-y-6 text-center">
      <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
      <div>
        <h3 className="text-xl font-semibold text-green-600">Enrollment Complete!</h3>
        <p className="text-muted-foreground">
          {employeeName} can now use facial recognition for time tracking
        </p>
      </div>
      <Progress value={100} className="w-full" />
    </div>
  );

  const renderError = () => (
    <div className="space-y-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
      
      <div className="flex justify-center space-x-2">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={resetEnrollment}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Face ID Enrollment
        </CardTitle>
      </CardHeader>
      <CardContent>
        {enrollmentStep === 'instructions' && renderInstructions()}
        {enrollmentStep === 'capturing' && renderCapturing()}
        {enrollmentStep === 'processing' && renderProcessing()}
        {enrollmentStep === 'complete' && renderComplete()}
        {enrollmentStep === 'error' && renderError()}
      </CardContent>
    </Card>
  );
};

export default FacialEnrollment;