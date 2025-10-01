import { useState, useEffect } from 'react';

/**
 * Hook to calculate real-time days in step from intake date
 * Updates every minute to provide live countdown
 *
 * @param intakeDate - ISO timestamp of when vehicle entered current step
 * @returns Object with days, hours, minutes, and formatted string
 */
export function useRealTimeDaysInStep(intakeDate: string | null | undefined) {
  const [timeData, setTimeData] = useState(() => calculateTimeInStep(intakeDate));

  useEffect(() => {
    if (!intakeDate) {
      setTimeData({ days: 0, hours: 0, minutes: 0, formatted: '0 days' });
      return;
    }

    // Update immediately on mount
    setTimeData(calculateTimeInStep(intakeDate));

    // Update every minute
    const interval = setInterval(() => {
      setTimeData(calculateTimeInStep(intakeDate));
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [intakeDate]);

  return timeData;
}

/**
 * Calculate time elapsed since intake date
 */
function calculateTimeInStep(intakeDate: string | null | undefined) {
  if (!intakeDate) {
    return { days: 0, hours: 0, minutes: 0, formatted: '0 days' };
  }

  const intake = new Date(intakeDate);
  const now = new Date();
  const diffInMs = now.getTime() - intake.getTime();

  // Calculate components
  const totalMinutes = Math.floor(diffInMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  // Format string
  let formatted = '';
  if (days > 0) {
    formatted = `${days} ${days === 1 ? 'day' : 'days'}`;
    if (hours > 0) {
      formatted += `, ${hours}h`;
    }
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m`;
  } else {
    formatted = `${minutes}m`;
  }

  return { days, hours, minutes, formatted };
}

/**
 * Hook to calculate real-time elapsed time from a start timestamp
 * Useful for active work items showing live timer
 *
 * @param startTime - ISO timestamp of when work started
 * @returns Object with hours, minutes, seconds, and formatted string
 */
export function useRealTimeElapsed(startTime: string | null | undefined) {
  const [timeData, setTimeData] = useState(() => calculateElapsedTime(startTime));

  useEffect(() => {
    if (!startTime) {
      setTimeData({ hours: 0, minutes: 0, seconds: 0, formatted: '00:00:00', totalHours: 0 });
      return;
    }

    // Update immediately on mount
    setTimeData(calculateElapsedTime(startTime));

    // Update every second for live timer
    const interval = setInterval(() => {
      setTimeData(calculateElapsedTime(startTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return timeData;
}

/**
 * Calculate elapsed time from start timestamp
 */
function calculateElapsedTime(startTime: string | null | undefined) {
  if (!startTime) {
    return { hours: 0, minutes: 0, seconds: 0, formatted: '00:00:00', totalHours: 0 };
  }

  const start = new Date(startTime);
  const now = new Date();
  const diffInMs = now.getTime() - start.getTime();

  // Calculate components
  const totalSeconds = Math.floor(diffInMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Total hours with decimals (for database storage)
  const totalHours = totalSeconds / 3600;

  // Format string (HH:MM:SS)
  const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return { hours, minutes, seconds, formatted, totalHours };
}
