import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Edit2, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface TextInlineEditorProps {
  value?: string | null;
  orderId: string;
  fieldName: 'po' | 'ro' | 'tag';
  label: string;
  onValueChange: (orderId: string, fieldName: string, newValue: string) => Promise<void>;
  canEdit: boolean;
  required?: boolean;
  autoUppercase?: boolean;
  maxLength?: number;
  placeholder?: string;
}

export function TextInlineEditor({
  value,
  orderId,
  fieldName,
  label,
  onValueChange,
  canEdit,
  required = true,
  autoUppercase = true,
  maxLength = 50,
  placeholder
}: TextInlineEditorProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const displayValue = value || 'Not assigned';
  const hasValue = !!value;

  // Initialize input value when popover opens
  useEffect(() => {
    if (open) {
      setInputValue(value || '');
      setHasChanges(false);
    }
  }, [open, value]);

  // Close popover when clicking outside or pressing escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Auto-uppercase if enabled
    if (autoUppercase) {
      newValue = newValue.toUpperCase();
    }

    // Respect maxLength
    if (newValue.length <= maxLength) {
      setInputValue(newValue);
      setHasChanges(newValue !== (value || ''));
    }
  };

  const handleSave = async () => {
    // Validation
    const trimmedValue = inputValue.trim();

    if (required && !trimmedValue) {
      toast({
        variant: 'destructive',
        description: `${label} cannot be empty.`
      });
      return;
    }

    // No changes check
    if (trimmedValue === (value || '')) {
      setOpen(false);
      return;
    }

    setUpdating(true);
    try {
      await onValueChange(orderId, fieldName, trimmedValue);
      setOpen(false);
      toast({
        description: `${label} updated successfully.`,
        variant: 'default'
      });
    } catch (error) {
      console.error(`Error updating ${fieldName}:`, error);
      toast({
        variant: 'destructive',
        description: `Failed to update ${label.toLowerCase()}.`
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    setInputValue(value || '');
    setHasChanges(false);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (hasChanges && !updating) {
        handleSave();
      }
    }
  };

  if (!canEdit) {
    // Read-only display
    return (
      <span className={cn(
        "font-bold text-sm font-mono",
        hasValue ? "text-foreground" : "text-muted-foreground"
      )}>
        {displayValue}
      </span>
    );
  }

  // Editable with popover
  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto p-1.5 hover:bg-accent/10 rounded-md transition-colors font-mono text-sm",
            !hasValue && "text-muted-foreground"
          )}
          disabled={updating}
          type="button"
        >
          <div className="flex items-center gap-1.5">
            <span className="font-bold">{displayValue}</span>
            <Edit2 className="h-3 w-3 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3"
        align="center"
        style={{ zIndex: 55 }}
        onOpenAutoFocus={(e) => {
          // Prevent stealing focus from dialog
          e.preventDefault();
          // Focus the input after a brief delay
          setTimeout(() => {
            const input = e.currentTarget.querySelector('input');
            if (input) {
              input.focus();
              input.select();
            }
          }, 0);
        }}
        onInteractOutside={(e) => {
          // Save on click outside if there are changes
          if (hasChanges && !updating) {
            handleSave();
          } else {
            setOpen(false);
          }
        }}
        onEscapeKeyDown={(e) => {
          // Cancel on escape
          handleCancel();
        }}
      >
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-2">
            <Label htmlFor={`${fieldName}-input`} className="text-sm font-semibold">
              Edit {label}
            </Label>
            <Input
              id={`${fieldName}-input`}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
              disabled={updating}
              className="font-mono"
              autoFocus
              maxLength={maxLength}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {required && <span className="text-red-500">*</span>}
                {autoUppercase && 'Auto-uppercase enabled'}
              </span>
              <span>
                {inputValue.length}/{maxLength}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updating || !hasChanges}
              className="flex-1"
              type="button"
            >
              <Save className="h-3 w-3 mr-1.5" />
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={updating}
              className="flex-1"
              type="button"
            >
              <X className="h-3 w-3 mr-1.5" />
              Cancel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}