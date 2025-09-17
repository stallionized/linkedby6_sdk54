// Extract dominant colors from business logos using Sharp
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY required in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Download image from URL
 */
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Extract dominant color from image using Sharp
 */
async function extractDominantColor(imageUrl) {
  try {
    console.log(`  Processing image...`);

    // Handle base64 data URLs
    let imageBuffer;
    if (imageUrl.startsWith('data:image/')) {
      const base64Data = imageUrl.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      imageBuffer = await downloadImage(imageUrl);
    }

    // Process image with Sharp
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    // Resize to small size for faster processing
    const smallImage = await image
      .resize(100, 100, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = smallImage;
    const width = info.width;
    const height = info.height;
    const channels = info.channels;

    // Count color frequencies using color buckets (group similar colors)
    const colorMap = new Map();
    const bucketSize = 16; // Group colors into buckets to reduce noise

    // Sample all pixels, not just edges
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Skip if pixel has transparency (alpha < 128)
        if (channels === 4 && data[idx + 3] < 128) {
          continue;
        }

        // Create bucket key by rounding colors to nearest bucket
        const rBucket = Math.floor(r / bucketSize) * bucketSize;
        const gBucket = Math.floor(g / bucketSize) * bucketSize;
        const bBucket = Math.floor(b / bucketSize) * bucketSize;
        const key = `${rBucket},${gBucket},${bBucket}`;

        colorMap.set(key, (colorMap.get(key) || 0) + 1);
      }
    }

    // Find the most frequent color
    let maxCount = 0;
    let dominantColor = { r: 255, g: 255, b: 255 };

    for (const [key, count] of colorMap.entries()) {
      if (count > maxCount) {
        maxCount = count;
        const [r, g, b] = key.split(',').map(Number);
        dominantColor = { r, g, b };
      }
    }

    let r = dominantColor.r;
    let g = dominantColor.g;
    let b = dominantColor.b;

    const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

    // Calculate lightness for logging
    const lightness = Math.round(((Math.max(r, g, b) + Math.min(r, g, b)) / 2) / 255 * 100);

    console.log(`  Extracted color: ${hexColor} (lightness: ${lightness}%)`);
    return hexColor;

  } catch (error) {
    console.error(`  Error: ${error.message}`);
    return '#FFFFFF';
  }
}

/**
 * Process businesses
 */
async function processBusinessLogos(batchSize = 5, specificBusinessId = null) {
  try {
    console.log('\n' + '═'.repeat(60));
    console.log('LOGO COLOR EXTRACTION');
    console.log('═'.repeat(60) + '\n');

    let query = supabase
      .from('business_profiles')
      .select('business_id, business_name, image_url, logo_dominant_color')
      .not('image_url', 'is', null);

    if (specificBusinessId) {
      query = query.eq('business_id', specificBusinessId);
    } else {
      query = query.is('logo_dominant_color', null).limit(batchSize);
    }

    const { data: businesses, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return;
    }

    if (businesses.length === 0) {
      console.log('✓ No businesses found to process.\n');
      return;
    }

    console.log(`Found ${businesses.length} business(es) with logos\n`);

    let processed = 0;
    let failed = 0;

    for (const business of businesses) {
      try {
        console.log(`[${processed + failed + 1}/${businesses.length}] ${business.business_name}`);
        console.log(`  Image URL: ${business.image_url.substring(0, 100)}...`);

        const color = await extractDominantColor(business.image_url);

        const { error: updateError } = await supabase
          .from('business_profiles')
          .update({ logo_dominant_color: color })
          .eq('business_id', business.business_id);

        if (updateError) {
          console.error(`  ✗ Database update failed:`, updateError.message);
          failed++;
        } else {
          console.log(`  ✓ Updated successfully\n`);
          processed++;
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`  ✗ Error:`, error.message, '\n');
        failed++;
      }
    }

    console.log('═'.repeat(60));
    console.log(`✓ Processed: ${processed} | ✗ Failed: ${failed}`);
    console.log('═'.repeat(60) + '\n');

  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Manual color setting
async function setColor(businessId, hexColor) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
    console.error('Invalid hex color format. Use: #RRGGBB');
    return;
  }

  const { error } = await supabase
    .from('business_profiles')
    .update({ logo_dominant_color: hexColor })
    .eq('business_id', businessId);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`✓ Updated business ${businessId} with color ${hexColor}`);
  }
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

if (command === 'process') {
  const businessId = args[1] && !args[1].match(/^\d+$/) ? args[1] : null;
  const batchSize = args[1] && args[1].match(/^\d+$/) ? parseInt(args[1]) :
                    args[2] && args[2].match(/^\d+$/) ? parseInt(args[2]) : 5;
  processBusinessLogos(batchSize, businessId);
} else if (command === 'set' && args[1] && args[2]) {
  setColor(args[1], args[2]);
} else {
  console.log('\nUsage:');
  console.log('  node scripts/extract-logo-colors-sharp.js process [BATCH_SIZE|BUSINESS_ID]');
  console.log('  node scripts/extract-logo-colors-sharp.js set BUSINESS_ID #HEXCOLOR\n');
  console.log('Examples:');
  console.log('  node scripts/extract-logo-colors-sharp.js process');
  console.log('  node scripts/extract-logo-colors-sharp.js process 10');
  console.log('  node scripts/extract-logo-colors-sharp.js process abc123');
  console.log('  node scripts/extract-logo-colors-sharp.js set abc123 #FF0000\n');
}
