// Edge Function: generate_embeddings
// Description: Generates embeddings for businesses that don't have them
// Can be triggered manually, via cron, or automatically when businesses are created/updated

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";

// ============================================================================
// Types and Interfaces
// ============================================================================

interface EmbeddingRequest {
  business_id?: string; // If specified, only generate for this business
  batch_size?: number; // How many businesses to process at once
  force_regenerate?: boolean; // Regenerate even if embedding exists
  text?: string; // Direct text to embed (for queue processing)
  process_queue?: boolean; // Process items from the queue
}

interface EmbeddingResponse {
  success: boolean;
  processed_count: number;
  failed_count: number;
  business_ids_processed: string[];
  errors?: Array<{ business_id: string; error: string }>;
  total_time_ms: number;
}

interface Business {
  business_id: string;
  business_name: string;
  description: string;
  industry: string;
}

interface BusinessEnrichment {
  industry_variations?: string[];
  business_name_variations?: string[];
  description_keywords?: string[];
  zip_codes?: string[];
  counties?: string[];
  nearby_cities?: string[];
  nearby_towns?: string[];
  service_areas?: string[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a rich text representation of a business for embedding
 * Industry field is emphasized to ensure proper categorization matching
 * Includes enrichment data (semantic variations and geographic info) if available
 */
function createBusinessText(business: Business, enrichment?: BusinessEnrichment): string {
  const industry = business.industry || "";
  const businessName = business.business_name || "";
  const description = business.description || "";

  // Start with core business info, emphasizing industry
  const parts = [
    `Business Name: ${businessName}`,
    `Primary Industry Category: ${industry}`,
    `Business Type: ${industry}`,
    `Industry Classification: ${industry}`,
    `Description: ${description}`,
  ];

  // Add enrichment data if available
  if (enrichment) {
    // Add industry variations
    if (enrichment.industry_variations && enrichment.industry_variations.length > 0) {
      parts.push(`Industry Variations: ${enrichment.industry_variations.join(", ")}`);
    }

    // Add business name variations
    if (enrichment.business_name_variations && enrichment.business_name_variations.length > 0) {
      parts.push(`Also Known As: ${enrichment.business_name_variations.join(", ")}`);
    }

    // Add description keywords
    if (enrichment.description_keywords && enrichment.description_keywords.length > 0) {
      parts.push(`Keywords: ${enrichment.description_keywords.join(", ")}`);
    }

    // Add geographic coverage
    if (enrichment.service_areas && enrichment.service_areas.length > 0) {
      parts.push(`Service Areas: ${enrichment.service_areas.join(", ")}`);
    }

    // Add zip codes
    if (enrichment.zip_codes && enrichment.zip_codes.length > 0) {
      parts.push(`Zip Codes: ${enrichment.zip_codes.join(", ")}`);
    }

    // Add counties
    if (enrichment.counties && enrichment.counties.length > 0) {
      parts.push(`Counties: ${enrichment.counties.join(", ")}`);
    }

    // Add nearby cities
    if (enrichment.nearby_cities && enrichment.nearby_cities.length > 0) {
      parts.push(`Nearby Cities: ${enrichment.nearby_cities.join(", ")}`);
    }

    // Add nearby towns
    if (enrichment.nearby_towns && enrichment.nearby_towns.length > 0) {
      parts.push(`Nearby Towns: ${enrichment.nearby_towns.join(", ")}`);
    }
  }

  return parts.filter((part) => part && !part.endsWith(": ")).join("\n");
}

/**
 * Generates embedding for a single business
 */
async function generateEmbedding(
  text: string,
  openai: OpenAI
): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  return response.data[0].embedding;
}

/**
 * Batch process embeddings with rate limiting
 */
async function processBusinessBatch(
  businesses: Business[],
  openai: OpenAI,
  supabase: any
): Promise<{
  processed: number;
  failed: number;
  errors: Array<{ business_id: string; error: string }>;
}> {
  let processed = 0;
  let failed = 0;
  const errors: Array<{ business_id: string; error: string }> = [];

  // Process in smaller chunks to avoid rate limits
  const CHUNK_SIZE = 10;

  for (let i = 0; i < businesses.length; i += CHUNK_SIZE) {
    const chunk = businesses.slice(i, i + CHUNK_SIZE);

    // Process chunk in parallel
    const results = await Promise.allSettled(
      chunk.map(async (business) => {
        try {
          // Fetch enrichment data if available
          const { data: enrichmentData } = await supabase.rpc(
            "get_business_enrichment",
            { p_business_id: business.business_id }
          );

          const enrichment = enrichmentData && enrichmentData.length > 0 ? enrichmentData[0] : undefined;

          // Create text representation with enrichment
          const businessText = createBusinessText(business, enrichment);

          if (!businessText.trim()) {
            throw new Error("Business has no text content");
          }

          // Generate embedding
          const embedding = await generateEmbedding(businessText, openai);

          // Update business_profiles with embedding
          const { error: updateError } = await supabase
            .from("business_profiles")
            .update({
              embedding: embedding,
              embedding_generated_at: new Date().toISOString(),
              embedding_model: "text-embedding-3-small",
            })
            .eq("business_id", business.business_id);

          if (updateError) {
            throw updateError;
          }

          console.log(`✓ Generated embedding for: ${business.business_name}${enrichment ? " (with enrichment)" : ""}`);
          return { success: true, business_id: business.business_id };
        } catch (error) {
          console.error(
            `✗ Failed to generate embedding for ${business.business_name}:`,
            error
          );
          return {
            success: false,
            business_id: business.business_id,
            error: error.message,
          };
        }
      })
    );

    // Count results
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value.success) {
        processed++;
      } else {
        failed++;
        if (result.status === "fulfilled") {
          errors.push({
            business_id: result.value.business_id,
            error: result.value.error,
          });
        } else {
          errors.push({
            business_id: "unknown",
            error: result.reason?.message || "Unknown error",
          });
        }
      }
    });

    // Small delay between chunks to respect rate limits
    if (i + CHUNK_SIZE < businesses.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return { processed, failed, errors };
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const startTime = Date.now();

  try {
    // Initialize clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;

    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Parse request
    const requestBody: EmbeddingRequest =
      req.method === "POST" ? await req.json() : {};
    const {
      business_id,
      batch_size = 100,
      force_regenerate = false,
      text,
      process_queue = false,
    } = requestBody;

    let businesses: Business[] = [];

    // Case 1: Process from queue (automatic mode)
    if (process_queue) {
      const { data: queueItems, error: queueError } = await supabase.rpc(
        "get_pending_embeddings",
        { batch_size }
      );

      if (queueError) {
        throw new Error(`Failed to fetch queue: ${queueError.message}`);
      }

      if (!queueItems || queueItems.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            processed_count: 0,
            failed_count: 0,
            business_ids_processed: [],
            message: "No items in queue",
            total_time_ms: Date.now() - startTime,
          } as EmbeddingResponse),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      console.log(`Processing ${queueItems.length} items from queue...`);

      let processed = 0;
      let failed = 0;
      const errors: Array<{ business_id: string; error: string }> = [];
      const processedIds: string[] = [];

      // Process each queue item
      for (const item of queueItems) {
        try {
          // Generate embedding
          const embedding = await generateEmbedding(item.business_text, openai);

          // Update business_profiles
          const { error: updateError } = await supabase
            .from("business_profiles")
            .update({
              embedding: embedding,
              embedding_generated_at: new Date().toISOString(),
              embedding_model: "text-embedding-3-small",
            })
            .eq("business_id", item.business_id);

          if (updateError) {
            throw updateError;
          }

          // Mark queue item as completed
          await supabase.rpc("mark_embedding_completed", {
            queue_id: item.id,
          });

          console.log(`✓ Generated embedding for business: ${item.business_id}`);
          processed++;
          processedIds.push(item.business_id);
        } catch (error) {
          console.error(`✗ Failed for business ${item.business_id}:`, error);

          // Mark as failed
          await supabase.rpc("mark_embedding_failed", {
            queue_id: item.id,
            error_msg: error.message,
          });

          failed++;
          errors.push({
            business_id: item.business_id,
            error: error.message,
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: failed === 0,
          processed_count: processed,
          failed_count: failed,
          business_ids_processed: processedIds,
          errors: errors.length > 0 ? errors : undefined,
          total_time_ms: Date.now() - startTime,
        } as EmbeddingResponse),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Case 2: Generate for specific business with direct text
    if (business_id && text) {
      try {
        const embedding = await generateEmbedding(text, openai);

        const { error: updateError } = await supabase
          .from("business_profiles")
          .update({
            embedding: embedding,
            embedding_generated_at: new Date().toISOString(),
            embedding_model: "text-embedding-3-small",
          })
          .eq("business_id", business_id);

        if (updateError) {
          throw updateError;
        }

        return new Response(
          JSON.stringify({
            success: true,
            processed_count: 1,
            failed_count: 0,
            business_ids_processed: [business_id],
            total_time_ms: Date.now() - startTime,
          } as EmbeddingResponse),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            processed_count: 0,
            failed_count: 1,
            business_ids_processed: [],
            error: error.message,
            total_time_ms: Date.now() - startTime,
          } as EmbeddingResponse),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
    }

    // Case 3: Generate for specific business (fetch from DB)
    if (business_id) {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("business_id, business_name, description, industry")
        .eq("business_id", business_id)
        .single();

      if (error) {
        throw new Error(`Business not found: ${error.message}`);
      }

      if (!force_regenerate && data.embedding) {
        return new Response(
          JSON.stringify({
            success: true,
            processed_count: 0,
            failed_count: 0,
            business_ids_processed: [],
            message: "Business already has an embedding (use force_regenerate=true to regenerate)",
          } as EmbeddingResponse),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      businesses = [data];
    }
    // Case 4: Batch process businesses needing embeddings (legacy mode)
    else {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("id as business_id, business_name, description, industry")
        .is("embedding", null)
        .limit(batch_size);

      if (error) {
        throw new Error(`Failed to fetch businesses: ${error.message}`);
      }

      businesses = data || [];
    }

    if (businesses.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed_count: 0,
          failed_count: 0,
          business_ids_processed: [],
          message: "No businesses need embeddings",
          total_time_ms: Date.now() - startTime,
        } as EmbeddingResponse),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    console.log(`Processing ${businesses.length} businesses...`);

    // Process embeddings
    const result = await processBusinessBatch(businesses, openai, supabase);

    const totalTimeMs = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: result.failed === 0,
        processed_count: result.processed,
        failed_count: result.failed,
        business_ids_processed: businesses.map((b) => b.business_id),
        errors: result.errors.length > 0 ? result.errors : undefined,
        total_time_ms: totalTimeMs,
      } as EmbeddingResponse),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error in generate_embeddings:", error);

    return new Response(
      JSON.stringify({
        success: false,
        processed_count: 0,
        failed_count: 0,
        business_ids_processed: [],
        error: error.message || "An unexpected error occurred",
        total_time_ms: Date.now() - startTime,
      } as EmbeddingResponse),
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
