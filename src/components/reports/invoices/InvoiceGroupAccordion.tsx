import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { InvoiceCommentsTooltip } from '@/components/ui/invoice-comments-tooltip';
import { NotesTooltip } from '@/components/ui/notes-tooltip';
import { EmailSentIndicator } from '@/components/reports/invoices/EmailSentIndicator';
import { ReinvoiceSentIndicator } from '@/components/reports/invoices/ReinvoiceSentIndicator';
import { InvoiceTagsDisplay } from '@/components/reports/invoices/InvoiceTagsDisplay';
import type { InvoiceGroup } from '@/utils/invoiceGrouping';
import type { Invoice, InvoiceStatus } from '@/types/invoices';
import { format, parseISO } from 'date-fns';
import {
  DollarSign,
  Eye,
  Trash2,
  MessageSquare,
  StickyNote,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
} from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface InvoiceGroupAccordionProps {
  groups: InvoiceGroup[];
  defaultValue: string[];
  onValueChange: (value: string[]) => void;
  onSelectInvoice: (invoice: Invoice) => void;
  onShowDetails: (invoice: Invoice, scrollToEmail?: boolean) => void;
  onShowPayment: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
  selectedInvoiceIds?: Set<string>;
  onToggleInvoice?: (invoiceId: string) => void;
  onSelectAllInGroup?: (group: InvoiceGroup, checked: boolean) => void;
}

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

const getGroupIcon = (groupKey: string) => {
  // Status icons
  if (groupKey === 'overdue') return <AlertCircle className="h-4 w-4 text-red-500" />;
  if (groupKey === 'pending') return <Clock className="h-4 w-4 text-amber-500" />;
  if (groupKey === 'paid') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (groupKey === 'partially_paid') return <TrendingUp className="h-4 w-4 text-amber-500" />;
  if (groupKey === 'draft') return <Clock className="h-4 w-4 text-gray-500" />;
  if (groupKey === 'cancelled') return <AlertCircle className="h-4 w-4 text-gray-500" />;

  // Department icons
  if (groupKey === 'sales' || groupKey === 'service' || groupKey === 'recon' || groupKey === 'car_wash' || groupKey === 'carwash') {
    return <Building2 className="h-4 w-4 text-blue-500" />;
  }

  // Week icon
  return <Calendar className="h-4 w-4 text-indigo-500" />;
};

export function InvoiceGroupAccordion({
  groups,
  defaultValue,
  onValueChange,
  onSelectInvoice,
  onShowDetails,
  onShowPayment,
  onDeleteInvoice,
  selectedInvoiceIds,
  onToggleInvoice,
  onSelectAllInGroup,
}: InvoiceGroupAccordionProps) {
  const { t } = useTranslation();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(parseISO(dateString), 'MMM dd, yy');
  };

  return (
    <Accordion
      type="multiple"
      value={defaultValue}
      onValueChange={onValueChange}
      className="space-y-2"
    >
      {groups.map((group) => (
        <AccordionItem
          key={group.key}
          value={group.key}
          className="border rounded-lg bg-white shadow-sm"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50/50">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-3">
                {getGroupIcon(group.key)}
                <span className="font-semibold text-base">{group.label}</span>
                <Badge variant="secondary" className="ml-2">
                  {group.summary.count} {group.summary.count === 1 ? 'invoice' : 'invoices'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-right">
                  <div className="text-muted-foreground text-xs">{t('reports.invoices.total')}</div>
                  <div className="font-semibold">{formatCurrency(group.summary.totalAmount)}</div>
                </div>
                {group.summary.amountDue > 0 && (
                  <div className="text-right">
                    <div className="text-muted-foreground text-xs">{t('reports.invoices.due')}</div>
                    <div className="font-semibold text-amber-600">
                      {formatCurrency(group.summary.amountDue)}
                    </div>
                  </div>
                )}
                {group.summary.amountPaid > 0 && (
                  <div className="text-right">
                    <div className="text-muted-foreground text-xs">{t('reports.invoices.paid')}</div>
                    <div className="font-semibold text-emerald-600">
                      {formatCurrency(group.summary.amountPaid)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  {selectedInvoiceIds !== undefined && onToggleInvoice && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          group.invoices.length > 0 &&
                          group.invoices.every(inv => selectedInvoiceIds.has(inv.id))
                        }
                        onCheckedChange={(checked) => {
                          if (onSelectAllInGroup) {
                            onSelectAllInGroup(group, !!checked);
                          }
                        }}
                        aria-label="Select all invoices in group"
                      />
                    </TableHead>
                  )}
                  <TableHead className="text-center font-bold">
                    {t('reports.invoices.table.invoice')}
                  </TableHead>
                  <TableHead className="text-center font-bold">
                    {t('reports.invoices.table.date_range')}
                  </TableHead>
                  <TableHead className="text-center font-bold">
                    {t('reports.invoices.tags.label')}
                  </TableHead>
                  <TableHead className="text-center font-bold">
                    {t('reports.invoices.issue_date')}
                  </TableHead>
                  <TableHead className="text-center font-bold">
                    {t('reports.invoices.due_date')}
                  </TableHead>
                  <TableHead className="text-center font-bold">
                    {t('reports.invoices.amount')}
                  </TableHead>
                  <TableHead className="text-center font-bold">
                    {t('reports.invoices.paid')}
                  </TableHead>
                  <TableHead className="text-center font-bold">
                    {t('reports.invoices.due')}
                  </TableHead>
                  <TableHead className="text-center font-bold">
                    {t('common.status_label')}
                  </TableHead>
                  <TableHead className="text-right font-bold">
                    {t('reports.invoices.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.invoices.map((invoice) => {
                  // Get date range from invoice metadata
                  let dateRangeText = 'N/A';
                  let vehicleCount = 1;

                  const formatShort = (date: Date) => format(date, 'MMM dd');

                  if (invoice.metadata?.filter_date_range) {
                    const { start, end } = invoice.metadata.filter_date_range;
                    if (start && end) {
                      const startDate = parseISO(start);
                      const endDate = parseISO(end);
                      if (startDate.getTime() === endDate.getTime()) {
                        dateRangeText = formatShort(startDate);
                      } else {
                        dateRangeText = `${formatShort(startDate)} - ${formatShort(endDate)}`;
                      }
                    }
                  } else if (invoice.issueDate) {
                    dateRangeText = formatShort(parseISO(invoice.issueDate));
                  }

                  if (invoice.metadata?.vehicle_count) {
                    vehicleCount = invoice.metadata.vehicle_count;
                  }

                  // Determine row background color based on payment status
                  const getRowBackgroundClass = (status: InvoiceStatus) => {
                    switch(status) {
                      case 'paid':
                        return 'bg-green-50 hover:bg-green-100';
                      case 'partially_paid':
                        return 'bg-yellow-50 hover:bg-yellow-100';
                      case 'overdue':
                        return 'bg-red-50 hover:bg-red-100';
                      case 'cancelled':
                        return 'bg-gray-50 hover:bg-gray-100';
                      case 'pending':
                        return 'bg-blue-50 hover:bg-blue-100';
                      case 'draft':
                      default:
                        return 'hover:bg-gray-50';
                    }
                  };

                  return (
                    <TableRow
                      key={invoice.id}
                      className={`cursor-pointer ${getRowBackgroundClass(invoice.status)}`}
                      onClick={() => {
                        onSelectInvoice(invoice);
                        onShowDetails(invoice);
                      }}
                    >
                      {selectedInvoiceIds !== undefined && onToggleInvoice && (
                        <TableCell
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedInvoiceIds.has(invoice.id)}
                            onCheckedChange={() => onToggleInvoice(invoice.id)}
                            aria-label={`Select invoice ${invoice.invoiceNumber}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium whitespace-nowrap">
                              {invoice.invoiceNumber}
                            </span>

                            {/* Notes Tooltip */}
                            {invoice.invoiceNotes && invoice.invoiceNotes.trim() !== '' && (
                              <NotesTooltip
                                noteContent={invoice.invoiceNotes}
                                onViewClick={() => {
                                  onSelectInvoice(invoice);
                                  onShowDetails(invoice);
                                }}
                              >
                                <span className="inline-flex items-center gap-0.5 cursor-pointer hover:bg-amber-50 px-1.5 py-0.5 rounded transition-colors">
                                  <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                                </span>
                              </NotesTooltip>
                            )}

                          </div>

                          {/* Department badges */}
                          {invoice.metadata?.departments && invoice.metadata.departments.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap justify-center">
                              {invoice.metadata.departments.map((dept: string) => {
                                const normalizedDept = dept.toLowerCase().trim();
                                let translatedDept = '';
                                let colorClasses = '';

                                switch (normalizedDept) {
                                  case 'sales':
                                    translatedDept = t('services.departments.sales_dept');
                                    colorClasses = 'bg-blue-100 text-blue-700 border-blue-200';
                                    break;
                                  case 'service':
                                    translatedDept = t('services.departments.service_dept');
                                    colorClasses = 'bg-green-100 text-green-700 border-green-200';
                                    break;
                                  case 'recon':
                                    translatedDept = t('services.departments.recon_dept');
                                    colorClasses = 'bg-orange-100 text-orange-700 border-orange-200';
                                    break;
                                  case 'car_wash':
                                  case 'carwash':
                                  case 'car wash':
                                    translatedDept = t('services.departments.carwash_dept');
                                    colorClasses = 'bg-cyan-100 text-cyan-700 border-cyan-200';
                                    break;
                                  default:
                                    translatedDept = dept.charAt(0).toUpperCase() + dept.slice(1);
                                    colorClasses = 'bg-gray-100 text-gray-700 border-gray-200';
                                }

                                return (
                                  <Badge
                                    key={dept}
                                    variant="outline"
                                    className={`text-[10px] whitespace-nowrap ${colorClasses}`}
                                  >
                                    {translatedDept}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-medium whitespace-nowrap">{dateRangeText}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {vehicleCount} vehicle{vehicleCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {invoice.tags && invoice.tags.length > 0 ? (
                          <InvoiceTagsDisplay
                            tags={invoice.tags}
                            maxVisible={2}
                            size="xs"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-center whitespace-nowrap">
                        {formatDate(invoice.issueDate)}
                      </TableCell>
                      <TableCell className="text-sm text-center whitespace-nowrap">
                        {formatDate(invoice.dueDate)}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {formatCurrency(invoice.totalAmount)}
                      </TableCell>
                      <TableCell className="text-center text-emerald-600">
                        {formatCurrency(invoice.amountPaid)}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {formatCurrency(invoice.amountDue)}
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-0 justify-end">
                          <ReinvoiceSentIndicator
                            invoice={invoice}
                            onOpenReinvoiceHistory={() => {
                              onSelectInvoice(invoice);
                              onShowDetails(invoice, false);
                            }}
                          />
                          {invoice.commentsCount > 0 && (
                            <InvoiceCommentsTooltip
                              invoiceId={invoice.id}
                              count={invoice.commentsCount}
                              onViewAllClick={() => {
                                onSelectInvoice(invoice);
                                onShowDetails(invoice);
                              }}
                            >
                              <span className="inline-flex items-center justify-center gap-0.5 cursor-pointer hover:bg-blue-50 px-1.5 py-1 rounded transition-colors h-9">
                                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-[10px] font-semibold text-blue-600 min-w-[14px] text-center">
                                  {invoice.commentsCount}
                                </span>
                              </span>
                            </InvoiceCommentsTooltip>
                          )}
                          <EmailSentIndicator
                            invoice={invoice}
                            onOpenEmailHistory={() => {
                              onSelectInvoice(invoice);
                              onShowDetails(invoice, true);
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectInvoice(invoice);
                              onShowPayment(invoice);
                            }}
                            disabled={invoice.status === 'paid' || invoice.status === 'cancelled'}
                            title={t('reports.add_payment')}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteInvoice(invoice);
                            }}
                            disabled={invoice.status === 'paid'}
                            title={t('reports.delete_invoice')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
