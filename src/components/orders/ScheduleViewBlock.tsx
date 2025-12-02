import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useRealtimeSchedule } from '@/hooks/useRealtimeSchedule';
import type { OrderData } from '@/types/order';
import { createScheduleItems, getOrderDateSummary } from '@/utils/orderDateUtils';
import { getEnhancedDueDateStatus } from '@/utils/overdueCalculations';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    Calendar,
    CheckCircle,
    Clock,
    Pause,
    Play,
    Target,
    Timer,
    TrendingUp,
    Wifi,
    WifiOff,
    XCircle
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ScheduleViewBlockProps {
  order: OrderData;
  orderType?: 'sales' | 'service' | 'recon' | 'carwash';
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
  orderType,
  onStatusUpdate,
  onDateUpdate,
  enableInteractiveFeatures = false
}: ScheduleViewBlockProps) {
  const { t } = useTranslation();

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
      return null;
    }

    const enhancedStatus = getEnhancedDueDateStatus(dueDate.rawValue, t);

    if (enhancedStatus) {
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
      return 'Unknown age';
    }

    const createdDate = new Date(created.rawValue);
    const now = new Date();
    const diffTime = now.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  }, [currentOrder]);

  // Enhanced schedule items with robust date handling
  const scheduleItems = useMemo(() => {
    // Use enhanced date utilities with fallbacks - pass orderType for recon/carwash
    const items = createScheduleItems(currentOrder, t, orderAge, orderType);

    // Convert to expected format and add icons
    const scheduleItemsWithIcons: ScheduleItem[] = items.map((item) => {
      const iconMap = {
        'Calendar': Calendar,
        'Target': Target,
        'Clock': Clock
      };

      return {
        icon: iconMap[item.icon as keyof typeof iconMap] || Calendar,
        label: item.label,
        value: item.value,
        subtitle: item.subtitle
      };
    });

    return scheduleItemsWithIcons;
  }, [currentOrder, t, orderAge, orderType]);

  return (
    <Card className="h-full shadow-sm border-border/60">
      <CardHeader className="pb-4 bg-muted/30">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold">{t('schedule_view.schedule_timeline')}</span>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-50 border border-green-200">
                <Wifi className="h-3.5 w-3.5 text-green-600" title="Real-time updates active" />
                <span className="text-xs font-medium text-green-700">Live</span>
              </div>
            ) : (
              <WifiOff className="h-4 w-4 text-red-400" title={connectionError || "Real-time updates disabled"} />
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        {/* Due Date Status Banner */}
        {dueDateStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`p-4 rounded-xl ${dueDateStatus.bgColor} border-2 ${dueDateStatus.color.replace('text-', 'border-')}/30 shadow-sm`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${dueDateStatus.color.replace('text-', 'bg-')}/10`}>
                <dueDateStatus.icon className={`h-5 w-5 ${dueDateStatus.color}`} />
              </div>
              <div className="flex-1">
                <span className={`text-sm font-bold ${dueDateStatus.color} block`}>
                  {dueDateStatus.text}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Enhanced Order Progress with Animations */}
        <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">{t('schedule_view.order_progress')}</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-foreground">{progress}%</span>
              {progress === 100 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5, ease: "backOut" }}
                >
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
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
            className="flex items-center gap-3 mt-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            {progress === 100 ? (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.6, duration: 0.5, ease: "backOut" }}
                className="p-1.5 rounded-lg bg-emerald-100"
              >
                <CheckCircle className="h-4 w-4 text-emerald-600" />
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
                className="p-1.5 rounded-lg bg-primary/10"
              >
                <TrendingUp className="h-4 w-4 text-primary" />
              </motion.div>
            )}
            <span className="text-sm font-medium text-foreground">
              {currentOrder.status === 'completed' ? t('schedule_view.order_completed') :
               currentOrder.status === 'pending' ? t('common.status.pending') :
               currentOrder.status === 'in_progress' ? t('common.status.in_progress') :
               currentOrder.status}
            </span>
          </motion.div>
        </div>

        {/* Enhanced Timeline - Standard with Real-time Updates */}
        {(
          <div className="space-y-4">
            <h4 className="text-sm font-bold flex items-center gap-2.5 text-foreground">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              {t('schedule_view.timeline')}
            </h4>

            <div className="space-y-3">
              {scheduleItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {item.label}
                        </p>
                        <Badge variant="secondary" className="text-xs font-medium">
                          {item.subtitle}
                        </Badge>
                      </div>
                      <p className="text-sm font-bold text-foreground">
                        {item.value}
                      </p>
                    </div>
                  </motion.div>
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
