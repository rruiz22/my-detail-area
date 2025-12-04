import React from 'react';
import { Mail } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { Invoice } from '@/types/invoices';

interface EmailSentIndicatorProps {
  invoice: Invoice;
  onOpenEmailHistory?: () => void;
}

export function EmailSentIndicator({ invoice, onOpenEmailHistory }: EmailSentIndicatorProps) {
  const { t } = useTranslation();

  // Don't render if no emails have been sent
  if (!invoice.emailSentCount || invoice.emailSentCount === 0) {
    return null;
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return t('reports.invoices.no_date', 'N/A');
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy h:mm a');
    } catch {
      return t('reports.invoices.no_date', 'N/A');
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Prevent triggering parent row click
    e.stopPropagation();

    if (onOpenEmailHistory) {
      onOpenEmailHistory();
    }
  };

  // Determine singular/plural for translation
  const countKey = invoice.emailSentCount === 1
    ? 'reports.invoices.emails_sent_count'
    : 'reports.invoices.emails_sent_count_plural';

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex items-center justify-center gap-0.5 cursor-pointer hover:bg-emerald-50 px-1.5 py-1 rounded transition-colors h-9"
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(e as any);
              }
            }}
            aria-label={t('reports.invoices.email_sent_indicator', 'Email sent indicator')}
          >
            <Mail className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] font-semibold text-emerald-600 min-w-[14px] text-center">
              {invoice.emailSentCount}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="max-w-xs p-3 space-y-2"
          sideOffset={5}
        >
          <div className="space-y-1.5 text-sm">
            {/* Email count */}
            <div className="font-semibold text-emerald-600">
              {t(countKey, {
                count: invoice.emailSentCount,
                defaultValue: `${invoice.emailSentCount} email${invoice.emailSentCount > 1 ? 's' : ''} sent`
              })}
            </div>

            {/* Last sent date */}
            {invoice.emailSentAt && (
              <div className="text-muted-foreground">
                <span className="font-medium">{t('reports.invoices.last_sent_at', 'Last sent:')} </span>
                {formatDate(invoice.emailSentAt)}
              </div>
            )}

            {/* Last recipient */}
            {invoice.lastEmailRecipient && (
              <div className="text-muted-foreground">
                <span className="font-medium">{t('reports.invoices.sent_to', 'To:')} </span>
                {invoice.lastEmailRecipient}
              </div>
            )}

            {/* Link to view email history */}
            <div className="pt-1 mt-2 border-t border-border">
              <button
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline transition-colors flex items-center gap-1"
                onClick={handleClick}
              >
                {t('reports.invoices.view_email_history', 'View email history')}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
