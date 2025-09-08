import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Filter, 
  X, 
  CalendarIcon, 
  Search,
  Building2,
  Shield,
  Clock,
  User
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

export interface UserFilters {
  search: string;
  dealership: string | null;
  roles: string[];
  status: 'all' | 'active' | 'inactive';
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  lastActivity: 'all' | '7days' | '30days' | '90days';
}

interface AdvancedUserFiltersProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  dealerships: Array<{ id: number; name: string }>;
  availableRoles: string[];
  onReset: () => void;
}

export const AdvancedUserFilters: React.FC<AdvancedUserFiltersProps> = ({
  filters,
  onFiltersChange,
  dealerships,
  availableRoles,
  onReset
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilters = (updates: Partial<UserFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const handleRoleToggle = (role: string, checked: boolean) => {
    const updatedRoles = checked
      ? [...filters.roles, role]
      : filters.roles.filter(r => r !== role);
    
    updateFilters({ roles: updatedRoles });
  };

  const removeFilter = (type: string, value?: string) => {
    switch (type) {
      case 'search':
        updateFilters({ search: '' });
        break;
      case 'dealership':
        updateFilters({ dealership: null });
        break;
      case 'role':
        updateFilters({ roles: filters.roles.filter(r => r !== value) });
        break;
      case 'status':
        updateFilters({ status: 'all' });
        break;
      case 'dateRange':
        updateFilters({ dateRange: { from: null, to: null } });
        break;
      case 'lastActivity':
        updateFilters({ lastActivity: 'all' });
        break;
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.dealership) count++;
    if (filters.roles.length > 0) count++;
    if (filters.status !== 'all') count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.lastActivity !== 'all') count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
            {activeFiltersCount > 0 && (
              <Button variant="outline" size="sm" onClick={onReset}>
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Search */}
        <div className="space-y-2">
          <Label htmlFor="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search Users
          </Label>
          <div className="relative">
            <Input
              id="search"
              placeholder="Search by name, email..."
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              className="pr-8"
            />
            {filters.search && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => removeFilter('search')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Search: "{filters.search}"
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeFilter('search')}
                />
              </Badge>
            )}
            {filters.dealership && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {dealerships.find(d => d.id.toString() === filters.dealership)?.name || 'Unknown'}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeFilter('dealership')}
                />
              </Badge>
            )}
            {filters.roles.map(role => (
              <Badge key={role} variant="secondary" className="flex items-center gap-1">
                {role}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeFilter('role', role)}
                />
              </Badge>
            ))}
            {filters.status !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Status: {filters.status}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeFilter('status')}
                />
              </Badge>
            )}
          </div>
        )}

        {isExpanded && (
          <>
            <Separator />
            
            {/* Advanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Dealership Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Dealership
                </Label>
                <Select
                  value={filters.dealership || 'all'}
                  onValueChange={(value) => 
                    updateFilters({ dealership: value === 'all' ? null : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Dealerships" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dealerships</SelectItem>
                    {dealerships.map((dealer) => (
                      <SelectItem key={dealer.id} value={dealer.id.toString()}>
                        {dealer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Status
                </Label>
                <Select
                  value={filters.status}
                  onValueChange={(value: UserFilters['status']) => 
                    updateFilters({ status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Last Activity Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Last Activity
                </Label>
                <Select
                  value={filters.lastActivity}
                  onValueChange={(value: UserFilters['lastActivity']) => 
                    updateFilters({ lastActivity: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="90days">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Role Filters */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Roles
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availableRoles.map((role) => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role}`}
                      checked={filters.roles.includes(role)}
                      onCheckedChange={(checked) => 
                        handleRoleToggle(role, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`role-${role}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {role}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Registration Date Range
              </Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.from ? format(filters.dateRange.from, 'PPP') : 'From date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.from || undefined}
                      onSelect={(date) => 
                        updateFilters({ 
                          dateRange: { ...filters.dateRange, from: date || null } 
                        })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.to ? format(filters.dateRange.to, 'PPP') : 'To date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.to || undefined}
                      onSelect={(date) => 
                        updateFilters({ 
                          dateRange: { ...filters.dateRange, to: date || null } 
                        })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};