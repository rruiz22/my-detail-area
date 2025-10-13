import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRefreshCountdown } from '@/hooks/useTimeAgo';

interface LiveTimerProps {
  lastRefresh: Date | null;
  isRefreshing?: boolean;
  className?: string;
  refreshInterval?: number;
}

export const LiveTimer = ({
  lastRefresh,
  isRefreshing = false,
  className = '',
  refreshInterval = 180
}: LiveTimerProps) => {
  const { t } = useTranslation();
  const countdown = useRefreshCountdown(lastRefresh, refreshInterval);

  if (!lastRefresh) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
      <Clock className={`h-3 w-3 transition-all ${countdown.isCritical ? 'text-red-500' : countdown.isNearZero ? 'text-orange-500' : ''}`} />
      <span className={`transition-all ${countdown.isCritical ? 'text-red-500 font-medium' : countdown.isNearZero ? 'text-orange-500' : ''}`}>
        {t('common.next_refresh')}: {countdown.timeDisplay}
      </span>
      <div
        className={`w-2 h-2 rounded-full transition-all duration-300 ${
          isRefreshing
            ? 'bg-blue-500 animate-pulse scale-110'
            : countdown.isCritical
              ? 'bg-red-500 animate-bounce'
              : countdown.isNearZero
                ? 'bg-orange-500 animate-pulse'
                : 'bg-green-500'
        }`}
      />
    </div>
  );
};