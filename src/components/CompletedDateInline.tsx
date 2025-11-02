import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Edit2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CompletedDateInlineProps {
  completedAt?: string | Date | null;
  orderId: string;
  orderType: 'recon' | 'carwash';
  onDateChange: (orderId: string, newDate: Date | null) => Promise<void>;
  canEdit: boolean;
}

export function CompletedDateInline({
  completedAt,
  orderId,
  orderType,
  onDateChange,
  canEdit
}: CompletedDateInlineProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  const currentDate = completedAt ? new Date(completedAt) : null;

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

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;

    setUpdating(true);
    try {
      await onDateChange(orderId, date);
      setOpen(false);
    } catch (error) {
      console.error('Error updating completed date:', error);
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
      await onDateChange(orderId, null);
      toast({ description: 'Completion date has been removed.' });
    } catch (error) {
      console.error('Error clearing completed date:', error);
      toast({ variant: 'destructive', description: 'Failed to clear completion date.' });
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

    {/* Clear Date Confirmation Dialog - Team Chat Style */}
    <ConfirmDialog
      open={showClearDialog}
      onOpenChange={setShowClearDialog}
      title="Clear completion date?"
      description="This will remove the completion date from this order. Are you sure?"
      confirmText="Yes, clear it"
      cancelText="Cancel"
      onConfirm={confirmClearDate}
      variant="destructive"
    />
    </>
  );
}

