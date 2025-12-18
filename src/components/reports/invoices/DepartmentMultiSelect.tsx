/**
 * Department Multi-Select Component
 *
 * Allows users to select multiple departments for filtering
 * Used in CreateInvoiceDialog for multi-department invoice creation
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, X } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface DepartmentOption {
  value: string;
  label: string;
  color?: string;
}

interface DepartmentMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

const DEPARTMENT_OPTIONS: DepartmentOption[] = [
  { value: 'sales', label: 'Sales', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'service', label: 'Service', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'recon', label: 'Recon', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'carwash', label: 'Car Wash', color: 'bg-orange-100 text-orange-800 border-orange-200' },
];

export function DepartmentMultiSelect({
  value = [],
  onChange,
  placeholder,
  className,
}: DepartmentMultiSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleToggle = (departmentValue: string) => {
    const newValue = value.includes(departmentValue)
      ? value.filter(v => v !== departmentValue)
      : [...value, departmentValue];
    onChange(newValue);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const handleSelectAll = () => {
    if (value.length === DEPARTMENT_OPTIONS.length) {
      onChange([]);
    } else {
      onChange(DEPARTMENT_OPTIONS.map(opt => opt.value));
    }
  };

  const getSelectedLabels = () => {
    if (value.length === 0) {
      return placeholder || t('reports.invoices.select_departments');
    }

    if (value.length === DEPARTMENT_OPTIONS.length) {
      return t('reports.invoices.all_departments');
    }

    const selectedOptions = DEPARTMENT_OPTIONS.filter(opt => value.includes(opt.value));
    if (value.length <= 2) {
      return selectedOptions.map(opt => opt.label).join(', ');
    }

    return t('reports.invoices.departments_selected', { count: value.length });
  };

  const selectedOptions = DEPARTMENT_OPTIONS.filter(opt => value.includes(opt.value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={t('reports.invoices.select_departments')}
          className={cn(
            'w-full justify-between font-normal',
            !value.length && 'text-muted-foreground',
            className
          )}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
            {value.length <= 2 && selectedOptions.length > 0 ? (
              selectedOptions.map((opt) => (
                <Badge
                  key={opt.value}
                  variant="secondary"
                  className={cn('text-xs px-1.5 py-0', opt.color)}
                >
                  {opt.label}
                </Badge>
              ))
            ) : (
              <span className="truncate">{getSelectedLabels()}</span>
            )}
          </div>
          <div className="flex items-center gap-1 ml-auto">
            {value.length > 0 && (
              <X
                className="h-3.5 w-3.5 opacity-50 hover:opacity-100 transition-opacity"
                onClick={handleClear}
              />
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('reports.invoices.search_departments')} className="h-9" />
          <CommandList>
            <CommandEmpty>{t('reports.invoices.no_departments_found')}</CommandEmpty>
            <CommandGroup>
              {/* Select All Option */}
              <CommandItem
                onSelect={handleSelectAll}
                className="font-medium border-b mb-1"
              >
                <div
                  className={cn(
                    'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                    value.length === DEPARTMENT_OPTIONS.length
                      ? 'bg-primary text-primary-foreground'
                      : 'opacity-50 [&_svg]:invisible'
                  )}
                >
                  <Check className="h-3 w-3" />
                </div>
                <span>{t('reports.invoices.select_all_departments')}</span>
              </CommandItem>

              {/* Individual Department Options */}
              {DEPARTMENT_OPTIONS.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleToggle(option.value)}
                >
                  <div
                    className={cn(
                      'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                      value.includes(option.value)
                        ? 'bg-primary text-primary-foreground'
                        : 'opacity-50 [&_svg]:invisible'
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn('text-xs px-1.5 py-0', option.color)}
                    >
                      {option.label}
                    </Badge>
                    <span className="text-sm">{option.label}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}