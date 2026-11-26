# Password-protected Render Free test

Create a Web Service manually (not the paid public-beta Blueprint), choose Docker,
branch dev, Frankfurt, root directory blank, Free instance. Health check /health/live.
Use PARLONS_PUBLIC_SITE=true, PARLONS_CLOUD_SITE=false, MOCK_AI=false,
DATABASE_PATH=/tmp/parlons.sqlite3, MAX_CALLS_PER_MINUTE=12, MAX_CALLS_PER_DAY=100.
Set SITE_PASSWORD (12–256 characters), SESSION_SECRET (32+ random characters),
PARLONS_OPENAI_API_KEY, ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in Render
environment settings. Never commit secrets. No Supabase account required.

This is single-owner password protection, not separate user accounts. Only share
with trusted testers; do not enter sensitive information. The free instance
may sleep, and all server-side history and quota counters may disappear on
restart or redeploy. Browser notes remain local; export before changing domains.
Set provider-side spending limits where supported. The existing paid Blueprint
is unchanged. Live provider and Render smoke tests are not performed by CI.
