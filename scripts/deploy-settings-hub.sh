#!/bin/bash

# Settings Hub Edge Functions Deployment Script
# MyDetailArea - Enterprise Settings & Integrations
# Date: 2025-10-25

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "==========================================="
echo "  Settings Hub Deployment"
echo "  MyDetailArea Integration Layer"
echo "==========================================="
echo ""

# Check prerequisites
check_prereq() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: $1 not installed${NC}"
        echo "Install: $2"
        exit 1
    fi
}

echo "Checking prerequisites..."
check_prereq "supabase" "npm install -g supabase"
check_prereq "psql" "Install PostgreSQL client"

# Check Supabase login
echo ""
echo "Verifying Supabase authentication..."
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}Not logged in to Supabase${NC}"
    echo "Running: supabase login"
    supabase login
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"

# Menu
echo ""
echo "What would you like to deploy?"
echo "1) Database migrations only"
echo "2) Edge Functions only"
echo "3) Full deployment (migrations + functions)"
echo "4) Configure secrets"
echo "5) Exit"
echo ""
read -p "Select option (1-5): " option

case $option in
    1)
        echo ""
        echo "Deploying database migrations..."
        echo ""

        read -p "Enter your Supabase database host: " DB_HOST
        read -p "Enter database name [postgres]: " DB_NAME
        DB_NAME=${DB_NAME:-postgres}

        echo ""
        echo "Applying migrations..."

        psql -h $DB_HOST -U postgres -d $DB_NAME -f supabase/migrations/20251025_settings_hub_integrations.sql

        echo ""
        echo "Setting up encryption..."
        psql -h $DB_HOST -U postgres -d $DB_NAME -f supabase/migrations/20251025_setup_vault_encryption.sql

        echo ""
        echo -e "${GREEN}✓ Database migrations completed${NC}"
        ;;

    2)
        echo ""
        echo "Deploying Edge Functions..."
        echo ""

        echo "Deploying Slack functions..."
        supabase functions deploy slack-oauth-callback --no-verify-jwt
        supabase functions deploy slack-send-message
        supabase functions deploy slack-test-connection
        supabase functions deploy slack-list-channels

        echo ""
        echo "Deploying Webhook functions..."
        supabase functions deploy webhook-deliver
        supabase functions deploy webhook-test

        echo ""
        echo "Deploying Notification functions..."
        supabase functions deploy notification-render-template

        echo ""
        echo "Deploying Audit function..."
        supabase functions deploy audit-log-create

        echo ""
        echo -e "${GREEN}✓ Edge Functions deployed${NC}"
        ;;

    3)
        echo ""
        echo "Full deployment starting..."
        echo ""

        # Database
        read -p "Enter your Supabase database host: " DB_HOST
        read -p "Enter database name [postgres]: " DB_NAME
        DB_NAME=${DB_NAME:-postgres}

        echo ""
        echo "Step 1/2: Applying database migrations..."
        psql -h $DB_HOST -U postgres -d $DB_NAME -f supabase/migrations/20251025_settings_hub_integrations.sql
        psql -h $DB_HOST -U postgres -d $DB_NAME -f supabase/migrations/20251025_setup_vault_encryption.sql

        echo ""
        echo "Step 2/2: Deploying Edge Functions..."

        supabase functions deploy slack-oauth-callback --no-verify-jwt
        supabase functions deploy slack-send-message
        supabase functions deploy slack-test-connection
        supabase functions deploy slack-list-channels
        supabase functions deploy webhook-deliver
        supabase functions deploy webhook-test
        supabase functions deploy notification-render-template
        supabase functions deploy audit-log-create

        echo ""
        echo -e "${GREEN}✓ Full deployment completed${NC}"
        ;;

    4)
        echo ""
        echo "Configuring Supabase secrets..."
        echo ""
        echo "You'll need the following values:"
        echo "- SLACK_CLIENT_ID"
        echo "- SLACK_CLIENT_SECRET"
        echo "- SLACK_REDIRECT_URI (e.g., https://your-app.com/api/slack/callback)"
        echo "- APP_URL (e.g., https://your-app.com)"
        echo ""

        read -p "Enter SLACK_CLIENT_ID: " SLACK_CLIENT_ID
        read -p "Enter SLACK_CLIENT_SECRET: " SLACK_CLIENT_SECRET
        read -p "Enter SLACK_REDIRECT_URI: " SLACK_REDIRECT_URI
        read -p "Enter APP_URL: " APP_URL

        echo ""
        echo "Setting secrets..."
        supabase secrets set SLACK_CLIENT_ID="$SLACK_CLIENT_ID"
        supabase secrets set SLACK_CLIENT_SECRET="$SLACK_CLIENT_SECRET"
        supabase secrets set SLACK_REDIRECT_URI="$SLACK_REDIRECT_URI"
        supabase secrets set APP_URL="$APP_URL"

        echo ""
        echo -e "${GREEN}✓ Secrets configured${NC}"
        ;;

    5)
        echo "Exiting..."
        exit 0
        ;;

    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo "==========================================="
echo "  Deployment Summary"
echo "==========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Verify tables created:"
echo "   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
echo ""
echo "2. Check encryption key:"
echo "   SELECT name FROM vault.secrets WHERE name = 'settings-encryption-key'"
echo ""
echo "3. List deployed functions:"
echo "   supabase functions list"
echo ""
echo "4. Test a function:"
echo "   supabase functions serve slack-test-connection --env-file .env.local"
echo ""
echo "5. Configure Slack App:"
echo "   https://api.slack.com/apps"
echo ""
echo "6. Update frontend environment variables"
echo ""
echo "==========================================="
echo ""
echo -e "${GREEN}Deployment complete!${NC}"
echo ""
