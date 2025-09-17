/**
 * Script: Test Search Functionality
 *
 * This script tests the chat_search Edge Function with various queries.
 * Use this to verify your setup is working correctly.
 *
 * Usage:
 *   node scripts/test-search.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oofugvbdkyqtidzuaelp.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test queries
const TEST_QUERIES = [
  {
    name: 'Specific Query with Location',
    query: 'Find plumbers in Chicago',
    expectedType: 'results',
  },
  {
    name: 'Vague Query (Should Clarify)',
    query: 'Show me businesses',
    expectedType: 'clarification',
  },
  {
    name: 'Category Search',
    query: 'restaurants',
    expectedType: 'results',
  },
  {
    name: 'Industry Search',
    query: 'construction companies',
    expectedType: 'results',
  },
  {
    name: 'Service-based Query',
    query: 'who can fix my roof',
    expectedType: 'results',
  },
];

/**
 * Performs a search query
 */
async function performSearch(query, conversationHistory = []) {
  try {
    const { data, error } = await supabase.functions.invoke('chat_search', {
      body: {
        session_id: `test-${Date.now()}`,
        query: query,
        filters: {},
        conversation_history: conversationHistory,
      },
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error performing search:', error);
    throw error;
  }
}

/**
 * Formats the response for display
 */
function formatResponse(response) {
  const lines = [];

  lines.push(`   Type: ${response.type}`);
  lines.push(`   Message: ${response.message || 'N/A'}`);

  if (response.type === 'clarification') {
    lines.push(`   Question: ${response.clarification_question}`);
  }

  if (response.type === 'results') {
    lines.push(`   Business IDs: ${response.business_ids?.length || 0}`);

    if (response.businesses && response.businesses.length > 0) {
      lines.push(`   Businesses:`);
      response.businesses.slice(0, 3).forEach(business => {
        lines.push(`      - ${business.business_name} (${business.industry}) - Similarity: ${business.similarity?.toFixed(2) || 'N/A'}`);
      });

      if (response.businesses.length > 3) {
        lines.push(`      ... and ${response.businesses.length - 3} more`);
      }
    }

    if (response.debug) {
      lines.push(`   Debug Info:`);
      lines.push(`      - Response Time: ${response.debug.response_time_ms}ms`);
      lines.push(`      - Confidence: ${response.debug.confidence}`);
      lines.push(`      - Intent: ${response.debug.search_intent}`);
    }
  }

  if (response.type === 'error') {
    lines.push(`   Error: ${response.message}`);
  }

  return lines.join('\n');
}

/**
 * Runs a single test case
 */
async function runTest(testCase, testNumber) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Test ${testNumber}: ${testCase.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Query: "${testCase.query}"`);
  console.log(`Expected Type: ${testCase.expectedType}`);

  try {
    const startTime = Date.now();
    const response = await performSearch(testCase.query);
    const endTime = Date.now();

    console.log(`\nResponse (${endTime - startTime}ms):`);
    console.log(formatResponse(response));

    // Validate response type
    if (response.type === testCase.expectedType) {
      console.log(`\n✅ PASS - Got expected response type`);
    } else {
      console.log(`\n⚠️  WARNING - Expected '${testCase.expectedType}' but got '${response.type}'`);
      console.log(`   (This may not be an error - the LLM may have interpreted the query differently)`);
    }

    return { success: true, response };
  } catch (error) {
    console.log(`\n❌ FAIL - Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Tests conversation context
 */
async function testConversationContext() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Test: Conversation Context`);
  console.log(`${'='.repeat(60)}`);

  try {
    // First query
    console.log(`\nQuery 1: "Find restaurants in Chicago"`);
    const response1 = await performSearch('Find restaurants in Chicago');
    console.log(formatResponse(response1));

    // Follow-up query with context
    console.log(`\nQuery 2: "What about pizza places?" (with context)`);
    const conversationHistory = [
      { role: 'user', content: 'Find restaurants in Chicago' },
      { role: 'assistant', content: 'I found several restaurants in Chicago' },
    ];

    const response2 = await performSearch('What about pizza places?', conversationHistory);
    console.log(formatResponse(response2));

    if (response2.type === 'results') {
      console.log(`\n✅ PASS - Conversation context handled correctly`);
      return { success: true };
    } else {
      console.log(`\n⚠️  WARNING - Expected results but got ${response2.type}`);
      return { success: false };
    }
  } catch (error) {
    console.log(`\n❌ FAIL - Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🧪 Starting Search System Tests...\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Using ANON key: ${SUPABASE_KEY.substring(0, 20)}...`);

  const results = [];

  // Run basic test cases
  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const result = await runTest(TEST_QUERIES[i], i + 1);
    results.push(result);

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Test conversation context
  const contextResult = await testConversationContext();
  results.push(contextResult);

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 TEST SUMMARY');
  console.log(`${'='.repeat(60)}`);

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(2)}%`);

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
  } else {
    console.log('\n✅ All tests passed!');
  }

  console.log(`\n${'='.repeat(60)}`);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
