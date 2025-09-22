import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SMTPTestRequest {
  provider: 'resend' | 'sendgrid' | 'mailgun';
  api_key: string;
  from_email: string;
  from_name: string;
  test_email: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('SMTP test function started')
    console.log('Request method:', req.method)
    console.log('Request URL:', req.url)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Verify user is authenticated and is system admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Authentication failed')
    }

    // Check if user is system admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'system_admin') {
      throw new Error('Access denied - System administrator required')
    }

    const { provider, api_key, from_email, from_name, test_email }: SMTPTestRequest = await req.json()

    // Validate required fields
    if (!provider || !api_key || !from_email || !test_email) {
      throw new Error('Missing required fields')
    }

    let testResult;

    switch (provider) {
      case 'resend':
        testResult = await testResend(api_key, from_email, from_name, test_email)
        break
      case 'sendgrid':
        testResult = await testSendGrid(api_key, from_email, from_name, test_email)
        break
      case 'mailgun':
        testResult = await testMailgun(api_key, from_email, from_name, test_email)
        break
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SMTP test completed successfully',
        details: testResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('SMTP test error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })

    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'SMTP test failed',
        details: {
          error_type: error.name,
          timestamp: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function testResend(apiKey: string, fromEmail: string, fromName: string, testEmail: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [testEmail],
      subject: 'SMTP Test - My Detail Area',
      html: `
        <h2>SMTP Configuration Test</h2>
        <p>This is a test email to verify your Resend SMTP configuration is working correctly.</p>
        <p><strong>Provider:</strong> Resend</p>
        <p><strong>From:</strong> ${fromName} &lt;${fromEmail}&gt;</p>
        <p><strong>Test Time:</strong> ${new Date().toISOString()}</p>
        <hr>
        <p><small>This email was sent from My Detail Area system settings test.</small></p>
      `,
    }),
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Resend API error: ${response.status} - ${errorData}`)
  }

  const result = await response.json()
  return {
    provider: 'resend',
    message_id: result.id,
    status: 'sent',
    timestamp: new Date().toISOString()
  }
}

async function testSendGrid(apiKey: string, fromEmail: string, fromName: string, testEmail: string) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: testEmail }] }],
      from: { email: fromEmail, name: fromName },
      subject: 'SMTP Test - My Detail Area',
      content: [{
        type: 'text/html',
        value: `
          <h2>SMTP Configuration Test</h2>
          <p>This is a test email to verify your SendGrid SMTP configuration is working correctly.</p>
          <p><strong>Provider:</strong> SendGrid</p>
          <p><strong>From:</strong> ${fromName} &lt;${fromEmail}&gt;</p>
          <p><strong>Test Time:</strong> ${new Date().toISOString()}</p>
          <hr>
          <p><small>This email was sent from My Detail Area system settings test.</small></p>
        `
      }]
    }),
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`SendGrid API error: ${response.status} - ${errorData}`)
  }

  return {
    provider: 'sendgrid',
    status: 'sent',
    timestamp: new Date().toISOString()
  }
}

async function testMailgun(apiKey: string, fromEmail: string, fromName: string, testEmail: string) {
  // Note: This is a simplified implementation
  // In production, you'd need the Mailgun domain and proper endpoint
  throw new Error('Mailgun testing not implemented yet - use Resend or SendGrid for now')
}