// =====================================================
// TAGS FILTER SELECT
// Created: 2024-12-04
// Description: Multi-select component for filtering invoices by tags
// =====================================================

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Check, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTagColor } from '@/utils/tagColors';
import { useDealerTagsSummary } from '@/hooks/useInvoiceTags';
import { useTranslation } from 'react-i18next';

interface TagsFilterSelectProps {
  dealerId: number;
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
  className?: string;
}

/**
 * Multi-select component for filtering invoices by tags
 * Shows all dealer tags with usage count
 */
export function TagsFilterSelect({
  dealerId,
  selectedTags,
  onSelectedTagsChange,
  className = '',
}: TagsFilterSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // Fetch all dealer tags
  const { data: allTags = [] } = useDealerTagsSummary(dealerId);

  const handleToggleTag = (tagName: string) => {
    const newSelectedTags = selectedTags.includes(tagName)
      ? selectedTags.filter(t => t !== tagName)
      : [...selectedTags, tagName];

    onSelectedTagsChange(newSelectedTags);
  };

  const handleClearAll = () => {
    onSelectedTagsChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between h-10 px-3 py-2', className)}
        >
          <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
            {selectedTags.length === 0 ? (
              <span className="text-sm text-muted-foreground truncate">
                {t('reports.invoices.tags.all_tags', { defaultValue: 'All tags' })}
              </span>
            ) : (
              <>
                {selectedTags.slice(0, 2).map((tagName) => {
                  const tag = allTags.find(t => t.tagName === tagName);
                  if (!tag) return null;
                  return (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className={`${getTagColor(tag.colorIndex)} text-[9px] px-1.5 py-0 leading-tight flex-shrink-0`}
                    >
                      {tag.tagName}
                    </Badge>
                  );
                })}
                {selectedTags.length > 2 && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 leading-tight flex-shrink-0">
                    +{selectedTags.length - 2}
                  </Badge>
                )}
              </>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={t('reports.invoices.tags.filter_placeholder', { defaultValue: 'Search tags...' })}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t('reports.invoices.tags.no_tags', { defaultValue: 'No tags found' })}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {/* Header with count and clear button */}
              <div className="flex items-center justify-between px-2 py-2 border-b bg-muted/30">
                <span className="text-xs font-medium text-muted-foreground">
                  {selectedTags.length > 0
                    ? `${selectedTags.length} selected`
                    : `${allTags.length} available`}
                </span>
                {selectedTags.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Tag list */}
              {allTags.map((tag) => {
                const isSelected = selectedTags.includes(tag.tagName);
                return (
                  <CommandItem
                    key={tag.id}
                    value={tag.tagName}
                    onSelect={() => handleToggleTag(tag.tagName)}
                    className="flex items-center justify-between cursor-pointer px-3 py-2"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className={cn(
                          'h-4 w-4 border rounded flex items-center justify-center flex-shrink-0 transition-colors',
                          isSelected ? 'bg-primary border-primary' : 'border-input hover:border-primary/50'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <Badge
                        variant="outline"
                        className={`${getTagColor(tag.colorIndex)} text-[10px] px-2 py-0.5`}
                      >
                        {tag.tagName}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0 bg-muted px-1.5 py-0.5 rounded">
                      {tag.invoiceCount || 0}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
