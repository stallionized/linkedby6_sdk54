# Edge Function Migration Guide

## 🎯 Overview

This guide walks you through migrating from the **n8n/webhook-based** conversational search architecture to a **Supabase Edge Function-based** architecture with pgvector for semantic search.

### Benefits of the New Architecture

✅ **No external dependencies** - Everything runs in Supabase
✅ **Scalable** - Edge Functions auto-scale to handle high query volumes
✅ **Cost-effective** - Only pay for what you use
✅ **Lower latency** - Direct connection to your database
✅ **Better security** - RLS policies and service role authentication
✅ **Analytics built-in** - Every search is logged for insights
✅ **Smarter search** - Vector similarity + LLM-based query understanding

---

## 📋 Prerequisites

Before starting, ensure you have:

1. **Supabase CLI** installed
   ```bash
   npm install -g supabase
   ```

2. **Supabase Project** with:
   - Project URL
   - Service Role Key
   - Database access

3. **OpenAI API Key** for embeddings and LLM
   - Get one at: https://platform.openai.com/api-keys

4. **Deno installed** (for local Edge Function testing)
   ```bash
   # macOS/Linux
   curl -fsSL https://deno.land/install.sh | sh

   # Windows
   irm https://deno.land/install.ps1 | iex
   ```

---

## 🚀 Step-by-Step Setup

### Step 1: Initialize Supabase Project Locally

```bash
# Navigate to your project directory
cd c:\linkby6mobile_sdk54

# Login to Supabase
supabase login

# Link to your existing project
supabase link --project-ref YOUR_PROJECT_REF

# Get your project ref from: https://supabase.com/dashboard/project/_/settings/general
```

### Step 2: Run Database Migrations

The migrations will:
- Enable pgvector extension
- Add embedding columns to business_profiles
- Create search_history table
- Set up vector search functions
- Add RLS policies

```bash
# Run migrations
supabase db push

# Verify migrations were applied
supabase db remote commit
```

**Manual Alternative (if CLI doesn't work):**

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/001_setup_pgvector_and_search.sql`
3. Paste and run
4. Repeat for `supabase/migrations/002_add_rls_policies.sql`

### Step 3: Configure Edge Function Secrets

Edge Functions need these environment variables:

```bash
# Set OpenAI API key
supabase secrets set OPENAI_API_KEY=sk-your-openai-key-here

# Verify secrets are set
supabase secrets list
```

**Manual Alternative:**

1. Go to Supabase Dashboard → Edge Functions → Settings
2. Add secret: `OPENAI_API_KEY` = `your-key`

### Step 4: Deploy Edge Functions

```bash
# Deploy chat_search function
supabase functions deploy chat_search

# Deploy generate_embeddings function
supabase functions deploy generate_embeddings

# Verify deployment
supabase functions list
```

**Expected Output:**
```
┌─────────────────────┬─────────┬─────────┐
│ NAME                │ VERSION │ STATUS  │
├─────────────────────┼─────────┼─────────┤
│ chat_search         │ v1      │ ACTIVE  │
│ generate_embeddings │ v1      │ ACTIVE  │
└─────────────────────┴─────────┴─────────┘
```

### Step 5: Generate Embeddings for Existing Businesses

Now that the infrastructure is set up, generate embeddings for your existing businesses:

**Option A: Via Supabase Dashboard**

1. Go to Dashboard → Edge Functions → `generate_embeddings`
2. Click "Invoke"
3. Send this payload:
   ```json
   {
     "batch_size": 100
   }
   ```

**Option B: Via cURL**

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate_embeddings \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 100}'
```

**Option C: Via the mobile app (recommended)**

Create an admin screen or script:

```javascript
import { generateBusinessEmbeddings } from './utils/searchService';

// Generate embeddings for all businesses
const result = await generateBusinessEmbeddings({ batch_size: 100 });
console.log(`Processed: ${result.processed_count}, Failed: ${result.failed_count}`);
```

### Step 6: Update React Native App

1. **Import the new search service:**

   Add to the top of `SearchScreen.js`:
   ```javascript
   import {
     performConversationalSearch,
     buildConversationHistory,
     formatUserLocation,
     extractBusinessIds,
     isClarificationResponse,
   } from './utils/searchService';
   ```

2. **Replace the `handleSendMessage` function:**

   Open `SearchScreen_EdgeFunction.patch.js` and copy the new `handleSendMessage` function into `SearchScreen.js`

3. **Remove webhook configuration:**

   Delete or comment out the `fetchMS2WebhookUrl` section in the `useEffect`

4. **Test the integration:**

   ```bash
   npm start
   # or
   npx expo start
   ```

### Step 7: Verify Everything Works

1. **Test search in the app:**
   - Open the app and go to SearchScreen
   - Try a query like: "Show me plumbers in Chicago"
   - Verify you get relevant results

2. **Test clarifying questions:**
   - Try a vague query like: "Find businesses"
   - The AI should ask a clarifying question

3. **Check search history:**
   ```sql
   SELECT * FROM search_history ORDER BY created_at DESC LIMIT 10;
   ```

4. **Check business embeddings:**
   ```sql
   SELECT
     business_id,
     business_name,
     embedding IS NOT NULL as has_embedding,
     embedding_generated_at
   FROM business_profiles
   LIMIT 10;
   ```

---

## 🔧 Configuration & Tuning

### Adjust Vector Search Sensitivity

Edit the `search_businesses_by_vector` function parameters:

```sql
-- In 001_setup_pgvector_and_search.sql, line ~85
match_threshold float DEFAULT 0.7,  -- Lower = more results (0.6-0.8 recommended)
match_count int DEFAULT 10,         -- Max results to return
```

### Adjust LLM Clarification Behavior

Edit `supabase/functions/chat_search/index.ts`:

```typescript
// Around line 60-75, modify the system prompt
const systemPrompt = `You are a search query analyzer...
Guidelines:
- If the query is reasonably specific, proceed with search  // ← Adjust this
- Only ask for clarification if the query is extremely vague  // ← Adjust this
...`;
```

### Add Automatic Embedding Generation Trigger

To automatically generate embeddings when businesses are created:

```sql
-- Add this to your migrations
CREATE OR REPLACE FUNCTION auto_generate_embedding_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Call Edge Function to generate embedding asynchronously
    PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/generate_embeddings',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_key'),
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object('business_id', NEW.business_id)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_embedding
    AFTER INSERT OR UPDATE OF business_name, description, industry
    ON business_profiles
    FOR EACH ROW
    WHEN (NEW.embedding IS NULL)
    EXECUTE FUNCTION auto_generate_embedding_trigger();
```

---

## 📊 Monitoring & Analytics

### View Search Analytics

```sql
-- See daily search stats
SELECT * FROM search_analytics ORDER BY search_date DESC LIMIT 7;

-- Find most common queries
SELECT
    query_text,
    COUNT(*) as search_count,
    AVG(result_count) as avg_results
FROM search_history
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY query_text
ORDER BY search_count DESC
LIMIT 20;

-- Find queries with no results
SELECT
    query_text,
    filters,
    created_at
FROM search_history
WHERE result_count = 0
ORDER BY created_at DESC
LIMIT 20;
```

### Monitor Edge Function Performance

```bash
# View logs for chat_search
supabase functions logs chat_search

# View logs for generate_embeddings
supabase functions logs generate_embeddings

# Follow logs in real-time
supabase functions logs chat_search --follow
```

### Check Embedding Coverage

```sql
-- How many businesses have embeddings?
SELECT
    COUNT(*) as total_businesses,
    COUNT(embedding) as with_embeddings,
    ROUND(COUNT(embedding)::numeric / COUNT(*)::numeric * 100, 2) as coverage_percent
FROM business_profiles;

-- Which businesses need embeddings?
SELECT
    business_id,
    business_name,
    created_at
FROM business_profiles
WHERE embedding IS NULL
ORDER BY created_at DESC;
```

---

## 🐛 Troubleshooting

### Issue: "OPENAI_API_KEY is not configured"

**Solution:**
```bash
supabase secrets set OPENAI_API_KEY=sk-your-key
supabase functions deploy chat_search --no-verify-jwt
```

### Issue: "Vector extension not found"

**Solution:**
```sql
-- Run this in SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
```

### Issue: Embeddings not generating

**Checklist:**
1. ✅ OpenAI API key is set correctly
2. ✅ Businesses have `business_name` populated
3. ✅ Check Edge Function logs: `supabase functions logs generate_embeddings`
4. ✅ Manually invoke: `supabase functions invoke generate_embeddings --body '{"batch_size":10}'`

### Issue: Search returns no results

**Debugging:**
```sql
-- Check if any businesses have embeddings
SELECT COUNT(*) FROM business_profiles WHERE embedding IS NOT NULL;

-- Test vector search directly
SELECT * FROM search_businesses_by_vector(
    query_embedding := (SELECT embedding FROM business_profiles WHERE embedding IS NOT NULL LIMIT 1),
    match_threshold := 0.5,
    match_count := 10
);
```

### Issue: "Function not found" error

**Solution:**
```bash
# Re-deploy functions
supabase functions deploy chat_search
supabase functions deploy generate_embeddings

# Or deploy all at once
supabase functions deploy --all
```

### Issue: RLS policy blocking requests

**Solution:**
```sql
-- Temporarily disable RLS for testing (DO NOT USE IN PRODUCTION)
ALTER TABLE search_history DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
```

---

## 🔄 Migration Checklist

Use this checklist to track your progress:

- [ ] Supabase CLI installed and authenticated
- [ ] Database migrations applied (001_setup_pgvector_and_search.sql)
- [ ] RLS policies applied (002_add_rls_policies.sql)
- [ ] OpenAI API key configured as secret
- [ ] chat_search Edge Function deployed
- [ ] generate_embeddings Edge Function deployed
- [ ] Embeddings generated for existing businesses
- [ ] SearchScreen.js updated with new search service
- [ ] Webhook configuration removed/commented out
- [ ] App tested with sample queries
- [ ] Clarifying questions tested
- [ ] Search history verified in database
- [ ] Analytics queries working

---

## 📚 Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

---

## 🆘 Getting Help

If you run into issues:

1. Check the logs: `supabase functions logs chat_search --follow`
2. Review the troubleshooting section above
3. Search Supabase Discord: https://discord.supabase.com
4. Check OpenAI API status: https://status.openai.com

---

## 🎉 Success!

Once everything is working, you should see:

✅ Conversational search working in the app
✅ LLM asking clarifying questions when needed
✅ Relevant business results returned
✅ Search history logged in database
✅ No more dependency on n8n/external webhooks

You now have a **scalable, production-ready semantic search system** powered by Supabase Edge Functions and pgvector! 🚀
