// =====================================================
// INVOICE DETAILS DIALOG
// Created: 2024-10-31
// Description: Display invoice details with vehicle list
// =====================================================

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useInvoice } from '@/hooks/useInvoices';
import type { InvoiceStatus } from '@/types/invoices';
import { format } from 'date-fns';
import { Download, FileText, Loader2, Mail, Printer } from 'lucide-react';
import React from 'react';

interface InvoiceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
}

const getStatusBadge = (status: InvoiceStatus) => {
  const styles = {
    draft: { variant: 'secondary' as const, label: 'Draft' },
    pending: { variant: 'outline' as const, label: 'Pending' },
    paid: { variant: 'default' as const, label: 'Paid' },
    partially_paid: { variant: 'secondary' as const, label: 'Partially Paid' },
    overdue: { variant: 'destructive' as const, label: 'Overdue' },
    cancelled: { variant: 'outline' as const, label: 'Cancelled' }
  };

  const style = styles[status] || styles.draft;
  return <Badge variant={style.variant}>{style.label}</Badge>;
};

export const InvoiceDetailsDialog: React.FC<InvoiceDetailsDialogProps> = ({
  open,
  onOpenChange,
  invoiceId,
}) => {
  const { data: invoice, isLoading } = useInvoice(invoiceId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // TODO: Implement PDF download
    console.log('Download invoice:', invoiceId);
  };

  const handleEmail = () => {
    // TODO: Implement email
    console.log('Email invoice:', invoiceId);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!invoice) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Invoice not found</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5" />
                Invoice {invoice.invoiceNumber}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                {getStatusBadge(invoice.status)}
                <span className="text-muted-foreground">
                  • {invoice.items?.length || 0} vehicle{invoice.items?.length !== 1 ? 's' : ''}
                </span>
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleEmail}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-6 pb-6 border-b">
            <div>
              <h3 className="font-semibold text-lg mb-3">Bill To:</h3>
              <div className="text-sm space-y-1">
                <p className="font-medium text-base">{invoice.dealership?.name || 'N/A'}</p>
                {invoice.dealership?.address && (
                  <p className="text-muted-foreground">{invoice.dealership.address}</p>
                )}
                {invoice.dealership?.email && (
                  <p className="text-muted-foreground">{invoice.dealership.email}</p>
                )}
                {invoice.dealership?.phone && (
                  <p className="text-muted-foreground">{invoice.dealership.phone}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Invoice Date:</span>
                  <p className="font-medium">{formatDate(invoice.issueDate)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Due Date:</span>
                  <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Invoice Number:</span>
                  <p className="font-mono font-medium">{invoice.invoiceNumber}</p>
                </div>
                {invoice.order?.orderType && (
                  <div>
                    <span className="text-muted-foreground">Department:</span>
                    <p className="font-medium capitalize">{invoice.order.orderType}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Vehicle List */}
          <div>
            <h3 className="font-semibold text-base mb-3">Vehicles ({invoice.items?.length || 0})</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Stock</TableHead>
                    <TableHead className="font-semibold">Vehicle</TableHead>
                    <TableHead className="font-semibold">VIN</TableHead>
                    <TableHead className="font-semibold text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">
                          {item.metadata?.completed_at
                            ? format(new Date(item.metadata.completed_at), 'MM/dd/yyyy')
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {item.metadata?.stock_number || 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm">{item.description}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.metadata?.vehicle_vin || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.totalAmount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No items found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-80 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({invoice.taxRate}%):</span>
                  <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Discount:</span>
                  <span className="font-medium">-{formatCurrency(invoice.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">Total:</span>
                <span className="font-bold text-xl">{formatCurrency(invoice.totalAmount)}</span>
              </div>
              {invoice.amountPaid > 0 && (
                <>
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Amount Paid:</span>
                    <span className="font-medium">{formatCurrency(invoice.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Amount Due:</span>
                    <span className="font-bold text-lg text-orange-600">
                      {formatCurrency(invoice.amountDue)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes and Terms */}
          {(invoice.invoiceNotes || invoice.termsAndConditions) && (
            <div className="space-y-4 pt-6 border-t">
              {invoice.invoiceNotes && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Notes:</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {invoice.invoiceNotes}
                  </p>
                </div>
              )}
              {invoice.termsAndConditions && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Terms & Conditions:</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {invoice.termsAndConditions}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="space-y-3 pt-6 border-t">
              <h4 className="font-semibold text-sm">Payment History:</h4>
              <div className="space-y-2">
                {invoice.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        Payment {payment.paymentNumber} - {payment.paymentMethod}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payment.paymentDate)}
                        {payment.referenceNumber && ` • Ref: ${payment.referenceNumber}`}
                      </p>
                    </div>
                    <p className="font-bold text-emerald-600">
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
