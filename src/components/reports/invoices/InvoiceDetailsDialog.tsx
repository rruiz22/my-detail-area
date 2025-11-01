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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useInvoice, useDeleteInvoice, useDeletePayment } from '@/hooks/useInvoices';
import type { InvoiceStatus } from '@/types/invoices';
import { format } from 'date-fns';
import { Download, FileSpreadsheet, FileText, Loader2, Mail, Printer, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generateInvoicePDF } from '@/utils/generateInvoicePDF';
import { generateInvoiceExcel } from '@/utils/generateInvoiceExcel';
import { toast } from 'sonner';

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
  const { t } = useTranslation();
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const deleteMutation = useDeleteInvoice();
  const deletePaymentMutation = useDeletePayment();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

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

  const handleDownloadPDF = async () => {
    if (!invoice) return;

    try {
      await generateInvoicePDF(invoice);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleDownloadExcel = () => {
    if (!invoice) return;

    try {
      generateInvoiceExcel(invoice);
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error('Failed to generate Excel file');
    }
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
                {t('reports.invoices.send_email')}
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                {t('common.action_buttons.print')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    {t('common.action_buttons.download')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDownloadPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Download Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={invoice.status === 'paid'}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('reports.invoices.delete')}
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
                    <TableHead className="font-bold text-center">Date</TableHead>
                    <TableHead className="font-bold text-center">Order</TableHead>
                    <TableHead className="font-bold text-center">
                      {(invoice.order?.orderType || invoice.order?.order_type) === 'service' ? 'PO/RO/Tag' : 'Stock'}
                    </TableHead>
                    <TableHead className="font-bold text-center">Vehicle</TableHead>
                    <TableHead className="font-bold text-center">VIN</TableHead>
                    <TableHead className="font-bold text-left">Services</TableHead>
                    <TableHead className="font-bold text-center">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm text-center">
                          {item.metadata?.completed_at
                            ? format(new Date(item.metadata.completed_at), 'MM/dd')
                            : item.createdAt
                            ? format(new Date(item.createdAt), 'MM/dd')
                            : format(new Date(invoice.issueDate), 'MM/dd')}
                        </TableCell>
                        <TableCell className="text-sm text-center font-medium">
                          {item.metadata?.order_number || 'N/A'}
                        </TableCell>
                        <TableCell className="font-medium text-sm text-center">
                          {(item.metadata?.order_type) === 'service' ? (
                            <div className="flex flex-col gap-0.5 text-xs">
                              {item.metadata?.po && <span>PO: {item.metadata.po}</span>}
                              {item.metadata?.ro && <span>RO: {item.metadata.ro}</span>}
                              {item.metadata?.tag && <span className="font-semibold">Tag: {item.metadata.tag}</span>}
                              {!item.metadata?.po && !item.metadata?.ro && !item.metadata?.tag && 'N/A'}
                            </div>
                          ) : (
                            item.metadata?.stock_number || 'N/A'
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-center">{item.description}</TableCell>
                        <TableCell className="font-mono text-sm font-semibold text-center">
                          {item.metadata?.vehicle_vin || 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm text-left">
                          {item.metadata?.service_names ? (
                            <span className="text-xs text-gray-700">{item.metadata.service_names}</span>
                          ) : item.serviceReference ? (
                            <span className="text-xs text-gray-700">{item.serviceReference}</span>
                          ) : (
                            <span className="text-xs text-gray-500">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {formatCurrency(item.totalAmount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                    className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg text-sm group"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        Payment {payment.paymentNumber} - {payment.paymentMethod}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payment.paymentDate)}
                        {payment.referenceNumber && ` • Ref: ${payment.referenceNumber}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-emerald-600">
                        {formatCurrency(payment.amount)}
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setPaymentToDelete(payment.id)}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('reports.invoices.delete_confirm_title', { number: invoice.invoiceNumber })}
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  {t('reports.invoices.delete_confirm_message', { count: invoice.items?.length || 0 })}
                </p>
                <p className="text-sm text-gray-600">
                  {t('reports.invoices.vehicles_available_again')}
                </p>
                {invoice.payments && invoice.payments.length > 0 && (
                  <p className="text-red-600 font-semibold mt-2">
                    {t('reports.invoices.has_payments_warning', { count: invoice.payments.length })}
                  </p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.action_buttons.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  await deleteMutation.mutateAsync(invoiceId);
                  setShowDeleteConfirm(false);
                  onOpenChange(false);
                }}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending
                  ? t('reports.invoices.deleting')
                  : t('reports.invoices.delete_invoice')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Payment Confirmation Dialog */}
        <AlertDialog open={!!paymentToDelete} onOpenChange={() => setPaymentToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The payment will be permanently deleted and the invoice balance will be updated.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (paymentToDelete) {
                    await deletePaymentMutation.mutateAsync(paymentToDelete);
                    setPaymentToDelete(null);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
                disabled={deletePaymentMutation.isPending}
              >
                {deletePaymentMutation.isPending ? 'Deleting...' : 'Delete Payment'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};
