// Edge Function: process-embedding-queue
// Description: Scheduled function to automatically process embedding generation queue
// Runs every 5 minutes to ensure all businesses have embeddings

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

serve(async (req) => {
  console.log("🔄 Starting scheduled embedding queue processing...");

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check queue status first
    const { data: queueStatus, error: statusError } = await supabase
      .from("embedding_queue_status")
      .select("*");

    if (statusError) {
      console.error("Failed to get queue status:", statusError);
    } else {
      console.log("📊 Queue status:", queueStatus);
    }

    // Call the generate_embeddings function to process queue
    const { data, error } = await supabase.functions.invoke(
      "generate_embeddings",
      {
        body: {
          process_queue: true,
          batch_size: 50, // Process up to 50 at a time
        },
      }
    );

    if (error) {
      console.error("❌ Error processing queue:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ Queue processing completed:", data);

    return new Response(
      JSON.stringify({
        success: true,
        result: data,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Unexpected error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
