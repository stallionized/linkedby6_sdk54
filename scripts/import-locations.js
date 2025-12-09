/**
 * Script to import US location data from CSV files into Supabase
 * Run with: node scripts/import-locations.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const SUPABASE_URL = 'https://oofugvbdkyqtidzuaelp.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('Set it with: set SUPABASE_SERVICE_ROLE_KEY=your_key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// CSV file paths
const CSV_FILES = [
  path.join(__dirname, '../assets/ZIP_Locale_Detail1.csv'),
  path.join(__dirname, '../assets/ZIP_Locale_Detail2.csv'),
  path.join(__dirname, '../assets/ZIP_Locale_Detail3.csv'),
];

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse CSV file and extract location data
 */
function parseCSVFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length === 0) return [];

  // Parse header to find column indices
  const header = parseCSVLine(lines[0].replace(/^\uFEFF/, '')); // Remove BOM
  const headerLower = header.map(h => h.toLowerCase().trim());

  // Find column indices (handling different column names across files)
  const zipCodeIdx = headerLower.findIndex(h =>
    h === 'zip code' || h === 'delivery zipcode' || h === 'zipcode'
  );
  const localeNameIdx = headerLower.findIndex(h => h === 'locale name');
  const cityIdx = headerLower.findIndex(h => h === 'physical city');
  const stateIdx = headerLower.findIndex(h => h === 'physical state');
  const areaNameIdx = headerLower.findIndex(h => h === 'area name');
  const districtNameIdx = headerLower.findIndex(h =>
    h === 'district name' || h === 'district'
  );

  console.log(`File: ${path.basename(filePath)}`);
  console.log(`  Header: ${header.join(', ')}`);
  console.log(`  Zip col: ${zipCodeIdx}, City col: ${cityIdx}, State col: ${stateIdx}`);

  const locations = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    const zipCode = zipCodeIdx >= 0 ? values[zipCodeIdx]?.trim() : null;
    const city = cityIdx >= 0 ? values[cityIdx]?.trim() : null;
    const state = stateIdx >= 0 ? values[stateIdx]?.trim() : null;

    // Skip rows without required fields
    if (!zipCode || !city || !state) continue;

    locations.push({
      zip_code: zipCode,
      locale_name: localeNameIdx >= 0 ? values[localeNameIdx]?.trim() || null : null,
      city: city,
      state: state,
      area_name: areaNameIdx >= 0 ? values[areaNameIdx]?.trim() || null : null,
      district_name: districtNameIdx >= 0 ? values[districtNameIdx]?.trim() || null : null,
    });
  }

  return locations;
}

/**
 * Insert locations in batches
 */
async function insertLocations(locations) {
  const BATCH_SIZE = 500;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < locations.length; i += BATCH_SIZE) {
    const batch = locations.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('us_locations')
      .insert(batch);

    if (error) {
      console.error(`Error inserting batch at ${i}:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }

    // Progress update
    if ((i + BATCH_SIZE) % 5000 === 0 || i + BATCH_SIZE >= locations.length) {
      console.log(`Progress: ${Math.min(i + BATCH_SIZE, locations.length)}/${locations.length} rows`);
    }
  }

  return { inserted, errors };
}

/**
 * Main function
 */
async function main() {
  console.log('Starting location data import...\n');

  // Check if table already has data
  const { count } = await supabase
    .from('us_locations')
    .select('*', { count: 'exact', head: true });

  if (count > 0) {
    console.log(`Table already has ${count} rows. Clearing existing data...`);
    const { error } = await supabase
      .from('us_locations')
      .delete()
      .neq('id', 0); // Delete all rows

    if (error) {
      console.error('Error clearing table:', error.message);
      process.exit(1);
    }
  }

  // Parse all CSV files
  let allLocations = [];

  for (const filePath of CSV_FILES) {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }

    const locations = parseCSVFile(filePath);
    console.log(`  Parsed ${locations.length} locations\n`);
    allLocations = allLocations.concat(locations);
  }

  console.log(`Total locations to import: ${allLocations.length}\n`);

  // Remove duplicates based on zip_code + city + state
  const seen = new Set();
  const uniqueLocations = allLocations.filter(loc => {
    const key = `${loc.zip_code}-${loc.city}-${loc.state}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Unique locations after deduplication: ${uniqueLocations.length}\n`);

  // Insert into database
  console.log('Inserting into database...');
  const { inserted, errors } = await insertLocations(uniqueLocations);

  console.log(`\nImport complete!`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Errors: ${errors}`);
}

main().catch(console.error);
