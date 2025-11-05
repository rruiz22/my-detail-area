/**
 * GetReadyStepBadge Component
 *
 * Displays the current Get Ready workflow step as a clickable badge.
 * Clicking the badge navigates to the Get Ready module with the vehicle highlighted.
 *
 * Design: Flat, Notion-inspired style with step-specific colors.
 */

import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface GetReadyStepBadgeProps {
  stepName: string;
  stepColor: string;
  onClick?: () => void;
}

export const GetReadyStepBadge: React.FC<GetReadyStepBadgeProps> = ({
  stepName,
  stepColor,
  onClick
}) => {
  const { t } = useTranslation();

  return (
    <Badge
      variant="outline"
      className="
        cursor-pointer
        hover:opacity-80
        transition-opacity
        border-2
        px-3
        py-1.5
        text-sm
        font-medium
        bg-white
      "
      style={{
        borderColor: stepColor,
        color: stepColor
      }}
      onClick={onClick}
    >
      <div
        className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
        style={{ backgroundColor: stepColor }}
      />
      <Settings className="w-3 h-3 mr-1.5" />
      <span className="font-semibold">{t('stock.vehicleDetails.status.inGetReady', 'Get Ready')}:</span>
      <span className="ml-1">{stepName}</span>
    </Badge>
  );
};
