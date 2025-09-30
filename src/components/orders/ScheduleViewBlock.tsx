import React, { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Timer,
  Target,
  Wifi,
  WifiOff,
  Play,
  Pause,
  XCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createScheduleItems, getOrderDateSummary } from '@/utils/orderDateUtils';
import { getEnhancedDueDateStatus } from '@/utils/overdueCalculations';
import type { OrderData } from '@/types/order';
import { useRealtimeSchedule } from '@/hooks/useRealtimeSchedule';

interface ScheduleViewBlockProps {
  order: OrderData;
  onStatusUpdate?: (newStatus: string) => void;
  onDateUpdate?: (field: string, newDate: string) => void;
  enableInteractiveFeatures?: boolean;
}

interface DueDateStatus {
  status: 'overdue' | 'today' | 'tomorrow' | 'future';
  text: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<any>;
}

interface ScheduleItem {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  subtitle: string;
}

// Helper functions for progress bar colors
const getProgressColorClass = (status: string): string => {
  switch (status) {
    case 'pending':
      return '[&>div]:bg-amber-500'; // Yellow for pending
    case 'in_progress':
      return '[&>div]:bg-blue-500'; // Blue for in progress
    case 'completed':
      return '[&>div]:bg-green-500'; // Green for completed
    case 'cancelled':
      return '[&>div]:bg-gray-400'; // Gray for cancelled
    default:
      return '[&>div]:bg-gray-300'; // Default gray
  }
};

// Memoized component to prevent unnecessary re-renders
export const ScheduleViewBlock = React.memo(function ScheduleViewBlock({
  order,
  onStatusUpdate,
  onDateUpdate,
  enableInteractiveFeatures = false
}: ScheduleViewBlockProps) {
  const { t } = useTranslation();

  // Debug logging to understand data structure
  React.useEffect(() => {
    console.log('🔍 [SCHEDULE DEBUG] Order data received:', {
      id: order.id,
      created_at: order.created_at,
      updated_at: order.updated_at,
      due_date: order.due_date,
      status: order.status,
      fullOrder: order
    });
    console.log('⚡ [CACHE REFRESH] Component refreshed at:', new Date().toLocaleTimeString());
  }, [order]);

  // Local state for real-time updates
  const [currentOrder, setCurrentOrder] = useState<OrderData>(order);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);

  // Handle real-time schedule updates
  const handleScheduleUpdate = useCallback((update: any) => {
    setCurrentOrder(prev => ({
      ...prev,
      due_date: update.due_date ?? prev.due_date,
      status: update.status ?? prev.status,
      estimated_completion: update.estimated_completion ?? prev.estimated_completion,
      assigned_to: update.assigned_to ?? prev.assigned_to,
      updated_at: update.updated_at ?? prev.updated_at
    }));
    setLastUpdateTime(new Date().toLocaleTimeString());
  }, []);

  // Real-time subscription
  const { isConnected, connectionError, lastUpdate } = useRealtimeSchedule({
    orderId: order.id,
    enabled: true,
    onScheduleUpdate: handleScheduleUpdate
  });

  // Update local order when prop changes
  React.useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  // Enhanced due date status calculation with hour-level precision
  const dueDateStatus = useMemo(() => {
    // Don't show due date countdown for finalized orders
    if (['completed', 'cancelled'].includes(currentOrder.status)) {
      if (currentOrder.status === 'completed') {
        return {
          status: 'completed',
          text: 'Order Completed',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          icon: CheckCircle
        };
      } else {
        return {
          status: 'cancelled',
          text: 'Order Cancelled',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          icon: XCircle
        };
      }
    }

    // Active orders - existing logic
    const dueDate = getOrderDateSummary(currentOrder).due;

    if (!dueDate.isValid || !dueDate.rawValue) {
      console.log('📅 [DUE DATE STATUS] No valid due date found');
      return null;
    }

    const enhancedStatus = getEnhancedDueDateStatus(dueDate.rawValue, t);

    if (enhancedStatus) {
      console.log('📅 [ENHANCED STATUS]', {
        isOverdue: enhancedStatus.status === 'overdue',
        text: enhancedStatus.text,
        severity: enhancedStatus.severity
      });

      return {
        status: enhancedStatus.status,
        text: enhancedStatus.text,
        color: enhancedStatus.color,
        bgColor: enhancedStatus.bgColor,
        icon: enhancedStatus.icon === 'AlertTriangle' ? AlertTriangle :
              enhancedStatus.icon === 'Clock' ? Clock :
              enhancedStatus.icon === 'CheckCircle' ? CheckCircle : Timer
      };
    }

    return null;
  }, [currentOrder, t]);

  // Memoize order progress calculation
  const progress = useMemo(() => {
    const statusProgress = {
      pending: 25,
      in_progress: 60,
      completed: 100,
      cancelled: 0
    };
    return statusProgress[currentOrder.status as keyof typeof statusProgress] || 0;
  }, [currentOrder.status]);

  // Memoize order age calculation using enhanced date access
  const orderAge = useMemo(() => {
    const created = getOrderDateSummary(currentOrder).created;

    if (!created.isValid || !created.rawValue) {
      console.log('❌ [ORDER AGE] No valid created date found');
      return 'Unknown age';
    }

    const createdDate = new Date(created.rawValue);
    const now = new Date();
    const diffTime = now.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    console.log('📅 [ORDER AGE]', {
      createdDate: createdDate.toISOString(),
      now: now.toISOString(),
      diffDays,
      source: created.source
    });

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  }, [currentOrder]);

  // Enhanced schedule items with robust date handling and debugging
  const scheduleItems = useMemo(() => {
    console.log('🔍 [SCHEDULE ITEMS] Building schedule items for order:', currentOrder.id);

    // Use enhanced date utilities with fallbacks
    const items = createScheduleItems(currentOrder, t, orderAge);

    // Convert to expected format and add icons
    const scheduleItemsWithIcons: ScheduleItem[] = items.map((item, index) => {
      const iconMap = {
        'Calendar': Calendar,
        'Target': Target,
        'Clock': Clock
      };

      console.log(`📅 [SCHEDULE ITEM ${index}]`, {
        label: item.label,
        value: item.value,
        subtitle: item.subtitle,
        debug: item.debug
      });

      return {
        icon: iconMap[item.icon as keyof typeof iconMap] || Calendar,
        label: item.label,
        value: item.value,
        subtitle: item.subtitle
      };
    });

    return scheduleItemsWithIcons;
  }, [currentOrder, t, orderAge]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {t('schedule_view.schedule_timeline')}
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" title="Real-time updates active" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" title={connectionError || "Real-time updates disabled"} />
            )}
            {lastUpdate && (
              <Badge variant="outline" className="text-xs">
                Live
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Due Date Status Banner */}
        {dueDateStatus && (
          <div className={`p-3 rounded-lg ${dueDateStatus.bgColor} border border-border/50`}>
            <div className="flex items-center gap-2">
              <dueDateStatus.icon className={`h-4 w-4 ${dueDateStatus.color}`} />
              <span className={`text-sm font-medium ${dueDateStatus.color}`}>
                {dueDateStatus.text}
              </span>
            </div>
          </div>
        )}

        {/* Enhanced Order Progress with Animations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('schedule_view.order_progress')}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{progress}%</span>
              {progress === 100 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5, ease: "backOut" }}
                >
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                </motion.div>
              )}
            </div>
          </div>

          {/* Progress Bar with Status Colors */}
          <Progress
            value={progress}
            className={`h-3 ${getProgressColorClass(currentOrder.status)}`}
          />

          {/* Status Indicator with Subtle Animation */}
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            {progress === 100 ? (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.6, duration: 0.5, ease: "backOut" }}
              >
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </motion.div>
            ) : (
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <TrendingUp className="h-4 w-4 text-primary" />
              </motion.div>
            )}
            <span className="text-xs text-muted-foreground">
              {currentOrder.status === 'completed' ? t('schedule_view.order_completed') :
               currentOrder.status === 'pending' ? t('common.status.pending') :
               currentOrder.status === 'in_progress' ? t('common.status.in_progress') :
               currentOrder.status}
            </span>
          </motion.div>
        </div>

        {/* Enhanced Timeline - Standard with Real-time Updates */}
        {(
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('schedule_view.timeline')}
            </h4>

            <div className="space-y-3">
              {scheduleItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex items-start gap-3 p-2 rounded-lg bg-muted/20">
                    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          {item.label}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {item.subtitle}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium mt-1">
                        {item.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions for Interactive Features */}
        {enableInteractiveFeatures && onStatusUpdate && (
          <div className="pt-3 border-t">
            <div className="flex gap-2 flex-wrap">
              {currentOrder.status === 'pending' && (
                <Button
                  size="sm"
                  onClick={() => onStatusUpdate('in_progress')}
                  className="text-xs"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Start Order
                </Button>
              )}

              {currentOrder.status === 'in_progress' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => onStatusUpdate('completed')}
                    className="text-xs"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusUpdate('on_hold')}
                    className="text-xs"
                  >
                    <Pause className="h-3 w-3 mr-1" />
                    Hold
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});