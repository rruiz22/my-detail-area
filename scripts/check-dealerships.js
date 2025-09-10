#!/usr/bin/env node

/**
 * Script to check what dealerships exist in the database
 */

// Direct fetch to check dealerships
const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODY5NjAsImV4cCI6MjA3Mjc2Mjk2MH0.HA7ujjknDa-97z-vC-vOZJm5rQ7PYXqn--rdiZoPXcY';

async function checkDealerships() {
  console.log('=== CHECKING DEALERSHIPS IN DATABASE ===\n');
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/dealerships?select=id,name`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch dealerships:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const dealerships = await response.json();
    
    console.log('Found dealerships:');
    console.log('==================');
    
    if (dealerships.length === 0) {
      console.log('❌ No dealerships found in database');
      console.log('\nThis explains why dealership ID 1 was not found.');
      console.log('You need to create dealerships first before creating users.');
    } else {
      dealerships.forEach((dealer, index) => {
        console.log(`${index + 1}. ID: ${dealer.id}, Name: "${dealer.name}"`);
      });
      
      console.log(`\n✅ Found ${dealerships.length} dealership(s)`);
      console.log('\nUse one of these IDs when creating users:');
      dealerships.forEach(dealer => {
        console.log(`- Use dealershipId: ${dealer.id} for "${dealer.name}"`);
      });
    }
    
  } catch (error) {
    console.error('Exception while checking dealerships:', error);
  }
}

// Run the check
checkDealerships().catch(console.error);