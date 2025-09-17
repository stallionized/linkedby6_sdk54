# Quick Reference - Edge Function Search System

## 🚀 Common Commands

### Supabase CLI

```bash
# Login to Supabase
supabase login

# Link to project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push

# Deploy Edge Functions
supabase functions deploy chat_search
supabase functions deploy generate_embeddings

# Set secrets
supabase secrets set OPENAI_API_KEY=sk-your-key

# View secrets
supabase secrets list

# View logs
supabase functions logs chat_search --follow
supabase functions logs generate_embeddings --follow

# Test function locally
supabase functions serve chat_search
```

---

## 🧪 Testing

### Test Search (cURL)

```bash
# Basic search
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat_search \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-123",
    "query": "Find plumbers in Chicago"
  }'

# Search with filters
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat_search \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-123",
    "query": "restaurants",
    "filters": {
      "location": "New York",
      "category": "Italian",
      "max_results": 20
    }
  }'

# Generate embeddings
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate_embeddings \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 50}'
```

### Test with Node.js Scripts

```bash
cd scripts

# Generate embeddings for all businesses
node generate-all-embeddings.js

# Run integration tests
node test-search.js
```

---

## 📊 Monitoring Queries

### Check Embedding Coverage

```sql
-- Quick overview
SELECT
    COUNT(*) as total,
    COUNT(embedding) as with_embeddings,
    ROUND(COUNT(embedding)::numeric / COUNT(*) * 100, 2) as percent
FROM business_profiles;
```

### View Recent Searches

```sql
-- Last 20 searches
SELECT
    query_text,
    result_count,
    response_time_ms,
    created_at
FROM search_history
ORDER BY created_at DESC
LIMIT 20;
```

### Search Analytics

```sql
-- Daily stats for last 7 days
SELECT * FROM search_analytics
WHERE search_date > CURRENT_DATE - 7
ORDER BY search_date DESC;
```

### Find Zero-Result Searches

```sql
-- Searches that returned no results
SELECT
    query_text,
    filters,
    created_at
FROM search_history
WHERE result_count = 0
ORDER BY created_at DESC
LIMIT 20;
```

### Most Common Queries

```sql
-- Top 20 queries
SELECT
    query_text,
    COUNT(*) as count
FROM search_history
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY query_text
ORDER BY count DESC
LIMIT 20;
```

### Check Edge Function Performance

```sql
-- Average response times
SELECT
    DATE(created_at) as date,
    COUNT(*) as searches,
    ROUND(AVG(response_time_ms)) as avg_ms,
    MAX(response_time_ms) as max_ms
FROM search_history
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 🔧 Maintenance

### Generate Embeddings for New Businesses

```bash
# Via cURL
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate_embeddings \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 100}'

# Via Node script
node scripts/generate-all-embeddings.js
```

### Regenerate Specific Business Embedding

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate_embeddings \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "business_id": "uuid-here",
    "force_regenerate": true
  }'
```

### Find Stale Embeddings

```sql
-- Businesses updated after embedding generation
SELECT
    business_id,
    business_name,
    updated_at,
    embedding_generated_at,
    EXTRACT(EPOCH FROM (updated_at - embedding_generated_at)) / 3600 as hours_stale
FROM business_profiles
WHERE embedding IS NOT NULL
    AND updated_at > embedding_generated_at
ORDER BY hours_stale DESC;
```

### Manually Invalidate Embeddings

```sql
-- Clear specific business embedding
UPDATE business_profiles
SET embedding = NULL, embedding_generated_at = NULL
WHERE business_id = 'uuid-here';

-- Clear all embeddings (use with caution!)
-- UPDATE business_profiles SET embedding = NULL, embedding_generated_at = NULL;
```

---

## 🐛 Troubleshooting

### Check Edge Function Status

```bash
# List all functions
supabase functions list

# Check specific function
supabase functions list | grep chat_search
```

### View Recent Errors

```bash
# View errors only
supabase functions logs chat_search | grep ERROR

# View with context
supabase functions logs chat_search --follow
```

### Test Database Connection

```sql
-- Test pgvector is installed
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Test functions exist
SELECT proname FROM pg_proc
WHERE proname IN ('search_businesses_by_vector', 'log_search', 'find_similar_searches');

-- Test RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('business_profiles', 'search_history');
```

### Verify Index Health

```sql
-- Check HNSW indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname LIKE '%embedding%';
```

### Test OpenAI Integration

```bash
# Quick test by generating embeddings for 1 business
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate_embeddings \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 1}'
```

---

## 📱 React Native Integration

### Import Search Service

```javascript
import {
  performConversationalSearch,
  buildConversationHistory,
  extractBusinessIds,
  isClarificationResponse,
} from './utils/searchService';
```

### Perform Search

```javascript
const searchResponse = await performConversationalSearch({
  session_id: sessionId,
  query: userInput,
  filters: {
    category: 'plumbing',
    location: 'Chicago',
    max_results: 10,
  },
  conversation_history: buildConversationHistory(messages, 5),
});

if (isClarificationResponse(searchResponse)) {
  // Show clarification question
  console.log(searchResponse.clarification_question);
} else {
  // Extract and display results
  const businessIds = extractBusinessIds(searchResponse);
  console.log(`Found ${businessIds.length} businesses`);
}
```

---

## 🔒 Security

### Test RLS Policies

```sql
-- As authenticated user (can only see own history)
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "test-user-id"}';
SELECT COUNT(*) FROM search_history WHERE user_id != 'test-user-id';
-- Should return 0
RESET role;

-- As anonymous user (can search but not see history)
SET LOCAL role TO anon;
SELECT * FROM search_businesses_by_vector(...);  -- Should work
SELECT * FROM search_history;  -- Should fail
RESET role;
```

### Rotate Secrets

```bash
# Update OpenAI key
supabase secrets set OPENAI_API_KEY=sk-new-key

# Re-deploy functions to pick up new secret
supabase functions deploy chat_search
supabase functions deploy generate_embeddings
```

---

## 📈 Performance Tuning

### Adjust Vector Search Threshold

```sql
-- Make search more lenient (more results)
ALTER FUNCTION search_businesses_by_vector
    DEFAULT 0.6;  -- Was 0.7

-- Make search stricter (fewer, more relevant results)
ALTER FUNCTION search_businesses_by_vector
    DEFAULT 0.8;  -- Was 0.7
```

### Rebuild Index for Better Performance

```sql
-- Drop and recreate HNSW index
DROP INDEX IF EXISTS business_profiles_embedding_idx;

CREATE INDEX business_profiles_embedding_idx
ON business_profiles
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
-- Increase m and ef_construction for better accuracy (slower build)
-- WITH (m = 32, ef_construction = 128);
```

### Clear Old Search History

```sql
-- Delete searches older than 90 days
DELETE FROM search_history
WHERE created_at < NOW() - INTERVAL '90 days';

-- Or archive instead of delete
CREATE TABLE search_history_archive AS
SELECT * FROM search_history
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM search_history
WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## 💰 Cost Monitoring

### Estimate OpenAI Costs

```sql
-- Count API calls this month
SELECT
    COUNT(*) as total_searches,
    COUNT(*) * 0.0001 as estimated_embedding_cost_usd,  -- $0.0001 per call
    COUNT(*) * 0.0005 as estimated_llm_cost_usd          -- ~$0.0005 per call
FROM search_history
WHERE created_at >= DATE_TRUNC('month', NOW());
```

### Edge Function Invocations

```bash
# View usage in Supabase Dashboard
# Project → Settings → Usage

# Or query via API (requires service role key)
curl https://YOUR_PROJECT_REF.supabase.co/rest/v1/_analytics/functions \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

---

## 🎯 Quick Wins

### Improve Search Quality

1. **Lower threshold for more results:**
   ```sql
   -- In search_businesses_by_vector function
   match_threshold DEFAULT 0.6  -- From 0.7
   ```

2. **Add more context to embeddings:**
   ```typescript
   // In generate_embeddings function
   const text = `${business.name}\n${business.industry}\n${business.description}\n${business.city}, ${business.state}`;
   ```

3. **Tune LLM prompt:**
   ```typescript
   // In chat_search function
   const systemPrompt = `Be more/less strict about clarifications...`;
   ```

### Improve Performance

1. **Increase cache hit rate:**
   ```sql
   -- Lower similarity threshold in find_similar_searches
   similarity_threshold DEFAULT 0.80  -- From 0.85
   ```

2. **Add indexes:**
   ```sql
   CREATE INDEX idx_search_history_created_at ON search_history(created_at DESC);
   CREATE INDEX idx_business_profiles_industry ON business_profiles(industry);
   ```

3. **Batch embeddings:**
   ```bash
   # Process more at once
   node scripts/generate-all-embeddings.js
   # Edit script to increase BATCH_SIZE to 100
   ```

---

## 📞 Support Contacts

- **Supabase Discord:** https://discord.supabase.com
- **OpenAI Support:** https://help.openai.com
- **Documentation:** See README_EDGE_FUNCTIONS.md

---

## ✅ Daily Checklist

```
[ ] Check Edge Function logs for errors
[ ] Verify embedding coverage is >95%
[ ] Review zero-result searches
[ ] Monitor response times (should be <2s)
[ ] Check OpenAI API costs
[ ] Generate embeddings for new businesses
```

---

**Last Updated:** 2025-01-XX

**Version:** 1.0

**Maintainer:** Your Team
