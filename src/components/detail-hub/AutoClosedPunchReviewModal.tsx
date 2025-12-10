import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  MessageSquare,
  User,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es, ptBR } from 'date-fns/locale';

interface TimeEntry {
  id: string;
  employee_id: string;
  dealership_id: number;
  clock_in: string;
  clock_out: string;
  auto_close_reason: string | null;
  auto_closed_at: string | null;
  requires_supervisor_review: boolean;
  verified_at: string | null;
  verified_by: string | null;
  notes: string | null;
  status: string;
}

interface ReminderLog {
  id: string;
  reminder_type: 'first' | 'second' | 'auto_close';
  sent_at: string;
  sms_sent: boolean;
  push_sent: boolean;
  employee_responded: boolean;
  responded_at: string | null;
  minutes_overdue: number;
}

interface Props {
  timeEntryId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AutoClosedPunchReviewModal({ timeEntryId, isOpen, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [action, setAction] = useState<'approve' | 'edit' | 'dispute' | null>(null);
  const [editedClockOut, setEditedClockOut] = useState('');
  const [supervisorNotes, setSupervisorNotes] = useState('');

  const getLocale = () => {
    switch (i18n.language) {
      case 'es': return es;
      case 'pt-BR': return ptBR;
      default: return undefined;
    }
  };

  // Fetch time entry details
  const { data: timeEntry, isLoading: entryLoading } = useQuery({
    queryKey: ['time-entry-detail', timeEntryId],
    queryFn: async () => {
      if (!timeEntryId) return null;

      const { data, error } = await supabase
        .from('detail_hub_time_entries')
        .select(`
          *,
          employee:detail_hub_employees!detail_hub_time_entries_employee_id_fkey(
            id,
            first_name,
            last_name,
            phone
          )
        `)
        .eq('id', timeEntryId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!timeEntryId && isOpen,
  });

  // Fetch reminder logs
  const { data: reminders = [], isLoading: remindersLoading } = useQuery({
    queryKey: ['punch-reminder-logs', timeEntryId],
    queryFn: async () => {
      if (!timeEntryId) return [];

      const { data, error } = await supabase
        .from('detail_hub_punch_out_reminders')
        .select('*')
        .eq('time_entry_id', timeEntryId)
        .order('sent_at', { ascending: true });

      if (error) throw error;
      return data as ReminderLog[];
    },
    enabled: !!timeEntryId && isOpen,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!timeEntryId) return;

      const { error } = await supabase
        .from('detail_hub_time_entries')
        .update({
          verified_at: new Date().toISOString(),
          requires_supervisor_review: false,
          notes: supervisorNotes
            ? `${timeEntry?.notes || ''}\n\nSUPERVISOR: ${supervisorNotes}`
            : timeEntry?.notes,
        })
        .eq('id', timeEntryId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('detail_hub.auto_close_approved'));
      queryClient.invalidateQueries({ queryKey: ['auto-closed-punches-count'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      onClose();
    },
    onError: (error) => {
      console.error('Approve error:', error);
      toast.error(t('detail_hub.auto_close_approve_error'));
    },
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!timeEntryId || !editedClockOut) return;

      const { error } = await supabase
        .from('detail_hub_time_entries')
        .update({
          clock_out: editedClockOut,
          verified_at: new Date().toISOString(),
          requires_supervisor_review: false,
          notes: `${timeEntry?.notes || ''}\n\nSUPERVISOR EDIT: Clock-out ajustado a ${format(new Date(editedClockOut), 'HH:mm', { locale: getLocale() })}. ${supervisorNotes}`,
        })
        .eq('id', timeEntryId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('detail_hub.auto_close_edited'));
      queryClient.invalidateQueries({ queryKey: ['auto-closed-punches-count'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      onClose();
    },
    onError: (error) => {
      console.error('Edit error:', error);
      toast.error(t('detail_hub.auto_close_edit_error'));
    },
  });

  // Dispute mutation
  const disputeMutation = useMutation({
    mutationFn: async () => {
      if (!timeEntryId) return;

      const { error } = await supabase
        .from('detail_hub_time_entries')
        .update({
          status: 'disputed',
          verified_at: new Date().toISOString(),
          requires_supervisor_review: false,
          notes: `${timeEntry?.notes || ''}\n\nDISPUTED: ${supervisorNotes}`,
        })
        .eq('id', timeEntryId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('detail_hub.auto_close_disputed'));
      queryClient.invalidateQueries({ queryKey: ['auto-closed-punches-count'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      onClose();
    },
    onError: (error) => {
      console.error('Dispute error:', error);
      toast.error(t('detail_hub.auto_close_dispute_error'));
    },
  });

  const handleSubmit = () => {
    if (action === 'approve') {
      approveMutation.mutate();
    } else if (action === 'edit') {
      if (!editedClockOut) {
        toast.error(t('detail_hub.auto_close_edit_time_required'));
        return;
      }
      editMutation.mutate();
    } else if (action === 'dispute') {
      if (!supervisorNotes.trim()) {
        toast.error(t('detail_hub.auto_close_dispute_reason_required'));
        return;
      }
      disputeMutation.mutate();
    }
  };

  const isLoading = entryLoading || remindersLoading;
  const isPending = approveMutation.isPending || editMutation.isPending || disputeMutation.isPending;

  if (!timeEntry && !isLoading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            {t('detail_hub.auto_close_review_title')}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Employee Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <User className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">
                  {t('detail_hub.auto_close_employee_info')}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">{t('common.name')}:</span>{' '}
                  <span className="font-medium">
                    {timeEntry?.employee?.first_name} {timeEntry?.employee?.last_name}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">{t('common.phone')}:</span>{' '}
                  <span className="font-medium">{timeEntry?.employee?.phone || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Time Entry Details */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">
                  {t('detail_hub.auto_close_time_details')}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">{t('detail_hub.clock_in')}:</span>{' '}
                  <span className="font-medium">
                    {format(new Date(timeEntry?.clock_in), 'PPp', { locale: getLocale() })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">{t('detail_hub.clock_out')}:</span>{' '}
                  <span className="font-medium">
                    {format(new Date(timeEntry?.clock_out), 'PPp', { locale: getLocale() })}
                  </span>
                  <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-300">
                    {t('detail_hub.auto_closed')}
                  </Badge>
                </div>
                {timeEntry?.auto_closed_at && (
                  <div className="col-span-2">
                    <span className="text-gray-600">{t('detail_hub.auto_closed_at')}:</span>{' '}
                    <span className="font-medium">
                      {format(new Date(timeEntry.auto_closed_at), 'PPp', { locale: getLocale() })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Auto-Close Reason */}
            {timeEntry?.auto_close_reason && (
              <div className="bg-amber-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <h3 className="font-semibold text-gray-900">
                    {t('detail_hub.auto_close_reason')}
                  </h3>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {timeEntry.auto_close_reason}
                </p>
              </div>
            )}

            {/* Reminder History */}
            {reminders.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <MessageSquare className="h-5 w-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">
                    {t('detail_hub.auto_close_reminder_history')}
                  </h3>
                </div>
                <div className="space-y-2">
                  {reminders.map((reminder) => (
                    <div key={reminder.id} className="flex items-center justify-between text-sm border-l-2 border-gray-300 pl-3 py-1">
                      <div>
                        <span className="font-medium">
                          {reminder.reminder_type === 'first' && t('detail_hub.first_reminder')}
                          {reminder.reminder_type === 'second' && t('detail_hub.second_reminder')}
                          {reminder.reminder_type === 'auto_close' && t('detail_hub.auto_close_notification')}
                        </span>
                        <span className="text-gray-600 ml-2">
                          ({reminder.minutes_overdue} {t('common.minutes')} {t('detail_hub.overdue')})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {reminder.sms_sent && (
                          <Badge variant="outline" className="text-xs">SMS</Badge>
                        )}
                        {reminder.push_sent && (
                          <Badge variant="outline" className="text-xs">Push</Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {format(new Date(reminder.sent_at), 'p', { locale: getLocale() })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Selection */}
            <div className="border-t pt-4">
              <Label className="text-base font-semibold mb-3 block">
                {t('detail_hub.auto_close_action_select')}
              </Label>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Button
                  variant={action === 'approve' ? 'default' : 'outline'}
                  onClick={() => setAction('approve')}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {t('detail_hub.approve')}
                </Button>
                <Button
                  variant={action === 'edit' ? 'default' : 'outline'}
                  onClick={() => {
                    setAction('edit');
                    if (!editedClockOut && timeEntry?.clock_out) {
                      setEditedClockOut(timeEntry.clock_out);
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  {t('detail_hub.edit_time')}
                </Button>
                <Button
                  variant={action === 'dispute' ? 'default' : 'outline'}
                  onClick={() => setAction('dispute')}
                  className="flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4" />
                  {t('detail_hub.dispute')}
                </Button>
              </div>

              {/* Edit Time Input */}
              {action === 'edit' && (
                <div className="space-y-2 mb-4">
                  <Label>{t('detail_hub.new_clock_out_time')}</Label>
                  <Input
                    type="datetime-local"
                    value={editedClockOut ? format(new Date(editedClockOut), "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => setEditedClockOut(new Date(e.target.value).toISOString())}
                    className="w-full"
                  />
                </div>
              )}

              {/* Supervisor Notes */}
              {action && (
                <div className="space-y-2">
                  <Label>
                    {action === 'dispute'
                      ? t('detail_hub.dispute_reason')
                      : t('detail_hub.supervisor_notes')}
                    {action === 'dispute' && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <Textarea
                    value={supervisorNotes}
                    onChange={(e) => setSupervisorNotes(e.target.value)}
                    placeholder={
                      action === 'dispute'
                        ? t('detail_hub.dispute_reason_placeholder')
                        : t('detail_hub.supervisor_notes_placeholder')
                    }
                    rows={3}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!action || isPending}
            className="min-w-[120px]"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {t('common.processing')}
              </span>
            ) : (
              t('common.submit')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
