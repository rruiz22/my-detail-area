import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SMSTestRequest {
  provider: 'twilio' | 'aws_sns';
  account_sid: string;
  auth_token: string;
  from_number: string;
  test_phone: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('SMS test function started')
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

    const { provider, account_sid, auth_token, from_number, test_phone }: SMSTestRequest = await req.json()

    // Validate required fields
    if (!provider || !account_sid || !auth_token || !from_number || !test_phone) {
      throw new Error('Missing required fields')
    }

    let testResult;

    switch (provider) {
      case 'twilio':
        testResult = await testTwilio(account_sid, auth_token, from_number, test_phone)
        break
      case 'aws_sns':
        testResult = await testAWSSNS(account_sid, auth_token, from_number, test_phone)
        break
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SMS test completed successfully',
        details: testResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('SMS test error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })

    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'SMS test failed',
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

async function testTwilio(accountSid: string, authToken: string, fromNumber: string, testPhone: string) {
  // Format phone numbers (ensure they start with +1 for US numbers)
  const formattedFrom = formatPhoneNumber(fromNumber)
  const formattedTo = formatPhoneNumber(testPhone)

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

  const body = new URLSearchParams({
    To: formattedTo,
    From: formattedFrom,
    Body: `SMS Configuration Test - My Detail Area

This is a test message to verify your Twilio SMS configuration is working correctly.

Provider: Twilio
From: ${formattedFrom}
To: ${formattedTo}
Test Time: ${new Date().toISOString()}

This message was sent from My Detail Area system settings test.`
  })

  const response = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    const errorData = await response.text()
    let errorMessage = `Twilio API error: ${response.status}`

    try {
      const errorJson = JSON.parse(errorData)
      if (errorJson.message) {
        errorMessage += ` - ${errorJson.message}`
      }
      if (errorJson.code) {
        errorMessage += ` (Code: ${errorJson.code})`
      }
    } catch {
      errorMessage += ` - ${errorData}`
    }

    throw new Error(errorMessage)
  }

  const result = await response.json()
  return {
    provider: 'twilio',
    message_sid: result.sid,
    status: result.status,
    to: formattedTo,
    from: formattedFrom,
    account_sid: accountSid,
    timestamp: new Date().toISOString()
  }
}

async function testAWSSNS(accountSid: string, authToken: string, fromNumber: string, testPhone: string) {
  // AWS SNS implementation placeholder
  throw new Error('AWS SNS testing not implemented yet - use Twilio for now')
}

function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '')

  // Add +1 if it's a US number (10 digits)
  if (cleaned.length === 10) {
    return `+1${cleaned}`
  }

  // If it already has country code, ensure it starts with +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`
  }

  // If it starts with +, return as is
  if (phone.startsWith('+')) {
    return phone
  }

  // Otherwise, add + prefix
  return `+${cleaned}`
}