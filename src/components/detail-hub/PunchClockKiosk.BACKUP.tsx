import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Clock, Camera, User, CheckCircle, AlertCircle, LogIn, LogOut, Coffee, Settings } from "lucide-react";

const PunchClockKiosk = () => {
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isScanning, setIsScanning] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [lastAction, setLastAction] = useState<{
    employee: string;
    action: string;
    time: string;
    status: 'success' | 'error';
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
      
      // Simulate face recognition after 3 seconds
      setTimeout(() => {
        handlePunchAction('Clock In', 'John Smith', 'EMP001');
        stopFaceScanning();
      }, 3000);
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      setIsScanning(false);
    }
  };

  const stopFaceScanning = () => {
    setIsScanning(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
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
              <h1 className="text-4xl font-bold">Detail Hub Time Clock</h1>
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
                Punch In/Out
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Face Recognition */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Face Recognition
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
                        Scanning for face...
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <Camera className="w-16 h-16 text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground">Position your face in front of camera</p>
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
                  {isScanning ? 'Scanning...' : 'Start Face Scan'}
                </Button>
              </div>

              {/* Manual Entry */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Manual Entry
                </h3>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter Employee ID (e.g., EMP001)"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="text-lg"
                  />
                  <Button onClick={handleManualPunch} size="lg">
                    Punch
                  </Button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handlePunchAction('Break Start', 'Current User', 'EMP001')}
                >
                  <Coffee className="w-4 h-4 mr-2" />
                  Start Break
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handlePunchAction('Break End', 'Current User', 'EMP001')}
                >
                  <Coffee className="w-4 h-4 mr-2" />
                  End Break
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
                    Last Action
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
                <CardTitle>Recent Activity</CardTitle>
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
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Camera Status
                    </span>
                    <Badge className="bg-green-100 text-green-800">Online</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Face Recognition
                    </span>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Network Connection
                    </span>
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
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
            Kiosk Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PunchClockKiosk;