// =====================================================
// BULK EMAIL INVOICES DIALOG
// Created: 2025-12-17
// Updated: 2025-12-26 - Improved responsive layout and scroll
// Description: Send multiple invoices in a single email
// =====================================================

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useDealershipContext } from '@/contexts/DealershipContext';
import { useToast } from '@/hooks/use-toast';
import { useBulkSendInvoiceEmails } from '@/hooks/useBulkSendInvoiceEmails';
import { useEmailContacts } from '@/hooks/useEmailContacts';
import type { Invoice } from '@/types/invoices';
import { formatInvoiceNumberWithDepartment } from '@/utils/invoiceFormatting';
import {
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileText,
  Loader2,
  Mail,
  Plus,
  Send,
  Settings,
  Users,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ManageEmailContactsDialog } from './ManageEmailContactsDialog';

interface BulkEmailInvoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: Invoice[];
  dealershipId: number;
  onEmailSent?: () => void; // Callback to clear selected invoices
}

export const BulkEmailInvoicesDialog: React.FC<BulkEmailInvoicesDialogProps> = ({
  open,
  onOpenChange,
  invoices,
  dealershipId,
  onEmailSent,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentDealership } = useDealershipContext();

  const [showManageContacts, setShowManageContacts] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [customEmail, setCustomEmail] = useState('');
  const [customEmails, setCustomEmails] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [includePDF, setIncludePDF] = useState(true);
  const [includeExcel, setIncludeExcel] = useState(false);
  const [contactsExpanded, setContactsExpanded] = useState(true);

  const { data: contacts = [] } = useEmailContacts(dealershipId);
  const sendEmailMutation = useBulkSendInvoiceEmails();

  // Calculate totals
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const totalDue = invoices.reduce((sum, inv) => sum + inv.amountDue, 0);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Initialize with default contact
  useEffect(() => {
    if (contacts.length > 0 && selectedRecipients.length === 0) {
      const defaultContact = contacts.find(c => c.is_default);
      if (defaultContact) {
        setSelectedRecipients([defaultContact.email]);
      }
    }
  }, [contacts]);

  // Initialize subject and message
  useEffect(() => {
    if (!subject && invoices.length > 0) {
      // Try to get dealer name from multiple sources - prioritize current context
      const dealerName = currentDealership?.name
        || invoices[0]?.dealership?.name
        || invoices[0]?.metadata?.dealerName
        || invoices[0]?.metadata?.dealership_name
        || '';

      const invoiceNumbers = invoices.map(inv => formatInvoiceNumberWithDepartment(inv)).join(', ');

      // Limit invoice numbers in subject to prevent it from being too long
      const displayNumbers = invoices.length > 3
        ? `${invoices.slice(0, 3).map(inv => formatInvoiceNumberWithDepartment(inv)).join(', ')}...`
        : invoiceNumbers;

      setSubject(`${dealerName} - Multiple Invoices (${invoices.length}) - ${displayNumbers}`);
    }

    if (!message && invoices.length > 0) {
      // Try to get dealer name from multiple sources - prioritize current context
      const dealerName = currentDealership?.name
        || invoices[0]?.dealership?.name
        || invoices[0]?.metadata?.dealerName
        || invoices[0]?.metadata?.dealership_name
        || '';

      const invoiceList = invoices.map(inv =>
        `• Invoice #${formatInvoiceNumberWithDepartment(inv)} - ${formatCurrency(inv.totalAmount)}`
      ).join('\n');

      setMessage(
        `Dear ${dealerName},\n\n` +
        `Please find attached ${invoices.length} invoice${invoices.length !== 1 ? 's' : ''} for services rendered.\n\n` +
        `Invoice Summary:\n${invoiceList}\n\n` +
        `Total Amount: ${formatCurrency(totalAmount)}\n` +
        `Total Paid: ${formatCurrency(totalPaid)}\n` +
        `Total Due: ${formatCurrency(totalDue)}\n\n` +
        `The detailed invoices and supporting documentation are attached in ${includePDF && includeExcel ? 'PDF and Excel' : includePDF ? 'PDF' : 'Excel'} format.\n\n` +
        `Should you have any questions or require additional information, please do not hesitate to contact us.\n\n` +
        `Best regards,\nDealer Detail Service LLC`
      );
    }
  }, [invoices, subject, message, includePDF, includeExcel, totalAmount, totalPaid, totalDue, currentDealership]);

  const handleToggleRecipient = (email: string) => {
    setSelectedRecipients(prev =>
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const handleAddCustomEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (customEmail && emailRegex.test(customEmail)) {
      if (!customEmails.includes(customEmail)) {
        setCustomEmails(prev => [...prev, customEmail]);
      }
      setCustomEmail('');
    }
  };

  const handleRemoveCustomEmail = (email: string) => {
    setCustomEmails(prev => prev.filter(e => e !== email));
  };

  const handleSendEmail = async () => {
    // Combine selected contacts and custom emails
    const allRecipients = [...selectedRecipients, ...customEmails];

    if (allRecipients.length === 0) {
      toast({
        title: t('reports.invoices.email.error'),
        description: t('reports.invoices.email.no_recipients'),
        variant: 'destructive',
      });
      return;
    }

    if (!includePDF && !includeExcel) {
      toast({
        title: t('reports.invoices.email.error'),
        description: t('reports.invoices.email.no_attachments'),
        variant: 'destructive',
      });
      return;
    }

    try {
      await sendEmailMutation.mutateAsync({
        invoiceIds: invoices.map(inv => inv.id),
        recipients: allRecipients,
        cc: cc ? cc.split(',').map(e => e.trim()).filter(e => e) : [],
        bcc: bcc ? bcc.split(',').map(e => e.trim()).filter(e => e) : [],
        subject,
        message,
        includePDF,
        includeExcel,
        dealershipId,
      });

      toast({
        title: t('reports.invoices.email.success'),
        description: t('reports.invoices.email.sent_successfully', { count: invoices.length }),
      });

      // Clear selected invoices after successful send
      onEmailSent?.();

      onOpenChange(false);
    } catch (error) {
      console.error('Error sending bulk email:', error);
      toast({
        title: t('reports.invoices.email.error'),
        description: t('reports.invoices.email.send_failed'),
        variant: 'destructive',
      });
    }
  };

  // Estimate file sizes (approximate)
  const estimatedSize = invoices.length * (includePDF ? 100 : 0) + invoices.length * (includeExcel ? 50 : 0);
  const sizeInMB = (estimatedSize / 1024).toFixed(2);

  const totalRecipients = selectedRecipients.length + customEmails.length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Send className="h-5 w-5 text-primary" />
              </div>
              {t('reports.invoices.email.send_multiple', { count: invoices.length })}
            </DialogTitle>
            <DialogDescription>
              {t('reports.invoices.email.send_multiple_desc')}
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Content - Single Column Layout */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {/* Invoice Summary Card - Compact Horizontal */}
              <Card className="border-2">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {t('reports.invoices.email.invoice_summary')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-3 px-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1.5">
                        {t('reports.invoices.email.selected_invoices')}
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-[50px] overflow-y-auto">
                        {invoices.map(inv => (
                          <Badge key={inv.id} variant="outline" className="text-xs">
                            #{formatInvoiceNumberWithDepartment(inv)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-4 sm:gap-6 border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-4">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">{t('reports.invoices.total')}</p>
                        <p className="font-semibold text-sm">{formatCurrency(totalAmount)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">{t('reports.invoices.paid')}</p>
                        <p className="font-semibold text-sm text-emerald-600">{formatCurrency(totalPaid)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">{t('reports.invoices.due')}</p>
                        <p className="font-semibold text-sm text-amber-600">{formatCurrency(totalDue)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recipients Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {t('reports.invoices.email.recipients')}
                    {totalRecipients > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {totalRecipients}
                      </Badge>
                    )}
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowManageContacts(true)}
                    className="h-8"
                  >
                    <Settings className="h-3.5 w-3.5 mr-1.5" />
                    {t('reports.invoices.email.manage_contacts')}
                  </Button>
                </div>

                {/* Saved Contacts - Collapsible with max height */}
                {contacts.length > 0 && (
                  <Collapsible open={contactsExpanded} onOpenChange={setContactsExpanded}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between h-8 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <span>Saved Contacts ({contacts.length})</span>
                        {contactsExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="max-h-[120px] overflow-y-auto border rounded-lg mt-1">
                        {contacts.map(contact => (
                          <div
                            key={contact.id}
                            className="flex items-center gap-2 p-2.5 hover:bg-muted/50 border-b last:border-b-0"
                          >
                            <Checkbox
                              checked={selectedRecipients.includes(contact.email)}
                              onCheckedChange={() => handleToggleRecipient(contact.email)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{contact.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{contact.email}</div>
                            </div>
                            {contact.is_default && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                {t('reports.invoices.email.default')}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Custom Email Input */}
                <div className="space-y-2">
                  <Label htmlFor="custom-email" className="text-xs text-muted-foreground">
                    {t('reports.invoices.email.additional_recipients')}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-email"
                      type="email"
                      placeholder={t('reports.invoices.email.enter_email')}
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomEmail();
                        }
                      }}
                      className="h-9"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddCustomEmail}
                      className="h-9 w-9 flex-shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {customEmails.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {customEmails.map(email => (
                        <Badge key={email} variant="secondary" className="gap-1 text-xs">
                          {email}
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomEmail(email)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* CC and BCC - Compact */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="cc" className="text-xs text-muted-foreground">
                      {t('reports.invoices.email.cc')}
                    </Label>
                    <Input
                      id="cc"
                      type="text"
                      placeholder={t('reports.invoices.email.cc_placeholder')}
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bcc" className="text-xs text-muted-foreground">
                      {t('reports.invoices.email.bcc')}
                    </Label>
                    <Input
                      id="bcc"
                      type="text"
                      placeholder={t('reports.invoices.email.bcc_placeholder')}
                      value={bcc}
                      onChange={(e) => setBcc(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <Label htmlFor="subject" className="text-sm font-semibold">
                  {t('reports.invoices.email.subject')}
                </Label>
                <Input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-sm font-semibold">
                  {t('reports.invoices.email.message')}
                </Label>
                <Textarea
                  id="message"
                  rows={8}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="text-sm resize-none"
                />
              </div>

              {/* Attachment Options - Inline */}
              <div className="flex items-center justify-between flex-wrap gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="include-pdf"
                      checked={includePDF}
                      onCheckedChange={(checked) => setIncludePDF(checked as boolean)}
                    />
                    <Label htmlFor="include-pdf" className="text-sm cursor-pointer flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-red-500" />
                      PDF
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="include-excel"
                      checked={includeExcel}
                      onCheckedChange={(checked) => setIncludeExcel(checked as boolean)}
                    />
                    <Label htmlFor="include-excel" className="text-sm cursor-pointer flex items-center gap-1.5">
                      <FileSpreadsheet className="h-4 w-4 text-green-500" />
                      Excel
                    </Label>
                  </div>
                </div>
                {(includePDF || includeExcel) && (
                  <span className="text-xs text-muted-foreground">
                    ~{sizeInMB} MB
                  </span>
                )}
              </div>
            </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-muted/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>
                {totalRecipients} recipient{totalRecipients !== 1 ? 's' : ''} • {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleSendEmail}
                disabled={
                  sendEmailMutation.isPending ||
                  totalRecipients === 0 ||
                  (!includePDF && !includeExcel)
                }
                className="min-w-[120px]"
              >
                {sendEmailMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('reports.invoices.email.sending')}
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    {t('reports.invoices.email.send')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Contacts Dialog */}
      <ManageEmailContactsDialog
        open={showManageContacts}
        onOpenChange={setShowManageContacts}
        dealershipId={dealershipId}
        dealershipName={currentDealership?.name || ''}
      />
    </>
  );
};
