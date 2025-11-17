# 🚀 Manual Deployment: send-invitation-email (SendGrid)

## ⚠️ CLI Deployment Issue

El deployment vía CLI está fallando debido a configuración del access token. Usa este método manual a través del Dashboard de Supabase.

---

## 📋 Deployment Manual (Método Recomendado)

### **Paso 1: Acceder al Dashboard de Supabase**

1. Abre tu navegador y ve a: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr
2. Inicia sesión si es necesario
3. Navega a: **Edge Functions** (menú lateral izquierdo)

### **Paso 2: Encontrar la Función**

1. En la lista de Edge Functions, busca: `send-invitation-email`
2. Haz clic en el nombre de la función para abrirla

### **Paso 3: Crear Nueva Versión**

1. Dentro de la función, haz clic en: **Deploy New Version** (botón superior derecho)
2. Se abrirá un editor de código

### **Paso 4: Copiar el Código Migrado**

**Opción A: Desde el archivo local**
1. Abre el archivo: `c:\Users\rudyr\apps\mydetailarea\supabase\functions\send-invitation-email\index.ts`
2. Selecciona TODO el contenido (Ctrl+A)
3. Copia el código (Ctrl+C)
4. Pega en el editor del Dashboard (Ctrl+V)

**Opción B: Usar el código abajo** (750 líneas)

<details>
<summary>Ver código completo de send-invitation-email con SendGrid</summary>

```typescript
// @ts-nocheck - This file is for Supabase Edge Functions (Deno environment)
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// CORS headers - embedded to avoid import issues during deployment
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Constants
const EMAIL_CONFIG = {
  DEFAULT_DEALER_ID: 'default',
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

function sanitizeEmailTag(value: string): string {
  // SendGrid API only allows ASCII letters, numbers, underscores, and dashes in tags (via categories)
  // Replace spaces and special characters with underscores
  return value
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .substring(0, 256); // SendGrid category max length
}

function formatRoleName(role: string): string {
  // Convert snake_case or dash-case role names to readable format
  // Examples: "used_car_manager" -> "Used Car Manager"
  //           "system-admin" -> "System Admin"
  return role
    .replace(/[_-]/g, ' ')         // Replace underscores and dashes with spaces
    .split(' ')                     // Split into words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word
    .join(' ');                     // Join back together
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

    // Environment validation - SendGrid
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    if (!sendgridApiKey) {
      throw new Error("SENDGRID_API_KEY not configured");
    }

    const fromAddress = Deno.env.get("EMAIL_FROM_ADDRESS");
    const fromName = Deno.env.get("EMAIL_FROM_NAME") || "My Detail Area";
    if (!fromAddress) {
      throw new Error("EMAIL_FROM_ADDRESS not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Get the base URL from environment with correct fallback
    const baseUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://dds.mydetailarea.com";
    const invitationLink = `${baseUrl}/invitation/${invitationToken}`;

    console.log('🔗 [EMAIL] Generated invitation link:', invitationLink);

    // Format expiration date
    const expirationDate = new Date(expiresAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Check if there's a custom template for this dealer
    let templateData = null;
    try {
      const { data, error: templateError } = await supabase
        .from('invitation_templates')
        .select('subject, html_content, text_content')
        .eq('dealer_id', EMAIL_CONFIG.DEFAULT_DEALER_ID)
        .single();

      if (templateError) {
        // PGRST116 = no rows returned (expected), anything else is logged
        if (templateError.code !== 'PGRST116') {
          console.warn('Failed to fetch custom template, using default:', {
            code: templateError.code,
            message: templateError.message
          });
        }
      } else {
        templateData = data;
      }
    } catch (error) {
      // Catch any unexpected errors (like table not existing)
      console.warn('Error fetching custom template, using default:', error);
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

    console.log('[INVITATION EMAIL] Sending email via SendGrid to:', to);

    // Prepare SendGrid email payload
    const emailPayload = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: template.subject,
        },
      ],
      from: {
        email: fromAddress,
        name: `${dealershipName} via ${fromName}`,
      },
      content: [
        {
          type: 'text/plain',
          value: template.text,
        },
        {
          type: 'text/html',
          value: template.html,
        },
      ],
      categories: [
        EMAIL_CONFIG.TAG_TYPES.INVITATION,
        sanitizeEmailTag(dealershipName),
        sanitizeEmailTag(roleName)
      ],
    };

    // Send email via SendGrid API
    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!sendgridResponse.ok) {
      const errorText = await sendgridResponse.text();
      console.error('[INVITATION EMAIL] SendGrid error:', errorText);
      throw new Error(`SendGrid API error: ${sendgridResponse.status} - ${errorText}`);
    }

    // SendGrid returns 202 Accepted with X-Message-Id header
    const messageId = sendgridResponse.headers.get('X-Message-Id') || 'unknown';
    console.log('[INVITATION EMAIL] Email sent successfully via SendGrid:', messageId);

    // Perform database updates in parallel (non-critical operations)
    const now = new Date().toISOString();
    const [updateResult, auditResult] = await Promise.allSettled([
      supabase
        .from('dealer_invitations')
        .update({
          email_sent_at: now,
          email_id: messageId,
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
            email_id: messageId,
            provider: 'sendgrid'
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
        emailId: messageId,
        provider: 'sendgrid',
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
    role_name: formatRoleName(roleName), // Format role for display: "used_car_manager" -> "Used Car Manager"
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

// Cached template constants for better performance - Pure Notion-style (Gray-based, no blue)
// Enterprise minimalist design: No emojis, refined typography, subtle spacing
const DEFAULT_HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're Invited!</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f9fafb;
            padding: 20px;
            line-height: 1.6;
            color: #374151;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
        }
        .header {
            background-color: #ffffff;
            padding: 32px 24px;
            text-align: center;
            border-bottom: 2px solid #e5e7eb;
        }
        .header h1 {
            color: #111827;
            font-size: 22px;
            font-weight: 600;
            letter-spacing: -0.01em;
        }
        .content {
            padding: 40px 32px;
        }
        .content h2 {
            font-size: 20px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 20px;
            line-height: 1.4;
        }
        .content p {
            margin-bottom: 16px;
            color: #6b7280;
            font-size: 15px;
            line-height: 1.6;
        }
        .invitation-box {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 24px;
            margin: 32px 0;
            text-align: center;
        }
        .invitation-box h3 {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
        }
        .invitation-box p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
            line-height: 1.5;
        }
        .cta-container {
            text-align: center;
            margin: 36px 0;
        }
        .cta-button {
            display: inline-block;
            background-color: transparent;
            color: #2563eb;
            border: 2px solid #10b981;
            padding: 12px 28px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            font-size: 15px;
            transition: all 0.2s ease;
        }
        .cta-button:hover {
            background-color: #f0fdf4;
            border-color: #059669;
        }
        .details-box {
            background-color: #f3f4f6;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 24px;
            margin: 32px 0;
        }
        .details-box h4 {
            font-size: 15px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 16px;
        }
        .details-box ol {
            margin-left: 20px;
            color: #6b7280;
            font-size: 14px;
        }
        .details-box li {
            margin-bottom: 10px;
            line-height: 1.5;
        }
        .alert-box {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 16px 20px;
            margin: 32px 0;
        }
        .alert-box p {
            margin: 0;
            color: #92400e;
            font-size: 14px;
            line-height: 1.5;
        }
        .features-section h4 {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
            margin: 32px 0 16px 0;
        }
        .features-section ul {
            list-style: none;
            padding: 0;
        }
        .features-section li {
            padding: 10px 0;
            color: #6b7280;
            font-size: 14px;
            border-bottom: 1px solid #f3f4f6;
            line-height: 1.5;
        }
        .features-section li:last-child {
            border-bottom: none;
        }
        .features-section strong {
            color: #111827;
            font-weight: 600;
        }
        .signature {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
            line-height: 1.6;
        }
        .footer {
            background-color: #f9fafb;
            padding: 24px;
            text-align: center;
            color: #9ca3af;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            margin: 6px 0;
            color: #9ca3af;
            line-height: 1.5;
        }
        .footer a {
            color: #6b7280;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
        a {
            color: #10b981;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>You're Invited to My Detail Area</h1>
        </div>

        <div class="content">
            <h2>Welcome to {{dealership_name}}</h2>

            <p>Hello there,</p>

            <p>{{inviter_name}} has invited you to join <strong>{{dealership_name}}</strong> on My Detail Area, our comprehensive dealership management platform.</p>

            <div class="invitation-box">
                <h3>Your Role: {{role_name}}</h3>
                <p>You've been assigned the <strong>{{role_name}}</strong> role, which will give you access to the tools and features you need to excel in your position.</p>
            </div>

            <div class="cta-container">
                <a href="{{invitation_link}}" class="cta-button">Accept Invitation & Get Started</a>
            </div>

            <div class="details-box">
                <h4>What's Next?</h4>
                <ol>
                    <li><strong>Click the button above</strong> to accept your invitation</li>
                    <li><strong>Create your account</strong> with a secure password</li>
                    <li><strong>Complete your profile</strong> and start using the platform</li>
                    <li><strong>Explore your dashboard</strong> and familiarize yourself with your tools</li>
                </ol>
            </div>

            <div class="alert-box">
                <p><strong>Important:</strong> This invitation expires on <strong>{{expiration_date}}</strong>. Please accept it before then.</p>
            </div>

            <div class="features-section">
                <h4>About My Detail Area</h4>
                <p style="margin-bottom: 16px;">My Detail Area is your all-in-one dealership management solution featuring:</p>
                <ul>
                    <li><strong>Sales Orders</strong> - Manage vehicle sales with VIN decoding and QR codes</li>
                    <li><strong>Service Orders</strong> - Streamlined service department workflows</li>
                    <li><strong>Recon Orders</strong> - Vehicle reconditioning process tracking</li>
                    <li><strong>Car Wash</strong> - Quick service order management</li>
                    <li><strong>Contacts</strong> - Customer relationship management with vCard QR</li>
                    <li><strong>Real-time Chat</strong> - Team communication and collaboration</li>
                    <li><strong>Reports</strong> - Business intelligence and export tools</li>
                </ul>
            </div>

            <p>If you have any questions about your invitation or need assistance getting started, please don't hesitate to reach out to {{inviter_name}} at <a href="mailto:{{inviter_email}}">{{inviter_email}}</a>.</p>

            <p>We're excited to have you join our team.</p>

            <div class="signature">
                <p>Best regards,<br>
                The {{dealership_name}} Team<br>
                <em>Powered by My Detail Area</em></p>
            </div>
        </div>

        <div class="footer">
            <p>This invitation was sent to {{invitee_email}}</p>
            <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
            <p style="margin-top: 16px;">
                <strong>My Detail Area</strong><br>
                Professional Dealership Management Platform<br>
                <a href="https://mydetailarea.com">mydetailarea.com</a>
            </p>
        </div>
    </div>
</body>
</html>`;

const DEFAULT_TEXT_TEMPLATE = `
You're Invited to My Detail Area

Hello there,

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

IMPORTANT: This invitation expires on {{expiration_date}}. Please accept it before then.

ABOUT MY DETAIL AREA:
My Detail Area is your all-in-one dealership management solution featuring:
• Sales Orders - Manage vehicle sales with VIN decoding and QR codes
• Service Orders - Streamlined service department workflows
• Recon Orders - Vehicle reconditioning process tracking
• Car Wash - Quick service order management
• Contacts - Customer relationship management with vCard QR
• Real-time Chat - Team communication and collaboration
• Reports - Business intelligence and export tools

If you have any questions about your invitation or need assistance getting started, please reach out to {{inviter_name}} at {{inviter_email}}.

We're excited to have you join our team.

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
```

</details>

### **Paso 5: Desplegar**

1. Haz clic en el botón **Deploy** (esquina inferior derecha del editor)
2. Espera a que se complete el deployment (aparecerá un mensaje de éxito)
3. Verifica el status: debe aparecer como **"Active"** o **"Deployed"**

### **Paso 6: Verificar Secrets (CRÍTICO)**

Antes de probar, asegúrate que estos secrets estén configurados:

1. En el Dashboard, ve a: **Settings** → **Edge Functions** → **Secrets**
2. Verifica que existan:
   - ✅ `SENDGRID_API_KEY`
   - ✅ `EMAIL_FROM_ADDRESS`
   - ✅ `EMAIL_FROM_NAME`

**Si faltan, agrégalos:**
- `SENDGRID_API_KEY` = Tu API key de SendGrid (comienza con `SG.`)
- `EMAIL_FROM_ADDRESS` = `noreply@mydetailarea.com` (o tu sender verificado)
- `EMAIL_FROM_NAME` = `My Detail Area`

### **Paso 7: Probar el Deployment**

**Opción A: Desde la aplicación**
1. Ve a MyDetailArea → **Users** → **Send Invitation**
2. Llena el formulario de invitación
3. Haz clic en **Send Invitation**
4. Revisa los logs en tiempo real (ver paso siguiente)

**Opción B: Ver logs en tiempo real**
1. En el Dashboard de Supabase, dentro de `send-invitation-email`
2. Ve a la pestaña **Logs**
3. Envía una invitación de prueba
4. Deberías ver:
   - ✅ `[INVITATION EMAIL] Sending email via SendGrid to: test@example.com`
   - ✅ `[INVITATION EMAIL] Email sent successfully via SendGrid: <message-id>`

**Opción C: Ver actividad en SendGrid**
1. Ve a SendGrid Dashboard → **Activity**
2. Busca el email de prueba
3. Verifica status: **Delivered**
4. Revisa categories: `invitation`, nombre dealership, rol

---

## ✅ Verificación Post-Deployment

### Checklist de Validación

- [ ] Función deployada correctamente en Supabase Dashboard
- [ ] Status muestra "Active" o "Deployed"
- [ ] Secrets configurados (SENDGRID_API_KEY, EMAIL_FROM_ADDRESS, EMAIL_FROM_NAME)
- [ ] Email de prueba enviado exitosamente
- [ ] Email recibido en inbox (revisar spam si no aparece)
- [ ] Logs muestran `provider: 'sendgrid'`
- [ ] SendGrid Activity muestra el email como "Delivered"
- [ ] Invitation link funciona correctamente
- [ ] Templates HTML y Text se renderizan bien

---

## 🔧 Troubleshooting Rápido

### Error: "SENDGRID_API_KEY not configured"
**Solución**: Agrega el secret en Settings → Edge Functions → Secrets

### Error: "SendGrid API error: 403"
**Solución**: Verifica sender en SendGrid (Domain Auth o Single Sender)

### Email no llega
**Checklist**:
1. ✅ Revisar spam/junk folder
2. ✅ Verificar logs de Supabase (sin errores)
3. ✅ Verificar SendGrid Activity (status delivered)
4. ✅ Verificar email address es válido

### Deployment falla
**Checklist**:
1. ✅ Código completo copiado (750 líneas)
2. ✅ No hay errores de sintaxis
3. ✅ Imports correctos (Deno URLs)

---

## 📊 Resultado Esperado

Después del deployment exitoso:

```
✅ send-invitation-email (SendGrid)
   Status: Active
   Provider: SendGrid REST API v3
   Version: Latest (con migración)
   Secrets: Configured
```

---

## 📚 Documentación de Referencia

- [DEPLOY_INVITATION_EMAIL_SENDGRID.md](DEPLOY_INVITATION_EMAIL_SENDGRID.md) - Guía completa
- [SENDGRID_SETUP.md](SENDGRID_SETUP.md) - Configuración SendGrid
- Archivo local: `supabase/functions/send-invitation-email/index.ts`

---

**Fecha de migración**: November 17, 2025
**Migrado por**: Claude Code
**Provider**: SendGrid API v3
**Status**: ✅ Listo para deployment manual
