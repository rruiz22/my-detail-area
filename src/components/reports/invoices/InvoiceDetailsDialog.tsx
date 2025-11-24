// =====================================================
// INVOICE DETAILS DIALOG
// Created: 2024-10-31
// Description: Display invoice details with vehicle list
// =====================================================

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDeleteInvoice, useDeletePayment, useInvoice, useUpdateInvoiceItemPaid, useBulkUpdateInvoiceItemsPaid } from '@/hooks/useInvoices';
import { useRecalculateInvoice } from '@/hooks/useRecalculateInvoice';
import type { InvoiceStatus } from '@/types/invoices';
import { generateInvoiceExcel } from '@/utils/generateInvoiceExcel';
import { generateInvoicePDF } from '@/utils/generateInvoicePDF';
import { format, parseISO } from 'date-fns';
import { Download, FileSpreadsheet, FileText, Loader2, Mail, Printer, RefreshCw, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SendInvoiceEmailDialog } from './email/SendInvoiceEmailDialog';
import { InvoiceComments } from './InvoiceComments';
import { InvoiceEmailLog } from './InvoiceEmailLog';

interface InvoiceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
}

const getStatusBadge = (status: InvoiceStatus) => {
  const styles = {
    draft: { variant: 'secondary' as const, label: 'Draft', className: '' },
    pending: { variant: 'outline' as const, label: 'Pending', className: '' },
    paid: { variant: 'default' as const, label: 'Paid', className: '' },
    partially_paid: {
      variant: 'secondary' as const,
      label: 'Partially Paid',
      className: 'bg-amber-100 text-amber-800 border-amber-300 text-sm px-3 py-1.5 font-semibold'
    },
    overdue: { variant: 'destructive' as const, label: 'Overdue', className: '' },
    cancelled: { variant: 'outline' as const, label: 'Cancelled', className: '' }
  };

  const style = styles[status] || styles.draft;
  return <Badge variant={style.variant} className={style.className}>{style.label}</Badge>;
};

export const InvoiceDetailsDialog: React.FC<InvoiceDetailsDialogProps> = ({
  open,
  onOpenChange,
  invoiceId,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const deleteMutation = useDeleteInvoice();
  const deletePaymentMutation = useDeletePayment();
  const recalculateMutation = useRecalculateInvoice();
  const updateItemPaidMutation = useUpdateInvoiceItemPaid();
  const bulkUpdateItemsPaidMutation = useBulkUpdateInvoiceItemsPaid();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRecalculateConfirm, setShowRecalculateConfirm] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'MMM dd, yyyy');
  };

  /**
   * Get the correct date for an invoice item based on order type
   * Sales & Service orders: due_date
   * Recon & Carwash orders: completed_date
   */
  const getCorrectItemDate = (item: any): string => {
    const orderType = item.metadata?.order_type;

    if (orderType === 'sales' || orderType === 'service') {
      // Priority order for sales/service: due_date -> completed_at -> createdAt
      const dueDate = item.metadata?.due_date;
      const completedAt = item.metadata?.completed_at;
      const createdAt = item.createdAt;

      if (dueDate && dueDate !== 'null' && dueDate !== '') {
        return dueDate;
      }
      if (completedAt && completedAt !== 'null' && completedAt !== '') {
        return completedAt;
      }
      if (createdAt && createdAt !== 'null' && createdAt !== '') {
        return createdAt;
      }
    } else if (orderType === 'recon' || orderType === 'carwash') {
      // Priority order for recon/carwash: completed_at -> completed_date -> createdAt
      const completedAt = item.metadata?.completed_at;
      const completedDate = item.metadata?.completed_date;
      const createdAt = item.createdAt;

      if (completedAt && completedAt !== 'null' && completedAt !== '') {
        return completedAt;
      }
      if (completedDate && completedDate !== 'null' && completedDate !== '') {
        return completedDate;
      }
      if (createdAt && createdAt !== 'null' && createdAt !== '') {
        return createdAt;
      }
    }

    // Final fallback
    return item.metadata?.completed_at || item.createdAt;
  };

  // Clean vehicle description - remove stock number suffix if present
  const cleanVehicleDescription = (description: string): string => {
    if (!description || description === 'N/A') return description;

    // Remove everything after " - " (which is usually the stock number)
    if (description.includes(' - ')) {
      return description.split(' - ')[0].trim();
    }

    return description;
  };

  // Handle toggle individual item paid status
  const handleToggleItemPaid = (itemId: string, currentPaidStatus: boolean) => {
    updateItemPaidMutation.mutate({
      itemId,
      isPaid: !currentPaidStatus
    });
  };

  // Handle toggle all items paid status
  const handleToggleAllItemsPaid = () => {
    if (!invoice?.items || invoice.items.length === 0) return;

    const allPaid = invoice.items.every(item => item.isPaid);
    const itemIds = invoice.items.map(item => item.id);

    bulkUpdateItemsPaidMutation.mutate({
      itemIds,
      isPaid: !allPaid,
      invoiceId: invoice.id
    });
  };

  const handlePrint = async () => {
    if (!invoice) return;

    try {
      // Get dealership info
      const dealerName = invoice.dealership?.name || 'Dealership';
      const dealerLogo = invoice.dealership?.logo || '';
      const dealerAddress = invoice.dealership?.address || '';
      const dealerEmail = invoice.dealership?.email || '';
      const dealerPhone = invoice.dealership?.phone || '';

      // Get service period from metadata
      const servicePeriod = invoice.metadata?.filter_date_range
        ? `${formatDate(invoice.metadata.filter_date_range.start)} - ${formatDate(invoice.metadata.filter_date_range.end)}`
        : null;

      // Get department(s) from metadata
      const departments = invoice.metadata?.departments && invoice.metadata.departments.length > 0
        ? invoice.metadata.departments.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')
        : null;

      // Sort items by date (ascending) - using correct date based on order type
      const sortedItems = (invoice.items || []).sort((a, b) => {
        const dateA = getCorrectItemDate(a);
        const dateB = getCorrectItemDate(b);
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });

      // Generate print-friendly HTML with proper URL (not about:blank)
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({ variant: 'destructive', description: 'Please allow popups to print' });
        return;
      }

      // Set a proper document title for the URL bar
      printWindow.document.title = `Invoice-${invoice.invoiceNumber}-${dealerName.replace(/\s+/g, '-')}`;

      // Get sender info for header
      const senderName = 'DEALER DETAIL SERVICE LLC';

      // Get user full name
      const userFullName = user?.first_name && user?.last_name
        ? `${user.first_name} ${user.last_name}`
        : user?.email?.split('@')[0] || 'System';

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Invoice #${invoice.invoiceNumber} - ${dealerName}</title>
          <style>
            @page {
              margin: 0.5in;
              size: letter portrait;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Helvetica', 'Arial', sans-serif;
              font-size: 9pt;
              line-height: 1.3;
              color: #111827;
              padding: 0;
            }
            .print-header {
              text-align: center;
              margin-bottom: 20px;
              width: 100%;
            }
            .sender-name {
              font-size: 13pt;
              font-weight: bold;
              color: #6B7280;
              margin-bottom: 12px;
              letter-spacing: 1px;
              display: block;
              width: 100%;
              text-align: center;
            }
            .doc-title {
              font-size: 18pt;
              font-weight: bold;
              color: #111827;
              margin-bottom: 8px;
              display: block;
              width: 100%;
              text-align: center;
            }
            .period-info {
              font-size: 9pt;
              color: #374151;
              margin-bottom: 4px;
              display: block;
              width: 100%;
              text-align: center;
            }
            .generated-time {
              font-size: 7pt;
              font-style: italic;
              color: #6B7280;
              display: block;
              width: 100%;
              text-align: center;
            }
            .divider {
              border-top: 1px solid #E5E7EB;
              margin: 15px 0;
            }
            .invoice-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              gap: 30px;
            }
            .bill-to {
              flex: 1;
            }
            .bill-to h3 {
              font-size: 9pt;
              font-weight: 600;
              color: #374151;
              text-transform: uppercase;
              margin-bottom: 8px;
              letter-spacing: 0.5px;
            }
            .bill-to .company {
              font-size: 11pt;
              font-weight: 600;
              margin-bottom: 4px;
              color: #111827;
            }
            .bill-to p {
              color: #6B7280;
              margin: 2px 0;
              font-size: 8pt;
            }
            .bill-to .department-section {
              margin-top: 12px;
            }
            .bill-to .department-label {
              font-size: 7pt;
              color: #6B7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .bill-to .department-value {
              font-size: 10pt;
              font-weight: 600;
              color: #6B7280;
              text-transform: capitalize;
            }
            .invoice-details {
              text-align: right;
              flex: 1;
            }
            .invoice-details .detail-row {
              margin-bottom: 6px;
            }
            .invoice-details .label {
              color: #6B7280;
              font-size: 7pt;
              display: block;
              margin-bottom: 2px;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            .invoice-details .value {
              font-weight: 600;
              font-size: 9pt;
              color: #111827;
            }
            .header-divider {
              border-top: 1px solid #E5E7EB;
              margin: 15px 0 20px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            thead {
              background: #6B7280;
              color: white;
            }
            th {
              padding: 8px 6px;
              text-align: center;
              font-weight: 600;
              font-size: 8pt;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            td {
              padding: 7px 6px;
              border-bottom: 1px solid #E5E7EB;
              font-size: 8pt;
              text-align: center;
              color: #374151;
            }
            tbody tr:nth-child(even) {
              background: #F9FAFB;
            }
            tbody tr:last-child td {
              border-bottom: 2px solid #E5E7EB;
            }
            tbody tr.date-separator td {
              border: none;
              background: #E5E7EB;
              padding: 6px;
              text-align: center;
              font-weight: bold;
              font-size: 8pt;
              color: #6B7280;
            }
            .font-mono {
              font-family: 'Courier New', monospace;
              font-size: 8.5pt;
              font-weight: 600;
            }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .po-ro-tag {
              font-size: 8pt;
              font-weight: 500;
              color: #111827;
            }
            .amount-cell {
              font-weight: 600;
              color: #111827;
              font-size: 9pt;
            }
            .totals-inline {
              text-align: right;
              margin-top: 20px;
              padding: 15px 30px;
            }
            .total-line {
              padding: 4px 0;
              font-size: 9pt;
              color: #374151;
            }
            .total-line.border-top {
              border-top: 2px solid #E5E7EB;
              margin-top: 8px;
              padding-top: 10px;
            }
            .total-line.main-total {
              font-size: 12pt;
              font-weight: 700;
              color: #111827;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .no-print { display: none; }
              @page {
                margin: 0.5in 0.5in 0.75in 0.5in;
                size: letter;
              }
              table {
                page-break-inside: auto;
              }
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              thead {
                display: table-header-group;
              }
              tfoot {
                display: table-footer-group;
              }
            }
          </style>
        </head>
        <body>
          <!-- Header -->
          <div class="print-header">
            <div class="sender-name">${senderName}</div>
            <div class="doc-title">Invoice</div>
            ${servicePeriod ? `
            <div class="period-info">Period: ${servicePeriod}</div>
            ` : ''}
            <div class="generated-time">Generated: ${format(new Date(), 'MMM dd, yyyy \'at\' h:mm a')}</div>
          </div>

          <div class="divider"></div>

          <!-- Invoice Info -->
          <div class="invoice-info">
            <div class="bill-to">
              <h3>Bill To</h3>
              <div class="company">${dealerName}</div>
              ${dealerAddress ? `<p>${dealerAddress}</p>` : ''}
              ${dealerEmail ? `<p>${dealerEmail}</p>` : ''}
              ${dealerPhone ? `<p>${dealerPhone}</p>` : ''}
              ${departments ? `
              <div class="department-section">
                <div class="department-label">Department:</div>
                <div class="department-value">${departments}</div>
              </div>
              ` : ''}
            </div>
            <div class="invoice-details">
              <div class="detail-row">
                <span class="label">Invoice Date</span>
                <div class="value">${formatDate(invoice.issueDate)}</div>
              </div>
              <div class="detail-row">
                <span class="label">Due Date</span>
                <div class="value">${formatDate(invoice.dueDate)}</div>
              </div>
              <div class="detail-row">
                <span class="label">Invoice Number</span>
                <div class="value font-mono">${invoice.invoiceNumber}</div>
              </div>
              <div class="detail-row" style="margin-top: 12px;">
                <span class="label">Total Amount</span>
                <div class="value" style="font-size: 14pt; font-weight: 700; color: #6B7280;">${formatCurrency(invoice.totalAmount)}</div>
              </div>
            </div>
          </div>

          <!-- Header Divider -->
          <div class="header-divider"></div>

          <!-- Vehicles Table -->
          <table>
            <thead>
              <tr>
                <th style="width: 4%;">#</th>
                <th style="width: 7%;">Date</th>
                <th style="width: 9%;">Order</th>
                <th style="width: 17%;">PO | RO | Tag</th>
                <th style="width: 15%;">Vehicle</th>
                <th style="width: 13%;">VIN</th>
                <th style="width: 23%;" class="text-left">Services</th>
                <th style="width: 12%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(() => {
                let lastDate = '';
                let rows = '';
                let rowNumber = 0;

                sortedItems.forEach((item, index) => {
                  const po = item.metadata?.po || '';
                  const ro = item.metadata?.ro || '';
                  const tag = item.metadata?.tag || '';
                  const orderType = item.metadata?.order_type || '';

                  let poRoTag = '';
                  if (orderType === 'service') {
                    poRoTag = [po, ro, tag].filter(Boolean).join(' | ') || 'N/A';
                  } else if (orderType === 'carwash') {
                    poRoTag = item.metadata?.stock_number || tag || 'N/A';
                  } else {
                    poRoTag = item.metadata?.stock_number || 'N/A';
                  }

                  const itemDate = item.metadata?.completed_at
                    ? format(parseISO(item.metadata.completed_at), 'MM/dd')
                    : format(parseISO(invoice.issueDate), 'MM/dd');

                  // Add separator row if date changes
                  if (itemDate !== lastDate && index > 0) {
                    rows += `
                      <tr class="date-separator">
                        <td colspan="8">${itemDate}</td>
                      </tr>
                    `;
                  }
                  lastDate = itemDate;

                  rowNumber++;

                  rows += `
                    <tr>
                      <td style="font-weight: 600; color: #6B7280;">${rowNumber}</td>
                      <td>${itemDate}</td>
                      <td style="font-weight: 600; white-space: nowrap;">${item.metadata?.order_number || 'N/A'}</td>
                      <td class="po-ro-tag" style="white-space: nowrap;">${poRoTag}</td>
                      <td>${cleanVehicleDescription(item.description)}</td>
                      <td class="font-mono" style="white-space: nowrap;">${item.metadata?.vehicle_vin || 'N/A'}</td>
                      <td class="text-left">${(() => {
                        // Extract service names with fallback logic
                        if (item.metadata?.service_names) {
                          return item.metadata.service_names;
                        }
                        if (item.metadata?.services && Array.isArray(item.metadata.services)) {
                          return item.metadata.services.map((s: any) => {
                            if (s && typeof s === 'object' && s.name) return s.name;
                            if (s && typeof s === 'object' && s.service_name) return s.service_name;
                            if (s && typeof s === 'object' && s.type) return s.type;
                            if (s && typeof s === 'object' && s.id) return s.id;
                            if (typeof s === 'string') return s;
                            return 'Service';
                          }).filter(Boolean).join(', ');
                        }
                        return item.serviceReference || 'N/A';
                      })()}</td>
                      <td class="amount-cell">${formatCurrency(item.totalAmount)}</td>
                    </tr>
                  `;
                });

                return rows;
              })()}
            </tbody>
          </table>

          <!-- Totals Inline -->
          <div class="totals-inline">
            <div class="total-line">
              Subtotal: <strong>${formatCurrency(invoice.subtotal)}</strong>
            </div>
            ${invoice.taxRate > 0 ? `
            <div class="total-line">
              Tax (${invoice.taxRate}%): <strong>${formatCurrency(invoice.taxAmount)}</strong>
            </div>
            ` : ''}
            ${invoice.discountAmount > 0 ? `
            <div class="total-line">
              Discount: <strong>-${formatCurrency(invoice.discountAmount)}</strong>
            </div>
            ` : ''}
            <div class="total-line border-top main-total">
              Total Amount: <strong>${formatCurrency(invoice.totalAmount)}</strong>
            </div>
            ${invoice.amountPaid > 0 ? `
            <div class="total-line" style="margin-top: 10px;">
              Amount Paid: <strong>${formatCurrency(invoice.amountPaid)}</strong>
            </div>
            <div class="total-line border-top main-total">
              Amount Due: <strong>${formatCurrency(invoice.amountDue)}</strong>
            </div>
            ` : ''}
          </div>

          <script>
            // Auto-print when loaded
            window.onload = function() {
              window.print();
            };
            // Close window after printing or canceling
            window.onafterprint = function() {
              window.close();
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();

      toast({ description: 'Opening print dialog...' });
    } catch (error) {
      console.error('Error generating print view:', error);
      toast({ variant: 'destructive', description: 'Failed to generate print view' });
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;

    try {
      await generateInvoicePDF(invoice);
      toast({ description: 'PDF downloaded successfully' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ variant: 'destructive', description: 'Failed to generate PDF' });
    }
  };

  const handleDownloadExcel = async () => {
    if (!invoice) return;

    try {
      await generateInvoiceExcel(invoice);
      toast({ description: 'Excel file downloaded successfully' });
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast({ variant: 'destructive', description: 'Failed to generate Excel file' });
    }
  };

  const handleEmail = () => {
    setShowEmailDialog(true);
  };

  const handleRecalculate = async () => {
    if (!invoice) return;
    await recalculateMutation.mutateAsync(invoice.id);
    setShowRecalculateConfirm(false);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Loading Invoice</DialogTitle>
            <DialogDescription>
              Please wait while we load the invoice details...
            </DialogDescription>
          </DialogHeader>
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
          <DialogHeader>
            <DialogTitle>Invoice Not Found</DialogTitle>
            <DialogDescription>
              The requested invoice could not be found or has been deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Invoice not found</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto" hideCloseButton>
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            {/* Invoice Title - Left */}
            <div>
              <DialogTitle asChild>
                <div className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <span className="font-bold">Invoice {invoice.invoiceNumber}</span>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(invoice.status)}
                      <span className="text-sm text-muted-foreground font-normal">
                        • {invoice.items?.length || 0} vehicle{invoice.items?.length !== 1 ? 's' : ''}
                      </span>
                      {invoice.metadata?.vehicle_count && invoice.metadata.vehicle_count !== invoice.items?.length && (
                        <span className="text-xs text-amber-600 font-normal">
                          (Expected: {invoice.metadata.vehicle_count})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </DialogTitle>
            </div>

            {/* Action Buttons - Right side */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={invoice.status === 'paid'}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('reports.invoices.delete')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRecalculateConfirm(true)}
                disabled={recalculateMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-white border-amber-600"
              >
                {recalculateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Recalculate
              </Button>
              <Button
                size="sm"
                onClick={handleEmail}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Mail className="h-4 w-4 mr-2" />
                {t('reports.invoices.send_email')}
              </Button>
              <Button
                size="sm"
                onClick={handlePrint}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                <Printer className="h-4 w-4 mr-2" />
                {t('common.action_buttons.print')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
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
                onClick={() => onOpenChange(false)}
                className="bg-slate-500 hover:bg-slate-600 text-white"
              >
                <X className="h-4 w-4 mr-2" />
                {t('common.action_buttons.close')}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-8 pb-6 border-b">
            <div>
              <h3 className="font-bold text-sm mb-3 text-gray-500 uppercase tracking-wide">Bill To:</h3>
              <div className="text-sm space-y-2">
                <p className="font-bold text-xl text-gray-900">{invoice.dealership?.name || 'N/A'}</p>
                {invoice.dealership?.address && (
                  <p className="text-gray-600 flex items-start gap-2">
                    <span className="text-gray-400">📍</span>
                    {invoice.dealership.address}
                  </p>
                )}
                {invoice.dealership?.email && (
                  <p className="text-gray-600 flex items-center gap-2">
                    <span className="text-gray-400">✉️</span>
                    {invoice.dealership.email}
                  </p>
                )}
                {invoice.dealership?.phone && (
                  <p className="text-gray-600 flex items-center gap-2">
                    <span className="text-gray-400">📞</span>
                    {invoice.dealership.phone}
                  </p>
                )}
                {invoice.metadata?.departments && invoice.metadata.departments.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Department:</p>
                    <p className="font-semibold text-base text-gray-600 capitalize">
                      {invoice.metadata.departments.length === 1
                        ? invoice.metadata.departments[0]
                        : invoice.metadata.departments.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-0.5 text-xs">Invoice Date:</span>
                  <p className="font-semibold text-sm">{formatDate(invoice.issueDate)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5 text-xs">Due Date:</span>
                  <p className="font-semibold text-sm">{formatDate(invoice.dueDate)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5 text-xs">Invoice Number:</span>
                  <p className="font-mono font-semibold text-sm">{invoice.invoiceNumber}</p>
                </div>
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground block mb-0.5 text-xs font-medium uppercase tracking-wide">Total Amount</span>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(invoice.totalAmount)}</p>
                </div>
                {invoice.amountPaid > 0 && (
                  <div className="pt-2">
                    <span className="text-muted-foreground block mb-0.5 text-xs font-medium uppercase tracking-wide">Amount Due</span>
                    <p className="text-xl font-bold text-amber-600">{formatCurrency(invoice.amountDue)}</p>
                  </div>
                )}
                {invoice.metadata?.filter_date_range && (
                  <div className="pt-2 border-t">
                    <span className="text-primary block mb-0.5 text-xs font-medium">Service Period:</span>
                    <p className="font-semibold text-sm text-primary">
                      {formatDate(invoice.metadata.filter_date_range.start)} - {formatDate(invoice.metadata.filter_date_range.end)}
                    </p>
                  </div>
                )}
                {invoice.order?.orderType && (
                  <div className="pt-1">
                    <span className="text-muted-foreground block mb-0.5 text-xs">Department:</span>
                    <p className="font-semibold text-sm capitalize">{invoice.order.orderType}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Vehicle List */}
          <div className="bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-gray-900">
                Vehicles
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({invoice.items?.length || 0} total)
                </span>
              </h3>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-500 hover:bg-gray-500">
                    <TableHead className="font-bold text-center text-white w-[50px]">
                      <Checkbox
                        checked={invoice.items?.every(item => item.isPaid) && invoice.items.length > 0}
                        onCheckedChange={handleToggleAllItemsPaid}
                        className="border-white data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                    </TableHead>
                    <TableHead className="font-bold text-center text-white">Date</TableHead>
                    <TableHead className="font-bold text-center text-white">Order</TableHead>
                    <TableHead className="font-bold text-center text-white">PO | RO | Tag</TableHead>
                    <TableHead className="font-bold text-center text-white">Vehicle</TableHead>
                    <TableHead className="font-bold text-center text-white">VIN</TableHead>
                    <TableHead className="font-bold text-center text-white">Services</TableHead>
                    <TableHead className="font-bold text-center text-white">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items && invoice.items.length > 0 ? (
                    (() => {
                      // Sort items by date (ascending) - using correct date based on order type
                      const sortedItems = [...invoice.items].sort((a, b) => {
                        const dateA = getCorrectItemDate(a);
                        const dateB = getCorrectItemDate(b);
                        return new Date(dateA).getTime() - new Date(dateB).getTime();
                      });

                      let lastDate = '';
                      const rows: JSX.Element[] = [];

                      sortedItems.forEach((item, index) => {
                        const po = item.metadata?.po || '';
                        const ro = item.metadata?.ro || '';
                        const tag = item.metadata?.tag || '';
                        const orderType = item.metadata?.order_type || '';

                        let poRoTag = '';
                        if (orderType === 'service') {
                          poRoTag = [po, ro, tag].filter(Boolean).join(' | ') || 'N/A';
                        } else if (orderType === 'carwash') {
                          poRoTag = item.metadata?.stock_number || tag || 'N/A';
                        } else {
                          poRoTag = item.metadata?.stock_number || 'N/A';
                        }

                        const itemDate = format(parseISO(getCorrectItemDate(item)), 'MM/dd');

                        // Add separator row if date changes
                        if (itemDate !== lastDate && index > 0) {
                          rows.push(
                            <TableRow key={`separator-${index}`} className="bg-gray-200 hover:bg-gray-200">
                              <TableCell colSpan={8} className="text-center font-bold text-gray-600 py-2">
                                {itemDate}
                              </TableCell>
                            </TableRow>
                          );
                        }
                        lastDate = itemDate;

                        rows.push(
                          <TableRow
                            key={item.id}
                            className={`${item.isPaid ? 'bg-emerald-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50/50 transition-colors`}
                          >
                          <TableCell className="text-center">
                            <Checkbox
                              checked={item.isPaid}
                              onCheckedChange={() => handleToggleItemPaid(item.id, item.isPaid)}
                              className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                            />
                          </TableCell>
                          <TableCell className="text-sm text-center font-medium text-gray-700">
                            {format(parseISO(getCorrectItemDate(item)), 'MM/dd')}
                          </TableCell>
                          <TableCell className="text-sm text-center font-semibold text-gray-900 whitespace-nowrap">
                            {item.metadata?.order_number || 'N/A'}
                          </TableCell>
                          <TableCell className="text-sm text-center font-medium text-gray-900 whitespace-nowrap">
                            {poRoTag}
                          </TableCell>
                          <TableCell className="text-sm text-center font-medium text-gray-800">
                            {cleanVehicleDescription(item.description)}
                          </TableCell>
                          <TableCell className="font-mono text-sm font-semibold text-center text-gray-700 whitespace-nowrap">
                            {item.metadata?.vehicle_vin || 'N/A'}
                          </TableCell>
                          <TableCell className="text-sm text-left text-gray-600">
                            {(() => {
                              // Extract service names with fallback logic
                              if (item.metadata?.service_names) {
                                return item.metadata.service_names;
                              }
                              if (item.metadata?.services && Array.isArray(item.metadata.services)) {
                                const names = item.metadata.services.map((s: any) => {
                                  if (s && typeof s === 'object' && s.name) return s.name;
                                  if (s && typeof s === 'object' && s.service_name) return s.service_name;
                                  if (s && typeof s === 'object' && s.type) return s.type;
                                  if (s && typeof s === 'object' && s.id) return s.id;
                                  if (typeof s === 'string') return s;
                                  return 'Service';
                                }).filter(Boolean).join(', ');
                                if (names) return names;
                              }
                              return item.serviceReference || 'N/A';
                            })()}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-base text-gray-900">
                            {formatCurrency(item.totalAmount)}
                          </TableCell>
                          </TableRow>
                        );
                      });

                      return rows;
                    })()
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No items found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mt-6">
            <div className="w-96 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 shadow-sm">
              <div className="space-y-3">
                <div className="flex justify-between text-sm pb-2">
                  <span className="text-gray-600 font-medium">Subtotal:</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.taxRate > 0 && (
                  <div className="flex justify-between text-sm pb-2">
                    <span className="text-gray-600 font-medium">Tax ({invoice.taxRate}%):</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                )}
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-sm pb-2">
                    <span className="text-amber-700 font-medium">Discount:</span>
                    <span className="font-semibold text-amber-700">-{formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t-2 border-gray-300">
                  <span className="font-bold text-gray-900 text-base">Total Amount:</span>
                  <span className="font-bold text-2xl text-blue-600">{formatCurrency(invoice.totalAmount)}</span>
                </div>
                {invoice.amountPaid > 0 && (
                  <>
                    <div className="flex justify-between text-sm pt-2 bg-emerald-50 -mx-3 px-3 py-2 rounded">
                      <span className="text-emerald-700 font-medium">Amount Paid:</span>
                      <span className="font-bold text-emerald-700">{formatCurrency(invoice.amountPaid)}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t-2 border-orange-200 bg-orange-50 -mx-3 px-3 py-3 rounded-b-lg">
                      <span className="font-bold text-orange-900">Amount Due:</span>
                      <span className="font-bold text-2xl text-orange-600">
                        {formatCurrency(invoice.amountDue)}
                      </span>
                    </div>
                  </>
                )}
              </div>
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

          {/* Email History */}
          <div className="pt-6 border-t">
            <InvoiceEmailLog invoiceId={invoiceId} />
          </div>

          {/* Comments & Notes */}
          <div className="pt-6 border-t">
            <InvoiceComments invoiceId={invoiceId} dealershipId={invoice.dealerId} />
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('reports.invoices.delete_confirm_title', { number: invoice.invoiceNumber })}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
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
                </div>
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

        {/* Recalculate Confirmation Dialog */}
        <AlertDialog open={showRecalculateConfirm} onOpenChange={setShowRecalculateConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Recalculate Invoice?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <p>
                    This will update all invoice items with the latest data from the orders, including:
                  </p>
                  <ul className="list-disc list-inside ml-2 space-y-1 text-sm">
                    <li>Service names from current dealer services</li>
                    <li>Order totals and prices</li>
                    <li>Customer and vehicle information</li>
                    <li>Invoice totals and tax calculations</li>
                  </ul>
                  <p className="text-amber-600 font-semibold mt-3">
                    Note: If any orders have been modified since invoice creation, the invoice will reflect those changes.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRecalculate}
                className="bg-amber-600 hover:bg-amber-700"
                disabled={recalculateMutation.isPending}
              >
                {recalculateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Recalculating...
                  </>
                ) : (
                  'Recalculate Invoice'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>

    {/* Send Email Dialog */}
    {invoice && (
      <SendInvoiceEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        invoice={invoice}
      />
    )}
    </>
  );
};
