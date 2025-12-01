/**
 * useLiveClock Hook
 *
 * Provides real-time clock with automatic updates
 * Updates every second for live time display
 *
 * Returns formatted time and date strings
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface LiveClockResult {
  time: string; // HH:MM:SS format
  date: string; // Day, Month DD, YYYY format
  timestamp: Date; // Raw Date object
}

export function useLiveClock(formatTime: string = 'HH:mm:ss', formatDate: string = 'EEEE, MMMM d, yyyy'): LiveClockResult {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update immediately
    setCurrentTime(new Date());

    // Update every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    time: format(currentTime, formatTime),
    date: format(currentTime, formatDate),
    timestamp: currentTime
  };
}
