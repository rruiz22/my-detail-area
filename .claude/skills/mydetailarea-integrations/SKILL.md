---
name: mydetailarea-integrations
description: Third-party integration connectors for MyDetailArea. Implements secure API integrations with accounting software (QuickBooks, Xero), CRM systems, inventory management, payment processors, and webhooks. Includes OAuth flows, API authentication, rate limiting, error handling, and data synchronization patterns. Use when connecting external systems or building API integrations.
license: MIT
---

# MyDetailArea Integration Connectors

Secure third-party integrations and API connectors for dealership system interoperability.

## Purpose

Enable secure, reliable integrations between MyDetailArea and external systems including accounting software, CRM platforms, payment processors, and inventory management systems.

## When to Use

Use this skill when:
- Integrating accounting software (QuickBooks, Xero, Sage)
- Connecting CRM systems (Salesforce, HubSpot)
- Setting up payment processors (Stripe, Square)
- Building inventory integrations
- Creating webhook endpoints
- Implementing OAuth flows
- Syncing data with external systems
- Building API middleware

## Integration Architecture

### API Connector Pattern

```typescript
// Generic API connector base class
abstract class APIConnector {
  abstract name: string;
  abstract baseURL: string;

  async authenticate(): Promise<void> {
    // Override in subclass
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    try {
      // Rate limiting
      await this.checkRateLimit();

      // Add auth headers
      const headers = await this.getAuthHeaders();

      // Make request with retry logic
      const response = await this.retryRequest(url, {
        ...options,
        headers: { ...headers, ...options.headers }
      });

      // Parse response
      return this.parseResponse<T>(response);
    } catch (error) {
      // Error handling
      return this.handleError(error);
    }
  }

  private async retryRequest(
    url: string,
    options: RequestOptions,
    maxRetries: number = 3
  ): Promise<Response> {
    let lastError: Error;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, options);

        if (response.ok) return response;

        // Retry on 5xx errors
        if (response.status >= 500) {
          await this.backoff(i);
          continue;
        }

        // Don't retry on 4xx errors
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error;
        await this.backoff(i);
      }
    }

    throw lastError;
  }

  private async backoff(attempt: number): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

### QuickBooks Integration Example

```typescript
// connectors/quickbooks.ts
class QuickBooksConnector extends APIConnector {
  name = 'QuickBooks';
  baseURL = 'https://quickbooks.api.intuit.com/v3';

  async authenticate(): Promise<void> {
    // OAuth 2.0 flow
    const { data: credentials } = await supabase
      .from('integration_credentials')
      .select('access_token, refresh_token, expires_at')
      .eq('integration', 'quickbooks')
      .single();

    // Refresh if expired
    if (new Date(credentials.expires_at) < new Date()) {
      await this.refreshToken(credentials.refresh_token);
    }
  }

  async syncInvoice(invoiceId: string): Promise<void> {
    // Get invoice data
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, items:invoice_items(*), order:orders(*)')
      .eq('id', invoiceId)
      .single();

    // Transform to QuickBooks format
    const qbInvoice = {
      CustomerRef: { value: invoice.order.customer_id },
      Line: invoice.items.map(item => ({
        Description: item.description,
        Amount: item.total_amount,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          Qty: item.quantity,
          UnitPrice: item.unit_price
        }
      })),
      TxnDate: format(new Date(invoice.issue_date), 'yyyy-MM-dd'),
      DueDate: format(new Date(invoice.due_date), 'yyyy-MM-dd')
    };

    // Create in QuickBooks
    const response = await this.request('/company/123/invoice', {
      method: 'POST',
      body: JSON.stringify(qbInvoice)
    });

    // Store QuickBooks ID
    await supabase
      .from('invoices')
      .update({
        metadata: {
          ...invoice.metadata,
          quickbooks_id: response.data.Id
        }
      })
      .eq('id', invoiceId);
  }
}
```

### Webhook System

```typescript
// Receive webhooks from external systems
// Edge Function: webhook-receiver

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

serve(async (req) => {
  // Verify webhook signature
  const signature = req.headers.get('x-webhook-signature');
  const isValid = await verifySignature(req, signature);

  if (!isValid) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await req.json();

  // Route to handler
  switch (payload.event_type) {
    case 'payment.completed':
      await handlePaymentCompleted(payload);
      break;

    case 'inventory.updated':
      await handleInventoryUpdated(payload);
      break;

    default:
      console.log('Unhandled event:', payload.event_type);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

async function verifySignature(req: Request, signature: string): Promise<boolean> {
  const body = await req.text();
  const secret = Deno.env.get('WEBHOOK_SECRET');

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expectedSignature = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return signature === expectedSignature;
}
```

## OAuth 2.0 Implementation

```typescript
// OAuth flow for integrations
export function OAuthConnector({ integration }: { integration: string }) {
  const [isConnecting, setIsConnecting] = useState(false);

  const initiateOAuth = async () => {
    setIsConnecting(true);

    // Get authorization URL
    const { data } = await supabase.functions.invoke('oauth-init', {
      body: { integration }
    });

    // Redirect to OAuth provider
    window.location.href = data.authUrl;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect {integration}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={initiateOAuth} disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : `Connect ${integration}`}
        </Button>
      </CardContent>
    </Card>
  );
}

// OAuth callback handler
// Edge Function: oauth-callback
serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // Verify state (CSRF protection)
  const { data: session } = await supabase
    .from('oauth_sessions')
    .select('*')
    .eq('state', state)
    .single();

  if (!session) {
    return new Response('Invalid state', { status: 400 });
  }

  // Exchange code for token
  const tokenResponse = await fetch('https://oauth.provider.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: Deno.env.get('CLIENT_ID'),
      client_secret: Deno.env.get('CLIENT_SECRET'),
      redirect_uri: 'https://app.mydetailarea.com/oauth/callback'
    })
  });

  const tokens = await tokenResponse.json();

  // Store tokens (encrypted)
  await supabase.from('integration_credentials').insert({
    user_id: session.user_id,
    integration: session.integration,
    access_token: await encrypt(tokens.access_token),
    refresh_token: await encrypt(tokens.refresh_token),
    expires_at: new Date(Date.now() + tokens.expires_in * 1000)
  });

  // Redirect back to app
  return Response.redirect('https://app.mydetailarea.com/integrations?connected=true');
});
```

## Data Sync Patterns

```typescript
// Bidirectional sync with conflict resolution
interface SyncConfig {
  source: 'mydetailarea' | 'external';
  entity: string;
  schedule: string; // cron expression
  conflictResolution: 'latest_wins' | 'mydetailarea_wins' | 'external_wins' | 'manual';
}

const syncConfigs: SyncConfig[] = [
  {
    source: 'mydetailarea',
    entity: 'invoices',
    schedule: '0 */6 * * *', // Every 6 hours
    conflictResolution: 'mydetailarea_wins'
  }
];

async function syncEntity(config: SyncConfig) {
  if (config.source === 'mydetailarea') {
    // Push to external
    const { data: updated } = await supabase
      .from(config.entity)
      .select('*')
      .gte('updated_at', lastSyncTime);

    for (const record of updated) {
      await externalAPI.upsert(record);
    }
  } else {
    // Pull from external
    const externalRecords = await externalAPI.getUpdated(lastSyncTime);

    for (const record of externalRecords) {
      // Check for conflicts
      const { data: existing } = await supabase
        .from(config.entity)
        .select('updated_at')
        .eq('id', record.id)
        .single();

      if (existing && existing.updated_at > record.updated_at) {
        // Conflict detected
        await resolveConflict(config, existing, record);
      } else {
        await supabase.from(config.entity).upsert(record);
      }
    }
  }
}
```

## Best Practices

1. **Security First** - Encrypt credentials, verify signatures
2. **Rate Limiting** - Respect API limits, implement backoff
3. **Error Handling** - Retry transient failures, log permanent failures
4. **Idempotency** - Ensure sync operations are idempotent
5. **Conflict Resolution** - Define clear conflict resolution strategies
6. **Audit Trail** - Log all integration activities
7. **Monitoring** - Track sync status, errors, performance
8. **Versioning** - Handle API version changes gracefully
9. **Testing** - Mock external APIs for testing
10. **Documentation** - Document integration setup and troubleshooting

## Reference Files

- **[API Connectors](./references/api-connectors.md)** - Integration implementations
- **[OAuth Setup](./references/oauth-setup.md)** - OAuth 2.0 configuration
- **[Webhook Security](./references/webhook-security.md)** - Signature verification
- **[Sync Patterns](./references/sync-patterns.md)** - Data synchronization strategies
