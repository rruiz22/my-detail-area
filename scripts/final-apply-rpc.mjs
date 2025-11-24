#!/usr/bin/env node
/**
 * Direct SQL execution using Supabase client
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Applying RPC update via direct database connection...\n');

// The SQL to execute
const rpcSql = `
CREATE OR REPLACE FUNCTION public.get_invoice_items_with_order_info(p_invoice_id UUID)
RETURNS TABLE (
  id UUID,
  invoice_id UUID,
  item_type TEXT,
  description TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  discount_amount NUMERIC,
  tax_rate NUMERIC,
  total_amount NUMERIC,
  service_reference TEXT,
  sort_order INTEGER,
  is_paid BOOLEAN,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  order_number TEXT,
  order_type TEXT,
  po TEXT,
  ro TEXT,
  tag TEXT,
  service_names TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ii.id,
    ii.invoice_id,
    ii.item_type,
    ii.description,
    ii.quantity,
    ii.unit_price,
    ii.discount_amount,
    ii.tax_rate,
    ii.total_amount,
    ii.service_reference,
    ii.sort_order,
    ii.is_paid,
    ii.metadata,
    ii.created_at,
    ii.updated_at,
    (ii.metadata->>'order_number')::TEXT as order_number,
    (ii.metadata->>'order_type')::TEXT as order_type,
    (ii.metadata->>'po')::TEXT as po,
    (ii.metadata->>'ro')::TEXT as ro,
    (ii.metadata->>'tag')::TEXT as tag,
    (ii.metadata->>'service_names')::TEXT as service_names
  FROM public.invoice_items ii
  WHERE ii.invoice_id = p_invoice_id
  ORDER BY ii.sort_order, ii.created_at;
END;
$$;
`;

const grantSql1 = `GRANT EXECUTE ON FUNCTION public.get_invoice_items_with_order_info(UUID) TO authenticated;`;
const grantSql2 = `GRANT EXECUTE ON FUNCTION public.get_invoice_items_with_order_info(UUID) TO service_role;`;

try {
  console.log('📝 Executing CREATE OR REPLACE FUNCTION...');

  // Try using REST API directly with fetch
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query: rpcSql })
  });

  if (response.ok || response.status === 204) {
    console.log('✅ Function created successfully!');
  } else {
    throw new Error(`Failed: ${response.status} ${await response.text()}`);
  }
} catch (err) {
  console.log('⚠️  Direct execution not available.');
  console.log('\n📋 COPY AND EXECUTE THIS SQL IN SUPABASE SQL EDITOR:');
  console.log('👉 https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new\n');
  console.log('='.repeat(70));
  console.log(rpcSql);
  console.log(grantSql1);
  console.log(grantSql2);
  console.log('='.repeat(70));
  console.log('\nAfter executing, refresh your invoice page and the checkboxes will work!');
  process.exit(0);
}

console.log('\n✅ Migration completed successfully!');
console.log('🎉 Refresh your invoice page - checkboxes should now work!');
