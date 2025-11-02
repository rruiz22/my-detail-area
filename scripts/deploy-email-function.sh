#!/bin/bash

# =====================================================
# DEPLOY EMAIL FUNCTION TO SUPABASE
# =====================================================

echo "🚀 Deploying send-invoice-email Edge Function..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if logged in
echo "📝 Checking Supabase login..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "   supabase login"
    exit 1
fi

echo "✅ Logged in to Supabase"
echo ""

# Deploy the function
echo "📤 Deploying function..."
supabase functions deploy send-invoice-email

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Function deployed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Add RESEND_API_KEY to Supabase Dashboard → Edge Functions → Secrets"
    echo "   2. Test the function from the dashboard"
    echo "   3. Check logs: supabase functions logs send-invoice-email"
    echo ""
else
    echo ""
    echo "❌ Deployment failed. Check the error above."
    exit 1
fi
