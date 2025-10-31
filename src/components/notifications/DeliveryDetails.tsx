/**
 * DeliveryDetails Component
 * Expandable delivery metadata viewer
 * Enterprise-grade with retry functionality
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  MousePointerClick,
  RefreshCw,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DeliveryStatus, DeliveryMetadata } from '@/types/notification-delivery';
import { useNotificationRetry } from '@/hooks/useNotificationRetry';
import { DeliveryStatusBadge, ChannelBadge } from './DeliveryStatusBadge';

interface DeliveryDetailsProps {
  notificationId: string;
  status: DeliveryStatus;
  metadata: DeliveryMetadata;
  className?: string;
}

/**
 * DeliveryDetails - Display detailed delivery information
 */
export function DeliveryDetails({
  notificationId,
  status,
  metadata,
  className,
}: DeliveryDetailsProps) {
  const { t } = useTranslation();
  const { retryNotification, retrying } = useNotificationRetry();

  const handleRetry = async () => {
    await retryNotification(notificationId);
  };

  // Check if retry is available
  const canRetry = status === 'failed' && metadata.retry_count < 3;

  return (
    <Card className={cn('border-l-4', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium">
            {t('notifications.delivery.details_title')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <DeliveryStatusBadge status={status} channel={metadata.channel} size="sm" />
            <ChannelBadge channel={metadata.channel} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Timeline */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
            {t('notifications.delivery.timeline')}
          </h4>
          <div className="space-y-1.5">
            {metadata.sent_at && (
              <TimelineItem
                icon={<Send className="h-3.5 w-3.5" />}
                label={t('notifications.delivery.sent_at')}
                time={metadata.sent_at}
                color="indigo"
              />
            )}
            {metadata.delivered_at && (
              <TimelineItem
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                label={t('notifications.delivery.delivered_at')}
                time={metadata.delivered_at}
                color="emerald"
              />
            )}
            {metadata.clicked_at && (
              <TimelineItem
                icon={<MousePointerClick className="h-3.5 w-3.5" />}
                label={t('notifications.delivery.clicked_at')}
                time={metadata.clicked_at}
                color="purple"
              />
            )}
            {metadata.read_at && (
              <TimelineItem
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                label={t('notifications.delivery.read_at')}
                time={metadata.read_at}
                color="gray"
              />
            )}
            {metadata.failed_at && (
              <TimelineItem
                icon={<XCircle className="h-3.5 w-3.5" />}
                label={t('notifications.delivery.failed_at')}
                time={metadata.failed_at}
                color="red"
              />
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3">
          {metadata.latency_ms !== undefined && (
            <MetricCard
              icon={<Clock className="h-4 w-4" />}
              label={t('notifications.delivery.latency')}
              value={`${metadata.latency_ms}ms`}
              variant="neutral"
            />
          )}
          {metadata.retry_count !== undefined && (
            <MetricCard
              icon={<RefreshCw className="h-4 w-4" />}
              label={t('notifications.delivery.retry_count')}
              value={metadata.retry_count.toString()}
              variant={metadata.retry_count > 0 ? 'warning' : 'neutral'}
            />
          )}
          {metadata.cost !== undefined && (
            <MetricCard
              icon={<DollarSign className="h-4 w-4" />}
              label={t('notifications.delivery.cost')}
              value={`$${metadata.cost.toFixed(4)}`}
              variant="neutral"
            />
          )}
          {metadata.provider && (
            <div className="col-span-2">
              <div className="text-xs text-gray-600 mb-1">
                {t('notifications.delivery.provider')}
              </div>
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                {metadata.provider}
              </Badge>
            </div>
          )}
        </div>

        {/* Error Details */}
        {status === 'failed' && metadata.error_message && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-red-700 mb-1">
                  {t('notifications.delivery.error')}
                </div>
                {metadata.error_code && (
                  <div className="text-xs text-red-600 mb-1">
                    {t('notifications.delivery.error_code')}: {metadata.error_code}
                  </div>
                )}
                <div className="text-xs text-red-600 break-words">
                  {metadata.error_message}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Retry Button */}
        {canRetry && (
          <div className="pt-2 border-t border-gray-200">
            <Button
              onClick={handleRetry}
              disabled={retrying}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-2', retrying && 'animate-spin')} />
              {retrying
                ? t('notifications.delivery.retrying')
                : t('notifications.delivery.retry_delivery')}
            </Button>
            <div className="text-xs text-gray-500 text-center mt-2">
              {t('notifications.delivery.retry_attempts', {
                count: metadata.retry_count,
                max: 3,
              })}
            </div>
          </div>
        )}

        {/* Additional Metadata */}
        {metadata.metadata && Object.keys(metadata.metadata).length > 0 && (
          <details className="pt-2 border-t border-gray-200">
            <summary className="text-xs font-medium text-gray-700 cursor-pointer hover:text-gray-900">
              {t('notifications.delivery.additional_metadata')}
            </summary>
            <pre className="mt-2 p-2 bg-gray-50 rounded text-[10px] text-gray-600 overflow-x-auto">
              {JSON.stringify(metadata.metadata, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * TimelineItem - Individual timeline entry
 */
interface TimelineItemProps {
  icon: React.ReactNode;
  label: string;
  time: string;
  color: 'indigo' | 'emerald' | 'purple' | 'gray' | 'red';
}

function TimelineItem({ icon, label, time, color }: TimelineItemProps) {
  const colorClasses = {
    indigo: 'text-indigo-600 bg-indigo-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    purple: 'text-purple-600 bg-purple-50',
    gray: 'text-gray-600 bg-gray-50',
    red: 'text-red-600 bg-red-50',
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={cn('p-1 rounded', colorClasses[color])}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-600">{label}</div>
      </div>
      <div className="text-xs text-gray-500 whitespace-nowrap">
        {formatDistanceToNow(new Date(time), { addSuffix: true })}
      </div>
    </div>
  );
}

/**
 * MetricCard - Small metric display card
 */
interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  variant: 'neutral' | 'warning' | 'success' | 'error';
}

function MetricCard({ icon, label, value, variant }: MetricCardProps) {
  const variantClasses = {
    neutral: 'bg-gray-50 border-gray-200 text-gray-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    error: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className={cn('p-3 rounded-lg border', variantClasses[variant])}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <div className="text-xs font-medium">{label}</div>
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
