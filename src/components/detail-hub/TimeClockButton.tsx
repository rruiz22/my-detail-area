/**
 * TimeClockButton - Topbar Time Clock Access
 *
 * Professional icon button with badge showing currently clocked-in employees.
 * Opens PunchClockKioskModal for time tracking operations.
 *
 * Features:
 * - Clock icon with badge count
 * - Tooltip on hover
 * - Responsive sizing (mobile vs desktop)
 * - Notion-style design (muted colors, no gradients)
 * - Real-time count updates (1-minute cache)
 */

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { PunchClockKioskModal } from './PunchClockKioskModal';
import { useKioskConfig } from '@/hooks/useKioskConfig';
import { useActiveClockedInCount } from '@/hooks/useActiveClockedInCount';

interface TimeClockButtonProps {
  dealerId?: number;
}

export function TimeClockButton({ dealerId }: TimeClockButtonProps) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const { kioskId } = useKioskConfig();
  const { data: activeCount = 0 } = useActiveClockedInCount();

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`relative h-9 w-9 transition-transform hover:scale-105 ${
                modalOpen ? 'bg-gray-100' : ''
              }`}
              onClick={() => setModalOpen(true)}
              aria-label={t('detail_hub.dashboard.quick_actions.time_clock')}
            >
              <Clock className="h-5 w-5 text-gray-700" />

              {/* Badge - Show count if > 0 */}
              {activeCount > 0 && (
                <Badge
                  variant="default"
                  className="absolute -right-1 -top-1 h-5 min-w-5 px-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold pointer-events-none"
                >
                  {activeCount}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('detail_hub.dashboard.quick_actions.time_clock')}</p>
            {activeCount > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {activeCount} {activeCount === 1 ? 'employee' : 'employees'} clocked in
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Time Clock Modal */}
      <PunchClockKioskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        kioskId={kioskId}
      />
    </>
  );
}
