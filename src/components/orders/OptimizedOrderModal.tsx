/**
 * Optimized Order Modal Example
 *
 * Demonstrates the implementation of the optimized order modal data fetching
 * with performance monitoring, intelligent caching, and real-time updates.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  RefreshCw,
  Zap,
  Activity,
  Database,
  Signal,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

import { useOrderModalData } from '@/hooks/useOrderModalData';
import type { OrderData } from '@/types/order';

interface OptimizedOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderData | null;
}

/**
 * Performance monitor component for debugging and optimization
 */
const PerformanceMonitor: React.FC<{
  metrics: any;
  onRefresh: () => void;
  onClearCache: () => void;
}> = ({ metrics, onRefresh, onClearCache }) => {
  const { t } = useTranslation();

  const performanceIndicators = useMemo(() => [
    {
      label: 'Cache Hit',
      value: metrics.cacheHit,
      icon: metrics.cacheHit ? CheckCircle : Clock,
      color: metrics.cacheHit ? 'text-green-600' : 'text-yellow-600'
    },
    {
      label: 'Stale Cache',
      value: metrics.staleCacheHit,
      icon: Clock,
      color: metrics.staleCacheHit ? 'text-yellow-600' : 'text-gray-400'
    },
    {
      label: 'Real-time',
      value: metrics.realtimeMetrics?.connectionStatus === 'connected',
      icon: Signal,
      color: metrics.realtimeMetrics?.connectionStatus === 'connected'
        ? 'text-green-600' : 'text-red-600'
    }
  ], [metrics]);

  const cacheStats = metrics.cacheStats || {};
  const queryStats = metrics.queryOptimizerStats || {};

  return (
    <Card className="border-dashed border-gray-200 bg-gray-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {t('performance.monitor_title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Performance Indicators */}
        <div className="grid grid-cols-3 gap-4">
          {performanceIndicators.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="text-center">
              <Icon className={`h-6 w-6 mx-auto mb-1 ${color}`} />
              <div className="text-xs font-medium">{label}</div>
              <div className="text-xs text-gray-500">
                {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Cache Statistics */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="font-medium mb-2">{t('performance.cache_stats')}</div>
            <div className="space-y-1">
              <div>Size: {cacheStats.size || 0}</div>
              <div>Hit Rate: {(cacheStats.cacheHitRate || 0).toFixed(1)}%</div>
              <div>Active Requests: {cacheStats.activeRequests || 0}</div>
            </div>
          </div>
          <div>
            <div className="font-medium mb-2">{t('performance.query_stats')}</div>
            <div className="space-y-1">
              <div>Avg Duration: {(queryStats.averageDuration || 0).toFixed(0)}ms</div>
              <div>Error Rate: {(queryStats.errorRate || 0).toFixed(1)}%</div>
              <div>Connections: {queryStats.activeConnections || 0}</div>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-3 w-3 mr-1" />
            {t('performance.refresh')}
          </Button>
          <Button size="sm" variant="outline" onClick={onClearCache}>
            <Database className="h-3 w-3 mr-1" />
            {t('performance.clear_cache')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Optimized Order Modal with advanced data fetching
 */
export const OptimizedOrderModal: React.FC<OptimizedOrderModalProps> = ({
  isOpen,
  onClose,
  order
}) => {
  const { t } = useTranslation();
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);

  // Initialize optimized data fetching
  const {
    data,
    loading,
    error,
    performanceMetrics,
    prefetchData,
    forceRefresh,
    clearCache,
    addAttachment,
    addComment
  } = useOrderModalData({
    orderId: order?.id || null,
    qrCodeUrl: order?.qr_code_url,
    enabled: isOpen // Only fetch when modal is open
  });

  // Prefetch data when modal is about to open
  useEffect(() => {
    if (order?.id && !isOpen) {
      // Prefetch 500ms before modal opens for better UX
      const prefetchTimer = setTimeout(() => {
        prefetchData();
      }, 500);

      return () => clearTimeout(prefetchTimer);
    }
  }, [order?.id, isOpen, prefetchData]);

  // Handle optimistic updates for better UX
  const handleAddComment = useCallback(async (commentText: string) => {
    if (!order?.id) return;

    // Optimistic update
    const tempComment = {
      id: `temp-${Date.now()}`,
      order_id: order.id,
      comment: commentText,
      is_internal: false,
      created_by: 'current-user-id', // Should come from auth context
      created_at: new Date().toISOString(),
      user_name: 'You'
    };

    const rollback = addComment(tempComment);

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Comment added successfully');
    } catch (error) {
      rollback();
      console.error('Failed to add comment:', error);
    }
  }, [order?.id, addComment]);

  const handleAddAttachment = useCallback(async (file: File) => {
    if (!order?.id) return;

    // Optimistic update
    const tempAttachment = {
      id: `temp-${Date.now()}`,
      order_id: order.id,
      file_name: file.name,
      file_path: `temp/${file.name}`,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: 'current-user-id',
      upload_context: 'modal-upload',
      description: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const rollback = addAttachment(tempAttachment);

    try {
      // TODO: Replace with actual file upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Attachment uploaded successfully');
    } catch (error) {
      rollback();
      console.error('Failed to upload attachment:', error);
    }
  }, [order?.id, addAttachment]);

  // Performance monitoring toggle (development only)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        setShowPerformanceMonitor(prev => !prev);
      }
    };

    if (process.env.NODE_ENV === 'development') {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, []);

  if (!isOpen || !order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-screen h-screen p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  {t('orders.modal.title')} - {order.custom_order_number || order.id}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">{order.order_type}</Badge>
                  <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                    {order.status}
                  </Badge>
                  {performanceMetrics.cacheHit && (
                    <Badge variant="outline" className="text-green-600">
                      <Zap className="h-3 w-3 mr-1" />
                      {t('performance.cached')}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Performance Toggle (Development) */}
              {process.env.NODE_ENV === 'development' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
                >
                  <Activity className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <div className="grid lg:grid-cols-[2fr,1fr] h-full">
              {/* Main Content Area */}
              <div className="p-6 overflow-y-auto">
                {/* Error State */}
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {t('orders.modal.error_loading')}: {error}
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-2"
                        onClick={() => forceRefresh()}
                      >
                        {t('common.retry')}
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Loading State */}
                {loading && !data.attachments.length && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">{t('orders.modal.loading')}</p>
                    </div>
                  </div>
                )}

                {/* Order Details */}
                <div className="space-y-6">
                  {/* Vehicle Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('orders.vehicle_information')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            {t('orders.vehicle_year')}
                          </label>
                          <p className="font-medium">{order.vehicle_year || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            {t('orders.vehicle_make')}
                          </label>
                          <p className="font-medium">{order.vehicle_make || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            {t('orders.vehicle_model')}
                          </label>
                          <p className="font-medium">{order.vehicle_model || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            {t('orders.vehicle_vin')}
                          </label>
                          <p className="font-medium font-mono text-sm">
                            {order.vehicle_vin || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Comments Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t('team_communication.comments')} ({data.comments.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Add Comment Button */}
                        <Button
                          onClick={() => handleAddComment('Test comment from optimized modal')}
                          disabled={loading}
                        >
                          {t('team_communication.add_comment')}
                        </Button>

                        {/* Comments List */}
                        {data.comments.length > 0 ? (
                          <div className="space-y-3">
                            {data.comments.map((comment) => (
                              <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-medium text-sm">
                                    {comment.user_name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(comment.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm">{comment.comment}</p>
                                {comment.is_internal && (
                                  <Badge variant="secondary" className="mt-2">
                                    {t('team_communication.internal')}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">
                            {t('team_communication.no_comments')}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Attachments Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t('attachments.title')} ({data.attachments.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Upload Button */}
                        <Button
                          onClick={() => {
                            // Simulate file upload
                            const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
                            handleAddAttachment(mockFile);
                          }}
                          disabled={loading}
                        >
                          {t('attachments.upload')}
                        </Button>

                        {/* Attachments List */}
                        {data.attachments.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {data.attachments.map((attachment) => (
                              <div key={attachment.id} className="p-3 border rounded-lg">
                                <div className="font-medium text-sm">
                                  {attachment.file_name}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {(attachment.file_size / 1024).toFixed(1)} KB • {attachment.mime_type}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {new Date(attachment.created_at).toLocaleString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">
                            {t('attachments.no_attachments')}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Sidebar */}
              <div className="border-l bg-gray-50 p-6 overflow-y-auto">
                <div className="space-y-6">
                  {/* QR Code Section */}
                  {order.qr_code_url && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">{t('orders.qr_code')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center">
                          <div className="w-32 h-32 bg-gray-200 mx-auto mb-2 rounded-lg flex items-center justify-center">
                            <span className="text-sm text-gray-500">QR Code</span>
                          </div>
                          <p className="text-xs text-gray-500">{order.qr_code_url}</p>
                          {data.analytics && (
                            <div className="mt-3 text-xs space-y-1">
                              <div>Clicks: {data.analytics.totalClicks}</div>
                              <div>Visitors: {data.analytics.uniqueVisitors}</div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Performance Monitor */}
                  {showPerformanceMonitor && (
                    <PerformanceMonitor
                      metrics={performanceMetrics}
                      onRefresh={forceRefresh}
                      onClearCache={clearCache}
                    />
                  )}

                  {/* Real-time Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Signal className="h-4 w-4" />
                        {t('performance.realtime_status')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span>{t('performance.connection')}:</span>
                          <Badge
                            variant={
                              performanceMetrics.realtimeMetrics?.connectionStatus === 'connected'
                                ? 'default' : 'secondary'
                            }
                          >
                            {performanceMetrics.realtimeMetrics?.connectionStatus || 'unknown'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('performance.updates')}:</span>
                          <span>{performanceMetrics.realtimeMetrics?.updateCount || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-4 flex justify-end">
            <Button onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};