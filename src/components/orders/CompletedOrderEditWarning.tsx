import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Clock, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

interface CompletedOrderEditWarningProps {
  orderNumber: string;
  completedAt: string | Date | null;
  status: 'completed' | 'cancelled';
}

/**
 * CAUTION: This component shows a warning when editing completed or cancelled orders
 * This is a sensitive operation and all changes will be logged for audit purposes
 */
export function CompletedOrderEditWarning({
  orderNumber,
  completedAt,
  status
}: CompletedOrderEditWarningProps) {
  const { t } = useTranslation();

  // Format the completion date if available
  const formattedDate = completedAt
    ? format(new Date(completedAt), 'PPpp')
    : null;

  return (
    <Alert
      variant="warning"
      className="mb-4 border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
    >
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
      <AlertTitle className="text-amber-900 dark:text-amber-200 font-semibold flex items-center gap-2">
        <ShieldCheck className="h-4 w-4" />
        {t('orders.editing_completed_order_warning_title', 'Editing Completed Order')}
      </AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-300 space-y-2 mt-2">
        <p>
          {status === 'completed'
            ? t('orders.editing_completed_order_warning_description', {
                defaultValue: `You are editing order {{orderNumber}} that was completed. All changes will be logged for audit purposes.`,
                orderNumber
              })
            : t('orders.editing_cancelled_order_warning_description', {
                defaultValue: `You are editing order {{orderNumber}} that was cancelled. All changes will be logged for audit purposes.`,
                orderNumber
              })
          }
        </p>
        {formattedDate && (
          <p className="text-xs flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            {status === 'completed'
              ? t('orders.completed_at_label', { defaultValue: 'Completed: {{date}}', date: formattedDate })
              : t('orders.cancelled_at_label', { defaultValue: 'Cancelled: {{date}}', date: formattedDate })
            }
          </p>
        )}
        <p className="text-xs font-medium text-amber-900 dark:text-amber-200 mt-2 p-2 bg-amber-100/50 dark:bg-amber-900/30 rounded">
          <strong className="font-semibold">{t('common.caution', 'CAUTION')}:</strong>{' '}
          {t('orders.audit_logging_notice',
            'This is a sensitive operation. All field changes will be permanently recorded with your user information, timestamp, and the reason for change.'
          )}
        </p>
      </AlertDescription>
    </Alert>
  );
}