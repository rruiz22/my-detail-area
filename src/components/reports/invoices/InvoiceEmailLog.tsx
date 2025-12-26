// =====================================================
// INVOICE EMAIL LOG
// Created: 2025-11-03
// Updated: 2025-12-26 - Improved UI with expandable messages
// Description: Display email history for invoices
// =====================================================

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useInvoiceEmailHistory } from '@/hooks/useInvoiceEmailHistory';
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Mail,
  MailX,
  Paperclip,
  Send,
  User,
  Users
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import React, { useState } from 'react';

interface InvoiceEmailLogProps {
  invoiceId: string;
}

export const InvoiceEmailLog: React.FC<InvoiceEmailLogProps> = ({ invoiceId }) => {
  const { data: emailHistory, isLoading } = useInvoiceEmailHistory(invoiceId);
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());

  const toggleExpand = (emailId: string) => {
    setExpandedEmails(prev => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  };

  const isExpanded = (emailId: string) => expandedEmails.has(emailId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 shadow-sm">
            <CheckCircle className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 shadow-sm">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 shadow-sm">
            <MailX className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'bounced':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200 shadow-sm">
            <AlertCircle className="h-3 w-3 mr-1" />
            Bounced
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUserName = (email: any) => {
    if (!email?.sent_by_user) return 'System';
    const { first_name, last_name } = email.sent_by_user;
    return first_name && last_name ? `${first_name} ${last_name}` : email.sent_by_user.email;
  };

  // Check if message needs expansion (more than ~150 chars or has line breaks)
  const needsExpansion = (message: string | null | undefined) => {
    if (!message) return false;
    return message.length > 150 || message.includes('\n');
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            Email History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!emailHistory || emailHistory.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            Email History
          </CardTitle>
          <CardDescription>Track all emails sent for this invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground bg-gray-50/50 rounded-lg border border-dashed">
            <div className="p-4 bg-white rounded-full shadow-sm mb-4">
              <Mail className="h-10 w-10 opacity-40" />
            </div>
            <p className="text-sm font-medium">No emails sent yet</p>
            <p className="text-xs text-gray-400 mt-1">Emails sent for this invoice will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          Email History
          <Badge variant="secondary" className="ml-2 font-normal">
            {emailHistory.length} {emailHistory.length === 1 ? 'email' : 'emails'}
          </Badge>
        </CardTitle>
        <CardDescription>Track all emails sent for this invoice</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[500px] overflow-y-auto pr-1 -mr-1">
          <div className="space-y-4">
            {emailHistory.map((email, index) => {
              const expanded = isExpanded(email.id);
              const isBulkSend = email.metadata?.bulk_send === true;
              const totalInvoices = email.metadata?.total_invoices_in_email || 1;

              return (
                <div
                  key={email.id}
                  className={`
                    relative rounded-xl border-2 transition-all duration-200 overflow-hidden
                    hover:shadow-md
                    ${email.status === 'sent' ? 'bg-gradient-to-br from-green-50 to-emerald-50/50 border-green-200' : ''}
                    ${email.status === 'failed' ? 'bg-gradient-to-br from-red-50 to-rose-50/50 border-red-200' : ''}
                    ${email.status === 'pending' ? 'bg-gradient-to-br from-yellow-50 to-amber-50/50 border-yellow-200' : ''}
                    ${email.status === 'bounced' ? 'bg-gradient-to-br from-orange-50 to-amber-50/50 border-orange-200' : ''}
                    ${!['sent', 'failed', 'pending', 'bounced'].includes(email.status) ? 'bg-gray-50 border-gray-200' : ''}
                  `}
                >
                  {/* Header Section */}
                  <div className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`
                          p-2.5 rounded-xl shadow-sm flex-shrink-0
                          ${email.status === 'sent' ? 'bg-green-100' : ''}
                          ${email.status === 'failed' ? 'bg-red-100' : ''}
                          ${email.status === 'pending' ? 'bg-yellow-100' : ''}
                          ${email.status === 'bounced' ? 'bg-orange-100' : ''}
                          ${!['sent', 'failed', 'pending', 'bounced'].includes(email.status) ? 'bg-gray-100' : ''}
                        `}>
                          <Send className={`
                            h-4 w-4
                            ${email.status === 'sent' ? 'text-green-600' : ''}
                            ${email.status === 'failed' ? 'text-red-600' : ''}
                            ${email.status === 'pending' ? 'text-yellow-600' : ''}
                            ${email.status === 'bounced' ? 'text-orange-600' : ''}
                            ${!['sent', 'failed', 'pending', 'bounced'].includes(email.status) ? 'text-gray-600' : ''}
                          `} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-gray-900 truncate pr-2" title={email.subject}>
                            {email.subject}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {format(parseISO(email.sent_at), 'MMM dd, yyyy \'at\' h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isBulkSend && (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {totalInvoices} invoices
                          </Badge>
                        )}
                        {getStatusBadge(email.status)}
                      </div>
                    </div>
                  </div>

                  {/* Recipients Section */}
                  <div className="px-4 pb-3">
                    <div className="p-3 bg-white/60 rounded-lg border border-white/80 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-semibold text-gray-500 min-w-[32px] pt-0.5">To:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {email.sent_to.map((recipient, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs bg-white hover:bg-gray-50 transition-colors"
                            >
                              {recipient}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {email.cc && email.cc.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-semibold text-gray-500 min-w-[32px] pt-0.5">CC:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {email.cc.map((recipient, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs bg-white/80"
                              >
                                {recipient}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Message Section - Expandable */}
                  {email.message && (
                    <div className="px-4 pb-3">
                      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                        <div className="px-3 py-2 bg-gray-50 border-b flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-gray-500" />
                          <span className="text-xs font-medium text-gray-600">Message Content</span>
                        </div>
                        <div className="p-3">
                          <p className={`
                            text-sm text-gray-700 whitespace-pre-wrap leading-relaxed
                            ${!expanded && needsExpansion(email.message) ? 'line-clamp-3' : ''}
                          `}>
                            {email.message}
                          </p>
                          {needsExpansion(email.message) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpand(email.id)}
                              className="mt-2 h-7 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 px-2"
                            >
                              {expanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3 mr-1" />
                                  Show less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3 mr-1" />
                                  Show more
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Attachments Section */}
                  {email.attachments && email.attachments.length > 0 && (
                    <div className="px-4 pb-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Paperclip className="h-3.5 w-3.5 text-gray-500" />
                        <span className="text-xs font-medium text-gray-600">
                          Attachments ({email.attachments.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {email.attachments.map((attachment, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border text-xs hover:bg-gray-50 transition-colors"
                          >
                            <FileText className="h-4 w-4 text-blue-500" />
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-700 truncate max-w-[200px]" title={attachment.filename}>
                                {attachment.filename}
                              </span>
                              <span className="text-gray-400">
                                {(attachment.size / 1024).toFixed(1)} KB
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {email.error_message && (
                    <div className="px-4 pb-3">
                      <div className="flex items-start gap-2 p-3 bg-red-100 border border-red-200 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-red-800">Error</p>
                          <p className="text-xs text-red-700 mt-0.5">{email.error_message}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="px-4 py-3 bg-white/40 border-t flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <User className="h-3.5 w-3.5" />
                      <span>Sent by:</span>
                      <span className="font-medium text-gray-700">{getUserName(email)}</span>
                    </div>
                    {index === 0 && (
                      <Badge className="bg-primary text-white text-xs shadow-sm">
                        Latest
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
