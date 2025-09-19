import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Order } from '@/lib/mockData';
import { useSweetAlert } from '@/hooks/useSweetAlert';

interface StatusBadgeInteractiveProps {
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  orderId: string;
  dealerId: string;
  canUpdateStatus: boolean;
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
  canUpdateStatus, 
  onStatusChange 
}: StatusBadgeInteractiveProps) {
  const { t } = useTranslation();
  const { confirmStatusChange } = useSweetAlert();

  const currentStatusConfig = STATUS_OPTIONS.find(option => option.value === status.toLowerCase()) || STATUS_OPTIONS[0];

  const handleStatusSelect = async (selectedStatus: string) => {
    // Show confirmation for critical status changes
    if (selectedStatus === 'completed' || selectedStatus === 'cancelled') {
      const confirmed = await confirmStatusChange(
        t(STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label || ''),
        t('sweetalert.confirm_status')
      );
      
      if (confirmed) {
        onStatusChange(orderId, selectedStatus);
      }
    } else {
      onStatusChange(orderId, selectedStatus);
    }
  };

  if (!canUpdateStatus) {
    return (
      <div className="flex items-center gap-1">
        <Badge className={`${currentStatusConfig.color} px-3 py-1.5`}>
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
            aria-label="Change order status"
          >
            <Badge className={`${currentStatusConfig.color} hover:opacity-80 cursor-pointer px-3 py-1.5`}>
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
                className={`${option.color} mr-2 pointer-events-none px-3 py-1.5`}
              >
                {t(option.label)}
              </Badge>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}