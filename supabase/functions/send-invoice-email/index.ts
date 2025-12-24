// =====================================================
// SEND INVOICE EMAIL - EDGE FUNCTION
// Created: 2025-11-03
// Updated: 2025-12-24 - Migrated to Resend
// Description: Send invoice emails with PDF/Excel attachments via Resend
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { Resend } from "npm:resend@2.0.0";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
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

    // Initialize Resend
    const resend = new Resend(RESEND_API_KEY)

    // Prepare attachments in Resend format
    const resendAttachments = (request.attachments || []).map(att => ({
      content: att.content, // base64 string
      filename: att.filename,
    }))

    console.log(`📎 Attaching ${resendAttachments.length} file(s)`)

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM_ADDRESS}>`,
      to: request.recipients,
      ...(request.cc && request.cc.length > 0 && { cc: request.cc }),
      ...(request.bcc && request.bcc.length > 0 && { bcc: request.bcc }),
      ...(request.reply_to && { reply_to: request.reply_to }),
      subject: request.subject,
      html: emailHtml,
      attachments: resendAttachments.length > 0 ? resendAttachments : undefined,
      tags: [
        { name: 'type', value: 'invoice' },
        { name: 'dealership_id', value: String(request.dealership_id) }
      ]
    })

    if (error) {
      console.error('❌ Resend API error:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log('✅ Email sent successfully via Resend:', data?.id)

    // Update email history status
    const { error: updateError } = await supabase
      .from('invoice_email_history')
      .update({
        status: 'sent',
        provider_response: { message_id: data?.id },
      })
      .eq('id', request.email_history_id)

    if (updateError) {
      console.error('⚠️ Failed to update email history:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_id: data?.id,
        message: 'Email sent successfully via Resend',
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
