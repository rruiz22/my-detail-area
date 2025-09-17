import React from 'react';
import { format, addDays, setHours, setMinutes, isToday, addHours } from 'date-fns';
import { CalendarIcon, ClockIcon, Users, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { safeParseDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAppointmentCapacity } from '@/hooks/useAppointmentCapacity';

interface AppointmentSlot {
  date_slot: string;
  hour_slot: number;
  available_slots: number;
  max_capacity: number;
  is_available: boolean;
}

interface DueDateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  dealerId?: number;
}

export function DueDateTimePicker({
  value,
  onChange,
  className,
  placeholder,
  disabled,
  dealerId
}: DueDateTimePickerProps) {
  const { t } = useTranslation();
  const { getAvailableSlots } = useAppointmentCapacity();
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [availableSlots, setAvailableSlots] = React.useState<AppointmentSlot[]>([]);

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
      // If it's today, ensure minimum 1 hour preparation time
      if (isSelectedToday) {
        const currentMinutes = now.getMinutes();
        const minimumHour = Math.ceil(currentHour + currentMinutes / 60) + 1;

        if (hour < minimumHour) {
          continue;
        }
      }
      
      const time = setMinutes(setHours(new Date(), hour), 0);
      const timeString = format(time, 'h:mm a');

      // Check capacity for this hour slot
      const slotCapacity = availableSlots.find(slot => slot.hour_slot === hour);
      const availableCount = slotCapacity?.available_slots ?? 3;
      const isSlotFull = availableCount <= 0;

      slots.push({
        value: hour.toString(),
        label: timeString,
        disabled: isSlotFull,
        availableSlots: availableCount,
        maxCapacity: slotCapacity?.max_capacity ?? 3
      });
    }
    
    return slots;
  };

  // Load available slots when date changes
  const loadAvailableSlots = React.useCallback(async (date: Date) => {
    if (!dealerId || !date) return;

    try {
      const slots = await getAvailableSlots(dealerId, date);
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading available slots:', error);
      setAvailableSlots([]);
    }
  }, [dealerId, getAvailableSlots]);

  const handleDateChange = (date: Date | undefined) => {
    if (!date) {
      onChange(undefined);
      setAvailableSlots([]);
      setIsCalendarOpen(false);
      return;
    }

    // Load capacity information for the selected date
    loadAvailableSlots(date);

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

  // Disable past dates, Sundays, and dates beyond 1 week
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Disable past dates
    if (date < today) {
      return true;
    }

    // Disable dates more than 1 week in the future
    const oneWeekFromNow = addDays(today, 7);
    if (date > oneWeekFromNow) {
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
                  ? t('due_date.validation.closed_sundays')
                  : t('due_date.validation.no_slots_available')
                }
              </SelectItem>
            ) : (
              timeSlots.map((slot) => (
                <SelectItem
                  key={slot.value}
                  value={slot.value}
                  disabled={slot.disabled}
                  className={cn(
                    "flex items-center justify-between",
                    slot.disabled && "opacity-50"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{slot.label}</span>
                    {dealerId && (
                      <Badge
                        variant={slot.availableSlots > 0 ? "secondary" : "destructive"}
                        className="ml-2 text-xs"
                      >
                        {slot.availableSlots}/{slot.maxCapacity}
                      </Badge>
                    )}
                  </div>
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
