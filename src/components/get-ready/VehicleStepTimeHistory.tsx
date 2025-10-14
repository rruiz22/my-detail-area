import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCurrentStepVisit, useVehicleStepTimes, useVehicleTimeToLine } from '@/hooks/useVehicleStepHistory';
import { Calendar, Clock, Repeat, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VehicleStepTimeHistoryProps {
  vehicleId: string;
  className?: string;
}

export function VehicleStepTimeHistory({ vehicleId, className }: VehicleStepTimeHistoryProps) {
  const { t } = useTranslation();
  const { data: stepTimes, isLoading: stepTimesLoading } = useVehicleStepTimes(vehicleId);
  const { data: timeToLine, isLoading: t2lLoading } = useVehicleTimeToLine(vehicleId);
  const { data: currentVisit } = useCurrentStepVisit(vehicleId);

  if (stepTimesLoading || t2lLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('get_ready.time_tracking.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalHours = timeToLine?.total_hours || 0;
  const totalDays = timeToLine?.total_days || 0;
  const maxStepHours = Math.max(...(stepTimes?.map(st => st.total_hours) || [0]));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('get_ready.time_tracking.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pb-8">
        {/* Total Time to Line */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">
                <TrendingUp className="h-4 w-4" />
                {timeToLine?.is_completed
                  ? t('get_ready.time_tracking.total_time_completed')
                  : t('get_ready.time_tracking.time_in_process')}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {totalDays.toFixed(1)}
                </span>
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  {t('get_ready.time_tracking.days')}
                </span>
                <span className="text-sm text-blue-500 dark:text-blue-500 ml-2">
                  ({totalHours.toFixed(1)} {t('get_ready.time_tracking.hours')})
                </span>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                <Calendar className="h-3 w-3 inline mr-1" />
                {new Date(timeToLine?.first_entry || '').toLocaleDateString()} - {
                  timeToLine?.is_completed
                    ? new Date(timeToLine.last_exit || '').toLocaleDateString()
                    : t('get_ready.time_tracking.in_progress')
                }
              </div>
            </div>
          </div>
        </div>

        {/* Current Step Info */}
        {currentVisit && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
              {t('get_ready.time_tracking.current_step')}: {currentVisit.step_name}
            </div>
            <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <span>
                  {t('get_ready.time_tracking.current_visit')}: {currentVisit.current_visit_days.toFixed(1)} {t('get_ready.time_tracking.days')}
                </span>
              </div>
              {currentVisit.visit_number > 1 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Repeat className="h-3 w-3" />
                        {t('get_ready.time_tracking.visit')} #{currentVisit.visit_number}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {t('get_ready.time_tracking.previous_visits')}: {(currentVisit.previous_visits_hours / 24).toFixed(1)} {t('get_ready.time_tracking.days')}
                      </p>
                      <p className="font-bold">
                        {t('get_ready.time_tracking.total_accumulated')}: {currentVisit.total_accumulated_days.toFixed(1)} {t('get_ready.time_tracking.days')}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        )}

        {/* Step Breakdown */}
        <div className="space-y-3">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('get_ready.time_tracking.time_by_step')}
          </div>
          {stepTimes && stepTimes.length > 0 ? (
            stepTimes.map((stepTime) => {
              const percentage = maxStepHours > 0 ? (stepTime.total_hours / maxStepHours) * 100 : 0;
              const isCurrentStep = stepTime.is_current_step;

              return (
                <div
                  key={stepTime.step_id}
                  className={`p-3 rounded-lg border transition-colors ${
                    isCurrentStep
                      ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        isCurrentStep
                          ? 'text-blue-900 dark:text-blue-100'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {stepTime.step_name}
                      </span>
                      {isCurrentStep && (
                        <Badge variant="default" className="text-xs">
                          {t('get_ready.time_tracking.current')}
                        </Badge>
                      )}
                      {stepTime.visit_count > 1 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <Repeat className="h-3 w-3" />
                                {stepTime.visit_count}x
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {t('get_ready.time_tracking.visited_times', { count: stepTime.visit_count })}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className={`text-sm font-bold ${
                      isCurrentStep
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {stepTime.total_days.toFixed(1)} {t('get_ready.time_tracking.days')}
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <div className={`text-xs mt-1 ${
                    isCurrentStep
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {stepTime.total_hours.toFixed(1)} {t('get_ready.time_tracking.hours')}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              {t('get_ready.time_tracking.no_data')}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {stepTimes && stepTimes.length > 0 && (
          <div className="pt-4 mt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded">
                <div className="text-gray-500 dark:text-gray-400 mb-1">
                  {t('get_ready.time_tracking.steps_completed')}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {stepTimes.filter(st => !st.is_current_step).length}
                </div>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded">
                <div className="text-gray-500 dark:text-gray-400 mb-1">
                  {t('get_ready.time_tracking.avg_time_per_step')}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {stepTimes.length > 0
                    ? (stepTimes.reduce((sum, st) => sum + st.total_days, 0) / stepTimes.length).toFixed(1)
                    : '0.0'
                  } {t('get_ready.time_tracking.days')}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
