import React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CompletionDatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  allowPastDates?: boolean;
}

export function CompletionDatePicker({
  value,
  onChange,
  className,
  placeholder,
  disabled,
  allowPastDates = true
}: CompletionDatePickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      // Set time to noon to avoid timezone issues
      const dateAtNoon = new Date(date);
      dateAtNoon.setHours(12, 0, 0, 0);
      onChange(dateAtNoon);
    } else {
      onChange(undefined);
    }
    setIsOpen(false);
  };

  // Disable future dates by default (completion dates should be past/present)
  const isDateDisabled = (date: Date) => {
    if (allowPastDates) {
      // Allow all dates
      return false;
    }

    // Disable future dates
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date > today;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : placeholder || t('completion_date.select_date')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateChange}
          disabled={isDateDisabled}
          initialFocus
          className="p-3"
        />
      </PopoverContent>
    </Popover>
  );
}
