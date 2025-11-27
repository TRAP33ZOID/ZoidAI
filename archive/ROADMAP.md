# 🗺️ Zoid AI Voice Agent - Strategic Roadmap

**Last Updated:** November 10, 2025
**Current Status:** Phases 1-4 Complete, Ready for Phase 5

---

## 🎯 End Goal

**Build an AI voice agent that receives customer calls and answers from a knowledge base.**

### What We Have (Phases 1-4 Complete)
- ✅ Web-based chatbot with voice recording
- ✅ RAG system with document retrieval
- ✅ Speech-to-Text and Text-to-Speech
- ✅ Bilingual support (English/Arabic)
- ✅ Cost monitoring dashboard
- ✅ Document management
- ✅ Session persistence

### What We Need (Phases 5-9)
- ❌ Telephony infrastructure (can't receive phone calls)
- ❌ Real-time streaming (<500ms latency)
- ❌ Call routing and IVR
- ❌ Multi-user sessions with database
- ❌ Human handoff system
- ❌ Tool use/function calling
- ❌ Production hardening

### The Gap

```
Current Architecture:
User Browser → Record Audio → Send Batch → Process → Return Audio
⚠️ This is a CHATBOT, not a CALL AGENT

Required Architecture:
Phone Call → Telephony → Streaming STT ⇄ RAG ⇄ AI ⇄ Streaming TTS → Caller
✅ This is what we need to build
```

---

## 📋 Completed Phases

### Phase 1: Core RAG Chat ✅
- Gemini 2.5 Flash integration
- RAG with simulated knowledge base
- Text-based chat interface
- Backend API routes

### Phase 2: Persistent Knowledge Base ✅
- Supabase/pgvector integration
- Document ingestion with embeddings
- Vector storage and retrieval
- Chunking strategy

### Phase 3: Voice Integration ✅
- Google Cloud Speech-to-Text
- Google Cloud Text-to-Speech
- Real-time audio recording
- Audio playback controls
- Full RAG integration

### Phase 4: Arabic Language Support ✅
- Bilingual UI (English/Arabic)
- Language-aware RAG retrieval
- RTL text rendering
- Arabic STT/TTS
- Sample knowledge bases
- Dynamic system instructions
- Cost monitoring dashboard
- Document management UI
- Session persistence (localStorage)

---

## 🚀 Remaining Phases

### Phase 5: Telephony Integration 🚧 IN PROGRESS

**Goal:** Enable real phone calls with streaming audio

**Current Status:**
- ✅ Phone number provisioned: **+1 (510) 370 5981**
- ✅ Vapi integration started
- ✅ Webhook endpoint: `app/api/vapi-webhook/route.ts`
- ✅ Server function endpoint: `app/api/vapi-function/route.ts`
- ⚠️ **BLOCKER:** Vapi tool creation failing (server-side error)
- ⚠️ **WORKAROUND:** Using Vapi's built-in RAG temporarily
- 📋 **TODO:** Dashboard analytics implementation

**Key Features:**
- ✅ Phone number provisioning
- ⏳ IVR language selection menu (pending Vapi fix)
- ✅ Streaming STT/TTS pipeline (handled by Vapi)
- ✅ Webhook integration
- ⏳ Low-latency RAG retrieval (<200ms) - blocked by tool creation
- ⏳ Call routing and management dashboard

**Implementation Approach:**

1. **Telephony Platform: VAPI.ai** ✅ SELECTED
   - Phone number: +1 (510) 370 5981
   - Webhook: `/api/vapi-webhook`
   - Server function: `/api/vapi-function` (not connected yet)
   - **Issue:** Tool creation error prevents Supabase RAG connection
   - **Workaround:** Using Vapi's knowledge base upload feature

2. **Phone Number & IVR** ✅ PARTIAL
   - ✅ Phone number provisioned
   - ⏳ IVR configuration (pending tool fix)

3. **Backend Endpoints** ✅ COMPLETE
   - ✅ `app/api/vapi-webhook/route.ts` - Receives call events
   - ✅ `app/api/vapi-function/route.ts` - Generates AI responses (ready, not connected)

4. **Dashboard Analytics** 📋 TODO
   See detailed requirements in PROJECT_HANDOVER.md Phase 5 section

**Success Criteria:**
- ✅ Live phone number receiving calls
- ⏳ IVR with language selection (pending)
- ✅ AI responds in real-time (via Vapi RAG)
- ⏳ Response latency <500ms (needs Supabase RAG)
- ✅ English and Arabic support (via Vapi knowledge base)
- 📋 Dashboard showing call analytics (to be implemented)

---

### Phase 5B: Dashboard Analytics Implementation 📋 NEXT

**Goal:** Build comprehensive dashboard for monitoring calls, analytics, and system health

**Required Dashboard Components:**

1. **Call Analytics Dashboard**
   - Total calls (today/week/month)
   - Average call duration
   - Calls by language breakdown
   - Call status distribution
   - Peak call times visualization
   - Call volume trends (charts)

2. **Phone Integration Status**
   - Vapi connection status
   - Phone number display
   - Last call timestamp
   - Webhook health monitoring
   - Endpoint status checks

3. **Call Logs Interface**
   - Recent calls table
   - Call details (ID, duration, language, status)
   - Conversation transcripts
   - Filtering and search
   - Export functionality

4. **Response Quality Metrics**
   - Average response times
   - RAG success rates
   - Answer vs "don't know" ratio
   - Top questions analysis
   - Language distribution

5. **Enhanced Cost Tracking**
   - Vapi costs integration
   - Cost per call calculation
   - Monthly projections
   - Budget alerts

6. **Knowledge Base Analytics**
   - Document statistics
   - Language distribution
   - Most referenced content
   - Coverage metrics

**Implementation Priority:**
- Phase 1: Call Analytics + Phone Status (quick wins)
- Phase 2: Call Logs + Quality Metrics
- Phase 3: Enhanced Cost Tracking + KB Stats

**Files to Create:**
- `components/call-analytics.tsx`
- `components/phone-status.tsx`
- `components/call-logs.tsx`
- `components/response-quality.tsx`
- `lib/call-tracker.ts`
- `app/api/calls/route.ts`

**Data Storage:**
- Use Phase 6 database schema for call logs
- Track webhook events in database
- Aggregate metrics for dashboard

---

### Phase 6: Multi-User Sessions

**Goal:** Support multiple concurrent users with persistent history

**Key Features:**
- User authentication (phone number based)
- Database session storage
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
  role VARCHAR(10), -- 'user' or 'assistant'
  content TEXT,
  audio_url TEXT,
  created_at TIMESTAMP
);
```

**Implementation:**
- `lib/auth.ts` - Authentication helpers
- `lib/session-manager.ts` - CRUD operations
- Session list UI
- History retrieval API
- Analytics dashboard
- Export functionality

**Deliverables:**
- User registration system
- Persistent conversation storage
- Session history UI
- Analytics and metrics
- Export to PDF/JSON

---

### Phase 7: Human Handoff System

**Goal:** Escalate complex queries to human agents

**Key Features:**
- Confidence scoring on AI responses
- Automatic escalation triggers
- Call transfer to human agents
- Agent notification system
- Context transfer with full history
- Queue management

**Escalation Triggers:**
- Low confidence score (< 0.6)
- User explicitly requests human agent
- Multiple "I don't know" responses
- Profanity or escalation detected

**Implementation:**
- `lib/confidence-scorer.ts` - Score AI responses
- `lib/escalation.ts` - Trigger logic
- Call transfer API integration
- Agent dashboard for takeover
- Notification system (SMS/Slack)
- Post-call notes capability

**Deliverables:**
- Confidence scoring system
- Call transfer mechanism
- Agent notification system
- Handoff UI for human agents
- Session export with context

---

### Phase 8: Tool Use / Function Calling

**Goal:** Enable AI to call external functions and APIs

**Use Cases:**
- **CRM Integration:** Look up customer data, update contact info
- **Order Management:** Check order status, process returns
- **Appointment Booking:** Check availability, schedule appointments
- **Knowledge Base:** Flag incorrect information for review

**Implementation:**
```typescript
// lib/tools.ts
export const tools = {
  checkOrderStatus: {
    name: "check_order_status",
    description: "Look up order by ID",
    parameters: { orderId: "string" },
    execute: async (params) => { /* ... */ }
  },
  // ... more tools
};
```

**Safety Features:**
- User confirmation for actions
- Comprehensive audit logging
- Rate limiting per tool
- Parameter validation
- Rollback capability

**Deliverables:**
- Tool registry system
- Safe function executor
- 5-10 basic tools
- Audit logging system
- User confirmation flow

---

### Phase 9: Production Hardening

**Goal:** Production-ready, scalable, monitored system

**Key Areas:**

**1. Error Recovery**
- Retry logic for API failures
- Fallback responses
- Graceful degradation
- Circuit breakers

**2. Rate Limiting**
- Per-user call limits
- IP-based throttling
- API quota management
- Cost caps and alerts

**3. Performance Optimization**
- Response caching (Redis)
- Database connection pooling
- CDN for static assets
- Lazy loading strategies

**4. Monitoring & Alerting**
- Uptime monitoring (99.9% SLA target)
- Error rate tracking
- Latency monitoring
- Cost alerts
- On-call rotation setup

**5. Security Hardening**
- DDoS protection
- SQL injection prevention
- XSS protection
- HTTPS enforcement
- Secrets management (Vault/AWS Secrets)

**6. CI/CD Pipeline**
```yaml
# .github/workflows/ci-cd.yml
- Run tests
- Lint code
- Build Docker image
- Deploy to staging
- Run integration tests
- Blue-green production deployment
```

**7. Load Testing**
- Simulate 100+ concurrent calls
- Database stress testing
- API performance testing
- Failover testing

**Deliverables:**
- Comprehensive error handling
- Rate limiting middleware
- Monitoring dashboard (Datadog/Grafana)
- CI/CD pipeline
- Load test results
- Security audit report
- Deployment playbook
- Operations runbook

---

## 🌍 MENA-Specific Considerations

### Language Requirements

**Current (Phase 4):**
- ✅ Modern Standard Arabic (MSA)
- ✅ English

**Future:**
- Egyptian Arabic
- Gulf Arabic (Khaleeji)
- Levantine Arabic
- Maghrebi Arabic

**Recommendation:** Use Whisper API for better dialect support once stable.

### Infrastructure

**Recommended Hosting:**
- AWS UAE (Middle East - Bahrain) region
- Or AWS EU (Frankfurt) for GDPR compliance
- Target: <100ms latency from MENA

**Phone Numbers:**
- Local providers: du, Etisalat (UAE)
- Saudi Telecom Company (KSA)
- Verify regional support with chosen telephony platform

---

## 💰 Cost Considerations

### Current Costs (Per 1000 Calls/Day)
- Gemini 2.5 Flash: ~$30/month
- Google Cloud STT: ~$480/month
- Google Cloud TTS: ~$2,280/month
- Supabase: ~$25/month
- **Subtotal:** ~$2,815/month

### Additional Costs (Post-Phase 5)
- Telephony platform: $50-90/month per 1000 calls
- Phone numbers: $1-5/month per number
- **Total Estimated:** ~$3,000/month for 1000 calls/day

### Cost Monitoring
- ✅ Real-time tracking implemented (Phase 4)
- ✅ Dashboard showing usage
- ✅ Per-request cost breakdown
- 🔜 Alert system (Phase 9)
- 🔜 Budget caps (Phase 9)

---

## 📈 Success Metrics

### Phase 5 (Telephony)
- [ ] Live phone number operational
- [ ] <500ms response latency
- [ ] 0% dropped calls
- [ ] 99% IVR success rate
- [ ] English and Arabic both working

### Phase 6 (Multi-User)
- [ ] 1000+ concurrent users supported
- [ ] <200ms session retrieval
- [ ] 99.9% data persistence
- [ ] Analytics dashboard operational

### Phase 7 (Human Handoff)
- [ ] 95% escalation accuracy
- [ ] <30s average handoff time
- [ ] 100% context transfer success
- [ ] Agent satisfaction >4/5

### Phase 8 (Tool Use)
- [ ] 5+ tools integrated
- [ ] 99% execution success rate
- [ ] 100% audit coverage
- [ ] 0 unauthorized actions

### Phase 9 (Production)
- [ ] 99.9% uptime achieved
- [ ] <500ms p95 latency
- [ ] 0 security incidents
- [ ] CI/CD pipeline operational

---

## 🚀 Launch Readiness Checklist

### Technical Requirements
- [ ] All bugs fixed (Phase 4) ✅
- [ ] Phone calls working (Phase 5)
- [ ] Multi-user support (Phase 6)
- [ ] Human handoff ready (Phase 7)
- [ ] Production hardened (Phase 9)
- [ ] Load tested (100 concurrent calls)
- [ ] Security audit passed
- [ ] Monitoring configured

### Business Requirements
- [ ] Phone numbers provisioned
- [ ] Human agents trained
- [ ] Escalation procedures documented
- [ ] SLA agreements in place
- [ ] Cost budget approved
- [ ] Legal compliance verified

### MENA-Specific
- [ ] Local phone numbers acquired
- [ ] Arabic voice quality validated
- [ ] Cultural customizations implemented
- [ ] Data residency confirmed
- [ ] Local support team ready

---

## 📚 Key Resources

### Telephony Platforms
- [VAPI.ai Documentation](https://docs.vapi.ai)
- [Retell AI Documentation](https://docs.retellai.com)
- [Twilio Voice API](https://www.twilio.com/docs/voice)
- [Bland.ai API](https://docs.bland.ai)

### Voice Services
- [Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text)
- [Google Cloud Text-to-Speech](https://cloud.google.com/text-to-speech)
- [ElevenLabs API](https://elevenlabs.io/docs)
- [Deepgram STT](https://deepgram.com/docs)

### AI & RAG
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Supabase Vector Guide](https://supabase.com/docs/guides/ai)
- [LangChain Documentation](https://js.langchain.com/docs)

### MENA Resources
- [Arabic NLP Tools](https://github.com/CAMeL-Lab/camel_tools)
- [Arabic Voice Datasets](https://www.openslr.org/46/)
- [MENA Data Residency Guide](https://aws.amazon.com/compliance/data-residency/)

---

**End of Strategic Roadmap**

*This roadmap provides the strategic direction for building a production-ready AI voice agent. Follow phases sequentially for best results.*

**For detailed implementation guidance, see [`PROJECT_HANDOVER.md`](PROJECT_HANDOVER.md:1)**

---

**Last Updated:** December 2025
**Status:** Phase 5 In Progress - Vapi Integration Started, Dashboard Analytics Pending
