#!/usr/bin/env node

// Script to create sample dealerships for testing user creation
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://swfnnrpzpkdypbrzmgnr.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseKey) {
  console.log('❌ VITE_SUPABASE_PUBLISHABLE_KEY not found in environment')
  console.log('ℹ️  Check your .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Sample dealerships to create
const dealerships = [
  {
    id: 5, // Match the ID that user creation is trying to use
    name: 'BMW of Sudbury',
    address: '123 Main Street',
    city: 'Sudbury',
    state: 'MA',
    zip_code: '01776',
    phone: '(978) 555-0123',
    email: 'contact@bmwsudbury.com',
    website: 'https://bmwsudbury.com',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 1,
    name: 'Premium Auto Boston',
    address: '456 Auto Plaza',
    city: 'Boston',
    state: 'MA',
    zip_code: '02101',
    phone: '(617) 555-0456',
    email: 'info@premiumautoboston.com',
    website: 'https://premiumautoboston.com',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Elite Motors Cambridge',
    address: '789 University Ave',
    city: 'Cambridge',
    state: 'MA',
    zip_code: '02139',
    phone: '(617) 555-0789',
    email: 'sales@elitemotors.com',
    website: 'https://elitemotors.com',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

async function createDealerships() {
  try {
    console.log('🏢 Creating sample dealerships...')
    
    // First check if dealerships already exist
    const { data: existingDealerships, error: checkError } = await supabase
      .from('dealerships')
      .select('id, name')
    
    if (checkError) {
      console.log('❌ Error checking existing dealerships:', checkError.message)
      return
    }
    
    if (existingDealerships && existingDealerships.length > 0) {
      console.log('ℹ️  Found existing dealerships:')
      existingDealerships.forEach(d => {
        console.log(`   - ID: ${d.id}, Name: ${d.name}`)
      })
      console.log('✅ Dealerships already exist. Skipping creation.')
      return
    }
    
    // Insert dealerships
    for (const dealership of dealerships) {
      console.log(`📝 Creating dealership: ${dealership.name} (ID: ${dealership.id})`)
      
      const { data, error } = await supabase
        .from('dealerships')
        .insert(dealership)
        .select()
      
      if (error) {
        console.log(`❌ Error creating dealership ${dealership.name}:`, error.message)
        console.log('   Error details:', error)
      } else {
        console.log(`✅ Successfully created: ${dealership.name}`)
      }
    }
    
    // Verify creation
    console.log('\n🔍 Verifying created dealerships...')
    const { data: finalDealerships, error: verifyError } = await supabase
      .from('dealerships')
      .select('id, name, city, state')
      .order('id')
    
    if (verifyError) {
      console.log('❌ Error verifying dealerships:', verifyError.message)
    } else if (finalDealerships) {
      console.log(`✅ Total dealerships in database: ${finalDealerships.length}`)
      finalDealerships.forEach(d => {
        console.log(`   - ID: ${d.id}, Name: ${d.name}, Location: ${d.city}, ${d.state}`)
      })
      console.log('\n🎉 Dealerships setup complete! You can now create users.')
    }

  } catch (error) {
    console.log('❌ Script error:', error.message)
  }
}

createDealerships()