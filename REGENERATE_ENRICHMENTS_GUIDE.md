# Regenerate Enhanced Embeddings for Existing Profiles

## Overview

This script regenerates enriched embeddings for **all existing business profiles** that were created before the enhanced embeddings system was implemented.

**Purpose**: Ensure all profiles have semantic variations, geographic enrichment, and updated vector embeddings for optimal search performance.

---

## What This Script Does

### Process Flow

```
1. Fetches all active business profiles from database
   ↓
2. For each profile:
   - Checks if already has enrichment data
   - Validates required fields (name, industry, description, city, state)
   - Calls enrich_business_profile Edge Function
   - Generates semantic variations (industry, name, keywords)
   - Fetches geographic data (nearby cities, zip codes)
   - Saves enrichment to business_enrichment table
   - Database trigger generates vector embeddings
   - Embeddings saved to business_embeddings table
   ↓
3. Reports statistics (success, failed, skipped)
```

### Features

- ✅ **Batch Processing**: Processes all profiles automatically
- ✅ **Rate Limiting**: 2-second delay between calls to avoid API limits
- ✅ **Error Handling**: Continues processing even if individual profiles fail
- ✅ **Progress Tracking**: Shows real-time progress for each profile
- ✅ **Detailed Logging**: Shows enrichment details (variations count, geographic data)
- ✅ **Statistics**: Final summary with success/failure counts
- ✅ **Skip Logic**: Skips profiles missing required fields
- ✅ **Re-enrichment**: Updates existing enrichment with fresh data

---

## Prerequisites

### 1. Edge Functions Deployed

Ensure all Edge Functions are deployed:

```bash
cd c:\linkby6mobile_sdk54
.\deploy-edge-functions.bat
```

Required functions:
- ✅ `enrich_business_profile`
- ✅ `generate_embeddings`

### 2. Environment Variables

Ensure your `.env` file contains:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

### 3. OpenAI API Key

Ensure OpenAI API key is set in Supabase:

```bash
npx supabase secrets set OPENAI_API_KEY=your-openai-key
```

---

## Running the Script

### Option 1: Batch File (Easiest)

```bash
cd c:\linkby6mobile_sdk54
.\regenerate-enrichments.bat
```

This automatically:
1. Installs dependencies
2. Runs the enrichment script
3. Shows progress and results

### Option 2: NPM Script

```bash
cd c:\linkby6mobile_sdk54\scripts
npm install
npm run regenerate-enrichments
```

### Option 3: Direct Node Execution

```bash
cd c:\linkby6mobile_sdk54\scripts
npm install
node regenerate-all-enrichments.js
```

---

## Example Output

```
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
   ℹ️  Already enriched (last updated: 11/10/2025, 3:45:00 PM)
   🔄 Re-enriching with latest data...
   ✅ SUCCESS - Enrichment complete!
      - Industry variations: 12
      - Name variations: 8
      - Keywords: 10
      - Geographic data: 15 cities, 23 zip codes

   ⏳ Waiting 2s before next profile...


[2/15] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 Processing: Joe's Plumbing Services (Plumbing)
   Business ID: def456
   Location: Manhattan, NY
   ✅ SUCCESS - Enrichment complete!
      - Industry variations: 11
      - Name variations: 7
      - Keywords: 9
      - Geographic data: 20 cities, 30 zip codes

   ⏳ Waiting 2s before next profile...


[3/15] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 Processing: Incomplete Business (Unknown)
   Business ID: ghi789
   Location: Queens, NY
   ⚠️  SKIPPED - Missing required fields:
      - description
      - industry

...

╔══════════════════════════════════════════════════════════════════╗
║                        FINAL SUMMARY                              ║
╚══════════════════════════════════════════════════════════════════╝

📊 Statistics:
   Total Profiles:    15
   ✅ Successful:     13
   ⚠️  Skipped:        1
   ❌ Failed:         1
   ⏱️  Duration:       156.45s

❌ Errors encountered:

   1. Test Business (xyz123)
      Error: OpenAI API quota exceeded

✅ 13 profiles enriched successfully.
⚠️  1 profile failed. Review errors above.
ℹ️  1 profile skipped (missing required fields).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Script completed successfully.
```

---

## What Gets Updated

### For Each Business Profile

#### 1. Semantic Variations (business_enrichment table)

**Industry Variations** - Different ways users search for the industry:
```javascript
// Example: "Hair Salon"
[
  "Hairstylist",
  "Salon",
  "Hair Stylist",
  "Beauty Salon",
  "Hair Care",
  "Hair Services",
  "Hair Studio",
  "Barber Shop"
]
```

**Business Name Variations** - Shortened versions, common misspellings:
```javascript
// Example: "Paula's Hair Care"
[
  "Paula Hair Care",
  "Paulas Hair Care",
  "Paula's Hair",
  "Paula Hair",
  "PH Care"
]
```

**Description Keywords** - Key services/products extracted:
```javascript
// Example: "Full service salon. We do cuts, color, and blowouts."
[
  "cuts",
  "hair cuts",
  "color",
  "hair color",
  "blowouts",
  "styling",
  "salon services"
]
```

#### 2. Geographic Enrichment (business_enrichment table)

**Nearby Cities** - Cities within coverage radius:
```javascript
["Manhattan", "Queens", "Bronx", "Staten Island"]
```

**Zip Codes** - All zip codes in coverage area:
```javascript
["11201", "11202", "11203", "11204", ...]
```

**Counties** - County-level coverage:
```javascript
["Kings County", "New York County"]
```

#### 3. Vector Embeddings (business_embeddings table)

**Embedding Vector** - 1536-dimensional vector for semantic search:
```javascript
// Generated from all enrichment data combined
[0.023, -0.015, 0.041, ... (1536 dimensions)]
```

This enables:
- Semantic similarity search
- Natural language queries
- "Find businesses like..." functionality
- Geographic proximity matching

---

## Performance & Cost

### Time Estimates

**Per Profile**:
- AI semantic variations: ~2-3 seconds
- Geographic data fetch: ~1-2 seconds
- Database save: <1 second
- Embedding generation: ~1-2 seconds
- Script delay: 2 seconds
- **Total per profile: ~7-9 seconds**

**For Different Profile Counts**:
- 10 profiles: ~1.5 minutes
- 50 profiles: ~7.5 minutes
- 100 profiles: ~15 minutes
- 500 profiles: ~75 minutes (1.25 hours)

### Cost Estimates

**Per Profile**:
- Semantic variations (GPT-4o-mini): ~$0.002
- Embedding generation (text-embedding-3-small): ~$0.0001
- **Total per profile: ~$0.0021**

**For Different Profile Counts**:
- 10 profiles: ~$0.02
- 50 profiles: ~$0.11
- 100 profiles: ~$0.21
- 500 profiles: ~$1.05
- 1000 profiles: ~$2.10

Very cost-effective for comprehensive search enhancement!

---

## Troubleshooting

### Error: "Missing required environment variables"

**Solution**: Add to `.env` file:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Error: "OpenAI API key is not configured"

**Solution**: Set in Supabase secrets:
```bash
npx supabase secrets set OPENAI_API_KEY=your-key
```

### Error: "Edge Function not found"

**Solution**: Deploy Edge Functions:
```bash
.\deploy-edge-functions.bat
```

### Error: "OpenAI API quota exceeded"

**Solutions**:
1. Wait for quota to reset
2. Increase OpenAI API limits
3. Reduce DELAY_MS in script to process fewer profiles per minute
4. Run script in batches

### Some Profiles Skipped

**Reason**: Profiles missing required fields

**Solution**:
1. Review skipped profiles in output
2. Edit profiles to add missing fields:
   - business_name
   - industry
   - description
   - city
   - state
3. Re-run script

### Some Profiles Failed

**Reason**: Various errors (API issues, network problems, etc.)

**Solution**:
1. Review error messages in output
2. Fix underlying issues
3. Re-run script (only failed profiles will be retried)

---

## Verification

### Check Enrichment Data

```sql
-- Check which profiles have enrichment
SELECT
  bp.business_name,
  bp.industry,
  bp.city,
  bp.state,
  CASE
    WHEN be.business_id IS NOT NULL THEN '✅ Enriched'
    ELSE '❌ Not Enriched'
  END as enrichment_status,
  be.updated_at as last_enriched
FROM business_profiles bp
LEFT JOIN business_enrichment be ON bp.business_id = be.business_id
WHERE bp.is_active = true AND bp.business_status = 'Active'
ORDER BY enrichment_status DESC, bp.business_name;
```

### Check Embeddings

```sql
-- Check which profiles have embeddings
SELECT
  bp.business_name,
  bp.industry,
  CASE
    WHEN be.embedding IS NOT NULL THEN '✅ Has Embeddings'
    ELSE '❌ No Embeddings'
  END as embedding_status,
  vector_dims(be.embedding) as dimensions,
  be.updated_at as last_updated
FROM business_profiles bp
LEFT JOIN business_embeddings be ON bp.business_id = be.business_id
WHERE bp.is_active = true AND bp.business_status = 'Active'
ORDER BY embedding_status DESC, bp.business_name;
```

Expected: All active profiles should show "✅ Has Embeddings" with dimensions = 1536

### Test Search

After running the script, test that search works:

1. Open your app
2. Search for a business by:
   - Exact name
   - Industry synonym
   - Service/product keyword
   - Nearby location
3. Verify businesses appear in results

---

## When to Run This Script

### Initial Setup
Run once after deploying the enhanced form to enrich all existing profiles.

### After Bulk Updates
If you've manually updated many profiles in the database, run to refresh embeddings.

### Periodic Maintenance
Consider running quarterly to ensure all embeddings are fresh and accurate.

### After Schema Changes
If enrichment logic changes (new fields, improved prompts), run to update all profiles.

---

## Re-enrichment Behavior

The script **updates existing enrichment** rather than skipping:

```javascript
// Example output for profile that already has enrichment:
ℹ️  Already enriched (last updated: 11/10/2025, 3:45:00 PM)
🔄 Re-enriching with latest data...
✅ SUCCESS - Enrichment complete!
```

This means:
- ✅ Fresh semantic variations generated
- ✅ Latest geographic data fetched
- ✅ New embeddings generated
- ✅ Old enrichment replaced with new

**Why re-enrich?**
- Business descriptions may have been updated
- Geographic data may have changed
- Enrichment prompts may have improved
- Ensures consistency across all profiles

---

## Related Scripts

### generate-all-embeddings.js (OLD)
**Purpose**: Legacy script that only generated embeddings from existing data

**Difference**: Did NOT generate semantic variations or geographic enrichment

**Status**: Deprecated - use `regenerate-all-enrichments.js` instead

### regenerate-all-enrichments.js (NEW)
**Purpose**: Full enrichment with semantic variations + embeddings

**Use this for**: Complete enhancement of all profiles

---

## Files Created/Modified

1. **scripts/regenerate-all-enrichments.js** - Main enrichment script
2. **scripts/package.json** - Added script and dotenv dependency
3. **regenerate-enrichments.bat** - Convenient batch file to run script
4. **REGENERATE_ENRICHMENTS_GUIDE.md** - This documentation

---

## Next Steps

### After Running Script

1. **Verify Results**
   - Check database queries above
   - Ensure all profiles have enrichment and embeddings

2. **Test Search**
   - Open app and test various search queries
   - Verify semantic search works correctly
   - Check geographic proximity matching

3. **Monitor Performance**
   - Check search speed and relevance
   - Review user feedback on search results
   - Adjust enrichment prompts if needed

### Future Automation

Consider setting up automated enrichment:
- Run script weekly/monthly via cron job
- Trigger enrichment on profile updates (already done in form)
- Monitor enrichment failures and alert

---

## Support

### Issues?

1. Check error messages in script output
2. Review troubleshooting section above
3. Verify Edge Functions are deployed
4. Check Supabase Edge Function logs
5. Ensure OpenAI API key is valid and has quota

### Questions?

Refer to main documentation:
- [EMBEDDINGS_INTEGRATION.md](EMBEDDINGS_INTEGRATION.md)
- [BUSINESS_PROFILE_FORM_ENHANCEMENT.md](BUSINESS_PROFILE_FORM_ENHANCEMENT.md)
- [EMBEDDINGS_CONFIRMATION.md](EMBEDDINGS_CONFIRMATION.md)

---

**Status**: ✅ Ready to use
**Last Updated**: 2025-11-11
**Version**: 1.0.0
