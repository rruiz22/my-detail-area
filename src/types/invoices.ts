// =====================================================
// INVOICE & PAYMENT TYPES
// Created: 2024-10-16
// Description: TypeScript types for invoicing system
// =====================================================

export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
export type PaymentStatus = 'completed' | 'pending' | 'failed' | 'refunded';
export type PaymentMethod = 'cash' | 'check' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'other';
export type ItemType = 'service' | 'product' | 'labor' | 'other';

// =====================================================
// INVOICE
// =====================================================
export interface Invoice {
  id: string;
  invoiceNumber: string;

  // Relations (data comes from order)
  orderId: string;
  dealerId: number;
  createdBy: string | null;

  // Invoice-specific dates
  issueDate: string;
  dueDate: string;

  // Financial
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;

  // Status
  status: InvoiceStatus;

  // Notes
  invoiceNotes: string | null;
  termsAndConditions: string | null;

  // Email tracking
  emailSent: boolean;
  emailSentAt: string | null;
  emailSentCount: number;
  lastEmailRecipient: string | null;

  // Metadata
  metadata: Record<string, any>;

  // Timestamps
  createdAt: string;
  updatedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;

  // Related data (populated via joins)
  order?: {
    orderNumber: string;
    orderType: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    vehicleVin?: string;
    vehicleInfo?: any;
    services?: any[];
    totalAmount: number;
    status: string;
  };
  dealership?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    logo?: string;
  };
  items?: InvoiceItem[];
  payments?: Payment[];

  // Comments count (from RPC query)
  commentsCount?: number;
}

// =====================================================
// INVOICE ITEM
// =====================================================
export interface InvoiceItem {
  id: string;
  invoiceId: string;

  // Item details (snapshot from order)
  itemType: ItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  totalAmount: number;

  // Reference
  serviceReference: string | null;

  // Ordering
  sortOrder: number;

  // Payment status
  isPaid: boolean;

  // Metadata
  metadata: Record<string, any>;

  // Timestamps
  createdAt: string;
  updatedAt: string | null;
}

// =====================================================
// PAYMENT
// =====================================================
export interface Payment {
  id: string;
  paymentNumber: string;

  // Relations
  invoiceId: string;
  dealerId: number;
  recordedBy: string | null;

  // Payment details
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;

  // Additional info
  referenceNumber: string | null;
  notes: string | null;

  // Status
  status: PaymentStatus;

  // Metadata
  metadata: Record<string, any>;

  // Timestamps
  createdAt: string;
  updatedAt: string | null;
  refundedAt: string | null;

  // Related data
  invoice?: Invoice;
  recordedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// =====================================================
// SCHEDULED REPORT
// =====================================================
export type ReportType = 'operational' | 'financial' | 'invoices' | 'performance' | 'custom';
export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ScheduledReport {
  id: string;

  // Relations
  dealerId: number;
  createdBy: string | null;

  // Report config
  reportName: string;
  reportType: ReportType;

  // Schedule config
  frequency: ReportFrequency;
  scheduleDay: number | null;
  scheduleTime: string;
  timezone: string;

  // Recipients
  recipients: string[];

  // Filters
  filters: Record<string, any>;

  // Export config
  exportFormat: ExportFormat;
  includeSections: {
    summary: boolean;
    charts: boolean;
    tables: boolean;
    trends?: boolean;
  };

  // Status
  isActive: boolean;
  lastSentAt: string | null;
  nextSendAt: string | null;
  sendCount: number;

  // Metadata
  metadata: Record<string, any>;

  // Timestamps
  createdAt: string;
  updatedAt: string | null;
  deactivatedAt: string | null;
}

// =====================================================
// REPORT SEND HISTORY
// =====================================================
export interface ReportSendHistory {
  id: string;

  // Relations
  scheduledReportId: string | null;
  dealerId: number;

  // Send details
  sentAt: string;
  recipients: string[];
  reportType: string;
  exportFormat: string;

  // Status
  status: 'success' | 'failed' | 'partial';
  errorMessage: string | null;

  // File info
  fileUrl: string | null;
  fileSize: number | null;

  // Metadata
  metadata: Record<string, any>;

  // Timestamps
  createdAt: string;
}

// =====================================================
// FORM DATA TYPES
// =====================================================
export interface InvoiceFormData {
  orderId: string;
  dealerId: number;
  issueDate: Date;
  dueDate: Date;
  taxRate: number;
  discountAmount?: number;
  invoiceNotes?: string;
  termsAndConditions?: string;
}

export interface PaymentFormData {
  invoiceId: string;
  dealerId: number;
  paymentDate: Date;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

export interface ScheduledReportFormData {
  reportName: string;
  reportType: ReportType;
  frequency: ReportFrequency;
  scheduleDay?: number;
  scheduleTime: string;
  timezone: string;
  recipients: string[];
  filters: Record<string, any>;
  exportFormat: ExportFormat;
  includeSections: {
    summary: boolean;
    charts: boolean;
    tables: boolean;
    trends?: boolean;
  };
}

// =====================================================
// API RESPONSE TYPES
// =====================================================
export interface InvoiceWithDetails extends Invoice {
  order: NonNullable<Invoice['order']>;
  items: InvoiceItem[];
  payments: Payment[];
}

export interface InvoiceSummary {
  totalInvoices: number;
  totalAmount: number;
  totalPaid: number;
  totalDue: number;
  pendingCount: number;
  overdueCount: number;
  paidCount: number;
}

// =====================================================
// FILTER TYPES
// =====================================================
export interface InvoiceFilters {
  status?: InvoiceStatus | 'all';
  orderType?: 'sales' | 'service' | 'recon' | 'car_wash' | 'all';
  startDate?: Date;
  endDate?: Date;
  dealerId?: number | 'all';
  searchTerm?: string;
}

// =====================================================
// SUPABASE TYPES (database representation)
// =====================================================
export interface InvoiceRow {
  id: string;
  invoice_number: string;
  order_id: string;
  dealer_id: number;
  created_by: string | null;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  status: InvoiceStatus;
  invoice_notes: string | null;
  terms_and_conditions: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  email_sent_count: number;
  last_email_recipient: string | null;
  metadata: any;
  created_at: string;
  updated_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
}

export interface InvoiceItemRow {
  id: string;
  invoice_id: string;
  item_type: ItemType;
  description: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_rate: number;
  total_amount: number;
  service_reference: string | null;
  sort_order: number;
  is_paid: boolean;
  metadata: any;
  created_at: string;
  updated_at: string | null;
}

export interface PaymentRow {
  id: string;
  payment_number: string;
  invoice_id: string;
  dealer_id: number;
  recorded_by: string | null;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_number: string | null;
  notes: string | null;
  status: PaymentStatus;
  metadata: any;
  created_at: string;
  updated_at: string | null;
  refunded_at: string | null;
}

// =====================================================
// EMAIL HISTORY
// =====================================================
export interface InvoiceEmailHistory {
  id: string;
  invoice_id: string;
  dealership_id: number;
  sent_to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  message?: string;
  attachments?: {
    filename: string;
    size: number;
  }[];
  sent_at: string;
  sent_by: string | null;
  status: 'pending' | 'sent' | 'failed' | 'bounced';
  error_message?: string;
  provider_response?: any;
  metadata?: any;
  sent_by_user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

// =====================================================
// COMMENTS
// =====================================================
export interface InvoiceComment {
  id: string;
  invoice_id: string;
  dealership_id: number;
  user_id: string;
  comment: string;
  is_internal: boolean;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}
