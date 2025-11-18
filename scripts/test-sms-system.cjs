/**
 * SMS System Testing Script
 * Tests all improvements made to the SMS notification system
 *
 * Run: node scripts/test-sms-system.cjs
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not found in environment');
  console.error('Set it in .env file or pass as environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test Results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function logTest(name, status, message, details = null) {
  const icons = { passed: '✅', failed: '❌', warning: '⚠️' };
  console.log(`${icons[status]} ${name}: ${message}`);

  if (details) {
    console.log(`   ${JSON.stringify(details, null, 2).split('\n').join('\n   ')}`);
  }

  results.tests.push({ name, status, message, details });
  results[status]++;
}

async function test1_VerifySchema() {
  console.log('\n📋 TEST 1: Verificar Schema de sms_send_history');

  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      query: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'sms_send_history'
        AND column_name IN ('sent_day', 'retry_count', 'webhook_received_at', 'delivery_status_updated_at', 'delivery_error_code')
        ORDER BY column_name;
      `
    });

    if (error) throw error;

    const expectedColumns = {
      'sent_day': { type: 'date', nullable: 'NO' },
      'retry_count': { type: 'integer', nullable: 'NO' },
      'webhook_received_at': { type: 'timestamp with time zone', nullable: 'YES' },
      'delivery_status_updated_at': { type: 'timestamp with time zone', nullable: 'YES' },
      'delivery_error_code': { type: 'text', nullable: 'YES' }
    };

    let allFound = true;
    for (const [colName, expected] of Object.entries(expectedColumns)) {
      const col = data?.find(c => c.column_name === colName);

      if (!col) {
        logTest(`Column ${colName}`, 'failed', 'Column not found');
        allFound = false;
      } else if (col.data_type !== expected.type) {
        logTest(`Column ${colName}`, 'failed', `Wrong type: ${col.data_type} (expected ${expected.type})`);
        allFound = false;
      } else if (col.is_nullable !== expected.nullable) {
        logTest(`Column ${colName}`, 'failed', `Wrong nullable: ${col.is_nullable} (expected ${expected.nullable})`);
        allFound = false;
      } else {
        logTest(`Column ${colName}`, 'passed', `Type: ${col.data_type}, Nullable: ${col.is_nullable}`);
      }
    }

    return allFound;
  } catch (error) {
    logTest('Schema Verification', 'failed', error.message);
    return false;
  }
}

async function test2_VerifyIndexes() {
  console.log('\n🔍 TEST 2: Verificar Índices Creados');

  try {
    const { data, error } = await supabase
      .from('pg_indexes')
      .select('indexname')
      .eq('tablename', 'sms_send_history');

    if (error) throw error;

    const expectedIndexes = [
      'idx_sms_history_retry',
      'idx_sms_history_delivery_tracking',
      'idx_sms_history_pending_delivery',
      'idx_sms_history_sent_day_rate_limit'
    ];

    const foundIndexes = data?.map(i => i.indexname) || [];

    for (const indexName of expectedIndexes) {
      if (foundIndexes.includes(indexName)) {
        logTest(`Index ${indexName}`, 'passed', 'Index exists');
      } else {
        logTest(`Index ${indexName}`, 'failed', 'Index not found');
      }
    }

    return true;
  } catch (error) {
    logTest('Index Verification', 'failed', error.message);
    return false;
  }
}

async function test3_TestSentDayTrigger() {
  console.log('\n⚡ TEST 3: Probar Trigger de sent_day');

  try {
    // Insert test record without sent_day
    const { data, error } = await supabase
      .from('sms_send_history')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
        dealer_id: 1,
        module: 'sales_orders',
        event_type: 'test',
        phone_number: '+15551234567',
        message_content: 'Test message',
        status: 'sent'
        // NOT providing sent_day - should auto-populate via trigger
      })
      .select()
      .single();

    if (error) throw error;

    if (data.sent_day) {
      const today = new Date().toISOString().split('T')[0];
      if (data.sent_day === today) {
        logTest('sent_day Trigger', 'passed', `Auto-populated with today's date: ${data.sent_day}`);

        // Cleanup
        await supabase.from('sms_send_history').delete().eq('id', data.id);
        return true;
      } else {
        logTest('sent_day Trigger', 'warning', `Date mismatch: ${data.sent_day} vs ${today}`);
        await supabase.from('sms_send_history').delete().eq('id', data.id);
        return false;
      }
    } else {
      logTest('sent_day Trigger', 'failed', 'sent_day was not auto-populated');
      return false;
    }
  } catch (error) {
    logTest('sent_day Trigger Test', 'failed', error.message);
    return false;
  }
}

async function test4_VerifyDealerRulesTable() {
  console.log('\n📜 TEST 4: Verificar Tabla dealer_notification_rules');

  try {
    const { data, error } = await supabase
      .from('dealer_notification_rules')
      .select('count')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        logTest('dealer_notification_rules', 'warning', 'Table does not exist (will be created later)');
        return true;
      }
      throw error;
    }

    logTest('dealer_notification_rules', 'passed', 'Table exists and is queryable');
    return true;
  } catch (error) {
    logTest('dealer_notification_rules', 'warning', `Table check failed: ${error.message}`);
    return true; // Not critical for current tests
  }
}

async function test5_CheckSMSHistory() {
  console.log('\n📊 TEST 5: Analizar Historial SMS Existente');

  try {
    const { data, error } = await supabase
      .from('sms_send_history')
      .select('id, status, sent_day, retry_count, webhook_received_at')
      .order('sent_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!data || data.length === 0) {
      logTest('SMS History', 'warning', 'No SMS records found (database is empty)');
      return true;
    }

    logTest('SMS History', 'passed', `Found ${data.length} recent SMS records`);

    // Check for records missing sent_day
    const missingSentDay = data.filter(r => !r.sent_day);
    if (missingSentDay.length > 0) {
      logTest('sent_day Coverage', 'warning', `${missingSentDay.length}/${data.length} records missing sent_day (old records)`);
    } else {
      logTest('sent_day Coverage', 'passed', 'All recent records have sent_day populated');
    }

    // Check for webhook data
    const hasWebhook = data.filter(r => r.webhook_received_at);
    if (hasWebhook.length > 0) {
      logTest('Webhook Tracking', 'passed', `${hasWebhook.length}/${data.length} records have webhook data`);
    } else {
      logTest('Webhook Tracking', 'warning', 'No webhook data found (webhook not configured or no deliveries yet)');
    }

    return true;
  } catch (error) {
    logTest('SMS History Analysis', 'failed', error.message);
    return false;
  }
}

async function test6_CheckPreferencesTable() {
  console.log('\n👤 TEST 6: Verificar user_sms_notification_preferences');

  try {
    const { data, error } = await supabase
      .from('user_sms_notification_preferences')
      .select('user_id, dealer_id, module, sms_enabled')
      .limit(5);

    if (error) throw error;

    if (!data || data.length === 0) {
      logTest('SMS Preferences', 'warning', 'No user preferences found (will auto-create on first notification)');
      return true;
    }

    logTest('SMS Preferences', 'passed', `Found ${data.length} user preference records`);

    const enabledCount = data.filter(p => p.sms_enabled).length;
    logTest('Enabled Users', 'passed', `${enabledCount}/${data.length} users have SMS enabled`);

    return true;
  } catch (error) {
    logTest('Preferences Check', 'failed', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 ========================================');
  console.log('🧪 SMS SYSTEM TESTING');
  console.log('🧪 ========================================\n');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`🌐 Supabase URL: ${SUPABASE_URL}\n`);

  await test1_VerifySchema();
  await test2_VerifyIndexes();
  await test3_TestSentDayTrigger();
  await test4_VerifyDealerRulesTable();
  await test5_CheckSMSHistory();
  await test6_CheckPreferencesTable();

  console.log('\n🧪 ========================================');
  console.log('🧪 TEST SUMMARY');
  console.log('🧪 ========================================');
  console.log(`✅ Passed:   ${results.passed}`);
  console.log(`❌ Failed:   ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}\n`);

  if (results.failed === 0) {
    console.log('🎉 All critical tests passed!');
    console.log('\n✅ Next Steps:');
    console.log('   1. Deploy updated Edge Functions');
    console.log('   2. Configure Twilio webhook URL');
    console.log('   3. Test SMS sending in production');
  } else {
    console.log('❌ Some tests failed. Please review and fix before proceeding.');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('\n💥 Fatal Error:', error);
  process.exit(1);
});
