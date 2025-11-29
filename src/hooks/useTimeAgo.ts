import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { pollingConfig } from '@/config/realtimeFeatures';

interface CountdownState {
  timeDisplay: string;
  isNearZero: boolean;
  isCritical: boolean;
  secondsLeft: number;
}

export const useRefreshCountdown = (
  lastRefresh: Date | null,
  refreshInterval: number = pollingConfig.orders / 1000  // Default: 120 seconds (2 minutes)
) => {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState<CountdownState>({
    timeDisplay: '',
    isNearZero: false,
    isCritical: false,
    secondsLeft: 0
  });
  const [isVisible, setIsVisible] = useState(!document.hidden);

  // Listen for tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const nowVisible = !document.hidden;
      setIsVisible(nowVisible);

      // Recalculate countdown immediately when tab becomes visible
      if (nowVisible && lastRefresh) {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - lastRefresh.getTime()) / 1000);
        const secondsLeft = Math.max(0, refreshInterval - elapsed);

        let timeDisplay = '';
        if (secondsLeft === 0) {
          timeDisplay = t('common.time.refreshing', 'Refreshing...');
        } else if (secondsLeft < 60) {
          timeDisplay = t('common.time.refresh_in_seconds', `${secondsLeft}s`, { count: secondsLeft });
        } else {
          const minutesLeft = Math.floor(secondsLeft / 60);
          const remainingSeconds = secondsLeft % 60;
          timeDisplay = t('common.time.refresh_in_minutes', `${minutesLeft}:${remainingSeconds.toString().padStart(2, '0')}`, {
            minutes: minutesLeft,
            seconds: remainingSeconds
          });
        }

        setCountdown({
          timeDisplay,
          isNearZero: secondsLeft <= 10,
          isCritical: secondsLeft <= 3,
          secondsLeft
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [lastRefresh, refreshInterval, t]);

  useEffect(() => {
    if (!lastRefresh) {
      setCountdown({
        timeDisplay: '',
        isNearZero: false,
        isCritical: false,
        secondsLeft: 0
      });
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - lastRefresh.getTime()) / 1000);
      const secondsLeft = Math.max(0, refreshInterval - elapsed);

      let timeDisplay = '';
      if (secondsLeft === 0) {
        timeDisplay = t('common.time.refreshing', 'Refreshing...');
      } else if (secondsLeft < 60) {
        timeDisplay = t('common.time.refresh_in_seconds', `${secondsLeft}s`, { count: secondsLeft });
      } else {
        const minutesLeft = Math.floor(secondsLeft / 60);
        const remainingSeconds = secondsLeft % 60;
        timeDisplay = t('common.time.refresh_in_minutes', `${minutesLeft}:${remainingSeconds.toString().padStart(2, '0')}`, {
          minutes: minutesLeft,
          seconds: remainingSeconds
        });
      }

      setCountdown({
        timeDisplay,
        isNearZero: secondsLeft <= 10,
        isCritical: secondsLeft <= 3,
        secondsLeft
      });
    };

    // Update immediately
    updateCountdown();

    // Only run interval when tab is visible
    if (!isVisible) return;

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [lastRefresh, refreshInterval, t, isVisible]);

  return countdown;
};