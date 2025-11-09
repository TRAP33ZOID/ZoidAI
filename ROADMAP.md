# 🗺️ Zoid AI Voice Agent - Strategic Roadmap

**Last Updated:** November 8, 2025
**Status:** Post Master Audit - Strategic Pivot Required
**Audited By:** Claude Sonnet 4.5 (Master Agent)

---

## 🎯 END GOAL

**Build an AI voice agent that receives customer calls and answers from a knowledge base.**

### Current Reality Check

**What We Have:**
- ✅ Web-based chatbot with voice recording
- ✅ RAG system with document retrieval
- ✅ Text-to-Speech and Speech-to-Text
- ✅ Bilingual support (English/Arabic)

**What We're Missing:**
- ❌ **Telephony infrastructure** (can't receive phone calls)
- ❌ **Real-time streaming** (3-7 second latency, not <500ms)
- ❌ **Call routing and IVR**
- ❌ **Continuous audio streaming** (currently batch request/response)

### The Gap

```
Current Architecture:
User Browser → Record Audio → Send Batch → Process → Return Audio
⚠️ This is a CHATBOT, not a CALL AGENT

Required Architecture:
Phone Call → Telephony Provider → Streaming STT ⇄ RAG ⇄ AI ⇄ Streaming TTS → Caller
✅ This is what we need to build
```

---

## 🚨 CRITICAL BUGS DISCOVERED

### Bug #1: Broken Language-Aware Ingestion (BLOCKING)

**Severity:** CRITICAL  
**Impact:** Arabic knowledge base doesn't work properly

**Problem:**
- [`app/api/ingest/route.ts`](app/api/ingest/route.ts:13) doesn't accept language parameter
- Documents stored WITHOUT language metadata
- RAG system expects language filtering, but documents lack this field
- Result: English documents retrieved for Arabic queries

**Fix Required:**
1. Add `language` parameter to ingestion API
2. Update [`components/ingestion-form.tsx`](components/ingestion-form.tsx:1) with language selector
3. Store language in document metadata
4. Test with bilingual knowledge base

**Priority:** HIGH - Fix in Phase 4.1 (Week 1)

---

### Bug #2: No Document Management

**Severity:** MEDIUM  
**Impact:** Can't view, edit, or delete uploaded documents

**Missing Features:**
- Document list/viewer
- Delete functionality
- Document metadata display
- Language filtering

**Fix Required:**
- Create `components/document-list.tsx`
- Add `app/api/documents/route.ts` (GET, DELETE)
- Build admin UI

**Priority:** MEDIUM - Fix in Phase 4.1 (Week 1)

---

### Bug #3: No Session Persistence

**Severity:** MEDIUM  
**Impact:** All chat history lost on refresh

**Current State:**
- Messages stored in React state only
- No conversation history
- Can't resume conversations

**Fix Required:**
- Short-term: Use localStorage
- Long-term: Database storage (Phase 4D)

**Priority:** MEDIUM - Fix in Phase 4.1 (Week 1)

---

### Bug #4: No Cost Monitoring

**Severity:** HIGH  
**Impact:** Could rack up unexpected bills

**Current Costs (Unmonitored!):**
- Gemini 2.5 Flash: $0.075 per 1M input tokens
- Google Cloud STT: $0.016 per minute
- Google Cloud TTS: $16 per 1M characters ⚠️

**For 1000 calls/day:**
- Estimated: **$2,800/month**
- **No alerts or tracking in place!**

**Fix Required:**
- Create `lib/cost-monitor.ts`
- Track requests, tokens, TTS characters
- Daily cost alerts
- Usage dashboard

**Priority:** HIGH - Fix in Phase 4.1 (Week 1)

---

## 📋 CORRECTED ROADMAP

### Phase 4.1: Bug Fixes & Foundation (Week 1)

**Goal:** Fix critical issues blocking progress

| Task | Priority | Days |
|------|----------|------|
| Fix language-aware ingestion | HIGH | 2 |
| Add document management UI | MEDIUM | 1 |
| Implement session persistence (localStorage) | MEDIUM | 0.5 |
| Add cost monitoring & tracking | HIGH | 1 |
| Update PROJECT_HANDOVER.md | LOW | 0.5 |

**Deliverables:**
- ✅ Language-tagged document uploads
- ✅ Document list viewer with delete
- ✅ Persistent chat history (localStorage)
- ✅ Cost tracking dashboard
- ✅ Updated documentation

---

### Phase 4.5: Telephony Integration (Weeks 2-4) ⭐ NEW - CRITICAL

**Goal:** Enable real phone calls with streaming audio

#### Step 1: Research & Decision (Week 2)

**Telephony Platform Options:**

| Platform | Cost | Complexity | Timeline | Recommendation |
|----------|------|------------|----------|----------------|
| **VAPI.ai** | $0.05/min | LOW | 1-2 weeks | ⭐ **RECOMMENDED** |
| Retell AI | $0.06/min | LOW | 1-2 weeks | Good alternative |
| Twilio | $0.0085/min* | HIGH | 4-6 weeks | Most flexible |
| Bland.ai | $0.09/min | LOW | 1-2 weeks | For outbound only |

*Plus STT/TTS costs separately

**Why VAPI.ai?**
1. ✅ Built specifically for AI voice agents
2. ✅ Handles real-time streaming out-of-box
3. ✅ Pre-integrated STT/TTS (Google, Azure, Deepgram)
4. ✅ Strong Arabic support for MENA region
5. ✅ Webhook integration with existing RAG
6. ✅ Fastest path to live calls (1-2 weeks)

**Research Checklist:**
- [ ] Sign up for VAPI trial account
- [ ] Test voice quality in English & Arabic
- [ ] Verify RAG webhook integration
- [ ] Compare pricing for 1000 calls/day
- [ ] Test call latency (<500ms target)
- [ ] Verify MENA phone number support

#### Step 2: Implementation (Weeks 3-4)

**Required Changes:**

1. **Phone Number Provisioning**
   - Get phone number via VAPI/Twilio
   - Configure IVR (language selection menu)
   - Set up call routing

2. **Streaming Pipeline**
   - Replace batch API with WebSocket/SSE
   - Implement streaming STT integration
   - Build real-time RAG retrieval
   - Integrate streaming TTS

3. **Backend Adaptation**
   - Create `app/api/vapi-webhook/route.ts`
   - Modify RAG for low-latency (<200ms)
   - Add streaming response chunks
   - Implement conversation state management

4. **Testing Infrastructure**
   - Call simulation framework
   - Latency monitoring
   - Quality assurance checklist
   - Load testing (10 concurrent calls)

**Deliverables:**
- ✅ Live phone number receiving calls
- ✅ IVR with language selection
- ✅ Streaming STT/TTS pipeline
- ✅ RAG integration via webhooks
- ✅ <500ms response latency
- ✅ Test call recordings

**Success Criteria:**
- Real phone call answered by AI
- Natural conversation flow
- Arabic and English support working
- No dropped calls or audio glitches
- Latency < 500ms for responses

---

### Phase 4D: Multi-User + Database Sessions (Week 5)

**Goal:** Support multiple concurrent users with persistent history

**Why This Moved Up:**
- More foundational than tool use
- Required before production
- Enables analytics and debugging

**Implementation:**

1. **Database Schema**
   ```sql
   -- Users table
   CREATE TABLE users (
     id UUID PRIMARY KEY,
     phone_number VARCHAR(20) UNIQUE,
     preferred_language VARCHAR(10),
     created_at TIMESTAMP
   );

   -- Sessions table
   CREATE TABLE chat_sessions (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES users(id),
     started_at TIMESTAMP,
     ended_at TIMESTAMP,
     call_duration INT,
     language VARCHAR(10)
   );

   -- Messages table
   CREATE TABLE chat_messages (
     id UUID PRIMARY KEY,
     session_id UUID REFERENCES chat_sessions(id),
     role VARCHAR(10), -- 'user' or 'assistant'
     content TEXT,
     audio_url TEXT,
     created_at TIMESTAMP
   );
   ```

2. **Authentication (Optional)**
   - Phone number verification
   - Session tokens
   - JWT for API access

3. **Session Management**
   - Create `lib/session-manager.ts`
   - CRUD operations for sessions
   - History retrieval API
   - Export conversations (PDF/JSON)

4. **Analytics Dashboard**
   - Total calls per day/week
   - Average call duration
   - Most asked questions
   - Language distribution
   - User retention metrics

**Deliverables:**
- ✅ User registration system
- ✅ Persistent conversation history
- ✅ Session list UI
- ✅ Analytics dashboard
- ✅ Export functionality

---

### Phase 4C: Human Handoff System (Week 6)

**Goal:** Escalate complex queries to human agents

**Why This Matters for Calls:**
- AI can't handle all scenarios
- Legal/sensitive issues need humans
- Customer satisfaction fallback

**Implementation:**

1. **Confidence Scoring**
   - Create `lib/confidence-scorer.ts`
   - Score based on RAG similarity
   - Track conversation confusion signals
   - Set escalation thresholds

2. **Call Transfer**
   - Twilio call transfer API
   - Warm handoff with context
   - Agent notification (SMS/Slack)
   - Queue management

3. **Session Transfer**
   - Export conversation history
   - Agent dashboard for takeover
   - Resume capability
   - Post-call notes

4. **Triggers**
   - Low confidence score (< 0.6)
   - User requests human ("speak to agent")
   - Multiple "I don't know" responses
   - Profanity/escalation detected

**Deliverables:**
- ✅ Confidence scoring system
- ✅ Call transfer functionality
- ✅ Agent notification system
- ✅ Handoff UI for agents
- ✅ Session export (PDF)

---

### Phase 4B: Tool Use / Function Calling (Week 7)

**Goal:** Enable AI to call external functions/APIs

**Why This Moved Down:**
- Less critical than telephony
- Requires stable call infrastructure first
- Can be added incrementally

**Use Cases:**
1. **CRM Integration**
   - Look up customer data
   - Update contact info
   - Log call notes

2. **Order Management**
   - Check order status
   - Process returns
   - Update shipping address

3. **Appointment Booking**
   - Check availability
   - Schedule appointments
   - Send confirmations

4. **Knowledge Base Updates**
   - Flag incorrect information
   - Request human review
   - Submit feedback

**Implementation:**

1. **Tool Registry**
   ```typescript
   // lib/tools.ts
   export const tools = {
     checkOrderStatus: {
       name: "check_order_status",
       description: "Look up order by ID",
       parameters: {
         orderId: "string"
       },
       execute: async (params) => { /* ... */ }
     },
     // ... more tools
   };
   ```

2. **Gemini Function Calling**
   - Define tool schemas
   - Parse function calls
   - Execute safely with validation
   - Return results to AI

3. **Safety & Validation**
   - User confirmation for actions
   - Audit logging
   - Rate limiting per tool
   - Rollback capability

**Deliverables:**
- ✅ Tool registry system
- ✅ Function executor with safety
- ✅ 5-10 basic tools
- ✅ Audit logging
- ✅ User confirmation flow

---

### Phase 4E: Production Hardening (Weeks 8-9)

**Goal:** Production-ready, scalable, monitored system

**Critical for Launch:**

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
   - Secrets management (Vault)

6. **CI/CD Pipeline**
   ```yaml
   # .github/workflows/ci-cd.yml
   - Run tests
   - Lint code
   - Build Docker image
   - Deploy to staging
   - Run integration tests
   - Deploy to production (blue-green)
   ```

7. **Load Testing**
   - Simulate 100 concurrent calls
   - Test database under load
   - API stress testing
   - Failover testing

**Deliverables:**
- ✅ Comprehensive error handling
- ✅ Rate limiting middleware
- ✅ Monitoring dashboard (Datadog/Grafana)
- ✅ CI/CD pipeline
- ✅ Load test results
- ✅ Security audit passed
- ✅ Deployment playbook
- ✅ Operations runbook

---

## 🌍 MENA-Specific Considerations

### Language Requirements

**Current:**
- ✅ Modern Standard Arabic (MSA)
- ✅ English

**Future (Phase 5+):**
- [ ] Egyptian Arabic
- [ ] Gulf Arabic (Khaleeji)
- [ ] Levantine Arabic
- [ ] Maghrebi Arabic

**Recommendation:** Use Whisper API for better dialect support once stable.

### Infrastructure

**Hosting:**
- AWS UAE (Middle East - Bahrain) region
- Or AWS EU (Frankfurt) for GDPR compliance
- Target: <100ms latency from MENA

**Phone Numbers:**
- Local providers: du, Etisalat (UAE)
- Saudi Telecom Company (KSA)
- Zain (Kuwait)
- Ensure local caller ID for trust

### Cultural Adaptations

1. **Greeting Customization**
   - "As-salamu alaykum" for Arabic
   - Gender-specific voice options

2. **Prayer Times**
   - Reduce call volume during prayer times
   - Automated messages during these periods

3. **Ramadan Adjustments**
   - Modified greeting during Ramadan
   - Adjusted operating hours

4. **Data Residency**
   - Comply with local data laws
   - Consider data sovereignty requirements

---

## 💰 COST OPTIMIZATION STRATEGY

### Current Cost Structure (Unoptimized)

**For 1000 calls/day (5 min average, 500 words response):**

| Service | Cost | Monthly |
|---------|------|---------|
| Google STT | $0.016/min | $2,400 |
| Google TTS | $16/1M chars | $240 |
| Gemini API | $0.075/1M tokens | $150 |
| **Total** | - | **$2,790** |

### Optimization Targets

**Target Monthly Cost:** $1,500 (46% reduction)

**Strategies:**

1. **Response Caching**
   - Cache common questions (80% hit rate)
   - Redis TTL: 24 hours
   - Savings: ~$500/month

2. **Shorter Responses**
   - Target: 200 words vs 500
   - Reduces TTS costs by 60%
   - Savings: ~$150/month

3. **Voice Provider Switch**
   - Consider ElevenLabs ($0.30/1K chars)
   - Better voice quality + lower cost
   - Savings: ~$100/month

4. **Batch Processing**
   - Batch embeddings (5x faster)
   - Reduce API calls
   - Savings: ~$50/month

5. **Smart Routing**
   - FAQ bypass (no AI needed)
   - Simple queries → cheaper models
   - Savings: ~$200/month

### Cost Monitoring Dashboard

**Key Metrics:**
- Daily spend by service
- Cost per call
- Token usage trends
- TTS character count
- Budget utilization (%)

**Alerts:**
- Daily spend > $150
- Single call cost > $0.50
- Monthly projection > $2,000

---

## 📊 SUCCESS METRICS

### Phase 4.1 (Bug Fixes)
- [ ] 100% of documents tagged with language
- [ ] Document management UI working
- [ ] Chat history persists across sessions
- [ ] Cost tracking dashboard live

### Phase 4.5 (Telephony)
- [ ] Phone number receiving calls
- [ ] <500ms average response latency
- [ ] 95% call success rate
- [ ] Arabic & English both working
- [ ] 10 concurrent calls without issues

### Phase 4D (Multi-User)
- [ ] 1000+ user sessions stored
- [ ] Conversation history retrieval <200ms
- [ ] Analytics dashboard showing trends

### Phase 4C (Human Handoff)
- [ ] 95% escalation accuracy
- [ ] <30s average handoff time
- [ ] Full context transferred to agents

### Phase 4B (Tool Use)
- [ ] 5+ tools integrated
- [ ] 99% function execution success
- [ ] Audit logs capturing all actions

### Phase 4E (Production)
- [ ] 99.9% uptime
- [ ] <500ms p95 latency
- [ ] $1,500/month operating costs
- [ ] Zero security incidents

---

## 🎯 IMMEDIATE NEXT STEPS

### This Week (Week 1)

**Monday-Tuesday:** Fix language ingestion bug
- Update `app/api/ingest/route.ts`
- Add language selector to ingestion form
- Test bilingual uploads

**Wednesday:** Add document management
- Create document list component
- Build delete API endpoint
- Test CRUD operations

**Thursday:** Cost monitoring
- Create `lib/cost-monitor.ts`
- Add tracking to all API routes
- Build simple dashboard

**Friday:** Session persistence + Git commit
- Implement localStorage fallback
- Update PROJECT_HANDOVER.md
- Commit all changes

### Next Week (Week 2)

**Monday-Wednesday:** Telephony research
- Sign up for VAPI trial
- Test Arabic voice quality
- Evaluate Twilio comparison
- Prototype webhook integration

**Thursday:** Decision day
- Choose VAPI vs Twilio vs Retell
- Get approval for platform
- Set up account

**Friday:** Begin integration
- Provision phone number
- Configure basic IVR
- First test call

---

## 🚀 LAUNCH READINESS CHECKLIST

### Before Going Live

**Technical:**
- [ ] All bugs fixed (Phase 4.1)
- [ ] Phone calls working (Phase 4.5)
- [ ] Multi-user support (Phase 4D)
- [ ] Human handoff ready (Phase 4C)
- [ ] Production hardened (Phase 4E)
- [ ] Load tested (100 concurrent calls)
- [ ] Security audit passed
- [ ] Monitoring & alerts configured

**Business:**
- [ ] Phone numbers provisioned
- [ ] Human agents trained
- [ ] Escalation procedures defined
- [ ] SLA agreements in place
- [ ] Cost budget approved
- [ ] Legal compliance verified

**MENA-Specific:**
- [ ] Local phone numbers acquired
- [ ] Arabic voice quality validated
- [ ] Cultural customizations implemented
- [ ] Data residency confirmed
- [ ] Local support team ready

---

## 📚 REFERENCES & RESOURCES

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

*This document serves as the master plan for building a production-ready AI voice agent that receives and handles customer phone calls. Follow phases sequentially for best results.*

*Last Updated: November 8, 2025 | Audited by Claude Sonnet 4.5*