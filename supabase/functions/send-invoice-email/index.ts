// =====================================================
// SEND INVOICE EMAIL - EDGE FUNCTION
// Created: 2025-11-03
// Updated: 2025-11-25 - Migrated to SendGrid
// Description: Send invoice emails with PDF/Excel attachments via SendGrid
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')!
const EMAIL_FROM_ADDRESS = Deno.env.get('EMAIL_FROM_ADDRESS') || 'invoices@mydetailarea.com'
const EMAIL_FROM_NAME = Deno.env.get('EMAIL_FROM_NAME') || 'Dealer Detail Service'
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
  reply_to?: string
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

    // Convert message to simple HTML (preserve line breaks)
    const userMessage = request.message || 'Please find attached invoice.';
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div style="white-space: pre-wrap;">${userMessage.replace(/\n/g, '<br>')}</div>
</body>
</html>
    `.trim();

    // Prepare attachments in SendGrid format
    const sendgridAttachments = (request.attachments || []).map(att => ({
      content: att.content, // base64 string
      filename: att.filename,
      type: att.content_type || 'application/octet-stream',
      disposition: 'attachment',
    }))

    console.log(`📎 Attaching ${sendgridAttachments.length} file(s)`)

    // Build SendGrid personalizations
    const personalizations = [{
      to: request.recipients.map(email => ({ email })),
      ...(request.cc && request.cc.length > 0 && { cc: request.cc.map(email => ({ email })) }),
      ...(request.bcc && request.bcc.length > 0 && { bcc: request.bcc.map(email => ({ email })) }),
      subject: request.subject,
    }]

    // Send email via SendGrid
    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations,
        from: {
          email: EMAIL_FROM_ADDRESS,
          name: EMAIL_FROM_NAME,
        },
        ...(request.reply_to && { reply_to: { email: request.reply_to } }),
        content: [{
          type: 'text/html',
          value: emailHtml,
        }],
        attachments: sendgridAttachments,
      }),
    })

    // SendGrid returns 202 Accepted on success (no JSON body)
    if (!sendgridResponse.ok) {
      const errorText = await sendgridResponse.text()
      throw new Error(`SendGrid API error: ${sendgridResponse.status} - ${errorText}`)
    }

    // Get message ID from headers
    const messageId = sendgridResponse.headers.get('X-Message-Id') || 'unknown'
    console.log('✅ Email sent successfully via SendGrid:', messageId)

    // Update email history status
    const { error: updateError } = await supabase
      .from('invoice_email_history')
      .update({
        status: 'sent',
        provider_response: { provider: 'sendgrid', message_id: messageId },
      })
      .eq('id', request.email_history_id)

    if (updateError) {
      console.error('⚠️ Failed to update email history:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_id: messageId,
        message: 'Email sent successfully via SendGrid',
        provider: 'sendgrid',
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
