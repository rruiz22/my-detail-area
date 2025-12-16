import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Edit2, X, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface DateInlineEditorProps {
  date?: string | Date | null;
  orderId: string;
  orderType: 'recon' | 'carwash' | 'sales' | 'service';
  dateType: 'completed_at' | 'due_date';
  onDateChange: (orderId: string, newDate: Date | null, dateType: 'completed_at' | 'due_date') => Promise<void>;
  canEdit: boolean;
}

export function DateInlineEditor({
  date,
  orderId,
  orderType,
  dateType,
  onDateChange,
  canEdit
}: DateInlineEditorProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showPastDateWarning, setShowPastDateWarning] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);

  const currentDate = date ? new Date(date) : null;
  const isDueDate = dateType === 'due_date';
  const dateLabel = isDueDate ? 'Due Date' : 'Complete Date';

  // Close popover when clicking outside or pressing escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  const handleDateSelect = async (selectedDate: Date | undefined) => {
    if (!selectedDate) return;

    // Preserve original time if a date already exists
    let finalDate = selectedDate;
    if (currentDate) {
      // Extract time components from the original date
      const originalHours = currentDate.getHours();
      const originalMinutes = currentDate.getMinutes();
      const originalSeconds = currentDate.getSeconds();
      const originalMs = currentDate.getMilliseconds();

      // Create new date with selected date but original time
      finalDate = new Date(selectedDate);
      finalDate.setHours(originalHours, originalMinutes, originalSeconds, originalMs);
    }

    // For due_date, warn if selecting a past date
    if (isDueDate && finalDate < new Date(new Date().setHours(0, 0, 0, 0))) {
      setPendingDate(finalDate);
      setShowPastDateWarning(true);
      return;
    }

    setUpdating(true);
    try {
      await onDateChange(orderId, finalDate, dateType);
      setOpen(false);
      toast({
        description: `${dateLabel} updated successfully.`,
        variant: 'default'
      });
    } catch (error) {
      console.error(`Error updating ${dateType}:`, error);
      toast({
        variant: 'destructive',
        description: `Failed to update ${dateLabel.toLowerCase()}.`
      });
    } finally {
      setUpdating(false);
    }
  };

  const confirmPastDate = async () => {
    if (!pendingDate) return;

    setUpdating(true);
    try {
      await onDateChange(orderId, pendingDate, dateType);
      setOpen(false);
      setShowPastDateWarning(false);
      setPendingDate(null);
      toast({
        description: `${dateLabel} updated successfully (set to past date).`,
        variant: 'default'
      });
    } catch (error) {
      console.error(`Error updating ${dateType}:`, error);
      toast({
        variant: 'destructive',
        description: `Failed to update ${dateLabel.toLowerCase()}.`
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleClearDate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Close the popover first to avoid conflicts
    setOpen(false);

    // Show confirmation dialog
    setShowClearDialog(true);
  };

  const confirmClearDate = async () => {
    setUpdating(true);
    try {
      await onDateChange(orderId, null, dateType);
      toast({ description: `${dateLabel} has been removed.` });
    } catch (error) {
      console.error(`Error clearing ${dateType}:`, error);
      toast({
        variant: 'destructive',
        description: `Failed to clear ${dateLabel.toLowerCase()}.`
      });
    } finally {
      setUpdating(false);
    }
  };

  if (!canEdit) {
    // Read-only display
    return (
      <div className="font-bold text-base text-foreground">
        {currentDate ? (
          format(currentDate, 'MMM d, yyyy')
        ) : (
          <span className="text-sm text-muted-foreground font-medium">Not set</span>
        )}
      </div>
    );
  }

  // Editable with popover
  return (
    <>
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto p-2 hover:bg-accent/10 rounded-md transition-colors",
            !currentDate && "text-muted-foreground"
          )}
          disabled={updating}
          type="button"
        >
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="h-4 w-4" />
              {currentDate ? (
                <span className="font-bold text-base">{format(currentDate, 'MMM d, yyyy')}</span>
              ) : (
                <span className="text-sm font-medium">Set date</span>
              )}
              <Edit2 className="h-3 w-3 opacity-50" />
            </div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="center"
        style={{ zIndex: 55 }}
        onOpenAutoFocus={(e) => {
          // Prevent stealing focus from dialog
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          // Close popover when clicking outside
          setOpen(false);
        }}
        onEscapeKeyDown={(e) => {
          // Allow escape to close popover
          setOpen(false);
        }}
      >
        <div className="p-3 space-y-3" onClick={(e) => e.stopPropagation()}>
          <Calendar
            mode="single"
            selected={currentDate || undefined}
            onSelect={handleDateSelect}
            disabled={updating}
            initialFocus
          />
          {currentDate && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearDate}
              disabled={updating}
              className="w-full"
              type="button"
            >
              <X className="h-3 w-3 mr-2" />
              Clear Date
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>

    {/* Clear Date Confirmation Dialog */}
    <ConfirmDialog
      open={showClearDialog}
      onOpenChange={setShowClearDialog}
      title={`Clear ${dateLabel.toLowerCase()}?`}
      description={`This will remove the ${dateLabel.toLowerCase()} from this order. Are you sure?`}
      confirmText="Yes, clear it"
      cancelText="Cancel"
      onConfirm={confirmClearDate}
      variant="destructive"
    />

    {/* Past Date Warning Dialog (for due_date only) */}
    {isDueDate && (
      <ConfirmDialog
        open={showPastDateWarning}
        onOpenChange={setShowPastDateWarning}
        title="Set due date in the past?"
        description={
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span>You are setting a due date that has already passed.</span>
            </div>
            <p>This might affect order priority and SLA calculations. Are you sure you want to continue?</p>
          </div>
        }
        confirmText="Yes, set past date"
        cancelText="Choose different date"
        onConfirm={confirmPastDate}
        onCancel={() => {
          setPendingDate(null);
          setShowPastDateWarning(false);
        }}
        variant="warning"
      />
    )}
    </>
  );
}