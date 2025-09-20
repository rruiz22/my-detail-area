import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveClockProps {
  className?: string;
  showIcon?: boolean;
  showDate?: boolean;
  timezone?: string;
  format24h?: boolean;
}

export function LiveClock({
  className,
  showIcon = true,
  showDate = false,
  timezone = 'America/New_York', // Eastern Time
  format24h = false
}: LiveClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: !format24h,
    };

    return date.toLocaleString('en-US', options);
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    };

    return date.toLocaleString('en-US', options);
  };

  const getTimezoneAbbr = () => {
    const date = new Date();
    const timeZoneName = date.toLocaleString('en', {
      timeZoneName: 'short',
      timeZone: timezone
    }).split(' ').pop();

    return timeZoneName || 'ET';
  };

  return (
    <div className={cn(
      "flex items-center gap-2 text-sm font-mono",
      className
    )}>
      {showIcon && (
        <Clock className="h-4 w-4 text-muted-foreground" />
      )}
      <div className="flex flex-col text-center">
        {/* First Row: Time */}
        <span className="font-medium">
          {formatTime(currentTime)}
        </span>
        {/* Second Row: Date and Timezone */}
        {showDate && (
          <span className="text-xs text-muted-foreground">
            {formatDate(currentTime)} {getTimezoneAbbr()}
          </span>
        )}
      </div>
    </div>
  );
}