/**
 * Edit Allowed Modules Modal
 *
 * Modal for editing allowed modules for supermanager users.
 * Only accessible by system administrators.
 *
 * Features:
 * - Load current allowed modules
 * - Multi-select module checkboxes
 * - Quick select/clear all
 * - Save changes via RPC
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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Layers, AlertTriangle } from 'lucide-react';

interface EditAllowedModulesModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    allowed_modules?: string[];
  } | null;
}

// Available modules for supermanagers
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
  { id: 'management', label: 'Administration Panel', category: 'Administration' },
  { id: 'settings', label: 'Settings', category: 'Configuration' },
] as const;

export function EditAllowedModulesModal({
  open,
  onClose,
  onSuccess,
  user,
}: EditAllowedModulesModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load current modules when modal opens
  useEffect(() => {
    if (open && user) {
      setSelectedModules(user.allowed_modules || []);
      setHasChanges(false);
    }
  }, [open, user]);

  // Check if there are changes
  useEffect(() => {
    if (user) {
      const currentModules = user.allowed_modules || [];
      const modulesChanged =
        selectedModules.length !== currentModules.length ||
        selectedModules.some(m => !currentModules.includes(m)) ||
        currentModules.some(m => !selectedModules.includes(m));

      setHasChanges(modulesChanged);
    }
  }, [selectedModules, user]);

  const handleSelectAllModules = () => {
    setSelectedModules(AVAILABLE_MODULES.map(m => m.id));
  };

  const handleClearAllModules = () => {
    setSelectedModules([]);
  };

  const handleToggleModule = (moduleId: string, checked: boolean) => {
    if (checked) {
      setSelectedModules(prev => [...prev, moduleId]);
    } else {
      setSelectedModules(prev => prev.filter(m => m !== moduleId));
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validation
    if (selectedModules.length === 0) {
      toast({
        title: t('common.validation_error'),
        description: 'Supermanagers must have at least one allowed module',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      console.log(`Updating allowed modules for ${user.email}:`, selectedModules);

      // Call RPC to update allowed modules
      const { error } = await supabase.rpc('set_user_allowed_modules', {
        target_user_id: user.id,
        modules: selectedModules,
      });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      console.log('✅ Modules updated successfully');

      toast({
        title: t('common.success'),
        description: `Updated allowed modules for ${user.first_name} ${user.last_name}`,
      });

      // Trigger success callback
      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error('Error updating allowed modules:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to update allowed modules',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Edit Allowed Modules
          </DialogTitle>
          <DialogDescription>
            Manage module access for {user.first_name} {user.last_name} ({user.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Module Selection */}
          <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Allowed Modules</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Modules apply to ALL dealerships (global access)
                </p>
              </div>
              <Badge variant={selectedModules.length > 0 ? 'default' : 'outline'}>
                {selectedModules.length} selected
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
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {['Orders', 'Operations', 'Tools', 'Communication', 'CRM', 'Analytics', 'Administration', 'Configuration'].map(
                (category) => {
                  const categoryModules = AVAILABLE_MODULES.filter(
                    (m) => m.category === category
                  );
                  if (categoryModules.length === 0) return null;

                  return (
                    <div key={category} className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {category}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {categoryModules.map((mod) => (
                          <div key={mod.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-module-${mod.id}`}
                              checked={selectedModules.includes(mod.id)}
                              onCheckedChange={(checked) =>
                                handleToggleModule(mod.id, checked as boolean)
                              }
                              disabled={loading}
                            />
                            <label
                              htmlFor={`edit-module-${mod.id}`}
                              className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {mod.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            {/* Validation Warning */}
            {selectedModules.length === 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  ⚠️ Supermanagers must have at least one allowed module
                </AlertDescription>
              </Alert>
            )}

            {/* Changes Indicator */}
            {hasChanges && (
              <Alert>
                <AlertDescription className="text-xs">
                  💡 Changes detected - click Save to apply
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !hasChanges || selectedModules.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>Save Changes</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
