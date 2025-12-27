/**
 * PunchHistoryCard Component
 *
 * Displays recent punch history for an employee in the Kiosk modal
 * Shows last 5 time entries with visual indicators and smooth animations
 *
 * Features:
 * - Recent punches with clock in/out times
 * - Visual status indicators (complete, active, disputed)
 * - Hours worked display
 * - Photo verification badges
 * - Smooth scroll animations
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Camera,
  Loader2,
  History
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_TIMES, GC_TIMES } from "@/constants/cacheConfig";

interface PunchHistoryCardProps {
  employeeId: string;
  limit?: number;
}

interface TimeEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  total_hours: number | null;
  status: 'active' | 'complete' | 'disputed' | 'approved';
  punch_in_method: string | null;
  punch_out_method: string | null;
  photo_in_url: string | null;
  photo_out_url: string | null;
  requires_manual_verification: boolean;
}

export function PunchHistoryCard({ employeeId, limit = 5 }: PunchHistoryCardProps) {
  const { t } = useTranslation();

  // Fetch recent time entries for employee
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['punch-history', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('detail_hub_time_entries')
        .select('*')
        .eq('employee_id', employeeId)
        .order('clock_in', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as TimeEntry[];
    },
    enabled: !!employeeId,
    staleTime: CACHE_TIMES.INSTANT, // Always fetch fresh for punch history
    gcTime: GC_TIMES.SHORT,
    refetchOnMount: true,
  });

  const formatTime = (date: string) => {
    return format(new Date(date), 'h:mm a');
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'MMM d, yyyy');
  };

  const getStatusBadge = (entry: TimeEntry) => {
    if (entry.status === 'active') {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          {t('detail_hub.live_dashboard.active')}
        </Badge>
      );
    }
    if (entry.status === 'complete') {
      return (
        <Badge className="bg-gray-100 text-gray-700 border-gray-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          {t('detail_hub.punch_clock.status.complete')}
        </Badge>
      );
    }
    if (entry.status === 'disputed') {
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-300">
          <AlertCircle className="w-3 h-3 mr-1" />
          {t('detail_hub.punch_clock.status.disputed')}
        </Badge>
      );
    }
    if (entry.status === 'approved') {
      return (
        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          {t('detail_hub.punch_clock.status.approved')}
        </Badge>
      );
    }
    return null;
  };

  return (
    <Card className="card-enhanced">
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-600" />
          <CardTitle className="text-lg">
            {t('detail_hub.punch_clock.recent_punches')}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          // Skeleton loader
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-gray-100 rounded-lg p-4 space-y-2"
              >
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          // Empty state
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">{t('detail_hub.punch_clock.no_history')}</p>
          </div>
        ) : (
          // Punch history list
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-sm"
                  style={{
                    animation: `slideIn 0.3s ease-out ${index * 0.05}s both`
                  }}
                >
                  {/* Header - Date and Status */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      {formatDate(entry.clock_in)}
                    </span>
                    {getStatusBadge(entry)}
                  </div>

                  {/* Clock In/Out Times */}
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    {/* Clock In */}
                    <div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Clock className="w-3 h-3" />
                        <span>{t('detail_hub.punch_clock.clock_in')}</span>
                      </div>
                      <div className="text-sm font-semibold text-emerald-700">
                        {formatTime(entry.clock_in)}
                      </div>
                      {entry.photo_in_url && (
                        <Badge variant="outline" className="text-xs mt-1">
                          <Camera className="w-3 h-3 mr-1" />
                          {t('detail_hub.punch_clock.photo_verified')}
                        </Badge>
                      )}
                    </div>

                    {/* Clock Out */}
                    <div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Clock className="w-3 h-3" />
                        <span>{t('detail_hub.punch_clock.clock_out')}</span>
                      </div>
                      {entry.clock_out ? (
                        <>
                          <div className="text-sm font-semibold text-red-600">
                            {formatTime(entry.clock_out)}
                          </div>
                          {entry.photo_out_url && (
                            <Badge variant="outline" className="text-xs mt-1">
                              <Camera className="w-3 h-3 mr-1" />
                              {t('detail_hub.punch_clock.photo_verified')}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-gray-400 italic">
                          {t('detail_hub.punch_clock.in_progress')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Total Hours */}
                  {entry.total_hours !== null && (
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">
                          {t('detail_hub.punch_clock.total_hours')}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {entry.total_hours.toFixed(2)} {t('detail_hub.punch_clock.hours')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Manual Verification Badge */}
                  {entry.requires_manual_verification && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs border-amber-300 bg-amber-50 text-amber-700">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {t('detail_hub.punch_clock.requires_verification')}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Custom Animations */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Card>
  );
}
