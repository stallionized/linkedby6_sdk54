// regenerate-all-enrichments.js
// Regenerates enriched embeddings for all existing business profiles
// This ensures all profiles have semantic variations and updated embeddings

const { createClient } = require('@supabase/supabase-js');

// Load environment variables from parent directory
require('dotenv').config({ path: '../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
// Try both SERVICE_ROLE_KEY and ACCESS_TOKEN (ACCESS_TOKEN can work for admin operations)
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_URL) {
  console.error('❌ Error: Missing SUPABASE_URL');
  console.error('Add SUPABASE_URL to .env file in project root');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ACCESS_TOKEN');
  console.error('Add SUPABASE_SERVICE_ROLE_KEY to .env file in project root');
  console.error('Or use SUPABASE_ACCESS_TOKEN if you have admin access');
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log(`   SUPABASE_URL: ${SUPABASE_URL}`);
console.log(`   Using key: ${SUPABASE_SERVICE_KEY.substring(0, 10)}...`);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Delay between API calls to avoid rate limiting
const DELAY_MS = 2000; // 2 seconds between each enrichment call

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch all active business profiles that need enrichment
 */
async function fetchBusinessProfiles() {
  console.log('📥 Fetching all active business profiles...\n');

  const { data: profiles, error } = await supabase
    .from('business_profiles')
    .select(`
      business_id,
      business_name,
      industry,
      description,
      city,
      state,
      zip_code,
      coverage_type,
      coverage_radius,
      coverage_details,
      business_status,
      is_active
    `)
    .eq('is_active', true)
    .eq('business_status', 'Active')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching profiles:', error);
    throw error;
  }

  console.log(`✅ Found ${profiles.length} active business profiles\n`);
  return profiles;
}

/**
 * Check if a business already has enrichment data
 */
async function checkExistingEnrichment(businessId) {
  const { data, error} = await supabase
    .from('business_profile_enrichment')
    .select('business_id, updated_at')
    .eq('business_id', businessId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error(`   ⚠️  Error checking enrichment:`, error.message);
    return null;
  }

  return data;
}

/**
 * Trigger enrichment for a single business profile
 */
async function enrichBusinessProfile(profile) {
  const { business_id, business_name, industry, description, city, state, zip_code, coverage_type, coverage_radius, coverage_details } = profile;

  console.log(`🔄 Processing: ${business_name} (${industry})`);
  console.log(`   Business ID: ${business_id}`);
  console.log(`   Location: ${city}, ${state}`);

  // Check if already enriched
  const existing = await checkExistingEnrichment(business_id);
  if (existing) {
    console.log(`   ℹ️  Already enriched (last updated: ${new Date(existing.updated_at).toLocaleString()})`);
    console.log(`   🔄 Re-enriching with latest data...`);
  }

  // Validate minimum required fields (only name, industry, description are truly required)
  if (!business_name || !industry || !description) {
    console.log(`   ⚠️  SKIPPED - Missing critical fields:`);
    if (!business_name) console.log(`      - business_name`);
    if (!industry) console.log(`      - industry`);
    if (!description) console.log(`      - description`);
    return { success: false, skipped: true, reason: 'missing_critical_fields' };
  }

  // Warn about missing location data but continue
  if (!city || !state) {
    console.log(`   ⚠️  Warning: Missing location data (city/state) - geographic enrichment will be limited`);
  }

  try {
    // Call enrich_business_profile Edge Function
    const { data, error } = await supabase.functions.invoke('enrich_business_profile', {
      body: {
        business_id,
        business_data: {
          business_name: business_name.trim(),
          industry: industry.trim(),
          description: description.trim(),
          city: city ? city.trim() : 'Unknown',
          state: state ? state.trim() : 'Unknown',
          zip_code: zip_code ? zip_code.trim() : null,
          coverage_type: coverage_type || null,
          coverage_radius: coverage_radius || null,
          service_areas: coverage_details ? [coverage_details] : [],
        },
      },
    });

    if (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      return { success: false, error: error.message };
    }

    if (data && data.success) {
      console.log(`   ✅ SUCCESS - Enrichment complete!`);
      if (data.enriched_data && data.enriched_data.enrichment) {
        const enrichment = data.enriched_data.enrichment;
        console.log(`      - Industry variations: ${enrichment.industry_variations?.length || 0}`);
        console.log(`      - Name variations: ${enrichment.business_name_variations?.length || 0}`);
        console.log(`      - Keywords: ${enrichment.description_keywords?.length || 0}`);
        console.log(`      - Geographic data: ${enrichment.nearby_cities?.length || 0} cities, ${enrichment.zip_codes?.length || 0} zip codes`);
      }
      return { success: true };
    } else {
      console.log(`   ⚠️  Warning: Enrichment returned but success flag is false`);
      return { success: false, error: 'enrichment_failed' };
    }
  } catch (err) {
    console.log(`   ❌ EXCEPTION: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     REGENERATE ENRICHED EMBEDDINGS FOR ALL BUSINESS PROFILES     ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    // Fetch all profiles
    const profiles = await fetchBusinessProfiles();

    if (profiles.length === 0) {
      console.log('ℹ️  No active business profiles found. Nothing to do.\n');
      return;
    }

    // Statistics
    const stats = {
      total: profiles.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log(`║  Processing ${profiles.length} business profiles...                          ║`);
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    // Process each profile
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];

      console.log(`\n[${ i + 1 }/${profiles.length}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      const result = await enrichBusinessProfile(profile);

      if (result.success) {
        stats.success++;
      } else if (result.skipped) {
        stats.skipped++;
      } else {
        stats.failed++;
        stats.errors.push({
          business_name: profile.business_name,
          business_id: profile.business_id,
          error: result.error,
        });
      }

      // Delay between calls to avoid rate limiting (except for last one)
      if (i < profiles.length - 1) {
        console.log(`\n   ⏳ Waiting ${DELAY_MS / 1000}s before next profile...`);
        await delay(DELAY_MS);
      }
    }

    // Final summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                        FINAL SUMMARY                              ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Statistics:`);
    console.log(`   Total Profiles:    ${stats.total}`);
    console.log(`   ✅ Successful:     ${stats.success}`);
    console.log(`   ⚠️  Skipped:        ${stats.skipped}`);
    console.log(`   ❌ Failed:         ${stats.failed}`);
    console.log(`   ⏱️  Duration:       ${duration}s\n`);

    if (stats.errors.length > 0) {
      console.log(`❌ Errors encountered:\n`);
      stats.errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.business_name} (${err.business_id})`);
        console.log(`      Error: ${err.error}\n`);
      });
    }

    if (stats.success === stats.total) {
      console.log('🎉 All business profiles enriched successfully!\n');
    } else if (stats.success > 0) {
      console.log(`✅ ${stats.success} profiles enriched successfully.`);
      if (stats.failed > 0) {
        console.log(`⚠️  ${stats.failed} profiles failed. Review errors above.\n`);
      }
      if (stats.skipped > 0) {
        console.log(`ℹ️  ${stats.skipped} profiles skipped (missing required fields).\n`);
      }
    } else {
      console.log('❌ No profiles were successfully enriched. Review errors above.\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => {
    console.log('✅ Script completed successfully.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
