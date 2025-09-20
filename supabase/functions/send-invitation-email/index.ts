// @ts-ignore-file: This file is for Supabase Edge Functions (Deno environment)
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

// CORS headers - embedded to avoid import issues during deployment
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Constants
const EMAIL_CONFIG = {
  DEFAULT_DEALER_ID: 'default',
  EMAIL_DOMAIN: 'invitations@mydetailarea.com',
  TAG_TYPES: {
    INVITATION: 'invitation'
  },
  AUDIT_EVENTS: {
    INVITATION_SENT: 'invitation_sent'
  },
  RATE_LIMIT: {
    MAX_REQUESTS_PER_MINUTE: 10,
    WINDOW_MS: 60000
  }
} as const;

// Rate limiting map (in production, consider using Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Validation schema
const InvitationRequestSchema = z.object({
  invitationId: z.string().uuid(),
  to: z.string().email(),
  dealershipName: z.string().min(1).max(100).trim(),
  roleName: z.string().min(1).max(50).trim(),
  inviterName: z.string().min(1).max(100).trim(),
  inviterEmail: z.string().email(),
  invitationToken: z.string().min(1),
  expiresAt: z.string().datetime()
});

interface InvitationEmailRequest {
  invitationId: string;
  to: string;
  dealershipName: string;
  roleName: string;
  inviterName: string;
  inviterEmail: string;
  invitationToken: string;
  expiresAt: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Utility functions
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + EMAIL_CONFIG.RATE_LIMIT.WINDOW_MS });
    return true;
  }

  if (limit.count >= EMAIL_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  limit.count++;
  return true;
}

function sanitizeTemplateVariable(value: string): string {
  // Basic HTML entity encoding to prevent XSS
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

async function logError(error: Error, context: string, supabase?: any) {
  console.error(`[${context}] ${error.message}`, {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
}

function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    return value ? sanitizeTemplateVariable(value) : match;
  });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let supabase: any;

  try {
    // Rate limiting check
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                    req.headers.get('x-real-ip') ||
                    'unknown';

    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Rate limit exceeded. Please try again later."
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 429,
        }
      );
    }

    // Environment validation
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Input validation and parsing
    let requestBody: any;
    try {
      requestBody = await req.json();
    } catch (error) {
      throw new Error("Invalid JSON in request body");
    }

    const validatedData = InvitationRequestSchema.parse(requestBody);

    const {
      invitationId,
      to,
      dealershipName,
      roleName,
      inviterName,
      inviterEmail,
      invitationToken,
      expiresAt
    } = validatedData;

    // Get the base URL from environment or construct it
    const baseUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://mydetailarea.com";
    const invitationLink = `${baseUrl}/invitation/${invitationToken}`;

    // Format expiration date
    const expirationDate = new Date(expiresAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Check if there's a custom template for this dealer
    const { data: templateData, error: templateError } = await supabase
      .from('invitation_templates')
      .select('subject, html_content, text_content')
      .eq('dealer_id', EMAIL_CONFIG.DEFAULT_DEALER_ID)
      .single();

    if (templateError && templateError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.warn('Failed to fetch custom template, using default:', templateError.message);
    }

    const template = createEmailTemplate({
      dealershipName,
      roleName,
      inviterName,
      inviterEmail,
      invitationLink,
      expirationDate,
      to,
      customTemplate: templateData
    });

    // Send the email
    const { data, error } = await resend.emails.send({
      from: `${dealershipName} <${EMAIL_CONFIG.EMAIL_DOMAIN}>`,
      to: [to],
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: [
        { name: 'type', value: EMAIL_CONFIG.TAG_TYPES.INVITATION },
        { name: 'dealership', value: sanitizeTemplateVariable(dealershipName) },
        { name: 'role', value: sanitizeTemplateVariable(roleName) }
      ]
    });

    if (error) {
      await logError(new Error(`Failed to send email: ${error.message}`), 'email-send', supabase);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    // Perform database updates in parallel (non-critical operations)
    const now = new Date().toISOString();
    const [updateResult, auditResult] = await Promise.allSettled([
      supabase
        .from('dealer_invitations')
        .update({
          email_sent_at: now,
          email_id: data?.id,
          updated_at: now
        })
        .eq('id', invitationId),

      supabase
        .from('user_audit_log')
        .insert({
          event_type: EMAIL_CONFIG.AUDIT_EVENTS.INVITATION_SENT,
          entity_type: 'invitation',
          entity_id: invitationId,
          user_id: null, // Will be set by RLS
          affected_user_email: to,
          metadata: {
            email: to,
            role: roleName,
            dealership: dealershipName,
            email_id: data?.id
          },
          ip_address: clientIP
        })
    ]);

    // Log any database operation failures (non-blocking)
    if (updateResult.status === 'rejected') {
      console.warn("Failed to update invitation record:", updateResult.reason);
    }
    if (auditResult.status === 'rejected') {
      console.warn("Failed to log audit event:", auditResult.reason);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation email sent successfully",
        emailId: data?.id,
        invitationLink
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    await logError(error as Error, 'invitation-email-handler', supabase);

    // Handle specific error types with appropriate status codes
    let statusCode = 500;
    let errorMessage = "Failed to send invitation email";

    if (error instanceof z.ZodError) {
      statusCode = 400;
      errorMessage = `Validation error: ${error.errors.map(e => e.message).join(', ')}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
      // Handle specific known errors
      if (error.message.includes('Invalid JSON')) {
        statusCode = 400;
      } else if (error.message.includes('Rate limit exceeded')) {
        statusCode = 429;
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: statusCode,
      }
    );
  }
};

function createEmailTemplate({
  dealershipName,
  roleName,
  inviterName,
  inviterEmail,
  invitationLink,
  expirationDate,
  to,
  customTemplate
}: {
  dealershipName: string;
  roleName: string;
  inviterName: string;
  inviterEmail: string;
  invitationLink: string;
  expirationDate: string;
  to: string;
  customTemplate?: {
    subject?: string;
    html_content?: string;
    text_content?: string;
  };
}): EmailTemplate {

  // Template variables mapping (without placeholder syntax for cleaner code)
  const variables = {
    dealership_name: dealershipName,
    role_name: roleName,
    inviter_name: inviterName,
    inviter_email: inviterEmail,
    invitation_link: invitationLink,
    expiration_date: expirationDate,
    invitee_email: to
  };

  // If custom template exists, use it with variable replacement
  if (customTemplate) {
    const subject = customTemplate.subject || getDefaultSubject(dealershipName);
    const html = customTemplate.html_content || DEFAULT_HTML_TEMPLATE;
    const text = customTemplate.text_content || DEFAULT_TEXT_TEMPLATE;

    return {
      subject: replaceTemplateVariables(subject, variables),
      html: replaceTemplateVariables(html, variables),
      text: replaceTemplateVariables(text, variables)
    };
  }

  // Default template with optimized replacement
  return {
    subject: getDefaultSubject(dealershipName),
    html: replaceTemplateVariables(DEFAULT_HTML_TEMPLATE, variables),
    text: replaceTemplateVariables(DEFAULT_TEXT_TEMPLATE, variables)
  };
}

// Cached template constants for better performance
const DEFAULT_HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're Invited!</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 40px 20px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
        .content { padding: 40px 20px; }
        .invitation-box { background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 30px; margin: 20px 0; text-align: center; }
        .cta-button { display: inline-block; background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .cta-button:hover { background-color: #4f46e5; }
        .details { background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚗 You're Invited to My Detail Area!</h1>
        </div>

        <div class="content">
            <h2>Welcome to {{dealership_name}}!</h2>

            <p>Hello there!</p>

            <p>{{inviter_name}} has invited you to join <strong>{{dealership_name}}</strong> on My Detail Area, our comprehensive dealership management platform.</p>

            <div class="invitation-box">
                <h3>🎯 Your Role: {{role_name}}</h3>
                <p>You've been assigned the <strong>{{role_name}}</strong> role, which will give you access to the tools and features you need to excel in your position.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{{invitation_link}}" class="cta-button">Accept Invitation & Get Started</a>
            </div>

            <div class="details">
                <h4>What's Next?</h4>
                <ol>
                    <li><strong>Click the button above</strong> to accept your invitation</li>
                    <li><strong>Create your account</strong> with a secure password</li>
                    <li><strong>Complete your profile</strong> and start using the platform</li>
                    <li><strong>Explore your dashboard</strong> and familiarize yourself with your tools</li>
                </ol>
            </div>

            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;"><strong>⏰ Important:</strong> This invitation expires on <strong>{{expiration_date}}</strong>. Please accept it before then!</p>
            </div>

            <h4>About My Detail Area</h4>
            <p>My Detail Area is your all-in-one dealership management solution featuring:</p>
            <ul>
                <li>🛍️ <strong>Sales Orders</strong> - Manage vehicle sales with VIN decoding & QR codes</li>
                <li>🔧 <strong>Service Orders</strong> - Streamlined service department workflows</li>
                <li>✨ <strong>Recon Orders</strong> - Vehicle reconditioning process tracking</li>
                <li>🚿 <strong>Car Wash</strong> - Quick service order management</li>
                <li>📞 <strong>Contacts</strong> - Customer relationship management with vCard QR</li>
                <li>💬 <strong>Real-time Chat</strong> - Team communication and collaboration</li>
                <li>📊 <strong>Reports</strong> - Business intelligence and export tools</li>
            </ul>

            <p>If you have any questions about your invitation or need assistance getting started, please don't hesitate to reach out to {{inviter_name}} at <a href="mailto:{{inviter_email}}">{{inviter_email}}</a>.</p>

            <p>We're excited to have you join our team!</p>

            <p>Best regards,<br>
            The {{dealership_name}} Team<br>
            <em>Powered by My Detail Area</em></p>
        </div>

        <div class="footer">
            <p>This invitation was sent to {{invitee_email}}</p>
            <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
            <p style="margin-top: 20px;">
                <strong>My Detail Area</strong><br>
                Professional Dealership Management Platform<br>
                <a href="https://mydetailarea.com" style="color: #6366f1;">mydetailarea.com</a>
            </p>
        </div>
    </div>
</body>
</html>`;

const DEFAULT_TEXT_TEMPLATE = `
🚗 You're Invited to My Detail Area!

Hello there!

{{inviter_name}} has invited you to join {{dealership_name}} on My Detail Area, our comprehensive dealership management platform.

YOUR ROLE: {{role_name}}
You've been assigned the {{role_name}} role, which will give you access to the tools and features you need to excel in your position.

ACCEPT YOUR INVITATION:
Click this link to get started: {{invitation_link}}

WHAT'S NEXT?
1. Click the link above to accept your invitation
2. Create your account with a secure password
3. Complete your profile and start using the platform
4. Explore your dashboard and familiarize yourself with your tools

⏰ IMPORTANT: This invitation expires on {{expiration_date}}. Please accept it before then!

ABOUT MY DETAIL AREA:
My Detail Area is your all-in-one dealership management solution featuring:
• Sales Orders - Manage vehicle sales with VIN decoding & QR codes
• Service Orders - Streamlined service department workflows
• Recon Orders - Vehicle reconditioning process tracking
• Car Wash - Quick service order management
• Contacts - Customer relationship management with vCard QR
• Real-time Chat - Team communication and collaboration
• Reports - Business intelligence and export tools

If you have any questions about your invitation or need assistance getting started, please reach out to {{inviter_name}} at {{inviter_email}}.

We're excited to have you join our team!

Best regards,
The {{dealership_name}} Team
Powered by My Detail Area

---
This invitation was sent to {{invitee_email}}
If you weren't expecting this invitation, you can safely ignore this email.

My Detail Area - Professional Dealership Management Platform
https://mydetailarea.com`;

function getDefaultSubject(dealershipName: string): string {
  return `Invitation to join ${dealershipName} - My Detail Area`;
}


serve(handler);
