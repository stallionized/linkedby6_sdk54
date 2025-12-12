/**
 * Script to import ZIP coordinates directly to Supabase
 * Reads the us.txt file and inserts in batches
 * Run with: node scripts/run-zip-import.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase connection - using the same config as the app
const SUPABASE_URL = 'https://oofugvbdkyqtidzuaelp.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZnVndmJka3lxdGlkenVhZWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3NDcxMTgsImV4cCI6MjA1OTMyMzExOH0.r80R3KlpKp0WbwPVlKk0dxW0_MlNTqfjYXs0skB8Lg4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Source file path
const SOURCE_FILE = path.join(__dirname, '../assets/us.txt');

/**
 * Parse a tab-delimited line from the GeoNames file
 */
function parseGeoNamesLine(line) {
  const parts = line.split('\t');
  if (parts.length < 12) return null;

  const [
    countryCode, zipCode, city, stateName, stateCode,
    county, countyFips, admin3, admin4, latitude, longitude, accuracy
  ] = parts;

  if (!zipCode || !latitude || !longitude) return null;

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lng)) return null;

  return {
    zip_code: zipCode.trim(),
    city: city?.trim() || null,
    state_name: stateName?.trim() || null,
    state_code: stateCode?.trim() || null,
    county: county?.trim() || null,
    latitude: lat,
    longitude: lng,
  };
}

/**
 * Insert records in batches
 */
async function insertBatch(records) {
  const { data, error } = await supabase
    .from('zip_coordinates')
    .insert(records);

  if (error) {
    console.error('Insert error:', error.message);
    return false;
  }
  return true;
}

/**
 * Main function
 */
async function main() {
  console.log('Starting ZIP coordinates import to Supabase...\n');

  // Check current count
  const { count: existingCount } = await supabase
    .from('zip_coordinates')
    .select('*', { count: 'exact', head: true });

  console.log(`Existing records in table: ${existingCount || 0}`);

  if (existingCount > 0) {
    console.log('Table already has data. Clearing existing records...');
    const { error: deleteError } = await supabase
      .from('zip_coordinates')
      .delete()
      .neq('id', 0); // Delete all

    if (deleteError) {
      console.error('Error clearing table:', deleteError.message);
      return;
    }
    console.log('Table cleared.\n');
  }

  // Read and parse the file
  const content = fs.readFileSync(SOURCE_FILE, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  console.log(`Total lines in file: ${lines.length}`);

  // Parse all lines
  const locations = [];
  const seen = new Set();

  for (const line of lines) {
    const parsed = parseGeoNamesLine(line);
    if (parsed && !seen.has(parsed.zip_code)) {
      seen.add(parsed.zip_code);
      locations.push(parsed);
    }
  }

  console.log(`Unique ZIP codes to import: ${locations.length}\n`);

  // Insert in batches of 500
  const BATCH_SIZE = 500;
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < locations.length; i += BATCH_SIZE) {
    const batch = locations.slice(i, i + BATCH_SIZE);
    const success = await insertBatch(batch);

    if (success) {
      inserted += batch.length;
      process.stdout.write(`\rInserted: ${inserted} / ${locations.length}`);
    } else {
      failed += batch.length;
      console.log(`\nFailed batch starting at index ${i}`);
    }
  }

  console.log(`\n\nImport complete!`);
  console.log(`Successfully inserted: ${inserted}`);
  console.log(`Failed: ${failed}`);

  // Verify final count
  const { count: finalCount } = await supabase
    .from('zip_coordinates')
    .select('*', { count: 'exact', head: true });

  console.log(`\nFinal record count: ${finalCount}`);
}

main().catch(console.error);
