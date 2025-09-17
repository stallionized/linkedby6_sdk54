/**
 * PATCH FILE: SearchScreen.js Edge Function Integration
 *
 * This file contains the updated handleSendMessage function that replaces
 * the MS2 Webhook call with the new Supabase Edge Function (chat_search).
 *
 * INSTRUCTIONS:
 * 1. Open SearchScreen.js
 * 2. Find the handleSendMessage function (starts around line 636)
 * 3. Replace the entire function with the one below
 * 4. Add the import at the top of SearchScreen.js
 */

// ============================================================================
// ADD THIS IMPORT AT THE TOP OF SearchScreen.js (after other imports)
// ============================================================================
import {
  performConversationalSearch,
  buildConversationHistory,
  formatUserLocation,
  extractBusinessIds,
  isClarificationResponse,
} from './utils/searchService';

// ============================================================================
// REPLACE THE handleSendMessage FUNCTION WITH THIS VERSION
// ============================================================================

/**
 * Updated handleSendMessage - Uses Supabase Edge Function instead of webhook
 */
const handleSendMessage = async (text) => {
  const messageText = text || inputText;
  if (!messageText.trim() || isTyping) return;

  const userMessage = {
    _id: Date.now().toString(),
    text: messageText.trim(),
    createdAt: new Date(),
    type: 'user',
  };

  setMessages((prev) => [...prev, userMessage]);
  setInputText('');
  setIsTyping(true);
  setError(null);

  try {
    console.log('🚀 Sending query to Edge Function:', messageText.trim());

    // Build conversation history from previous messages
    const conversationHistory = buildConversationHistory(messages, 5);

    // Get user location if available (you may need to fetch user profile)
    // For now, using null - you can enhance this later
    const userLocation = null; // formatUserLocation(userProfile);

    // Get device info for analytics
    const deviceInfo = {
      platform: Platform.OS,
      version: Platform.Version,
    };

    // Call the Edge Function
    const searchResponse = await performConversationalSearch({
      session_id: sessionId,
      query: messageText.trim(),
      filters: {
        // You can add UI controls for these filters later
        max_results: 10,
      },
      conversation_history: conversationHistory,
      user_location: userLocation,
      device_info: deviceInfo,
    });

    console.log('📥 Search response:', searchResponse);

    // Handle clarification response
    if (isClarificationResponse(searchResponse)) {
      const clarificationMessage = {
        _id: (Date.now() + 1).toString(),
        text: searchResponse.clarification_question || searchResponse.message,
        createdAt: new Date(),
        type: 'ai',
      };

      setMessages((prev) => [...prev, clarificationMessage]);
      setIsTyping(false);
      return;
    }

    // Handle error response
    if (searchResponse.type === 'error') {
      throw new Error(searchResponse.message || 'Search failed');
    }

    // Extract business IDs from response
    const businessIds = extractBusinessIds(searchResponse);

    console.log('🎯 Extracted business IDs:', businessIds);

    // Create AI response message
    const aiMessage = {
      _id: (Date.now() + 1).toString(),
      text:
        searchResponse.message ||
        `Found ${businessIds.length} business${businessIds.length !== 1 ? 'es' : ''} that might interest you.`,
      createdAt: new Date(),
      type: 'ai',
      businessIds: businessIds.length > 0 ? businessIds : undefined,
    };

    setMessages((prev) => [...prev, aiMessage]);

    // Fetch and display business profiles if we have IDs
    if (businessIds.length > 0) {
      console.log('🔍 Fetching business profiles for IDs:', businessIds);
      await fetchBusinessProfiles(businessIds);

      // Auto-close chat slider when business results are found
      if (chatSliderVisible) {
        console.log('🔄 Auto-closing chat slider - business results found');
        setTimeout(() => {
          Animated.timing(chatSlideAnim, {
            toValue: -CHAT_SLIDER_WIDTH,
            duration: 800,
            useNativeDriver: false,
            easing: Easing.out(Easing.cubic),
          }).start(() => {
            setChatSliderVisible(false);
          });
        }, 1000);
      }
    }
  } catch (err) {
    console.error('Error in search:', err.message);
    let errorMsg = `Failed to get response: ${err.message}`;

    if (err.message.includes('JSON')) {
      errorMsg = 'The service returned an invalid response format.';
    } else if (
      err.message.includes('Failed to fetch') ||
      err.message.includes('Network Error')
    ) {
      errorMsg = 'Could not connect to the search service.';
    } else if (err.message.includes('status: 4')) {
      errorMsg = 'Request error. Please try again.';
    } else if (err.message.includes('status: 5')) {
      errorMsg = 'Service temporarily unavailable.';
    }

    setError(errorMsg);
    const errorMessage = {
      _id: (Date.now() + 1).toString(),
      text: `Error: ${errorMsg}`,
      createdAt: new Date(),
      type: 'error',
    };
    setMessages((prev) => [...prev, errorMessage]);
  } finally {
    setIsTyping(false);
  }
};

// ============================================================================
// ALSO REMOVE OR UPDATE THE fetchMS2WebhookUrl SECTION IN useEffect
// ============================================================================

/**
 * OPTIONAL: You can remove the entire fetchMS2WebhookUrl section from the useEffect
 * since we're no longer using the webhook. Here's the simplified useEffect:
 */

useEffect(() => {
  if (hasInitialized) return;

  console.log('🔄 SearchScreen initialized');

  const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  setSessionId(newSessionId);
  console.log('Generated new session ID:', newSessionId);

  setMessages([
    {
      _id: `welcome_${Date.now()}`,
      text: "Welcome! Ask me anything about businesses or services you're looking for.",
      createdAt: new Date(),
      type: 'system',
    },
  ]);

  setHasInitialized(true);
}, [currentUserId, hasInitialized]);

// ============================================================================
// NOTES:
// ============================================================================
// 1. The Edge Function now handles all LLM interactions internally
// 2. Clarifying questions work automatically - the LLM decides when to ask
// 3. All searches are logged to search_history table automatically
// 4. Vector similarity search is performed server-side for better performance
// 5. You can add UI controls for filters (category, location, coverage_type) later
// 6. The conversation history is automatically sent to provide context
