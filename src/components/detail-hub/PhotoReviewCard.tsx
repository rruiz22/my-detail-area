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
import { CheckCircle, XCircle, Clock, Camera, User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next"; // OPCIÓN C: i18n support

interface TimeEntryWithPhoto {
  id: string;
  employee_id: string;
  employee_name?: string;
  clock_in: string;
  punch_in_method: 'photo_fallback';
  photo_in_url: string;
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
    <Card className="card-enhanced">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-500" />
            {t('detail_hub.photo_review.title')}
          </CardTitle>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            {t('detail_hub.photo_review.pending_review')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Employee & Time Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">
              {timeEntry.employee_name || `Employee ${timeEntry.employee_id}`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{formatTime(timeEntry.clock_in)}</span>
          </div>
        </div>

        {/* Photo Preview */}
        <div className="relative">
          <img
            src={timeEntry.photo_in_url}
            alt="Employee punch photo"
            className="w-full h-48 object-cover rounded-lg border-2 border-muted"
            loading="lazy"
          />
          <div className="absolute top-2 left-2">
            <Badge className="bg-indigo-500 text-white">
              {t('detail_hub.photo_review.photo_punch')}
            </Badge>
          </div>
        </div>

        {/* Approval Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={handleReject}
            disabled={loading}
          >
            <XCircle className="w-4 h-4 mr-2" />
            {t('detail_hub.photo_review.reject')}
          </Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            onClick={handleApprove}
            disabled={loading}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {t('detail_hub.photo_review.approve')}
          </Button>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-muted-foreground text-center">
          {t('detail_hub.photo_review.verify_identity')}
        </p>
      </CardContent>
    </Card>
  );
}
