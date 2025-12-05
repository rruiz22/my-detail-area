/**
 * Migrate Users Modal
 *
 * Modal for migrating users from one dealership to another
 *
 * Features:
 * - Checkbox selection of users to migrate
 * - Select All / Clear All shortcuts
 * - Destination dealership dropdown
 * - Confirmation with migration count
 * - Progress tracking during migration
 *
 * @module components/dealerships/MigrateUsersModal
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserCog, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useUserMigration, DealershipUser } from '@/hooks/useUserMigration';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';

interface MigrateUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  sourceDealership: {
    id: number;
    name: string;
  } | null;
}

export function MigrateUsersModal({
  isOpen,
  onClose,
  onSuccess,
  sourceDealership
}: MigrateUsersModalProps) {
  const { t } = useTranslation();
  const { dealerships } = useAccessibleDealerships();
  const {
    users,
    loading,
    fetchDealershipUsers,
    migrateUsers,
    getUserFullName,
    getActiveUsers
  } = useUserMigration();

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [targetDealershipId, setTargetDealershipId] = useState<number | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);

  // Load users when modal opens
  useEffect(() => {
    if (isOpen && sourceDealership) {
      fetchDealershipUsers(sourceDealership.id);
      setSelectedUserIds([]);
      setTargetDealershipId(null);
      setMigrationComplete(false);
    }
  }, [isOpen, sourceDealership, fetchDealershipUsers]);

  // Filter out source dealership from target options
  const availableTargetDealerships = dealerships.filter(
    d => d.id !== sourceDealership?.id
  );

  // Get only active users for migration
  const activeUsers = getActiveUsers();

  const handleSelectAll = () => {
    setSelectedUserIds(activeUsers.map(u => u.user_id));
  };

  const handleClearAll = () => {
    setSelectedUserIds([]);
  };

  const handleToggleUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUserIds(prev => [...prev, userId]);
    } else {
      setSelectedUserIds(prev => prev.filter(id => id !== userId));
    }
  };

  const handleMigrate = async () => {
    if (!sourceDealership || !targetDealershipId || selectedUserIds.length === 0) {
      return;
    }

    setMigrating(true);
    try {
      const result = await migrateUsers(
        selectedUserIds,
        sourceDealership.id,
        targetDealershipId
      );

      if (result.success) {
        setMigrationComplete(true);

        // Trigger success callback
        if (onSuccess) {
          onSuccess();
        }

        // Auto-close after showing success message
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } finally {
      setMigrating(false);
    }
  };

  const handleClose = () => {
    if (!migrating) {
      onClose();
    }
  };

  if (!sourceDealership) return null;

  const selectedCount = selectedUserIds.length;
  const canMigrate = selectedCount > 0 && targetDealershipId !== null && !migrating;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            {t('dealerships.migrate_users')}
          </DialogTitle>
          <DialogDescription>
            {t('dealerships.migrate_users_description', { name: sourceDealership.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Users Selection */}
          {!loading && activeUsers.length > 0 && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    {t('dealerships.select_users_to_migrate')}
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={migrating}
                    >
                      {t('dealerships.select_all')} ({activeUsers.length})
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClearAll}
                      disabled={migrating}
                    >
                      {t('dealerships.clear_all')}
                    </Button>
                  </div>
                </div>

                {/* Users List with Checkboxes */}
                <div className="max-h-[300px] overflow-y-auto space-y-2 rounded-lg border p-3">
                  {activeUsers.map((user) => (
                    <div
                      key={user.user_id}
                      className="flex items-center space-x-3 rounded-md p-2 hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`user-${user.user_id}`}
                        checked={selectedUserIds.includes(user.user_id)}
                        onCheckedChange={(checked) =>
                          handleToggleUser(user.user_id, checked as boolean)
                        }
                        disabled={migrating}
                      />
                      <label
                        htmlFor={`user-${user.user_id}`}
                        className="flex-1 cursor-pointer text-sm"
                      >
                        <div className="font-medium">{getUserFullName(user)}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{user.email}</span>
                          {user.custom_role && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {user.custom_role}
                            </Badge>
                          )}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>

                {/* Selection Count */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('dealerships.selected_users', { count: selectedCount })}
                  </span>
                  {selectedCount > 0 && (
                    <Badge variant="default">{selectedCount} selected</Badge>
                  )}
                </div>
              </div>

              {/* Target Dealership Selection */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {t('dealerships.destination_dealership')}
                </Label>
                <Select
                  value={targetDealershipId?.toString()}
                  onValueChange={(value) => setTargetDealershipId(parseInt(value))}
                  disabled={migrating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('dealerships.select_destination')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTargetDealerships.map((dealer) => (
                      <SelectItem key={dealer.id} value={dealer.id.toString()}>
                        {dealer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Confirmation Warning */}
              {selectedCount > 0 && targetDealershipId && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {t('dealerships.migration_warning', {
                      count: selectedCount,
                      source: sourceDealership.name,
                      target: availableTargetDealerships.find(d => d.id === targetDealershipId)?.name
                    })}
                  </AlertDescription>
                </Alert>
              )}

              {/* Migration Complete */}
              {migrationComplete && (
                <Alert className="border-emerald-200 bg-emerald-50">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-sm text-emerald-800">
                    ✅ {t('dealerships.migration_complete', { count: selectedCount })}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* No Active Users */}
          {!loading && activeUsers.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('dealerships.no_active_users_to_migrate')}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={migrating}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleMigrate}
            disabled={!canMigrate || migrationComplete}
          >
            {migrating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('dealerships.migrating')}
              </>
            ) : (
              <>
                <UserCog className="h-4 w-4 mr-2" />
                {t('dealerships.migrate_users_button', { count: selectedCount })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
