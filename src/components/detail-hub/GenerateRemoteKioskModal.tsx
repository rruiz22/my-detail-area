import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, ExternalLink, Loader2, QrCode, X, MessageSquare, Users, User as UserIcon } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
    phone: string | null;
  }>;
}

interface GeneratedToken {
  tokenId: string;
  shortCode: string;
  fullUrl: string;
  expiresAt: string;
}

interface BulkGenerationResult {
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    employee_number: string;
    phone: string | null;
  };
  token?: GeneratedToken;
  smsSent?: boolean;
  success: boolean;
  error?: string;
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

  // Mode selection
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  // Single mode states
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [generatedToken, setGeneratedToken] = useState<GeneratedToken | null>(null);
  const [copied, setCopied] = useState(false);

  // Bulk mode states
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [bulkResults, setBulkResults] = useState<BulkGenerationResult[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  // Shared states
  const [expirationHours, setExpirationHours] = useState<number>(2);
  const [maxUses, setMaxUses] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  // Bulk selection helpers
  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const toggleAll = () => {
    if (selectedEmployeeIds.length === employees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(employees.map(e => e.id));
    }
  };

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

  const handleSendSMS = async () => {
    if (!generatedToken || !selectedEmployee) return;

    // Check if employee has phone number
    if (!selectedEmployee.phone) {
      toast({
        title: t('remote_kiosk_generator.no_phone_number'),
        description: t('remote_kiosk_generator.no_phone_error', {
          name: `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
        }),
        variant: 'destructive',
      });
      return;
    }

    setSendingSMS(true);

    try {
      // Generate SMS message
      const smsMessage = t('remote_kiosk_generator.sms_message_template', {
        url: generatedToken.fullUrl,
        hours: expirationHours
      });

      // Call send-sms Edge Function
      const { data, error: smsError } = await supabase.functions.invoke('send-sms', {
        body: {
          to: selectedEmployee.phone,
          message: smsMessage,
          orderNumber: `Remote-${generatedToken.shortCode}` // For logging/tracking
        }
      });

      if (smsError) {
        console.error('[Remote Kiosk SMS] Error:', smsError);
        throw new Error(smsError.message || 'Failed to send SMS');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'SMS sending failed');
      }

      console.log('[Remote Kiosk SMS] Success:', data);

      toast({
        title: t('remote_kiosk_generator.sms_sent_title'),
        description: t('remote_kiosk_generator.sms_sent_description', {
          phone: selectedEmployee.phone
        }),
      });

    } catch (err: any) {
      console.error('[Remote Kiosk SMS] Failed to send SMS:', err);
      toast({
        title: t('remote_kiosk_generator.sms_failed_title'),
        description: t('remote_kiosk_generator.sms_failed_description', {
          error: err.message
        }),
        variant: 'destructive',
      });
    } finally {
      setSendingSMS(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (selectedEmployeeIds.length === 0 || !user) {
      setError(t('remote_kiosk_generator.error_select_employees', { defaultValue: 'Please select at least one employee' }));
      return;
    }

    setLoading(true);
    setError(null);
    setBulkResults([]);
    setBulkProgress({ current: 0, total: selectedEmployeeIds.length });

    const results: BulkGenerationResult[] = [];

    for (let i = 0; i < selectedEmployeeIds.length; i++) {
      const employeeId = selectedEmployeeIds[i];
      const employee = employees.find(e => e.id === employeeId)!;

      setBulkProgress({ current: i + 1, total: selectedEmployeeIds.length });

      try {
        // Generate token for this employee (reuse existing logic)
        const { data, error: functionError } = await supabase.functions.invoke(
          'generate-remote-kiosk-url',
          {
            body: {
              employeeId,
              dealershipId,
              createdBy: user.id,
              expirationHours,
              maxUses,
            },
          }
        );

        if (functionError) throw functionError;
        if (!data.success) throw new Error(data.error || 'Token generation failed');

        const token: GeneratedToken = {
          tokenId: data.tokenId,
          shortCode: data.shortCode,
          fullUrl: data.fullUrl,
          expiresAt: data.expiresAt,
        };

        // Try to send SMS if phone exists
        let smsSent = false;
        if (employee.phone) {
          try {
            const smsMessage = t('remote_kiosk_generator.sms_message_template', {
              url: token.fullUrl,
              hours: expirationHours
            });

            const { data: smsData, error: smsError } = await supabase.functions.invoke('send-sms', {
              body: {
                to: employee.phone,
                message: smsMessage,
                orderNumber: `Remote-${token.shortCode}`
              }
            });

            if (smsError || !smsData?.success) {
              console.error('[Bulk SMS] Failed for:', employee.first_name, smsError);
            } else {
              smsSent = true;
            }
          } catch (smsErr) {
            console.error('[Bulk SMS] Exception:', smsErr);
          }
        }

        results.push({ employee, token, smsSent, success: true });

      } catch (err: any) {
        console.error('[Bulk Generation] Failed for:', employee.first_name, err);
        results.push({ employee, success: false, error: err.message });
      }
    }

    setBulkResults(results);
    setBulkProgress(null);
    setLoading(false);

    const successCount = results.filter(r => r.success).length;
    const smsCount = results.filter(r => r.smsSent).length;

    toast({
      title: t('remote_kiosk_generator.bulk_complete_title', { defaultValue: 'Bulk Generation Complete' }),
      description: t('remote_kiosk_generator.bulk_complete_description', {
        defaultValue: '{{success}} tokens generated, {{sms}} SMS sent',
        success: successCount,
        sms: smsCount
      }),
    });
  };

  const handleClose = () => {
    setMode('single');
    setSelectedEmployeeId('');
    setSelectedEmployeeIds([]);
    setExpirationHours(2);
    setMaxUses(1);
    setGeneratedToken(null);
    setBulkResults([]);
    setBulkProgress(null);
    setCopied(false);
    setSendingSMS(false);
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

          {/* Mode Toggle */}
          {!generatedToken && bulkResults.length === 0 && (
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <Button
                variant={mode === 'single' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('single')}
                className="flex-1"
              >
                <UserIcon className="h-4 w-4 mr-2" />
                {t('remote_kiosk_generator.mode_single', { defaultValue: 'Single Employee' })}
              </Button>
              <Button
                variant={mode === 'bulk' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('bulk')}
                className="flex-1"
              >
                <Users className="h-4 w-4 mr-2" />
                {t('remote_kiosk_generator.mode_bulk', { defaultValue: 'Multiple Employees' })}
              </Button>
            </div>
          )}

          {/* Configuration Form - Single Mode */}
          {mode === 'single' && !generatedToken && (
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
          )}

          {/* Configuration Form - Bulk Mode */}
          {mode === 'bulk' && bulkResults.length === 0 && (
            <div className="space-y-4">
              {/* Employee Multi-Select */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('remote_kiosk_generator.select_employees', { defaultValue: 'Select Employees' })}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAll}
                  >
                    {selectedEmployeeIds.length === employees.length
                      ? t('remote_kiosk_generator.deselect_all', { defaultValue: 'Deselect All' })
                      : t('remote_kiosk_generator.select_all', { defaultValue: 'Select All' })
                    }
                  </Button>
                </div>

                <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                  {employees.map((employee) => (
                    <div key={employee.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`employee-${employee.id}`}
                        checked={selectedEmployeeIds.includes(employee.id)}
                        onCheckedChange={() => toggleEmployee(employee.id)}
                      />
                      <label
                        htmlFor={`employee-${employee.id}`}
                        className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {employee.first_name} {employee.last_name} (#{employee.employee_number})
                        {!employee.phone && (
                          <span className="text-xs text-amber-600 ml-2">(No phone)</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>

                {selectedEmployeeIds.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t('remote_kiosk_generator.selected_count', {
                      defaultValue: '{{count}} employee(s) selected',
                      count: selectedEmployeeIds.length
                    })}
                  </p>
                )}
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

              {/* Progress Indicator */}
              {bulkProgress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {t('remote_kiosk_generator.generating_progress', {
                        defaultValue: 'Generating {{current}} of {{total}}...',
                        current: bulkProgress.current,
                        total: bulkProgress.total
                      })}
                    </span>
                    <span className="text-muted-foreground">
                      {Math.round((bulkProgress.current / bulkProgress.total) * 100)}%
                    </span>
                  </div>
                  <Progress value={(bulkProgress.current / bulkProgress.total) * 100} />
                </div>
              )}

              {/* Generate Button */}
              <Button
                onClick={handleBulkGenerate}
                disabled={selectedEmployeeIds.length === 0 || loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('remote_kiosk_generator.generating')}
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    {t('remote_kiosk_generator.generate_bulk', {
                      defaultValue: 'Generate {{count}} Token(s)',
                      count: selectedEmployeeIds.length
                    })}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Single Token Generated Display */}
          {mode === 'single' && generatedToken && (
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
                {/* Send SMS Button - Only show if employee has phone */}
                {selectedEmployee?.phone && (
                  <Button
                    onClick={handleSendSMS}
                    disabled={sendingSMS}
                    variant="outline"
                    className="flex-1"
                  >
                    {sendingSMS ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('remote_kiosk_generator.sending_sms')}
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {t('remote_kiosk_generator.send_sms_button')}
                      </>
                    )}
                  </Button>
                )}

                {/* Copy URL Button */}
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

                {/* Close Button */}
                <Button onClick={handleClose} className="flex-1">
                  {t('common.close')}
                </Button>
              </div>
            </div>
          )}

          {/* Bulk Results Table */}
          {mode === 'bulk' && bulkResults.length > 0 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="text-xs text-emerald-600 font-medium">
                    {t('remote_kiosk_generator.bulk_success', { defaultValue: 'Successful' })}
                  </div>
                  <div className="text-2xl font-bold text-emerald-700">
                    {bulkResults.filter(r => r.success).length}
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-600 font-medium">
                    {t('remote_kiosk_generator.bulk_sms_sent', { defaultValue: 'SMS Sent' })}
                  </div>
                  <div className="text-2xl font-bold text-blue-700">
                    {bulkResults.filter(r => r.smsSent).length}
                  </div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-xs text-red-600 font-medium">
                    {t('remote_kiosk_generator.bulk_failed', { defaultValue: 'Failed' })}
                  </div>
                  <div className="text-2xl font-bold text-red-700">
                    {bulkResults.filter(r => !r.success).length}
                  </div>
                </div>
              </div>

              {/* Results Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('remote_kiosk_generator.bulk_employee', { defaultValue: 'Employee' })}</TableHead>
                      <TableHead>{t('remote_kiosk_generator.bulk_url', { defaultValue: 'URL' })}</TableHead>
                      <TableHead className="text-center">{t('remote_kiosk_generator.bulk_sms', { defaultValue: 'SMS' })}</TableHead>
                      <TableHead className="text-center">{t('remote_kiosk_generator.bulk_status', { defaultValue: 'Status' })}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkResults.map((result, index) => (
                      <TableRow key={result.employee.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {result.employee.first_name} {result.employee.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              #{result.employee.employee_number}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {result.token ? (
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-gray-50 px-2 py-1 rounded border flex-1">
                                {result.token.fullUrl}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(result.token!.fullUrl);
                                  toast({
                                    title: t('remote_kiosk_generator.copied_title'),
                                    description: t('remote_kiosk_generator.copied_description'),
                                  });
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {result.smsSent ? (
                            <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                          ) : result.employee.phone ? (
                            <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                          ) : (
                            <span className="text-xs text-muted-foreground">No phone</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {result.success ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              {t('remote_kiosk_generator.bulk_success_status', { defaultValue: 'Success' })}
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              {t('remote_kiosk_generator.bulk_failed_status', { defaultValue: 'Failed' })}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Close Button */}
              <Button onClick={handleClose} className="w-full">
                {t('common.close')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
