#!/usr/bin/env node

/**
 * Avatar Seeds Migration Script
 *
 * This script populates avatar_seed and avatar_variant for all users
 * who don't have these values configured.
 *
 * Usage:
 *   node scripts/migrate_avatar_seeds.js [--dry-run] [--batch-size=100]
 *
 * Options:
 *   --dry-run       Preview changes without applying them
 *   --batch-size    Number of users to update per batch (default: 100)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AVATAR_SEEDS = Array.from({ length: 25 }, (_, i) => `beam-${i + 1}`);

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const BATCH_SIZE = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 100;

// Validate environment
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Generate deterministic seed based on user ID
 */
function generateSeedForUser(userId) {
  // Convert UUID to number and mod 25
  const hash = userId.split('-').join('');
  let sum = 0;
  for (let i = 0; i < hash.length; i++) {
    sum += hash.charCodeAt(i);
  }
  const index = sum % 25;
  return AVATAR_SEEDS[index];
}

/**
 * Fetch users without avatar_seed
 */
async function fetchUsersWithoutSeeds() {
  console.log('📊 Fetching users without avatar seeds...\n');

  const { data, error, count } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, avatar_seed', { count: 'exact' })
    .or('avatar_seed.is.null,avatar_seed.eq.')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return { users: data || [], total: count || 0 };
}

/**
 * Update users with avatar seeds
 */
async function updateUserSeeds(users) {
  const updates = users.map(user => ({
    id: user.id,
    avatar_seed: generateSeedForUser(user.id),
    avatar_variant: 'beam',
    updated_at: new Date().toISOString()
  }));

  if (isDryRun) {
    console.log('🔍 DRY RUN - Would update:', updates.length, 'users');
    console.log('Sample updates:', updates.slice(0, 3));
    return { success: true, count: updates.length };
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(updates, {
      onConflict: 'id',
      ignoreDuplicates: false
    });

  if (error) {
    throw new Error(`Failed to update users: ${error.message}`);
  }

  return { success: true, count: updates.length };
}

/**
 * Get seed distribution statistics
 */
async function getSeedDistribution() {
  const { data, error } = await supabase
    .from('profiles')
    .select('avatar_seed')
    .not('avatar_seed', 'is', null);

  if (error) {
    throw new Error(`Failed to get distribution: ${error.message}`);
  }

  const distribution = {};
  data.forEach(user => {
    distribution[user.avatar_seed] = (distribution[user.avatar_seed] || 0) + 1;
  });

  return distribution;
}

/**
 * Display statistics
 */
function displayStats(stats) {
  console.log('\n📊 Distribution Statistics:\n');
  console.log('Seed'.padEnd(12), 'Count'.padEnd(10), 'Percentage');
  console.log('─'.repeat(40));

  const total = Object.values(stats).reduce((sum, count) => sum + count, 0);

  Object.entries(stats)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([seed, count]) => {
      const percentage = ((count / total) * 100).toFixed(2);
      console.log(
        seed.padEnd(12),
        count.toString().padEnd(10),
        `${percentage}%`
      );
    });

  console.log('─'.repeat(40));
  console.log('Total:'.padEnd(12), total.toString());
  console.log();
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🎨 Avatar Seeds Migration Script\n');
  console.log('═'.repeat(50));
  console.log(`Mode:       ${isDryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
  console.log(`Batch Size: ${BATCH_SIZE}`);
  console.log('═'.repeat(50), '\n');

  try {
    // Step 1: Fetch users
    const { users, total } = await fetchUsersWithoutSeeds();

    if (users.length === 0) {
      console.log('✅ All users already have avatar seeds configured!');

      // Show distribution
      const distribution = await getSeedDistribution();
      displayStats(distribution);

      process.exit(0);
    }

    console.log(`Found ${users.length} users without avatar seeds\n`);

    // Show sample users
    console.log('Sample users to update:');
    users.slice(0, 5).forEach((user, i) => {
      const seed = generateSeedForUser(user.id);
      console.log(`  ${i + 1}. ${user.email || 'No email'} → ${seed}`);
    });

    if (users.length > 5) {
      console.log(`  ... and ${users.length - 5} more`);
    }
    console.log();

    // Step 2: Process in batches
    let processed = 0;
    const startTime = Date.now();

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)}...`);

      const result = await updateUserSeeds(batch);
      processed += result.count;

      console.log(`  ✓ Updated ${result.count} users`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n═'.repeat(50));
    console.log('✅ Migration Complete!');
    console.log('═'.repeat(50));
    console.log(`Total users updated: ${processed}`);
    console.log(`Time taken: ${duration}s`);
    console.log(`Average: ${(processed / parseFloat(duration)).toFixed(2)} users/second`);
    console.log();

    // Step 3: Show distribution
    if (!isDryRun) {
      const distribution = await getSeedDistribution();
      displayStats(distribution);
    }

    // Recommendations
    console.log('💡 Next Steps:\n');
    console.log('1. Verify the distribution looks balanced');
    console.log('2. Test avatar display in the UI');
    console.log('3. Clear user profile caches if needed');
    console.log('4. Monitor for any issues\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
