# Zoid AI Voice Agent - Project State

**Last Updated:** November 27, 2025  
**Status:** Phases 1-8C Complete, Local Dev Working

---

## Project Goal

AI voice agent for customer calls with bilingual (English/Arabic) support, answering from a knowledge base.

```
Phone Call → Telephony → STT ⇄ RAG ⇄ AI ⇄ TTS → Caller
```

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

### Phase 8A-C: Deployment ✅
- Vercel deployment configured
- Production URL: https://zoiddd.vercel.app
- All 14 API routes deployed

### Phase 8D: Testing ⏳
- Comprehensive production testing pending
- See testing checklist in archive

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

---

## Key Files

### API Routes
- `app/api/chat/route.ts` - Text chat with RAG
- `app/api/voice/route.ts` - Voice (STT → RAG → TTS)
- `app/api/ingest/route.ts` - Document upload
- `app/api/vapi-webhook/route.ts` - Call events
- `app/api/health/route.ts` - Health check

### Libraries
- `lib/gemini.ts` - AI client
- `lib/rag.ts` - Vector search
- `lib/supabase.ts` - Database client
- `lib/voice.ts` - STT/TTS

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

## Quick Test

```bash
# Start dev server
npm run dev

# Test chat API
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello", "language": "en-US"}'

# Check health
curl http://localhost:3000/api/health
```

---

## Cost Estimates (1000 calls/day)

- Gemini: ~$30/month
- Google STT: ~$480/month
- Google TTS: ~$2,280/month
- Supabase: ~$25/month
- Telephony: ~$50-90/month
- **Total:** ~$3,000/month
