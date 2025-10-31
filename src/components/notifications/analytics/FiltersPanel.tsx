/**
 * FiltersPanel Component
 * Advanced filtering controls for analytics
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Filter, X, Calendar as CalendarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type {
  AnalyticsFilters,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  TimeRange,
} from '@/types/notification-analytics';

interface FiltersPanelProps {
  filters: AnalyticsFilters;
  onChange: (filters: AnalyticsFilters) => void;
  onReset: () => void;
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({ filters, onChange, onReset }) => {
  const { t } = useTranslation();

  const hasActiveFilters =
    filters.channels?.length ||
    filters.statuses?.length ||
    filters.priorities?.length ||
    filters.userSearch ||
    filters.timeRange === 'custom';

  const handleChannelToggle = (channel: NotificationChannel) => {
    const channels = filters.channels || [];
    const newChannels = channels.includes(channel)
      ? channels.filter((c) => c !== channel)
      : [...channels, channel];

    onChange({ ...filters, channels: newChannels.length > 0 ? newChannels : undefined });
  };

  const handleStatusToggle = (status: NotificationStatus) => {
    const statuses = filters.statuses || [];
    const newStatuses = statuses.includes(status)
      ? statuses.filter((s) => s !== status)
      : [...statuses, status];

    onChange({ ...filters, statuses: newStatuses.length > 0 ? newStatuses : undefined });
  };

  const handlePriorityToggle = (priority: NotificationPriority) => {
    const priorities = filters.priorities || [];
    const newPriorities = priorities.includes(priority)
      ? priorities.filter((p) => p !== priority)
      : [...priorities, priority];

    onChange({ ...filters, priorities: newPriorities.length > 0 ? newPriorities : undefined });
  };

  return (
    <Card className="card-enhanced">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Time Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('notifications.analytics.filters.time_range')}</Label>
              <Select
                value={filters.timeRange}
                onValueChange={(value: TimeRange) => onChange({ ...filters, timeRange: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">{t('common.timeRange.24h')}</SelectItem>
                  <SelectItem value="7d">{t('common.timeRange.7d')}</SelectItem>
                  <SelectItem value="30d">{t('common.timeRange.30d')}</SelectItem>
                  <SelectItem value="90d">{t('common.timeRange.90d')}</SelectItem>
                  <SelectItem value="custom">{t('common.timeRange.custom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {filters.timeRange === 'custom' && (
              <div className="space-y-2">
                <Label>{t('notifications.analytics.filters.date_range')}</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'flex-1 justify-start text-left font-normal',
                          !filters.startDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.startDate
                          ? format(new Date(filters.startDate), 'PPP')
                          : t('notifications.analytics.filters.start_date')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.startDate ? new Date(filters.startDate) : undefined}
                        onSelect={(date) =>
                          onChange({ ...filters, startDate: date?.toISOString() })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'flex-1 justify-start text-left font-normal',
                          !filters.endDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.endDate
                          ? format(new Date(filters.endDate), 'PPP')
                          : t('notifications.analytics.filters.end_date')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.endDate ? new Date(filters.endDate) : undefined}
                        onSelect={(date) => onChange({ ...filters, endDate: date?.toISOString() })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>

          {/* Channels Filter */}
          <div className="space-y-2">
            <Label>{t('notifications.analytics.filters.channels')}</Label>
            <div className="flex flex-wrap gap-2">
              {(['push', 'email', 'in_app', 'sms'] as NotificationChannel[]).map((channel) => (
                <Badge
                  key={channel}
                  variant={filters.channels?.includes(channel) ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleChannelToggle(channel)}
                >
                  {t(`notifications.channels.${channel}`)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label>{t('notifications.analytics.filters.status')}</Label>
            <div className="flex flex-wrap gap-2">
              {(['sent', 'delivered', 'failed', 'opened', 'clicked'] as NotificationStatus[]).map(
                (status) => (
                  <Badge
                    key={status}
                    variant={filters.statuses?.includes(status) ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleStatusToggle(status)}
                  >
                    {t(`notifications.analytics.status.${status}`)}
                  </Badge>
                )
              )}
            </div>
          </div>

          {/* Priority Filter */}
          <div className="space-y-2">
            <Label>{t('notifications.analytics.filters.priority')}</Label>
            <div className="flex flex-wrap gap-2">
              {(['low', 'medium', 'high', 'urgent', 'critical'] as NotificationPriority[]).map(
                (priority) => (
                  <Badge
                    key={priority}
                    variant={filters.priorities?.includes(priority) ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handlePriorityToggle(priority)}
                  >
                    {t(`common.priority.${priority}`)}
                  </Badge>
                )
              )}
            </div>
          </div>

          {/* User Search */}
          <div className="space-y-2">
            <Label>{t('notifications.analytics.filters.user_search')}</Label>
            <Input
              placeholder={t('notifications.analytics.filters.user_search_placeholder')}
              value={filters.userSearch || ''}
              onChange={(e) => onChange({ ...filters, userSearch: e.target.value })}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Filter className="h-4 w-4" />
              <span>
                {hasActiveFilters
                  ? t('notifications.analytics.filters.active')
                  : t('notifications.analytics.filters.none_active')}
              </span>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={onReset}>
                <X className="h-4 w-4 mr-2" />
                {t('notifications.analytics.filters.reset')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
