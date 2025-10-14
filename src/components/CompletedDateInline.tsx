import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Edit2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

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
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

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

  const handleClearDate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Close the popover first to avoid z-index conflicts
    setOpen(false);

    // Use SweetAlert2 with high z-index for modal compatibility
    const result = await Swal.fire({
      title: 'Clear completion date?',
      text: 'This will remove the completion date from this order.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, clear it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
      customClass: {
        container: 'swal2-in-modal',
        popup: 'rounded-lg shadow-xl',
        title: 'text-base sm:text-xl font-bold text-gray-900',
        htmlContainer: 'text-sm text-gray-600',
        confirmButton: 'bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md',
        cancelButton: 'bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md',
        actions: 'flex-col sm:flex-row gap-2 w-full'
      },
      buttonsStyling: false,
      width: 'auto',
      // Ensure it appears above the dialog modal (Dialog is z-50, SweetAlert should be z-60+)
      didOpen: (popup) => {
        const container = popup.parentElement;
        if (container) {
          container.style.zIndex = '60';
        }
        popup.style.zIndex = '65';
        popup.style.position = 'relative';

        // Ensure buttons are clickable
        const actions = popup.querySelector('.swal2-actions');
        if (actions) {
          (actions as HTMLElement).style.zIndex = '66';
          (actions as HTMLElement).style.position = 'relative';
        }

        const buttons = popup.querySelectorAll('.swal2-confirm, .swal2-cancel, .swal2-styled');
        buttons.forEach(btn => {
          (btn as HTMLElement).style.zIndex = '67';
          (btn as HTMLElement).style.position = 'relative';
          (btn as HTMLElement).style.pointerEvents = 'auto';
        });
      },
      didClose: () => {
        // Clean up any lingering elements after close
        setTimeout(() => {
          const containers = document.querySelectorAll('.swal2-container, .swal2-backdrop-show, .swal2-shown');
          containers.forEach(el => {
            if (el && el.parentNode) {
              el.remove();
            }
          });
          // Also remove any body classes added by SweetAlert2
          document.body.classList.remove('swal2-shown', 'swal2-height-auto');
        }, 50);
      },
      allowOutsideClick: true,
      allowEscapeKey: true,
      backdrop: true
    });

    if (result.isConfirmed) {
      setUpdating(true);
      try {
        await onDateChange(orderId, null);
        toast.success('Completion date has been removed.');
      } catch (error) {
        console.error('Error clearing completed date:', error);
        toast.error('Failed to clear completion date.');
      } finally {
        setUpdating(false);
      }
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
  );
}
