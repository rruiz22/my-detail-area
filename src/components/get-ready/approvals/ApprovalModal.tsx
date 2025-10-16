import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useVehicleManagement } from '@/hooks/useVehicleManagement';
import { GetReadyVehicle } from '@/types/getReady';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: GetReadyVehicle | null;
  action: 'approve' | 'reject';
}

export function ApprovalModal({ open, onOpenChange, vehicle, action }: ApprovalModalProps) {
  const { t } = useTranslation();
  const vehicleManagement = useVehicleManagement();
  const { approveVehicle, rejectVehicle, isApproving, isRejecting } = vehicleManagement;

  // Debug log
  console.log('ApprovalModal - vehicleManagement:', vehicleManagement);
  console.log('ApprovalModal - approveVehicle:', approveVehicle);

  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');

  const isProcessing = isApproving || isRejecting;

  const handleSubmit = () => {
    if (!vehicle) return;

    if (action === 'approve') {
      approveVehicle(
        { vehicleId: vehicle.id, notes: notes || undefined },
        {
          onSuccess: () => {
            handleClose();
          },
        }
      );
    } else {
      if (!reason.trim()) {
        return;
      }
      rejectVehicle(
        {
          vehicleId: vehicle.id,
          reason,
          notes: notes || undefined,
        },
        {
          onSuccess: () => {
            handleClose();
          },
        }
      );
    }
  };

  const handleClose = () => {
    setNotes('');
    setReason('');
    onOpenChange(false);
  };

  if (!vehicle) return null;

  const isApprove = action === 'approve';
  const title = isApprove
    ? t('get_ready.approvals.modal.approve_title')
    : t('get_ready.approvals.modal.reject_title');
  const description = isApprove
    ? t('get_ready.approvals.modal.approve_description')
    : t('get_ready.approvals.modal.reject_description');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApprove ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Vehicle Info */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t('get_ready.approvals.modal.vehicle_info')}
              </span>
              <Badge variant={isApprove ? 'default' : 'destructive'}>
                {(vehicle as any).workflow_type?.toUpperCase() || 'STANDARD'}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Stock:
                </span>
                <span className="text-sm font-medium">{vehicle.stock_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Vehicle:
                </span>
                <span className="text-sm font-medium">
                  {(vehicle as any).year} {(vehicle as any).make} {(vehicle as any).model}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Step:
                </span>
                <span className="text-sm font-medium">{(vehicle as any).step_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t('get_ready.steps.dis')}:
                </span>
                <span className="text-sm font-medium">{vehicle.days_in_step}</span>
              </div>
            </div>
          </div>

          {/* Rejection Reason (Required for reject) */}
          {!isApprove && (
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-medium">
                {t('get_ready.approvals.modal.rejection_reason')}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder={t('get_ready.approvals.modal.rejection_reason_placeholder')}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                disabled={isProcessing}
                className="resize-none"
              />
              {reason.trim() === '' && (
                <p className="text-xs text-muted-foreground">
                  {t('get_ready.approvals.modal.rejection_reason_required')}
                </p>
              )}
            </div>
          )}

          {/* Notes (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              {t('get_ready.approvals.modal.notes')}
              <span className="text-muted-foreground ml-1">
                ({t('get_ready.approvals.modal.optional')})
              </span>
            </Label>
            <Textarea
              id="notes"
              placeholder={t('get_ready.approvals.modal.notes_placeholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={isProcessing}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            {t('common.action_buttons.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isProcessing || (!isApprove && !reason.trim())}
            variant={isApprove ? 'default' : 'destructive'}
          >
            {isProcessing ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                {t('common.loading')}
              </>
            ) : isApprove ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t('get_ready.approvals.actions.approve')}
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                {t('get_ready.approvals.actions.reject')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
