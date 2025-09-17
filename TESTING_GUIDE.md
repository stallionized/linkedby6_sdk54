# Testing Guide - Edge Function Search System

## 🧪 Overview

This guide provides comprehensive testing procedures for the new Edge Function-based search system.

---

## 1️⃣ Pre-Deployment Testing

### Test Database Functions Locally

Before deploying Edge Functions, verify your database setup:

```sql
-- 1. Verify pgvector extension is installed
SELECT * FROM pg_extension WHERE extname = 'vector';
-- Expected: 1 row with name 'vector'

-- 2. Check business_profiles schema
\d business_profiles
-- Should show 'embedding' column with type 'vector(1536)'

-- 3. Check search_history table exists
SELECT COUNT(*) FROM search_history;
-- Should return 0 (or existing count without errors)

-- 4. Test vector search function exists
SELECT proname FROM pg_proc WHERE proname = 'search_businesses_by_vector';
-- Expected: 1 row

-- 5. Test log_search function exists
SELECT proname FROM pg_proc WHERE proname = 'log_search';
-- Expected: 1 row
```

### Test Embedding Generation

Generate a test embedding to verify OpenAI integration:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate_embeddings \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_size": 5
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "processed_count": 5,
  "failed_count": 0,
  "business_ids_processed": ["uuid1", "uuid2", ...],
  "total_time_ms": 3500
}
```

---

## 2️⃣ Edge Function Testing

### Test 1: Basic Search Query

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat_search \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session-1",
    "query": "Find plumbers in Chicago"
  }'
```

**Expected Response:**
```json
{
  "type": "results",
  "message": "Found 5 businesses matching your search",
  "business_ids": ["uuid1", "uuid2", "uuid3", "uuid4", "uuid5"],
  "businesses": [
    {
      "business_id": "uuid1",
      "business_name": "ABC Plumbing",
      "industry": "Plumbing",
      "city": "Chicago",
      "similarity": 0.87
    },
    ...
  ],
  "search_id": "search-uuid",
  "debug": {
    "response_time_ms": 1200,
    "confidence": 0.95,
    "search_intent": "Find plumbing services in Chicago"
  }
}
```

### Test 2: Vague Query (Should Ask Clarification)

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat_search \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session-2",
    "query": "Show me businesses"
  }'
```

**Expected Response:**
```json
{
  "type": "clarification",
  "clarification_question": "What type of businesses are you looking for? For example, restaurants, contractors, retail stores, etc.?",
  "message": "What type of businesses are you looking for?"
}
```

### Test 3: Query with Conversation History

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat_search \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session-3",
    "query": "What about electricians?",
    "conversation_history": [
      {"role": "user", "content": "Find plumbers in Chicago"},
      {"role": "assistant", "content": "I found 5 plumbing services in Chicago"}
    ]
  }'
```

**Expected:** Should understand context and search for electricians in Chicago.

### Test 4: Query with Filters

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat_search \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session-4",
    "query": "restaurants",
    "filters": {
      "location": "New York",
      "coverage_type": "local",
      "max_results": 20
    }
  }'
```

**Expected:** Results should be filtered by location and coverage type.

---

## 3️⃣ React Native App Testing

### Test Scenario 1: Simple Search

1. Open the app and navigate to SearchScreen
2. Enter query: "Find plumbers near me"
3. Verify:
   - ✅ Loading indicator appears
   - ✅ AI response message shows
   - ✅ Business cards appear below
   - ✅ Chat slider auto-closes after delay

### Test Scenario 2: Clarifying Questions

1. Enter vague query: "I need help"
2. Verify:
   - ✅ AI asks a clarifying question
   - ✅ No business results shown yet
   - ✅ Chat stays open for follow-up

3. Respond with specifics: "I need a plumber"
4. Verify:
   - ✅ AI performs search
   - ✅ Business results appear

### Test Scenario 3: Conversation Context

1. Ask: "Find restaurants in Chicago"
2. Wait for results
3. Ask: "What about pizza places?"
4. Verify:
   - ✅ AI understands context (Chicago)
   - ✅ Returns pizza restaurants in Chicago

### Test Scenario 4: Error Handling

1. Disconnect from internet
2. Try a search
3. Verify:
   - ✅ Error message displayed
   - ✅ App doesn't crash
   - ✅ User can retry

### Test Scenario 5: Session Persistence

1. Perform a search
2. Close and reopen the app
3. Verify:
   - ✅ Previous conversation is cleared (or persisted, depending on design)
   - ✅ New session ID generated

---

## 4️⃣ Performance Testing

### Test Vector Search Performance

```sql
-- Test query performance with EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT * FROM search_businesses_by_vector(
    query_embedding := (SELECT embedding FROM business_profiles WHERE embedding IS NOT NULL LIMIT 1),
    match_threshold := 0.7,
    match_count := 10
);

-- Expected execution time: < 100ms for thousands of rows
```

### Load Test Edge Function

Use a tool like Apache Bench or k6:

```bash
# Install k6
brew install k6  # macOS
# or
choco install k6  # Windows

# Create test script (search-load-test.js)
cat > search-load-test.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
};

export default function() {
  const url = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat_search';
  const payload = JSON.stringify({
    session_id: `test-${__VU}-${__ITER}`,
    query: 'Find plumbers in Chicago',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_ANON_KEY',
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
    'has business_ids': (r) => JSON.parse(r.body).business_ids,
  });
}
EOF

# Run load test
k6 run search-load-test.js
```

**Expected Results:**
- ✅ 95th percentile response time < 2 seconds
- ✅ 0% error rate
- ✅ All checks passing

---

## 5️⃣ Data Validation Testing

### Verify Search History Logging

```sql
-- Check that searches are being logged
SELECT
    session_id,
    query_text,
    result_count,
    response_time_ms,
    is_clarification_needed,
    created_at
FROM search_history
ORDER BY created_at DESC
LIMIT 10;
```

**Verify:**
- ✅ Each search creates a log entry
- ✅ `query_embedding` is populated
- ✅ `business_ids_returned` matches results
- ✅ `response_time_ms` is reasonable

### Verify Embedding Quality

```sql
-- Test similarity between known similar businesses
SELECT
    a.business_name as business_a,
    b.business_name as business_b,
    1 - (a.embedding <=> b.embedding) as similarity
FROM business_profiles a
CROSS JOIN business_profiles b
WHERE a.business_id != b.business_id
    AND a.industry = b.industry
    AND a.embedding IS NOT NULL
    AND b.embedding IS NOT NULL
ORDER BY similarity DESC
LIMIT 20;
```

**Expected:**
- ✅ Businesses in same industry have similarity > 0.7
- ✅ Similar business descriptions have similarity > 0.8

---

## 6️⃣ Security Testing

### Test RLS Policies

```sql
-- Test as authenticated user
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "test-user-id"}';

-- Should only see own search history
SELECT COUNT(*) FROM search_history WHERE user_id != 'test-user-id';
-- Expected: 0

-- Should be able to insert own search
INSERT INTO search_history (session_id, user_id, query_text)
VALUES ('test', 'test-user-id', 'test query');
-- Expected: Success

-- Should NOT be able to insert for other users
INSERT INTO search_history (session_id, user_id, query_text)
VALUES ('test', 'other-user-id', 'test query');
-- Expected: Error (RLS violation)

RESET role;
```

### Test Anonymous Access

```sql
-- Test as anonymous user
SET LOCAL role TO anon;

-- Should be able to search
SELECT * FROM search_businesses_by_vector(...);
-- Expected: Success

-- Should be able to log anonymous search (user_id = NULL)
INSERT INTO search_history (session_id, user_id, query_text)
VALUES ('test-anon', NULL, 'test query');
-- Expected: Success

RESET role;
```

---

## 7️⃣ Edge Cases Testing

### Edge Case 1: Empty Query

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat_search \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-edge-1",
    "query": ""
  }'
```

**Expected:** Error response with helpful message.

### Edge Case 2: Very Long Query

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat_search \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-edge-2",
    "query": "'$(printf 'a%.0s' {1..10000})'"
  }'
```

**Expected:** Either truncated query or error with message.

### Edge Case 3: Special Characters

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat_search \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-edge-3",
    "query": "Find businesses with \"quotes\" and \n newlines"
  }'
```

**Expected:** Handles gracefully, returns results.

### Edge Case 4: No Businesses Have Embeddings

1. Clear all embeddings: `UPDATE business_profiles SET embedding = NULL;`
2. Try a search
3. **Expected:** Graceful error message explaining embeddings need to be generated

### Edge Case 5: OpenAI API Rate Limit

1. Make 50+ rapid requests
2. **Expected:**
   - ✅ Some requests may fail with rate limit error
   - ✅ Error is logged and returned gracefully
   - ✅ App shows user-friendly error message

---

## 8️⃣ Analytics Validation

### Test Analytics View

```sql
-- View search analytics
SELECT * FROM search_analytics
WHERE search_date > CURRENT_DATE - INTERVAL '7 days';
```

**Verify:**
- ✅ `total_searches` matches search_history count
- ✅ `unique_sessions` is reasonable
- ✅ `avg_results_per_search` makes sense
- ✅ `clarification_requests` is tracked

### Test Similar Search Detection

```sql
-- Insert a test search
INSERT INTO search_history (session_id, query_text, query_embedding, result_count, business_ids_returned)
SELECT
    'test-similar-1',
    'plumbers in chicago',
    embedding,
    5,
    ARRAY['uuid1', 'uuid2']::uuid[]
FROM business_profiles
WHERE embedding IS NOT NULL
LIMIT 1;

-- Find similar searches
SELECT * FROM find_similar_searches(
    query_embedding := (SELECT query_embedding FROM search_history WHERE session_id = 'test-similar-1'),
    similarity_threshold := 0.85
);
```

**Expected:** Returns searches with similar queries.

---

## ✅ Testing Checklist

Use this checklist to track your testing:

### Database Setup
- [ ] pgvector extension installed
- [ ] business_profiles has embedding column
- [ ] search_history table exists
- [ ] Vector search function works
- [ ] Log search function works
- [ ] RLS policies active

### Embeddings
- [ ] Can generate embeddings via Edge Function
- [ ] Embeddings stored in database
- [ ] All businesses have embeddings
- [ ] Embedding quality validated

### Edge Functions
- [ ] chat_search deployed and accessible
- [ ] generate_embeddings deployed and accessible
- [ ] Returns results for clear queries
- [ ] Asks clarification for vague queries
- [ ] Handles conversation context
- [ ] Applies filters correctly
- [ ] Logs all searches

### React Native App
- [ ] Search integration working
- [ ] Results display correctly
- [ ] Clarifying questions handled
- [ ] Error messages user-friendly
- [ ] Chat slider animations smooth
- [ ] Performance acceptable

### Security
- [ ] RLS policies enforced
- [ ] Anonymous users can search
- [ ] Authenticated users see only their history
- [ ] Service role has full access

### Performance
- [ ] Vector search < 100ms
- [ ] Edge Function response < 2s
- [ ] Handles 10 concurrent users
- [ ] No memory leaks

### Edge Cases
- [ ] Empty query handled
- [ ] Long query handled
- [ ] Special characters handled
- [ ] No embeddings scenario handled
- [ ] Rate limit scenario handled

---

## 📝 Test Report Template

Use this template to document your testing results:

```markdown
# Search System Test Report

**Date:** YYYY-MM-DD
**Tester:** Your Name
**Environment:** Production / Staging / Local

## Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Skipped: W

## Test Results

### 1. Database Setup
- [ ] PASS / FAIL - pgvector extension
- [ ] PASS / FAIL - Migrations applied
- Notes: ...

### 2. Edge Functions
- [ ] PASS / FAIL - chat_search basic query
- [ ] PASS / FAIL - Clarifying questions
- Notes: ...

(Continue for all test categories...)

## Issues Found

1. **Issue:** Description
   - **Severity:** High / Medium / Low
   - **Steps to reproduce:** ...
   - **Expected:** ...
   - **Actual:** ...

## Recommendations

1. ...
2. ...

## Sign-off
- [ ] All critical tests passed
- [ ] Ready for production
```

---

## 🚨 Known Issues & Workarounds

### Issue: OpenAI Rate Limits

**Workaround:** Implement caching and request throttling:

```typescript
// In chat_search Edge Function, add caching logic
const cacheKey = `search:${queryHash}`;
const cachedResult = await redis.get(cacheKey);
if (cachedResult) return cachedResult;
```

### Issue: Cold Start Latency

**Workaround:** Keep functions warm with periodic invocations:

```bash
# Create a cron job (every 5 minutes)
*/5 * * * * curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat_search \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"session_id": "warmup", "query": "warmup"}'
```

---

## 🎉 Done!

If all tests pass, you're ready for production! 🚀
