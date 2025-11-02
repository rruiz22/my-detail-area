// =====================================================
// INVOICE EMAIL LOG
// Created: 2025-11-03
// Description: Display email history for invoices
// =====================================================

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useInvoiceEmailHistory } from '@/hooks/useInvoiceEmailHistory';
import { AlertCircle, CheckCircle, Clock, Mail, MailX } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import React from 'react';

interface InvoiceEmailLogProps {
  invoiceId: string;
}

export const InvoiceEmailLog: React.FC<InvoiceEmailLogProps> = ({ invoiceId }) => {
  const { data: emailHistory, isLoading } = useInvoiceEmailHistory(invoiceId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <MailX className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'bounced':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email History
          </CardTitle>
          <CardDescription>Track all emails sent for this invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No emails have been sent for this invoice yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email History
          <Badge variant="secondary" className="ml-2">
            {emailHistory.length} {emailHistory.length === 1 ? 'email' : 'emails'}
          </Badge>
        </CardTitle>
        <CardDescription>Track all emails sent for this invoice</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-y-auto pr-2">
          <div className="space-y-4">
            {emailHistory.map((email, index) => (
              <div
                key={email.id}
                className={`
                  relative p-4 rounded-lg border-2 transition-all
                  ${email.status === 'sent' ? 'bg-green-50 border-green-200' : ''}
                  ${email.status === 'failed' ? 'bg-red-50 border-red-200' : ''}
                  ${email.status === 'pending' ? 'bg-yellow-50 border-yellow-200' : ''}
                  ${email.status === 'bounced' ? 'bg-orange-50 border-orange-200' : ''}
                  ${!['sent', 'failed', 'pending', 'bounced'].includes(email.status) ? 'bg-gray-50 border-gray-200' : ''}
                `}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{email.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(email.sent_at), 'MMM dd, yyyy \'at\' h:mm a')}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(email.status)}
                </div>

                {/* Recipients */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-gray-500 min-w-[40px]">To:</span>
                    <div className="flex flex-wrap gap-1">
                      {email.sent_to.map((recipient, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {recipient}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {email.cc && email.cc.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-gray-500 min-w-[40px]">CC:</span>
                      <div className="flex flex-wrap gap-1">
                        {email.cc.map((recipient, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {recipient}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Preview */}
                {email.message && (
                  <div className="mb-3 p-3 bg-white/50 rounded border">
                    <p className="text-xs text-gray-600 line-clamp-2">{email.message}</p>
                  </div>
                )}

                {/* Attachments */}
                {email.attachments && email.attachments.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Attachments:</p>
                    <div className="flex flex-wrap gap-1">
                      {email.attachments.map((attachment, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          📎 {attachment.filename} ({(attachment.size / 1024).toFixed(1)} KB)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {email.error_message && (
                  <div className="mb-3 p-2 bg-red-100 border border-red-200 rounded">
                    <p className="text-xs text-red-800 font-medium">Error: {email.error_message}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Sent by: <span className="font-medium">{getUserName(email)}</span>
                  </p>
                  {index === 0 && (
                    <Badge variant="default" className="text-xs">
                      Latest
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
