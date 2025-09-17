# How to Run the Enrichment Script

## Quick Start

The regenerate enrichments script will update all existing business profiles with enhanced embeddings for better search.

---

## Step 1: Get Your Supabase Service Role Key

You need the **Service Role Key** (not the anon key or access token).

### How to Find It:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **Settings** (gear icon) in left sidebar
4. Click **API**
5. Scroll down to **Project API keys** section
6. Find **service_role** key (it's marked as secret)
7. Click **Reveal** and copy the key

**Important**: This is a secret key with full database access. Never commit it to Git or share publicly.

---

## Step 2: Add to .env File

Open `c:\linkby6mobile_sdk54\.env` and add:

```env
SUPABASE_URL=https://oofugvbdkyqtidzuaelp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace the `eyJhbG...` part with your actual service role key from Step 1.

Your `.env` file should look like:

```env
SUPABASE_URL=https://oofugvbdkyqtidzuaelp.supabase.co
SUPABASE_ACCESS_TOKEN=sbp_862554b6b0afbce9d4b2f9822f953d7d519551f7
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-key-here
```

---

## Step 3: Ensure Edge Functions Are Deployed

Before running the script, make sure Edge Functions are deployed:

```bash
cd c:\linkby6mobile_sdk54
.\deploy-edge-functions.bat
```

This deploys:
- `enrich_business_profile` (required)
- `generate_embeddings` (required)
- `generate_business_description` (optional)
- `chat_search` (optional)

Wait for all functions to deploy successfully.

---

## Step 4: Run the Script

### Option A: Using Batch File (Easiest)

```bash
cd c:\linkby6mobile_sdk54
.\regenerate-enrichments.bat
```

This will:
1. Install dependencies
2. Run the enrichment script
3. Show progress for each profile
4. Display final summary

### Option B: Using NPM

```bash
cd c:\linkby6mobile_sdk54\scripts
npm install
npm run regenerate-enrichments
```

### Option C: Direct Node

```bash
cd c:\linkby6mobile_sdk54\scripts
npm install
node regenerate-all-enrichments.js
```

---

## What to Expect

### Console Output

```
✅ Environment variables loaded
   SUPABASE_URL: https://oofugvbdkyqtidzuaelp.supabase.co
   Using key: eyJhbGciOi...

╔══════════════════════════════════════════════════════════════════╗
║     REGENERATE ENRICHED EMBEDDINGS FOR ALL BUSINESS PROFILES     ║
╚══════════════════════════════════════════════════════════════════╝

📥 Fetching all active business profiles...

✅ Found 15 active business profiles

╔══════════════════════════════════════════════════════════════════╗
║  Processing 15 business profiles...                              ║
╚══════════════════════════════════════════════════════════════════╝


[1/15] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 Processing: Paula's Hair Care (Hair Salon)
   Business ID: abc123
   Location: Brooklyn, NY
   ✅ SUCCESS - Enrichment complete!
      - Industry variations: 12
      - Name variations: 8
      - Keywords: 10
      - Geographic data: 15 cities, 23 zip codes

   ⏳ Waiting 2s before next profile...

[2/15] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
...
```

### Time Required

- **Per profile**: ~7-9 seconds
- **10 profiles**: ~1.5 minutes
- **50 profiles**: ~7.5 minutes
- **100 profiles**: ~15 minutes

### Cost

- **Per profile**: ~$0.002
- **10 profiles**: ~$0.02
- **50 profiles**: ~$0.11
- **100 profiles**: ~$0.21

Very affordable!

---

## Troubleshooting

### Error: "Invalid API key"

**Cause**: Using wrong key (anon key or access token instead of service role key)

**Solution**:
1. Get service role key from Supabase Dashboard → Settings → API
2. Add `SUPABASE_SERVICE_ROLE_KEY=...` to `.env` file
3. Make sure you're using the **service_role** key, not anon or access token

### Error: "Edge Function not found"

**Cause**: Edge Functions not deployed

**Solution**:
```bash
.\deploy-edge-functions.bat
```

### Error: "OpenAI API key is not configured"

**Cause**: OpenAI API key not set in Supabase secrets

**Solution**:
```bash
npx supabase secrets set OPENAI_API_KEY=your-openai-api-key
```

### Some Profiles Skipped

**Cause**: Profiles missing required fields (name, industry, description, city, state)

**Solution**: Edit those profiles to add missing fields, then re-run script

### Some Profiles Failed

**Cause**: Various (API errors, network issues, rate limits)

**Solution**: Review error messages and re-run script (will retry failed profiles)

---

## After Running

### Verify Results

**Check database**:

```sql
-- See which profiles have enrichment
SELECT
  bp.business_name,
  CASE
    WHEN be.business_id IS NOT NULL THEN '✅ Enriched'
    ELSE '❌ Not Enriched'
  END as status
FROM business_profiles bp
LEFT JOIN business_enrichment be ON bp.business_id = be.business_id
WHERE bp.is_active = true;
```

**Check embeddings**:

```sql
-- See which profiles have embeddings
SELECT
  bp.business_name,
  CASE
    WHEN em.embedding IS NOT NULL THEN '✅ Has Embeddings'
    ELSE '❌ No Embeddings'
  END as status,
  vector_dims(em.embedding) as dimensions
FROM business_profiles bp
LEFT JOIN business_embeddings em ON bp.business_id = em.business_id
WHERE bp.is_active = true;
```

Expected: dimensions = 1536 for all profiles

### Test Search

1. Open your app
2. Search for businesses using:
   - Industry synonyms (e.g., "hairstylist" to find "Hair Salon")
   - Service keywords (e.g., "blowouts")
   - Nearby locations
3. Verify enriched profiles appear in search results

---

## Summary

1. ✅ Get service role key from Supabase Dashboard
2. ✅ Add `SUPABASE_SERVICE_ROLE_KEY` to `.env` file
3. ✅ Deploy Edge Functions with `.\deploy-edge-functions.bat`
4. ✅ Run script with `.\regenerate-enrichments.bat`
5. ✅ Wait for completion (shows progress and summary)
6. ✅ Verify in database that all profiles have enrichment + embeddings
7. ✅ Test search in app

---

## Need Help?

See detailed documentation:
- [REGENERATE_ENRICHMENTS_GUIDE.md](REGENERATE_ENRICHMENTS_GUIDE.md) - Complete guide
- [EMBEDDINGS_INTEGRATION.md](EMBEDDINGS_INTEGRATION.md) - How embeddings work
- [BUSINESS_PROFILE_FORM_ENHANCEMENT.md](BUSINESS_PROFILE_FORM_ENHANCEMENT.md) - Main documentation

---

**Ready to run?** Get your service role key and add it to `.env`, then run `.\regenerate-enrichments.bat`!
