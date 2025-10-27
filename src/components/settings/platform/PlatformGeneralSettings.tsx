import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettingsPermissions } from '@/hooks/useSettingsPermissions';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Settings, AlertCircle, Loader2, Globe, DollarSign, Calendar } from 'lucide-react';

/**
 * PlatformGeneralSettings Component
 *
 * System-wide general platform settings (system_admin only)
 *
 * FEATURES:
 * - Timezone configuration
 * - Date format preferences
 * - Currency settings
 * - Number format options
 * - Business name configuration
 * - Fiscal year settings
 * - Notion-style design (flat colors, NO gradients)
 * - Full translation support (EN/ES/PT-BR)
 * - Permission guards
 *
 * LOCATION: Settings → Platform → General
 */

interface PlatformGeneralConfig {
  timezone: string;
  dateFormat: string;
  currency: string;
  numberFormat: string;
  businessName: string;
  fiscalYearStart: number; // 1-12 (January-December)
}

const DEFAULT_CONFIG: PlatformGeneralConfig = {
  timezone: 'America/New_York',
  dateFormat: 'MM/DD/YYYY',
  currency: 'USD',
  numberFormat: '1,234.56',
  businessName: 'My Detail Area',
  fiscalYearStart: 1, // January
};

// Timezone options (common timezones)
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKST/AKDT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
  { value: 'America/Mexico_City', label: 'Mexico City (CST)' },
  { value: 'America/Bogota', label: 'Bogotá (COT)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
];

// Currency options
const CURRENCIES = [
  { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'MXN', label: 'Mexican Peso ($)', symbol: '$' },
  { value: 'COP', label: 'Colombian Peso ($)', symbol: '$' },
  { value: 'BRL', label: 'Brazilian Real (R$)', symbol: 'R$' },
  { value: 'CAD', label: 'Canadian Dollar ($)', symbol: '$' },
  { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
];

// Month names (1-12)
const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export function PlatformGeneralSettings() {
  const { t } = useTranslation();
  const perms = useSettingsPermissions();
  const queryClient = useQueryClient();

  // Local state
  const [timezone, setTimezone] = useState(DEFAULT_CONFIG.timezone);
  const [dateFormat, setDateFormat] = useState(DEFAULT_CONFIG.dateFormat);
  const [currency, setCurrency] = useState(DEFAULT_CONFIG.currency);
  const [numberFormat, setNumberFormat] = useState(DEFAULT_CONFIG.numberFormat);
  const [businessName, setBusinessName] = useState(DEFAULT_CONFIG.businessName);
  const [fiscalYearStart, setFiscalYearStart] = useState(DEFAULT_CONFIG.fiscalYearStart);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch general settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings', 'platform_general_config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'platform_general_config')
        .maybeSingle();

      if (error) throw error;

      return data?.setting_value as PlatformGeneralConfig | null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (config: PlatformGeneralConfig) => {
      // Check if setting exists first
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('setting_key', 'platform_general_config')
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('system_settings')
          .update({
            setting_value: config,
            updated_at: new Date().toISOString(),
          })
          .eq('setting_key', 'platform_general_config')
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('system_settings')
          .insert({
            setting_key: 'platform_general_config',
            setting_value: config,
            description: 'Platform-wide general settings',
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings', 'platform_general_config'] });
      toast.success(t('settings.platform.general.save_success'));
    },
    onError: (error: Error) => {
      console.error('[Platform General Settings] Update failed:', error);
      toast.error(t('settings.platform.general.save_error'));
    },
  });

  // Load settings into local state
  useEffect(() => {
    if (settings) {
      setTimezone(settings.timezone || DEFAULT_CONFIG.timezone);
      setDateFormat(settings.dateFormat || DEFAULT_CONFIG.dateFormat);
      setCurrency(settings.currency || DEFAULT_CONFIG.currency);
      setNumberFormat(settings.numberFormat || DEFAULT_CONFIG.numberFormat);
      setBusinessName(settings.businessName || DEFAULT_CONFIG.businessName);
      setFiscalYearStart(settings.fiscalYearStart || DEFAULT_CONFIG.fiscalYearStart);
    }
  }, [settings]);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Business name validation
    if (!businessName.trim()) {
      newErrors.businessName = t('settings.platform.general.business_name_required');
    } else if (businessName.length > 100) {
      newErrors.businessName = t('settings.platform.general.business_name_too_long');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save handler
  const handleSave = () => {
    if (!validate()) {
      toast.error(t('settings.platform.general.validation_failed'));
      return;
    }

    updateMutation.mutate({
      timezone,
      dateFormat,
      currency,
      numberFormat,
      businessName: businessName.trim(),
      fiscalYearStart,
    });
  };

  // Permission check
  if (!perms.canEditGeneralSettings) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('settings.system_admin_required', 'System Administrator access required')}
        </AlertDescription>
      </Alert>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="card-enhanced">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-700" />
                {t('settings.platform.general.title')}
              </CardTitle>
              <CardDescription className="mt-2">
                {t('settings.platform.general.description')}
              </CardDescription>
            </div>
            <Badge variant="outline" className="px-3 py-1 bg-gray-50 text-gray-700 border-gray-300">
              {t('settings.system_admin_only', 'System Admin Only')}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="business-name" className="text-gray-700 font-medium">
              {t('settings.platform.general.business_name')}
            </Label>
            <Input
              id="business-name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              maxLength={100}
              placeholder="My Detail Area"
              className={errors.businessName ? 'border-red-500' : ''}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {businessName.length}/100 {t('common.characters', 'characters')}
              </p>
              {errors.businessName && (
                <p className="text-xs text-red-500">{errors.businessName}</p>
              )}
            </div>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="timezone" className="flex items-center gap-2 text-gray-700 font-medium">
              <Globe className="h-4 w-4" />
              {t('settings.platform.general.timezone')}
            </Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue placeholder={t('settings.platform.general.select_timezone')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>{t('settings.platform.general.common_timezones')}</SelectLabel>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Date Format */}
          <div className="space-y-3">
            <Label className="text-gray-700 font-medium">
              {t('settings.platform.general.date_format')}
            </Label>
            <RadioGroup value={dateFormat} onValueChange={setDateFormat}>
              <div className="flex items-center space-x-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50">
                <RadioGroupItem value="MM/DD/YYYY" id="date-mdy" />
                <Label htmlFor="date-mdy" className="flex-1 cursor-pointer font-normal">
                  MM/DD/YYYY
                  <span className="ml-2 text-xs text-muted-foreground">(12/31/2025)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50">
                <RadioGroupItem value="DD/MM/YYYY" id="date-dmy" />
                <Label htmlFor="date-dmy" className="flex-1 cursor-pointer font-normal">
                  DD/MM/YYYY
                  <span className="ml-2 text-xs text-muted-foreground">(31/12/2025)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50">
                <RadioGroupItem value="YYYY-MM-DD" id="date-ymd" />
                <Label htmlFor="date-ymd" className="flex-1 cursor-pointer font-normal">
                  YYYY-MM-DD
                  <span className="ml-2 text-xs text-muted-foreground">(2025-12-31)</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label htmlFor="currency" className="flex items-center gap-2 text-gray-700 font-medium">
              <DollarSign className="h-4 w-4" />
              {t('settings.platform.general.currency')}
            </Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="currency">
                <SelectValue placeholder={t('settings.platform.general.select_currency')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Number Format */}
          <div className="space-y-3">
            <Label className="text-gray-700 font-medium">
              {t('settings.platform.general.number_format')}
            </Label>
            <RadioGroup value={numberFormat} onValueChange={setNumberFormat}>
              <div className="flex items-center space-x-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50">
                <RadioGroupItem value="1,234.56" id="number-comma" />
                <Label htmlFor="number-comma" className="flex-1 cursor-pointer font-normal">
                  1,234.56
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({t('settings.platform.general.comma_decimal')})
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50">
                <RadioGroupItem value="1.234,56" id="number-period" />
                <Label htmlFor="number-period" className="flex-1 cursor-pointer font-normal">
                  1.234,56
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({t('settings.platform.general.period_decimal')})
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Fiscal Year Start */}
          <div className="space-y-2">
            <Label htmlFor="fiscal-year" className="flex items-center gap-2 text-gray-700 font-medium">
              <Calendar className="h-4 w-4" />
              {t('settings.platform.general.fiscal_year_start')}
            </Label>
            <Select
              value={fiscalYearStart.toString()}
              onValueChange={(value) => setFiscalYearStart(parseInt(value, 10))}
            >
              <SelectTrigger id="fiscal-year">
                <SelectValue placeholder={t('settings.platform.general.select_month')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('settings.platform.general.fiscal_year_help')}
            </p>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="min-w-[140px] bg-gray-900 hover:bg-gray-800 text-white"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.saving', 'Saving...')}
                </>
              ) : (
                t('settings.platform.general.save_changes')
              )}
            </Button>

            <p className="text-sm text-muted-foreground">
              {t('settings.platform.general.changes_note')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
