/**
 * Reminder Preview Dialog
 *
 * Shows a preview of what the employee will receive when auto-close is enabled:
 * - SMS reminder message (in employee's preferred language)
 * - SMS auto-close confirmation message
 * - Timeline of events
 *
 * Note: No push notifications - SMS only
 */

import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import {
  MessageSquare,
  Clock,
  AlertCircle,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import { format, addMinutes, parse } from 'date-fns';

type SupportedLanguage = 'en' | 'es' | 'pt-BR';

interface ReminderPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  employeeName?: string;
  shiftEndTime: string; // Format: "18:00"
  reminderMinutes: number; // e.g., 30
  autoCloseMinutes: number; // e.g., 60
  preferredLanguage?: SupportedLanguage;
}

// Localized messages (same as in Edge Function - no reply expected)
function getReminderMessage(language: SupportedLanguage, shiftEndTime: string): string {
  const messages = {
    'en': `Reminder: Please clock out your shift that ended at ${shiftEndTime}.`,
    'es': `Recordatorio: Por favor registra tu salida del turno que terminó a las ${shiftEndTime}.`,
    'pt-BR': `Lembrete: Por favor registre sua saída do turno que terminou às ${shiftEndTime}.`
  };
  return messages[language] || messages['en'];
}

function getAutoCloseConfirmationMessage(language: SupportedLanguage): string {
  const messages = {
    'en': 'Your timecard has been automatically closed. Your supervisor will be notified for review.',
    'es': 'Tu tarjeta de tiempo ha sido cerrada automáticamente. Tu supervisor será notificado para revisión.',
    'pt-BR': 'Seu cartão de ponto foi fechado automaticamente. Seu supervisor será notificado para revisão.'
  };
  return messages[language] || messages['en'];
}

function getLanguageDisplayName(language: SupportedLanguage): string {
  const names = {
    'en': 'English',
    'es': 'Español',
    'pt-BR': 'Português'
  };
  return names[language] || names['en'];
}

export function ReminderPreviewDialog({
  open,
  onClose,
  employeeName = "Employee",
  shiftEndTime,
  reminderMinutes,
  autoCloseMinutes,
  preferredLanguage = 'en',
}: ReminderPreviewDialogProps) {
  const { t } = useTranslation();

  // Calculate times based on shift end
  const shiftEndDate = parse(shiftEndTime, 'HH:mm', new Date());
  const reminderTime = addMinutes(shiftEndDate, reminderMinutes);
  const autoCloseTime = addMinutes(shiftEndDate, autoCloseMinutes);

  const formattedShiftEnd = format(shiftEndDate, 'h:mm a');
  const formattedReminderTime = format(reminderTime, 'h:mm a');
  const formattedAutoCloseTime = format(autoCloseTime, 'h:mm a');

  // Generate messages in employee's preferred language
  const reminderSmsMessage = getReminderMessage(preferredLanguage, formattedShiftEnd);
  const autoCloseConfirmationMessage = getAutoCloseConfirmationMessage(preferredLanguage);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            {t('detail_hub.auto_close.preview_title')}
          </DialogTitle>
          <DialogDescription>
            {t('detail_hub.auto_close.preview_description')} ({getLanguageDisplayName(preferredLanguage)})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Timeline */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('detail_hub.auto_close.timeline')}
            </h4>

            <div className="relative pl-6 space-y-4">
              {/* Timeline line */}
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200" />

              {/* Shift End */}
              <div className="relative flex items-start gap-3">
                <div className="absolute -left-4 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow" />
                <div>
                  <p className="font-medium text-gray-900">{formattedShiftEnd}</p>
                  <p className="text-sm text-gray-500">{t('detail_hub.auto_close.shift_ends')}</p>
                </div>
              </div>

              {/* Reminder SMS */}
              <div className="relative flex items-start gap-3">
                <div className="absolute -left-4 w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow" />
                <div>
                  <p className="font-medium text-gray-900">{formattedReminderTime}</p>
                  <p className="text-sm text-gray-500">
                    {t('detail_hub.auto_close.reminder_sent')} (+{reminderMinutes} min)
                  </p>
                </div>
              </div>

              {/* Auto Close + Confirmation SMS */}
              <div className="relative flex items-start gap-3">
                <div className="absolute -left-4 w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow" />
                <div>
                  <p className="font-medium text-gray-900">{formattedAutoCloseTime}</p>
                  <p className="text-sm text-gray-500">
                    {t('detail_hub.auto_close.auto_closed')} (+{autoCloseMinutes} min)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SMS Reminder Preview */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('detail_hub.auto_close.sms_preview')} (@ {formattedReminderTime})
            </h4>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <Smartphone className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-green-600 font-medium mb-1">SMS</p>
                    <p className="text-sm text-gray-800">{reminderSmsMessage}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SMS Auto-Close Confirmation Preview */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {t('detail_hub.auto_close.confirmation_preview')} (@ {formattedAutoCloseTime})
            </h4>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                    <Smartphone className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-amber-600 font-medium mb-1">SMS</p>
                    <p className="text-sm text-gray-800">{autoCloseConfirmationMessage}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Note */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">{t('detail_hub.auto_close.note_title')}</p>
              <p className="text-blue-600 mt-1">
                {t('detail_hub.auto_close.note_description')}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
