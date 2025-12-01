import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { create, verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Use REMOTE_KIOSK_JWT_SECRET for signing remote kiosk tokens
// This should be a strong secret key configured in Supabase Edge Function secrets
const jwtSecret = Deno.env.get('REMOTE_KIOSK_JWT_SECRET') ||
                  Deno.env.get('JWT_SECRET') ||
                  Deno.env.get('SUPABASE_JWT_SECRET');

// Use service role client for server operations
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RemoteKioskRequest {
  employeeId: string;
  dealershipId: number;
  createdBy: string; // User ID of manager creating the token
  expirationHours: number; // 1-8 hours
  maxUses?: number; // Default: 1 (one-time use)
}

interface RemoteKioskResponse {
  success: boolean;
  tokenId?: string;
  shortCode?: string;
  fullUrl?: string;
  expiresAt?: string;
  error?: string;
}

/**
 * Generate SHA-256 hash of input string
 */
async function sha256Hash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate random alphanumeric code (A-Z, 0-9)
 */
function generateRandomCode(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }

  return result;
}

/**
 * Generate unique short code for mda.to
 * Format: RMT{ABC12} - 8 characters total (RMT prefix + 5 random chars)
 * Note: mda.to API only accepts alphanumeric custom slugs (no hyphens or special chars)
 */
async function generateUniqueShortCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const randomPart = generateRandomCode(5); // 5 characters
    const shortCode = `RMT${randomPart}`; // Simple alphanumeric format

    // Check if code already exists
    const { data, error } = await supabase
      .from('remote_kiosk_tokens')
      .select('id')
      .eq('short_code', shortCode)
      .maybeSingle();

    if (error) {
      console.error('Error checking short code uniqueness:', error);
      throw new Error('Failed to verify short code uniqueness');
    }

    if (!data) {
      // Code is unique
      return shortCode;
    }

    attempts++;
  }

  throw new Error('Failed to generate unique short code after 10 attempts');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate required environment variables
    const mdaApiKey = Deno.env.get("MDA_TO_API_KEY");
    if (!mdaApiKey) {
      throw new Error("MDA_TO_API_KEY not configured");
    }

    if (!jwtSecret || jwtSecret.length === 0) {
      console.error('[Remote Kiosk] JWT secret not configured or empty');
      throw new Error("JWT secret not configured. Please set REMOTE_KIOSK_JWT_SECRET in Supabase Edge Function secrets.");
    }

    const {
      employeeId,
      dealershipId,
      createdBy,
      expirationHours,
      maxUses = 1
    }: RemoteKioskRequest = await req.json();

    console.log('[Remote Kiosk] Request received:', {
      employeeId,
      dealershipId,
      createdBy,
      expirationHours,
      maxUses
    });

    // Validation
    if (!employeeId || !dealershipId || !createdBy) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: employeeId, dealershipId, or createdBy'
        } as RemoteKioskResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    if (expirationHours < 1 || expirationHours > 8) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Expiration hours must be between 1 and 8'
        } as RemoteKioskResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    if (maxUses < 1 || maxUses > 100) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Max uses must be between 1 and 100'
        } as RemoteKioskResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    console.log(`[Remote Kiosk] Generating URL for employee ${employeeId}, dealer ${dealershipId}`);

    // Verify employee exists and belongs to dealership
    const { data: employee, error: employeeError } = await supabase
      .from('detail_hub_employees')
      .select('id, first_name, last_name, employee_number, pin_code')
      .eq('id', employeeId)
      .eq('dealership_id', dealershipId)
      .eq('status', 'active')
      .single();

    if (employeeError || !employee) {
      console.error('[Remote Kiosk] Employee not found or inactive:', employeeError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Employee not found or inactive'
        } as RemoteKioskResponse),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    // Verify manager has permission to create tokens
    // First check profile role (for supermanagers/system_admins with global access)
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', createdBy)
      .single();

    if (profileError || !userProfile) {
      console.error('[Remote Kiosk] User profile not found:', profileError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized: User not found'
        } as RemoteKioskResponse),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    // Allow system_admin and supermanager at profile level (they have global access)
    const allowedProfileRoles = ['system_admin', 'supermanager'];
    const hasGlobalAccess = allowedProfileRoles.includes(userProfile.role);

    if (hasGlobalAccess) {
      console.log(`[Remote Kiosk] Access granted via profile role: ${userProfile.role}`);
      // Skip membership role check - these roles have global access
    } else {
      // For regular users, check dealer_memberships role
      const { data: membership, error: membershipError } = await supabase
        .from('dealer_memberships')
        .select('role')
        .eq('user_id', createdBy)
        .eq('dealer_id', dealershipId)
        .single();

      if (membershipError || !membership) {
        console.error('[Remote Kiosk] Manager not found:', membershipError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Unauthorized: Not a member of this dealership'
          } as RemoteKioskResponse),
          {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      }

      const allowedMembershipRoles = ['dealer_admin', 'dealer_manager'];
      if (!allowedMembershipRoles.includes(membership.role)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Unauthorized: Insufficient permissions (requires manager or admin role)'
          } as RemoteKioskResponse),
          {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      }

      console.log(`[Remote Kiosk] Access granted via membership role: ${membership.role}`);
    }

    // Generate unique short code
    const shortCode = await generateUniqueShortCode();
    console.log(`[Remote Kiosk] Generated short code: ${shortCode}`);

    // Calculate expiration timestamp
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    // Create JWT token
    const tokenPayload = {
      sub: employeeId, // Employee ID
      dealer: dealershipId,
      type: 'remote_kiosk',
      code: shortCode,
      exp: Math.floor(expiresAt.getTime() / 1000), // Unix timestamp in seconds
      iat: Math.floor(Date.now() / 1000)
    };

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const jwt = await create(
      { alg: 'HS256', typ: 'JWT' },
      tokenPayload,
      key
    );

    console.log(`[Remote Kiosk] Generated JWT token (expires in ${expirationHours}h)`);

    // Hash the token for secure storage
    const tokenHash = await sha256Hash(jwt);

    // Generate full URL (will be used as redirect URL for mda.to)
    // Priority: BASE_URL (production) → DEV_BASE_URL (local testing) → default
    let appUrl = Deno.env.get("BASE_URL") || Deno.env.get("DEV_BASE_URL") || "https://dds.mydetailarea.com";
    if (appUrl.endsWith('/')) {
      appUrl = appUrl.slice(0, -1);
    }

    const remoteKioskUrl = `${appUrl}/remote-kiosk?token=${jwt}`;

    console.log(`[Remote Kiosk] Using app URL: ${appUrl}`);

    // Convert short code to lowercase for consistency with mda.to
    const shortCodeLower = shortCode.toLowerCase();
    const fullUrl = `https://mda.to/${shortCodeLower}`;

    console.log(`[Remote Kiosk] Creating mda.to shortlink: ${fullUrl} → ${remoteKioskUrl}`);

    // Create short link using mda.to API
    try {
      const shortLinkResponse = await fetch("https://mda.to/api/url/add", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${mdaApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: remoteKioskUrl,
          custom: shortCodeLower, // Use lowercase for mda.to
          status: "private",
          description: `Remote Kiosk - ${employee.first_name} ${employee.last_name} (#${employee.employee_number})`
        }),
      });

      if (!shortLinkResponse.ok) {
        const errorText = await shortLinkResponse.text();
        console.error(`[Remote Kiosk] mda.to API error: ${shortLinkResponse.status} - ${errorText}`);
        throw new Error(`mda.to API failed: ${shortLinkResponse.status}`);
      }

      const contentType = shortLinkResponse.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const shortLinkData = await shortLinkResponse.json();

        if (shortLinkData.error !== 0) {
          console.error(`[Remote Kiosk] mda.to API returned error: ${shortLinkData.message}`);
          throw new Error(shortLinkData.message || 'Unknown mda.to API error');
        }

        console.log(`[Remote Kiosk] ✅ mda.to shortlink created successfully`);
      }
    } catch (err: any) {
      console.error('[Remote Kiosk] Failed to create mda.to shortlink:', err.message);
      throw new Error(`Failed to create short link: ${err.message}`);
    }

    // Store token in database
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('remote_kiosk_tokens')
      .insert({
        token_hash: tokenHash,
        short_code: shortCodeLower, // Store lowercase version
        full_url: fullUrl,
        dealership_id: dealershipId,
        employee_id: employeeId,
        created_by: createdBy,
        expires_at: expiresAt.toISOString(),
        max_uses: maxUses,
        status: 'active'
      })
      .select('id')
      .single();

    if (tokenError) {
      console.error('[Remote Kiosk] Failed to store token in database:', tokenError);
      throw new Error('Failed to store token in database');
    }

    console.log(`[Remote Kiosk] ✅ Token stored in database (ID: ${tokenRecord.id})`);

    return new Response(
      JSON.stringify({
        success: true,
        tokenId: tokenRecord.id,
        shortCode: shortCodeLower, // Return lowercase version
        fullUrl,
        expiresAt: expiresAt.toISOString()
      } as RemoteKioskResponse),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("[Remote Kiosk] Error generating URL:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      } as RemoteKioskResponse),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        },
      }
    );
  }
};

serve(handler);
