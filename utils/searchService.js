// searchService.js
// Utility service for interacting with Supabase Edge Function-based search
// Replaces n8n/MS2 webhook calls with direct Edge Function calls

import { supabase } from '../supabaseClient';

/**
 * Performs conversational search using the chat_search Edge Function
 * @param {Object} params - Search parameters
 * @param {string} params.session_id - Unique session identifier
 * @param {string} params.query - User's search query
 * @param {Object} params.filters - Optional filters (category, location, coverage_type, max_results)
 * @param {Array} params.conversation_history - Previous conversation turns
 * @param {Object} params.user_location - User's location info (city, state, lat, lng)
 * @param {Object} params.device_info - Device information for analytics
 * @returns {Promise<Object>} Search response with type, message, business_ids, etc.
 */
export async function performConversationalSearch({
  session_id,
  query,
  filters = {},
  conversation_history = [],
  user_location = null,
  device_info = null,
}) {
  try {
    // Call the chat_search Edge Function
    const { data, error } = await supabase.functions.invoke('chat_search', {
      body: {
        session_id,
        query,
        filters,
        conversation_history,
        user_location,
        device_info,
      },
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));

      // Return a graceful error response instead of throwing
      return {
        type: 'error',
        message: error.message || 'Search service temporarily unavailable. Please try again.',
        debug: { error: error.message, context: error.context }
      };
    }

    console.log('✅ Search response:', data);
    return data;
  } catch (error) {
    console.error('❌ Error calling chat_search Edge Function:', error);
    console.error('Exception:', error.message, error.stack);

    // Return error response instead of throwing
    return {
      type: 'error',
      message: 'Unable to connect to search service. Please check your connection.',
      debug: { error: error.message }
    };
  }
}

/**
 * Generates embeddings for businesses that don't have them
 * @param {Object} params - Generation parameters
 * @param {string} params.business_id - Optional: specific business ID to generate for
 * @param {number} params.batch_size - How many businesses to process at once (default: 100)
 * @param {boolean} params.force_regenerate - Regenerate even if embedding exists
 * @returns {Promise<Object>} Result with processed_count, failed_count, etc.
 */
export async function generateBusinessEmbeddings({
  business_id = null,
  batch_size = 100,
  force_regenerate = false,
} = {}) {
  try {
    const { data, error } = await supabase.functions.invoke(
      'generate_embeddings',
      {
        body: {
          business_id,
          batch_size,
          force_regenerate,
        },
      }
    );

    if (error) {
      console.error('Embedding generation error:', error);
      throw new Error(error.message || 'Embedding generation failed');
    }

    console.log('✅ Embedding generation result:', data);
    return data;
  } catch (error) {
    console.error('Error calling generate_embeddings Edge Function:', error);
    throw error;
  }
}

/**
 * Builds conversation history from message array for LLM context
 * @param {Array} messages - Array of message objects with type and text
 * @param {number} maxHistory - Maximum number of message pairs to include (default: 5)
 * @returns {Array} Formatted conversation history for LLM
 */
export function buildConversationHistory(messages, maxHistory = 5) {
  const history = [];

  // Filter out system messages and only include user/ai messages
  const relevantMessages = messages.filter(
    (msg) => msg.type === 'user' || msg.type === 'ai'
  );

  // Take the last N messages (excluding the current one being sent)
  const recentMessages = relevantMessages.slice(-maxHistory * 2);

  for (const msg of recentMessages) {
    history.push({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.text,
    });
  }

  return history;
}

/**
 * Formats user location for search
 * @param {Object} userProfile - User profile with location info
 * @returns {Object} Formatted location object
 */
export function formatUserLocation(userProfile) {
  if (!userProfile) return null;

  return {
    city: userProfile.city || null,
    state: userProfile.state || null,
    // Add lat/lng if you have GPS coordinates
    lat: userProfile.latitude || null,
    lng: userProfile.longitude || null,
  };
}

/**
 * Extracts business IDs from various response formats (backwards compatibility)
 * @param {Object} response - Response from search
 * @returns {Array} Array of business IDs
 */
export function extractBusinessIds(response) {
  if (!response) return [];

  // New Edge Function format
  if (response.business_ids && Array.isArray(response.business_ids)) {
    return response.business_ids;
  }

  // Backwards compatibility with old webhook format
  if (response.business_id) {
    return [response.business_id];
  }

  // Check if businesses array exists
  if (response.businesses && Array.isArray(response.businesses)) {
    return response.businesses.map((b) => b.business_id).filter(Boolean);
  }

  return [];
}

/**
 * Determines if the response is a clarification question
 * @param {Object} response - Response from search
 * @returns {boolean} True if clarification is needed
 */
export function isClarificationResponse(response) {
  return response?.type === 'clarification';
}

/**
 * Fetches full business profiles from Supabase for given IDs
 * @param {Array} businessIds - Array of business IDs
 * @returns {Promise<Array>} Array of business profile objects
 */
export async function fetchBusinessProfiles(businessIds) {
  if (!businessIds || businessIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('business_profiles')
      .select(
        `
        business_id,
        business_name,
        description,
        industry,
        image_url,
        city,
        state,
        zip_code,
        coverage_type,
        coverage_details,
        coverage_radius
      `
      )
      .in('business_id', businessIds);

    if (error) {
      console.error('Error fetching business profiles:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchBusinessProfiles:', error);
    throw error;
  }
}

/**
 * Gets search analytics for the current user
 * @param {string} userId - User ID
 * @param {number} daysBack - Number of days to look back (default: 7)
 * @returns {Promise<Object>} Analytics data
 */
export async function getUserSearchAnalytics(userId, daysBack = 7) {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('query_text, result_count, created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching search analytics:', error);
      return null;
    }

    return {
      total_searches: data?.length || 0,
      successful_searches: data?.filter((s) => s.result_count > 0).length || 0,
      recent_queries: data?.slice(0, 10) || [],
    };
  } catch (error) {
    console.error('Error in getUserSearchAnalytics:', error);
    return null;
  }
}
