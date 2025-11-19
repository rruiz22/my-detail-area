/**
 * useBreakTimer Hook
 *
 * Calculates real-time countdown for break minimum duration
 * Updates every second to show precise MM:SS remaining
 */

import { useState, useEffect } from 'react';

interface UseBreakTimerResult {
  secondsRemaining: number;
  minutesRemaining: number;
  isComplete: boolean;
  formatted: string; // MM:SS format
}

export function useBreakTimer(breakStart: string | null, minimumMinutes: number = 30): UseBreakTimerResult {
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    if (!breakStart) {
      setSecondsRemaining(0);
      return;
    }

    const updateTimer = () => {
      const start = new Date(breakStart);
      const now = new Date();
      const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
      const requiredSeconds = minimumMinutes * 60;
      const remaining = Math.max(0, requiredSeconds - elapsedSeconds);
      setSecondsRemaining(remaining);
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [breakStart, minimumMinutes]);

  const minutesRemaining = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formatted = `${minutesRemaining}:${seconds.toString().padStart(2, '0')}`;

  return {
    secondsRemaining,
    minutesRemaining,
    isComplete: secondsRemaining === 0,
    formatted
  };
}
