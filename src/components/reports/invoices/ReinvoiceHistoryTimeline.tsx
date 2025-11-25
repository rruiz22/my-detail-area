import { Badge } from '@/components/ui/badge';
import { FileText, User, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import type { ReinvoiceHistory } from '@/types/invoices';

interface ReinvoiceHistoryTimelineProps {
  history: ReinvoiceHistory[];
  currentInvoiceId: string;
  onInvoiceClick?: (invoiceId: string) => void; // ✅ Click handler for opening re-invoices
}

export function ReinvoiceHistoryTimeline({ history, currentInvoiceId, onInvoiceClick }: ReinvoiceHistoryTimelineProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">No re-invoice history</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Re-Invoice History
      </h4>

      <div className="relative pl-6 space-y-6">
        {/* Timeline line */}
        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200" />

        {history.map((entry, index) => {
          const isCurrentInvoice = entry.childInvoiceId === currentInvoiceId;

          return (
            <div key={entry.id} className="relative">
              {/* Timeline dot */}
              <div className={`absolute left-[-1.375rem] top-1 h-4 w-4 rounded-full border-2 ${
                isCurrentInvoice
                  ? 'bg-emerald-500 border-emerald-600'
                  : 'bg-white border-gray-300'
              }`} />

              {/* Content card */}
              <div
                className={`bg-white border rounded-lg p-4 shadow-sm transition-all ${
                  isCurrentInvoice
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-gray-200 hover:border-indigo-300 hover:shadow-md cursor-pointer'
                }`}
                onClick={() => !isCurrentInvoice && onInvoiceClick?.(entry.childInvoiceId)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={isCurrentInvoice ? 'default' : 'secondary'} className="font-mono">
                      Sequence {entry.reinvoiceSequence}
                    </Badge>
                    {isCurrentInvoice && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        Current
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(entry.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Unpaid Items:</span>
                    <span className="font-medium">{entry.unpaidItemsCount}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Amount:
                    </span>
                    <span className="font-semibold text-emerald-600">
                      ${entry.unpaidAmount.toFixed(2)}
                    </span>
                  </div>

                  {entry.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-600 italic">{entry.notes}</p>
                    </div>
                  )}

                  {!isCurrentInvoice && onInvoiceClick && (
                    <div className="pt-2 mt-2 border-t border-gray-100">
                      <p className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Click to view invoice details
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
