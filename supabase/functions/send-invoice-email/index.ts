// @ts-nocheck - This file is for Supabase Edge Functions (Deno environment)
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Constants
const EMAIL_CONFIG = {
  EMAIL_DOMAIN: 'invoices@mydetailarea.com',
  TAG_TYPES: {
    INVOICE: 'invoice'
  },
  RATE_LIMIT: {
    MAX_REQUESTS_PER_MINUTE: 20,
    WINDOW_MS: 60000
  }
} as const;

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Validation schema
const InvoiceEmailRequestSchema = z.object({
  invoiceId: z.string().uuid(),
  recipientEmail: z.string().email(),
  recipientName: z.string().min(1).max(100).trim().optional(),
  ccEmails: z.array(z.string().email()).max(5).optional(),
  customMessage: z.string().max(500).trim().optional()
});

interface InvoiceEmailRequest {
  invoiceId: string;
  recipientEmail: string;
  recipientName?: string;
  ccEmails?: string[];
  customMessage?: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Utility functions
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + EMAIL_CONFIG.RATE_LIMIT.WINDOW_MS });
    return true;
  }

  if (limit.count >= EMAIL_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  limit.count++;
  return true;
}

function sanitize(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let supabase: any;

  try {
    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                    req.headers.get('x-real-ip') ||
                    'unknown';

    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Rate limit exceeded. Please try again later."
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 429,
        }
      );
    }

    // Environment validation
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Parse and validate request
    const requestBody = await req.json();
    const validatedData = InvoiceEmailRequestSchema.parse(requestBody);

    const {
      invoiceId,
      recipientEmail,
      recipientName,
      ccEmails,
      customMessage
    } = validatedData;

    // Fetch invoice with related data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        orders (
          order_number,
          custom_order_number,
          order_type,
          customer_name,
          customer_email,
          vehicle_make,
          vehicle_model,
          vehicle_year,
          vehicle_vin
        ),
        dealerships (
          name,
          email,
          phone,
          address,
          logo
        ),
        invoice_items (*)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error(`Invoice not found: ${invoiceError?.message || 'Unknown error'}`);
    }

    // Fetch invoice items separately for cleaner structure
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order', { ascending: true });

    if (itemsError) {
      console.warn('Failed to fetch invoice items:', itemsError);
    }

    // Build email template
    const template = createInvoiceEmailTemplate({
      invoice,
      items: items || [],
      dealership: invoice.dealerships,
      order: invoice.orders,
      recipientName: recipientName || invoice.orders?.customer_name || 'Valued Customer',
      customMessage
    });

    // Generate PDF attachment URL (future implementation)
    // const pdfUrl = await generateInvoicePDF(invoiceId);

    // Send email
    const emailPayload: any = {
      from: `${invoice.dealerships?.name || 'My Detail Area'} <${EMAIL_CONFIG.EMAIL_DOMAIN}>`,
      to: [recipientEmail],
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: [
        { name: 'type', value: EMAIL_CONFIG.TAG_TYPES.INVOICE },
        { name: 'invoice_number', value: invoice.invoice_number },
        { name: 'dealership', value: invoice.dealerships?.name || 'unknown' }
      ]
    };

    if (ccEmails && ccEmails.length > 0) {
      emailPayload.cc = ccEmails;
    }

    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }

    // Update invoice record
    const now = new Date().toISOString();
    await supabase
      .from('invoices')
      .update({
        email_sent: true,
        email_sent_at: now,
        email_sent_count: supabase.sql`COALESCE(email_sent_count, 0) + 1`,
        last_email_recipient: recipientEmail,
        updated_at: now
      })
      .eq('id', invoiceId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invoice email sent successfully",
        emailId: data?.id,
        invoiceNumber: invoice.invoice_number
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[send-invoice-email]', error);

    let statusCode = 500;
    let errorMessage = "Failed to send invoice email";

    if (error instanceof z.ZodError) {
      statusCode = 400;
      errorMessage = `Validation error: ${error.errors.map(e => e.message).join(', ')}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('not found')) {
        statusCode = 404;
      } else if (error.message.includes('Rate limit')) {
        statusCode = 429;
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: statusCode,
      }
    );
  }
};

function createInvoiceEmailTemplate({
  invoice,
  items,
  dealership,
  order,
  recipientName,
  customMessage
}: {
  invoice: any;
  items: any[];
  dealership: any;
  order: any;
  recipientName: string;
  customMessage?: string;
}): EmailTemplate {

  const invoiceNumber = invoice.invoice_number;
  const issueDate = formatDate(invoice.issue_date);
  const dueDate = formatDate(invoice.due_date);
  const subtotal = formatCurrency(parseFloat(invoice.subtotal || 0));
  const taxAmount = formatCurrency(parseFloat(invoice.tax_amount || 0));
  const discountAmount = parseFloat(invoice.discount_amount || 0);
  const totalAmount = formatCurrency(parseFloat(invoice.total_amount || 0));
  const amountDue = formatCurrency(parseFloat(invoice.amount_due || 0));

  const dealershipName = dealership?.name || 'My Detail Area';
  const dealershipEmail = dealership?.email || '';
  const dealershipPhone = dealership?.phone || '';
  const dealershipAddress = dealership?.address || '';

  const vehicleInfo = order ?
    `${order.vehicle_year || ''} ${order.vehicle_make || ''} ${order.vehicle_model || ''}`.trim() :
    '';
  const orderNumber = order?.custom_order_number || order?.order_number || '';

  // Build items HTML
  const itemsHTML = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <strong style="color: #111827;">${sanitize(item.description)}</strong>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(parseFloat(item.unit_price))}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${formatCurrency(parseFloat(item.total_amount))}</td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoiceNumber}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f9fafb;
            padding: 20px;
            line-height: 1.6;
            color: #374151;
        }
        .container {
            max-width: 700px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
        }
        .header {
            background-color: #111827;
            padding: 32px 24px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        .header p {
            color: #9ca3af;
            font-size: 14px;
        }
        .content {
            padding: 32px 24px;
        }
        .greeting {
            font-size: 16px;
            color: #111827;
            margin-bottom: 16px;
        }
        .custom-message {
            background-color: #f9fafb;
            border-left: 3px solid #10b981;
            padding: 16px;
            margin: 24px 0;
            font-size: 15px;
            color: #6b7280;
        }
        .invoice-details {
            background-color: #f3f4f6;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 20px;
            margin: 24px 0;
        }
        .invoice-details table {
            width: 100%;
        }
        .invoice-details td {
            padding: 6px 0;
            font-size: 14px;
        }
        .invoice-details .label {
            color: #6b7280;
            width: 140px;
        }
        .invoice-details .value {
            color: #111827;
            font-weight: 500;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 24px 0;
        }
        .items-table th {
            background-color: #f9fafb;
            padding: 12px;
            text-align: left;
            font-size: 13px;
            font-weight: 600;
            color: #111827;
            border-bottom: 2px solid #e5e7eb;
        }
        .items-table th:nth-child(2),
        .items-table th:nth-child(3),
        .items-table th:nth-child(4) {
            text-align: right;
        }
        .totals-section {
            margin-top: 24px;
            border-top: 2px solid #e5e7eb;
            padding-top: 16px;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 15px;
        }
        .totals-row.subtotal {
            color: #6b7280;
        }
        .totals-row.total {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            border-top: 2px solid #111827;
            padding-top: 12px;
            margin-top: 8px;
        }
        .payment-info {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 16px;
            margin: 24px 0;
            text-align: center;
        }
        .payment-info p {
            color: #92400e;
            font-size: 15px;
            font-weight: 500;
        }
        .payment-info .amount {
            font-size: 24px;
            font-weight: 700;
            color: #78350f;
            margin: 8px 0;
        }
        .footer {
            background-color: #f9fafb;
            padding: 24px;
            text-align: center;
            color: #6b7280;
            font-size: 13px;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            margin: 4px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📄 Invoice ${sanitize(invoiceNumber)}</h1>
            <p>${sanitize(dealershipName)}</p>
        </div>

        <div class="content">
            <p class="greeting">Dear ${sanitize(recipientName)},</p>
            <p style="margin-bottom: 16px;">Thank you for your business. Please find your invoice details below.</p>

            ${customMessage ? `
            <div class="custom-message">
                ${sanitize(customMessage)}
            </div>
            ` : ''}

            <div class="invoice-details">
                <table>
                    <tr>
                        <td class="label">Invoice Number:</td>
                        <td class="value">${sanitize(invoiceNumber)}</td>
                    </tr>
                    <tr>
                        <td class="label">Issue Date:</td>
                        <td class="value">${issueDate}</td>
                    </tr>
                    <tr>
                        <td class="label">Due Date:</td>
                        <td class="value">${dueDate}</td>
                    </tr>
                    ${orderNumber ? `
                    <tr>
                        <td class="label">Order Number:</td>
                        <td class="value">${sanitize(orderNumber)}</td>
                    </tr>
                    ` : ''}
                    ${vehicleInfo ? `
                    <tr>
                        <td class="label">Vehicle:</td>
                        <td class="value">${sanitize(vehicleInfo)}</td>
                    </tr>
                    ` : ''}
                </table>
            </div>

            <h3 style="margin: 24px 0 12px 0; color: #111827; font-size: 16px;">Invoice Items</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th style="text-align: center;">Qty</th>
                        <th style="text-align: right;">Unit Price</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>

            <div class="totals-section">
                <div class="totals-row subtotal">
                    <span>Subtotal:</span>
                    <span>${subtotal}</span>
                </div>
                ${discountAmount > 0 ? `
                <div class="totals-row subtotal">
                    <span>Discount:</span>
                    <span>-${formatCurrency(discountAmount)}</span>
                </div>
                ` : ''}
                <div class="totals-row subtotal">
                    <span>Tax:</span>
                    <span>${taxAmount}</span>
                </div>
                <div class="totals-row total">
                    <span>Total Amount:</span>
                    <span>${totalAmount}</span>
                </div>
            </div>

            ${parseFloat(invoice.amount_due) > 0 ? `
            <div class="payment-info">
                <p>Amount Due</p>
                <div class="amount">${amountDue}</div>
                <p style="font-size: 13px; margin-top: 8px;">Due by ${dueDate}</p>
            </div>
            ` : ''}

            ${dealershipAddress || dealershipEmail || dealershipPhone ? `
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">
                <p style="font-weight: 600; color: #111827; margin-bottom: 8px;">${sanitize(dealershipName)}</p>
                ${dealershipAddress ? `<p>${sanitize(dealershipAddress)}</p>` : ''}
                ${dealershipEmail ? `<p>Email: ${sanitize(dealershipEmail)}</p>` : ''}
                ${dealershipPhone ? `<p>Phone: ${sanitize(dealershipPhone)}</p>` : ''}
            </div>
            ` : ''}

            ${invoice.invoice_notes ? `
            <div style="margin-top: 24px; padding: 16px; background-color: #f9fafb; border-radius: 6px;">
                <p style="font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 8px;">Notes:</p>
                <p style="font-size: 13px; color: #6b7280;">${sanitize(invoice.invoice_notes)}</p>
            </div>
            ` : ''}

            ${invoice.terms_and_conditions ? `
            <div style="margin-top: 16px; padding: 16px; background-color: #f9fafb; border-radius: 6px;">
                <p style="font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 8px;">Terms & Conditions:</p>
                <p style="font-size: 12px; color: #6b7280; line-height: 1.5;">${sanitize(invoice.terms_and_conditions)}</p>
            </div>
            ` : ''}
        </div>

        <div class="footer">
            <p><strong>${sanitize(dealershipName)}</strong></p>
            <p>Powered by My Detail Area</p>
            <p style="margin-top: 12px; font-size: 12px;">
                This invoice was sent to ${sanitize(recipientEmail)}<br>
                If you have any questions, please contact us at ${sanitize(dealershipEmail || 'support@mydetailarea.com')}
            </p>
        </div>
    </div>
</body>
</html>
  `;

  const text = `
INVOICE ${invoiceNumber}
${dealershipName}

Dear ${recipientName},

Thank you for your business. Please find your invoice details below.

${customMessage ? `\n${customMessage}\n` : ''}

INVOICE DETAILS:
Invoice Number: ${invoiceNumber}
Issue Date: ${issueDate}
Due Date: ${dueDate}
${orderNumber ? `Order Number: ${orderNumber}\n` : ''}
${vehicleInfo ? `Vehicle: ${vehicleInfo}\n` : ''}

ITEMS:
${items.map(item => `
${item.description}
Qty: ${item.quantity} × ${formatCurrency(parseFloat(item.unit_price))} = ${formatCurrency(parseFloat(item.total_amount))}
`).join('\n')}

TOTALS:
Subtotal: ${subtotal}
${discountAmount > 0 ? `Discount: -${formatCurrency(discountAmount)}\n` : ''}Tax: ${taxAmount}
Total Amount: ${totalAmount}

${parseFloat(invoice.amount_due) > 0 ? `
AMOUNT DUE: ${amountDue}
Due by: ${dueDate}
` : ''}

${dealershipName}
${dealershipAddress ? dealershipAddress + '\n' : ''}${dealershipEmail ? `Email: ${dealershipEmail}\n` : ''}${dealershipPhone ? `Phone: ${dealershipPhone}\n` : ''}

${invoice.invoice_notes ? `\nNotes:\n${invoice.invoice_notes}\n` : ''}
${invoice.terms_and_conditions ? `\nTerms & Conditions:\n${invoice.terms_and_conditions}\n` : ''}

---
This invoice was sent to ${recipientEmail}
If you have any questions, please contact us at ${dealershipEmail || 'support@mydetailarea.com'}

Powered by My Detail Area
  `.trim();

  return {
    subject: `Invoice ${invoiceNumber} from ${dealershipName}`,
    html,
    text
  };
}

serve(handler);
