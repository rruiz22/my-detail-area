// =====================================================
// SEND INVOICE EMAIL - EDGE FUNCTION
// Created: 2025-11-03
// Description: Send invoice emails with PDF/Excel attachments
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailAttachment {
  filename: string
  content: string // base64
  content_type: string
}

interface SendEmailRequest {
  email_history_id: string
  invoice_id: string
  dealership_id: number
  recipients: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  message?: string
  include_pdf: boolean
  include_excel: boolean
  attachments?: EmailAttachment[]
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request
    const request: SendEmailRequest = await req.json()
    console.log('📧 Sending invoice email:', request.invoice_id)

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        dealership:dealerships(name, email, address, phone),
        items:invoice_items(*)
      `)
      .eq('id', request.invoice_id)
      .single()

    if (invoiceError || !invoice) {
      throw new Error(`Invoice not found: ${invoiceError?.message}`)
    }

    // Generate email HTML
    const emailHtml = generateInvoiceEmailHTML(invoice, request.message)

    // Prepare attachments from request
    const resendAttachments = (request.attachments || []).map(att => ({
      filename: att.filename,
      content: att.content, // base64 string
    }))

    console.log(`📎 Attaching ${resendAttachments.length} file(s)`)

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Dealer Detail Service <invoices@mydetailarea.com>',
        to: request.recipients,
        cc: request.cc,
        bcc: request.bcc,
        subject: request.subject,
        html: emailHtml,
        attachments: resendAttachments,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(resendData)}`)
    }

    console.log('✅ Email sent successfully:', resendData.id)

    // Update email history status
    const { error: updateError } = await supabase
      .from('invoice_email_history')
      .update({
        status: 'sent',
        provider_response: resendData,
      })
      .eq('id', request.email_history_id)

    if (updateError) {
      console.error('⚠️ Failed to update email history:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_id: resendData.id,
        message: 'Email sent successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ Error sending email:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

// =====================================================
// EMAIL HTML TEMPLATE
// =====================================================
function generateInvoiceEmailHTML(invoice: any, customMessage?: string): string {
  const dealerName = invoice.dealership?.name || 'Valued Customer'
  const invoiceNumber = invoice.invoice_number || invoice.invoiceNumber
  const totalAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(invoice.total_amount || invoice.totalAmount)

  const issueDate = new Date(invoice.issue_date || invoice.issueDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const dueDate = new Date(invoice.due_date || invoice.dueDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Get service period if available
  let servicePeriod = ''
  if (invoice.metadata?.filter_date_range) {
    const startDate = new Date(invoice.metadata.filter_date_range.start).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    const endDate = new Date(invoice.metadata.filter_date_range.end).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    servicePeriod = `${startDate} - ${endDate}`
  }

  const defaultMessage = servicePeriod
    ? `Please find attached invoice ${invoiceNumber} for services rendered during the period of ${servicePeriod}.`
    : `Please find attached invoice ${invoiceNumber} for services rendered.`

  const message = customMessage || defaultMessage

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0;
      opacity: 0.9;
      font-size: 14px;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 20px;
    }
    .message {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
      margin: 20px 0;
    }
    .invoice-details {
      background: #f3f4f6;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #6b7280;
      font-size: 14px;
    }
    .detail-value {
      font-weight: 600;
      color: #111827;
    }
    .amount {
      font-size: 24px;
      color: #667eea;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background: #f9fafb;
      padding: 20px;
      border-radius: 0 0 10px 10px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .footer-bold {
      font-weight: 600;
      color: #111827;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>DEALER DETAIL SERVICE LLC</h1>
    <p>Professional Detail Services</p>
  </div>

  <div class="content">
    <p class="greeting">Hello ${dealerName},</p>

    <div class="message">
      <p>${message}</p>
    </div>

    <div class="invoice-details">
      <div class="detail-row">
        <span class="detail-label">Invoice Number</span>
        <span class="detail-value">${invoiceNumber}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Invoice Date</span>
        <span class="detail-value">${issueDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Due Date</span>
        <span class="detail-value">${dueDate}</span>
      </div>
      ${servicePeriod ? `
      <div class="detail-row">
        <span class="detail-label">Service Period</span>
        <span class="detail-value">${servicePeriod}</span>
      </div>
      ` : ''}
      <div class="detail-row" style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb;">
        <span class="detail-label">Total Amount</span>
        <span class="detail-value amount">${totalAmount}</span>
      </div>
    </div>

    <center>
      <a href="#" class="button">View Invoice</a>
    </center>

    <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
      The invoice details and attachments are included with this email.
      If you have any questions, please don't hesitate to contact us.
    </p>

    <p style="margin-top: 20px;">
      Thank you for your business!<br>
      <strong>Dealer Detail Service LLC</strong>
    </p>
  </div>

  <div class="footer">
    <p class="footer-bold">My Detail Area LLC</p>
    <p>This email was sent regarding invoice ${invoiceNumber}</p>
    <p style="margin-top: 10px;">
      © ${new Date().getFullYear()} Dealer Detail Service LLC. All rights reserved.
    </p>
  </div>
</body>
</html>
  `
}
