/**
 * Remote Kiosk Token Diagnostic Script
 *
 * Checks the database for token status and identifies issues:
 * - Old tokens created before GPS implementation
 * - Active vs expired tokens
 * - Tokens without last_used_address (never used with GPS)
 */

import { createClient } from '@supabase/supabase-js';

// Hardcoded for now (safe - read-only diagnostic)
const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxOTQzODg2MCwiZXhwIjoyMDM1MDE0ODYwfQ.NuGc9u98HNkxxMaslMRNDIPqm3sIVdvyQ6lz44GnTtc';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GPS implementation date (Nov 26, 2025)
const GPS_IMPLEMENTATION_DATE = new Date('2025-11-26T00:00:00Z');

async function diagnose() {
  console.log('🔍 Remote Kiosk Token Diagnostic\n');

  try {
    // Fetch all tokens
    const { data: tokens, error } = await supabase
      .from('remote_kiosk_tokens')
      .select(`
        id,
        short_code,
        full_url,
        status,
        created_at,
        expires_at,
        current_uses,
        max_uses,
        last_used_at,
        last_used_address,
        employee:detail_hub_employees!remote_kiosk_tokens_employee_id_fkey(
          first_name,
          last_name,
          employee_number
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`📊 Total Tokens: ${tokens.length}\n`);

    // Categorize tokens
    const categorized = {
      active: [],
      expired: [],
      revoked: [],
      used: [],
      oldTokens: [], // Created before GPS implementation
      neverUsedWithGPS: [], // Used but no GPS data
    };

    tokens.forEach(token => {
      const createdAt = new Date(token.created_at);
      const isOldToken = createdAt < GPS_IMPLEMENTATION_DATE;

      // Add to status categories
      categorized[token.status]?.push(token);

      // Check if old token
      if (isOldToken) {
        categorized.oldTokens.push(token);
      }

      // Check if used but no GPS
      if (token.current_uses > 0 && !token.last_used_address) {
        categorized.neverUsedWithGPS.push(token);
      }
    });

    // Display results
    console.log('📈 Token Status Breakdown:');
    console.log(`   Active:  ${categorized.active.length}`);
    console.log(`   Expired: ${categorized.expired.length}`);
    console.log(`   Revoked: ${categorized.revoked.length}`);
    console.log(`   Used:    ${categorized.used.length}\n`);

    // Old tokens (pre-GPS)
    if (categorized.oldTokens.length > 0) {
      console.log(`⚠️  OLD TOKENS (Created Before GPS Implementation): ${categorized.oldTokens.length}`);
      console.log('   These tokens will NOT request GPS permission.\n');

      categorized.oldTokens.forEach(token => {
        const employeeName = token.employee
          ? `${token.employee.first_name} ${token.employee.last_name} (#${token.employee.employee_number})`
          : 'Unknown Employee';

        console.log(`   🔸 ${token.short_code} - ${employeeName}`);
        console.log(`      Status: ${token.status}`);
        console.log(`      Created: ${new Date(token.created_at).toLocaleDateString()}`);
        console.log(`      Uses: ${token.current_uses}/${token.max_uses}`);
        console.log(`      ⚠️  Action: Generate NEW token for this employee\n`);
      });
    } else {
      console.log('✅ No old tokens found. All tokens have GPS support.\n');
    }

    // Tokens used without GPS
    if (categorized.neverUsedWithGPS.length > 0) {
      console.log(`⚠️  TOKENS USED WITHOUT GPS: ${categorized.neverUsedWithGPS.length}`);
      console.log('   These tokens were used but have no GPS data recorded.\n');

      categorized.neverUsedWithGPS.forEach(token => {
        const employeeName = token.employee
          ? `${token.employee.first_name} ${token.employee.last_name} (#${token.employee.employee_number})`
          : 'Unknown Employee';

        console.log(`   🔸 ${token.short_code} - ${employeeName}`);
        console.log(`      Last Used: ${token.last_used_at ? new Date(token.last_used_at).toLocaleString() : 'Never'}`);
        console.log(`      GPS Data: ❌ Missing`);
        console.log(`      Possible Cause: Old token OR permission denied\n`);
      });
    } else {
      console.log('✅ All used tokens have GPS data.\n');
    }

    // Active tokens with GPS
    const activeWithGPS = categorized.active.filter(t =>
      new Date(t.created_at) >= GPS_IMPLEMENTATION_DATE
    );

    if (activeWithGPS.length > 0) {
      console.log(`✅ ACTIVE TOKENS WITH GPS SUPPORT: ${activeWithGPS.length}\n`);

      activeWithGPS.forEach(token => {
        const employeeName = token.employee
          ? `${token.employee.first_name} ${token.employee.last_name} (#${token.employee.employee_number})`
          : 'Unknown Employee';

        const hasGPS = token.last_used_address ? '✅' : '⏳ Not used yet';

        console.log(`   🔹 ${token.short_code} - ${employeeName}`);
        console.log(`      Created: ${new Date(token.created_at).toLocaleDateString()}`);
        console.log(`      Expires: ${new Date(token.expires_at).toLocaleString()}`);
        console.log(`      Uses: ${token.current_uses}/${token.max_uses}`);
        console.log(`      GPS Data: ${hasGPS}`);
        if (token.last_used_address) {
          console.log(`      Location: ${token.last_used_address}`);
        }
        console.log();
      });
    }

    // Summary
    console.log('\n📋 Summary:');
    console.log(`   Total Tokens: ${tokens.length}`);
    console.log(`   Old Tokens (need regeneration): ${categorized.oldTokens.length}`);
    console.log(`   Active with GPS: ${activeWithGPS.length}`);
    console.log(`   Used without GPS: ${categorized.neverUsedWithGPS.length}`);

    if (categorized.oldTokens.length > 0) {
      console.log('\n⚠️  ACTION REQUIRED:');
      console.log(`   Regenerate ${categorized.oldTokens.length} old token(s) to enable GPS tracking.`);
      console.log('   Go to: Detail Hub → Kiosk Manager → Remote Kiosk → Generate Token');
    } else {
      console.log('\n✅ All tokens are up-to-date with GPS support!');
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    process.exit(1);
  }
}

// Run diagnostic
diagnose();
