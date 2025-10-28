# Send Order SMS Notification Edge Function

## Overview
Esta Edge Function envía notificaciones SMS a usuarios con permisos específicos cuando ocurren eventos en órdenes. Implementa control granular de preferencias, rate limiting y quiet hours.

## Features
- ✅ Filtrado por permisos de Custom Roles (`receive_sms_notifications`)
- ✅ Preferencias granulares por evento (order_assigned, status_changed, etc.)
- ✅ Rate limiting personalizado (por hora y por día)
- ✅ Quiet hours (no disturbar en horarios configurados)
- ✅ Auto-exclusión del usuario que triggerea el evento
- ✅ Registro completo de historial para auditoría
- ✅ Integración con Twilio para envío real

## Environment Variables Required
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## Request Format

### Endpoint
```
POST https://your-project.supabase.co/functions/v1/send-order-sms-notification
```

### Headers
```
Authorization: Bearer YOUR_ANON_KEY
Content-Type: application/json
```

### Body
```json
{
  "orderId": "uuid",
  "dealerId": 123,
  "module": "sales_orders",
  "eventType": "status_changed",
  "eventData": {
    "orderNumber": "SO-00123",
    "customerName": "John Doe",
    "vehicleInfo": "2024 BMW X5",
    "shortLink": "https://mda.to/ABC12",
    "newStatus": "in_progress",
    "oldStatus": "pending"
  },
  "triggeredBy": "user-uuid-who-made-the-change"
}
```

## Supported Event Types

| Event Type | Description | Required eventData Fields |
|------------|-------------|---------------------------|
| `order_created` | New order created | `orderNumber`, `customerName?` |
| `order_assigned` | User assigned to order | `orderNumber`, `assignedToUserId`, `assignedToName?` |
| `status_changed` | Order status updated | `orderNumber`, `newStatus`, `oldStatus?` |
| `field_updated` | Specific field changed | `orderNumber`, `fieldName`, `newValue?`, `oldValue?` |
| `comment_added` | Comment posted | `orderNumber`, `commentText`, `commenterName` |
| `attachment_added` | File uploaded | `orderNumber` |
| `follower_added` | User added as follower | `orderNumber` |
| `due_date_approaching` | Reminder before due | `orderNumber`, `minutesUntilDue`, `dueDateTime` |
| `overdue` | Order past due date | `orderNumber` |
| `priority_changed` | Priority level updated | `orderNumber`, `newPriority`, `oldPriority?` |

## Response Format

### Success
```json
{
  "success": true,
  "sent": 3,
  "failed": 0,
  "recipients": 3
}
```

### Error
```json
{
  "success": false,
  "error": "Error message"
}
```

## Processing Flow

1. **Permission Check**: Query users with `receive_sms_notifications` permission for the module
2. **Preference Filtering**: Check user's granular event preferences in `user_sms_notification_preferences`
3. **Rate Limiting**: Verify hourly and daily SMS limits haven't been exceeded
4. **Quiet Hours**: Skip users who are in their configured do-not-disturb window
5. **Self-Exclusion**: Remove the user who triggered the event
6. **Message Generation**: Create personalized SMS with order details and short link
7. **Twilio Send**: Send SMS via Twilio API in parallel
8. **History Recording**: Log all attempts in `sms_send_history` table

## Example: Status Changed to "In Progress"

```typescript
// Frontend trigger (in OrderModal or useStatusPermissions)
await supabase.functions.invoke('send-order-sms-notification', {
  body: {
    orderId: 'abc-123',
    dealerId: 42,
    module: 'sales_orders',
    eventType: 'status_changed',
    eventData: {
      orderNumber: 'SO-00456',
      newStatus: 'in_progress',
      oldStatus: 'pending',
      customerName: 'Jane Smith',
      vehicleInfo: '2023 Tesla Model Y',
      shortLink: 'https://mda.to/XYZ89'
    },
    triggeredBy: currentUser.id
  }
});
```

**Result**: Only users who:
- Have `receive_sms_notifications` permission
- Enabled SMS for sales_orders module
- Enabled `status_changed` event
- Included "in_progress" in their status filter
- Haven't hit their rate limits
- Aren't in quiet hours
- Aren't the user who changed the status

Will receive SMS like:
```
📋 Order #SO-00456 status changed to "in_progress". View: https://mda.to/XYZ89
```

## Rate Limiting Logic

**Per User Limits (configurable in preferences)**:
- Default: 10 SMS per hour
- Default: 50 SMS per day
- Range: 1-50 per hour, 1-200 per day

**Quiet Hours**:
- User-configurable start/end time
- Example: 22:00 - 08:00 (no SMS during night)
- Handles overnight windows correctly

## Cost Tracking
- Each SMS is logged with approximate cost (7 cents = $0.007)
- Cost is stored in `sms_send_history.cost_cents`
- Analytics view available: `sms_analytics`

## Testing

### Local Testing with Supabase CLI
```bash
# Start Supabase locally
npx supabase start

# Deploy function
npx supabase functions deploy send-order-sms-notification

# Test with curl
curl -X POST \
  'http://localhost:54321/functions/v1/send-order-sms-notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "orderId": "test-123",
    "dealerId": 1,
    "module": "sales_orders",
    "eventType": "order_assigned",
    "eventData": {
      "orderNumber": "SO-TEST",
      "assignedToUserId": "user-uuid",
      "shortLink": "https://mda.to/TEST"
    }
  }'
```

## Database Dependencies

### Required Tables
- `profiles` - User phone numbers
- `dealer_memberships` - Dealer-user relationships
- `dealer_custom_roles` - Role definitions
- `role_module_permissions_new` - Role permissions
- `module_permissions` - Permission catalog
- `user_sms_notification_preferences` - User SMS settings
- `sms_send_history` - SMS delivery log

### Required Migrations
1. `20251028180000_add_phone_to_profiles.sql`
2. `20251028180001_create_user_sms_notification_preferences.sql`
3. `20251028180002_create_sms_send_history.sql`
4. `20251028180003_add_sms_notification_permission.sql`

## Monitoring

### Check SMS Delivery
```sql
-- Recent SMS sends
SELECT
  user_id,
  event_type,
  phone_number,
  status,
  sent_at
FROM sms_send_history
WHERE dealer_id = YOUR_DEALER_ID
ORDER BY sent_at DESC
LIMIT 20;

-- Failed SMS
SELECT * FROM sms_send_history
WHERE status = 'failed'
ORDER BY sent_at DESC;
```

### Analytics
```sql
-- Today's SMS by event type
SELECT * FROM sms_analytics
WHERE dealer_id = YOUR_DEALER_ID
AND sent_date = CURRENT_DATE;
```

## Troubleshooting

### No SMS Sent
1. **Check Twilio Credentials**: Verify env vars are set correctly
2. **Check Permissions**: User must have `receive_sms_notifications` permission
3. **Check Preferences**: User must enable SMS in their settings
4. **Check Phone Number**: User must have valid phone in `profiles.phone_number`
5. **Check Rate Limits**: User may have hit hourly/daily limits
6. **Check Quiet Hours**: May be in do-not-disturb window

### Logs
```bash
# View function logs
npx supabase functions logs send-order-sms-notification --tail
```

## Security Considerations
- Uses service role key for database access (bypasses RLS)
- Validates Twilio credentials before processing
- Records all SMS attempts for audit trail
- Rate limiting prevents spam
- Self-exclusion prevents notification loops
- Phone numbers validated in database constraints
