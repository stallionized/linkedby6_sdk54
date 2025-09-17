// generate_business_description/index.ts
// Simple Edge Function to generate professional business descriptions using AI

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface RequestBody {
  businessName: string;
  industry: string;
  existingDescription?: string | null;
}

serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Parse request body
    const { businessName, industry, existingDescription }: RequestBody = await req.json();

    // Validation
    if (!businessName || !industry) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: businessName and industry" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    // Create prompt for AI
    const prompt = existingDescription
      ? `Improve the following business description for "${businessName}", a ${industry} business:

Current description: "${existingDescription}"

Create a professional, engaging business description that:
1. Clearly states what the business does
2. Highlights key services or products
3. Is 2-3 sentences long
4. Is written in a professional but friendly tone
5. Avoids clichés and generic statements

Return only the improved description, nothing else.`
      : `Write a professional business description for "${businessName}", a ${industry} business.

Create a description that:
1. Clearly states what the business does
2. Highlights typical services or products for this industry
3. Is 2-3 sentences long
4. Is written in a professional but friendly tone
5. Is specific and engaging, avoiding generic statements

Return only the description, nothing else.`;

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a professional business copywriter. Generate concise, professional business descriptions that are specific and engaging.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || "Unknown error"}`);
    }

    const openaiData = await openaiResponse.json();
    const generatedDescription = openaiData.choices[0]?.message?.content?.trim();

    if (!generatedDescription) {
      throw new Error("Failed to generate description");
    }

    // Return the generated description
    return new Response(
      JSON.stringify({
        description: generatedDescription,
        success: true,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (error: any) {
    console.error("Error in generate_business_description:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to generate description",
        success: false,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
});
