// =====================================================
// BULK EMAIL INVOICES DIALOG
// Created: 2025-12-17
// Description: Send multiple invoices in a single email
// =====================================================

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Mail,
  Settings,
  X,
  Plus,
  FileText,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import { ManageEmailContactsDialog } from './ManageEmailContactsDialog';
import { useEmailContacts } from '@/hooks/useEmailContacts';
import { useBulkSendInvoiceEmails } from '@/hooks/useBulkSendInvoiceEmails';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Invoice } from '@/types/invoices';
import { useTranslation } from 'react-i18next';

interface BulkEmailInvoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: Invoice[];
  dealershipId: number;
}

export const BulkEmailInvoicesDialog: React.FC<BulkEmailInvoicesDialogProps> = ({
  open,
  onOpenChange,
  invoices,
  dealershipId,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();

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
      const dealerName = invoices[0].dealership?.name || 'Dealership';
      const invoiceNumbers = invoices.map(inv => inv.invoiceNumber).join(', ');

      // Limit invoice numbers in subject to prevent it from being too long
      const displayNumbers = invoices.length > 3
        ? `${invoices.slice(0, 3).map(inv => inv.invoiceNumber).join(', ')}...`
        : invoiceNumbers;

      setSubject(`${dealerName} - Multiple Invoices (${invoices.length}) - ${displayNumbers}`);
    }

    if (!message && invoices.length > 0) {
      const dealerName = invoices[0].dealership?.name || 'Dealership';
      const invoiceList = invoices.map(inv =>
        `• Invoice #${inv.invoiceNumber} - ${formatCurrency(inv.totalAmount)}`
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
  }, [invoices, subject, message, includePDF, includeExcel, totalAmount, totalPaid, totalDue]);

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('reports.invoices.email.send_multiple', { count: invoices.length })}
            </DialogTitle>
            <DialogDescription>
              {t('reports.invoices.email.send_multiple_desc')}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-6 p-1">
              {/* Invoice Summary Card */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t('reports.invoices.email.invoice_summary')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t('reports.invoices.email.selected_invoices')}
                      </p>
                      <div className="mt-1 max-h-20 overflow-y-auto">
                        {invoices.map(inv => (
                          <Badge key={inv.id} variant="outline" className="mr-1 mb-1">
                            #{inv.invoiceNumber}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('reports.invoices.total')}:</span>
                        <span className="font-medium">{formatCurrency(totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('reports.invoices.paid')}:</span>
                        <span className="font-medium text-emerald-600">{formatCurrency(totalPaid)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('reports.invoices.due')}:</span>
                        <span className="font-medium text-amber-600">{formatCurrency(totalDue)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recipients Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    {t('reports.invoices.email.recipients')}
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowManageContacts(true)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {t('reports.invoices.email.manage_contacts')}
                  </Button>
                </div>

                {/* Saved Contacts */}
                {contacts.length > 0 && (
                  <div className="space-y-2">
                    {contacts.map(contact => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selectedRecipients.includes(contact.email)}
                          onCheckedChange={() => handleToggleRecipient(contact.email)}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{contact.name}</div>
                          <div className="text-xs text-muted-foreground">{contact.email}</div>
                        </div>
                        {contact.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            {t('reports.invoices.email.default')}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom Email Input */}
                <div className="space-y-2">
                  <Label htmlFor="custom-email" className="text-sm">
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
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddCustomEmail}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {customEmails.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {customEmails.map(email => (
                        <Badge key={email} variant="secondary" className="gap-1">
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

                {/* CC and BCC */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cc" className="text-sm">
                      {t('reports.invoices.email.cc')}
                    </Label>
                    <Input
                      id="cc"
                      type="text"
                      placeholder={t('reports.invoices.email.cc_placeholder')}
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bcc" className="text-sm">
                      {t('reports.invoices.email.bcc')}
                    </Label>
                    <Input
                      id="bcc"
                      type="text"
                      placeholder={t('reports.invoices.email.bcc_placeholder')}
                      value={bcc}
                      onChange={(e) => setBcc(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Email Content */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="subject" className="text-sm font-semibold">
                    {t('reports.invoices.email.subject')}
                  </Label>
                  <Input
                    id="subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="message" className="text-sm font-semibold">
                    {t('reports.invoices.email.message')}
                  </Label>
                  <Textarea
                    id="message"
                    rows={8}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
              </div>

              {/* Attachment Options */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">
                  {t('reports.invoices.email.attachments')}
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="include-pdf"
                      checked={includePDF}
                      onCheckedChange={(checked) => setIncludePDF(checked as boolean)}
                    />
                    <Label htmlFor="include-pdf" className="text-sm cursor-pointer flex items-center gap-2">
                      <FileText className="h-4 w-4 text-red-500" />
                      {t('reports.invoices.email.include_pdf')}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="include-excel"
                      checked={includeExcel}
                      onCheckedChange={(checked) => setIncludeExcel(checked as boolean)}
                    />
                    <Label htmlFor="include-excel" className="text-sm cursor-pointer flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-green-500" />
                      {t('reports.invoices.email.include_excel')}
                    </Label>
                  </div>
                </div>

                {/* File Size Estimate */}
                {(includePDF || includeExcel) && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {t('reports.invoices.email.estimated_size', { size: sizeInMB })}
                    </span>
                  </div>
                )}
              </div>

              {/* Total Recipients Count */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t('reports.invoices.email.total_recipients')}:
                  </span>
                  <Badge variant="secondary">
                    {selectedRecipients.length + customEmails.length}
                  </Badge>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-3 pt-4 border-t">
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
                (selectedRecipients.length === 0 && customEmails.length === 0) ||
                (!includePDF && !includeExcel)
              }
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
        </DialogContent>
      </Dialog>

      {/* Manage Contacts Dialog */}
      <ManageEmailContactsDialog
        open={showManageContacts}
        onOpenChange={setShowManageContacts}
        dealershipId={dealershipId}
      />
    </>
  );
};