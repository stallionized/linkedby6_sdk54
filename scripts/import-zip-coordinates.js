/**
 * Script to import US ZIP code coordinates from GeoNames data file
 * Generates SQL files for import via Supabase migrations
 * Run with: node scripts/import-zip-coordinates.js
 */

const fs = require('fs');
const path = require('path');

// Source file path (GeoNames format, tab-delimited)
const SOURCE_FILE = path.join(__dirname, '../assets/us.txt');

// Output directory for SQL batches
const OUTPUT_DIR = path.join(__dirname, '../assets/zip_coordinates_batches');

/**
 * Parse a tab-delimited line from the GeoNames file
 * Format: country_code, zip_code, city, state_name, state_code, county, county_fips, admin3, admin4, latitude, longitude, accuracy
 */
function parseGeoNamesLine(line) {
  const parts = line.split('\t');

  if (parts.length < 12) return null;

  const [
    countryCode,  // 0: US
    zipCode,      // 1: 99553
    city,         // 2: Akutan
    stateName,    // 3: Alaska
    stateCode,    // 4: AK
    county,       // 5: Aleutians East
    countyFips,   // 6: 013
    admin3,       // 7: (usually empty)
    admin4,       // 8: (usually empty)
    latitude,     // 9: 54.143
    longitude,    // 10: -165.7854
    accuracy      // 11: 1
  ] = parts;

  // Validate required fields
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
 * Escape single quotes for SQL
 */
function escapeSql(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

/**
 * Generate SQL insert statements in batches
 */
function generateSqlBatches(locations, batchSize = 100) {
  const batches = [];

  for (let i = 0; i < locations.length; i += batchSize) {
    const batch = locations.slice(i, i + batchSize);
    const values = batch.map(loc =>
      `('${escapeSql(loc.zip_code)}','${escapeSql(loc.city)}','${escapeSql(loc.state_name)}','${escapeSql(loc.state_code)}','${escapeSql(loc.county)}',${loc.latitude},${loc.longitude})`
    ).join(',\n');

    batches.push(`INSERT INTO zip_coordinates (zip_code, city, state_name, state_code, county, latitude, longitude) VALUES\n${values};`);
  }

  return batches;
}

/**
 * Main function
 */
function main() {
  console.log('Starting ZIP coordinates import...\n');

  // Check if source file exists
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`Source file not found: ${SOURCE_FILE}`);
    process.exit(1);
  }

  // Read and parse the file
  const content = fs.readFileSync(SOURCE_FILE, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  console.log(`Total lines in file: ${lines.length}`);

  // Parse all lines
  const locations = [];
  let skipped = 0;

  for (const line of lines) {
    const parsed = parseGeoNamesLine(line);
    if (parsed) {
      locations.push(parsed);
    } else {
      skipped++;
    }
  }

  console.log(`Successfully parsed: ${locations.length}`);
  console.log(`Skipped (invalid): ${skipped}\n`);

  // Remove duplicates based on zip_code (keep first occurrence)
  const seen = new Set();
  const uniqueLocations = locations.filter(loc => {
    if (seen.has(loc.zip_code)) return false;
    seen.add(loc.zip_code);
    return true;
  });

  console.log(`Unique ZIP codes: ${uniqueLocations.length}\n`);

  // Count by state
  const stateCounts = {};
  uniqueLocations.forEach(loc => {
    const state = loc.state_code || 'Unknown';
    stateCounts[state] = (stateCounts[state] || 0) + 1;
  });

  console.log('Counts by state:');
  Object.entries(stateCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([state, count]) => {
      console.log(`  ${state}: ${count}`);
    });

  // Generate SQL batches
  const batches = generateSqlBatches(uniqueLocations, 100);
  console.log(`\nGenerated ${batches.length} SQL batches (100 records each)\n`);

  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write batches to files
  batches.forEach((sql, idx) => {
    const filename = path.join(OUTPUT_DIR, `batch_${idx.toString().padStart(3, '0')}.sql`);
    fs.writeFileSync(filename, sql);
  });

  console.log(`SQL batches written to: ${OUTPUT_DIR}`);
  console.log(`\nTo import, run each batch file in Supabase SQL editor or use apply_migration.`);

  // Also generate a combined SQL file for convenience
  const combinedFile = path.join(OUTPUT_DIR, '_combined_all.sql');
  const combinedSql = batches.join('\n\n');
  fs.writeFileSync(combinedFile, combinedSql);
  console.log(`Combined SQL file written to: ${combinedFile}`);
}

main();
