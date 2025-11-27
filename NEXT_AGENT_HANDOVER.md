# Next Agent Handover

**Date:** November 27, 2025  
**Previous Session:** Production deployment with new credentials

---

## TL;DR

Zoid AI is a bilingual voice AI agent. It's now **deployed to production** at https://zoiddd.vercel.app with all systems healthy. The next major task is **Phase 9: Multi-Tenancy**.

---

## What Was Done This Session

1. **Verified local development** - Dev server running, all APIs working
2. **Installed Vercel CLI** - `npm install -g vercel`
3. **Logged into Vercel** - Browser OAuth flow
4. **Removed old (leaked) environment variables** from Vercel
5. **Added new rotated credentials** to Vercel production:
   - Gemini API key
   - Supabase URL + keys (anon + service_role)
   - Google Cloud credentials (base64 encoded)
   - VAPI keys
   - App URL
6. **Deployed to production** - `vercel --prod`
7. **Verified production health** - All checks passing

---

## Current State

### Production
- **URL:** https://zoiddd.vercel.app
- **Status:** ✅ Healthy
- **All APIs:** Working

### Verified Working
```bash
# Health check
curl https://zoiddd.vercel.app/api/health
# Returns: {"status": "healthy", ...}

# Chat API
curl -X POST https://zoiddd.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello", "language": "en-US"}'
# Returns: {"response": "...", "context": [...]}
```

### Local Development
- Run `npm run dev`
- Uses `.env.local` for credentials
- All the same APIs work on localhost:3000

---

## Key Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ZOID AI ARCHITECTURE                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Phone Call                                              │
│      │                                                   │
│      ▼                                                   │
│  ┌─────────┐     ┌──────────────┐     ┌─────────────┐  │
│  │  VAPI   │────▶│ /api/vapi-*  │────▶│  Supabase   │  │
│  │ (Phone) │     │  (webhooks)  │     │  (pgvector) │  │
│  └─────────┘     └──────────────┘     └─────────────┘  │
│                         │                    │          │
│                         ▼                    │          │
│                  ┌─────────────┐             │          │
│                  │   Gemini    │◀────────────┘          │
│                  │  2.5 Flash  │   (RAG context)        │
│                  └─────────────┘                        │
│                         │                               │
│                         ▼                               │
│                  ┌─────────────┐                        │
│                  │ Google TTS  │                        │
│                  │   (voice)   │                        │
│                  └─────────────┘                        │
│                                                          │
│  Web Chat                                                │
│      │                                                   │
│      ▼                                                   │
│  ┌─────────┐     ┌──────────────┐                       │
│  │ Browser │────▶│  /api/chat   │  (same RAG flow)      │
│  │   UI    │     │  /api/voice  │                       │
│  └─────────┘     └──────────────┘                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## File Structure (Key Files)

```
/Users/waleed/Desktop/Dev/ZoidAI/
├── app/
│   ├── api/
│   │   ├── chat/route.ts        # Main chat API with RAG
│   │   ├── voice/route.ts       # Voice STT→RAG→TTS
│   │   ├── health/route.ts      # Health check
│   │   ├── ingest/route.ts      # Document upload
│   │   ├── documents/route.ts   # List documents
│   │   ├── vapi-webhook/route.ts # VAPI call events
│   │   └── vapi-function/route.ts # VAPI server function
│   └── page.tsx                 # Main UI
├── lib/
│   ├── gemini.ts                # Gemini AI client
│   ├── rag.ts                   # Vector search
│   ├── supabase.ts              # DB client (with logging)
│   ├── voice.ts                 # Google STT/TTS
│   └── google-cloud-credentials.ts # Base64 creds for Vercel
├── .env.local                   # Local secrets (NEVER COMMIT)
├── PROJECT_STATE.md             # Full project state
├── CURRENT_PHASE.md             # Current focus
└── NEXT_AGENT_HANDOVER.md       # This file
```

---

## Environment Variables

### Local (`.env.local`)
```bash
GEMINI_API_KEY=AIzaSy...
NEXT_PUBLIC_SUPABASE_URL=https://gwpfcgibcotpymwboaei.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_CLOUD_PROJECT_ID=gen-lang-client-0921326861
GOOGLE_APPLICATION_CREDENTIALS=lib/google-cloud-key.json
VAPI_API_KEY=78d38519-...
VAPI_PUBLIC_KEY=3c489d17-...
VAPI_WEBHOOK_TOKEN=vapi-test-token-zoid
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Vercel Production
Same variables, but:
- `GOOGLE_APPLICATION_CREDENTIALS_BASE64` instead of file path
- `NEXT_PUBLIC_APP_URL=https://zoiddd.vercel.app`

---

## Useful Commands

```bash
# Start local dev
npm run dev

# Deploy to production
vercel --prod

# Check health
curl https://zoiddd.vercel.app/api/health | jq .

# Test chat
curl -X POST https://zoiddd.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What is Zoid?", "language": "en-US"}' | jq .

# View Vercel logs
vercel logs --prod

# List env vars
vercel env ls

# Add env var
echo "value" | vercel env add VAR_NAME production

# Remove env var
vercel env rm VAR_NAME production -y
```

---

## Immediate Next Steps

### 1. Configure VAPI Webhooks (Required for Phone)
Go to VAPI dashboard and update:
- **Webhook URL:** `https://zoiddd.vercel.app/api/vapi-webhook`
- **Server Function URL:** `https://zoiddd.vercel.app/api/vapi-function`

### 2. Test Phone Call
Call +1 (510) 370-5981 to verify phone integration works.

### 3. Begin Phase 9: Multi-Tenancy

**Goal:** Enable multiple customers with isolated data.

**Tasks:**
1. Create `organizations` table
2. Add `org_id` to `documents` and `call_logs`
3. Implement Row-Level Security (RLS)
4. Update API routes to accept org context
5. Update RAG to filter by org

**Schema:**
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE call_logs ADD COLUMN org_id UUID REFERENCES organizations(id);
```

---

## Database Info

**Supabase Project:** gwpfcgibcotpymwboaei

**Tables:**
- `documents` - Knowledge base with pgvector embeddings (768 dim)
- `call_logs` - Phone call logs

**Functions:**
- `match_documents(query_embedding, match_count, filter_language)` - Vector similarity search

---

## Security Notes

**Never commit:**
- `.env.local`
- `lib/google-cloud-key.json`

**Credentials were rotated** on Nov 27, 2025 after a leak. All old keys are invalid.

---

## Questions?

Read these files in order:
1. `CURRENT_PHASE.md` - What to do now
2. `PROJECT_STATE.md` - Full project state
3. `README.md` - Setup instructions
4. `archive/ENVIRONMENT_SETUP.md` - Detailed env var docs

