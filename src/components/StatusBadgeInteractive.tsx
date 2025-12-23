import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useStatusPermissions } from '@/hooks/useStatusPermissions';
import { ChevronDown, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface StatusBadgeInteractiveProps {
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  orderId: string;
  dealerId: string;
  canUpdateStatus?: boolean; // Optional - will check permissions automatically if not provided
  orderType?: string; // Order type for permission validation
  onStatusChange: (orderId: string, newStatus: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'common.status.pending', color: 'bg-warning text-warning-foreground' },
  { value: 'in_progress', label: 'common.status.in_progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: 'common.status.completed', color: 'bg-success text-success-foreground' },
  { value: 'cancelled', label: 'common.status.cancelled', color: 'bg-destructive text-destructive-foreground' },
];

export function StatusBadgeInteractive({
  status,
  orderId,
  dealerId,
  canUpdateStatus: canUpdateStatusProp,
  orderType,
  onStatusChange
}: StatusBadgeInteractiveProps) {
  const { t } = useTranslation();
  const { canUpdateStatus: checkCanUpdateStatus, loading: permissionsLoading } = useStatusPermissions();
  const [hasPermission, setHasPermission] = useState<boolean>(canUpdateStatusProp !== undefined ? canUpdateStatusProp : true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const currentStatusConfig = STATUS_OPTIONS.find(option => option.value === status.toLowerCase()) || STATUS_OPTIONS[0];

  // Check permissions on mount and when relevant props change
  useEffect(() => {
    const checkPermission = async () => {
      // If canUpdateStatus is explicitly provided, use it
      if (canUpdateStatusProp !== undefined) {
        setHasPermission(canUpdateStatusProp);
        return;
      }

      // Wait for permissions to load before checking
      if (permissionsLoading) {
        return;
      }

      // Otherwise, check permissions automatically
      const allowed = await checkCanUpdateStatus(
        dealerId,
        status,
        'in_progress', // Check generic permission, not specific to target status
        orderType
      );
      setHasPermission(allowed);
    };

    checkPermission();
  }, [dealerId, status, orderType, canUpdateStatusProp, checkCanUpdateStatus, permissionsLoading]);

  const handleStatusSelect = async (selectedStatus: string) => {
    // Double-check permission for the specific status change
    const allowed = await checkCanUpdateStatus(
      dealerId,
      status,
      selectedStatus,
      orderType
    );

    if (!allowed) {
      return; // Permission check already logs warning
    }

    // Show confirmation for critical status changes
    if (selectedStatus === 'completed' || selectedStatus === 'cancelled') {
      setPendingStatus(selectedStatus);
      setShowConfirmDialog(true);
    } else {
      onStatusChange(orderId, selectedStatus);
    }
  };

  const confirmChange = () => {
    if (!pendingStatus) return;

    onStatusChange(orderId, pendingStatus);
    setPendingStatus(null);
  };

  if (!hasPermission) {
    return (
      <div className="flex items-center gap-1">
        <Badge className={`${currentStatusConfig.color} px-3 py-1 rounded-sm`}>
          {t(currentStatusConfig.label)}
        </Badge>
        <Lock className="w-3 h-3 text-muted-foreground" title={t('errors.no_permission_status_change', 'No permission to change status')} />
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 hover:bg-transparent"
            aria-label="Change order status"
          >
            <Badge className={`${currentStatusConfig.color} hover:opacity-80 cursor-pointer px-3 py-1 rounded-sm`}>
              {t(currentStatusConfig.label)}
              <ChevronDown className="w-3 h-3 ml-1" />
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[140px] p-1">
          {STATUS_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleStatusSelect(option.value)}
              disabled={option.value === status.toLowerCase()}
              className={`cursor-pointer justify-center font-medium text-sm px-3 py-2 rounded-sm ${option.color} ${
                option.value === status.toLowerCase() ? 'opacity-50' : 'hover:opacity-90'
              }`}
            >
              {t(option.label)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Status Change Confirmation Dialog - Team Chat Style */}
      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title={t('orders.confirm_status_change_title', 'Confirm Status Change')}
        description={t('sweetalert.confirm_status', pendingStatus ? `Change status to "${t(STATUS_OPTIONS.find(s => s.value === pendingStatus)?.label || '')}"?` : '')}
        confirmText={t('common.confirm', 'Confirm')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmChange}
        variant={pendingStatus === 'cancelled' ? 'destructive' : pendingStatus === 'completed' ? 'success' : 'default'}
      />
    </>
  );
}
