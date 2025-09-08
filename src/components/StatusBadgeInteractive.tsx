import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { ChevronDown, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Order } from '@/lib/mockData';

interface StatusBadgeInteractiveProps {
  status: Order['status'];
  orderId: string;
  dealerId: string;
  canUpdateStatus: boolean;
  onStatusChange: (orderId: string, newStatus: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'status.pending', color: 'bg-pending text-pending-foreground' },
  { value: 'in_progress', label: 'status.in_progress', color: 'bg-warning text-warning-foreground' },
  { value: 'completed', label: 'status.completed', color: 'bg-success text-success-foreground' },
  { value: 'cancelled', label: 'status.cancelled', color: 'bg-destructive text-destructive-foreground' },
];

export function StatusBadgeInteractive({ 
  status, 
  orderId, 
  dealerId, 
  canUpdateStatus, 
  onStatusChange 
}: StatusBadgeInteractiveProps) {
  const { t } = useTranslation();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  const currentStatusConfig = STATUS_OPTIONS.find(option => option.value === status.toLowerCase()) || STATUS_OPTIONS[0];

  const handleStatusSelect = (selectedStatus: string) => {
    // Show confirmation for critical status changes
    if (selectedStatus === 'completed' || selectedStatus === 'cancelled') {
      setNewStatus(selectedStatus);
      setShowConfirmDialog(true);
    } else {
      onStatusChange(orderId, selectedStatus);
    }
  };

  const handleConfirmStatusChange = () => {
    onStatusChange(orderId, newStatus);
    setShowConfirmDialog(false);
    setNewStatus('');
  };

  if (!canUpdateStatus) {
    return (
      <div className="flex items-center gap-1">
        <Badge className={currentStatusConfig.color}>
          {t(currentStatusConfig.label)}
        </Badge>
        <Lock className="w-3 h-3 text-muted-foreground" />
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
          >
            <Badge className={`${currentStatusConfig.color} hover:opacity-80 cursor-pointer`}>
              {t(currentStatusConfig.label)}
              <ChevronDown className="w-3 h-3 ml-1" />
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[150px] bg-popover border border-border">
          {STATUS_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleStatusSelect(option.value)}
              disabled={option.value === status.toLowerCase()}
              className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
            >
              <Badge 
                variant="secondary" 
                className={`${option.color} mr-2 pointer-events-none`}
              >
                {t(option.label)}
              </Badge>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('status.confirm_status_change')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('status.status_will_change_to', { 
                status: t(STATUS_OPTIONS.find(s => s.value === newStatus)?.label || '')
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border hover:bg-accent hover:text-accent-foreground">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmStatusChange}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}