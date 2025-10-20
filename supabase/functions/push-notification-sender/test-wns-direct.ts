/**
 * Direct WNS Test Script
 *
 * This script tests WNS push notifications WITHOUT using the web-push library
 * to isolate whether the issue is with the library or the subscription itself.
 *
 * Run with: deno run --allow-net --allow-env test-wns-direct.ts
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@mydetailarea.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface TestResult {
  success: boolean;
  step: string;
  details: any;
  error?: any;
}

const results: TestResult[] = [];

function log(step: string, success: boolean, details: any, error?: any) {
  results.push({ success, step, details, error });
  const emoji = success ? '✅' : '❌';
  console.log(`${emoji} ${step}:`, details);
  if (error) {
    console.error('  Error:', error);
  }
}

async function testEnvironment() {
  log('Environment Check', true, {
    SUPABASE_URL: !!SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
    VAPID_PRIVATE_KEY: !!VAPID_PRIVATE_KEY,
    VAPID_PUBLIC_KEY: !!VAPID_PUBLIC_KEY,
    VAPID_SUBJECT
  });
}

async function testDatabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id')
      .limit(1);

    log('Database Connection', !error, {
      connected: !error,
      hasData: !!data && data.length > 0
    }, error);

    return !error;
  } catch (err) {
    log('Database Connection', false, {}, err);
    return false;
  }
}

async function getActiveSubscription() {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      log('Get Active Subscription', false, { message: 'No active subscriptions found' });
      return null;
    }

    const subscription = data[0];
    log('Get Active Subscription', true, {
      id: subscription.id,
      endpoint_preview: subscription.endpoint.substring(0, 80),
      user_id: subscription.user_id,
      dealer_id: subscription.dealer_id
    });

    return subscription;
  } catch (err) {
    log('Get Active Subscription', false, {}, err);
    return null;
  }
}

async function generateVAPIDJWT(endpoint: string): Promise<string | null> {
  try {
    // Parse VAPID private key (base64url format)
    const keyData = Uint8Array.from(
      atob(VAPID_PRIVATE_KEY.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );

    // Import private key for signing
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      keyData,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    // Create JWT header and payload
    const header = { typ: 'JWT', alg: 'ES256' };
    const audience = new URL(endpoint).origin;
    const exp = Math.floor(Date.now() / 1000) + 43200; // 12 hours

    const payload = {
      aud: audience,
      exp,
      sub: VAPID_SUBJECT
    };

    // Base64url encode
    const base64url = (data: string) => {
      return btoa(data)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    };

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    // Sign with ES256
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      privateKey,
      new TextEncoder().encode(unsignedToken)
    );

    const encodedSignature = base64url(
      String.fromCharCode(...new Uint8Array(signature))
    );

    const jwt = `${unsignedToken}.${encodedSignature}`;

    log('Generate VAPID JWT', true, {
      audience,
      exp: new Date(exp * 1000).toISOString(),
      jwt_preview: jwt.substring(0, 50) + '...'
    });

    return jwt;
  } catch (err) {
    log('Generate VAPID JWT', false, {}, err);
    return null;
  }
}

async function testDirectWNSRequest(subscription: any) {
  try {
    const jwt = await generateVAPIDJWT(subscription.endpoint);
    if (!jwt) {
      log('Test Direct WNS Request', false, { message: 'Failed to generate JWT' });
      return false;
    }

    // Simple test payload (unencrypted for now - just testing auth)
    const payload = JSON.stringify({
      title: 'Direct WNS Test',
      body: 'Testing without web-push library'
    });

    // Make direct request to WNS
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
        'Content-Type': 'application/json',
        'TTL': '86400',
        'Urgency': 'high'
      },
      body: payload
    });

    const success = response.ok;
    const responseBody = await response.text();

    log('Test Direct WNS Request', success, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body_preview: responseBody.substring(0, 200)
    }, success ? null : { status: response.status, body: responseBody });

    return success;
  } catch (err) {
    log('Test Direct WNS Request', false, {}, err);
    return false;
  }
}

async function testWebPushLibrary(subscription: any) {
  try {
    // Import web-push dynamically
    const webpush = (await import("npm:web-push@3.6.7")).default;

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key
      }
    };

    const payload = JSON.stringify({
      title: 'web-push Library Test',
      body: 'Testing with web-push@3.6.7'
    });

    const response = await webpush.sendNotification(
      pushSubscription,
      payload,
      { TTL: 86400, urgency: 'high' }
    );

    log('Test web-push Library', true, {
      statusCode: response.statusCode,
      headers: response.headers,
      body: response.body
    });

    return true;
  } catch (err: any) {
    log('Test web-push Library', false, {
      message: err.message,
      statusCode: err.statusCode,
      body: err.body
    }, err);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🔬 Starting WNS Direct Test\n');
  console.log('='.repeat(60));

  await testEnvironment();

  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.log('\n❌ Cannot proceed without database connection');
    return;
  }

  const subscription = await getActiveSubscription();
  if (!subscription) {
    console.log('\n❌ Cannot proceed without active subscription');
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('Testing Direct WNS Request (without encryption)');
  console.log('='.repeat(60));
  await testDirectWNSRequest(subscription);

  console.log('\n' + '='.repeat(60));
  console.log('Testing web-push Library');
  console.log('='.repeat(60));
  await testWebPushLibrary(subscription);

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  console.log(`Total Tests: ${totalCount}`);
  console.log(`Passed: ${successCount}`);
  console.log(`Failed: ${totalCount - successCount}`);
  console.log(`Success Rate: ${((successCount / totalCount) * 100).toFixed(1)}%`);

  console.log('\n🔍 Diagnosis:');

  const directWNS = results.find(r => r.step === 'Test Direct WNS Request');
  const webPush = results.find(r => r.step === 'Test web-push Library');

  if (directWNS?.success && !webPush?.success) {
    console.log('❌ web-push library has Deno compatibility issues');
    console.log('✅ Recommendation: Implement manual VAPID + encryption using Web Crypto API');
  } else if (!directWNS?.success && !webPush?.success) {
    console.log('❌ Issue with VAPID authentication or subscription validity');
    console.log('📋 Check:');
    console.log('  1. VAPID keys are correct and match frontend subscription');
    console.log('  2. Subscription endpoint is valid');
    console.log('  3. Network connectivity to WNS servers');
  } else if (directWNS?.success && webPush?.success) {
    console.log('✅ Both methods work - web-push library is compatible');
  }
}

// Run tests
runTests().catch(console.error);
