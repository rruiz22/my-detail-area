/**
 * Create System User Modal
 *
 * Modal for creating system-level users (system_admin and supermanager).
 * Only accessible by system administrators.
 *
 * Features:
 * - Email validation
 * - Role selection (system_admin or supermanager)
 * - Optional primary dealership assignment
 * - Send welcome email option
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, UserCog, AlertTriangle, Mail, User, Building2, Layers } from 'lucide-react';

interface CreateSystemUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Dealership {
  id: number;
  name: string;
}

// 🆕 Available modules for supermanagers
const AVAILABLE_MODULES = [
  // Core Operations
  { id: 'dashboard', label: 'Dashboard', category: 'Core' },
  { id: 'sales_orders', label: 'Sales Orders', category: 'Orders' },
  { id: 'service_orders', label: 'Service Orders', category: 'Orders' },
  { id: 'recon_orders', label: 'Recon Orders', category: 'Orders' },
  { id: 'car_wash', label: 'Car Wash', category: 'Orders' },
  { id: 'get_ready', label: 'Get Ready', category: 'Operations' },
  { id: 'stock', label: 'Stock/Inventory', category: 'Operations' },
  { id: 'detail_hub', label: 'Detail Hub', category: 'Operations' },

  // Tools & Communication
  { id: 'productivity', label: 'Productivity', category: 'Tools' },
  { id: 'chat', label: 'Team Chat', category: 'Communication' },
  { id: 'contacts', label: 'Contacts', category: 'CRM' },

  // Admin & Reports
  { id: 'reports', label: 'Reports', category: 'Analytics' },
  { id: 'users', label: 'User Management', category: 'Administration' },
  { id: 'dealerships', label: 'Dealerships', category: 'Administration' },
  { id: 'settings', label: 'Settings', category: 'Configuration' },
] as const;

export function CreateSystemUserModal({ open, onClose, onSuccess }: CreateSystemUserModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'supermanager' as 'system_admin' | 'supermanager',
    primaryDealershipId: null as number | null,
    sendWelcomeEmail: true,
    allowedModules: [] as string[],  // 🆕 Módulos permitidos para supermanagers
  });

  const [loading, setLoading] = useState(false);
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [loadingDealerships, setLoadingDealerships] = useState(false);

  // Fetch dealerships for optional assignment
  useEffect(() => {
    if (open) {
      fetchDealerships();
      resetForm();
    }
  }, [open]);

  const fetchDealerships = async () => {
    setLoadingDealerships(true);
    try {
      const { data, error } = await supabase
        .from('dealerships')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setDealerships(data || []);
    } catch (error) {
      console.error('Error fetching dealerships:', error);
      toast({
        title: t('common.error'),
        description: t('admin.error_loading_dealerships'),
        variant: 'destructive',
      });
    } finally {
      setLoadingDealerships(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      role: 'supermanager',
      primaryDealershipId: null,
      sendWelcomeEmail: true,
      allowedModules: [],  // 🆕 Reset módulos
    });
  };

  // 🆕 Helper functions for module selection
  const handleSelectAllModules = () => {
    setFormData({
      ...formData,
      allowedModules: AVAILABLE_MODULES.map(m => m.id)
    });
  };

  const handleClearAllModules = () => {
    setFormData({ ...formData, allowedModules: [] });
  };

  const handleToggleModule = (moduleId: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        allowedModules: [...formData.allowedModules, moduleId]
      });
    } else {
      setFormData({
        ...formData,
        allowedModules: formData.allowedModules.filter(m => m !== moduleId)
      });
    }
  };

  const validateForm = (): boolean => {
    if (!formData.email || !formData.firstName || !formData.lastName) {
      toast({
        title: t('common.validation_error'),
        description: t('admin.fill_required_fields'),
        variant: 'destructive',
      });
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: t('common.validation_error'),
        description: t('admin.invalid_email'),
        variant: 'destructive',
      });
      return false;
    }

    // 🆕 Validate supermanagers have at least 1 allowed module
    if (formData.role === 'supermanager' && formData.allowedModules.length === 0) {
      toast({
        title: t('common.validation_error'),
        description: 'Supermanagers must have at least one allowed module',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('=== CREATING SYSTEM USER ===');
      console.log('Form data:', formData);

      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error(t('admin.must_be_logged_in'));
      }

      console.log('Authenticated user:', session.user.email);

      // Prepare payload for Edge Function
      const requestPayload = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        primaryDealershipId: formData.primaryDealershipId,
        sendWelcomeEmail: formData.sendWelcomeEmail,
        allowedModules: formData.role === 'supermanager' ? formData.allowedModules : undefined,  // 🆕 Solo para supermanagers
      };

      console.log('Request payload:', JSON.stringify(requestPayload, null, 2));

      // Call Edge Function to create system user
      console.log('Invoking create-system-user function...');
      const response = await supabase.functions.invoke('create-system-user', {
        body: requestPayload,
      });

      console.log('=== FUNCTION RESPONSE ===');
      console.log('Full response:', response);
      console.log('Response data:', response.data);
      console.log('Response error:', response.error);
      console.log('Data type:', typeof response.data);

      // Check for HTTP errors first
      if (response.error) {
        console.error('❌ Edge Function HTTP error detected');
        console.error('Error object:', response.error);
        console.error('Error message:', response.error.message);
        console.error('Error context:', response.error.context);

        // Try to read error from Response body
        let errorMessage = 'Unknown error';

        try {
          // The context is the Response object, try to read its body
          if (response.error.context && typeof response.error.context.json === 'function') {
            const errorBody = await response.error.context.json();
            console.log('📝 Error body from Response:', errorBody);
            errorMessage = errorBody.error || errorBody.message || response.error.message;
          } else {
            errorMessage = response.error.message;
          }
        } catch (e) {
          console.error('Failed to parse error body:', e);
          errorMessage = response.error.message;
        }

        console.log('📝 Final error message:', errorMessage);
        throw new Error(errorMessage);
      }

      // Check for function-level errors
      if (!response.data || !response.data.success) {
        console.error('❌ Function returned failure');
        console.error('Function data:', response.data);
        const errorMessage = response.data?.error || 'Function failed without error message';
        console.log('📝 Function error message:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('✅ System user created successfully:', response.data);

      // Success!
      toast({
        title: t('common.success'),
        description: t('admin.system_user_created_successfully', {
          name: `${formData.firstName} ${formData.lastName}`,
          role: formData.role === 'system_admin'
            ? t('roles.system_admin')
            : t('roles.supermanager'),
        }),
      });

      // Reset form and close modal
      resetForm();
      onSuccess?.();
      onClose();

    } catch (error: any) {
      console.error('Error creating system user:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('admin.error_creating_system_user'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t('admin.create_system_user')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.create_system_user_description')}
          </DialogDescription>
        </DialogHeader>

        {/* Warning Alert for System Admin Role */}
        {formData.role === 'system_admin' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t('admin.system_admin_warning')}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {t('common.email')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={loading}
              required
            />
          </div>

          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="firstName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('common.first_name')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstName"
              type="text"
              placeholder={t('common.first_name')}
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              disabled={loading}
              required
            />
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="lastName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('common.last_name')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lastName"
              type="text"
              placeholder={t('common.last_name')}
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              disabled={loading}
              required
            />
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {t('common.role')} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value: 'system_admin' | 'supermanager') =>
                setFormData({ ...formData, role: value })
              }
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supermanager">
                  <div className="flex items-center gap-2">
                    <UserCog className="h-4 w-4" />
                    <div>
                      <p className="font-medium">{t('roles.supermanager')}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('admin.supermanager_brief')}
                      </p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="system_admin">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive">{t('roles.system_admin')}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('admin.system_admin_brief')}
                      </p>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Primary Dealership (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="dealership" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {t('admin.primary_dealership')} <span className="text-muted-foreground">({t('common.optional')})</span>
            </Label>
            <Select
              value={formData.primaryDealershipId?.toString() || 'none'}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  primaryDealershipId: value === 'none' ? null : parseInt(value),
                })
              }
              disabled={loading || loadingDealerships}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('admin.select_dealership_optional')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {t('common.none')}
                </SelectItem>
                {dealerships.map((dealer) => (
                  <SelectItem key={dealer.id} value={dealer.id.toString()}>
                    {dealer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('admin.primary_dealership_hint')}
            </p>
          </div>

          {/* Send Welcome Email */}
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="sendEmail" className="font-medium">
                {t('admin.send_welcome_email')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('admin.send_welcome_email_hint')}
              </p>
            </div>
            <Switch
              id="sendEmail"
              checked={formData.sendWelcomeEmail}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, sendWelcomeEmail: checked })
              }
              disabled={loading}
            />
          </div>

          {/* 🆕 Allowed Modules Selector - Only for Supermanager */}
          {formData.role === 'supermanager' && (
            <div className="space-y-4 rounded-lg border p-4 bg-muted/30 border-amber-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium flex items-center gap-2">
                    <Layers className="h-4 w-4 text-amber-500" />
                    Allowed Modules <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select which modules this supermanager can access across ALL dealerships
                  </p>
                </div>
                <Badge variant={formData.allowedModules.length > 0 ? "default" : "outline"}>
                  {formData.allowedModules.length} selected
                </Badge>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllModules}
                  disabled={loading}
                >
                  Select All ({AVAILABLE_MODULES.length})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearAllModules}
                  disabled={loading}
                >
                  Clear All
                </Button>
              </div>

              {/* Module Checkboxes - Grouped by category */}
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {['Orders', 'Operations', 'Tools', 'Communication', 'CRM', 'Analytics', 'Administration', 'Configuration'].map(category => {
                  const categoryModules = AVAILABLE_MODULES.filter(m => m.category === category);
                  if (categoryModules.length === 0) return null;

                  return (
                    <div key={category} className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">{category}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {categoryModules.map(mod => (
                          <div key={mod.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`module-${mod.id}`}
                              checked={formData.allowedModules.includes(mod.id)}
                              onCheckedChange={(checked) =>
                                handleToggleModule(mod.id, checked as boolean)
                              }
                              disabled={loading}
                            />
                            <label
                              htmlFor={`module-${mod.id}`}
                              className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {mod.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Validation Warning */}
              {formData.allowedModules.length === 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    ⚠️ Please select at least one module for this supermanager
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.creating')}
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                {t('admin.create_user')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}











