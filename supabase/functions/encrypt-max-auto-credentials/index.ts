import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EncryptRequest {
  dealerId: number;
  username: string;
  password: string;
  autoSyncEnabled: boolean;
  syncFrequencyHours: 6 | 12 | 24;
}

/**
 * Encrypt text using AES-256-GCM with Web Crypto API
 */
async function encrypt(text: string, keyHex: string): Promise<{ encrypted: string; iv: string; tag: string }> {
  const encoder = new TextEncoder();

  // Convert hex key to ArrayBuffer
  const keyBuffer = new Uint8Array(keyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

  // Import key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(text)
  );

  // Convert to base64
  const encryptedArray = new Uint8Array(encryptedBuffer);
  const encrypted = btoa(String.fromCharCode(...encryptedArray));
  const ivBase64 = btoa(String.fromCharCode(...iv));

  // GCM includes authentication tag in the encrypted data
  // For compatibility with Railway bot, we set tag to empty string
  return {
    encrypted,
    iv: ivBase64,
    tag: ''
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get encryption key from secrets
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY not configured in Supabase secrets');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse request
    const { dealerId, username, password, autoSyncEnabled, syncFrequencyHours } = await req.json() as EncryptRequest;

    // Validate inputs
    if (!dealerId || !username || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: dealerId, username, password' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (![6, 12, 24].includes(syncFrequencyHours)) {
      return new Response(
        JSON.stringify({ error: 'syncFrequencyHours must be 6, 12, or 24' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[Dealer ${dealerId}] Encrypting credentials`);

    // Encrypt credentials
    const usernameEncrypted = await encrypt(username, encryptionKey);
    const passwordEncrypted = await encrypt(password, encryptionKey);

    console.log(`[Dealer ${dealerId}] Credentials encrypted successfully`);

    // Upsert configuration
    const { data, error } = await supabaseClient
      .from('dealer_max_auto_config')
      .upsert({
        dealer_id: dealerId,
        auto_sync_enabled: autoSyncEnabled,
        sync_frequency_hours: syncFrequencyHours,
        username_encrypted: usernameEncrypted.encrypted,
        username_iv: usernameEncrypted.iv,
        username_tag: usernameEncrypted.tag,
        password_encrypted: passwordEncrypted.encrypted,
        password_iv: passwordEncrypted.iv,
        password_tag: passwordEncrypted.tag,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'dealer_id'
      })
      .select()
      .single();

    if (error) {
      console.error(`[Dealer ${dealerId}] Database error:`, error);
      throw error;
    }

    console.log(`[Dealer ${dealerId}] Configuration saved successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        config: data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error encrypting credentials:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
