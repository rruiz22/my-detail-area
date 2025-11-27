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

  // ✅ HIDE BUTTON: Only show if kiosk is configured on this PC
  if (!kioskId) return null;

  // ✅ HIDE ON MOBILE: Mobile devices should not be kiosks
  const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobileDevice) return null;

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="sm"
              className={`relative h-9 px-3 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105 ${
                modalOpen ? 'ring-2 ring-emerald-300' : ''
              }`}
              onClick={() => setModalOpen(true)}
              aria-label={t('detail_hub.dashboard.quick_actions.time_clock')}
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Time Clock</span>

              {/* Badge - Show count if > 0 */}
              {activeCount > 0 && (
                <Badge
                  variant="secondary"
                  className="absolute -right-1 -top-1 h-5 min-w-5 px-1.5 bg-amber-500 text-white text-xs font-bold pointer-events-none animate-pulse shadow-sm"
                >
                  {activeCount}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{t('detail_hub.dashboard.quick_actions.time_clock')}</p>
            {activeCount > 0 && (
              <p className="text-xs text-gray-300 mt-1">
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
