import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Use same JWT secret as generate-remote-kiosk-url
const jwtSecret = Deno.env.get('REMOTE_KIOSK_JWT_SECRET') ||
                  Deno.env.get('JWT_SECRET') ||
                  Deno.env.get('SUPABASE_JWT_SECRET');

// Use service role client for server operations
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidatePunchRequest {
  token: string;
  pin: string;
  action: 'clock_in' | 'clock_out' | 'start_break' | 'end_break';
  photoBase64: string | null;
  ipAddress: string | null;
  userAgent: string;
  // GPS location (mandatory for remote punches)
  latitude: number;
  longitude: number;
  address: string;
  locationAccuracy: number;
}

interface ValidatePunchResponse {
  success: boolean;
  message?: string;
  error?: string;
}

async function sha256Hash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!jwtSecret || jwtSecret.length === 0) {
      console.error('[Remote Kiosk Punch] JWT secret not configured');
      throw new Error("JWT secret not configured");
    }

    const {
      token,
      pin,
      action,
      photoBase64,
      ipAddress,
      userAgent,
      latitude,
      longitude,
      address,
      locationAccuracy
    }: ValidatePunchRequest = await req.json();

    console.log('[Remote Kiosk Punch] Validating:', {
      action,
      hasPhoto: !!photoBase64,
      hasGPS: !!(latitude && longitude),
      accuracy: locationAccuracy
    });

    // ✅ VALIDATE GPS LOCATION (mandatory)
    if (!latitude || !longitude || !address) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'GPS location is required for remote punches. Please enable location permissions.'
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify JWT
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    let payload: any;
    try {
      payload = await verify(token, key);
    } catch (err) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (payload.type !== 'remote_kiosk' || payload.exp < Math.floor(Date.now() / 1000)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const employeeId = payload.sub;
    const dealershipId = payload.dealer;

    // Verify employee and PIN
    const { data: employee, error: employeeError } = await supabase
      .from('detail_hub_employees')
      .select('id, first_name, last_name, pin_code, status')
      .eq('id', employeeId)
      .eq('dealership_id', dealershipId)
      .single();

    if (employeeError || !employee || employee.status !== 'active') {
      return new Response(
        JSON.stringify({ success: false, error: 'Employee not found' }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if employee has PIN configured
    if (!employee.pin_code || employee.pin_code.trim() === '') {
      console.error('[Remote Kiosk Punch] Employee has no PIN configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Employee has no PIN configured. Please contact your manager.' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify PIN
    if (employee.pin_code !== pin) {
      console.error('[Remote Kiosk Punch] Invalid PIN provided');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid PIN' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Upload photo if provided (for clock_in or clock_out)
    let photoUrl: string | null = null;
    if (photoBase64 && (action === 'clock_in' || action === 'clock_out')) {
      try {
        console.log('[Remote Kiosk Punch] Processing photo upload...');

        // Remove data:image/jpeg;base64, prefix if present
        const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');

        // Convert base64 to Uint8Array
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Generate unique filename: dealership/employee/action_timestamp.jpg
        const timestamp = Date.now();
        const filename = `${dealershipId}/${employeeId}/${action}_${timestamp}.jpg`;

        console.log('[Remote Kiosk Punch] Uploading photo to:', filename);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('time-clock-photos')
          .upload(filename, bytes, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('[Remote Kiosk Punch] Photo upload failed:', uploadError);
          // Don't fail the entire request if photo upload fails
        } else {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('time-clock-photos')
            .getPublicUrl(filename);

          photoUrl = urlData.publicUrl;
          console.log('[Remote Kiosk Punch] ✅ Photo uploaded successfully:', photoUrl);
        }
      } catch (err) {
        console.error('[Remote Kiosk Punch] Photo processing error:', err);
        // Don't fail the entire request if photo processing fails
      }
    }

    // Handle different punch actions based on existing table structure
    let timeEntryError: any;

    if (action === 'clock_in') {
      // Create new time entry for clock in
      const { error } = await supabase
        .from('detail_hub_time_entries')
        .insert({
          employee_id: employeeId,
          dealership_id: dealershipId,
          clock_in: new Date().toISOString(),
          punch_in_method: 'pin',
          photo_in_url: photoUrl,
          ip_address: ipAddress,
          user_agent: userAgent,
          kiosk_id: 'REMOTE_KIOSK',
          // GPS location
          punch_in_latitude: latitude,
          punch_in_longitude: longitude,
          punch_in_address: address,
          punch_in_accuracy: locationAccuracy,
          status: 'active'
        });
      timeEntryError = error;

    } else if (action === 'clock_out') {
      // Get active time entry
      const { data: activeEntry, error: fetchError } = await supabase
        .from('detail_hub_time_entries')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('status', 'active')
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError || !activeEntry) {
        return new Response(
          JSON.stringify({ success: false, error: 'No active clock-in found' }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { error } = await supabase
        .from('detail_hub_time_entries')
        .update({
          clock_out: new Date().toISOString(),
          punch_out_method: 'pin',
          photo_out_url: photoUrl,
          // GPS location
          punch_out_latitude: latitude,
          punch_out_longitude: longitude,
          punch_out_address: address,
          punch_out_accuracy: locationAccuracy
        })
        .eq('id', activeEntry.id);
      timeEntryError = error;

    } else if (action === 'start_break') {
      // Get active time entry
      const { data: activeEntry, error: fetchError } = await supabase
        .from('detail_hub_time_entries')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('status', 'active')
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError || !activeEntry) {
        return new Response(
          JSON.stringify({ success: false, error: 'No active clock-in found' }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { error } = await supabase
        .from('detail_hub_time_entries')
        .update({ break_start: new Date().toISOString() })
        .eq('id', activeEntry.id);
      timeEntryError = error;

    } else if (action === 'end_break') {
      // Get active time entry with break_start
      const { data: activeEntry, error: fetchError } = await supabase
        .from('detail_hub_time_entries')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('status', 'active')
        .is('clock_out', null)
        .not('break_start', 'is', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError || !activeEntry) {
        return new Response(
          JSON.stringify({ success: false, error: 'No active break found' }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { error } = await supabase
        .from('detail_hub_time_entries')
        .update({ break_end: new Date().toISOString() })
        .eq('id', activeEntry.id);
      timeEntryError = error;
    }

    if (timeEntryError) {
      console.error('[Remote Kiosk Punch] Failed to create time entry:', timeEntryError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to record time entry' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ✅ Update token usage and last used metadata
    const tokenHash = await sha256Hash(token);

    // Get current token to increment uses
    const { data: currentToken } = await supabase
      .from('remote_kiosk_tokens')
      .select('current_uses')
      .eq('token_hash', tokenHash)
      .single();

    const { error: tokenUpdateError } = await supabase
      .from('remote_kiosk_tokens')
      .update({
        current_uses: (currentToken?.current_uses || 0) + 1,
        last_used_at: new Date().toISOString(),
        last_used_ip: ipAddress,
        last_used_user_agent: userAgent,
        // GPS location
        last_used_latitude: latitude,
        last_used_longitude: longitude,
        last_used_address: address,
        updated_at: new Date().toISOString()
      })
      .eq('token_hash', tokenHash);

    if (tokenUpdateError) {
      console.error('[Remote Kiosk Punch] Failed to update token usage:', tokenUpdateError);
      // Don't fail the punch if token update fails
    }

    const actionMessages = {
      clock_in: 'Clocked in successfully',
      clock_out: 'Clocked out successfully',
      start_break: 'Break started',
      end_break: 'Break ended'
    };

    return new Response(
      JSON.stringify({ success: true, message: actionMessages[action] }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[Remote Kiosk Punch] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
