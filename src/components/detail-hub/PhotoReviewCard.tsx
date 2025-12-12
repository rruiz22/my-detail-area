/**
 * PhotoReviewCard Component - Compact Design
 *
 * Displays time entry photos that require manual verification.
 * Used by supervisors to approve/reject photo-based punches.
 *
 * COMPACT DESIGN: Mini-card (140px) with hover popover
 * - Visible: Photo, name, clock in time
 * - Hover: Full details + action buttons in floating popover
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { CheckCircle, XCircle, Clock, Camera, User, Maximize2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface TimeEntryWithPhoto {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee_number?: string;
  clock_in: string;
  clock_out?: string | null;
  total_hours?: number | null;
  punch_in_method: 'photo_fallback';
  photo_in_url: string;
  photo_out_url?: string | null;
  requires_manual_verification: boolean;
}

interface PhotoReviewCardProps {
  timeEntry: TimeEntryWithPhoto;
  onApprove: (timeEntryId: string) => Promise<void>;
  onReject: (timeEntryId: string) => Promise<void>;
  isSelected?: boolean;
  onSelectionChange?: (timeEntryId: string, selected: boolean) => void;
}

export function PhotoReviewCard({ timeEntry, onApprove, onReject, isSelected = false, onSelectionChange }: PhotoReviewCardProps) {
  const { t } = useTranslation();
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

  const formatShortTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <>
      {/* Mini-Card with Hover Popover */}
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <Card className="w-[140px] cursor-pointer hover:shadow-lg hover:border-amber-300 transition-all duration-200 card-enhanced">
            <CardContent className="p-2 space-y-1 relative">
              {/* Selection Checkbox */}
              {onSelectionChange && (
                <div
                  className="absolute top-1 left-1 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      onSelectionChange(timeEntry.id, checked === true);
                    }}
                    className="bg-white border-2 border-gray-300 shadow-sm data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                </div>
              )}

              {/* Circular Photo */}
              <div
                className="relative group mx-auto w-16 h-16"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLightbox(true);
                }}
              >
                <img
                  src={timeEntry.photo_in_url}
                  alt="Employee punch photo"
                  className="w-16 h-16 rounded-full object-cover border-2 border-amber-200 group-hover:border-amber-400 transition-colors"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-full">
                  <Maximize2 className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Employee Name - Truncated */}
              <p className="text-xs font-medium text-center truncate px-1" title={timeEntry.employee_name || `Employee ${timeEntry.employee_id}`}>
                {timeEntry.employee_name || `Employee ${timeEntry.employee_id}`}
              </p>

              {/* Clock In Time - Short Format */}
              <div className="flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                <p className="text-[10px] text-gray-600">
                  {formatShortTime(timeEntry.clock_in)}
                </p>
              </div>

              {/* Pending Badge */}
              <Badge variant="outline" className="w-full justify-center bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1 py-0 h-4">
                {t('detail_hub.timecard.photo_review.pending_review')}
              </Badge>
            </CardContent>
          </Card>
        </HoverCardTrigger>

        {/* Hover Popover - Full Details */}
        <HoverCardContent
          className="w-80 z-50 p-4 space-y-3"
          side="top"
          align="center"
          sideOffset={5}
        >
          {/* Header */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <Camera className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <h4 className="font-semibold text-sm">{t('detail_hub.timecard.photo_review.title')}</h4>
          </div>

          {/* Photo Preview */}
          <div
            className="relative cursor-pointer group -mx-4"
            onClick={() => setShowLightbox(true)}
          >
            <img
              src={timeEntry.photo_in_url}
              alt="Employee punch photo"
              className="w-full h-48 object-cover border-y-2 border-muted group-hover:border-indigo-400 transition-colors"
              loading="lazy"
            />
            <div className="absolute top-2 left-2">
              <Badge className="bg-indigo-500 text-white text-xs px-2 py-0.5">
                {timeEntry.clock_out
                  ? t('detail_hub.timecard.photo_review.photo_punch_out')
                  : t('detail_hub.timecard.photo_review.photo_punch_in')
                }
              </Badge>
            </div>
            {/* Hover overlay for better UX */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-2">
                <Maximize2 className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {/* Employee Info */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs">
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

            {/* Punch Times */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs">
                <Clock className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                <span className="text-[10px] text-muted-foreground">
                  {t('detail_hub.timecard.photo_review.punch_in_label')}:
                </span>
                <span className="font-medium text-[11px]">{formatTime(timeEntry.clock_in)}</span>
              </div>

              {timeEntry.clock_out && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Clock className="w-3 h-3 text-red-600 flex-shrink-0" />
                  <span className="text-[10px] text-muted-foreground">
                    {t('detail_hub.timecard.photo_review.punch_out_label')}:
                  </span>
                  <span className="font-medium text-[11px]">{formatTime(timeEntry.clock_out)}</span>
                </div>
              )}
            </div>

            {/* Total Hours Badge */}
            {timeEntry.clock_out && timeEntry.total_hours !== null && timeEntry.total_hours !== undefined && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 w-fit">
                ⏱️ {timeEntry.total_hours.toFixed(2)}{t('detail_hub.timecard.photo_review.hours_abbr')}
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t">
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
        </HoverCardContent>
      </HoverCard>

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
