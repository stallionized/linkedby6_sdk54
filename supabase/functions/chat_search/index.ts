// Edge Function: chat_search
// Description: Conversational search with LLM-based query understanding and vector search
// Replaces n8n workflow with scalable, serverless architecture

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";

// ============================================================================
// Types and Interfaces
// ============================================================================

interface SearchRequest {
  session_id: string;
  query: string;
  filters?: {
    category?: string;
    location?: string;
    coverage_type?: string;
    max_results?: number;
  };
  conversation_history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  user_location?: {
    city?: string;
    state?: string;
    lat?: number;
    lng?: number;
  };
  device_info?: Record<string, any>;
}

interface SearchResponse {
  type: "results" | "clarification" | "error";
  message?: string;
  clarification_question?: string;
  business_ids?: string[];
  businesses?: Array<any>;
  search_id?: string;
  debug?: Record<string, any>;
}

interface QueryAnalysis {
  needs_clarification: boolean;
  clarification_question?: string;
  extracted_filters: {
    category?: string;
    location?: string;
    coverage_type?: string;
  };
  search_intent: string;
  confidence: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates embedding for text using OpenAI
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
 * Uses LLM to analyze query and determine if clarification is needed
 */
async function analyzeQuery(
  query: string,
  conversationHistory: Array<{ role: string; content: string }>,
  openai: OpenAI
): Promise<QueryAnalysis> {
  const systemPrompt = `You are a search query analyzer for a business directory platform.
Your job is to:
1. Determine if the user's query is clear enough to perform a search
2. Extract structured filters (category, location, coverage_type)
3. Ask clarifying questions ONLY when truly necessary

Guidelines:
- If the query is reasonably specific, proceed with search
- Only ask for clarification if the query is extremely vague (e.g., "show me businesses")
- Extract BROAD category keywords - use general industry terms, not specific products
- Examples: "car dealer" NOT "truck sales", "restaurant" NOT "pizza shop", "retailer" NOT "shoe store"
- For vehicle-related queries (car, truck, van, SUV, vehicle), leave category NULL - semantic search will handle it
- Extract location info (city, state, region)
- ONLY extract coverage_type if the user explicitly mentions it (e.g., "local businesses", "national chains")
- DO NOT infer coverage_type - leave it null if not explicitly mentioned
- Keep category filters BROAD to allow semantic search to handle specifics
- When in doubt about category matching, set category to null and let vector search handle it

Respond in JSON format:
{
  "needs_clarification": boolean,
  "clarification_question": "question to ask" (only if needs_clarification is true),
  "extracted_filters": {
    "category": null (null for vehicle queries, or broad category term for others),
    "location": "extracted location",
    "coverage_type": null (only set if explicitly mentioned: "local"|"regional"|"national"|"international")
  },
  "search_intent": "brief description of what user wants",
  "confidence": 0.0-1.0
}`;

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: query },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages as any,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const analysis = JSON.parse(completion.choices[0].message.content || "{}");
  return analysis;
}

/**
 * Finds similar past searches to potentially reuse results
 */
async function findSimilarPastSearches(
  queryEmbedding: number[],
  supabase: any
): Promise<Array<any>> {
  const { data, error } = await supabase.rpc("find_similar_searches", {
    query_embedding: queryEmbedding,
    similarity_threshold: 0.9, // Very high threshold for cache hits
    max_results: 1,
    time_window_hours: 24, // Only consider recent searches
  });

  if (error) {
    console.warn("Error finding similar searches:", error);
    return [];
  }

  return data || [];
}

/**
 * Performs vector similarity search on business_profiles
 */
async function performVectorSearch(
  queryEmbedding: number[],
  filters: any,
  supabase: any
): Promise<Array<any>> {
  const { data, error } = await supabase.rpc("search_businesses_by_vector", {
    query_embedding: queryEmbedding,
    match_threshold: 0.3, // Lower threshold to be more permissive - vector similarity handles relevance
    match_count: filters.max_results || 10,
    filter_category: filters.category || null,
    filter_location: filters.location || null,
    filter_coverage_type: filters.coverage_type || null,
  });

  if (error) {
    console.error("Vector search error:", error);
    throw new Error(`Vector search failed: ${error.message}`);
  }

  return data || [];
}

/**
 * Logs search interaction to search_history table
 */
async function logSearch(
  request: SearchRequest,
  analysis: QueryAnalysis,
  queryEmbedding: number[],
  results: Array<any>,
  responseTimeMs: number,
  supabase: any
): Promise<string> {
  const { data, error } = await supabase.rpc("log_search", {
    p_session_id: request.session_id,
    p_query_text: request.query,
    p_query_embedding: queryEmbedding,
    p_filters: JSON.stringify(request.filters || {}),
    p_is_clarification_needed: analysis.needs_clarification,
    p_clarification_question: analysis.clarification_question || null,
    p_llm_response: JSON.stringify(analysis),
    p_business_ids_returned:
      results.map((r) => r.business_id).filter(Boolean) || [],
    p_result_count: results.length,
    p_response_time_ms: responseTimeMs,
    p_user_location: JSON.stringify(request.user_location || {}),
    p_device_info: JSON.stringify(request.device_info || {}),
  });

  if (error) {
    console.warn("Failed to log search:", error);
  }

  return data;
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
    const requestBody: SearchRequest = await req.json();
    const { session_id, query, filters = {}, conversation_history = [] } =
      requestBody;

    // Validate input
    if (!session_id || !query) {
      return new Response(
        JSON.stringify({
          type: "error",
          message: "Missing required fields: session_id and query",
        } as SearchResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 1: Generate embedding for the query
    console.log("Generating embedding for query:", query);
    const queryEmbedding = await generateEmbedding(query, openai);

    // Step 2: Check for similar past searches (cache optimization)
    console.log("Checking for similar past searches...");
    const similarSearches = await findSimilarPastSearches(
      queryEmbedding,
      supabase
    );

    if (similarSearches.length > 0) {
      const cachedSearch = similarSearches[0];
      console.log(
        `Found similar search with ${cachedSearch.similarity} similarity`
      );

      // If we have a very similar recent search, we could potentially return cached results
      // For now, we'll still do a fresh search but this is an optimization opportunity
    }

    // Step 3: Analyze query with LLM to determine if clarification is needed
    console.log("Analyzing query with LLM...");
    const analysis = await analyzeQuery(query, conversation_history, openai);

    console.log("Query analysis:", analysis);

    // Step 4: If clarification needed, return clarification question
    if (analysis.needs_clarification) {
      const responseTimeMs = Date.now() - startTime;

      await logSearch(
        requestBody,
        analysis,
        queryEmbedding,
        [],
        responseTimeMs,
        supabase
      );

      return new Response(
        JSON.stringify({
          type: "clarification",
          clarification_question: analysis.clarification_question,
          message: analysis.clarification_question,
        } as SearchResponse),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Step 5: Merge extracted filters with provided filters
    const mergedFilters = {
      ...filters,
      category: filters.category || analysis.extracted_filters.category,
      location: filters.location || analysis.extracted_filters.location,
      coverage_type:
        filters.coverage_type || analysis.extracted_filters.coverage_type,
    };

    // Step 6: Perform vector search
    console.log("Performing vector search with filters:", mergedFilters);
    const searchResults = await performVectorSearch(
      queryEmbedding,
      mergedFilters,
      supabase
    );

    console.log(`Found ${searchResults.length} results`);

    // Step 7: Log the search
    const responseTimeMs = Date.now() - startTime;
    const searchId = await logSearch(
      requestBody,
      analysis,
      queryEmbedding,
      searchResults,
      responseTimeMs,
      supabase
    );

    // Step 8: Return results
    const businessIds = searchResults.map((result) => result.business_id);

    return new Response(
      JSON.stringify({
        type: "results",
        message: `Found ${searchResults.length} businesses matching your search`,
        business_ids: businessIds,
        businesses: searchResults,
        search_id: searchId,
        debug: {
          response_time_ms: responseTimeMs,
          confidence: analysis.confidence,
          search_intent: analysis.search_intent,
          applied_filters: mergedFilters,
        },
      } as SearchResponse),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error in chat_search:", error);

    return new Response(
      JSON.stringify({
        type: "error",
        message: error.message || "An unexpected error occurred",
      } as SearchResponse),
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
