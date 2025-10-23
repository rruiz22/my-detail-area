// =====================================================
// INVOICES REPORT - Notion-style Minimalist Design
// Created: 2024-10-16
// Description: Invoice management and billing section
// =====================================================

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useInvoices, useInvoiceSummary } from '@/hooks/useInvoices';
import type { ReportsFilters } from '@/hooks/useReportsData';
import type { Invoice, InvoiceFilters, InvoiceStatus } from '@/types/invoices';
import { format } from 'date-fns';
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    DollarSign,
    Download,
    FileText,
    Mail,
    Plus,
    Search
} from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreateInvoiceDialog } from '../invoices/CreateInvoiceDialog';
import { InvoiceDetailsDialog } from '../invoices/InvoiceDetailsDialog';
import { RecordPaymentDialog } from '../invoices/RecordPaymentDialog';

interface InvoicesReportProps {
  filters: ReportsFilters;
}

// Status styling - Notion-approved muted colors only
const getStatusBadge = (status: InvoiceStatus) => {
  const styles = {
    draft: { variant: 'secondary' as const, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Draft' },
    pending: { variant: 'outline' as const, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Pending' },
    paid: { variant: 'default' as const, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Paid' },
    partially_paid: { variant: 'secondary' as const, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Partial' },
    overdue: { variant: 'destructive' as const, color: 'text-red-600', bg: 'bg-red-50', label: 'Overdue' },
    cancelled: { variant: 'outline' as const, color: 'text-gray-500', bg: 'bg-gray-50', label: 'Cancelled' }
  };

  const style = styles[status] || styles.draft;
  return (
    <Badge
      variant={style.variant}
      className={`${style.bg} ${style.color} border-none font-normal`}
    >
      {style.label}
    </Badge>
  );
};

export const InvoicesReport: React.FC<InvoicesReportProps> = ({ filters }) => {
  const { t } = useTranslation();

  // ALWAYS call hooks in the same order - no early returns before hooks!
  const [invoiceFilters, setInvoiceFilters] = useState<InvoiceFilters>({
    status: 'all',
    orderType: filters.orderType,
    startDate: filters.startDate,
    endDate: filters.endDate,
    dealerId: filters.dealerId || 0, // Use 0 as fallback to avoid null
    searchTerm: ''
  });

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Only fetch if dealerId is valid
  const { data: invoices = [], isLoading } = useInvoices(invoiceFilters);
  const { data: summary } = useInvoiceSummary(invoiceFilters);

  // NOW we can check and return early (after all hooks)
  if (!filters.dealerId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">Please select a dealership to view invoices</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  // Summary cards - Notion-style minimal
  const summaryCards = [
    {
      title: 'Total Billed',
      value: formatCurrency(summary?.totalAmount || 0),
      icon: DollarSign,
      trend: `${summary?.totalInvoices || 0} invoices`,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'Collected',
      value: formatCurrency(summary?.totalPaid || 0),
      icon: CheckCircle2,
      trend: `${summary?.paidCount || 0} paid`,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Outstanding',
      value: formatCurrency(summary?.totalDue || 0),
      icon: Clock,
      trend: `${summary?.pendingCount || 0} pending`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Overdue',
      value: `${summary?.overdueCount || 0}`,
      icon: AlertCircle,
      trend: 'Requires attention',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards - Minimal Notion Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-semibold tracking-tight">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.trend}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${card.bgColor}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Invoices Table - Notion Style */}
      <Card className="border-none shadow-sm">
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">Invoices & Billing</CardTitle>
              <CardDescription>Manage invoices and track payments</CardDescription>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </div>

          {/* Filters - Clean minimal design */}
          <div className="flex gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={invoiceFilters.searchTerm}
                onChange={(e) => setInvoiceFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="pl-10 border-gray-200 focus:border-blue-500"
              />
            </div>
            <Select
              value={invoiceFilters.status || 'all'}
              onValueChange={(value) => setInvoiceFilters(prev => ({
                ...prev,
                status: value as InvoiceFilters['status']
              }))}
            >
              <SelectTrigger className="w-[150px] border-gray-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="partially_paid">Partial</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={invoiceFilters.orderType || 'all'}
              onValueChange={(value) => setInvoiceFilters(prev => ({
                ...prev,
                orderType: value as InvoiceFilters['orderType']
              }))}
            >
              <SelectTrigger className="w-[150px] border-gray-200">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="recon">Recon</SelectItem>
                <SelectItem value="car_wash">Car Wash</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No invoices found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                Create your first invoice
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b hover:bg-transparent">
                  <TableHead className="font-semibold">Invoice</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Order</TableHead>
                  <TableHead className="font-semibold">Issue Date</TableHead>
                  <TableHead className="font-semibold">Due Date</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="font-semibold text-right">Paid</TableHead>
                  <TableHead className="font-semibold text-right">Due</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setShowDetailsDialog(true);
                    }}
                  >
                    <TableCell className="font-mono text-sm font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{invoice.order?.customerName || 'N/A'}</span>
                        {invoice.order?.customerEmail && (
                          <span className="text-xs text-muted-foreground">{invoice.order.customerEmail}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-sm">{invoice.order?.orderNumber || 'N/A'}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {invoice.order?.orderType}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(invoice.issueDate)}</TableCell>
                    <TableCell className="text-sm">{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600">
                      {formatCurrency(invoice.amountPaid)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.amountDue)}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoice(invoice);
                            setShowPaymentDialog(true);
                          }}
                          disabled={invoice.status === 'paid' || invoice.status === 'cancelled'}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Send email
                          }}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Download PDF
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {showCreateDialog && (
        <CreateInvoiceDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          dealerId={filters.dealerId as number}
        />
      )}

      {selectedInvoice && showDetailsDialog && (
        <InvoiceDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          invoiceId={selectedInvoice.id}
        />
      )}

      {selectedInvoice && showPaymentDialog && (
        <RecordPaymentDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          invoice={selectedInvoice}
        />
      )}
    </div>
  );
};
