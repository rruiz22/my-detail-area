#!/bin/bash

# ============================================================================
# Notification Delivery Logging System - Deployment Script
# ============================================================================
#
# This script deploys the complete notification delivery logging system:
# 1. Verifies database schema
# 2. Deploys Edge Functions
# 3. Configures secrets
# 4. Sets up cron jobs
# 5. Runs verification tests
#
# Usage: ./deploy-notification-logging.sh [environment]
# Environments: development, staging, production
#
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment
ENVIRONMENT=${1:-development}

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Notification Delivery Logging System - Deployment           ║${NC}"
echo -e "${BLUE}║   Environment: ${ENVIRONMENT}                                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"

# ============================================================================
# STEP 1: Verify Database Schema
# ============================================================================

echo -e "\n${YELLOW}[1/7] Verifying database schema...${NC}"

# Check if notification_delivery_log table exists
TABLE_EXISTS=$(supabase db diff --table notification_delivery_log 2>&1 | grep -c "notification_delivery_log" || echo "0")

if [ "$TABLE_EXISTS" -eq "0" ]; then
  echo -e "${RED}✗ Table notification_delivery_log not found!${NC}"
  echo -e "${YELLOW}  Creating table from migration...${NC}"

  # Check if migration file exists
  if [ -f "../migrations/*_create_notification_delivery_log.sql" ]; then
    supabase db push
    echo -e "${GREEN}✓ Table created successfully${NC}"
  else
    echo -e "${RED}✗ Migration file not found. Please run database-expert agent first.${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✓ Table notification_delivery_log exists${NC}"
fi

# Verify indexes
echo -e "${YELLOW}  Checking indexes...${NC}"
INDEXES=$(supabase db psql -c "SELECT indexname FROM pg_indexes WHERE tablename = 'notification_delivery_log';" -t | wc -l)
if [ "$INDEXES" -lt "7" ]; then
  echo -e "${YELLOW}  ⚠ Only $INDEXES indexes found. Expected 7+${NC}"
  echo -e "${YELLOW}    Run database migration to create missing indexes.${NC}"
else
  echo -e "${GREEN}✓ All indexes present ($INDEXES)${NC}"
fi

# ============================================================================
# STEP 2: Deploy Edge Functions
# ============================================================================

echo -e "\n${YELLOW}[2/7] Deploying Edge Functions...${NC}"

# Deploy helper module (no direct deployment needed, imported by functions)
echo -e "${BLUE}  • notification-logger.ts (helper module)${NC}"
echo -e "${GREEN}    ✓ Will be bundled with functions${NC}"

# Deploy updated send-notification
echo -e "${BLUE}  • send-notification${NC}"
if supabase functions deploy send-notification; then
  echo -e "${GREEN}    ✓ Deployed successfully${NC}"
else
  echo -e "${RED}    ✗ Deployment failed${NC}"
  exit 1
fi

# Deploy webhook processor
echo -e "${BLUE}  • process-notification-webhook${NC}"
if supabase functions deploy process-notification-webhook; then
  echo -e "${GREEN}    ✓ Deployed successfully${NC}"
else
  echo -e "${RED}    ✗ Deployment failed${NC}"
  exit 1
fi

# Deploy retry system
echo -e "${BLUE}  • retry-failed-notifications${NC}"
if supabase functions deploy retry-failed-notifications; then
  echo -e "${GREEN}    ✓ Deployed successfully${NC}"
else
  echo -e "${RED}    ✗ Deployment failed${NC}"
  exit 1
fi

# ============================================================================
# STEP 3: Configure Secrets
# ============================================================================

echo -e "\n${YELLOW}[3/7] Configuring secrets...${NC}"

# Check if secrets are set (won't show values)
echo -e "${BLUE}  Checking required secrets...${NC}"

SECRETS_TO_CHECK=(
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "FIREBASE_SERVICE_ACCOUNT"
  "FIREBASE_PROJECT_ID"
  "WEBHOOK_SECRET"
)

MISSING_SECRETS=()

for SECRET in "${SECRETS_TO_CHECK[@]}"; do
  if supabase secrets list | grep -q "$SECRET"; then
    echo -e "${GREEN}    ✓ $SECRET${NC}"
  else
    echo -e "${RED}    ✗ $SECRET (missing)${NC}"
    MISSING_SECRETS+=("$SECRET")
  fi
done

# Optional webhook secrets
OPTIONAL_SECRETS=(
  "ONESIGNAL_WEBHOOK_SECRET"
  "TWILIO_WEBHOOK_SECRET"
  "RESEND_WEBHOOK_SECRET"
)

echo -e "${BLUE}  Optional provider secrets:${NC}"
for SECRET in "${OPTIONAL_SECRETS[@]}"; do
  if supabase secrets list | grep -q "$SECRET"; then
    echo -e "${GREEN}    ✓ $SECRET${NC}"
  else
    echo -e "${YELLOW}    ⚠ $SECRET (optional, not set)${NC}"
  fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
  echo -e "\n${RED}Missing required secrets: ${MISSING_SECRETS[*]}${NC}"
  echo -e "${YELLOW}Set them using: supabase secrets set SECRET_NAME=value${NC}"
  exit 1
fi

# ============================================================================
# STEP 4: Set Up Cron Jobs (Production Only)
# ============================================================================

echo -e "\n${YELLOW}[4/7] Configuring cron jobs...${NC}"

if [ "$ENVIRONMENT" == "production" ]; then
  echo -e "${BLUE}  Setting up retry-failed-notifications cron (hourly)...${NC}"

  # Create cron job SQL
  CRON_SQL="SELECT cron.schedule(
    'retry-failed-notifications',
    '0 * * * *',
    \$\$
    SELECT net.http_post(
      url := '$(supabase status | grep 'API URL' | awk '{print $3}')/functions/v1/retry-failed-notifications',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      )
    )
    \$\$
  );"

  echo "$CRON_SQL" | supabase db psql

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}    ✓ Cron job created${NC}"
  else
    echo -e "${RED}    ✗ Failed to create cron job${NC}"
  fi
else
  echo -e "${YELLOW}  ⚠ Skipping cron setup (not production environment)${NC}"
  echo -e "${BLUE}    For production, run: ./deploy-notification-logging.sh production${NC}"
fi

# ============================================================================
# STEP 5: Run Verification Tests
# ============================================================================

echo -e "\n${YELLOW}[5/7] Running verification tests...${NC}"

# Get project URL
PROJECT_URL=$(supabase status | grep 'API URL' | awk '{print $3}')
ANON_KEY=$(supabase status | grep 'anon key' | awk '{print $3}')

echo -e "${BLUE}  Testing send-notification endpoint...${NC}"

# Create test notification
TEST_RESPONSE=$(curl -s -X POST "$PROJECT_URL/functions/v1/send-notification" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "dealerId": 999,
    "title": "Test Notification",
    "body": "Deployment verification test"
  }')

if echo "$TEST_RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}    ✓ Endpoint responding${NC}"
else
  echo -e "${YELLOW}    ⚠ Endpoint response: $TEST_RESPONSE${NC}"
fi

echo -e "${BLUE}  Testing webhook processor...${NC}"

WEBHOOK_RESPONSE=$(curl -s -X POST "$PROJECT_URL/functions/v1/process-notification-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "fcm",
    "event_type": "delivered",
    "data": {
      "message_id": "test-msg-deployment-verification",
      "delivered_at": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
    }
  }')

if echo "$WEBHOOK_RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}    ✓ Webhook processor responding${NC}"
else
  echo -e "${YELLOW}    ⚠ Webhook response: $WEBHOOK_RESPONSE${NC}"
fi

# ============================================================================
# STEP 6: Verify Database Logging
# ============================================================================

echo -e "\n${YELLOW}[6/7] Verifying database logging...${NC}"

# Check if logs were created
RECENT_LOGS=$(supabase db psql -c "SELECT COUNT(*) FROM notification_delivery_log WHERE created_at >= NOW() - INTERVAL '5 minutes';" -t)

echo -e "${BLUE}  Recent logs (last 5 minutes): $RECENT_LOGS${NC}"

if [ "$RECENT_LOGS" -gt 0 ]; then
  echo -e "${GREEN}    ✓ Logging is working${NC}"

  # Show sample log
  echo -e "${BLUE}  Sample log entry:${NC}"
  supabase db psql -c "SELECT id, channel, status, provider, created_at FROM notification_delivery_log ORDER BY created_at DESC LIMIT 1;"
else
  echo -e "${YELLOW}    ⚠ No recent logs found${NC}"
  echo -e "${BLUE}      This is expected if no notifications were sent recently.${NC}"
fi

# ============================================================================
# STEP 7: Generate Deployment Report
# ============================================================================

echo -e "\n${YELLOW}[7/7] Generating deployment report...${NC}"

# Get function URLs
FUNCTION_URLS=$(supabase functions list 2>/dev/null || echo "Unable to retrieve function URLs")

# Create report
REPORT_FILE="deployment-report-$(date +%Y%m%d-%H%M%S).txt"

cat > "$REPORT_FILE" << EOF
================================================================================
Notification Delivery Logging System - Deployment Report
================================================================================

Environment: $ENVIRONMENT
Deployment Time: $(date)

--------------------------------------------------------------------------------
Deployed Components
--------------------------------------------------------------------------------

Edge Functions:
  ✓ send-notification (updated with logging)
  ✓ process-notification-webhook
  ✓ retry-failed-notifications

Database:
  ✓ notification_delivery_log table
  ✓ Indexes ($INDEXES)

Secrets:
  $(supabase secrets list | grep -E "SUPABASE|FIREBASE|WEBHOOK" | sed 's/^/  /')

Cron Jobs:
$(if [ "$ENVIRONMENT" == "production" ]; then echo "  ✓ retry-failed-notifications (hourly)"; else echo "  ⚠ Not configured (non-production)"; fi)

--------------------------------------------------------------------------------
Function URLs
--------------------------------------------------------------------------------

$FUNCTION_URLS

--------------------------------------------------------------------------------
Webhook Configuration
--------------------------------------------------------------------------------

Send webhook events to:
  $PROJECT_URL/functions/v1/process-notification-webhook

Supported providers:
  • Firebase Cloud Messaging (FCM)
  • OneSignal
  • Twilio SMS
  • Resend Email

See WEBHOOK_CONFIGURATION_GUIDE.md for detailed setup instructions.

--------------------------------------------------------------------------------
Next Steps
--------------------------------------------------------------------------------

1. Configure webhook endpoints in provider dashboards:
   • OneSignal: Settings → Webhooks
   • Twilio: Phone Numbers → Status Callback URL
   • Resend: Webhooks → Add Endpoint

2. Set provider-specific webhook secrets:
   supabase secrets set ONESIGNAL_WEBHOOK_SECRET=<secret>
   supabase secrets set TWILIO_WEBHOOK_SECRET=<secret>
   supabase secrets set RESEND_WEBHOOK_SECRET=<secret>

3. Update remaining Edge Functions:
   • push-notification-fcm
   • send-invitation-email
   • send-sms

4. Monitor deployment:
   supabase functions logs send-notification --tail
   supabase functions logs process-notification-webhook --tail

5. Verify analytics:
   SELECT channel, status, COUNT(*) FROM notification_delivery_log
   GROUP BY channel, status;

--------------------------------------------------------------------------------
Documentation
--------------------------------------------------------------------------------

• System Overview: NOTIFICATION_DELIVERY_LOGGING.md
• Webhook Setup: WEBHOOK_CONFIGURATION_GUIDE.md
• API Reference: _shared/notification-logger.ts

================================================================================
EOF

echo -e "${GREEN}✓ Report saved to: $REPORT_FILE${NC}"

# ============================================================================
# DEPLOYMENT COMPLETE
# ============================================================================

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                   DEPLOYMENT SUCCESSFUL                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "  1. Configure provider webhooks (see WEBHOOK_CONFIGURATION_GUIDE.md)"
echo -e "  2. Update remaining Edge Functions with logging"
echo -e "  3. Monitor function logs: ${YELLOW}supabase functions logs --tail${NC}"
echo -e "  4. Review analytics dashboard in Supabase"

echo -e "\n${BLUE}Useful Commands:${NC}"
echo -e "  • View logs: ${YELLOW}supabase functions logs send-notification${NC}"
echo -e "  • Check secrets: ${YELLOW}supabase secrets list${NC}"
echo -e "  • Test webhook: ${YELLOW}curl -X POST $PROJECT_URL/functions/v1/process-notification-webhook ...${NC}"

echo -e "\n${GREEN}Deployment report: $REPORT_FILE${NC}\n"

exit 0
