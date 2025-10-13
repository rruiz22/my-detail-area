import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { formatWeekRange, getWeekLabel } from '@/utils/weekUtils';
import { useTranslation } from 'react-i18next';

interface WeekNavigatorProps {
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  className?: string;
}

export function WeekNavigator({
  weekOffset,
  onWeekChange,
  className = ''
}: WeekNavigatorProps) {
  const { t } = useTranslation();

  const handlePrevious = () => {
    onWeekChange(weekOffset - 1);
  };

  const handleNext = () => {
    if (weekOffset < 0) {
      onWeekChange(weekOffset + 1);
    }
  };

  const handleCurrent = () => {
    onWeekChange(0);
  };

  const isCurrentWeek = weekOffset === 0;
  const weekRange = formatWeekRange(weekOffset);
  const weekLabel = getWeekLabel(weekOffset);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Previous Week Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrevious}
        className="h-8 px-2"
        title="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Week Info */}
      <div className="flex flex-col items-center px-3 py-1 bg-muted/50 rounded-md min-w-[200px]">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">
            {weekLabel}
          </span>
        </div>
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {weekRange}
        </div>
      </div>

      {/* Next Week Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleNext}
        disabled={isCurrentWeek}
        className="h-8 px-2"
        title="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Jump to Current Button (only show if not current) */}
      {!isCurrentWeek && (
        <Button
          variant="default"
          size="sm"
          onClick={handleCurrent}
          className="h-8 px-3 text-xs"
        >
          Current Week
        </Button>
      )}
    </div>
  );
}
