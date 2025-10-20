#!/bin/bash
# Test Push Notification Sender Edge Function
# Usage: ./test-notification.sh

# Configuration
SUPABASE_URL="https://ovfykubrknjbqxcbxnra.supabase.co"
SUPABASE_ANON_KEY="your_anon_key_here"
USER_ID="122c8d5b-e5f5-4782-a179-544acbaaceb9"
DEALER_ID="5"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing Push Notification Sender...${NC}\n"

# Test payload
PAYLOAD='{
  "userId": "'$USER_ID'",
  "dealerId": '$DEALER_ID',
  "payload": {
    "title": "Test Notification",
    "body": "This is a test notification from My Detail Area",
    "icon": "/favicon-mda.svg",
    "badge": "/favicon-mda.svg",
    "url": "/dashboard",
    "requireInteraction": false,
    "actions": [
      {"action": "view", "title": "View"},
      {"action": "dismiss", "title": "Dismiss"}
    ]
  }
}'

echo -e "${YELLOW}Request Payload:${NC}"
echo "$PAYLOAD" | jq '.'
echo ""

# Send request
echo -e "${YELLOW}Sending request...${NC}"
RESPONSE=$(curl -s -X POST \
  "$SUPABASE_URL/functions/v1/push-notification-sender" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo -e "${YELLOW}Response:${NC}"
echo "$RESPONSE" | jq '.'
echo ""

# Check if successful
if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
  SENT=$(echo "$RESPONSE" | jq -r '.sent')
  FAILED=$(echo "$RESPONSE" | jq -r '.failed')
  TOTAL=$(echo "$RESPONSE" | jq -r '.total')

  if [ "$SENT" -gt 0 ]; then
    echo -e "${GREEN}✅ Success! Sent: $SENT, Failed: $FAILED, Total: $TOTAL${NC}"
  else
    echo -e "${YELLOW}⚠️  Warning: Sent: $SENT, Failed: $FAILED, Total: $TOTAL${NC}"
  fi
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"')
  echo -e "${RED}❌ Error: $ERROR${NC}"
fi

echo ""
echo -e "${YELLOW}Check browser for notification!${NC}"
