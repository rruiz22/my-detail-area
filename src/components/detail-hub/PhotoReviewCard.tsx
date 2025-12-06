/**
 * PhotoReviewCard Component
 *
 * Displays time entry photos that require manual verification.
 * Used by supervisors to approve/reject photo-based punches.
 *
 * PHASE 5: Photo Fallback Implementation
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, Camera, User, Maximize2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next"; // OPCIÓN C: i18n support

interface TimeEntryWithPhoto {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee_number?: string;          // ✨ ADD: Show employee number prominently
  clock_in: string;
  clock_out?: string | null;         // ✨ ADD: Show punch out time if exists
  total_hours?: number | null;       // ✨ ADD: Show total hours if clocked out
  punch_in_method: 'photo_fallback';
  photo_in_url: string;
  photo_out_url?: string | null;     // ✨ ADD: For future dual-photo display
  requires_manual_verification: boolean;
}

interface PhotoReviewCardProps {
  timeEntry: TimeEntryWithPhoto;
  onApprove: (timeEntryId: string) => Promise<void>;
  onReject: (timeEntryId: string) => Promise<void>;
}

export function PhotoReviewCard({ timeEntry, onApprove, onReject }: PhotoReviewCardProps) {
  const { t } = useTranslation(); // OPCIÓN C: i18n support
  const [loading, setLoading] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(timeEntry.id);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject(timeEntry.id);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <>
      <Card className="card-enhanced">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-2 min-w-0 flex-1">
              <Camera className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="truncate">{t('detail_hub.timecard.photo_review.title')}</span>
            </CardTitle>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-1.5 py-0 whitespace-nowrap flex-shrink-0">
              {t('detail_hub.timecard.photo_review.pending_review')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-2">
        {/* Employee & Time Info - Compact */}
        <div className="space-y-1.5">
          {/* Employee Name + Number */}
          <div className="flex items-center gap-1.5 text-xs min-w-0">
            <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="font-medium truncate flex-1">
              {timeEntry.employee_name || `Employee ${timeEntry.employee_id}`}
            </span>
            {timeEntry.employee_number && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 flex-shrink-0">
                {timeEntry.employee_number}
              </Badge>
            )}
          </div>

          {/* Punch In - Compact */}
          <div className="flex items-center gap-1.5 text-xs min-w-0">
            <Clock className="w-3 h-3 text-emerald-600 flex-shrink-0" />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {t('detail_hub.timecard.photo_review.punch_in_label')}:
            </span>
            <span className="font-medium truncate">{formatTime(timeEntry.clock_in)}</span>
          </div>

          {/* Total Hours Badge (if clocked out) */}
          {timeEntry.clock_out && timeEntry.total_hours !== null && timeEntry.total_hours !== undefined && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 w-fit">
              ⏱️ {timeEntry.total_hours.toFixed(2)}{t('detail_hub.timecard.photo_review.hours_abbr')}
            </Badge>
          )}
        </div>

        {/* Photo Preview - Compact with click to expand */}
        <div className="relative group cursor-pointer" onClick={() => setShowLightbox(true)}>
          <img
            src={timeEntry.photo_in_url}
            alt="Employee punch photo"
            className="w-full h-24 object-cover rounded-lg border-2 border-muted group-hover:border-indigo-400 transition-colors"
            loading="lazy"
          />
          <div className="absolute top-1.5 left-1.5">
            <Badge className="bg-indigo-500 text-white text-[10px] px-1.5 py-0 h-4">
              {timeEntry.clock_out
                ? t('detail_hub.timecard.photo_review.photo_punch_out')
                : t('detail_hub.timecard.photo_review.photo_punch_in')
              }
            </Badge>
          </div>
          <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/60 rounded p-1">
              <Maximize2 className="w-3 h-3 text-white" />
            </div>
          </div>
        </div>

        {/* Approval Actions - Compact */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-red-200 hover:bg-red-50 hover:text-red-700 h-8 text-xs"
            onClick={handleReject}
            disabled={loading}
          >
            <XCircle className="w-3 h-3 mr-1.5" />
            {t('detail_hub.timecard.photo_review.reject')}
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
            onClick={handleApprove}
            disabled={loading}
          >
            <CheckCircle className="w-3 h-3 mr-1.5" />
            {t('detail_hub.timecard.photo_review.approve')}
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* Lightbox Modal for Full-Size Photo */}
    <Dialog open={showLightbox} onOpenChange={setShowLightbox}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0" />
            <span className="truncate">
              {t('detail_hub.timecard.photo_review.title')} - {timeEntry.employee_name || `Employee ${timeEntry.employee_id}`}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 sm:space-y-4">
          {/* Full Size Photo */}
          <div className="relative">
            <img
              src={timeEntry.photo_in_url}
              alt="Employee punch photo - full size"
              className="w-full h-auto max-h-[50vh] sm:max-h-[70vh] object-contain rounded-lg border-2 border-muted"
            />
            <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2">
              <Badge className="bg-indigo-500 text-white text-xs sm:text-sm">
                {timeEntry.clock_out
                  ? t('detail_hub.timecard.photo_review.photo_punch_out')
                  : t('detail_hub.timecard.photo_review.photo_punch_in')
                }
              </Badge>
            </div>
          </div>

          {/* Full Employee Details - Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t('detail_hub.timecard.photo_review.employee')}</p>
              <p className="font-medium truncate">{timeEntry.employee_name || `Employee ${timeEntry.employee_id}`}</p>
              {timeEntry.employee_number && (
                <Badge variant="outline" className="mt-1">{timeEntry.employee_number}</Badge>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t('detail_hub.timecard.photo_review.punch_in_label')}</p>
              <p className="font-medium truncate">{formatTime(timeEntry.clock_in)}</p>
            </div>
            {timeEntry.clock_out && (
              <>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t('detail_hub.timecard.photo_review.punch_out_label')}</p>
                  <p className="font-medium truncate">{formatTime(timeEntry.clock_out)}</p>
                </div>
                {timeEntry.total_hours !== null && timeEntry.total_hours !== undefined && (
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{t('detail_hub.timecard.photo_review.total_hours')}</p>
                    <p className="font-medium">{timeEntry.total_hours.toFixed(2)} {t('detail_hub.timecard.photo_review.hours_abbr')}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Approval Actions in Modal - Responsive Stack */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
            <Button
              variant="outline"
              className="border-red-200 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto"
              onClick={handleReject}
              disabled={loading}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {t('detail_hub.timecard.photo_review.reject')}
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
              onClick={handleApprove}
              disabled={loading}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {t('detail_hub.timecard.photo_review.approve')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
}
