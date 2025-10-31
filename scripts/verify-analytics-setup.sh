#!/bin/bash

# Analytics Dashboard Setup Verification Script
# Verifies all required files are in place

echo "🔍 Notification Analytics Dashboard - Setup Verification"
echo "=========================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL=0
PASSED=0
FAILED=0

# Function to check file exists
check_file() {
    TOTAL=$((TOTAL + 1))
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $1 ${RED}(MISSING)${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Function to check directory exists
check_dir() {
    TOTAL=$((TOTAL + 1))
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $1/ ${RED}(MISSING)${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "1. Checking Analytics Components..."
echo "-----------------------------------"
check_dir "src/components/notifications/analytics"
check_file "src/components/notifications/analytics/NotificationAnalyticsDashboard.tsx"
check_file "src/components/notifications/analytics/MetricsOverview.tsx"
check_file "src/components/notifications/analytics/DeliveryTimelineChart.tsx"
check_file "src/components/notifications/analytics/EngagementFunnel.tsx"
check_file "src/components/notifications/analytics/ChannelPerformanceChart.tsx"
check_file "src/components/notifications/analytics/ProviderComparisonChart.tsx"
check_file "src/components/notifications/analytics/FailedDeliveriesTable.tsx"
check_file "src/components/notifications/analytics/FiltersPanel.tsx"
check_file "src/components/notifications/analytics/index.ts"
echo ""

echo "2. Checking Custom Hooks..."
echo "---------------------------"
check_file "src/hooks/useNotificationMetrics.ts"
check_file "src/hooks/useDeliveryTimeline.ts"
check_file "src/hooks/useProviderPerformance.ts"
check_file "src/hooks/useFailedDeliveries.ts"
echo ""

echo "3. Checking Types & Utilities..."
echo "--------------------------------"
check_file "src/types/notification-analytics.ts"
check_file "src/lib/notification-analytics.ts"
echo ""

echo "4. Checking Documentation..."
echo "----------------------------"
check_file "docs/NOTIFICATION_ANALYTICS_README.md"
check_file "docs/ANALYTICS_IMPLEMENTATION_SUMMARY.md"
check_file "docs/analytics-translations.json"
check_file "docs/analytics-integration-example.tsx"
check_file "docs/ANALYTICS_FILE_TREE.md"
echo ""

echo "5. Checking Dependencies..."
echo "--------------------------"

# Check if package.json has required dependencies
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓${NC} package.json exists"

    # Check for recharts
    if grep -q '"recharts"' package.json; then
        echo -e "${GREEN}✓${NC} recharts found in package.json"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}⚠${NC} recharts not found - may need to install"
    fi

    # Check for date-fns
    if grep -q '"date-fns"' package.json; then
        echo -e "${GREEN}✓${NC} date-fns found in package.json"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}⚠${NC} date-fns not found - may need to install"
    fi

    # Check for react-i18next
    if grep -q '"react-i18next"' package.json; then
        echo -e "${GREEN}✓${NC} react-i18next found in package.json"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}⚠${NC} react-i18next not found - may need to install"
    fi
else
    echo -e "${RED}✗${NC} package.json not found"
    FAILED=$((FAILED + 1))
fi
echo ""

echo "6. Checking Translation Files..."
echo "--------------------------------"
check_file "public/translations/en.json"
check_file "public/translations/es.json"
check_file "public/translations/pt-BR.json"
echo ""

# Summary
echo "=========================================================="
echo "Verification Summary"
echo "=========================================================="
echo -e "Total checks: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
else
    echo -e "Failed: $FAILED"
fi
echo ""

# Calculate percentage
PERCENTAGE=$((PASSED * 100 / TOTAL))

if [ $PERCENTAGE -eq 100 ]; then
    echo -e "${GREEN}✅ All files verified! Ready for deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Merge translations from docs/analytics-translations.json"
    echo "2. Verify Supabase RPC functions exist"
    echo "3. Add route to your router configuration"
    echo "4. Test the dashboard at /settings/notifications/analytics"
    exit 0
elif [ $PERCENTAGE -ge 90 ]; then
    echo -e "${YELLOW}⚠️  Setup is mostly complete ($PERCENTAGE%).${NC}"
    echo "Please review missing files above."
    exit 1
else
    echo -e "${RED}❌ Setup incomplete ($PERCENTAGE%).${NC}"
    echo "Several files are missing. Please review the errors above."
    exit 1
fi
