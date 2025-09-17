// Advanced script to extract dominant colors from business logos
// Uses get-image-colors library for accurate color extraction

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const getColors = require('get-image-colors');
const fetch = require('node-fetch');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
  console.error('Make sure you have a .env file with these variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Convert RGB to Hex
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Calculate color lightness (0-100)
 */
function getColorLightness(r, g, b) {
  return ((Math.max(r, g, b) + Math.min(r, g, b)) / 2) / 255 * 100;
}

/**
 * Extract the dominant background color from an image
 * Prefers lighter colors as they're typically backgrounds
 */
async function extractDominantColor(imageUrl) {
  try {
    console.log(`  Fetching image from ${imageUrl}...`);

    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const buffer = await response.buffer();

    // Extract colors from the image
    const colors = await getColors(buffer, 'image/png');

    // Find the lightest color (most likely to be the background)
    let lightestColor = null;
    let maxLightness = -1;

    for (const color of colors) {
      const [r, g, b] = color.rgb();
      const lightness = getColorLightness(r, g, b);

      // Prefer lighter colors (backgrounds are typically light)
      if (lightness > maxLightness) {
        maxLightness = lightness;
        lightestColor = { r, g, b };
      }
    }

    if (lightestColor) {
      const hexColor = rgbToHex(lightestColor.r, lightestColor.g, lightestColor.b);
      console.log(`  Extracted color: ${hexColor} (lightness: ${Math.round(maxLightness)}%)`);
      return hexColor;
    }

    // Fallback to white
    return '#FFFFFF';

  } catch (error) {
    console.error(`  Error extracting color: ${error.message}`);
    // Return white as fallback
    return '#FFFFFF';
  }
}

/**
 * Process businesses and extract logo colors
 */
async function processBusinessLogos(options = {}) {
  const {
    batchSize = 10,
    specificBusinessId = null,
    forceReprocess = false
  } = options;

  try {
    console.log('Fetching businesses with logos...\n');

    let query = supabase
      .from('business_profiles')
      .select('business_id, business_name, image_url, logo_dominant_color')
      .not('image_url', 'is', null);

    if (specificBusinessId) {
      query = query.eq('business_id', specificBusinessId);
    } else {
      if (!forceReprocess) {
        query = query.is('logo_dominant_color', null);
      }
      query = query.limit(batchSize);
    }

    const { data: businesses, error } = await query;

    if (error) {
      console.error('Error fetching businesses:', error);
      return;
    }

    if (businesses.length === 0) {
      console.log('No businesses found to process.');
      return;
    }

    console.log(`Found ${businesses.length} business(es) to process\n`);

    let processed = 0;
    let failed = 0;
    const results = [];

    for (const business of businesses) {
      try {
        console.log(`[${processed + failed + 1}/${businesses.length}] Processing: ${business.business_name}`);

        const color = await extractDominantColor(business.image_url);

        const { error: updateError } = await supabase
          .from('business_profiles')
          .update({ logo_dominant_color: color })
          .eq('business_id', business.business_id);

        if (updateError) {
          console.error(`  ✗ Error updating database:`, updateError.message);
          failed++;
          results.push({ name: business.business_name, status: 'failed', error: updateError.message });
        } else {
          console.log(`  ✓ Successfully updated with color ${color}\n`);
          processed++;
          results.push({ name: business.business_name, status: 'success', color });
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`  ✗ Error processing ${business.business_name}:`, error.message, '\n');
        failed++;
        results.push({ name: business.business_name, status: 'failed', error: error.message });
      }
    }

    console.log('═'.repeat(60));
    console.log('PROCESSING COMPLETE');
    console.log('═'.repeat(60));
    console.log(`✓ Successfully processed: ${processed}`);
    console.log(`✗ Failed: ${failed}`);
    console.log('');

    if (processed > 0) {
      console.log('Successfully processed businesses:');
      results
        .filter(r => r.status === 'success')
        .forEach(r => console.log(`  • ${r.name}: ${r.color}`));
      console.log('');
    }

    if (failed > 0) {
      console.log('Failed businesses:');
      results
        .filter(r => r.status === 'failed')
        .forEach(r => console.log(`  • ${r.name}: ${r.error}`));
    }

  } catch (error) {
    console.error('Fatal error in processBusinessLogos:', error);
  }
}

/**
 * Manually set a color for a specific business
 */
async function setBusinessColor(businessId, hexColor) {
  try {
    // Validate hex color format
    if (!/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
      console.error('Error: Invalid hex color format. Use format: #RRGGBB');
      return;
    }

    const { error } = await supabase
      .from('business_profiles')
      .update({ logo_dominant_color: hexColor })
      .eq('business_id', businessId);

    if (error) {
      console.error('Error updating color:', error);
    } else {
      console.log(`✓ Successfully updated business ${businessId} with color ${hexColor}`);
    }
  } catch (error) {
    console.error('Error in setBusinessColor:', error);
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

console.log('');
console.log('═'.repeat(60));
console.log('LOGO COLOR EXTRACTION TOOL');
console.log('═'.repeat(60));
console.log('');

if (command === 'set-color' && args[1] && args[2]) {
  // Manual color setting
  setBusinessColor(args[1], args[2]);
} else if (command === 'process') {
  // Extract from command line args
  const specificBusinessId = args[1] && !args[1].match(/^\d+$/) ? args[1] : null;
  const batchSize = args[1] && args[1].match(/^\d+$/) ? parseInt(args[1]) :
                    args[2] && args[2].match(/^\d+$/) ? parseInt(args[2]) : 10;
  const forceReprocess = args.includes('--force');

  processBusinessLogos({
    batchSize,
    specificBusinessId,
    forceReprocess
  });
} else {
  console.log('Usage:');
  console.log('  node scripts/extract-logo-colors-advanced.js process [OPTIONS]');
  console.log('  node scripts/extract-logo-colors-advanced.js set-color BUSINESS_ID #HEXCOLOR');
  console.log('');
  console.log('Options for process:');
  console.log('  [BATCH_SIZE]       Number of businesses to process (default: 10)');
  console.log('  [BUSINESS_ID]      Process a specific business');
  console.log('  --force            Reprocess businesses that already have colors');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/extract-logo-colors-advanced.js process');
  console.log('  node scripts/extract-logo-colors-advanced.js process 50');
  console.log('  node scripts/extract-logo-colors-advanced.js process abc123');
  console.log('  node scripts/extract-logo-colors-advanced.js process --force');
  console.log('  node scripts/extract-logo-colors-advanced.js set-color abc123 #FF0000');
  console.log('');
}
