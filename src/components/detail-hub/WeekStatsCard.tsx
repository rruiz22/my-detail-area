/**
 * WeekStatsCard Component
 *
 * Displays weekly hour statistics with progress bar and breakdown of regular/overtime hours.
 * Shows visual indicators when overtime is in effect.
 *
 * Part of the intelligent kiosk system.
 */

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, TrendingUp } from "lucide-react";

interface WeekStatsCardProps {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  daysWorked: number;
  targetHours?: number; // Default 40
}

export function WeekStatsCard({
  totalHours,
  regularHours,
  overtimeHours,
  daysWorked,
  targetHours = 40
}: WeekStatsCardProps) {
  const { t } = useTranslation();

  const progressPercent = Math.min((totalHours / targetHours) * 100, 100);
  const isOvertime = totalHours > targetHours;

  return (
    <Card className="card-enhanced">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5" />
          {t('detail_hub.punch_clock.week_stats.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{t('detail_hub.punch_clock.week_stats.progress')}</span>
            <span className={`font-semibold ${isOvertime ? 'text-amber-600' : 'text-gray-900'}`}>
              {totalHours.toFixed(1)} / {targetHours} hrs
            </span>
          </div>
          <Progress
            value={progressPercent}
            className={isOvertime ? "bg-amber-100" : "bg-gray-200"}
            indicatorClassName={isOvertime ? "bg-amber-500" : undefined}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{regularHours.toFixed(1)}</div>
            <div className="text-xs text-gray-600">{t('detail_hub.punch_clock.week_stats.regular')}</div>
          </div>

          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-700">{overtimeHours.toFixed(1)}</div>
            <div className="text-xs text-amber-600">{t('detail_hub.punch_clock.week_stats.overtime')}</div>
          </div>

          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-700">{daysWorked}</div>
            <div className="text-xs text-emerald-600">{t('detail_hub.punch_clock.days_worked', { count: daysWorked })}</div>
          </div>
        </div>

        {/* Overtime Warning */}
        {isOvertime && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-2 rounded">
            <TrendingUp className="w-4 h-4" />
            <span>{t('detail_hub.punch_clock.overtime_in_effect')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
