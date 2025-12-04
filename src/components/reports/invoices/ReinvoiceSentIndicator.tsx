import React from 'react';
import { FileText } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { Invoice } from '@/types/invoices';

interface ReinvoiceSentIndicatorProps {
  invoice: Invoice;
  onOpenReinvoiceHistory?: () => void;
}

export function ReinvoiceSentIndicator({ invoice, onOpenReinvoiceHistory }: ReinvoiceSentIndicatorProps) {
  const { t } = useTranslation();

  // Count child invoices (reinvoices created from this invoice)
  const reinvoiceCount = invoice.childInvoicesCount || 0;

  // Don't render if no reinvoices have been created
  if (reinvoiceCount === 0) {
    return null;
  }

  // Get the most recent reinvoice for last created date
  const lastReinvoice = invoice.reinvoiceHistory?.[invoice.reinvoiceHistory.length - 1];

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return t('reports.invoices.no_date', 'N/A');
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy h:mm a');
    } catch {
      return t('reports.invoices.no_date', 'N/A');
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent row click
    if (onOpenReinvoiceHistory) {
      onOpenReinvoiceHistory();
    }
  };

  const countKey = reinvoiceCount === 1
    ? 'reports.invoices.reinvoices_created_count'
    : 'reports.invoices.reinvoices_created_count_plural';

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex items-center justify-center gap-0.5 cursor-pointer hover:bg-indigo-50 px-1.5 py-1 rounded transition-colors h-9"
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(e as any);
              }
            }}
            aria-label={t('reports.invoices.reinvoice_indicator', 'Reinvoice indicator')}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[10px] font-semibold text-indigo-600 min-w-[14px] text-center">
              {reinvoiceCount}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" align="center" className="max-w-xs p-3 space-y-2" sideOffset={5}>
          <div className="space-y-1.5 text-sm">
            <div className="font-semibold text-indigo-600">
              {t(countKey, {
                count: reinvoiceCount,
                defaultValue: `${reinvoiceCount} reinvoice${reinvoiceCount > 1 ? 's' : ''} created`
              })}
            </div>
            {lastReinvoice && (
              <>
                <div className="text-muted-foreground">
                  <span className="font-medium">{t('reports.invoices.last_created_at', 'Last created:')} </span>
                  {formatDate(lastReinvoice.createdAt)}
                </div>
                {lastReinvoice.unpaidAmount > 0 && (
                  <div className="text-muted-foreground">
                    <span className="font-medium">{t('reports.invoices.unpaid_amount', 'Unpaid amount:')} </span>
                    ${lastReinvoice.unpaidAmount.toFixed(2)}
                  </div>
                )}
              </>
            )}
            <div className="pt-1 mt-2 border-t border-border">
              <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline transition-colors flex items-center gap-1" onClick={handleClick}>
                {t('reports.invoices.view_reinvoice_history', 'View reinvoice history')}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
