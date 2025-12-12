/**
 * Script to import US location data from CSV files
 * Generates SQL files for import via Supabase migrations
 * Run with: node scripts/import-locations.js
 */

const fs = require('fs');
const path = require('path');

// Include all 50 US states + DC and territories
const TARGET_STATES = null; // null means include all states (no filtering)

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
 * Escape single quotes for SQL
 */
function escapeSql(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

/**
 * Generate SQL insert statements in batches
 */
function generateSqlBatches(locations, batchSize = 50) {
  const batches = [];

  for (let i = 0; i < locations.length; i += batchSize) {
    const batch = locations.slice(i, i + batchSize);
    const values = batch.map(loc =>
      `('${escapeSql(loc.zip_code)}','${escapeSql(loc.locale_name)}','${escapeSql(loc.city)}','${escapeSql(loc.state)}','${escapeSql(loc.area_name)}','${escapeSql(loc.district_name)}')`
    ).join(',\n');

    batches.push(`INSERT INTO us_locations (zip_code, locale_name, city, state, area_name, district_name) VALUES\n${values};`);
  }

  return batches;
}

/**
 * Main function
 */
function main() {
  console.log('Starting location data processing...\n');
  console.log(`Filtering for states: ${TARGET_STATES ? TARGET_STATES.join(', ') : 'ALL STATES'}\n`);

  // Parse all CSV files
  let allLocations = [];

  for (const filePath of CSV_FILES) {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }

    const locations = parseCSVFile(filePath);
    // Filter for target states (if specified) or include all
    const filtered = TARGET_STATES
      ? locations.filter(loc => TARGET_STATES.includes(loc.state))
      : locations;
    console.log(`  Total: ${locations.length}, After filter: ${filtered.length}\n`);
    allLocations = allLocations.concat(filtered);
  }

  console.log(`Total locations: ${allLocations.length}\n`);

  // Remove duplicates based on zip_code + locale_name + city + state
  const seen = new Set();
  const uniqueLocations = allLocations.filter(loc => {
    const key = `${loc.zip_code}-${loc.locale_name}-${loc.city}-${loc.state}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Unique locations after deduplication: ${uniqueLocations.length}\n`);

  // Count by state
  const stateCounts = {};
  uniqueLocations.forEach(loc => {
    stateCounts[loc.state] = (stateCounts[loc.state] || 0) + 1;
  });
  console.log('Counts by state:');
  Object.entries(stateCounts).forEach(([state, count]) => {
    console.log(`  ${state}: ${count}`);
  });

  // Generate SQL batches
  const batches = generateSqlBatches(uniqueLocations, 50);
  console.log(`\nGenerated ${batches.length} SQL batches\n`);

  // Write batches to files
  const outputDir = path.join(__dirname, '../assets/location_batches');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  batches.forEach((sql, idx) => {
    const filename = path.join(outputDir, `batch_${idx.toString().padStart(3, '0')}.sql`);
    fs.writeFileSync(filename, sql);
  });

  console.log(`SQL batches written to: ${outputDir}`);
  console.log(`\nTo import, use Supabase apply_migration for each batch file.`);
}

main();
