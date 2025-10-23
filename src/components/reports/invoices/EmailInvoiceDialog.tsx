// =====================================================
// EMAIL INVOICE DIALOG
// Created: 2025-10-23
// Description: Dialog for sending invoice via email
// =====================================================

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Mail, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Invoice } from '@/types/invoices';

interface EmailInvoiceDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EmailInvoiceDialog({
  invoice,
  open,
  onOpenChange,
  onSuccess
}: EmailInvoiceDialogProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  // Pre-fill with customer email from order
  React.useEffect(() => {
    if (invoice?.order?.customerEmail) {
      setRecipientEmail(invoice.order.customerEmail);
    }
    if (invoice?.order?.customerName) {
      setRecipientName(invoice.order.customerName);
    }
  }, [invoice]);

  const handleAddCC = () => {
    const email = ccInput.trim();
    if (email && isValidEmail(email) && !ccEmails.includes(email)) {
      setCcEmails([...ccEmails, email]);
      setCcInput('');
    } else if (ccEmails.includes(email)) {
      toast.error(t('reports.invoices.email.duplicate_cc'));
    } else {
      toast.error(t('reports.invoices.email.invalid_email'));
    }
  };

  const handleRemoveCC = (email: string) => {
    setCcEmails(ccEmails.filter(e => e !== email));
  };

  const isValidEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSend = async () => {
    if (!invoice) return;

    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      toast.error(t('reports.invoices.email.invalid_recipient'));
      return;
    }

    if (ccEmails.length > 5) {
      toast.error(t('reports.invoices.email.max_cc_exceeded'));
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoiceId: invoice.id,
          recipientEmail: recipientEmail.trim(),
          recipientName: recipientName.trim() || undefined,
          ccEmails: ccEmails.length > 0 ? ccEmails : undefined,
          customMessage: customMessage.trim() || undefined
        }
      });

      if (error) throw error;

      toast.success(t('reports.invoices.email.sent_success', { email: recipientEmail }));
      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setRecipientEmail('');
      setRecipientName('');
      setCcEmails([]);
      setCustomMessage('');
    } catch (error) {
      console.error('Error sending invoice email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(t('reports.invoices.email.sent_error', { error: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {t('reports.invoices.send_email')}
          </DialogTitle>
          <DialogDescription>
            {t('reports.invoices.email.description')}
          </DialogDescription>
        </DialogHeader>

        {invoice && (
          <div className="space-y-6">
            {/* Invoice Summary */}
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('reports.invoices.invoice_number')}</p>
                  <p className="font-semibold text-foreground">{invoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('reports.invoices.amount')}</p>
                  <p className="font-semibold text-foreground">{formatCurrency(invoice.totalAmount)}</p>
                </div>
                {invoice.order?.customerName && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">{t('reports.invoices.customer')}</p>
                    <p className="font-semibold text-foreground">{invoice.order.customerName}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recipient Email */}
            <div className="space-y-2">
              <Label htmlFor="recipient-email">{t('reports.invoices.email.recipient_email')} *</Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder={t('reports.invoices.email.recipient_placeholder')}
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
              />
            </div>

            {/* Recipient Name (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="recipient-name">{t('reports.invoices.email.recipient_name')}</Label>
              <Input
                id="recipient-name"
                type="text"
                placeholder={t('reports.invoices.email.name_placeholder')}
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>

            {/* CC Emails */}
            <div className="space-y-2">
              <Label htmlFor="cc-email">{t('reports.invoices.email.cc_emails')}</Label>
              <div className="flex gap-2">
                <Input
                  id="cc-email"
                  type="email"
                  placeholder={t('reports.invoices.email.cc_placeholder')}
                  value={ccInput}
                  onChange={(e) => setCcInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCC();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddCC}
                  disabled={!ccInput.trim()}
                >
                  {t('common.add')}
                </Button>
              </div>
              {ccEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {ccEmails.map((email, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {email}
                      <button
                        onClick={() => handleRemoveCC(email)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {t('reports.invoices.email.cc_limit')}
              </p>
            </div>

            {/* Custom Message */}
            <div className="space-y-2">
              <Label htmlFor="custom-message">{t('reports.invoices.email.custom_message')}</Label>
              <Textarea
                id="custom-message"
                placeholder={t('reports.invoices.email.message_placeholder')}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {customMessage.length}/500
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSend}
            disabled={isLoading || !recipientEmail}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('reports.invoices.email.sending')}
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                {t('reports.invoices.send_email')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
