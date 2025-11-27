# 🚀 Zoid AI Voice Agent - Project Handover

**Version:** 4.0
**Last Updated:** November 10, 2025
**Current Phase:** Phase 5 Ready
**Status:** ✅ Production-Ready Foundation Complete

---

## 📋 Quick Start for New Agent

**Current Status:** Phases 1-4 complete. Ready for Phase 5 (Telephony Integration).

**What Works:**
- ✅ Web-based chatbot with voice recording
- ✅ RAG system with vector search (Supabase + pgvector)
- ✅ Speech-to-Text and Text-to-Speech (Google Cloud)
- ✅ Bilingual support (English/Arabic)
- ✅ Cost monitoring dashboard
- ✅ Document management (upload/list/delete)
- ✅ Session persistence via localStorage

**Next Phase:** Phase 5 - Add telephony infrastructure for real phone calls

---

## 🎯 Project Goal

Build an AI voice agent that receives customer calls and answers from a knowledge base, targeting the MENA region with English and Arabic support.

### Current vs Required Architecture

**Current (Web Chatbot):**
```
User Browser → Record Audio → Batch Process → Return Audio
Latency: 3-7 seconds | Type: REQUEST/RESPONSE
```

**Required (Phone Agent):**
```
Phone Call → Telephony → Streaming STT ⇄ RAG ⇄ AI ⇄ Streaming TTS → Caller
Latency: <500ms | Type: CONTINUOUS STREAMING
```

---

## 📊 Phase Completion Status

### Phase 1: Core RAG Chat ✅ COMPLETE
- Gemini 2.5 Flash integration
- RAG with simulated in-memory knowledge base
- Text-based chat interface
- Backend API routes

### Phase 2: Persistent Knowledge Base ✅ COMPLETE
- Supabase/pgvector integration
- Document ingestion API
- Text chunking and embedding
- Vector storage and retrieval

### Phase 3: Voice Integration ✅ COMPLETE
- Google Cloud Speech-to-Text
- Google Cloud Text-to-Speech
- Real-time audio recording (Web Audio API)
- Audio playback with UI controls
- Full RAG integration with voice

### Phase 4: Arabic Language Support ✅ COMPLETE
- Bilingual UI (English/Arabic selector)
- Language-aware RAG retrieval
- RTL text rendering
- Arabic STT/TTS via Google Cloud (ar-SA)
- Sample knowledge bases in both languages
- Dynamic system instructions per language

**Key Files:**
- [`lib/language.ts`](lib/language.ts:1) - Language configuration
- [`lib/voice.ts`](lib/voice.ts:1) - STT/TTS with language support
- [`lib/rag.ts`](lib/rag.ts:1) - Language-filtered vector search
- [`components/chat-interface.tsx`](components/chat-interface.tsx:1) - Bilingual UI

**Bugs Fixed:**
- ✅ Voice STT empty transcription (buffer encoding)
- ✅ Cost dashboard showing $0.0000 (localStorage on server)
- ✅ Document auto-refresh (event system)
- ✅ Session persistence (localStorage implementation)

---

## 🚀 Next Phase: Phase 5 - Telephony Integration

**Goal:** Enable real phone calls with streaming audio

**The Challenge:**
- Current system uses batch processing (3-7s latency)
- Need continuous streaming (<500ms latency)
- Must provision phone numbers
- Require IVR for language selection
- Need call routing and management

### Recommended Approach: VAPI.ai

**Why VAPI.ai:**
- Built specifically for AI voice agents
- Handles real-time streaming out-of-box
- Pre-integrated STT/TTS (supports Google Cloud)
- Strong Arabic support
- Webhook integration with existing RAG
- Fastest implementation path

**Alternatives:**
- Retell AI (similar to VAPI)
- Twilio (more complex, more flexible)
- Bland.ai (outbound focus)

### Implementation Steps

1. **Phone Number Provisioning**
   - Get phone number via chosen platform
   - Configure IVR (language selection menu)
   - Set up call routing

2. **Streaming Pipeline**
   - Replace batch API with WebSocket/SSE
   - Implement streaming STT integration
   - Build real-time RAG retrieval
   - Integrate streaming TTS

3. **Backend Adaptation**
   - Create `app/api/vapi-webhook/route.ts` (or similar)
   - Modify [`lib/rag.ts`](lib/rag.ts:1) for low-latency (<200ms)
   - Add streaming response chunks
   - Implement conversation state management

4. **Testing Infrastructure**
   - Call simulation framework
   - Latency monitoring
   - Quality assurance checklist
   - Load testing (concurrent calls)

**Success Criteria:**
- ✅ Live phone number receiving calls
- ✅ IVR with language selection working
- ✅ Streaming conversation with AI
- ✅ <500ms response latency
- ✅ Arabic and English support verified

### ⚠️ Current Phase 5 Status Update

**What's Done:**
- ✅ Phone number provisioned: **+1 (510) 370 5981**
- ✅ Vapi account configured
- ✅ Webhook endpoint: `app/api/vapi-webhook/route.ts` (receives call events)
- ✅ Server function endpoint: `app/api/vapi-function/route.ts` (ready for Supabase RAG)
- ✅ Knowledge base files uploaded to Vapi: `sample-en.txt`, `sample-ar.txt`

**Current Blocker:**
- ⚠️ **Vapi Tool Creation Error:** When creating API Request tool in Vapi dashboard, error: "An error occurred while updating the tool" - This is a Vapi server-side issue
- ⚠️ **Workaround:** Using Vapi's built-in RAG/knowledge base temporarily instead of Supabase RAG

**Configuration Details:**
- Webhook URL: `https://eliana-hyperdulical-wamblingly.ngrok-free.dev/api/vapi-webhook`
- Server Function URL: `https://eliana-hyperdulical-wamblingly.ngrok-free.dev/api/vapi-function` (not connected yet)
- System Prompt configured in Vapi Assistant
- First Message: "Hello! Welcome to Zoid AI Support. How can I assist you today?"

**Next Steps:**
1. Monitor Vapi for tool creation fix
2. Once fixed, connect Supabase RAG via API Request tool
3. Implement dashboard analytics (see requirements below)

### Dashboard Analytics Requirements (TO BE IMPLEMENTED)

**All dashboard features matter - implementation priority:**

**Priority 1 - Call Analytics:**
- Total calls today/week/month
- Average call duration
- Calls by language (English vs Arabic)
- Call status breakdown (completed, failed, abandoned)
- Peak call times (hourly/daily patterns)
- Call volume trends over time

**Priority 2 - Phone Integration Status:**
- Vapi connection status (connected/disconnected)
- Phone number display: +1 (510) 370 5981
- Last call received timestamp
- Webhook health status (last successful webhook)
- Server function endpoint status

**Priority 3 - Call Logs:**
- Recent calls list: Call ID, Duration, Language, Timestamp, Status
- Conversation transcript viewing
- Filter by date range, language, status
- Search functionality

**Priority 4 - Response Quality Metrics:**
- Average response time (RAG + AI generation)
- RAG retrieval success rate
- Questions answered vs "I don't know" responses
- Most common questions (top 10)
- Response accuracy score
- Language distribution of queries

**Priority 5 - Enhanced API Costs:**
- Current: Gemini/STT/TTS costs ✅
- Add: Vapi costs (if tracked)
- Cost per call calculation
- Projected monthly costs
- Cost breakdown by service
- Budget alerts and thresholds

**Priority 6 - Knowledge Base Stats:**
- Total documents count
- Documents by language breakdown
- Most referenced documents (from RAG logs)
- Knowledge base coverage score
- Document update frequency
- Embedding generation stats

**Priority 7 - Quick Actions:**
- Test call button
- View Vapi dashboard link
- Integration settings
- Phone number management
- Knowledge base sync status (Vapi vs Supabase)

**Implementation Files Needed:**
- `components/call-analytics.tsx` - Call statistics and charts
- `components/phone-status.tsx` - Integration status card
- `components/call-logs.tsx` - Call history table
- `components/response-quality.tsx` - Quality metrics
- `lib/call-tracker.ts` - Track calls from webhooks
- `app/api/calls/route.ts` - API for call data
- Database schema for call logs (see Phase 6)

**Data Collection Strategy:**
- Webhook endpoint receives call events → store in database
- Track response times from `/api/vapi-function` logs
- Aggregate metrics for dashboard display
- Use Phase 6 database schema for persistence

---

## 🗺️ Complete Project Roadmap

### Phase 5: Telephony Integration 🔜 NEXT
Add real-time phone call handling with streaming audio

**Key Features:**
- Phone number provisioning
- IVR language menu
- Streaming STT/TTS pipeline
- WebSocket/SSE integration
- Low-latency RAG (<200ms)

**Deliverables:**
- Live phone number
- Streaming audio pipeline
- Call management system
- Quality monitoring

---

### Phase 6: Multi-User Sessions
Support multiple concurrent users with persistent history

**Key Features:**
- User authentication (phone number based)
- Session persistence in database
- Conversation history retrieval
- Session lifecycle management
- Analytics dashboard

**Database Schema:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE,
  preferred_language VARCHAR(10),
  created_at TIMESTAMP
);

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  call_duration INT,
  language VARCHAR(10)
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id),
  role VARCHAR(10),
  content TEXT,
  audio_url TEXT,
  created_at TIMESTAMP
);
```

**Deliverables:**
- User registration system
- Database session storage
- History retrieval API
- Analytics dashboard
- Export functionality (PDF/JSON)

---

### Phase 7: Human Handoff System
Escalate complex queries to human agents

**Key Features:**
- Confidence scoring on responses
- Escalation triggers (low confidence, user request)
- Call transfer functionality
- Agent notification (SMS/Slack)
- Session context transfer
- Queue management

**Implementation:**
- `lib/confidence-scorer.ts` - Score RAG responses
- `lib/escalation.ts` - Trigger logic
- Call transfer API integration
- Agent dashboard for takeover
- Post-call notes and feedback

**Triggers:**
- Low confidence score (< 0.6)
- User explicitly requests human
- Multiple "I don't know" responses
- Profanity/escalation detected

**Deliverables:**
- Confidence scoring system
- Call transfer mechanism
- Agent notification system
- Handoff UI for agents
- Session export with full context

---

### Phase 8: Tool Use / Function Calling
Enable AI to call external functions and APIs

**Use Cases:**
- CRM integration (lookup customer data)
- Order management (check status, process returns)
- Appointment booking (check availability, schedule)
- Knowledge base updates (flag incorrect info)

**Implementation:**
```typescript
// lib/tools.ts
export const tools = {
  checkOrderStatus: {
    name: "check_order_status",
    description: "Look up order by ID",
    parameters: { orderId: "string" },
    execute: async (params) => { /* ... */ }
  }
  // ... more tools
};
```

**Safety Features:**
- User confirmation for actions
- Audit logging
- Rate limiting per tool
- Rollback capability
- Parameter validation

**Deliverables:**
- Tool registry system
- Function executor with safety
- 5-10 basic tools
- Audit logging
- User confirmation flow

---

### Phase 9: Production Hardening
Production-ready, scalable, monitored system

**Key Areas:**

1. **Error Recovery**
   - Retry logic for API failures
   - Fallback responses
   - Graceful degradation
   - Circuit breakers

2. **Rate Limiting**
   - Per-user call limits
   - IP-based throttling
   - API quota management
   - Cost caps

3. **Performance Optimization**
   - Response caching (Redis)
   - Database connection pooling
   - CDN for static assets
   - Lazy loading

4. **Monitoring & Alerting**
   - Uptime monitoring (99.9% SLA)
   - Error rate tracking
   - Latency monitoring
   - Cost alerts
   - On-call rotation

5. **Security Hardening**
   - DDoS protection
   - SQL injection prevention
   - XSS protection
   - HTTPS enforcement
   - Secrets management

6. **CI/CD Pipeline**
   - Automated testing
   - Lint and build
   - Staging deployment
   - Integration tests
   - Blue-green production deployment

7. **Load Testing**
   - 100+ concurrent calls
   - Database stress testing
   - API performance testing
   - Failover testing

**Deliverables:**
- Comprehensive error handling
- Rate limiting middleware
- Monitoring dashboard
- CI/CD pipeline
- Load test results
- Security audit report
- Operations runbook

---

## 🛠️ Technology Stack

### Core Technologies
- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Node.js
- **AI:** Gemini 2.5 Flash (`@google/genai`)
- **Embeddings:** `text-embedding-004` model (768 dimensions)
- **Vector DB:** Supabase with pgvector (PostgreSQL)
- **Voice:** Google Cloud Speech-to-Text & Text-to-Speech
- **Runtime:** Node.js 18+, PostgreSQL 13+

### External Services
| Service | Purpose | Config |
|---------|---------|--------|
| Google Gemini API | AI response generation | `GEMINI_API_KEY` in `.env.local` |
| Google Cloud STT | Voice transcription | Service account JSON |
| Google Cloud TTS | Audio generation | Service account JSON |
| Supabase | Vector database + storage | Connection details in `.env.local` |

### Key Constraints
- **Audio Format:** WebM/Opus input (48kHz) → MP3 output
- **Embedding Dimension:** 768 (text-embedding-004)
- **Languages:** English, Modern Standard Arabic (ar-SA)
- **Single User Session:** No multi-user (until Phase 6)
- **RAG-Only:** No external web search

### Performance Characteristics
- **STT Latency:** 1-3 seconds
- **Embedding Generation:** 0.5 seconds
- **RAG Retrieval:** 0.3-0.5 seconds
- **AI Response:** 1-2 seconds
- **TTS Synthesis:** 0.5-1 second
- **Total Round-Trip:** 3-7 seconds (batch mode)

---

## 📁 Critical Files Reference

### Core Backend
- [`app/api/chat/route.ts`](app/api/chat/route.ts:1) - Text chat endpoint with RAG
- [`app/api/voice/route.ts`](app/api/voice/route.ts:1) - Voice endpoint (STT → RAG → TTS)
- [`app/api/ingest/route.ts`](app/api/ingest/route.ts:1) - Document upload & embedding
- [`app/api/documents/route.ts`](app/api/documents/route.ts:1) - Document list/delete

### Core Libraries
- [`lib/gemini.ts`](lib/gemini.ts:1) - Gemini AI client
- [`lib/rag.ts`](lib/rag.ts:1) - RAG retrieval with language filtering
- [`lib/voice.ts`](lib/voice.ts:1) - STT/TTS with language support
- [`lib/supabase.ts`](lib/supabase.ts:1) - Supabase client
- [`lib/language.ts`](lib/language.ts:1) - Language configuration
- [`lib/cost-monitor.ts`](lib/cost-monitor.ts:1) - Cost tracking
- [`lib/document-context.ts`](lib/document-context.ts:1) - Document refresh events

### Frontend Components
- [`components/chat-interface.tsx`](components/chat-interface.tsx:1) - Main chat UI with voice
- [`components/ingestion-form.tsx`](components/ingestion-form.tsx:1) - Document upload form
- [`components/document-list.tsx`](components/document-list.tsx:1) - Document management UI
- [`components/cost-dashboard.tsx`](components/cost-dashboard.tsx:1) - Cost monitoring display
- [`app/page.tsx`](app/page.tsx:1) - Main page layout

### Knowledge Bases
- [`knowledge-bases/base-en.txt`](knowledge-bases/base-en.txt:1) - English knowledge base
- [`knowledge-bases/base-ar.txt`](knowledge-bases/base-ar.txt:1) - Arabic knowledge base

---

## 🔧 Setup & Configuration

### Environment Variables (.env.local)
```bash
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Google Cloud Credentials
Place service account JSON at: `lib/google-cloud-key.json`

### Supabase Setup
Must create custom RPC function `match_documents()` in Supabase SQL editor (see [`lib/rag.ts`](lib/rag.ts:61) for SQL).

---

## 🎯 Development Rules

**CRITICAL RULES for all agents:**

1. **Browser Interaction:** NEVER use `browser_action` tool. Ask user to test and provide screenshots.
2. **Version Control:** Commit changes to Git frequently for rollback capability.
3. **Documentation:** Keep this PROJECT_HANDOVER.md updated with progress.
4. **Mode Switching:** Switch to appropriate mode before major tasks.
5. **Baby Steps:** Make incremental changes; test each step before proceeding.
6. **File Creation:** Do NOT create .md files unless explicitly asked by the user. Answer questions directly without creating documentation files.

---

## 💡 System Instructions

Current system instruction used in [`app/api/chat/route.ts`](app/api/chat/route.ts:1):

```
You are Zoid AI Support Agent, a helpful and friendly customer service representative for the MENA region.
Your goal is to answer the user's question based ONLY on the provided context.
If the context does not contain the answer, you MUST politely state that you do not have the information and cannot assist with that specific query. DO NOT mention the context, the knowledge base, or your limitations.
```

---

## 🌍 MENA-Specific Considerations

### Language Support
**Current:**
- ✅ Modern Standard Arabic (MSA)
- ✅ English

**Future:**
- Egyptian Arabic
- Gulf Arabic (Khaleeji)
- Levantine Arabic
- Maghrebi Arabic

### Infrastructure
**Recommended Hosting:**
- AWS UAE (Middle East - Bahrain) region
- Or AWS EU (Frankfurt) for GDPR compliance
- Target: <100ms latency from MENA

**Phone Numbers:**
- Local providers: du, Etisalat (UAE)
- Saudi Telecom Company (KSA)
- Verify regional coverage with telephony provider

---

## 📚 Cost Estimates

### Current Costs (Per 1000 Calls/Day)
- **Gemini 2.5 Flash:** ~$30/month
- **Google Cloud STT:** ~$480/month
- **Google Cloud TTS:** ~$2,280/month
- **Supabase:** ~$25/month
- **Total:** ~$2,815/month

### With Cost Monitoring
- ✅ Real-time tracking implemented
- ✅ Dashboard showing usage
- ✅ Per-request cost breakdown
- 🔜 Alert system (Phase 9)
- 🔜 Budget caps (Phase 9)

---

## 🐛 Known Issues & Workarounds

1. **Google Cloud Credentials Path**
   - Must be absolute from `process.cwd()`
   - ✅ Workaround: Ensure `lib/google-cloud-key.json` exists

2. **RTL Text Rendering**
   - Arabic needs `dir="rtl"` attribute
   - ✅ Workaround: Implemented in chat interface

3. **WebM/Opus Encoding**
   - Browser records at 48kHz
   - ✅ Workaround: Hardcoded in voice API

4. **Embedding Model Consistency**
   - Must use same model for all embeddings
   - ✅ Workaround: Centralized as `EMBEDDING_MODEL`

5. **Supabase Function**
   - Custom `match_documents()` RPC required
   - ✅ Workaround: SQL provided in [`lib/rag.ts`](lib/rag.ts:61)

---

## 🚀 Getting Started

### For New Master Agent

1. **Read this document** to understand current state
2. **Review [`ROADMAP.md`](ROADMAP.md:1)** for Phase 5 details
3. **Check Git history** for recent changes
4. **Test current system** to verify functionality
5. **Begin Phase 5** following the roadmap

### Quick Test Checklist
- [ ] Text chat works (English)
- [ ] Text chat works (Arabic)
- [ ] Voice recording works (English)
- [ ] Voice recording works (Arabic)
- [ ] Document upload works
- [ ] Document list displays
- [ ] Cost dashboard shows data
- [ ] Session persists on refresh

---

**Last Updated:** December 2025
**Version:** 5.0
**Status:** Phase 5 In Progress - Vapi Integration Started, Dashboard Pending
