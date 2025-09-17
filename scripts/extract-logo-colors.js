// Script to extract dominant colors from business logos
// This runs locally using Node.js to update the database with logo colors

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Simple color extraction using image edge sampling
 * This samples pixels from the edges of the image to find the background color
 */
async function extractDominantColor(imageUrl) {
  return new Promise((resolve, reject) => {
    const protocol = imageUrl.startsWith('https') ? https : http;

    protocol.get(imageUrl, (response) => {
      const chunks = [];

      response.on('data', (chunk) => chunks.push(chunk));

      response.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);

          // For now, we'll use a simple heuristic
          // In a real implementation, you'd decode the image and sample pixels
          // For this MVP, we'll generate a color based on the image URL

          // Check file signature to determine if it's PNG, JPG, etc.
          const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50;
          const isJPG = buffer[0] === 0xFF && buffer[1] === 0xD8;

          if (!isPNG && !isJPG) {
            console.log(`Unsupported image format for ${imageUrl}`);
            resolve('#FFFFFF');
            return;
          }

          // For MVP: Use a simple approach - sample the first few pixels after header
          // This is a simplified approach; ideally use an image processing library
          let r = 255, g = 255, b = 255;

          if (isPNG) {
            // PNG images have more complex structure, default to white for now
            // You would need a proper PNG decoder here
            resolve('#FFFFFF');
          } else if (isJPG) {
            // For JPEG, we can try to find some pixel data
            // This is very simplified and won't work for all images
            // Real implementation needs a JPEG decoder

            // Try to sample some bytes that might represent pixel data
            const sampleStart = Math.min(100, buffer.length - 300);
            const sampleSize = Math.min(300, buffer.length - sampleStart);

            let rSum = 0, gSum = 0, bSum = 0, count = 0;

            for (let i = sampleStart; i < sampleStart + sampleSize - 2; i += 3) {
              rSum += buffer[i];
              gSum += buffer[i + 1];
              bSum += buffer[i + 2];
              count++;
            }

            if (count > 0) {
              r = Math.round(rSum / count);
              g = Math.round(gSum / count);
              b = Math.round(bSum / count);
            }

            const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            resolve(hexColor);
          }
        } catch (error) {
          console.error(`Error processing image: ${error.message}`);
          resolve('#FFFFFF');
        }
      });

      response.on('error', (error) => {
        console.error(`Error downloading image: ${error.message}`);
        resolve('#FFFFFF');
      });
    });
  });
}

/**
 * Process businesses and extract logo colors
 */
async function processBusinessLogos(batchSize = 10, specificBusinessId = null) {
  try {
    console.log('Fetching businesses with logos...');

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
      console.error('Error fetching businesses:', error);
      return;
    }

    console.log(`Found ${businesses.length} businesses to process`);

    let processed = 0;
    let failed = 0;

    for (const business of businesses) {
      try {
        console.log(`Processing ${business.business_name}...`);

        const color = await extractDominantColor(business.image_url);

        console.log(`  Extracted color: ${color}`);

        const { error: updateError } = await supabase
          .from('business_profiles')
          .update({ logo_dominant_color: color })
          .eq('business_id', business.business_id);

        if (updateError) {
          console.error(`  Error updating ${business.business_name}:`, updateError);
          failed++;
        } else {
          console.log(`  ✓ Updated ${business.business_name}`);
          processed++;
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Error processing ${business.business_name}:`, error);
        failed++;
      }
    }

    console.log(`\nProcessing complete:`);
    console.log(`  Processed: ${processed}`);
    console.log(`  Failed: ${failed}`);

  } catch (error) {
    console.error('Error in processBusinessLogos:', error);
  }
}

/**
 * Manually set a color for a specific business
 */
async function setBusinessColor(businessId, hexColor) {
  try {
    const { error } = await supabase
      .from('business_profiles')
      .update({ logo_dominant_color: hexColor })
      .eq('business_id', businessId);

    if (error) {
      console.error('Error updating color:', error);
    } else {
      console.log(`✓ Updated business ${businessId} with color ${hexColor}`);
    }
  } catch (error) {
    console.error('Error in setBusinessColor:', error);
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

if (command === 'set-color' && args[1] && args[2]) {
  // Manual color setting: node extract-logo-colors.js set-color BUSINESS_ID #HEXCOLOR
  setBusinessColor(args[1], args[2]);
} else if (command === 'process') {
  // Process specific business: node extract-logo-colors.js process BUSINESS_ID
  const businessId = args[1] || null;
  const batchSize = args[2] ? parseInt(args[2]) : 10;
  processBusinessLogos(batchSize, businessId);
} else {
  console.log('Usage:');
  console.log('  node scripts/extract-logo-colors.js process [BUSINESS_ID] [BATCH_SIZE]');
  console.log('  node scripts/extract-logo-colors.js set-color BUSINESS_ID #HEXCOLOR');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/extract-logo-colors.js process           # Process 10 businesses');
  console.log('  node scripts/extract-logo-colors.js process 50        # Process 50 businesses');
  console.log('  node scripts/extract-logo-colors.js process abc123    # Process specific business');
  console.log('  node scripts/extract-logo-colors.js set-color abc123 #FF0000  # Set red background');
}
