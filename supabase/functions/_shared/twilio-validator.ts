/**
 * Twilio Webhook Signature Validation
 * Verifies that incoming webhooks are actually from Twilio using HMAC-SHA1
 *
 * Security: Prevents spoofed webhooks from unauthorized sources
 * Reference: https://www.twilio.com/docs/usage/security#validating-requests
 */

/**
 * Validates a Twilio webhook request signature
 * @param twilioSignature - X-Twilio-Signature header value
 * @param url - Full webhook URL (including https://)
 * @param params - Webhook parameters (from formData)
 * @param authToken - Twilio auth token (from env)
 * @returns true if signature is valid, false otherwise
 */
export async function validateTwilioSignature(
  twilioSignature: string | null,
  url: string,
  params: Record<string, any>,
  authToken: string
): Promise<boolean> {
  if (!twilioSignature) {
    console.warn('⚠️ No X-Twilio-Signature header found');
    return false;
  }

  try {
    // 1. Sort parameters alphabetically by key
    const sortedKeys = Object.keys(params).sort();

    // 2. Concatenate URL + sorted params in format: key1value1key2value2...
    let dataString = url;
    for (const key of sortedKeys) {
      dataString += key + params[key];
    }

    // 3. Compute HMAC-SHA1 signature using auth token as key
    const encoder = new TextEncoder();
    const keyData = encoder.encode(authToken);
    const messageData = encoder.encode(dataString);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

    // 4. Convert signature to base64
    const signatureArray = new Uint8Array(signature);
    const signatureBase64 = btoa(String.fromCharCode(...signatureArray));

    // 5. Compare with Twilio's signature (constant-time comparison)
    const isValid = constantTimeCompare(signatureBase64, twilioSignature);

    if (isValid) {
      console.log('✅ Twilio signature validated successfully');
    } else {
      console.error('❌ Invalid Twilio signature');
      console.error('Expected:', signatureBase64);
      console.error('Received:', twilioSignature);
    }

    return isValid;

  } catch (error) {
    console.error('Error validating Twilio signature:', error);
    return false;
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns true if strings match, false otherwise
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Middleware function to validate Twilio webhook
 * Returns error response if signature is invalid
 */
export async function requireValidTwilioSignature(
  req: Request,
  params: Record<string, any>,
  authToken: string,
  corsHeaders: Record<string, string>
): Promise<Response | null> {
  const twilioSignature = req.headers.get('x-twilio-signature');
  const url = req.url;

  const isValid = await validateTwilioSignature(
    twilioSignature,
    url,
    params,
    authToken
  );

  if (!isValid) {
    console.error('🚨 Unauthorized webhook request - invalid signature');
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unauthorized - invalid signature'
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }

  // Signature is valid, return null (no error)
  return null;
}
