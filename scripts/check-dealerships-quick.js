#!/usr/bin/env node

// Quick script to check if dealerships exist before testing user creation
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://swfnnrpzpkdypbrzmgnr.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseKey) {
  console.log('❌ VITE_SUPABASE_PUBLISHABLE_KEY not found in environment')
  console.log('ℹ️  Check your .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDealerships() {
  try {
    console.log('🔍 Checking dealerships in database...')
    
    const { data: dealerships, error } = await supabase
      .from('dealerships')
      .select('id, name')
      .limit(5)

    if (error) {
      console.log('❌ Error querying dealerships:', error.message)
      return
    }

    if (!dealerships || dealerships.length === 0) {
      console.log('⚠️  NO DEALERSHIPS FOUND')
      console.log('📝 You need to create at least one dealership before creating users')
      console.log('🔗 Go to: http://localhost:8081/app/dealerships')
      console.log('   Click "Add Dealership" and create one first')
    } else {
      console.log(`✅ Found ${dealerships.length} dealerships:`)
      dealerships.forEach(d => {
        console.log(`   - ID: ${d.id}, Name: ${d.name}`)
      })
      console.log('✅ You can proceed with user creation testing!')
    }

  } catch (error) {
    console.log('❌ Script error:', error.message)
  }
}

checkDealerships()