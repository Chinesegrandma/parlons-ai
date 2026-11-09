# Parlons AI — public beta deployment (Supabase Auth + Render)

This is a **separate public-beta architecture** from the original password-protected
local tunnel. Do not expose the local tunnel as a public registration website.
No cloud project or billing account is created automatically by this repository.

## Architecture

- Next.js 15 UI + FastAPI API share one HTTPS origin, fronted by FastAPI.
- Supabase **Auth** manages email/password, email confirmation, password recovery,
  token rotation and account identity. It is not used as the app's SQL database.
- FastAPI verifies a signed Supabase JWT against the project's public JWKS and
  enforces the token's issuer, audience, role and user UUID. It never trusts a
  supplied account ID from the browser.
- Each SQLite session is owned by exactly one verified identity. Conversations
  and original/edited transcripts inherit that ownership. Old local sessions
  have no owner and cannot be accessed by a cloud user.
- Render runs the two web processes in a single Docker service. A **paid**
  persistent disk mounted at /var/data stores SQLite across restarts/redeploys.
  Render's Frankfurt region is selected. A persistent disk limits the service to
  one instance and entails short interruptions during deployments.
- All paid API endpoints require the JWT and consume a **per-user** plus **global**
  quota. Quotas are stored transactionally in SQLite.
- Users can delete their Supabase identity and local conversation/transcript data.
  The backend uses a server-only Supabase service-role key for this, never the browser.

## Before enabling public sign-ups

1. **Supabase:** create a project in an appropriate EU region, enable the
   Email provider and **Require email confirmation**. Use **asymmetric signing
   keys (ES256 or RS256)**; the backend deliberately rejects symmetric HS256.
   Copy the project URL, publishable/anon key, and server-only legacy JWT
   service-role key. Never commit these values.
2. **Render:** connect the GitHub repository and create a Blueprint from
   root render.yaml with branch **dev** (after the PR has been reviewed and merged).
   Approve the **paid** service and persistent disk. Populate environment
   variables with your own credentials in Render; the example has no secrets.
3. Set SUPABASE_URL (e.g. https://abc.supabase.co),
   SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY,
   PARLONS_OPENAI_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID,
   and SUPPORT_EMAIL (a working inbox controlled by the data controller).
   The app refuses to start in cloud mode when these are missing.
4. In Supabase Auth → URL Configuration, set **Site URL** to the Render
   HTTPS domain (or your custom domain), and allow that exact callback URL
   for email confirmation and password recovery. Do this before inviting users.
5. Add provider API spending budgets and alerts, and review the latest
   Supabase, Render, OpenAI and ElevenLabs data-processing terms.
6. Finish the legal privacy notice: identify the actual controller, legal bases,
   retention periods, data-subject requests, subprocessors and any transfers.
   The /privacy page is **a draft**, not a substitute for legal review.

The Cloud Auth login page is not shown in local mock or existing tunnel mode.
No changes to main or the original local launcher are required.

## Runtime settings

- PARLONS_CLOUD_SITE=true, MOCK_AI=false, PARLONS_PUBLIC_SITE=false
- DATABASE_PATH=/var/data/parlons.sqlite3 (mounted disk, not ephemeral container)
- SUPABASE_URL: project root, HTTPS https://*.supabase.co
- SUPABASE_PUBLISHABLE_KEY: public client key
- SUPABASE_SERVICE_ROLE_KEY: **backend secret** used only for user deletion
- SUPPORT_EMAIL: verified email for requests
- PARLONS_OPENAI_API_KEY: actual OpenAI API key (never NEXT_PUBLIC_...)
- ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID: live STT/TTS
- BETA_USER_CALLS_PER_MINUTE=12 (default)
- BETA_USER_CALLS_PER_DAY=60 (default)
- BETA_GLOBAL_CALLS_PER_DAY=500 (default)

Limits count billable **requests**, not tokens, characters or euro spending.
A turn may involve more than one billable provider call (correction repair,
TTS, translation). Confirm hard limits and budgets in provider dashboards.

## Release acceptance — REQUIRED before inviting strangers

1. After GitHub CI is green, confirm /health/live returns HTTP 200 and
   /api/backend/auth/config reports cloud auth enabled without a secret.
2. Register Account A, verify the email and sign in. Complete real iPhone
   Safari microphone → transcription → edited text → feedback → TTS → replay.
3. Register Account B from a different browser. Use A's known session ID
   with B's JWT against /sessions/{id}, /chat, /review and /speech/transcribe.
   All cross-user operations must fail. Neither user should see the other's
   history in the UI.
4. Refresh, wait beyond a token expiry, then test successful refresh.
   Confirm a lost network connection shows errors without exposing secrets.
5. Check per-user and global 429 response behavior; check OpenAI and
   ElevenLabs provider budgets and real API costs.
6. Confirm deleting A's account removes its data but does not affect B.
   Confirm A's previously issued token is now blocked by the deleted-users
   tombstone, even before its original JWT expiry.
7. Redeploy Render and confirm B's conversation data survives. Turn off
   the founder's laptop to verify the site remains accessible.
8. Run a mobile usability, accessibility, privacy and security review.
   Test backups and restoration without copying personal data into logs.

## Current limitations

- Saved notebook cards still live in the browser; switching domains or devices
  does not sync them. For privacy they are cleared from the browser on sign-out
  or account deletion, but the server-side conversation history persists across
  sign-in until account deletion.
- SQLite with a Render disk is a pragmatic **single-instance Beta** database,
  not a high availability, multi-replica system. Move to managed Postgres when
  growth requires failover, higher concurrency or maintenance without downtime.
- Account self-deletion does not automatically remove data already retained
  by OpenAI/ElevenLabs; their retention policies must be reviewed.
- Existing private historical local sessions cannot be linked to a public
  account automatically; they remain inaccessible in cloud mode.
- The app retains transcripts until account deletion. Additional configurable
  data retention, export, audited backups and consent records are still needed
  before a general commercial launch.
- The web auth session is stored in browser localStorage (SPA-style). A later
  hardening milestone should use HttpOnly server sessions, a stricter CSP,
  dedicated anti-abuse/signup protections and external penetration testing.
- Without a connected Render and Supabase account, the Git repository alone
  cannot provision paid infrastructure or generate a publicly reachable URL.

## Local verification

Use the existing mock-mode commands; no real provider calls are needed:
  
    cd backend
    python -m pip install -r requirements-dev.txt
    MOCK_AI=true python -m pytest -q

    cd ../frontend
    npm ci
    npm run lint
    npm run typecheck
    npm test
    npm run build

For a full cloud stack smoke test, use a separate Supabase test project and
your own provider credentials. Do not disable email confirmation.
