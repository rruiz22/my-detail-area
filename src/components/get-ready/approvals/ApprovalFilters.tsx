import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useApprovalFilters } from '@/hooks/useApprovalFilters';
import { useDebounce } from '@/hooks/useDebounce';
import { Filter, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function ApprovalFilters() {
  const { t } = useTranslation();
  const {
    statuses,
    searchQuery,
    setStatuses,
    setSearchQuery,
    resetFilters
  } = useApprovalFilters();

  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Debounce search to avoid too many queries
  useDebounce(() => {
    setSearchQuery(localSearch);
  }, 300, [localSearch]);

  const handleStatusToggle = (status: 'pending' | 'approved' | 'rejected') => {
    if (statuses.includes(status)) {
      setStatuses(statuses.filter(s => s !== status));
    } else {
      setStatuses([...statuses, status]);
    }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statuses.length < 3) count++; // Not all statuses selected
    if (searchQuery.trim()) count++;
    return count;
  }, [statuses, searchQuery]);

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="flex items-center gap-3">
      {/* Search Bar */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('get_ready.approvals.filters.search_placeholder') ||
            'Search by stock #, VIN, vehicle, approver, or reason...'}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-9 pr-9"
        />
        {localSearch && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => {
              setLocalSearch('');
              setSearchQuery('');
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <Badge
                variant="destructive"
                className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">
                {t('get_ready.approvals.filters.title') || 'Filter Options'}
              </h4>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-auto p-1 text-xs"
                >
                  Reset All
                </Button>
              )}
            </div>

            <Separator />

            {/* Status Filters */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {t('get_ready.approvals.filters.status') || 'Status'}
              </Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="filter-pending"
                    checked={statuses.includes('pending')}
                    onCheckedChange={() => handleStatusToggle('pending')}
                  />
                  <Label
                    htmlFor="filter-pending"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Pending
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="filter-approved"
                    checked={statuses.includes('approved')}
                    onCheckedChange={() => handleStatusToggle('approved')}
                  />
                  <Label
                    htmlFor="filter-approved"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Approved
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="filter-rejected"
                    checked={statuses.includes('rejected')}
                    onCheckedChange={() => handleStatusToggle('rejected')}
                  />
                  <Label
                    htmlFor="filter-rejected"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Rejected
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
