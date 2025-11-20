import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  Clock,
  Coffee,
  Edit,
  XCircle,
  UserCheck,
  PlayCircle,
  StopCircle,
  FileText
} from "lucide-react";
import { useTimeEntryAuditLogs, TimeEntryAuditLog } from "@/hooks/useDetailHubDatabase";
import { format } from "date-fns";

interface TimeEntryLogsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeEntryId: string | null;
  employeeName: string;
}

export function TimeEntryLogsModal({
  open,
  onOpenChange,
  timeEntryId,
  employeeName
}: TimeEntryLogsModalProps) {
  const { t } = useTranslation();
  const { data: auditLogs = [], isLoading } = useTimeEntryAuditLogs(timeEntryId);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return <PlayCircle className="w-5 h-5 text-green-600" />;
      case 'clock_out':
        return <StopCircle className="w-5 h-5 text-red-600" />;
      case 'break_started':
        return <Coffee className="w-5 h-5 text-amber-600" />;
      case 'break_ended':
        return <Coffee className="w-5 h-5 text-gray-600" />;
      case 'approved':
      case 'verified':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'manual_edit':
        return <Edit className="w-5 h-5 text-blue-600" />;
      case 'disabled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'enabled':
        return <UserCheck className="w-5 h-5 text-green-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActionLabel = (log: TimeEntryAuditLog) => {
    const metadata = log.metadata || {};

    switch (log.action_type) {
      case 'created':
        return t('detail_hub.timecard.logs.created');
      case 'clock_out':
        return t('detail_hub.timecard.logs.clocked_out');
      case 'break_started':
        return t('detail_hub.timecard.logs.break_started');
      case 'break_ended':
        return `${t('detail_hub.timecard.logs.break_ended')} (${metadata.duration_minutes || 0} min)`;
      case 'approved':
        return t('detail_hub.timecard.logs.approved');
      case 'verified':
        return t('detail_hub.timecard.logs.verified');
      case 'manual_edit':
        return t('detail_hub.timecard.logs.manual_edit');
      case 'disabled':
        return t('detail_hub.timecard.logs.disabled');
      case 'enabled':
        return t('detail_hub.timecard.logs.enabled');
      default:
        return t('detail_hub.timecard.logs.updated');
    }
  };

  const formatFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      'clock_in': 'Clock In',
      'clock_out': 'Clock Out',
      'break_start': 'Break Start',
      'break_end': 'Break End',
      'notes': 'Notes',
      'status': 'Status'
    };
    return labels[field] || field;
  };

  const formatValue = (value: string | null, field?: string) => {
    if (!value) return 'Not set';

    // Try to parse as timestamp
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime()) && value.includes('T')) {
        return format(date, 'h:mm a');
      }
    } catch {}

    return value;
  };

  const getChangeDetails = (log: TimeEntryAuditLog) => {
    // Manual Edit with multiple changes
    if (log.action_type === 'manual_edit' && log.metadata?.changes) {
      const changes = log.metadata.changes as Array<{field: string; old: string; new: string}>;
      return (
        <div className="mt-2 space-y-2">
          {changes.filter(c => c !== null).map((change, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
              <span className="font-medium text-gray-700 min-w-[100px]">
                {formatFieldLabel(change.field)}:
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded border border-red-200 line-through">
                  {formatValue(change.old, change.field)}
                </span>
                <span className="text-gray-400">→</span>
                <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded border border-green-200 font-medium">
                  {formatValue(change.new, change.field)}
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Single field change
    if (log.field_name && log.old_value !== null && log.new_value !== null) {
      return (
        <div className="mt-2 flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
          <span className="font-medium text-gray-700 min-w-[100px]">
            {formatFieldLabel(log.field_name)}:
          </span>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded border border-red-200 line-through">
              {formatValue(log.old_value, log.field_name)}
            </span>
            <span className="text-gray-400">→</span>
            <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded border border-green-200 font-medium">
              {formatValue(log.new_value, log.field_name)}
            </span>
          </div>
        </div>
      );
    }

    // Creation with initial values
    if (log.action_type === 'created' && log.new_value) {
      try {
        const data = JSON.parse(log.new_value);
        return (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm space-y-1">
            {data.clock_in && (
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-green-600" />
                <span className="text-green-800">
                  Started at <strong>{format(new Date(data.clock_in), 'h:mm a')}</strong>
                </span>
              </div>
            )}
            {data.punch_in_method && (
              <div className="text-green-700">
                Method: <strong>{data.punch_in_method}</strong>
              </div>
            )}
            {data.kiosk_id && (
              <div className="text-green-700 text-xs">
                Kiosk: {data.kiosk_id}
              </div>
            )}
          </div>
        );
      } catch {
        return null;
      }
    }

    // Clock out with time display
    if (log.action_type === 'clock_out' && log.new_value) {
      return (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
          <span className="text-red-800">
            Clocked out at <strong>{formatValue(log.new_value)}</strong>
          </span>
        </div>
      );
    }

    // Break with duration
    if (log.action_type === 'break_ended' && log.metadata?.duration_minutes) {
      return (
        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm">
          <span className="text-amber-800">
            Duration: <strong>{log.metadata.duration_minutes} minutes</strong>
          </span>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t('detail_hub.timecard.logs.title')}</DialogTitle>
          <DialogDescription>
            {employeeName}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">{t('detail_hub.timecard.logs.no_logs')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log, index) => (
                <div key={log.id} className="flex gap-4">
                  {/* Timeline line */}
                  <div className="relative">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 border-2 border-white shadow">
                      {getActionIcon(log.action_type)}
                    </div>
                    {index < auditLogs.length - 1 && (
                      <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200" style={{height: '100%'}}></div>
                    )}
                  </div>

                  {/* Event details */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="font-medium">{getActionLabel(log)}</p>
                        {log.user && (
                          <p className="text-sm text-muted-foreground">
                            {t('detail_hub.timecard.logs.by')} {log.user.first_name} {log.user.last_name}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(log.created_at), 'MMM d, h:mm a')}
                      </Badge>
                    </div>

                    {/* Change details */}
                    {getChangeDetails(log)}

                    {/* IP Address if available */}
                    {log.ip_address && (
                      <div className="text-xs text-muted-foreground mt-2">
                        IP: {log.ip_address}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
