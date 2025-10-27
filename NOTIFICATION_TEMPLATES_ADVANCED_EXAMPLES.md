# Notification Templates - Advanced Integration Examples

## Example 1: Template Service (Reusable Hook)

Create a custom hook for template operations:

```typescript
// src/hooks/useNotificationTemplates.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TemplateFilters {
  dealerId: number;
  templateType?: string;
  channel?: string;
  language?: string;
  enabledOnly?: boolean;
}

export function useNotificationTemplates(filters: TemplateFilters) {
  return useQuery({
    queryKey: ['notification-templates', filters],
    queryFn: async () => {
      let query = supabase
        .from('notification_templates')
        .select('*')
        .eq('dealer_id', filters.dealerId);

      if (filters.templateType) {
        query = query.eq('template_type', filters.templateType);
      }

      if (filters.channel) {
        query = query.eq('channel', filters.channel);
      }

      if (filters.language) {
        query = query.eq('language', filters.language);
      }

      if (filters.enabledOnly) {
        query = query.eq('enabled', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });
}

// Usage
function OrderStatusDropdown({ dealerId }: { dealerId: number }) {
  const { data: templates } = useNotificationTemplates({
    dealerId,
    templateType: 'order_status',
    channel: 'email',
    enabledOnly: true
  });

  return (
    <select>
      {templates?.map(template => (
        <option key={template.id} value={template.id}>
          {template.template_name} ({template.language})
        </option>
      ))}
    </select>
  );
}
```

## Example 2: Template Renderer Service

```typescript
// src/services/templateRenderer.ts
interface TemplateVariables {
  order_id?: string;
  customer_name?: string;
  vehicle_vin?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: string;
  status?: string;
  due_date?: string;
  assigned_to?: string;
  dealer_name?: string;
  approval_amount?: string;
  [key: string]: string | undefined;
}

interface RenderedTemplate {
  subject: string | null;
  body: string;
  usedVariables: string[];
  missingVariables: string[];
}

export class TemplateRenderer {
  private static VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

  /**
   * Render template with provided variables
   */
  static render(
    template: { subject?: string | null; body: string; variables: string[] },
    variables: TemplateVariables
  ): RenderedTemplate {
    const usedVariables = new Set<string>();
    const missingVariables = new Set<string>();

    const renderText = (text: string): string => {
      return text.replace(this.VARIABLE_PATTERN, (match, variableName) => {
        const fullVariable = `{{${variableName}}}`;

        if (template.variables.includes(fullVariable)) {
          usedVariables.add(fullVariable);

          const value = variables[variableName];
          if (value !== undefined && value !== null) {
            return value;
          } else {
            missingVariables.add(fullVariable);
            return match; // Keep original if missing
          }
        }

        return match; // Keep unrecognized variables
      });
    };

    return {
      subject: template.subject ? renderText(template.subject) : null,
      body: renderText(template.body),
      usedVariables: Array.from(usedVariables),
      missingVariables: Array.from(missingVariables)
    };
  }

  /**
   * Validate that all required variables are provided
   */
  static validate(
    template: { variables: string[] },
    variables: TemplateVariables
  ): { valid: boolean; missing: string[] } {
    const missing = template.variables.filter(variable => {
      const key = variable.replace(/\{\{|\}\}/g, '');
      return variables[key] === undefined || variables[key] === null;
    });

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Extract variables from template text
   */
  static extractVariables(text: string): string[] {
    const matches = text.match(this.VARIABLE_PATTERN) || [];
    return [...new Set(matches)];
  }
}

// Usage Example
async function sendTemplatedNotification(
  templateId: string,
  variables: TemplateVariables
) {
  // 1. Fetch template
  const { data: template } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (!template) throw new Error('Template not found');

  // 2. Validate variables
  const validation = TemplateRenderer.validate(template, variables);
  if (!validation.valid) {
    console.warn('Missing variables:', validation.missing);
  }

  // 3. Render template
  const rendered = TemplateRenderer.render(template, variables);

  // 4. Send notification based on channel
  switch (template.channel) {
    case 'email':
      await sendEmail({
        to: variables.customer_email!,
        subject: rendered.subject!,
        body: rendered.body
      });
      break;

    case 'sms':
      await sendSMS({
        to: variables.customer_phone!,
        message: rendered.body
      });
      break;

    case 'slack':
      await sendSlackMessage({
        channel: '#notifications',
        text: rendered.body
      });
      break;

    case 'push':
      await sendPushNotification({
        userId: variables.user_id!,
        title: rendered.subject!,
        body: rendered.body
      });
      break;
  }

  return rendered;
}
```

## Example 3: Automated Order Status Notifications

```typescript
// src/services/orderNotifications.ts
import { supabase } from '@/integrations/supabase/client';
import { TemplateRenderer } from './templateRenderer';

export class OrderNotificationService {
  /**
   * Send notification when order status changes
   */
  static async notifyStatusChange(orderId: string, newStatus: string) {
    // 1. Fetch order details
    const { data: order } = await supabase
      .from('orders')
      .select(`
        *,
        dealerships (name),
        profiles (full_name, email)
      `)
      .eq('id', orderId)
      .single();

    if (!order) return;

    // 2. Determine user's preferred language
    const language = order.profiles?.preferred_language || 'en';

    // 3. Fetch appropriate template
    const { data: template } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('dealer_id', order.dealer_id)
      .eq('template_type', 'order_status')
      .eq('channel', 'email')
      .eq('language', language)
      .eq('enabled', true)
      .single();

    if (!template) {
      console.warn('No enabled template found for order status notification');
      return;
    }

    // 4. Prepare variables
    const variables = {
      order_id: order.id,
      customer_name: order.customer_name,
      vehicle_vin: order.vehicle_vin,
      vehicle_make: order.vehicle_make,
      vehicle_model: order.vehicle_model,
      vehicle_year: order.vehicle_year?.toString(),
      status: newStatus,
      due_date: order.due_date,
      assigned_to: order.profiles?.full_name,
      dealer_name: order.dealerships?.name
    };

    // 5. Render and send
    const rendered = TemplateRenderer.render(template, variables);

    await this.sendEmail({
      to: order.profiles?.email!,
      subject: rendered.subject!,
      body: rendered.body
    });

    // 6. Log notification
    await this.logNotification({
      order_id: orderId,
      template_id: template.id,
      channel: 'email',
      recipient: order.profiles?.email!,
      status: 'sent'
    });
  }

  private static async sendEmail(params: {
    to: string;
    subject: string;
    body: string;
  }) {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: params
    });

    if (error) throw error;
    return data;
  }

  private static async logNotification(params: {
    order_id: string;
    template_id: string;
    channel: string;
    recipient: string;
    status: string;
  }) {
    await supabase.from('notification_logs').insert(params);
  }
}
```

## Example 4: Supabase Trigger Integration

```sql
-- Create notification_logs table for tracking
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  template_id UUID REFERENCES notification_templates(id),
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create function to send notification on status change
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  template_record RECORD;
  rendered_subject TEXT;
  rendered_body TEXT;
BEGIN
  -- Only trigger if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN

    -- Find enabled template for this dealer
    SELECT * INTO template_record
    FROM notification_templates
    WHERE dealer_id = NEW.dealer_id
      AND template_type = 'order_status'
      AND channel = 'email'
      AND enabled = true
    LIMIT 1;

    IF FOUND THEN
      -- Call edge function to send notification
      PERFORM net.http_post(
        url := current_setting('app.edge_function_url') || '/send-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := jsonb_build_object(
          'order_id', NEW.id,
          'template_id', template_record.id,
          'new_status', NEW.status
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER order_status_notification_trigger
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_status_change();
```

## Example 5: Bulk Notification Sender

```typescript
// src/services/bulkNotifications.ts
import { supabase } from '@/integrations/supabase/client';
import { TemplateRenderer } from './templateRenderer';

interface BulkNotificationParams {
  dealerId: number;
  templateId: string;
  recipients: Array<{
    email: string;
    variables: Record<string, string>;
  }>;
  batchSize?: number;
}

export async function sendBulkNotifications({
  dealerId,
  templateId,
  recipients,
  batchSize = 50
}: BulkNotificationParams) {
  // 1. Fetch template
  const { data: template } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('id', templateId)
    .eq('dealer_id', dealerId)
    .eq('enabled', true)
    .single();

  if (!template) {
    throw new Error('Template not found or disabled');
  }

  // 2. Process in batches
  const results = {
    total: recipients.length,
    sent: 0,
    failed: 0,
    errors: [] as Array<{ email: string; error: string }>
  };

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const promises = batch.map(async (recipient) => {
      try {
        // Render template
        const rendered = TemplateRenderer.render(template, recipient.variables);

        // Send notification
        await supabase.functions.invoke('send-email', {
          body: {
            to: recipient.email,
            subject: rendered.subject,
            body: rendered.body
          }
        });

        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: recipient.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    await Promise.allSettled(promises);

    // Avoid rate limits - wait between batches
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// Usage Example
async function notifyAllCustomersAboutPromotion() {
  const { data: customers } = await supabase
    .from('contacts')
    .select('email, name, dealer_id')
    .eq('type', 'customer')
    .not('email', 'is', null);

  if (!customers) return;

  const recipients = customers.map(customer => ({
    email: customer.email,
    variables: {
      customer_name: customer.name,
      dealer_name: 'Your Dealer Name'
    }
  }));

  const results = await sendBulkNotifications({
    dealerId: 1,
    templateId: 'template-uuid-here',
    recipients,
    batchSize: 50
  });

  console.log(`Sent: ${results.sent}, Failed: ${results.failed}`);
  if (results.errors.length > 0) {
    console.error('Errors:', results.errors);
  }
}
```

## Example 6: Template Selector Component

```tsx
// src/components/notifications/TemplateSelector.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TemplateSelectorProps {
  dealerId: number;
  templateType: string;
  channel: string;
  language?: string;
  value?: string;
  onChange: (templateId: string) => void;
}

export function TemplateSelector({
  dealerId,
  templateType,
  channel,
  language = 'en',
  value,
  onChange
}: TemplateSelectorProps) {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates', dealerId, templateType, channel, language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('id, template_name, language, channel')
        .eq('dealer_id', dealerId)
        .eq('template_type', templateType)
        .eq('channel', channel)
        .eq('language', language)
        .eq('enabled', true)
        .order('template_name');

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <div>Loading templates...</div>;
  }

  if (!templates || templates.length === 0) {
    return <div>No templates available</div>;
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a template" />
      </SelectTrigger>
      <SelectContent>
        {templates.map((template) => (
          <SelectItem key={template.id} value={template.id}>
            {template.template_name} ({template.language.toUpperCase()})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Usage
function NotificationForm() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  return (
    <div>
      <label>Select Template</label>
      <TemplateSelector
        dealerId={1}
        templateType="order_status"
        channel="email"
        language="en"
        value={selectedTemplate}
        onChange={setSelectedTemplate}
      />
    </div>
  );
}
```

## Example 7: Real-time Template Updates

```typescript
// src/hooks/useTemplateSubscription.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useTemplateSubscription(dealerId: number) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('notification_templates_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_templates',
          filter: `dealer_id=eq.${dealerId}`
        },
        (payload) => {
          console.log('Template changed:', payload);

          // Invalidate all template queries
          queryClient.invalidateQueries({
            queryKey: ['notification-templates']
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dealerId, queryClient]);
}

// Usage in component
function NotificationDashboard() {
  const { enhancedUser } = usePermissions();

  // Subscribe to real-time updates
  useTemplateSubscription(enhancedUser?.dealership_id || 0);

  return (
    <div>
      <NotificationTemplatesManager />
    </div>
  );
}
```

## Example 8: Template Analytics

```sql
-- Create analytics view
CREATE OR REPLACE VIEW notification_template_analytics AS
SELECT
  nt.id,
  nt.template_name,
  nt.template_type,
  nt.channel,
  nt.language,
  COUNT(nl.id) AS total_sent,
  COUNT(CASE WHEN nl.status = 'sent' THEN 1 END) AS successful,
  COUNT(CASE WHEN nl.status = 'failed' THEN 1 END) AS failed,
  MAX(nl.sent_at) AS last_used,
  AVG(EXTRACT(EPOCH FROM (nl.sent_at - nt.created_at))) AS avg_time_to_send
FROM notification_templates nt
LEFT JOIN notification_logs nl ON nl.template_id = nt.id
GROUP BY nt.id, nt.template_name, nt.template_type, nt.channel, nt.language;

-- Query analytics
SELECT
  template_name,
  channel,
  total_sent,
  successful,
  failed,
  ROUND((successful::numeric / NULLIF(total_sent, 0) * 100), 2) AS success_rate,
  last_used
FROM notification_template_analytics
WHERE dealer_id = 1
ORDER BY total_sent DESC;
```

---

These advanced examples demonstrate enterprise-grade integration patterns for the Notification Templates Manager, including:

- Reusable hooks and services
- Template rendering engine
- Automated triggers
- Bulk operations
- Real-time subscriptions
- Analytics and reporting

All examples maintain type safety, follow established patterns, and integrate seamlessly with the existing My Detail Area architecture.
