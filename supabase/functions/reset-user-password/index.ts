import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { supabase } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { userId, resetType, tempPassword, forceChange, dealerId } = await req.json();

    console.log('Password reset request:', { userId, resetType, dealerId, adminId: user.id });

    // Verify admin has permission to reset passwords
    const { data: membership } = await supabase
      .from('dealer_memberships')
      .select('dealer_id')
      .eq('user_id', user.id)
      .eq('dealer_id', dealerId)
      .eq('is_active', true)
      .single();

    if (!membership) {
      throw new Error('No dealer membership found');
    }

    // Generate reset token
    const resetToken = crypto.randomUUID();

    // Create password reset request
    const { data: resetRequest, error: resetError } = await supabase
      .from('password_reset_requests')
      .insert({
        user_id: userId,
        admin_id: user.id,
        token: resetToken,
        request_type: resetType,
        temp_password: tempPassword || null,
        force_change_on_login: forceChange || false,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        metadata: {
          dealer_id: dealerId,
          reset_by_admin: true
        }
      })
      .select()
      .single();

    if (resetError) {
      console.error('Error creating reset request:', resetError);
      throw new Error('Failed to create password reset request');
    }

    // Log the activity
    await supabase
      .from('user_activity_log')
      .insert({
        user_id: userId,
        action_type: 'password_reset_initiated',
        action_description: `Password reset initiated by admin (${resetType})`,
        details: {
          admin_id: user.id,
          reset_type: resetType,
          force_change: forceChange,
          dealer_id: dealerId
        }
      });

    // Send password reset email
    let emailSent = false;
    if (resetType === 'email_reset' || resetType === 'temp_password' || resetType === 'force_change') {
      try {
        console.log('Sending password reset email...');

        // Get user profile for email
        const { data: userProfile, error: userError } = await supabase
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', userId)
          .single();

        if (userError) {
          console.error('Error fetching user profile:', userError);
          throw new Error('User profile not found');
        }

        // Get dealership details
        const { data: dealerProfile, error: dealerError } = await supabase
          .from('dealerships')
          .select('name')
          .eq('id', dealerId)
          .single();

        if (dealerError) {
          console.error('Error fetching dealership:', dealerError);
          throw new Error('Dealership not found');
        }

        // Get admin profile
        const { data: adminProfile, error: adminError } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        if (adminError) {
          console.error('Error fetching admin profile:', adminError);
          throw new Error('Admin profile not found');
        }

        // Call send-password-reset-email Edge Function
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-password-reset-email', {
          body: {
            resetRequestId: resetRequest.id,
            userEmail: userProfile.email,
            userName: `${userProfile.first_name} ${userProfile.last_name}`.trim() || userProfile.email,
            resetType,
            tempPassword: tempPassword || undefined,
            dealershipName: dealerProfile.name,
            adminName: `${adminProfile.first_name} ${adminProfile.last_name}`.trim() || 'Administrator'
          }
        });

        if (emailError) {
          console.error('Failed to send reset email:', emailError);
          // Don't fail the request, just log the error
        } else {
          console.log('Password reset email sent successfully:', emailData);
          emailSent = true;
        }
      } catch (error) {
        console.error('Error sending reset email:', error);
        // Don't fail the request, continue with success response
      }
    }

    const response = {
      success: true,
      resetRequestId: resetRequest.id,
      resetToken: resetToken,
      expiresAt: resetRequest.expires_at,
      emailSent,
      message: resetType === 'email_reset'
        ? 'Password reset email sent to user'
        : resetType === 'temp_password'
        ? 'Temporary password generated and sent to user'
        : 'User will be forced to change password on next login'
    };

    console.log('Password reset successful:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in reset-user-password function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);