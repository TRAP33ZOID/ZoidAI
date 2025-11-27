# 🏗️ Architecture & Latency Analysis

**Last Updated:** December 2025  
**Purpose:** Document streaming capabilities, latency analysis, and architecture decisions  
**Status:** Critical technical documentation

---

## 📋 Table of Contents

1. [Current Architecture](#current-architecture)
2. [Latency Analysis](#latency-analysis)
3. [Streaming Capabilities](#streaming-capabilities)
4. [Vapi Integration Details](#vapi-integration-details)
5. [Optimization Strategies](#optimization-strategies)
6. [Trade-offs & Recommendations](#trade-offs--recommendations)

---

## 🏗️ Current Architecture

### Endpoint Overview

We have **three main endpoints** that share the same core RAG/AI logic:

| Endpoint | STT | RAG | AI | TTS | Use Case |
|----------|-----|-----|----|----|----------|
| `/api/chat` | ❌ | ✅ | ✅ | ❌ | Text chat in browser |
| `/api/voice` | ✅ (Google) | ✅ | ✅ | ✅ (Google) | Voice chat in browser |
| `/api/vapi-function` | ❌ (Vapi) | ✅ | ✅ | ❌ (Vapi) | Phone calls |

### Shared Core Libraries

All endpoints use:
- `lib/rag.ts` → `retrieveContext()` - Same RAG logic
- `lib/gemini.ts` → `generateContent()` - Same AI model
- `lib/language.ts` → Language handling

### Current Flow (Batch Processing)

#### Web Voice (`/api/voice`)
```
User speaks → [Wait for complete audio]
  ↓
Google Cloud STT → [Wait for full transcription]
  ↓
RAG Retrieval → [Wait for full context]
  ↓
AI Generation → [Wait for complete response]
  ↓
Google Cloud TTS → [Wait for full audio]
  ↓
Return complete audio file
```

**Total Latency:** 3-7 seconds (batch mode)

#### Phone Calls (`/api/vapi-function`)
```
Phone Call → Vapi STT → [Streams transcription] ✅
  ↓
HTTP Call to `/api/vapi-function`
  ↓
RAG Retrieval → [Wait for full context] ❌ (~300-500ms)
  ↓
AI Generation → [Wait for complete response] ❌ (~1-2 seconds)
  ↓
Return complete text → Vapi TTS → [Streams audio] ✅
```

**Total Latency:** ~1.5-3 seconds (bottleneck: your endpoint)

---

## ⏱️ Latency Analysis

### Target vs Reality

**Target (from PROJECT_STATE.md):**
```
Phone Call → Telephony → Streaming STT ⇄ RAG ⇄ AI ⇄ Streaming TTS → Caller
Latency: <500ms | Type: CONTINUOUS STREAMING
```

**Current Reality:**
- ✅ Vapi STT: Streaming (low latency)
- ❌ Your endpoint: Batch processing (~1.5-3s delay)
- ✅ Vapi TTS: Streaming (low latency)

### Latency Breakdown

#### Current Phone Call Flow
1. **Vapi STT:** ~200-500ms (streaming, handled by Vapi)
2. **HTTP Call Overhead:** ~50-200ms (network round-trip)
3. **RAG Retrieval:** ~300-500ms (batch, waits for full result)
4. **AI Generation:** ~1-2 seconds (batch, waits for complete text)
5. **Network Return:** ~50-200ms (data transfer back)
6. **Vapi TTS:** ~200-500ms (streaming, handled by Vapi)

**Total:** ~1.5-3 seconds (bottleneck is steps 3-4)

#### Vapi File Upload (Current Workaround)
1. **Vapi STT:** ~200-500ms (streaming)
2. **Vapi Internal RAG:** ~50-200ms (optimized, internal)
3. **Vapi Internal AI:** ~200-500ms (optimized, internal)
4. **Vapi TTS:** ~200-500ms (streaming)

**Total:** ~200-500ms (everything internal, optimized)

---

## 🔄 Streaming Capabilities

### What Supports Streaming

#### ✅ Gemini AI
- **Status:** Supports streaming
- **SDK:** `@google/genai` has `generateContentStream()` method
- **Capability:** Can stream tokens as they're generated
- **First Token Latency:** ~300-500ms (vs ~1-2s for complete response)

#### ✅ Google Cloud STT
- **Status:** Supports streaming
- **Method:** `streamingRecognize()` (not currently used)
- **Current:** Using `recognize()` (batch mode)

#### ✅ Google Cloud TTS
- **Status:** Supports streaming
- **Method:** Can stream audio chunks
- **Current:** Using batch `synthesizeSpeech()`

#### ❌ Vapi Function Calling
- **Status:** Likely does NOT support streaming
- **Reason:** Function calls expect complete JSON response
- **Format:** `{ "result": "Complete text here..." }`
- **Limitation:** Synchronous HTTP request/response model

### Streaming Implementation (If Supported)

#### Gemini Streaming Example
```typescript
// Hypothetical streaming implementation
const stream = await ai.models.generateContentStream({
  model: CHAT_MODEL,
  contents: [{ role: "user", parts: [{ text: userQuery }] }],
  config: { systemInstruction: systemInstruction }
});

// Stream tokens as they arrive
for await (const chunk of stream) {
  const token = chunk.text;
  // Send to client immediately
  controller.enqueue(new TextEncoder().encode(token));
}
```

**Expected Improvement:** First token in ~300ms (vs ~1-2s for complete)

#### Server-Sent Events (SSE) Format
```typescript
// If Vapi supported streaming
export async function POST(req: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      // Stream AI tokens
      const aiStream = await ai.models.generateContentStream({...});
      
      for await (const chunk of aiStream) {
        const token = chunk.text;
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify({ token })}\n\n`)
        );
      }
      
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

**Reality:** Vapi likely doesn't support this for function calls.

---

## 📞 Vapi Integration Details

### Current Setup

#### Two Integration Methods

**Method 1: File Upload (Current Workaround)**
- **How:** Upload knowledge base files directly to Vapi dashboard
- **Files:** `sample-en.txt`, `sample-ar.txt`
- **Latency:** ~200-500ms (fast, everything internal)
- **Limitations:**
  - Static knowledge base (manual updates)
  - No multi-tenant support
  - No real-time updates
  - Less control over RAG behavior

**Method 2: API Tool (Target)**
- **How:** Vapi calls your `/api/vapi-function` endpoint
- **Status:** ⚠️ Tool creation currently failing (Vapi platform issue)
- **Latency:** ~1.5-3 seconds (slower, external HTTP call)
- **Benefits:**
  - Dynamic knowledge base (Supabase)
  - Real-time updates
  - Multi-tenant support
  - Full control over RAG/AI

### Vapi Function Calling Flow

```
Phone Call → Vapi STT (streaming) ✅
  ↓
Vapi calls your endpoint: POST /api/vapi-function
  ↓
Request Format:
{
  "functionCall": {
    "name": "get_ai_response",
    "parameters": {
      "query": "user's question",
      "language": "en-US" or "ar-SA",
      "conversationHistory": [...]
    }
  }
}
  ↓
Your endpoint processes (batch):
  1. RAG retrieval (~300-500ms)
  2. AI generation (~1-2 seconds)
  ↓
Response Format:
{
  "result": "Complete AI response text..."
}
  ↓
Vapi TTS (streaming) ✅
```

### Why File Upload is Faster

1. **No HTTP Overhead:** Everything runs inside Vapi's infrastructure
2. **Optimized RAG:** Vapi's internal RAG is optimized for speed
3. **Optimized AI:** Vapi's internal AI pipeline is optimized
4. **No Network Latency:** No external API calls
5. **Caching:** Vapi likely caches common queries

### Why API Tool is Slower

1. **HTTP Overhead:** Network round-trip (~50-200ms)
2. **Batch Processing:** Waits for complete RAG + AI response
3. **Network Latency:** Data transfer back to Vapi
4. **No Caching:** Each request hits your database
5. **External Dependency:** Depends on your server's performance

---

## 🚀 Optimization Strategies

### Strategy 1: Optimize Batch Processing (Recommended First)

**Goal:** Reduce latency from ~1.5-3s to ~800ms-1.5s

#### Optimizations

1. **Reduce RAG Chunks**
   ```typescript
   // Current: 3 chunks
   const contextChunks = await retrieveContext(userQuery, language, 3);
   
   // Optimized: 2 chunks (faster, still good quality)
   const contextChunks = await retrieveContext(userQuery, language, 2);
   ```
   **Expected Improvement:** ~100-200ms faster

2. **Add Caching**
   ```typescript
   // Cache common RAG queries (5 minute TTL)
   const cacheKey = `rag:${userQuery}:${language}`;
   const cached = await cache.get(cacheKey);
   if (cached) return cached;
   
   const result = await retrieveContext(userQuery, language, 2);
   await cache.set(cacheKey, result, 300); // 5 minutes
   ```
   **Expected Improvement:** ~300-500ms for cached queries

3. **Optimize Supabase Queries**
   ```sql
   -- Ensure indexes exist
   CREATE INDEX IF NOT EXISTS idx_documents_language ON documents(language);
   CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops);
   ```
   **Expected Improvement:** ~50-100ms faster

4. **Connection Pooling**
   ```typescript
   // Optimize Supabase connection pool
   // Reduce connection overhead
   ```
   **Expected Improvement:** ~20-50ms faster

5. **Parallel Operations** (where possible)
   ```typescript
   // If RAG and AI setup can be parallelized
   const [contextChunks, aiConfig] = await Promise.all([
     retrieveContext(userQuery, language, 2),
     prepareAIConfig()
   ]);
   ```
   **Expected Improvement:** ~50-100ms faster

**Total Expected Improvement:** ~800ms-1.5s (vs current ~1.5-3s)

### Strategy 2: Implement Streaming (If Vapi Supports)

**Goal:** Reduce latency to ~300-800ms (first token in ~300ms)

#### Requirements
1. Vapi must support streaming function responses (SSE or similar)
2. Implement streaming in `/api/vapi-function`
3. Stream Gemini tokens as they're generated

#### Implementation
```typescript
export async function POST(req: Request) {
  // ... setup code ...
  
  const stream = new ReadableStream({
    async start(controller) {
      // Fast RAG (reduced chunks)
      const contextChunks = await retrieveContext(userQuery, language, 2);
      const systemInstruction = buildInstruction(contextChunks);
      
      // Stream AI tokens
      const aiStream = await ai.models.generateContentStream({
        model: CHAT_MODEL,
        contents: [{ role: "user", parts: [{ text: userQuery }] }],
        config: { systemInstruction }
      });
      
      // Send tokens as they arrive
      for await (const chunk of aiStream) {
        const token = chunk.text;
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify({ token })}\n\n`)
        );
      }
      
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

**Expected Improvement:** First token in ~300ms, complete response streaming

**Reality Check:** Vapi likely doesn't support this for function calls.

### Strategy 3: Hybrid Approach

**Goal:** Best of both worlds

#### Architecture
```
Customer uploads → Your Dashboard → Supabase RAG
                                    ↓
Web Chat: Uses Supabase RAG directly (dynamic)
Phone Calls: 
  Option A: Vapi file upload (fast, static)
  Option B: Your API tool (slower, dynamic)
```

#### Decision Logic
- **Static content:** Use Vapi file upload (fast)
- **Dynamic content:** Use your API tool (slower but real-time)
- **Hybrid:** Sync common content to Vapi, use API for updates

**Complexity:** High (managing two knowledge bases)

---

## ⚖️ Trade-offs & Recommendations

### Trade-off Matrix

| Approach | Latency | Dynamic Updates | Multi-Tenant | Complexity | Cost |
|----------|---------|----------------|--------------|------------|------|
| **Vapi File Upload** | ~200-500ms ✅ | ❌ Static | ❌ No | Low ✅ | Low ✅ |
| **Your API Tool (Current)** | ~1.5-3s ❌ | ✅ Real-time | ✅ Yes | Medium | Medium |
| **Your API Tool (Optimized)** | ~800ms-1.5s ⚠️ | ✅ Real-time | ✅ Yes | Medium | Medium |
| **Your API Tool (Streaming)** | ~300-800ms ✅ | ✅ Real-time | ✅ Yes | High ❌ | Medium |

### Recommendations

#### For MVP (Now)
1. **Use optimized batch processing**
   - Reduce RAG chunks (3 → 2)
   - Add caching for common queries
   - Optimize Supabase queries
   - **Target:** ~800ms-1.5s latency

2. **Accept the latency trade-off**
   - ~800ms-1.5s is acceptable for most use cases
   - Customers care more about accuracy than 500ms difference
   - Focus on other value props (ease of use, multi-channel, etc.)

3. **Test with real customers**
   - See if latency is actually a problem
   - Optimize based on feedback
   - Don't over-optimize prematurely

#### For Future (If Needed)
1. **Investigate Vapi streaming support**
   - Check Vapi documentation for streaming function responses
   - Test if SSE/streaming is possible
   - Implement if supported

2. **Consider hybrid approach**
   - Use Vapi file upload for static content
   - Use API tool for dynamic/customer-specific queries
   - Route based on query type

3. **Optimize further if customers complain**
   - Add more aggressive caching
   - Consider CDN for static content
   - Optimize database queries further

### Key Insights

1. **You're not competing with Vapi**
   - Vapi is infrastructure (like AWS, Stripe)
   - Your value is the platform (dashboard, multi-channel, managed service)
   - Latency is a trade-off, not a blocker

2. **Latency isn't everything**
   - Customers care about: accuracy, ease of use, cost, support
   - ~800ms-1.5s is acceptable for most use cases
   - Focus on solving customer problems, not perfect latency

3. **Optimize based on customer feedback**
   - Don't over-optimize prematurely
   - Test with real customers first
   - Optimize what customers actually complain about

---

## 📊 Performance Comparison

### Current State

| Endpoint | Latency | Type | Status |
|----------|---------|------|--------|
| Web Chat (`/api/chat`) | ~1-2s | Batch | ✅ Acceptable |
| Web Voice (`/api/voice`) | ~3-7s | Batch | ⚠️ Slow but acceptable |
| Phone Calls (Vapi File Upload) | ~200-500ms | Streaming | ✅ Fast |
| Phone Calls (Your API Tool) | ~1.5-3s | Batch | ⚠️ Slower |

### Optimized State (Target)

| Endpoint | Latency | Type | Status |
|----------|---------|------|--------|
| Web Chat (`/api/chat`) | ~800ms-1.5s | Batch (optimized) | ✅ Good |
| Web Voice (`/api/voice`) | ~2-4s | Batch (optimized) | ⚠️ Acceptable |
| Phone Calls (Your API Tool) | ~800ms-1.5s | Batch (optimized) | ✅ Acceptable |

### Ideal State (If Streaming Supported)

| Endpoint | Latency | Type | Status |
|----------|---------|------|--------|
| Web Chat (`/api/chat`) | ~300-800ms | Streaming | ✅ Fast |
| Web Voice (`/api/voice`) | ~500ms-1s | Streaming | ✅ Fast |
| Phone Calls (Your API Tool) | ~300-800ms | Streaming | ✅ Fast |

---

## 🔍 Technical Details

### Gemini Streaming API

```typescript
// Batch (current)
const response = await ai.models.generateContent({
  model: CHAT_MODEL,
  contents: [{ role: "user", parts: [{ text: query }] }],
  config: { systemInstruction }
});
const text = response.text; // Complete text

// Streaming (if supported)
const stream = await ai.models.generateContentStream({
  model: CHAT_MODEL,
  contents: [{ role: "user", parts: [{ text: query }] }],
  config: { systemInstruction }
});

for await (const chunk of stream) {
  const token = chunk.text; // Token as it's generated
  // Process token immediately
}
```

### Vapi Function Response Format

```typescript
// Expected format (complete JSON)
{
  "result": "Complete AI response text here..."
}

// Streaming format (if supported - unlikely)
// Server-Sent Events (SSE)
data: {"token": "Hello"}
data: {"token": " there"}
data: {"token": "!"}
```

### RAG Optimization

```typescript
// Current
const contextChunks = await retrieveContext(userQuery, language, 3);

// Optimized
const contextChunks = await retrieveContext(userQuery, language, 2); // Fewer chunks

// With caching
const cacheKey = `rag:${hashQuery(userQuery)}:${language}`;
let contextChunks = await cache.get(cacheKey);
if (!contextChunks) {
  contextChunks = await retrieveContext(userQuery, language, 2);
  await cache.set(cacheKey, contextChunks, 300); // 5 min TTL
}
```

---

## 📝 Action Items

### Immediate (Before MVP)
- [ ] Reduce RAG chunks from 3 to 2 in `/api/vapi-function`
- [ ] Add caching for common RAG queries
- [ ] Optimize Supabase indexes
- [ ] Test latency improvements

### Short-term (After MVP Launch)
- [ ] Monitor real customer latency metrics
- [ ] Collect customer feedback on response time
- [ ] Optimize based on actual usage patterns

### Long-term (If Needed)
- [ ] Investigate Vapi streaming support
- [ ] Implement streaming if Vapi supports it
- [ ] Consider hybrid approach if latency becomes issue

---

## 🎯 Conclusion

**Key Takeaways:**

1. **Current latency (~1.5-3s) is acceptable** for MVP
2. **Optimizations can reduce to ~800ms-1.5s** without streaming
3. **Streaming is possible** but Vapi likely doesn't support it for function calls
4. **Focus on customer value**, not perfect latency
5. **Optimize based on feedback**, not assumptions

**Recommendation:** Implement batch optimizations first, test with customers, optimize further if needed.

---

**Last Updated:** December 2025  
**Status:** Active documentation - Update as architecture evolves

