# Zoid AI Voice Agent - Project State

**Last Updated:** November 27, 2025  
**Status:** ✅ Production Deployed & Healthy

---

## Quick Links

- **Production URL:** https://zoiddd.vercel.app
- **Health Check:** https://zoiddd.vercel.app/api/health
- **Phone Number:** +1 (510) 370-5981 (via VAPI)

---

## Project Goal

AI voice agent for customer calls with bilingual (English/Arabic) support, answering from a knowledge base.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ZOID AI ARCHITECTURE                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Phone Call                                              │
│      │                                                   │
│      ▼                                                   │
│  ┌─────────┐     ┌──────────────┐     ┌─────────────┐   │
│  │  VAPI   │────▶│ /api/vapi-*  │────▶│  Supabase   │   │
│  │ (Phone) │     │  (webhooks)  │     │  (pgvector) │   │
│  └─────────┘     └──────────────┘     └─────────────┘   │
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
│  └─────────┘     └──────────────┘                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Simple flow:** `Phone Call → VAPI → STT → RAG → Gemini → TTS → Caller`

---

## Current Deployment Status

| Component | Status | Details |
|-----------|--------|---------|
| ✅ Vercel | Deployed | https://zoiddd.vercel.app |
| ✅ Gemini API | Working | Key length: 40 |
| ✅ Supabase | Connected | Direct connection, pgvector enabled |
| ✅ RAG/Chat | Working | Vector search operational |
| ✅ Google Cloud | Configured | STT/TTS via base64 credentials |
| ⏳ VAPI Webhooks | Needs Config | Update webhook URLs in VAPI dashboard |

---

## Completed Phases

### Phase 1-4: Core Features ✅
- Gemini 2.5 Flash AI integration
- RAG with Supabase pgvector (768-dim embeddings)
- Voice: Google Cloud STT/TTS
- Bilingual: English + Arabic (RTL support)
- Cost monitoring dashboard

### Phase 5: Telephony ✅
- VAPI integration
- Phone number: +1 (510) 370-5981
- Webhook endpoints configured

### Phase 6: Call Handling ✅
- Call logging to database
- Vapi metrics extraction (costs, quality, tokens)
- Call statistics API

### Phase 7: Error Recovery ✅
- Retry logic with exponential backoff
- Circuit breaker pattern
- Call quality monitoring

### Phase 8A-D: Deployment ✅
- Vercel deployment configured
- All environment variables updated (Nov 27, 2025)
- All 14 API routes deployed
- Health check passing

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16, React, TypeScript, Tailwind |
| AI | Gemini 2.5 Flash |
| Embeddings | text-embedding-004 (768 dim) |
| Database | Supabase + pgvector |
| Voice | Google Cloud STT/TTS |
| Telephony | VAPI.ai |
| Hosting | Vercel |

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/chat` | POST | Text chat with RAG |
| `/api/voice` | POST | Voice (STT → RAG → TTS) |
| `/api/ingest` | POST | Document upload |
| `/api/documents` | GET | List documents |
| `/api/calls` | GET | Call logs |
| `/api/calls/simple` | GET | Simple call stats |
| `/api/calls/test` | POST | Test call logging |
| `/api/vapi-webhook` | POST | VAPI call events |
| `/api/vapi-function` | POST | VAPI server function |
| `/api/vapi-metrics` | GET | VAPI metrics |
| `/api/debug` | GET | Debug info |

---

## Project Structure

```
ZoidAI/
├── app/
│   ├── api/
│   │   ├── chat/route.ts        # Main chat API with RAG
│   │   ├── voice/route.ts       # Voice STT→RAG→TTS
│   │   ├── health/route.ts      # Health check
│   │   ├── ingest/route.ts      # Document upload
│   │   ├── documents/route.ts   # List documents
│   │   ├── calls/route.ts       # Call logs
│   │   ├── vapi-webhook/route.ts # VAPI call events
│   │   └── vapi-function/route.ts # VAPI server function
│   └── page.tsx                 # Main UI
├── lib/
│   ├── gemini.ts                # Gemini AI client
│   ├── rag.ts                   # Vector search (RAG)
│   ├── supabase.ts              # Database client
│   ├── voice.ts                 # Google STT/TTS
│   ├── google-cloud-credentials.ts # Base64 creds for Vercel
│   ├── vapi.ts                  # VAPI helpers
│   └── google-cloud-key.json    # Service account (NEVER COMMIT)
├── components/                  # React components
├── knowledge-bases/             # Sample knowledge base files
├── .env.local                   # Local secrets (NEVER COMMIT)
├── PROJECT_STATE.md             # This file
└── CURRENT_PHASE.md             # Current focus & testing checklist
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/gemini.ts` | Gemini AI client initialization |
| `lib/rag.ts` | Vector search with Supabase pgvector |
| `lib/supabase.ts` | Database client with logging |
| `lib/voice.ts` | Google Cloud STT/TTS |
| `app/api/chat/route.ts` | Main chat endpoint |
| `app/api/health/route.ts` | Health check endpoint |

---

## Database Schema

```sql
-- Documents with embeddings
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB,
  language VARCHAR(10),
  created_at TIMESTAMPTZ
);

-- Call logs
CREATE TABLE call_logs (
  id UUID PRIMARY KEY,
  call_id VARCHAR(255) UNIQUE,
  phone_number VARCHAR(20),
  status VARCHAR(50),
  duration_ms INTEGER,
  transcript TEXT,
  vapi_cost_usd DECIMAL(10,4),
  created_at TIMESTAMPTZ
);
```

---

## Environment Variables

### Local Development (`.env.local`)
```bash
GEMINI_API_KEY=your_key
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=lib/google-cloud-key.json
VAPI_API_KEY=uuid
VAPI_PUBLIC_KEY=uuid
VAPI_WEBHOOK_TOKEN=your_token
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Vercel Production
All variables set via Vercel CLI (updated Nov 27, 2025):
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLOUD_PROJECT_ID`
- `GOOGLE_APPLICATION_CREDENTIALS_BASE64` (base64-encoded JSON)
- `VAPI_API_KEY`
- `VAPI_PUBLIC_KEY`
- `VAPI_WEBHOOK_TOKEN`
- `NEXT_PUBLIC_APP_URL`

---

## Remaining Phases for Real MVP

### Phase 9: Multi-Tenancy (Critical)
- Organization/tenant model
- Row-level security
- Isolated data per customer

### Phase 10: Authentication (Critical)
- User sign-up/login
- Session management
- Protected routes

### Phase 11: Payments (Critical)
- Stripe integration
- Free tier ($1 limit)
- Per-tenant usage tracking

### Phase 12: Phone Provisioning (Critical)
- Per-tenant phone numbers
- Vapi configuration per org

### Phase 13: Admin & Notifications
- Admin panel
- Email notifications

---

## Quick Commands

```bash
# Local development
npm run dev

# Check local health
curl http://localhost:3000/api/health

# Check production health
curl https://zoiddd.vercel.app/api/health

# Test chat API (local)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello", "language": "en-US"}'

# Test chat API (production)
curl -X POST https://zoiddd.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello", "language": "en-US"}'

# Deploy to Vercel
vercel --prod

# View Vercel logs
vercel logs --prod

# Update environment variable
echo "value" | vercel env add VAR_NAME production

# List environment variables
vercel env ls
```

---

## Cost Estimates (1000 calls/day)

- Gemini: ~$30/month
- Google STT: ~$480/month
- Google TTS: ~$2,280/month
- Supabase: ~$25/month
- Telephony: ~$50-90/month
- **Total:** ~$3,000/month
