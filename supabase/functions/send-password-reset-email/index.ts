import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

interface PasswordResetEmailRequest {
  resetRequestId: string;
  userEmail: string;
  userName: string;
  resetType: 'email_reset' | 'temp_password' | 'force_change';
  tempPassword?: string;
  dealershipName: string;
  adminName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[PASSWORD RESET EMAIL] Starting email send process');

    // Validate environment variables
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Parse request body
    const requestBody: PasswordResetEmailRequest = await req.json();
    const {
      resetRequestId,
      userEmail,
      userName,
      resetType,
      tempPassword,
      dealershipName,
      adminName
    } = requestBody;

    console.log('[PASSWORD RESET EMAIL] Request details:', {
      resetRequestId,
      userEmail,
      resetType,
      hasTempPassword: !!tempPassword
    });

    // Get base URL for reset links
    const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://dds.mydetailarea.com';

    // Get reset token from database
    const { data: resetRequest, error: fetchError } = await supabase
      .from('password_reset_requests')
      .select('token')
      .eq('id', resetRequestId)
      .single();

    if (fetchError || !resetRequest) {
      console.error('[PASSWORD RESET EMAIL] Reset request not found:', fetchError);
      throw new Error('Reset request not found');
    }

    const resetLink = `${baseUrl}/reset-password/${resetRequest.token}`;

    // Create email template based on reset type
    const template = createEmailTemplate({
      resetType,
      userName,
      dealershipName,
      adminName,
      resetLink,
      tempPassword
    });

    console.log('[PASSWORD RESET EMAIL] Sending email via Resend to:', userEmail);

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: `${dealershipName} <noreply@mydetailarea.com>`,
      to: [userEmail],
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: [
        { name: 'type', value: 'password_reset' },
        { name: 'reset_type', value: resetType }
      ]
    });

    if (error) {
      console.error('[PASSWORD RESET EMAIL] Resend error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log('[PASSWORD RESET EMAIL] Email sent successfully:', data?.id);

    // Update reset request with email sent status
    await supabase
      .from('password_reset_requests')
      .update({
        metadata: { email_sent: true, email_id: data?.id },
        updated_at: new Date().toISOString()
      })
      .eq('id', resetRequestId);

    return new Response(
      JSON.stringify({ success: true, emailId: data?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[PASSWORD RESET EMAIL] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
};

function createEmailTemplate({
  resetType,
  userName,
  dealershipName,
  adminName,
  resetLink,
  tempPassword
}: {
  resetType: string;
  userName: string;
  dealershipName: string;
  adminName: string;
  resetLink: string;
  tempPassword?: string;
}) {
  // Email Reset Link Template
  if (resetType === 'email_reset') {
    return {
      subject: `Password Reset Request - ${dealershipName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; padding: 20px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <!-- Header -->
            <div style="background: white; padding: 32px 24px; border-bottom: 2px solid #e5e7eb;">
              <h1 style="color: #111827; font-size: 22px; margin: 0; font-weight: 600;">Password Reset Request</h1>
            </div>

            <!-- Content -->
            <div style="padding: 40px 32px;">
              <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 15px;">Hello <strong style="color: #111827;">${userName}</strong>,</p>
              <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 15px;">
                <strong style="color: #111827;">${adminName}</strong> from ${dealershipName} has initiated a password reset for your account.
              </p>
              <p style="color: #6b7280; margin: 0 0 32px 0; font-size: 15px;">
                Click the button below to reset your password. This link will expire in 24 hours.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 36px 0;">
                <a href="${resetLink}" style="display: inline-block; background: white; color: #10b981; border: 2px solid #10b981; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; transition: all 0.2s;">
                  Reset Password
                </a>
              </div>

              <!-- Warning Box -->
              <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px 20px; margin-top: 32px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                  <strong style="display: block; margin-bottom: 4px;">⚠️ Important</strong>
                  This link expires in 24 hours. If you didn't request this password reset, please contact your administrator immediately.
                </p>
              </div>

              <!-- Alternative Link -->
              <p style="color: #9ca3af; font-size: 13px; margin: 24px 0 0 0; line-height: 1.5;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetLink}" style="color: #6366f1; word-break: break-all;">${resetLink}</a>
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f9fafb; padding: 24px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 6px 0;">My Detail Area - Professional Dealership Management</p>
              <p style="margin: 6px 0;">&copy; ${new Date().getFullYear()} My Detail Area. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Password Reset Request

Hello ${userName},

${adminName} from ${dealershipName} has initiated a password reset for your account.

Click this link to reset your password:
${resetLink}

This link expires in 24 hours.

⚠️ IMPORTANT: If you didn't request this password reset, please contact your administrator immediately.

---
My Detail Area - Professional Dealership Management
© ${new Date().getFullYear()} My Detail Area. All rights reserved.`
    };
  }

  // Temporary Password Template
  else if (resetType === 'temp_password') {
    return {
      subject: `Temporary Password - ${dealershipName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; padding: 20px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <!-- Header -->
            <div style="background: white; padding: 32px 24px; border-bottom: 2px solid #e5e7eb;">
              <h1 style="color: #111827; font-size: 22px; margin: 0; font-weight: 600;">Temporary Password</h1>
            </div>

            <!-- Content -->
            <div style="padding: 40px 32px;">
              <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 15px;">Hello <strong style="color: #111827;">${userName}</strong>,</p>
              <p style="color: #6b7280; margin: 0 0 32px 0; font-size: 15px;">
                <strong style="color: #111827;">${adminName}</strong> has generated a temporary password for your account at ${dealershipName}.
              </p>

              <!-- Password Box -->
              <div style="background: #f3f4f6; border: 2px solid #e5e7eb; border-radius: 8px; padding: 28px; margin: 32px 0; text-align: center;">
                <h3 style="color: #111827; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Your Temporary Password</h3>
                <div style="font-family: 'Courier New', monospace; font-size: 24px; font-weight: 700; color: #111827; letter-spacing: 3px; background: white; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb;">
                  ${tempPassword}
                </div>
              </div>

              <!-- Warning Box -->
              <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px 20px; margin-top: 32px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                  <strong style="display: block; margin-bottom: 4px;">🔒 Important</strong>
                  You will be required to change this password on your next login for security purposes.
                </p>
              </div>

              <!-- Login Link -->
              <div style="text-align: center; margin: 36px 0 0 0;">
                <a href="${resetLink.replace('/reset-password/', '/auth')}" style="display: inline-block; background: white; color: #10b981; border: 2px solid #10b981; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
                  Go to Login
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f9fafb; padding: 24px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 6px 0;">My Detail Area - Professional Dealership Management</p>
              <p style="margin: 6px 0;">&copy; ${new Date().getFullYear()} My Detail Area. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Temporary Password

Hello ${userName},

${adminName} has generated a temporary password for your account at ${dealershipName}.

YOUR TEMPORARY PASSWORD: ${tempPassword}

🔒 IMPORTANT: You will be required to change this password on your next login for security purposes.

Login here: ${resetLink.replace('/reset-password/', '/auth')}

---
My Detail Area - Professional Dealership Management
© ${new Date().getFullYear()} My Detail Area. All rights reserved.`
    };
  }

  // Force Change on Login Template
  else {
    return {
      subject: `Password Change Required - ${dealershipName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; padding: 20px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <!-- Header -->
            <div style="background: white; padding: 32px 24px; border-bottom: 2px solid #e5e7eb;">
              <h1 style="color: #111827; font-size: 22px; margin: 0; font-weight: 600;">Password Change Required</h1>
            </div>

            <!-- Content -->
            <div style="padding: 40px 32px;">
              <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 15px;">Hello <strong style="color: #111827;">${userName}</strong>,</p>
              <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 15px;">
                <strong style="color: #111827;">${adminName}</strong> from ${dealershipName} has required you to change your password on your next login.
              </p>
              <p style="color: #6b7280; margin: 0 0 32px 0; font-size: 15px;">
                You will be prompted to set a new password when you log in. Please choose a strong, secure password.
              </p>

              <!-- Info Box -->
              <div style="background: #eff6ff; border: 1px solid #6366f1; border-radius: 6px; padding: 16px 20px; margin: 24px 0;">
                <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.5;">
                  <strong style="display: block; margin-bottom: 4px;">ℹ️ What to expect</strong>
                  When you log in, you'll be asked to create a new password that meets our security requirements.
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 36px 0;">
                <a href="${resetLink.replace('/reset-password/', '/auth')}" style="display: inline-block; background: white; color: #10b981; border: 2px solid #10b981; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
                  Go to Login
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f9fafb; padding: 24px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 6px 0;">My Detail Area - Professional Dealership Management</p>
              <p style="margin: 6px 0;">&copy; ${new Date().getFullYear()} My Detail Area. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Password Change Required

Hello ${userName},

${adminName} from ${dealershipName} has required you to change your password on your next login.

You will be prompted to set a new password when you log in. Please choose a strong, secure password.

ℹ️ WHAT TO EXPECT: When you log in, you'll be asked to create a new password that meets our security requirements.

Login here: ${resetLink.replace('/reset-password/', '/auth')}

---
My Detail Area - Professional Dealership Management
© ${new Date().getFullYear()} My Detail Area. All rights reserved.`
    };
  }
}

serve(handler);
