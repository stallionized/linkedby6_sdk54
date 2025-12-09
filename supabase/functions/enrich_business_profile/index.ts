// Edge Function: enrich_business_profile
// Description: Enriches business profiles with semantic variations and geographic data
// Generates industry variations, expands coverage areas, and updates embeddings

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";

// ============================================================================
// Types and Interfaces
// ============================================================================

interface EnrichmentRequest {
  business_data: {
    business_name: string;
    industry: string;
    description: string;
    city: string;
    state: string;
    zip_code?: string;
    location_type?: 'storefront' | 'office' | 'not_brick_mortar';
    coverage_type?: string;
    coverage_radius?: number;
    service_areas?: string[];
  };
  business_id?: string; // If updating existing business
}

interface EnrichmentResponse {
  success: boolean;
  business_id: string;
  enriched_data: {
    business_data: any;
    enrichment: {
      industry_variations: string[];
      business_name_variations: string[];
      description_keywords: string[];
      zip_codes: string[];
      counties: string[];
      nearby_cities: string[];
      nearby_towns: string[];
      service_areas: string[];
    };
  };
  message?: string;
  error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate semantic variations using OpenAI
 */
async function generateSemanticVariations(
  industry: string,
  businessName: string,
  description: string,
  openai: OpenAI
): Promise<{
  industry_variations: string[];
  business_name_variations: string[];
  description_keywords: string[];
}> {
  const systemPrompt = `You are an expert at generating semantic variations and keywords for business search optimization.

Given business information, generate:
1. Industry variations - alternative ways to describe the industry (synonyms, related terms, specialized variations)
2. Business name variations - shortened versions, acronyms, common misspellings
3. Description keywords - key terms that describe the business services/products

Guidelines:
- Generate 8-12 variations for each category
- Focus on terms users might actually search for
- Include both formal and informal terms
- Consider regional variations and common abbreviations
- For industry, include BOTH specialized and general terms
- For specialized professionals (attorneys, doctors, etc.), include:
  * The specific specialization (e.g., "Personal Injury Attorney")
  * Common abbreviations (e.g., "PI Lawyer")
  * General category (e.g., "Attorney", "Lawyer")
  * Service-based terms (e.g., "Personal Injury Law Firm")
  * Informal terms users might search (e.g., "Accident Lawyer", "Injury Attorney")

Examples:
- "Personal Injury Attorney" → "PI Lawyer", "Accident Attorney", "Injury Law Firm", "Personal Injury Lawyer", "Attorney", "Lawyer", "Car Accident Lawyer", "Slip and Fall Attorney"
- "Dermatologist" → "Skin Doctor", "Dermatology Clinic", "Skin Specialist", "Doctor", "Physician", "Skincare Doctor", "Acne Doctor"
- "HVAC Contractor" → "Heating and Cooling", "AC Repair", "Furnace Repair", "Air Conditioning Contractor", "Contractor", "HVAC Company", "Climate Control"

Respond in JSON format:
{
  "industry_variations": ["variation1", "variation2", ...],
  "business_name_variations": ["variation1", "variation2", ...],
  "description_keywords": ["keyword1", "keyword2", ...]
}`;

  const userPrompt = `Business Information:
- Industry: ${industry}
- Business Name: ${businessName}
- Description: ${description}

Generate semantic variations and keywords for search optimization.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    response_format: { type: "json_object" },
  });

  const response = JSON.parse(completion.choices[0].message.content || "{}");

  return {
    industry_variations: response.industry_variations || [],
    business_name_variations: response.business_name_variations || [],
    description_keywords: response.description_keywords || [],
  };
}

/**
 * Fetch geographic data using Google Geocoding API or similar
 * For now, this is a mock implementation - you'll need to integrate with a real geocoding service
 */
async function fetchGeographicData(
  city: string,
  state: string,
  zipCode?: string,
  coverageRadius?: number
): Promise<{
  zip_codes: string[];
  counties: string[];
  nearby_cities: string[];
  nearby_towns: string[];
  service_areas: string[];
}> {
  // TODO: Integrate with real geocoding API (Google Maps, OpenCage, etc.)
  // For MVP, we'll use basic data structure with the provided information

  const stateAbbrev = getStateAbbreviation(state);
  const countyName = await getCountyForCity(city, state);

  // Generate basic geographic coverage
  const zipCodes = zipCode ? [zipCode] : [];
  const counties = countyName ? [countyName] : [];
  const nearbyCities: string[] = [];
  const nearbyTowns: string[] = [];
  const serviceAreas = [
    `${city}, ${stateAbbrev}`,
    city,
  ];

  // Add surrounding areas based on coverage radius
  if (coverageRadius && coverageRadius > 0) {
    // Add "within X miles of [city]" to service areas
    serviceAreas.push(`within ${coverageRadius} miles of ${city}`);
  }

  return {
    zip_codes: zipCodes,
    counties: counties,
    nearby_cities: nearbyCities,
    nearby_towns: nearbyTowns,
    service_areas: serviceAreas,
  };
}

/**
 * Get state abbreviation
 */
function getStateAbbreviation(state: string): string {
  const stateMap: Record<string, string> = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
    "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
    "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
    "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
    "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
    "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
    "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
    "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
    "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
    "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
    "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
    "Wisconsin": "WI", "Wyoming": "WY",
  };

  // If already abbreviated, return as is
  if (state.length === 2) {
    return state.toUpperCase();
  }

  return stateMap[state] || state;
}

/**
 * Get county for a city (simplified - would use geocoding API in production)
 */
async function getCountyForCity(city: string, state: string): Promise<string> {
  // Simplified mapping - in production, use geocoding API
  const cityCountyMap: Record<string, string> = {
    "Staten Island": "Richmond County",
    "Brooklyn": "Kings County",
    "Manhattan": "New York County",
    "Queens": "Queens County",
    "Bronx": "Bronx County",
    // Add more as needed
  };

  return cityCountyMap[city] || "";
}

/**
 * Save or update business profile
 */
async function saveBusinessProfile(
  supabase: any,
  businessData: any,
  businessId?: string
): Promise<string> {
  if (businessId) {
    // Update existing business
    const { error } = await supabase
      .from("business_profiles")
      .update({
        business_name: businessData.business_name,
        industry: businessData.industry,
        description: businessData.description,
        city: businessData.city,
        state: businessData.state,
        zip_code: businessData.zip_code,
        coverage_type: businessData.coverage_type,
        coverage_radius: businessData.coverage_radius,
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId);

    if (error) throw error;
    return businessId;
  } else {
    // Create new business (would need user_id from auth)
    // For now, throw error - this should be handled by frontend with proper auth
    throw new Error("Creating new business requires authentication context");
  }
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
    const requestBody: EnrichmentRequest = await req.json();
    const { business_data, business_id } = requestBody;

    // Validate input
    if (
      !business_data.business_name ||
      !business_data.industry ||
      !business_data.description ||
      !business_data.city ||
      !business_data.state
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required business data fields",
        } as EnrichmentResponse),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Auto-populate coverage for brick-and-mortar businesses without explicit coverage
    const isBrickAndMortar = business_data.location_type === 'storefront' ||
                             business_data.location_type === 'office';
    const hasCoverage = business_data.coverage_type && business_data.coverage_type.trim() !== '';

    if (isBrickAndMortar && !hasCoverage) {
      console.log("Auto-populating coverage from physical address for brick-and-mortar business");
      business_data.coverage_type = 'local';
      business_data.service_areas = business_data.service_areas || [];
      business_data.service_areas.push(`${business_data.city}, ${business_data.state}`);

      // Update business_profiles table with inferred coverage
      if (business_id) {
        await supabase
          .from("business_profiles")
          .update({
            coverage_type: 'local',
            coverage_details: `${business_data.city}, ${business_data.state}`
          })
          .eq("business_id", business_id);
      }
    }

    console.log("Generating semantic variations...");

    // Step 1: Generate semantic variations
    const semanticVariations = await generateSemanticVariations(
      business_data.industry,
      business_data.business_name,
      business_data.description,
      openai
    );

    console.log("Fetching geographic data...");

    // Step 2: Fetch geographic enrichment data
    const geographicData = await fetchGeographicData(
      business_data.city,
      business_data.state,
      business_data.zip_code,
      business_data.coverage_radius
    );

    // Step 3: Combine enrichment data
    const enrichmentData = {
      industry_variations: semanticVariations.industry_variations,
      business_name_variations: semanticVariations.business_name_variations,
      description_keywords: semanticVariations.description_keywords,
      zip_codes: geographicData.zip_codes,
      counties: geographicData.counties,
      nearby_cities: geographicData.nearby_cities,
      nearby_towns: geographicData.nearby_towns,
      service_areas: [
        ...geographicData.service_areas,
        ...(business_data.service_areas || []),
      ],
    };

    console.log("Saving enrichment data...");

    // Step 4: Save enrichment to database
    if (business_id) {
      const { error: enrichmentError } = await supabase.rpc(
        "save_business_enrichment",
        {
          p_business_id: business_id,
          p_industry_variations: enrichmentData.industry_variations,
          p_business_name_variations: enrichmentData.business_name_variations,
          p_description_keywords: enrichmentData.description_keywords,
          p_zip_codes: enrichmentData.zip_codes,
          p_counties: enrichmentData.counties,
          p_nearby_cities: enrichmentData.nearby_cities,
          p_nearby_towns: enrichmentData.nearby_towns,
          p_service_areas: enrichmentData.service_areas,
          p_expanded_coverage_details: {
            coverage_type: business_data.coverage_type,
            coverage_radius: business_data.coverage_radius,
          },
        }
      );

      if (enrichmentError) {
        console.error("Error saving enrichment:", enrichmentError);
        throw enrichmentError;
      }

      // Step 5: Update business profile
      await saveBusinessProfile(supabase, business_data, business_id);

      console.log("Triggering embedding regeneration...");

      // Step 6: Trigger embedding regeneration
      try {
        await fetch(`${supabaseUrl}/functions/v1/generate_embeddings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            business_id: business_id,
          }),
        });
      } catch (embeddingError) {
        console.error("Error generating embeddings:", embeddingError);
        // Don't fail the request if embedding generation fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        business_id: business_id || "pending",
        enriched_data: {
          business_data: business_data,
          enrichment: enrichmentData,
        },
        message: "Business profile enriched successfully",
      } as EnrichmentResponse),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error in enrich_business_profile:", error);

    return new Response(
      JSON.stringify({
        success: false,
        business_id: "",
        enriched_data: {
          business_data: {},
          enrichment: {
            industry_variations: [],
            business_name_variations: [],
            description_keywords: [],
            zip_codes: [],
            counties: [],
            nearby_cities: [],
            nearby_towns: [],
            service_areas: [],
          },
        },
        error: error.message || "An unexpected error occurred",
      } as EnrichmentResponse),
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
