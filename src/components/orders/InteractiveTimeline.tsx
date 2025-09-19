import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  Clock,
  Edit3,
  CheckCircle,
  Circle,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  FastForward
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { safeFormatDate } from '@/utils/dateUtils';
import type { OrderData } from '@/types/order';

interface TimelineStage {
  id: string;
  name: string;
  status: 'completed' | 'current' | 'pending' | 'overdue';
  date?: string;
  duration?: number; // in hours
  description?: string;
  editable?: boolean;
}

interface InteractiveTimelineProps {
  order: OrderData;
  onStatusUpdate?: (newStatus: string) => void;
  onDateUpdate?: (field: string, newDate: string) => void;
  compact?: boolean;
}

export function InteractiveTimeline({
  order,
  onStatusUpdate,
  onDateUpdate,
  compact = false
}: InteractiveTimelineProps) {
  const { t } = useTranslation();
  const [editingStage, setEditingStage] = useState<string | null>(null);

  // Generate timeline stages based on order type and status
  const timelineStages: TimelineStage[] = [
    {
      id: 'created',
      name: t('orders.created'),
      status: 'completed',
      date: order.created_at,
      description: `Order created by ${order.created_by || 'system'}`,
      editable: false
    },
    {
      id: 'in_progress',
      name: t('common.status.in_progress'),
      status: order.status === 'pending' ? 'pending' : 'completed',
      date: order.status !== 'pending' ? order.updated_at : undefined,
      description: 'Work started on order',
      editable: true
    },
    {
      id: 'completion',
      name: t('common.status.completed'),
      status: order.status === 'completed' ? 'completed' :
              order.status === 'cancelled' ? 'pending' :
              order.due_date && new Date(order.due_date) < new Date() ? 'overdue' : 'pending',
      date: order.status === 'completed' ? order.updated_at : order.estimated_completion || order.due_date,
      description: order.status === 'completed' ? 'Order completed successfully' : 'Estimated completion',
      editable: true
    }
  ];

  // Calculate overall progress
  const overallProgress = timelineStages.reduce((acc, stage) => {
    return acc + (stage.status === 'completed' ? 33.33 : 0);
  }, 0);

  // Handle quick status changes
  const handleQuickStatusChange = useCallback((newStatus: string) => {
    onStatusUpdate?.(newStatus);
  }, [onStatusUpdate]);

  // Render timeline stage
  const renderStage = (stage: TimelineStage, index: number) => {
    const isLast = index === timelineStages.length - 1;

    const getStatusIcon = () => {
      switch (stage.status) {
        case 'completed':
          return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'current':
          return <Play className="h-5 w-5 text-indigo-500" />;
        case 'overdue':
          return <AlertTriangle className="h-5 w-5 text-red-500" />;
        default:
          return <Circle className="h-5 w-5 text-gray-300" />;
      }
    };

    const getStatusColor = () => {
      switch (stage.status) {
        case 'completed':
          return 'border-green-500 bg-green-50';
        case 'current':
          return 'border-indigo-500 bg-indigo-50';
        case 'overdue':
          return 'border-red-500 bg-red-50';
        default:
          return 'border-gray-300 bg-gray-50';
      }
    };

    return (
      <div key={stage.id} className="relative flex items-start">
        {/* Timeline connector */}
        {!isLast && (
          <div
            className={`absolute left-6 top-12 w-0.5 h-12 ${
              timelineStages[index + 1]?.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
            }`}
          />
        )}

        {/* Stage content */}
        <div className="flex items-start gap-3 w-full">
          {/* Icon */}
          <div className={`p-2 rounded-full border-2 ${getStatusColor()} flex-shrink-0`}>
            {getStatusIcon()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm">{stage.name}</h4>
                <p className="text-xs text-muted-foreground">{stage.description}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {stage.date && (
                  <Badge variant="outline" className="text-xs">
                    {safeFormatDate(stage.date)}
                  </Badge>
                )}

                {stage.editable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setEditingStage(editingStage === stage.id ? null : stage.id)}
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Editing controls */}
            {editingStage === stage.id && (
              <div className="mt-2 p-2 bg-muted/50 rounded-md">
                <div className="flex gap-2 flex-wrap">
                  {stage.id === 'in_progress' && order.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickStatusChange('in_progress')}
                      className="text-xs"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Start Work
                    </Button>
                  )}

                  {stage.id === 'completion' && order.status === 'in_progress' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickStatusChange('completed')}
                      className="text-xs"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Mark Complete
                    </Button>
                  )}

                  {order.status !== 'completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickStatusChange('on_hold')}
                      className="text-xs"
                    >
                      <Pause className="h-3 w-3 mr-1" />
                      Put on Hold
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t('schedule_view.timeline')}</span>
          <span className="text-xs text-muted-foreground">{Math.round(overallProgress)}% complete</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
        <div className="space-y-2">
          {timelineStages.map((stage, index) => renderStage(stage, index))}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('schedule_view.timeline')}
          </div>
          <Badge variant="outline" className="text-xs">
            {Math.round(overallProgress)}% complete
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-1">
          <Progress value={overallProgress} className="h-2 mb-4" />
          <div className="space-y-6">
            {timelineStages.map((stage, index) => renderStage(stage, index))}
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex gap-2 flex-wrap">
            {order.status === 'pending' && (
              <Button
                size="sm"
                onClick={() => handleQuickStatusChange('in_progress')}
                className="text-xs"
              >
                <FastForward className="h-3 w-3 mr-1" />
                Start Order
              </Button>
            )}

            {order.status === 'in_progress' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleQuickStatusChange('completed')}
                  className="text-xs"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickStatusChange('on_hold')}
                  className="text-xs"
                >
                  <Pause className="h-3 w-3 mr-1" />
                  Hold
                </Button>
              </>
            )}

            {order.status === 'completed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickStatusChange('in_progress')}
                className="text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reopen
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}