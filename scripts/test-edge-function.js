#!/usr/bin/env node

/**
 * Test script for the create-dealer-user Edge Function
 * This script will test the function with various scenarios to identify the 400 error
 */

// Hardcode the values for testing (replace with your actual values)
const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4NTczNjEsImV4cCI6MjA1MTQzMzM2MX0.EocYj-HdgSmnPZIWoTRoI-EwkGYkwkLp0ggHzLJiRpo';

// Function to call the Edge Function directly with fetch
async function callEdgeFunction(payload) {
  const response = await fetch(`${supabaseUrl}/functions/v1/create-dealer-user`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  const responseText = await response.text();
  let responseData;
  
  try {
    responseData = JSON.parse(responseText);
  } catch (e) {
    responseData = { rawResponse: responseText };
  }
  
  return {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    data: responseData,
    rawText: responseText
  };
}

async function testCreateDealerUser() {
  console.log('=== TESTING CREATE DEALER USER FUNCTION ===\n');
  
  // Test 1: Valid payload
  console.log('Test 1: Valid payload');
  const validPayload = {
    email: `test-${Date.now()}@example.com`,
    firstName: 'John',
    lastName: 'Doe',
    dealershipId: 1,
    role: 'admin',
    userType: 'dealer',
    sendWelcomeEmail: false,
    dealershipName: 'Test Dealership'
  };
  
  console.log('Payload:', JSON.stringify(validPayload, null, 2));
  
  try {
    const response = await callEdgeFunction(validPayload);
    
    console.log('Response status:', response.status, response.statusText);
    console.log('Response data:', response.data);
    console.log('Raw response:', response.rawText);
    
    if (response.status === 200) {
      console.log('Status: SUCCESS\n');
    } else {
      console.log('Status: FAILED\n');
    }
  } catch (error) {
    console.error('Exception:', error);
    console.log('Status: FAILED\n');
  }
  
  // Test 2: Missing required field
  console.log('Test 2: Missing email field');
  const missingEmailPayload = {
    firstName: 'Jane',
    lastName: 'Smith',
    dealershipId: 1,
    role: 'user',
    userType: 'dealer'
  };
  
  try {
    const response = await callEdgeFunction(missingEmailPayload);
    console.log('Response status:', response.status, response.statusText);
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Exception:', error);
  }
  console.log('');
  
  // Test 3: Invalid dealershipId type
  console.log('Test 3: Invalid dealershipId (string instead of number)');
  const invalidDealershipPayload = {
    email: `test2-${Date.now()}@example.com`,
    firstName: 'Bob',
    lastName: 'Wilson',
    dealershipId: "invalid",
    role: 'user',
    userType: 'dealer'
  };
  
  try {
    const response = await callEdgeFunction(invalidDealershipPayload);
    console.log('Response status:', response.status, response.statusText);
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Exception:', error);
  }
  console.log('');
  
  // Test 4: Invalid userType
  console.log('Test 4: Invalid userType');
  const invalidUserTypePayload = {
    email: `test3-${Date.now()}@example.com`,
    firstName: 'Alice',
    lastName: 'Johnson',
    dealershipId: 1,
    role: 'user',
    userType: 'invalid_type'
  };
  
  try {
    const response = await callEdgeFunction(invalidUserTypePayload);
    console.log('Response status:', response.status, response.statusText);
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Exception:', error);
  }
  console.log('');
  
  // Test 5: Empty payload
  console.log('Test 5: Empty payload');
  try {
    const response = await callEdgeFunction({});
    console.log('Response status:', response.status, response.statusText);
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Exception:', error);
  }
  console.log('');
  
  // Test 6: Check function health with OPTIONS request
  console.log('Test 6: Testing CORS preflight (OPTIONS)');
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/create-dealer-user`, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('OPTIONS Response status:', response.status);
    console.log('OPTIONS Response headers:', Object.fromEntries(response.headers.entries()));
  } catch (error) {
    console.error('OPTIONS Exception:', error);
  }
}

// Run the tests
testCreateDealerUser().catch(console.error);