@echo off
echo Deploying generate_embeddings Edge Function...
npx supabase functions deploy generate_embeddings --project-ref oofugvbdkyqtidzuaelp --no-verify-jwt=false
echo Deployment complete!
