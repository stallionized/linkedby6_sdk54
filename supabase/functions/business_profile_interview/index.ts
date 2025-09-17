// Edge Function: business_profile_interview
// Description: AI-powered conversational interview for business profile creation/updates
// Manages interview flow, extracts structured data, and triggers enrichment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";

// ============================================================================
// Types and Interfaces
// ============================================================================

interface InterviewRequest {
  session_id: string;
  business_id?: string; // Optional: for updating existing business
  user_message: string;
  conversation_history?: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
}

interface InterviewResponse {
  type: "question" | "confirmation" | "completed" | "error";
  message: string;
  conversation_history: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  current_phase: string;
  completion_percentage: number;
  collected_data?: Record<string, any>;
  preview_data?: Record<string, any>;
  session_id?: string;
  business_id?: string;
}

interface CollectedData {
  // Basic Info
  business_name?: string;
  industry?: string;
  description?: string;

  // Contact Info
  phone?: string;
  email?: string;
  website?: string;

  // Location
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  location_type?: 'storefront' | 'office' | 'not_brick_mortar';

  // Coverage
  coverage_type?: string;
  coverage_radius?: number;
  service_areas?: string[];

  // Hours of Operation
  hours?: Array<{
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
    is24Hours: boolean;
  }>;

  // Media (note for upload later)
  needs_logo?: boolean;
  needs_photos?: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Formats phone number to (XXX) XXX-XXXX format
 * Accepts any input format and extracts digits
 * @param phone - Phone number in any format
 * @returns Formatted phone number or original if invalid
 */
function formatPhoneNumber(phone: string | undefined): string {
  if (!phone) return "";

  // Extract only digits
  const digits = phone.replace(/\D/g, "");

  // Check if we have 10 digits (US format)
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Check if we have 11 digits (with country code 1)
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Return original if not standard format
  return phone;
}

// ============================================================================
// Industry Specialization Mapping
// ============================================================================

/**
 * Map of broad professional categories to their specializations
 * Used to prompt for more specific industry information
 */
const INDUSTRY_SPECIALIZATIONS: Record<string, string[]> = {
  // Legal Professionals
  "attorney": [
    "Criminal Defense Attorney",
    "Family Law Attorney",
    "Personal Injury Lawyer",
    "Corporate Attorney",
    "Real Estate Attorney",
    "Immigration Attorney",
    "Tax Attorney",
    "Estate Planning Attorney",
    "Employment Attorney",
    "Bankruptcy Attorney",
    "Intellectual Property Attorney",
  ],
  "lawyer": [
    "Criminal Defense Lawyer",
    "Family Law Lawyer",
    "Personal Injury Lawyer",
    "Corporate Lawyer",
    "Real Estate Lawyer",
    "Immigration Lawyer",
    "Tax Lawyer",
    "Estate Planning Lawyer",
  ],

  // Medical Professionals
  "doctor": [
    "Primary Care Physician",
    "Cardiologist",
    "Dermatologist",
    "Pediatrician",
    "Orthopedic Surgeon",
    "Psychiatrist",
    "Neurologist",
    "Oncologist",
    "OB/GYN",
    "Internal Medicine Physician",
    "Radiologist",
    "Anesthesiologist",
  ],
  "physician": [
    "Primary Care Physician",
    "Specialist Physician",
    "Family Medicine Physician",
    "Internal Medicine Physician",
  ],
  "dentist": [
    "General Dentist",
    "Orthodontist",
    "Periodontist",
    "Endodontist",
    "Oral Surgeon",
    "Cosmetic Dentist",
    "Pediatric Dentist",
  ],
  "therapist": [
    "Physical Therapist",
    "Occupational Therapist",
    "Speech Therapist",
    "Mental Health Therapist",
    "Marriage Counselor",
    "Family Therapist",
    "Massage Therapist",
  ],

  // Financial Professionals
  "accountant": [
    "Tax Preparation Service",
    "Audit Services",
    "Bookkeeping Service",
    "CFO Services",
    "Forensic Accountant",
    "Payroll Services",
    "CPA Services",
  ],
  "financial advisor": [
    "Wealth Management",
    "Retirement Planning",
    "Investment Advisory",
    "Insurance Planning",
    "Financial Planning",
  ],

  // Contractors & Trades
  "contractor": [
    "Electrical Contractor",
    "Plumbing Contractor",
    "HVAC Contractor",
    "Roofing Contractor",
    "General Contractor",
    "Painting Contractor",
    "Flooring Contractor",
    "Carpentry Contractor",
  ],
  "mechanic": [
    "Auto Repair",
    "Transmission Specialist",
    "Brake Specialist",
    "Engine Repair",
    "Collision Repair",
    "Auto Body Shop",
  ],

  // Consultants
  "consultant": [
    "Business Consultant",
    "IT Consultant",
    "Marketing Consultant",
    "HR Consultant",
    "Management Consultant",
    "Strategy Consultant",
  ],

  // Creative Professionals
  "designer": [
    "Graphic Designer",
    "Web Designer",
    "Interior Designer",
    "UX/UI Designer",
    "Fashion Designer",
    "Product Designer",
  ],
  "photographer": [
    "Wedding Photographer",
    "Portrait Photographer",
    "Commercial Photographer",
    "Real Estate Photographer",
    "Event Photographer",
  ],

  // Other Professionals
  "engineer": [
    "Software Engineer",
    "Mechanical Engineer",
    "Electrical Engineer",
    "Civil Engineer",
    "Chemical Engineer",
    "Structural Engineer",
  ],
  "realtor": [
    "Residential Real Estate Agent",
    "Commercial Real Estate Agent",
    "Property Manager",
    "Real Estate Broker",
  ],
};

/**
 * Checks if an industry term matches a broad category that needs specialization
 */
function needsSpecialization(industry: string): {
  needs: boolean;
  category?: string;
  specializations?: string[];
} {
  if (!industry) return { needs: false };

  const lowerIndustry = industry.toLowerCase().trim();

  for (const [category, specializations] of Object.entries(
    INDUSTRY_SPECIALIZATIONS
  )) {
    if (lowerIndustry.includes(category)) {
      return {
        needs: true,
        category: category,
        specializations: specializations,
      };
    }
  }

  return { needs: false };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determines completion percentage based on collected data
 */
function calculateCompletion(data: CollectedData): number {
  const requiredFields = [
    "business_name",
    "industry",
    "description",
    "phone",
    "email",
    "city",
    "state",
  ];
  const optionalFields = [
    "website",
    "address",
    "zip_code",
    "location_type",
    "coverage_type",
    "service_areas",
    "hours",
  ];

  const requiredCompleted = requiredFields.filter((field) =>
    data[field as keyof CollectedData]
  ).length;
  const optionalCompleted = optionalFields.filter((field) =>
    data[field as keyof CollectedData]
  ).length;

  const requiredWeight = 0.7;
  const optionalWeight = 0.3;

  const requiredScore =
    (requiredCompleted / requiredFields.length) * requiredWeight;
  const optionalScore =
    (optionalCompleted / optionalFields.length) * optionalWeight;

  return Math.round((requiredScore + optionalScore) * 100);
}

/**
 * Determines current interview phase based on collected data
 */
function determinePhase(data: CollectedData): string {
  const hasBasicInfo = data.business_name && data.industry && data.description;
  const hasContact = data.phone && data.email;
  const hasLocation = data.city && data.state;
  const hasCoverage = data.coverage_type;
  const hasHours = data.hours && data.hours.length > 0;

  if (!hasBasicInfo) return "basic_info";
  if (!hasContact) return "contact";
  if (!hasLocation) return "location";
  if (!hasCoverage) return "coverage";
  if (!hasHours) return "hours";
  return "review";
}

/**
 * Uses LLM to extract data from user message first
 */
async function extractDataFromMessage(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  currentData: CollectedData,
  openai: OpenAI
): Promise<{
  extractedData: Partial<CollectedData>;
  shouldComplete: boolean;
}> {
  const extractPrompt = `You are a data extraction assistant. Extract structured business profile data from the user's message.

Current Collected Data:
${JSON.stringify(currentData, null, 2)}

User Message: "${userMessage}"

Extract any business information from the message into exact field names:
- business_name, industry, description, phone, email, website
- address, city, state, zip_code, location_type
- coverage_type, coverage_radius, service_areas, hours

Respond with JSON:
{
  "extracted_data": {
    "field_name": "extracted_value"
  },
  "should_complete": boolean (true only if user confirms "yes" to final review)
}`;

  const messages = [
    { role: "system", content: extractPrompt },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages as any,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const response = JSON.parse(completion.choices[0].message.content || "{}");

  return {
    extractedData: response.extracted_data || {},
    shouldComplete: response.should_complete || false,
  };
}

/**
 * Uses LLM to generate next question based on collected data
 */
async function generateNextQuestion(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  mergedData: CollectedData,
  openai: OpenAI
): Promise<string> {
  // Check if current industry needs specialization
  const specializationCheck = mergedData.industry
    ? needsSpecialization(mergedData.industry)
    : { needs: false };

  // Build dynamic specialization guidance
  let specializationGuidance = "";
  if (specializationCheck.needs && specializationCheck.specializations) {
    specializationGuidance = `\n\nIMPORTANT - SPECIALIZATION DETECTED:
The user mentioned they are a "${specializationCheck.category}". This is a broad professional category that needs specialization.
You MUST ask a follow-up question to determine their specific specialization.

Common specializations for ${specializationCheck.category}:
${specializationCheck.specializations.slice(0, 8).join(", ")}

Ask: "What type of ${specializationCheck.category} services do you provide?" or similar natural question.
Then extract the FULL specialized industry (e.g., "Personal Injury Attorney" not just "Attorney").`;
  }

  const systemPrompt = `You are an AI assistant helping business owners create their business profiles through a conversational interview.

Based on what we've already collected, generate the NEXT question to ask.

Current Collected Data (INCLUDING what user just provided):
${JSON.stringify(mergedData, null, 2)}
${specializationGuidance}

Required Fields (MUST collect):
- business_name, industry, description, phone, email, city, state

Optional Fields (offer after required):
- website, address, zip_code, location_type, coverage_type, coverage_radius, service_areas, hours

Rules:
1. Look at Current Collected Data - SKIP any fields that already have values
2. Ask for the NEXT missing required field
3. If all required fields collected, ask if user wants to add optional info or review
4. Be friendly and conversational
5. One question at a time

Respond with just your next question as plain text. Be friendly and acknowledge what they provided.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages as any,
    temperature: 0.7,
  });

  return completion.choices[0].message.content || "What would you like to tell me about your business?";
}

/**
 * Creates initial greeting for new interview sessions
 */
function createGreeting(businessId?: string): string {
  if (businessId) {
    return "Hi! I'm here to help you update your business profile. What would you like to change?";
  }
  return "Hi! I'm excited to help you set up your business profile. Let's start with the basics - what's your business name?";
}

/**
 * Creates greeting for resuming incomplete profiles
 */
function createResumingGreeting(data: CollectedData): string {
  const sections: string[] = [];

  sections.push("Welcome back! Here's what we have for your business profile so far:\n");

  // Basic Information
  if (data.business_name || data.industry || data.description) {
    sections.push("**Basic Information:**");
    if (data.business_name) sections.push(`• Business Name: ${data.business_name}`);
    if (data.industry) sections.push(`• Industry: ${data.industry}`);
    if (data.description) sections.push(`• Description: ${data.description}`);
    sections.push("");
  }

  // Contact Information
  if (data.phone || data.email || data.website) {
    sections.push("**Contact Information:**");
    if (data.phone) sections.push(`• Phone: ${formatPhoneNumber(data.phone)}`);
    if (data.email) sections.push(`• Email: ${data.email}`);
    if (data.website) sections.push(`• Website: ${data.website}`);
    sections.push("");
  }

  // Location
  if (data.city || data.state || data.address || data.zip_code || data.location_type) {
    sections.push("**Location:**");
    if (data.address) sections.push(`• Address: ${data.address}`);
    if (data.city || data.state) {
      sections.push(`• City/State: ${data.city || "?"}, ${data.state || "?"}`);
    }
    if (data.zip_code) sections.push(`• ZIP Code: ${data.zip_code}`);
    if (data.location_type) sections.push(`• Location Type: ${formatLocationType(data.location_type)}`);
    sections.push("");
  }

  // Coverage
  if (data.coverage_type || data.coverage_radius || (data.service_areas && data.service_areas.length > 0)) {
    sections.push("**Coverage Area:**");
    if (data.coverage_type) sections.push(`• Type: ${data.coverage_type}`);
    if (data.coverage_radius) sections.push(`• Radius: ${data.coverage_radius} miles`);
    if (data.service_areas && data.service_areas.length > 0) {
      sections.push(`• Service Areas: ${data.service_areas.join(", ")}`);
    }
    sections.push("");
  }

  // Hours
  if (data.hours && data.hours.length > 0) {
    sections.push("**Hours of Operation:**");
    sections.push(formatHours(data.hours));
    sections.push("");
  }

  // Determine what's missing
  const missing: string[] = [];
  if (!data.business_name) missing.push("business name");
  if (!data.industry) missing.push("industry");
  if (!data.description) missing.push("description");
  if (!data.phone) missing.push("phone number");
  if (!data.email) missing.push("email");
  if (!data.city) missing.push("city");
  if (!data.state) missing.push("state");

  if (missing.length > 0) {
    sections.push(`**Still need:** ${missing.join(", ")}`);
    sections.push("");
  }

  sections.push("You can tell me what you'd like to change, add, or we can continue filling in the missing information. What would you like to do?");

  return sections.join("\n");
}

/**
 * Formats location type for display
 */
function formatLocationType(type: string): string {
  const types: Record<string, string> = {
    storefront: "Storefront",
    office: "Office",
    not_brick_mortar: "No physical location (online/mobile)",
  };
  return types[type] || type;
}

/**
 * Formats hours for display
 */
function formatHours(hours?: Array<{
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
  is24Hours: boolean;
}>): string {
  if (!hours || hours.length === 0) {
    return "Not provided";
  }

  return hours
    .map((h) => {
      if (h.isClosed) return `${h.day}: Closed`;
      if (h.is24Hours) return `${h.day}: Open 24 hours`;
      return `${h.day}: ${h.open} - ${h.close}`;
    })
    .join("\n");
}

/**
 * Generates formatted preview of collected profile data
 */
function generateProfilePreview(data: CollectedData): string {
  const sections: string[] = [];

  // Basic Information
  sections.push("📋 **Business Profile Preview**\n");
  sections.push("**Basic Information:**");
  sections.push(`• Business Name: ${data.business_name || "Not provided"}`);
  sections.push(`• Industry: ${data.industry || "Not provided"}`);
  sections.push(`• Description: ${data.description || "Not provided"}`);
  sections.push("");

  // Contact Information
  sections.push("**Contact Information:**");
  sections.push(`• Phone: ${data.phone ? formatPhoneNumber(data.phone) : "Not provided"}`);
  sections.push(`• Email: ${data.email || "Not provided"}`);
  if (data.website) sections.push(`• Website: ${data.website}`);
  sections.push("");

  // Location
  sections.push("**Location:**");
  if (data.address) sections.push(`• Address: ${data.address}`);
  sections.push(
    `• City/State: ${data.city || "Not provided"}, ${data.state || "Not provided"}`
  );
  if (data.zip_code) sections.push(`• ZIP Code: ${data.zip_code}`);
  if (data.location_type) {
    sections.push(`• Location Type: ${formatLocationType(data.location_type)}`);
  }
  sections.push("");

  // Coverage Area
  if (data.coverage_type) {
    sections.push("**Coverage Area:**");
    sections.push(`• Type: ${data.coverage_type}`);
    if (data.coverage_radius) {
      sections.push(`• Radius: ${data.coverage_radius} miles`);
    }
    if (data.service_areas && data.service_areas.length > 0) {
      sections.push(`• Service Areas: ${data.service_areas.join(", ")}`);
    }
    sections.push("");
  }

  // Hours of Operation
  if (data.hours && data.hours.length > 0) {
    sections.push("**Hours of Operation:**");
    sections.push(formatHours(data.hours));
    sections.push("");
  }

  // Next Steps
  sections.push("**Next Steps:**");
  sections.push(
    "📸 You'll need to upload a logo and business photos in the profile screen to complete your profile."
  );
  sections.push("");
  sections.push(
    "Does this look correct? Reply 'yes' to save, or tell me what you'd like to change."
  );

  return sections.join("\n");
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
    const requestBody: InterviewRequest = await req.json();
    const {
      session_id,
      business_id,
      user_message,
      conversation_history = [],
    } = requestBody;

    // Validate input
    if (!session_id) {
      return new Response(
        JSON.stringify({
          type: "error",
          message: "Missing required field: session_id",
        } as InterviewResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check if this is a new session or continuing one
    const { data: existingSession } = await supabase.rpc(
      "get_interview_session",
      { p_session_id: session_id }
    );

    let currentData: CollectedData = {};
    let currentHistory = conversation_history;
    let isResuming = false;

    // Load existing business data if business_id provided
    if (business_id) {
      const { data: existingBusiness, error: businessError } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("business_id", business_id)
        .single();

      if (existingBusiness && !businessError) {
        // Pre-populate with existing data
        currentData = {
          business_name: existingBusiness.business_name || undefined,
          industry: existingBusiness.industry || undefined,
          description: existingBusiness.description || undefined,
          phone: existingBusiness.phone || undefined,
          email: existingBusiness.contact_email || undefined,
          website: existingBusiness.website || undefined,
          address: existingBusiness.address || undefined,
          city: existingBusiness.city || undefined,
          state: existingBusiness.state || undefined,
          zip_code: existingBusiness.zip_code || undefined,
          location_type: existingBusiness.location_type || undefined,
          coverage_type: existingBusiness.coverage_type || undefined,
          coverage_radius: existingBusiness.coverage_radius || undefined,
          hours: existingBusiness.hours || undefined,
        };

        // Check if resuming incomplete profile
        if (existingBusiness.business_status === "Incomplete") {
          isResuming = true;
        }
      }
    }

    if (existingSession && existingSession.length > 0) {
      // Continue existing session
      const session = existingSession[0];
      currentData = { ...currentData, ...session.collected_data };
      currentHistory = session.conversation_history || conversation_history;
      isResuming = true;
    } else {
      // Create new session
      await supabase.rpc("create_interview_session", {
        p_business_id: business_id || null,
        p_session_id: session_id,
      });

      // Add initial greeting
      const greeting = isResuming
        ? createResumingGreeting(currentData)
        : createGreeting(business_id);
      currentHistory = [{ role: "assistant", content: greeting }];

      // If this is first message (greeting only), return it
      if (!user_message || user_message.trim() === "") {
        return new Response(
          JSON.stringify({
            type: "question",
            message: greeting,
            conversation_history: currentHistory,
            current_phase: "basic_info",
            completion_percentage: 0,
            session_id: session_id,
          } as InterviewResponse),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
    }

    // Step 1: Extract data from user message
    const { extractedData, shouldComplete } = await extractDataFromMessage(
      user_message,
      currentHistory,
      currentData,
      openai
    );

    // Step 2: Merge extracted data with current data
    const updatedData = { ...currentData, ...extractedData };

    // Step 3: Generate next question based on MERGED data
    const assistantMessage = await generateNextQuestion(
      user_message,
      currentHistory,
      updatedData,
      openai
    );

    // Update conversation history
    const updatedHistory = [
      ...currentHistory,
      { role: "user", content: user_message },
      { role: "assistant", content: assistantMessage },
    ];

    // Determine phase and completion
    const currentPhase = determinePhase(updatedData);
    const completionPercentage = calculateCompletion(updatedData);

    // Check if we're in review phase and should show preview
    const inReviewPhase = currentPhase === "review" && !shouldComplete;
    let previewMessage = assistantMessage;

    if (inReviewPhase) {
      // Generate and show preview
      previewMessage = generateProfilePreview(updatedData);
      updatedHistory[updatedHistory.length - 1].content = previewMessage;
    }

    // Update session in database
    await supabase.rpc("update_interview_session", {
      p_session_id: session_id,
      p_conversation_history: updatedHistory,
      p_current_phase: currentPhase,
      p_completion_percentage: completionPercentage,
      p_collected_data: updatedData,
      p_status: shouldComplete ? "completed" : "in_progress",
    });

    // If interview is complete, save to business_profiles and trigger enrichment
    if (shouldComplete && business_id) {
      // Save collected data to business_profiles table
      const { error: updateError } = await supabase
        .from("business_profiles")
        .update({
          business_name: updatedData.business_name,
          industry: updatedData.industry,
          description: updatedData.description,
          phone: formatPhoneNumber(updatedData.phone),
          contact_email: updatedData.email,
          website: updatedData.website,
          address: updatedData.address,
          city: updatedData.city,
          state: updatedData.state,
          zip_code: updatedData.zip_code,
          location_type: updatedData.location_type,
          coverage_type: updatedData.coverage_type,
          coverage_radius: updatedData.coverage_radius,
          coverage_details: updatedData.service_areas?.join(", "),
          hours: updatedData.hours,
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", business_id);

      if (updateError) {
        console.error("Error updating business profile:", updateError);
      }
    }

    // If interview is complete, trigger enrichment
    if (shouldComplete) {
      // Call enrich_business_profile Edge Function
      try {
        const enrichResponse = await fetch(
          `${supabaseUrl}/functions/v1/enrich_business_profile`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              business_data: updatedData,
              business_id: business_id,
            }),
          }
        );

        const enrichResult = await enrichResponse.json();

        return new Response(
          JSON.stringify({
            type: "completed",
            message: assistantMessage,
            conversation_history: updatedHistory,
            current_phase: "completed",
            completion_percentage: 100,
            collected_data: updatedData,
            preview_data: enrichResult.enriched_data || updatedData,
            session_id: session_id,
            business_id: enrichResult.business_id || business_id,
          } as InterviewResponse),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      } catch (enrichError) {
        console.error("Enrichment failed:", enrichError);
        // Continue without enrichment
      }
    }

    // Return next question or confirmation request
    const responseType =
      completionPercentage >= 80 ? "confirmation" : "question";

    return new Response(
      JSON.stringify({
        type: responseType,
        message: assistantMessage,
        conversation_history: updatedHistory,
        current_phase: currentPhase,
        completion_percentage: completionPercentage,
        collected_data: updatedData,
        session_id: session_id,
      } as InterviewResponse),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error in business_profile_interview:", error);

    return new Response(
      JSON.stringify({
        type: "error",
        message: error.message || "An unexpected error occurred",
        conversation_history: [],
        current_phase: "error",
        completion_percentage: 0,
      } as InterviewResponse),
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
