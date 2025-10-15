import postgres from 'postgres';

// Connect directly to Postgres bypassing Supabase REST API
const sql = postgres('postgresql://postgres.swfnnrpzpkdypbrzmgnr:TLJ0yPeZvZNfyFfB@aws-0-us-east-1.pooler.supabase.com:6543/postgres', {
  max: 1,
  ssl: 'require'
});

console.log('🔍 DIRECT DATABASE CONNECTION - POLICY CHECK');
console.log('═══════════════════════════════════════════════════════\n');

try {
  // Check RLS policies
  console.log('📋 1. ALL RLS POLICIES ON vehicle_notes:\n');
  const policies = await sql`
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles::text,
      cmd,
      qual::text as using_clause,
      with_check::text as with_check_clause
    FROM pg_policies
    WHERE tablename = 'vehicle_notes'
    ORDER BY cmd, policyname
  `;

  if (policies.length === 0) {
    console.log('  ❌ NO POLICIES FOUND!');
    console.log('  This means RLS is enabled but no policies exist.');
    console.log('  Solution: Run the migration to create policies.\n');
  } else {
    console.log(`  Found ${policies.length} policies:\n`);
    policies.forEach((p, i) => {
      console.log(`  ┌─ Policy ${i + 1}: "${p.policyname}"`);
      console.log(`  │  Command: ${p.cmd}`);
      console.log(`  │  Permissive: ${p.permissive}`);
      console.log(`  │  Roles: ${p.roles}`);
      console.log(`  │  USING: ${p.using_clause?.substring(0, 100) || 'N/A'}...`);
      if (p.with_check_clause) {
        console.log(`  │  WITH CHECK: ${p.with_check_clause.substring(0, 100)}...`);
      }
      console.log(`  └─`);
    });
  }

  // Check if RLS is enabled
  console.log('\n🔒 2. RLS STATUS:\n');
  const rlsStatus = await sql`
    SELECT
      schemaname,
      tablename,
      rowsecurity as rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'vehicle_notes'
  `;

  if (rlsStatus.length > 0) {
    console.log(`  Table: ${rlsStatus[0].tablename}`);
    console.log(`  RLS Enabled: ${rlsStatus[0].rls_enabled ? '✅ YES' : '❌ NO'}`);
  }

  // Check for duplicate policies
  console.log('\n\n🔍 3. CHECKING FOR DUPLICATE POLICY NAMES:\n');
  const duplicates = await sql`
    SELECT
      policyname,
      COUNT(*) as count
    FROM pg_policies
    WHERE tablename = 'vehicle_notes'
    GROUP BY policyname
    HAVING COUNT(*) > 1
  `;

  if (duplicates.length > 0) {
    console.log('  ⚠️  DUPLICATE POLICIES FOUND:');
    duplicates.forEach(d => {
      console.log(`    • "${d.policyname}" appears ${d.count} times`);
    });
    console.log('\n  This causes 409 Conflict errors!');
    console.log('  Solution: Drop duplicates and recreate clean policies.\n');
  } else {
    console.log('  ✅ No duplicate policy names found\n');
  }

  // Check table structure
  console.log('\n📊 4. TABLE STRUCTURE:\n');
  const columns = await sql`
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vehicle_notes'
    ORDER BY ordinal_position
  `;

  columns.forEach(c => {
    console.log(`  • ${c.column_name}: ${c.data_type}${c.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
  });

  console.log('\n\n═══════════════════════════════════════════════════════');

} catch (error) {
  console.error('❌ Database connection error:', error.message);
} finally {
  await sql.end();
}
