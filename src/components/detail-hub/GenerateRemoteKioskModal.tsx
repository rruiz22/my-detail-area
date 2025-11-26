import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, ExternalLink, Loader2, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface GenerateRemoteKioskModalProps {
  open: boolean;
  onClose: () => void;
  dealershipId: number;
  employees: Array<{
    id: string;
    first_name: string;
    last_name: string;
    employee_number: string;
  }>;
}

interface GeneratedToken {
  tokenId: string;
  shortCode: string;
  fullUrl: string;
  expiresAt: string;
}

export function GenerateRemoteKioskModal({
  open,
  onClose,
  dealershipId,
  employees,
}: GenerateRemoteKioskModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [expirationHours, setExpirationHours] = useState<number>(2);
  const [maxUses, setMaxUses] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<GeneratedToken | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  const handleGenerate = async () => {
    if (!selectedEmployeeId || !user) {
      setError(t('remote_kiosk_generator.error_select_employee'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call generate-remote-kiosk-url Edge Function
      const { data, error: functionError } = await supabase.functions.invoke(
        'generate-remote-kiosk-url',
        {
          body: {
            employeeId: selectedEmployeeId,
            dealershipId,
            createdBy: user.id,
            expirationHours,
            maxUses,
          },
        }
      );

      if (functionError) {
        console.error('[Remote Kiosk Generator] Function error:', functionError);
        // Try to extract more details from the error
        if (functionError.context && typeof functionError.context.json === 'function') {
          try {
            const errorBody = await functionError.context.json();
            console.error('[Remote Kiosk Generator] Error response body:', errorBody);
            throw new Error(errorBody.error || functionError.message);
          } catch (parseError) {
            console.error('[Remote Kiosk Generator] Could not parse error body:', parseError);
          }
        }
        throw functionError;
      }

      console.log('[Remote Kiosk Generator] Response data:', data);

      if (data.success) {
        setGeneratedToken({
          tokenId: data.tokenId,
          shortCode: data.shortCode,
          fullUrl: data.fullUrl,
          expiresAt: data.expiresAt,
        });

        toast({
          title: t('remote_kiosk_generator.success_title'),
          description: t('remote_kiosk_generator.success_description'),
        });
      } else {
        throw new Error(data.error || t('remote_kiosk_generator.error_generation_failed'));
      }
    } catch (err: any) {
      console.error('[Remote Kiosk Generator] Failed to generate URL:', err);
      console.error('[Remote Kiosk Generator] Error details:', {
        message: err.message,
        status: err.status,
        context: err.context
      });

      const errorMessage = err.message || t('remote_kiosk_generator.error_unknown');
      setError(errorMessage);
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedToken) return;

    try {
      await navigator.clipboard.writeText(generatedToken.fullUrl);
      setCopied(true);
      toast({
        title: t('remote_kiosk_generator.copied_title'),
        description: t('remote_kiosk_generator.copied_description'),
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[Remote Kiosk Generator] Failed to copy:', err);
      toast({
        title: t('common.error'),
        description: t('remote_kiosk_generator.error_copy_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setSelectedEmployeeId('');
    setExpirationHours(2);
    setMaxUses(1);
    setGeneratedToken(null);
    setCopied(false);
    setError(null);
    onClose();
  };

  const formatExpirationDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('remote_kiosk_generator.title')}</DialogTitle>
          <DialogDescription>
            {t('remote_kiosk_generator.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <X className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Configuration Form */}
          {!generatedToken ? (
            <div className="space-y-4">
              {/* Employee Selection */}
              <div className="space-y-2">
                <Label>{t('remote_kiosk_generator.select_employee')}</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('remote_kiosk_generator.choose_employee')} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name} (#{employee.employee_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Expiration Hours */}
              <div className="space-y-2">
                <Label>{t('remote_kiosk_generator.expiration_hours')}</Label>
                <Select
                  value={expirationHours.toString()}
                  onValueChange={(value) => setExpirationHours(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 {t('remote_kiosk_generator.hour')}</SelectItem>
                    <SelectItem value="2">2 {t('remote_kiosk_generator.hours')}</SelectItem>
                    <SelectItem value="4">4 {t('remote_kiosk_generator.hours')}</SelectItem>
                    <SelectItem value="8">8 {t('remote_kiosk_generator.hours')}</SelectItem>
                    <SelectItem value="12">12 {t('remote_kiosk_generator.hours')}</SelectItem>
                    <SelectItem value="24">24 {t('remote_kiosk_generator.hours')}</SelectItem>
                    <SelectItem value="48">48 {t('remote_kiosk_generator.hours')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('remote_kiosk_generator.expiration_hint')}
                </p>
              </div>

              {/* Max Uses */}
              <div className="space-y-2">
                <Label>{t('remote_kiosk_generator.max_uses')}</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={maxUses}
                  onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground">
                  {t('remote_kiosk_generator.max_uses_hint')}
                </p>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={!selectedEmployeeId || loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('remote_kiosk_generator.generating')}
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('remote_kiosk_generator.generate_url')}
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* Generated URL Display */
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">
                  {t('remote_kiosk_generator.generated_for')}
                </div>
                <div className="font-medium">
                  {selectedEmployee?.first_name} {selectedEmployee?.last_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  #{selectedEmployee?.employee_number}
                </div>
              </div>

              {/* Token Details */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('remote_kiosk_generator.expires_at')}:
                  </span>
                  <span className="font-medium">
                    {formatExpirationDate(generatedToken.expiresAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('remote_kiosk_generator.max_uses')}:
                  </span>
                  <span className="font-medium">
                    {maxUses} {maxUses === 1 ? t('remote_kiosk_generator.use') : t('remote_kiosk_generator.uses')}
                  </span>
                </div>
              </div>

              {/* URL Display */}
              <div className="space-y-2">
                <Label>{t('remote_kiosk_generator.generated_url')}</Label>
                <div className="flex gap-2">
                  <Input
                    value={generatedToken.fullUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button onClick={handleCopy} variant="outline" size="icon">
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center p-6 bg-white rounded-lg border">
                <div className="mb-4 text-sm font-medium text-muted-foreground">
                  {t('remote_kiosk_generator.scan_qr')}
                </div>
                <QRCodeSVG
                  value={generatedToken.fullUrl}
                  size={200}
                  level="H"
                  includeMargin
                />
                <div className="mt-4 text-xs text-muted-foreground text-center">
                  {generatedToken.shortCode}
                </div>
              </div>

              {/* Instructions */}
              <Alert>
                <QrCode className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {t('remote_kiosk_generator.instructions')}
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={handleCopy} variant="outline" className="flex-1">
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-600" />
                      {t('remote_kiosk_generator.copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      {t('remote_kiosk_generator.copy_url')}
                    </>
                  )}
                </Button>
                <Button onClick={handleClose} className="flex-1">
                  {t('common.close')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
