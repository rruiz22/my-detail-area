import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Webcam from 'react-webcam';
import { Camera, Clock, Coffee, LogOut, Loader2, CheckCircle2, XCircle, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface TokenPayload {
  sub: string; // employee_id
  dealer: number; // dealership_id
  type: string;
  code: string; // short_code
  exp: number;
  iat: number;
}

interface EmployeeInfo {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
}

type PunchAction = 'clock_in' | 'clock_out' | 'start_break' | 'end_break';

export default function RemoteKiosk() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);

  const [token, setToken] = useState<string | null>(null);
  const [tokenPayload, setTokenPayload] = useState<TokenPayload | null>(null);
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Parse JWT token from URL
  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setError(t('remote_kiosk.error_no_token'));
      return;
    }

    try {
      // Decode JWT (without verification - backend will verify)
      const base64Url = tokenParam.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const payload: TokenPayload = JSON.parse(jsonPayload);

      console.log('[Remote Kiosk] Token decoded:', payload);

      // Check token type
      if (payload.type !== 'remote_kiosk') {
        setError(t('remote_kiosk.error_invalid_token_type'));
        return;
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        setError(t('remote_kiosk.error_token_expired'));
        return;
      }

      setToken(tokenParam);
      setTokenPayload(payload);

      // Fetch employee info
      console.log('[Remote Kiosk] Fetching employee:', { employeeId: payload.sub, dealershipId: payload.dealer });
      fetchEmployeeInfo(payload.sub, payload.dealer);
    } catch (err) {
      console.error('[Remote Kiosk] Token parsing failed:', err);
      setError(t('remote_kiosk.error_invalid_token'));
    }
  }, [searchParams, t]);

  // Update time remaining countdown
  useEffect(() => {
    if (!tokenPayload) return;

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = tokenPayload.exp - now;

      if (remaining <= 0) {
        setTimeRemaining(t('remote_kiosk.expired'));
        setError(t('remote_kiosk.error_token_expired'));
      } else {
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = remaining % 60;

        if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m`);
        } else if (minutes > 0) {
          setTimeRemaining(`${minutes}m ${seconds}s`);
        } else {
          setTimeRemaining(`${seconds}s`);
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [tokenPayload, t]);

  const fetchEmployeeInfo = async (employeeId: string, dealershipId: number) => {
    try {
      console.log('[Remote Kiosk] Querying employee with:', { employeeId, dealershipId });

      // Use anon client with proper headers for public access
      const { data, error } = await supabase
        .from('detail_hub_employees')
        .select('id, first_name, last_name, employee_number')
        .eq('id', employeeId)
        .eq('dealership_id', dealershipId)
        .eq('status', 'active')
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors if not found

      console.log('[Remote Kiosk] Employee query result:', { data, error });

      if (error) {
        console.error('[Remote Kiosk] Query error:', error);
        throw error;
      }

      if (data) {
        console.log('[Remote Kiosk] Employee found:', data);
        setEmployee({
          id: data.id,
          firstName: data.first_name,
          lastName: data.last_name,
          employeeNumber: data.employee_number
        });
      } else {
        console.log('[Remote Kiosk] No employee found with provided criteria');
        throw new Error('Employee not found');
      }
    } catch (err) {
      console.error('[Remote Kiosk] Failed to fetch employee:', err);
      setError(t('remote_kiosk.error_employee_not_found'));
    }
  };

  const capturePhoto = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setPhotoData(imageSrc);
      setShowCamera(false);
    }
  }, []);

  const handlePunch = async (action: PunchAction) => {
    if (!token || !tokenPayload) {
      setError(t('remote_kiosk.error_no_token'));
      return;
    }

    if (!pin || pin.length !== 4) {
      setError(t('remote_kiosk.error_pin_required'));
      return;
    }

    // Check if photo is required
    if ((action === 'clock_in' || action === 'clock_out') && !photoData) {
      setError(t('remote_kiosk.error_photo_required'));
      setShowCamera(true);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Get client IP and user agent
      const ipAddress = await detectIP();
      const userAgent = navigator.userAgent;

      // Call validate-remote-kiosk-punch Edge Function
      const { data, error: functionError } = await supabase.functions.invoke(
        'validate-remote-kiosk-punch',
        {
          body: {
            token,
            pin,
            action,
            photoBase64: photoData,
            ipAddress,
            userAgent
          }
        }
      );

      if (functionError) throw functionError;

      if (data.success) {
        setSuccess(data.message || t(`remote_kiosk.success_${action}`));
        setPin(''); // Clear PIN
        setPhotoData(null); // Clear photo

        // Show success for 3 seconds, then redirect or reset
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        throw new Error(data.error || t('remote_kiosk.error_unknown'));
      }
    } catch (err: any) {
      console.error('[Remote Kiosk] Punch failed:', err);
      setError(err.message || t('remote_kiosk.error_punch_failed'));
    } finally {
      setLoading(false);
    }
  };

  const detectIP = async (): Promise<string | null> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return null;
    }
  };

  // Show loading state while parsing token
  if (!token && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {t('remote_kiosk.title')}
          </CardTitle>
          <CardDescription>
            {employee ? (
              <div className="flex items-center justify-center gap-2 mt-2">
                <User className="h-4 w-4" />
                <span className="font-medium">
                  {employee.firstName} {employee.lastName}
                </span>
                <span className="text-xs text-muted-foreground">
                  (#{employee.employeeNumber})
                </span>
              </div>
            ) : (
              t('remote_kiosk.loading_employee')
            )}
          </CardDescription>
          {timeRemaining && (
            <div className="text-sm text-muted-foreground mt-2">
              {t('remote_kiosk.expires_in')}: <span className="font-medium">{timeRemaining}</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">{success}</AlertDescription>
            </Alert>
          )}

          {/* Camera Section */}
          {showCamera ? (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden bg-black">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    width: 1280,
                    height: 720,
                    facingMode: 'user'
                  }}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={capturePhoto} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" />
                  {t('remote_kiosk.capture_photo')}
                </Button>
                <Button variant="outline" onClick={() => setShowCamera(false)}>
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : photoData ? (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden border">
                <img src={photoData} alt="Captured" className="w-full" />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowCamera(true)}
                className="w-full"
              >
                {t('remote_kiosk.retake_photo')}
              </Button>
            </div>
          ) : null}

          {/* PIN Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('remote_kiosk.enter_pin')}
            </label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="text-center text-2xl tracking-widest"
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <Button
              onClick={() => handlePunch('clock_in')}
              disabled={loading || !employee || !pin || pin.length !== 4}
              className="h-20 flex-col gap-1"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Clock className="h-5 w-5" />
                  <span className="text-xs">{t('remote_kiosk.clock_in')}</span>
                </>
              )}
            </Button>

            <Button
              onClick={() => handlePunch('clock_out')}
              disabled={loading || !employee || !pin || pin.length !== 4}
              variant="secondary"
              className="h-20 flex-col gap-1"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <LogOut className="h-5 w-5" />
                  <span className="text-xs">{t('remote_kiosk.clock_out')}</span>
                </>
              )}
            </Button>

            <Button
              onClick={() => handlePunch('start_break')}
              disabled={loading || !employee || !pin || pin.length !== 4}
              variant="outline"
              className="h-20 flex-col gap-1"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Coffee className="h-5 w-5" />
                  <span className="text-xs">{t('remote_kiosk.start_break')}</span>
                </>
              )}
            </Button>

            <Button
              onClick={() => handlePunch('end_break')}
              disabled={loading || !employee || !pin || pin.length !== 4}
              variant="outline"
              className="h-20 flex-col gap-1"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Coffee className="h-5 w-5" />
                  <span className="text-xs">{t('remote_kiosk.end_break')}</span>
                </>
              )}
            </Button>
          </div>

          {/* Take Photo Button (if no photo yet) */}
          {!photoData && !showCamera && (
            <Button
              variant="outline"
              onClick={() => setShowCamera(true)}
              className="w-full mt-4"
            >
              <Camera className="h-4 w-4 mr-2" />
              {t('remote_kiosk.take_photo')}
            </Button>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            {t('remote_kiosk.powered_by')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
