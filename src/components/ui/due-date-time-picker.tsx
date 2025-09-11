import React from 'react';
import { format, addDays, setHours, setMinutes, isToday, addHours } from 'date-fns';
import { CalendarIcon, ClockIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { safeParseDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DueDateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function DueDateTimePicker({
  value,
  onChange,
  className,
  placeholder,
  disabled
}: DueDateTimePickerProps) {
  const { t } = useTranslation();
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  // Generate time slots based on business hours
  const generateTimeSlots = (selectedDate?: Date) => {
    const slots = [];
    const now = new Date();
    const isSelectedToday = selectedDate && isToday(selectedDate);
    const currentHour = now.getHours();
    
    if (!selectedDate) return slots;
    
    const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Business hours based on day of week
    let endHour = 18; // Default Monday-Friday until 6 PM
    
    if (dayOfWeek === 0) { // Sunday - Closed
      return slots;
    } else if (dayOfWeek === 6) { // Saturday - Until 5 PM
      endHour = 17;
    }
    
    for (let hour = 8; hour <= endHour; hour++) {
      // If it's today, only show times that are at least 1 hour from now
      if (isSelectedToday && hour <= currentHour) {
        continue;
      }
      
      const time = setMinutes(setHours(new Date(), hour), 0);
      const timeString = format(time, 'h:mm a');
      
      slots.push({
        value: hour.toString(),
        label: timeString,
        disabled: isSelectedToday && hour <= currentHour
      });
    }
    
    return slots;
  };

  const handleDateChange = (date: Date | undefined) => {
    if (!date) {
      onChange(undefined);
      setIsCalendarOpen(false);
      return;
    }

    if (value) {
      // Keep existing time if available
      const safeExistingDate = safeParseDate(value.toISOString());
      if (safeExistingDate) {
        const newDate = new Date(date);
        newDate.setHours(safeExistingDate.getHours());
        newDate.setMinutes(safeExistingDate.getMinutes());
        onChange(newDate);
      } else {
        onChange(setMinutes(setHours(date, 8), 0));
      }
    } else {
      // Set default time to 8 AM, or next available slot if today
      const now = new Date();
      const defaultHour = isToday(date) && now.getHours() >= 8 
        ? Math.max(8, now.getHours() + 1) 
        : 8;
      
      if (defaultHour >= 18) {
        // If no slots available today, move to tomorrow 8 AM
        const tomorrow = addDays(date, 1);
        onChange(setMinutes(setHours(tomorrow, 8), 0));
      } else {
        onChange(setMinutes(setHours(date, defaultHour), 0));
      }
    }
    
    // Close the calendar after selecting a date
    setIsCalendarOpen(false);
  };

  const handleTimeChange = (hourString: string) => {
    if (!value || !hourString) return;
    
    const hour = parseInt(hourString);
    const safeDate = safeParseDate(value.toISOString());
    if (!safeDate) return;
    
    const newDate = setMinutes(setHours(safeDate, hour), 0);
    onChange(newDate);
  };

  const timeSlots = generateTimeSlots(value);
  const selectedHour = value ? value.getHours().toString() : "";

  // Disable past dates and Sundays
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Disable past dates
    if (date < today) {
      return true;
    }
    
    // Disable Sundays (day 0)
    if (date.getDay() === 0) {
      return true;
    }
    
    return false;
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="grid grid-cols-1 gap-2">
        {/* Date Picker */}
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !value && "text-muted-foreground"
              )}
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(value, "PPP") : t('due_date.date_placeholder')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleDateChange}
              disabled={isDateDisabled}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* Time Picker */}
        <Select
          value={selectedHour}
          onValueChange={handleTimeChange}
          disabled={disabled || !value}
        >
          <SelectTrigger>
            <ClockIcon className="mr-2 h-4 w-4" />
            <SelectValue placeholder={t('due_date.time_placeholder')} />
          </SelectTrigger>
          <SelectContent className="bg-popover border border-border z-50">
            {timeSlots.length === 0 ? (
              <SelectItem value="no-slots" disabled>
                {value?.getDay() === 0 
                  ? "Cerrado los domingos" 
                  : t('due_date.validation.no_slots_available')
                }
              </SelectItem>
            ) : (
              timeSlots.map((slot) => (
                <SelectItem
                  key={slot.value}
                  value={slot.value}
                  disabled={slot.disabled}
                >
                  {slot.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Validation Messages */}
      {value && isToday(value) && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="text-amber-600 dark:text-amber-400">
            {t('due_date.validation.same_day_notice')}
          </p>
        </div>
      )}
    </div>
  );
}
