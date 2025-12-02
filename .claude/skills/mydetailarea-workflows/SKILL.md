---
name: mydetailarea-workflows
description: Workflow automation and orchestration for MyDetailArea. Implements state machines for order lifecycles, automated status transitions, task assignments, escalation rules, SLA monitoring, and event-driven automation. Use when building automated workflows for orders, approvals, escalations, and business process automation.
license: MIT
---

# MyDetailArea Workflow Automation

Automated workflow orchestration for dealership operations using state machines and event-driven architecture.

## Purpose

Automate dealership workflows including order lifecycles, task assignments, escalations, SLA monitoring, and approval processes to improve efficiency and ensure consistent operations.

## When to Use

Use this skill when:
- Implementing order lifecycle automation
- Creating approval workflows
- Setting up automatic task assignments
- Building escalation rules (overdue tasks, SLA violations)
- Implementing status transition logic
- Creating scheduled workflow triggers
- Building event-driven automation
- Implementing business rules automation

## Workflow Architecture

### State Machine Pattern

```typescript
// Order State Machine
type OrderStatus =
  | 'draft'
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'waiting_parts'
  | 'quality_check'
  | 'completed'
  | 'cancelled';

type OrderEvent =
  | 'SUBMIT'
  | 'ASSIGN'
  | 'START'
  | 'PAUSE'
  | 'RESUME'
  | 'COMPLETE_QC'
  | 'APPROVE'
  | 'CANCEL';

interface Transition {
  from: OrderStatus;
  to: OrderStatus;
  event: OrderEvent;
  guard?: (context: OrderContext) => boolean;
  action?: (context: OrderContext) => Promise<void>;
}

const orderStateMachine: Transition[] = [
  {
    from: 'draft',
    to: 'pending',
    event: 'SUBMIT',
    guard: (ctx) => ctx.hasRequiredFields(),
    action: async (ctx) => {
      await notifyManagers(ctx.dealerId);
      await createInitialTasks(ctx.orderId);
    }
  },
  {
    from: 'pending',
    to: 'assigned',
    event: 'ASSIGN',
    guard: (ctx) => ctx.assignedTo !== null,
    action: async (ctx) => {
      await notifyAssignee(ctx.assignedTo);
      await updateSLA(ctx.orderId, 'started');
    }
  },
  {
    from: 'assigned',
    to: 'in_progress',
    event: 'START',
    action: async (ctx) => {
      await logActivity(ctx.orderId, 'Work started');
      await startTimer(ctx.orderId);
    }
  },
  {
    from: 'in_progress',
    to: 'completed',
    event: 'COMPLETE_QC',
    guard: (ctx) => ctx.qualityCheckPassed,
    action: async (ctx) => {
      await generateInvoice(ctx.orderId);
      await notifyCustomerReady(ctx.orderId);
      await calculateTechnicalPerformance(ctx.assignedTo);
    }
  }
];
```

### Workflow Execution Engine

```typescript
class WorkflowEngine {
  async transition(
    entityId: string,
    event: OrderEvent,
    context: OrderContext
  ): Promise<{ success: boolean; newStatus?: OrderStatus; error?: string }> {
    // Get current status
    const { data: entity } = await supabase
      .from('orders')
      .select('status')
      .eq('id', entityId)
      .single();

    // Find valid transition
    const transition = orderStateMachine.find(
      t => t.from === entity.status && t.event === event
    );

    if (!transition) {
      return {
        success: false,
        error: `Invalid transition: ${entity.status} -> ${event}`
      };
    }

    // Check guard condition
    if (transition.guard && !transition.guard(context)) {
      return {
        success: false,
        error: 'Transition guard condition failed'
      };
    }

    // Execute transition
    try {
      // Update status
      await supabase
        .from('orders')
        .update({ status: transition.to })
        .eq('id', entityId);

      // Execute action
      if (transition.action) {
        await transition.action(context);
      }

      // Log transition
      await logTransition(entityId, entity.status, transition.to, event);

      return { success: true, newStatus: transition.to };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

## Auto-Assignment Rules

```typescript
// Auto-assign orders based on rules
interface AssignmentRule {
  priority: number;
  condition: (order: Order) => boolean;
  assignTo: (order: Order) => Promise<string>; // Returns user_id
}

const assignmentRules: AssignmentRule[] = [
  {
    priority: 1,
    condition: (order) => order.order_type === 'recon',
    assignTo: async (order) => {
      // Assign to least busy recon tech
      const { data: tech } = await supabase
        .rpc('get_least_busy_tech', { department: 'recon' });
      return tech.id;
    }
  },
  {
    priority: 2,
    condition: (order) => order.is_vip_customer,
    assignTo: async (order) => {
      // Assign to senior tech
      const { data: tech } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'senior_tech')
        .eq('dealer_id', order.dealer_id)
        .limit(1)
        .single();
      return tech.id;
    }
  },
  {
    priority: 3,
    condition: () => true, // Default rule
    assignTo: async (order) => {
      // Round-robin assignment
      return await getNextTechRoundRobin(order.dealer_id);
    }
  }
];

async function autoAssignOrder(orderId: string) {
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  // Find matching rule (highest priority first)
  const rule = assignmentRules
    .sort((a, b) => a.priority - b.priority)
    .find(r => r.condition(order));

  if (rule) {
    const assigneeId = await rule.assignTo(order);

    await supabase
      .from('orders')
      .update({ assigned_to: assigneeId, status: 'assigned' })
      .eq('id', orderId);

    await notifyAssignee(assigneeId, orderId);
  }
}
```

## SLA Monitoring & Escalation

```typescript
// SLA configuration
interface SLAConfig {
  order_type: string;
  target_completion_hours: number;
  warning_threshold: number; // 0.8 = 80% of time elapsed
  escalation_levels: Array<{
    threshold: number;
    action: (orderId: string) => Promise<void>;
  }>;
}

const slaConfig: SLAConfig[] = [
  {
    order_type: 'service',
    target_completion_hours: 24,
    warning_threshold: 0.8,
    escalation_levels: [
      {
        threshold: 0.8,
        action: async (orderId) => {
          // Notify assigned tech
          await notifyTech(orderId, 'SLA Warning: 80% time elapsed');
        }
      },
      {
        threshold: 1.0,
        action: async (orderId) => {
          // Notify manager
          await notifyManager(orderId, 'SLA Violation: Deadline reached');
        }
      },
      {
        threshold: 1.2,
        action: async (orderId) => {
          // Escalate to dealer admin
          await notifyAdmin(orderId, 'SLA Critical: 20% overdue');
          await flagForReview(orderId);
        }
      }
    ]
  }
];

// Edge Function: Monitor SLA (runs every hour)
async function checkSLAViolations() {
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .in('status', ['assigned', 'in_progress'])
    .not('completed_at', 'is', null);

  for (const order of orders) {
    const config = slaConfig.find(c => c.order_type === order.order_type);
    if (!config) continue;

    const elapsed = Date.now() - new Date(order.created_at).getTime();
    const target = config.target_completion_hours * 3600000; // ms
    const progress = elapsed / target;

    // Check escalation levels
    for (const level of config.escalation_levels) {
      if (progress >= level.threshold) {
        await level.action(order.id);
      }
    }
  }
}
```

## Approval Workflows

```typescript
// Multi-level approval workflow
interface ApprovalWorkflow {
  levels: Array<{
    approver_role: string;
    required: boolean;
    condition?: (context: any) => boolean;
  }>;
  onApproved: (context: any) => Promise<void>;
  onRejected: (context: any) => Promise<void>;
}

const invoiceApprovalWorkflow: ApprovalWorkflow = {
  levels: [
    {
      approver_role: 'dealer_manager',
      required: true,
      condition: (ctx) => ctx.invoice.total_amount > 1000
    },
    {
      approver_role: 'dealer_admin',
      required: true,
      condition: (ctx) => ctx.invoice.total_amount > 5000
    }
  ],
  onApproved: async (ctx) => {
    await supabase
      .from('invoices')
      .update({ status: 'approved', approved_at: new Date() })
      .eq('id', ctx.invoice.id);

    await sendInvoiceEmail(ctx.invoice.id);
  },
  onRejected: async (ctx) => {
    await supabase
      .from('invoices')
      .update({ status: 'rejected', rejected_reason: ctx.reason })
      .eq('id', ctx.invoice.id);

    await notifyCreator(ctx.invoice.created_by, ctx.reason);
  }
};

async function requestApproval(invoiceId: string) {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  const context = { invoice };

  // Determine required approvers
  const requiredLevels = invoiceApprovalWorkflow.levels.filter(
    level => level.required && (!level.condition || level.condition(context))
  );

  // Create approval requests
  for (const level of requiredLevels) {
    await supabase.from('approval_requests').insert({
      entity_type: 'invoice',
      entity_id: invoiceId,
      approver_role: level.approver_role,
      status: 'pending'
    });

    await notifyApprovers(level.approver_role, invoiceId);
  }
}
```

## Scheduled Workflows

```typescript
// Edge Function: Daily scheduled tasks
async function dailyWorkflowTasks() {
  // 1. Auto-close completed orders after 30 days
  await supabase
    .from('orders')
    .update({ status: 'archived' })
    .eq('status', 'completed')
    .lt('completed_at', new Date(Date.now() - 30 * 86400000).toISOString());

  // 2. Send reminder for overdue invoices
  const { data: overdueInvoices } = await supabase
    .from('invoices')
    .select('*, order:orders(customer_email)')
    .in('status', ['pending', 'partially_paid'])
    .lt('due_date', new Date().toISOString());

  for (const invoice of overdueInvoices) {
    await sendOverdueReminder(invoice);
  }

  // 3. Auto-assign unassigned orders >24h old
  const { data: unassignedOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('status', 'pending')
    .is('assigned_to', null)
    .lt('created_at', new Date(Date.now() - 86400000).toISOString());

  for (const order of unassignedOrders) {
    await autoAssignOrder(order.id);
  }

  // 4. Generate daily performance reports
  await generateDailyPerformanceReport();
}
```

## Event-Driven Automation

```typescript
// Database triggers + Edge Functions
// Example: Auto-create invoice when order completed

// Database trigger (SQL)
CREATE OR REPLACE FUNCTION auto_create_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Check if invoice doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM invoices WHERE order_id = NEW.id
    ) THEN
      -- Trigger Edge Function
      PERFORM
        net.http_post(
          url := 'https://[project].supabase.co/functions/v1/auto-invoice',
          headers := '{"Authorization": "Bearer [key]"}'::jsonb,
          body := json_build_object('order_id', NEW.id)::jsonb
        );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_completed_trigger
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION auto_create_invoice();

// Edge Function: auto-invoice
async function createAutoInvoice(orderId: string) {
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  // Calculate totals
  const subtotal = order.services.reduce((sum, s) => sum + s.price, 0);
  const taxAmount = subtotal * 0.0825;
  const total = subtotal + taxAmount;

  // Create invoice
  const { data: invoice } = await supabase
    .from('invoices')
    .insert({
      order_id: orderId,
      dealer_id: order.dealer_id,
      subtotal,
      tax_rate: 0.0825,
      tax_amount: taxAmount,
      total_amount: total,
      amount_due: total,
      status: 'pending',
      issue_date: new Date(),
      due_date: new Date(Date.now() + 30 * 86400000) // 30 days
    })
    .select()
    .single();

  // Create invoice items
  const items = order.services.map(service => ({
    invoice_id: invoice.id,
    item_type: 'service',
    description: service.service_name,
    quantity: 1,
    unit_price: service.price,
    total_amount: service.price
  }));

  await supabase.from('invoice_items').insert(items);

  // Notify staff
  await notifyFollowers(orderId, `Invoice #${invoice.invoice_number} created`);
}
```

## Workflow UI Components

```typescript
// Workflow status visualization
export function WorkflowTimeline({ orderId }: { orderId: string }) {
  const { data: transitions } = useQuery({
    queryKey: ['transitions', orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from('workflow_transitions')
        .select('*')
        .eq('entity_id', orderId)
        .order('created_at', { ascending: true });
      return data;
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transitions?.map((transition, idx) => (
            <div key={transition.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${
                  idx === transitions.length - 1 ? 'bg-blue-600' : 'bg-gray-400'
                }`} />
                {idx < transitions.length - 1 && (
                  <div className="w-0.5 h-full bg-gray-200 my-1" />
                )}
              </div>

              <div className="flex-1">
                <p className="font-medium">{transition.to_status}</p>
                <p className="text-sm text-muted-foreground">
                  {transition.event} by {transition.actor_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(transition.created_at), 'MMM dd, HH:mm')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

## Best Practices

1. **State Machine Pattern** - Use explicit state machines for complex workflows
2. **Idempotency** - Ensure actions can be safely retried
3. **Audit Trail** - Log all workflow transitions
4. **Guard Conditions** - Validate before state transitions
5. **Async Actions** - Handle long-running tasks properly
6. **Error Handling** - Gracefully handle failed transitions
7. **SLA Monitoring** - Track and escalate violations
8. **Event-Driven** - Use database triggers for automation
9. **Testability** - Unit test workflow logic
10. **Configuration** - Make rules configurable, not hardcoded

## Reference Files

- **[State Machines](./references/state-machines.md)** - Complete state machine patterns
- **[Assignment Rules](./references/assignment-rules.md)** - Auto-assignment configurations
- **[SLA Configs](./references/sla-configs.md)** - SLA monitoring setup
- **[Approval Flows](./references/approval-flows.md)** - Multi-level approval patterns
