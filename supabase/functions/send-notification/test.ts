/**
 * Test script for send-notification Edge Function
 *
 * Usage:
 *   deno run --allow-net --allow-env test.ts
 *
 * Set these environment variables before running:
 *   SUPABASE_URL=https://your-project.supabase.co
 *   SUPABASE_ANON_KEY=your_anon_key
 *   TEST_USER_ID=user-uuid-here
 *   TEST_DEALER_ID=42
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321'
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const TEST_USER_ID = Deno.env.get('TEST_USER_ID') || ''
const TEST_DEALER_ID = parseInt(Deno.env.get('TEST_DEALER_ID') || '1')

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/send-notification`

// ============================================================================
// TEST CASES
// ============================================================================

interface TestCase {
  name: string
  payload: any
  expectedStatus: number
  validate?: (response: any) => boolean
}

const testCases: TestCase[] = [
  {
    name: '1. Valid notification request',
    payload: {
      userId: TEST_USER_ID,
      dealerId: TEST_DEALER_ID,
      title: 'Test Notification',
      body: 'This is a test notification from the automated test suite',
      url: '/test',
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    },
    expectedStatus: 200,
    validate: (response) => response.success !== undefined && response.sent !== undefined
  },
  {
    name: '2. Missing userId (should fail validation)',
    payload: {
      dealerId: TEST_DEALER_ID,
      title: 'Test',
      body: 'Test'
    },
    expectedStatus: 400,
    validate: (response) => response.success === false && response.error
  },
  {
    name: '3. Missing dealerId (should fail validation)',
    payload: {
      userId: TEST_USER_ID,
      title: 'Test',
      body: 'Test'
    },
    expectedStatus: 400,
    validate: (response) => response.success === false && response.error
  },
  {
    name: '4. Missing title (should fail validation)',
    payload: {
      userId: TEST_USER_ID,
      dealerId: TEST_DEALER_ID,
      body: 'Test'
    },
    expectedStatus: 400,
    validate: (response) => response.success === false && response.error
  },
  {
    name: '5. Missing body (should fail validation)',
    payload: {
      userId: TEST_USER_ID,
      dealerId: TEST_DEALER_ID,
      title: 'Test'
    },
    expectedStatus: 400,
    validate: (response) => response.success === false && response.error
  },
  {
    name: '6. Invalid userId type (should fail validation)',
    payload: {
      userId: 12345,
      dealerId: TEST_DEALER_ID,
      title: 'Test',
      body: 'Test'
    },
    expectedStatus: 400,
    validate: (response) => response.success === false && response.error
  },
  {
    name: '7. Invalid dealerId type (should fail validation)',
    payload: {
      userId: TEST_USER_ID,
      dealerId: 'not-a-number',
      title: 'Test',
      body: 'Test'
    },
    expectedStatus: 400,
    validate: (response) => response.success === false && response.error
  },
  {
    name: '8. Optional fields only',
    payload: {
      userId: TEST_USER_ID,
      dealerId: TEST_DEALER_ID,
      title: 'Minimal Test',
      body: 'Testing with only required fields'
    },
    expectedStatus: 200,
    validate: (response) => response.success !== undefined
  },
  {
    name: '9. With URL only',
    payload: {
      userId: TEST_USER_ID,
      dealerId: TEST_DEALER_ID,
      title: 'URL Test',
      body: 'Testing with URL parameter',
      url: '/orders/service/12345'
    },
    expectedStatus: 200,
    validate: (response) => response.success !== undefined
  },
  {
    name: '10. With custom data payload',
    payload: {
      userId: TEST_USER_ID,
      dealerId: TEST_DEALER_ID,
      title: 'Data Test',
      body: 'Testing with custom data',
      data: {
        orderId: '12345',
        type: 'order_update',
        priority: 'high',
        metadata: {
          dealerName: 'Test Dealership',
          userName: 'Test User'
        }
      }
    },
    expectedStatus: 200,
    validate: (response) => response.success !== undefined
  },
  {
    name: '11. Long title and body',
    payload: {
      userId: TEST_USER_ID,
      dealerId: TEST_DEALER_ID,
      title: 'Very Long Title '.repeat(10).trim(),
      body: 'Very long body text '.repeat(50).trim()
    },
    expectedStatus: 200,
    validate: (response) => response.success !== undefined
  },
  {
    name: '12. Special characters in title and body',
    payload: {
      userId: TEST_USER_ID,
      dealerId: TEST_DEALER_ID,
      title: 'Test with émojis 🚗 & special chars: @#$%',
      body: 'Testing special characters: áéíóú ñ ¿¡ €£¥ 中文 日本語'
    },
    expectedStatus: 200,
    validate: (response) => response.success !== undefined
  }
]

// ============================================================================
// TEST RUNNER
// ============================================================================

async function runTest(testCase: TestCase): Promise<boolean> {
  console.log(`\n🧪 Running: ${testCase.name}`)
  console.log(`   Payload:`, JSON.stringify(testCase.payload, null, 2))

  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(testCase.payload)
    })

    const data = await response.json()

    console.log(`   Status: ${response.status} (expected: ${testCase.expectedStatus})`)
    console.log(`   Response:`, JSON.stringify(data, null, 2))

    // Check status code
    if (response.status !== testCase.expectedStatus) {
      console.log(`   ❌ FAILED: Expected status ${testCase.expectedStatus}, got ${response.status}`)
      return false
    }

    // Run custom validation if provided
    if (testCase.validate && !testCase.validate(data)) {
      console.log(`   ❌ FAILED: Response validation failed`)
      return false
    }

    console.log(`   ✅ PASSED`)
    return true

  } catch (error: any) {
    console.log(`   ❌ FAILED: ${error.message}`)
    return false
  }
}

async function runAllTests() {
  console.log('=' .repeat(80))
  console.log('🚀 Send Notification Edge Function - Test Suite')
  console.log('=' .repeat(80))

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('\n❌ Error: Missing environment variables')
    console.error('   Set SUPABASE_URL and SUPABASE_ANON_KEY before running tests')
    Deno.exit(1)
  }

  if (!TEST_USER_ID) {
    console.warn('\n⚠️  Warning: TEST_USER_ID not set')
    console.warn('   Some tests may return 404 (no tokens found)')
  }

  console.log(`\nConfiguration:`)
  console.log(`  Endpoint: ${FUNCTION_URL}`)
  console.log(`  User ID: ${TEST_USER_ID || '(not set)'}`)
  console.log(`  Dealer ID: ${TEST_DEALER_ID}`)

  const results: boolean[] = []

  for (const testCase of testCases) {
    const passed = await runTest(testCase)
    results.push(passed)

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Summary
  console.log('\n' + '=' .repeat(80))
  console.log('📊 Test Summary')
  console.log('=' .repeat(80))

  const passed = results.filter(r => r).length
  const failed = results.filter(r => !r).length
  const total = results.length

  console.log(`\n  Total: ${total}`)
  console.log(`  ✅ Passed: ${passed}`)
  console.log(`  ❌ Failed: ${failed}`)
  console.log(`  Success Rate: ${((passed / total) * 100).toFixed(1)}%`)

  if (failed === 0) {
    console.log(`\n🎉 All tests passed!`)
    Deno.exit(0)
  } else {
    console.log(`\n⚠️  Some tests failed. Review the output above.`)
    Deno.exit(1)
  }
}

// ============================================================================
// RUN TESTS
// ============================================================================

if (import.meta.main) {
  runAllTests()
}
