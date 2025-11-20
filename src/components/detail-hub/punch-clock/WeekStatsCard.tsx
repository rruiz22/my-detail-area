/**
 * WeekStatsCard Component
 *
 * Displays employee week statistics in a clean grid layout
 *
 * Props:
 * - totalHours: Total hours worked this week
 * - regularHours: Regular hours (up to 40)
 * - overtimeHours: Overtime hours (over 40)
 * - daysWorked: Number of days worked this week
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { startOfWeek, endOfWeek, format } from "date-fns";

interface WeekStatsCardProps {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  daysWorked: number;
}

export function WeekStatsCard({ totalHours, regularHours, overtimeHours, daysWorked }: WeekStatsCardProps) {
  const { t } = useTranslation();

  // Calculate current week range (Monday-Sunday)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekRange = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`;

  return (
    <Card className="card-enhanced">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('detail_hub.punch_clock.week_stats')}</CardTitle>
          <span className="text-xs text-gray-500">{weekRange}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3">
          {/* Total Hours */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-gray-600 text-xs mb-1">
              <Clock className="w-3 h-3" />
              <span>{t('detail_hub.punch_clock.total_hours')}</span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              {totalHours.toFixed(1)}h
            </div>
          </div>

          {/* Regular Hours */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-gray-600 text-xs mb-1">
              <Clock className="w-3 h-3" />
              <span>{t('detail_hub.punch_clock.regular_hours')}</span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              {regularHours.toFixed(1)}h
            </div>
          </div>

          {/* Overtime Hours */}
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-amber-700 text-xs mb-1">
              <TrendingUp className="w-3 h-3" />
              <span>{t('detail_hub.punch_clock.overtime_hours')}</span>
            </div>
            <div className="text-xl font-bold text-amber-800">
              {overtimeHours.toFixed(1)}h
            </div>
          </div>

          {/* Days Worked */}
          <div className="bg-emerald-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-emerald-700 text-xs mb-1">
              <Calendar className="w-3 h-3" />
              <span>{t('detail_hub.punch_clock.days_worked')}</span>
            </div>
            <div className="text-xl font-bold text-emerald-800">
              {daysWorked}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
