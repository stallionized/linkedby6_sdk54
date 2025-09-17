/**
 * Script: Generate Embeddings for All Businesses
 *
 * This script generates embeddings for all businesses in batches.
 * Run this after deploying the Edge Functions to populate embeddings.
 *
 * Usage:
 *   node scripts/generate-all-embeddings.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oofugvbdkyqtidzuaelp.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';
const BATCH_SIZE = 50; // Process 50 businesses at a time
const DELAY_BETWEEN_BATCHES_MS = 2000; // 2 second delay to avoid rate limits

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gets the count of businesses without embeddings
 */
async function getBusinessesNeedingEmbeddingsCount() {
  const { data, error, count } = await supabase
    .from('business_profiles')
    .select('business_id', { count: 'exact', head: true })
    .is('embedding', null);

  if (error) {
    console.error('Error counting businesses:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Calls the generate_embeddings Edge Function
 */
async function generateEmbeddingsBatch(batchSize) {
  try {
    const { data, error } = await supabase.functions.invoke('generate_embeddings', {
      body: { batch_size: batchSize }
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting embedding generation for all businesses...\n');

  // Get initial count
  const totalNeedingEmbeddings = await getBusinessesNeedingEmbeddingsCount();

  if (totalNeedingEmbeddings === 0) {
    console.log('✅ All businesses already have embeddings!');
    return;
  }

  console.log(`📊 Total businesses needing embeddings: ${totalNeedingEmbeddings}`);
  console.log(`📦 Batch size: ${BATCH_SIZE}`);
  console.log(`⏱️  Delay between batches: ${DELAY_BETWEEN_BATCHES_MS}ms\n`);

  let totalProcessed = 0;
  let totalFailed = 0;
  let batchNumber = 1;

  while (true) {
    console.log(`\n🔄 Processing batch ${batchNumber}...`);

    try {
      const result = await generateEmbeddingsBatch(BATCH_SIZE);

      totalProcessed += result.processed_count;
      totalFailed += result.failed_count;

      console.log(`   ✓ Processed: ${result.processed_count}`);
      console.log(`   ✗ Failed: ${result.failed_count}`);
      console.log(`   ⏱️  Time: ${result.total_time_ms}ms`);

      if (result.errors && result.errors.length > 0) {
        console.log(`   ⚠️  Errors:`);
        result.errors.forEach(err => {
          console.log(`      - ${err.business_id}: ${err.error}`);
        });
      }

      // Check if there are more businesses to process
      const remaining = await getBusinessesNeedingEmbeddingsCount();

      if (remaining === 0) {
        console.log('\n✅ All embeddings generated!');
        break;
      }

      console.log(`   📊 Remaining: ${remaining}`);

      // Wait before next batch to avoid rate limits
      console.log(`   ⏳ Waiting ${DELAY_BETWEEN_BATCHES_MS}ms before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES_MS);

      batchNumber++;
    } catch (error) {
      console.error(`\n❌ Error in batch ${batchNumber}:`, error.message);
      console.log('Stopping execution. You can re-run this script to continue.');
      break;
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total batches processed: ${batchNumber}`);
  console.log(`Total businesses processed: ${totalProcessed}`);
  console.log(`Total failures: ${totalFailed}`);
  console.log(`Success rate: ${totalProcessed > 0 ? ((totalProcessed / (totalProcessed + totalFailed)) * 100).toFixed(2) : 0}%`);
  console.log('='.repeat(50));

  if (totalFailed > 0) {
    console.log('\n⚠️  Some businesses failed to generate embeddings.');
    console.log('   Check the logs above for details and retry if needed.');
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
