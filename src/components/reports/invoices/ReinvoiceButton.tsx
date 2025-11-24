import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useCreateReinvoice } from '@/hooks/useInvoices';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Invoice } from '@/types/invoices';

interface ReinvoiceButtonProps {
  invoice: Invoice;
  disabled?: boolean;
}

export function ReinvoiceButton({ invoice, disabled }: ReinvoiceButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const createReinvoiceMutation = useCreateReinvoice();

  // Count unpaid items
  const unpaidItems = invoice.items?.filter(item => !item.isPaid) || [];
  const unpaidCount = unpaidItems.length;
  const unpaidTotal = unpaidItems.reduce((sum, item) => sum + item.totalAmount, 0);

  // Determine if we can create a re-invoice
  const canReinvoice = unpaidCount > 0 && !invoice.isReinvoice;

  const handleConfirm = () => {
    createReinvoiceMutation.mutate(
      { parentInvoiceId: invoice.id },
      {
        onSuccess: () => {
          setShowDialog(false);
        }
      }
    );
  };

  if (!canReinvoice) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        disabled={disabled || createReinvoiceMutation.isPending}
        variant="outline"
        className="gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${createReinvoiceMutation.isPending ? 'animate-spin' : ''}`} />
        Create Re-Invoice
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Create Re-Invoice?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This will create a new invoice containing only the <strong>{unpaidCount} unpaid item(s)</strong> from this invoice.
                </p>

                <div className="bg-gray-50 p-3 rounded-md space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current invoice:</span>
                    <span className="font-medium">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">New re-invoice:</span>
                    <span className="font-medium">
                      {invoice.invoiceNumber}-{String.fromCharCode(65 + (invoice.childInvoices?.length || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-gray-600">Unpaid amount:</span>
                    <span className="font-semibold text-emerald-600">
                      ${unpaidTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  The original invoice will be marked as <span className="font-medium text-amber-600">"Partially Paid"</span>.
                  When items in the re-invoice are marked as paid, they will automatically be marked as paid in the original invoice.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={createReinvoiceMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={createReinvoiceMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {createReinvoiceMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Re-Invoice'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
