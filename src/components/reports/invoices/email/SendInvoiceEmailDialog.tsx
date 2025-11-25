// =====================================================
// SEND INVOICE EMAIL DIALOG
// Created: 2025-11-03
// Description: Modal to send invoice via email
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
import { Mail, Settings, X, Plus, FileText, FileSpreadsheet } from 'lucide-react';
import { ManageEmailContactsDialog } from './ManageEmailContactsDialog';
import { useEmailContacts } from '@/hooks/useEmailContacts';
import { useSendInvoiceEmail } from '@/hooks/useInvoiceEmail';
import type { InvoiceWithDetails } from '@/types/invoices';
import type { SendInvoiceEmailRequest } from '@/types/email';

interface SendInvoiceEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceWithDetails;
}

export const SendInvoiceEmailDialog: React.FC<SendInvoiceEmailDialogProps> = ({
  open,
  onOpenChange,
  invoice,
}) => {
  const [showManageContacts, setShowManageContacts] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [customEmail, setCustomEmail] = useState('');
  const [customEmails, setCustomEmails] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [includePDF, setIncludePDF] = useState(true);
  const [includeExcel, setIncludeExcel] = useState(false);

  const dealershipId = invoice.dealership?.id;
  const dealershipName = invoice.dealership?.name || 'N/A';

  const { data: contacts = [] } = useEmailContacts(dealershipId || null);
  const sendEmailMutation = useSendInvoiceEmail();

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
    if (!subject) {
      const amount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(invoice.totalAmount);
      setSubject(`Invoice ${invoice.invoiceNumber} - ${amount}`);
    }

    if (!message) {
      // Format dates with timezone fix
      const startDate = invoice.metadata?.filter_date_range?.start
        ? new Date(invoice.metadata.filter_date_range.start + 'T12:00:00').toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : '';
      const endDate = invoice.metadata?.filter_date_range?.end
        ? new Date(invoice.metadata.filter_date_range.end + 'T12:00:00').toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : '';

      // Get department name
      const departments = invoice.metadata?.departments;
      let departmentText = '';
      if (departments && departments.length > 0) {
        if (departments.length === 1) {
          const deptName = departments[0].charAt(0).toUpperCase() + departments[0].slice(1);
          departmentText = `${deptName} `;
        } else {
          departmentText = 'Multi-Department ';
        }
      }

      // Format amount
      const amount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(invoice.totalAmount);

      // Build professional enterprise message
      const period = startDate && endDate ? `during the period of ${startDate} - ${endDate}` : '';
      const invoiceNum = invoice.invoiceNumber || invoice.invoice_number;
      const vehicleCount = invoice.items?.length || 0;

      setMessage(
        `Dear ${dealershipName},\n\nPlease find attached invoice #${invoiceNum} for ${departmentText}services rendered ${period}.\n\nInvoice Summary:\n• Invoice Number: ${invoiceNum}\n${departmentText ? `• Department: ${departmentText.trim()}\n` : ''}${period ? `• Service Period: ${startDate} - ${endDate}\n` : ''}• Total Vehicles: ${vehicleCount}\n• Total Amount: ${amount}\n\nThe detailed invoice and supporting documentation are attached in PDF and Excel formats.\n\nShould you have any questions or require additional information, please do not hesitate to contact us.\n\nBest regards,\nDealer Detail Service LLC`
      );
    }
  }, [invoice, subject, message]);

  const handleToggleRecipient = (email: string) => {
    setSelectedRecipients(prev =>
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const handleAddCustomEmail = () => {
    const trimmedEmail = customEmail.trim();
    if (trimmedEmail && !customEmails.includes(trimmedEmail)) {
      // Basic email validation
      if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(trimmedEmail)) {
        setCustomEmails(prev => [...prev, trimmedEmail]);
        setCustomEmail('');
      }
    }
  };

  const handleRemoveCustomEmail = (email: string) => {
    setCustomEmails(prev => prev.filter(e => e !== email));
  };

  const handleSend = () => {
    if (!dealershipId) return;

    const allRecipients = [...selectedRecipients, ...customEmails];

    if (allRecipients.length === 0) {
      return;
    }

    // Parse and validate CC emails
    const ccEmails = cc
      ? cc.split(',').map(e => e.trim()).filter(e => /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(e))
      : undefined;

    const request: SendInvoiceEmailRequest = {
      invoice_id: invoice.id,
      dealership_id: dealershipId,
      recipients: allRecipients,
      reply_to: replyTo.trim() || undefined,
      cc: ccEmails,
      subject,
      message,
      include_pdf: includePDF,
      include_excel: includeExcel,
    };

    sendEmailMutation.mutate(request, {
      onSuccess: () => {
        onOpenChange(false);
        // Reset form
        setSelectedRecipients([]);
        setCustomEmails([]);
        setCustomEmail('');
        setReplyTo('');
        setCc('');
      },
    });
  };

  const allRecipientsCount = selectedRecipients.length + customEmails.length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl">Send Invoice Email</DialogTitle>
                <DialogDescription>
                  {invoice.invoiceNumber} • {dealershipName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {/* Recipients from contacts */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Recipients</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManageContacts(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Contacts
                </Button>
              </div>

              {contacts.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 border rounded-lg bg-gray-50">
                  No contacts found.{' '}
                  <button
                    className="text-primary hover:underline"
                    onClick={() => setShowManageContacts(true)}
                  >
                    Add your first contact
                  </button>
                </div>
              ) : (
                <div className="space-y-2 border rounded-lg p-3 max-h-40 overflow-y-auto">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between hover:bg-gray-50 p-2 rounded"
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`contact-${contact.id}`}
                          checked={selectedRecipients.includes(contact.email)}
                          onCheckedChange={() => handleToggleRecipient(contact.email)}
                        />
                        <Label
                          htmlFor={`contact-${contact.id}`}
                          className="flex-1 cursor-pointer font-normal"
                        >
                          <span className="font-medium">{contact.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            ({contact.email})
                          </span>
                        </Label>
                      </div>
                      {contact.is_default && (
                        <Badge variant="secondary" className="ml-2">Default</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Recipients */}
            <div>
              <Label>Additional Recipients (optional)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomEmail()}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddCustomEmail}
                  disabled={!customEmail.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {customEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {customEmails.map((email) => (
                    <Badge key={email} variant="secondary" className="px-3 py-1">
                      {email}
                      <button
                        onClick={() => handleRemoveCustomEmail(email)}
                        className="ml-2 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Reply To */}
            <div>
              <Label htmlFor="replyTo">Reply To (optional)</Label>
              <Input
                id="replyTo"
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                placeholder="reply@example.com"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Replies will be sent to this email address
              </p>
            </div>

            {/* CC */}
            <div>
              <Label htmlFor="cc">CC (optional)</Label>
              <Input
                id="cc"
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="email1@example.com, email2@example.com"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separate multiple emails with commas
              </p>
            </div>

            {/* Subject */}
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Invoice subject..."
              />
            </div>

            {/* Message */}
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="Email message..."
              />
            </div>

            {/* Attachments */}
            <div>
              <Label className="mb-3 block">Attachments</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="attach-pdf"
                    checked={includePDF}
                    onCheckedChange={(checked) => setIncludePDF(!!checked)}
                  />
                  <Label htmlFor="attach-pdf" className="flex items-center gap-2 cursor-pointer font-normal">
                    <FileText className="h-4 w-4 text-red-500" />
                    Invoice PDF
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="attach-excel"
                    checked={includeExcel}
                    onCheckedChange={(checked) => setIncludeExcel(!!checked)}
                  />
                  <Label htmlFor="attach-excel" className="flex items-center gap-2 cursor-pointer font-normal">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    Detailed Excel Report
                  </Label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {allRecipientsCount} recipient{allRecipientsCount !== 1 ? 's' : ''} selected
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={allRecipientsCount === 0 || sendEmailMutation.isPending}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Contacts Dialog */}
      {dealershipId && (
        <ManageEmailContactsDialog
          open={showManageContacts}
          onOpenChange={setShowManageContacts}
          dealershipId={dealershipId}
          dealershipName={dealershipName}
        />
      )}
    </>
  );
};
