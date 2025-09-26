import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface CountdownState {
  timeDisplay: string;
  isNearZero: boolean;
  isCritical: boolean;
  secondsLeft: number;
}

export const useRefreshCountdown = (lastRefresh: Date | null, refreshInterval: number = 60) => {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState<CountdownState>({
    timeDisplay: '',
    isNearZero: false,
    isCritical: false,
    secondsLeft: 0
  });

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

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [lastRefresh, refreshInterval, t]);

  return countdown;
};