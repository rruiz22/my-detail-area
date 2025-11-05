/**
 * ReconStatusBadge Component
 *
 * Displays the current recon order status as a clickable badge.
 * Clicking the badge navigates to the specific recon order.
 *
 * Design: Flat, Notion-inspired style with muted colors.
 */

import { Badge } from '@/components/ui/badge';
import { Wrench } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface ReconStatusBadgeProps {
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  orderNumber: string;
  onClick?: () => void;
}

export const ReconStatusBadge: React.FC<ReconStatusBadgeProps> = ({
  status,
  orderNumber,
  onClick
}) => {
  const { t } = useTranslation();

  // Flat design with muted colors - NO gradients, NO bright colors
  const statusConfig = {
    pending: {
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
      label: t('status.pending', 'Pending')
    },
    in_progress: {
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-700',
      borderColor: 'border-indigo-200',
      label: t('status.in_progress', 'In Progress')
    },
    completed: {
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      label: t('status.completed', 'Completed')
    },
    cancelled: {
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      label: t('status.cancelled', 'Cancelled')
    },
    on_hold: {
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-200',
      label: t('status.on_hold', 'On Hold')
    }
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={`
        ${config.bgColor}
        ${config.textColor}
        ${config.borderColor}
        border
        cursor-pointer
        hover:opacity-80
        transition-opacity
        px-3
        py-1.5
        text-sm
        font-medium
      `}
      onClick={onClick}
    >
      <Wrench className="w-3 h-3 mr-1.5" />
      <span className="font-semibold">{t('stock.vehicleDetails.status.inRecon', 'Recon')}:</span>
      <span className="ml-1">{config.label}</span>
      <span className="ml-1 text-xs opacity-75">({orderNumber})</span>
    </Badge>
  );
};
