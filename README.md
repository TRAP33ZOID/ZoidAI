# 🎙️ Zoid AI Support Agent

A bilingual (English/Arabic) voice-enabled AI customer support agent built with Next.js, featuring real-time speech interaction and RAG-powered knowledge retrieval. **Note:** Currently in development - feature phases complete, infrastructure phases required for production MVP.

## ✨ Features

- 🗣️ **Real-time Voice Interaction**: Speech-to-Text and Text-to-Speech using Google Cloud APIs
- 🌍 **Bilingual Support**: Full English and Modern Standard Arabic (ar-SA) support
- 📚 **RAG-Powered Knowledge Base**: Vector-based document retrieval using Supabase pgvector
- 🎯 **Language-Aware Retrieval**: Automatic language filtering for context accuracy
- 📝 **Text & Voice Chat**: Seamless switching between text and voice input
- 🔄 **RTL Support**: Right-to-left text rendering for Arabic
- 📊 **Call Analytics**: Comprehensive call logging, statistics, and quality monitoring
- 🔄 **Error Recovery**: Retry logic, circuit breaker pattern, and graceful degradation
- 📞 **Telephony Integration**: Real phone call support via Vapi.ai

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **AI Model**: Google Gemini 2.5 Flash
- **Embeddings**: text-embedding-004 (768 dimensions)
- **Vector Database**: Supabase with pgvector
- **Voice Services**: Google Cloud Speech-to-Text & Text-to-Speech
- **Frontend**: React 19, TailwindCSS, shadcn/ui
- **Language**: TypeScript

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ installed
- **npm** or **yarn** package manager
- **Google Cloud Platform** account with:
  - Speech-to-Text API enabled
  - Text-to-Speech API enabled
  - Gemini API access
- **Supabase** account (free tier works)
- **Git** for version control

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd zoiddd
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**How to get these keys:**

#### Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy and paste into `.env.local`

#### Supabase Keys
1. Create a project at [Supabase](https://supabase.com)
2. Go to Project Settings → API
3. Copy the **Project URL** and **anon public** key
4. Copy the **service_role** key (keep this secret!)

### 4. Set Up Google Cloud Credentials

#### 4.1 Create a Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Go to **IAM & Admin** → **Service Accounts**
4. Click **Create Service Account**
5. Grant the following roles:
   - **Cloud Speech-to-Text API User**
   - **Cloud Text-to-Speech API User**
6. Create and download a **JSON key file**

#### 4.2 Add Credentials to Project

1. Rename the downloaded JSON file to `google-cloud-key.json`
2. Place it in the `lib/` directory:
   ```
   lib/google-cloud-key.json
   ```
3. **Important**: This file is already in `.gitignore` - never commit it to Git!

### 5. Configure Supabase Database

**Recommended:** Use the complete database setup script (`supabase-setup.sql`) which includes all tables, functions, and indexes.

#### Option 1: Complete Setup (Recommended)

1. Open the `supabase-setup.sql` file in your project
2. Copy the entire contents
3. Run it in your Supabase SQL Editor
4. This script is idempotent (safe to run multiple times)

#### Option 2: Manual Setup

If you prefer to set up manually, see the SQL snippets in `PROJECT_STATE.md` or the `supabase-setup.sql` file for the complete schema including:
- `documents` table with pgvector support
- `call_logs` table for call tracking
- `match_documents()` RPC function for RAG
- All necessary indexes and triggers

### 6. Upload Sample Knowledge Base (Optional)

Sample knowledge base files are provided in the `knowledge-bases/` directory:
- `sample-en.txt` - English content
- `sample-ar.txt` - Arabic content

**To upload:**
1. Start the dev server (see step 7)
2. Open the ingestion form in the app
3. Upload the sample files
4. The system will automatically:
   - Split text into chunks
   - Generate embeddings
   - Store in Supabase with language tags

### 7. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 8. Grant Microphone Permissions

When prompted by your browser, allow microphone access to use voice features.

## 📁 Project Structure

```
zoiddd/
├── app/
│   ├── api/
│   │   ├── chat/          # Text chat endpoint
│   │   ├── voice/         # Voice interaction endpoint
│   │   ├── ingest/        # Document ingestion endpoint
│   │   ├── calls/         # Call logs API
│   │   ├── vapi-webhook/  # Vapi webhook handler
│   │   └── vapi-function/ # Vapi server function (Supabase RAG)
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/
│   ├── chat-interface.tsx # Main chat UI component
│   ├── ingestion-form.tsx # Document upload component
│   ├── call-dashboard.tsx # Call statistics dashboard
│   ├── admin-dashboard.tsx # Admin dashboard
│   ├── cost-dashboard.tsx # Cost monitoring dashboard
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── gemini.ts          # Gemini AI client
│   ├── voice.ts           # STT/TTS functions
│   ├── rag.ts             # RAG retrieval logic
│   ├── supabase.ts        # Supabase client
│   ├── language.ts        # Language configuration
│   ├── call-handler.ts    # Call state management & logging
│   ├── call-monitor.ts    # Call quality monitoring
│   ├── vapi.ts            # Vapi integration helpers
│   └── google-cloud-key.json # (YOU MUST CREATE THIS)
├── knowledge-bases/       # Sample knowledge base files
├── scripts/               # Test and diagnostic scripts
├── .env.local            # (YOU MUST CREATE THIS)
└── PROJECT_STATE.md      # Current implementation status
```

## 🎯 Usage

### Text Chat
1. Select language (English | العربية) from dropdown
2. Type your message in the input field
3. Press "Send" or Enter

### Voice Chat
1. Select your preferred language
2. Click the "Record" button
3. Speak your question clearly
4. Click "Send Recording"
5. The AI will respond with both text and audio

### Document Ingestion
1. Navigate to the ingestion page
2. Select language (en-US or ar-SA)
3. Upload a `.txt`, `.pdf`, or `.docx` file
4. The system will process and store the content

## 📚 Documentation

**Current Documentation:**
- **[PROJECT_STATE.md](PROJECT_STATE.md)** - AI Agent Handover - Current implementation status, technical details, and next steps (UPDATED)
- **[BUSINESS_STRATEGY.md](BUSINESS_STRATEGY.md)** - Business strategy, go-to-market plan, pricing, and customer discovery
- **[TESTING.md](TESTING.md)** - Testing documentation and verification procedures

**Archived Documentation:**
- `archive/ROADMAP.md` - Original technical roadmap (archived)
- `archive/PROJECT_HANDOVER.md` - Original technical handover document (archived)
- `archive/z-composer/` - Previous strategic planning documents
- `archive/z-sonnet/` - Previous project handover documents

## 🔐 Security Notes

**Never commit these files:**
- `.env.local` (contains API keys)
- `lib/google-cloud-key.json` (contains service account credentials)

These are already in `.gitignore`, but always double-check before committing.

## 🐛 Troubleshooting

### Microphone Not Working
- Check browser permissions (Settings → Privacy → Microphone)
- Try a different browser (Chrome/Firefox recommended)
- Ensure no other app is using the microphone

### STT/TTS Errors
- Verify Google Cloud credentials are correct
- Check that APIs are enabled in Google Cloud Console
- Review server logs for detailed error messages

### RAG Not Retrieving Context
- Ensure documents are uploaded with correct language tag
- Verify Supabase `match_documents()` function exists
- Check that knowledge base has content for the selected language

### Database Connection Issues
- Verify Supabase URL and keys in `.env.local`
- Check that the `documents` and `call_logs` tables exist
- Ensure pgvector extension is enabled
- Run `npm run check:db` to verify database setup

### Call Logging Issues
- Verify `call_logs` table exists in Supabase
- Check webhook endpoint is accessible (for Vapi integration)
- Review server logs for detailed error messages
- Test with `npm run test:calls` (if available)

## 📊 Current Status

### ✅ Completed Feature Phases

- ✅ **Phase 1:** Core RAG Chat Implementation
- ✅ **Phase 2:** Persistent Knowledge Base & Ingestion
- ✅ **Phase 3:** Voice Integration
- ✅ **Phase 4:** Arabic Language Support (Bilingual UI, RTL, language-aware RAG)
- ✅ **Phase 5:** Telephony Integration
  - Phone number provisioned: +1 (510) 370 5981
  - Vapi webhook and server function endpoints created
  - ⚠️ **Note:** Vapi tool creation blocker (using built-in RAG temporarily)
- 🚧 **Phase 6:** Basic Call Handling & Vapi Metrics Tracking (IN PROGRESS)
  - ✅ Call logging and state management complete
  - ✅ Call statistics API and dashboard
  - ✅ Error recovery and monitoring
  - ⏳ Vapi metrics extraction pending
- ✅ **Phase 7:** Error Recovery & Monitoring
  - ✅ Retry logic and circuit breaker pattern
  - ✅ Call quality monitoring and health scoring
  - ✅ Comprehensive call statistics dashboard

### 🚧 Infrastructure Phases Required for Real MVP

**CRITICAL:** Phases 1-7 are feature-complete but the product is NOT production-ready yet. The app:
- ❌ Only runs locally (`npm run dev`)
- ❌ Uses a single shared database (no multi-tenancy)
- ❌ Has no user authentication
- ❌ Has no payment system
- ❌ Cannot be accessed from the internet
- ❌ Cannot provision phone numbers per customer

**Real MVP requires:**
- 🚧 Phase 8: Deployment & Internet Access
- 🚧 Phase 9: Multi-Tenancy & Data Isolation
- 🚧 Phase 10: User Authentication & Sign-Up
- 🚧 Phase 11: Payment Integration & Usage Tracking
- 🚧 Phase 12: Per-Tenant Phone Number Provisioning
- 🚧 Phase 13: Basic Admin Panel & Email Notifications

See **[PROJECT_STATE.md](PROJECT_STATE.md)** for detailed phase descriptions and requirements.

## ⚠️ Known Issues & Limitations

**Vapi Integration:**
- Server function tool creation fails with "An error occurred while updating the tool" - This is a Vapi platform issue, not our code
- Currently using Vapi's built-in knowledge base as temporary workaround
- Supabase RAG endpoint (`/api/vapi-function`) is ready but not connected due to tool creation blocker
- Once Vapi resolves the issue, we can switch to Supabase RAG for full control

**Production Readiness:**
- ⚠️ **Not Production-Ready:** This is a development demo. See "Infrastructure Phases Required for Real MVP" above.
- The app requires deployment, multi-tenancy, authentication, payments, and per-tenant phone provisioning before customers can use it independently.

**Next Steps:**
1. Complete Phase 6: Vapi metrics extraction
2. Monitor Vapi for tool creation fix
3. Begin infrastructure phases (8-13) for real MVP

## 📝 License

[Add your license here]

## 🤝 Contributing

[Add contribution guidelines here]

## 📧 Contact

[Add contact information here]

---

**Built with ❤️ for the MENA region**
