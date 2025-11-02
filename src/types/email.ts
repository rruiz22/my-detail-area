// =====================================================
// EMAIL TYPES
// Created: 2025-11-03
// Description: TypeScript types for invoice email system
// =====================================================

export interface EmailContact {
  id: string;
  dealership_id: number;
  name: string;
  email: string;
  job_title?: string;
  is_default: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface EmailContactInput {
  dealership_id: number;
  name: string;
  email: string;
  job_title?: string;
  is_default?: boolean;
  notes?: string;
}

export interface EmailHistory {
  id: string;
  invoice_id: string;
  dealership_id: number;
  sent_to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  message?: string;
  attachments?: EmailAttachment[];
  sent_at: string;
  sent_by?: string;
  status: EmailStatus;
  error_message?: string;
  provider_response?: any;
  metadata?: any;
}

export interface EmailAttachment {
  filename: string;
  size: number;
  content_type?: string;
}

export type EmailStatus = 'pending' | 'sent' | 'failed' | 'bounced';

export interface EmailAttachmentData {
  filename: string;
  content: string; // base64
  content_type: string;
}

export interface SendInvoiceEmailRequest {
  invoice_id: string;
  dealership_id: number;
  recipients: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  message?: string;
  include_pdf: boolean;
  include_excel: boolean;
  attachments?: EmailAttachmentData[];
}

export interface SendInvoiceEmailResponse {
  success: boolean;
  email_history_id: string;
  message: string;
  error?: string;
}
