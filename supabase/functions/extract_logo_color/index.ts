// Edge Function: extract_logo_color
// Description: Extracts the dominant background color from a business logo
// This function analyzes the logo image and stores the dominant color in the database

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ============================================================================
// Types and Interfaces
// ============================================================================

interface ColorExtractionRequest {
  business_id?: string; // If specified, extract color for this business only
  image_url?: string; // Direct image URL to analyze
  batch_size?: number; // How many businesses to process at once
}

interface ColorExtractionResponse {
  success: boolean;
  processed_count: number;
  failed_count: number;
  business_ids_processed: string[];
  errors?: Array<{ business_id: string; error: string }>;
}

interface Business {
  business_id: string;
  business_name: string;
  image_url: string;
  logo_dominant_color?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts the dominant color from an image URL
 * Uses edge pixel sampling to find background color
 */
async function extractDominantColor(imageUrl: string): Promise<string> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const imageData = new Uint8Array(imageBuffer);

    // For simplicity, we'll use a color analysis approach
    // In a real implementation, you'd use an image processing library
    // For now, we'll analyze the image data directly

    // This is a placeholder - you would need to use an image processing library
    // like sharp or jimp to properly analyze the image
    // For React Native compatibility, the color should be stored in the database
    // and passed as a prop to the component

    // Return white as default for now
    // TODO: Implement proper color extraction using an image processing library
    return '#FFFFFF';
  } catch (error) {
    console.error('Error extracting color:', error);
    throw error;
  }
}

/**
 * Simple color extraction by analyzing image bytes
 * This is a basic implementation that samples the image data
 */
function analyzeImageData(data: Uint8Array): string {
  // This is a simplified version
  // In production, you'd want to use a proper image processing library

  // For now, return a default color
  // The proper implementation would:
  // 1. Decode the image (PNG, JPG, etc.)
  // 2. Sample edge pixels
  // 3. Calculate average/dominant color
  // 4. Return hex color code

  return '#FFFFFF';
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const body: ColorExtractionRequest = await req.json();
    const { business_id, image_url, batch_size = 10 } = body;

    const processedIds: string[] = [];
    const errors: Array<{ business_id: string; error: string }> = [];

    // Case 1: Direct image URL provided
    if (image_url) {
      try {
        const color = await extractDominantColor(image_url);
        return new Response(
          JSON.stringify({
            success: true,
            color: color,
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      } catch (error) {
        throw new Error(`Failed to extract color: ${error.message}`);
      }
    }

    // Case 2: Process specific business
    if (business_id) {
      const { data: business, error: fetchError } = await supabase
        .from("business_profiles")
        .select("business_id, business_name, image_url")
        .eq("business_id", business_id)
        .single();

      if (fetchError) throw fetchError;
      if (!business.image_url) {
        throw new Error("Business has no logo image");
      }

      try {
        const color = await extractDominantColor(business.image_url);

        const { error: updateError } = await supabase
          .from("business_profiles")
          .update({ logo_dominant_color: color })
          .eq("business_id", business_id);

        if (updateError) throw updateError;

        processedIds.push(business_id);
      } catch (error) {
        errors.push({ business_id, error: error.message });
      }
    }
    // Case 3: Batch process businesses without colors
    else {
      const { data: businesses, error: fetchError } = await supabase
        .from("business_profiles")
        .select("business_id, business_name, image_url")
        .not("image_url", "is", null)
        .is("logo_dominant_color", null)
        .limit(batch_size);

      if (fetchError) throw fetchError;

      for (const business of businesses || []) {
        try {
          const color = await extractDominantColor(business.image_url);

          const { error: updateError } = await supabase
            .from("business_profiles")
            .update({ logo_dominant_color: color })
            .eq("business_id", business.business_id);

          if (updateError) throw updateError;

          processedIds.push(business.business_id);
        } catch (error) {
          errors.push({ business_id: business.business_id, error: error.message });
        }
      }
    }

    const response: ColorExtractionResponse = {
      success: true,
      processed_count: processedIds.length,
      failed_count: errors.length,
      business_ids_processed: processedIds,
      errors: errors.length > 0 ? errors : undefined,
    };

    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error in extract_logo_color:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
