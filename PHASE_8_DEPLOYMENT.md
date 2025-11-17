# Phase 8 Deployment Guide - Complete Reference

**This is the SINGLE source of truth for deployment. All other deployment files reference this.**

## Overview

Phase 8 deployment configuration is complete! This guide consolidates all deployment steps, from preparation to production verification.

---

## What's Been Prepared ✅

### Files Created
1. **`vercel.json`** - Vercel deployment configuration
2. **`.env.production.example`** - Production environment template
3. **`lib/google-cloud-credentials.ts`** - Credentials helper
4. **`scripts/prepare-deployment.ps1`** - PowerShell helper script

### Code Updates
- **`lib/voice.ts`** - Uses credentials helper for production
- **`lib/supabase.ts`** - Connection pooling for production (port 6543)

---

## Prerequisites

1. **Vercel Account** - Sign up at https://vercel.com
2. **All Environment Variables** - Available in `.env.local`
3. **Supabase Production Database** - Running and accessible
4. **Google Cloud Service Account** - JSON key file at `lib/google-cloud-key.json`
5. **Vapi Account** - Active with phone number: **+1 (510) 370 5981**

---

## Pre-Deployment Checklist

- [ ] PowerShell installed (to run helper script)
- [ ] Node.js and npm installed
- [ ] Git repository up to date
- [ ] `.env.local` file has all required variables
- [ ] `lib/google-cloud-key.json` exists
- [ ] Supabase database is accessible
- [ ] Vapi account active with phone number: **+1 (510) 370 5981**

---

## Deployment Steps

### Step 1: Prepare Credentials

The Google Cloud service account JSON cannot be uploaded directly to Vercel. Convert to base64.

#### Option A: PowerShell Script (Windows - Recommended)
```powershell
.\scripts\prepare-deployment.ps1
```

#### Option B: Manual PowerShell (Windows)
```powershell
$content = Get-Content -Path "lib\google-cloud-key.json" -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
$base64 = [Convert]::ToBase64String($bytes)
$base64 | Out-File -FilePath "google-cloud-credentials-base64.txt"
```

#### Option C: Mac/Linux
```bash
cat lib/google-cloud-key.json | base64 > google-cloud-credentials-base64.txt
```

**Checklist:**
- [ ] Script runs successfully
- [ ] `google-cloud-credentials-base64.txt` created
- [ ] Copy the base64 string for Vercel

---

### Step 2: Install Vercel CLI

```bash
npm install -g vercel
```

Then login:
```bash
vercel login
```

This opens a browser for authentication.

**Checklist:**
- [ ] Vercel CLI installed globally
- [ ] Login successful (browser auth completed)

---

### Step 3: Initial Preview Deployment

```bash
vercel
```

**Follow prompts:**
- Set up and deploy? **Y**
- Which scope? Choose your account
- Link to existing project? **N**
- What's your project's name? **zoid-ai** (or your choice)
- In which directory is your code located? **./**
- Want to override settings? **N**

This creates a preview deployment.

**Checklist:**
- [ ] Deployment completes successfully
- [ ] Copy preview URL (e.g., `https://zoid-ai-abc123.vercel.app`)

---

### Step 4: Configure Environment Variables

#### Option A: Via Vercel Dashboard (Recommended for First Time)

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add each variable for **Production**, **Preview**, and **Development**:

| Variable | Source | Notes |
|----------|--------|-------|
| `GEMINI_API_KEY` | `.env.local` | From Google AI Studio |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | From Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | From Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` | From Supabase dashboard |
| `VAPI_API_KEY` | `.env.local` | From Vapi dashboard |
| `VAPI_PHONE_NUMBER_ID` | `.env.local` | From Vapi dashboard |
| `VAPI_WEBHOOK_TOKEN` | `.env.local` | From Vapi dashboard |
| `GOOGLE_APPLICATION_CREDENTIALS_BASE64` | `google-cloud-credentials-base64.txt` | Base64 from Step 1 |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL | e.g., https://zoid-ai.vercel.app |
| `NODE_ENV` | `production` | Set to production |

#### Option B: Via Vercel CLI (100% CLI Workflow)

```bash
vercel env add GEMINI_API_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add VAPI_API_KEY
vercel env add VAPI_PHONE_NUMBER_ID
vercel env add VAPI_WEBHOOK_TOKEN
vercel env add GOOGLE_APPLICATION_CREDENTIALS_BASE64
vercel env add NEXT_PUBLIC_APP_URL
vercel env add NODE_ENV
```

For each command, the CLI will prompt for:
- The value
- Which environments (Production/Preview/Development)

**Checklist:**
- [ ] All 10 variables added
- [ ] Each selected for all environments (Production, Preview, Development)
- [ ] Values match local environment

---

### Step 5: Deploy to Production

```bash
vercel --prod
```

**Checklist:**
- [ ] Production deployment completes
- [ ] Copy production URL
- [ ] Homepage loads at production URL

---

### Step 6: Update External Services

#### Update Vapi Webhooks
Go to: https://dashboard.vapi.ai

1. Navigate to your assistant/phone number configuration
2. Update webhook URLs:
   - **Webhook URL**: `https://your-app.vercel.app/api/vapi-webhook`
   - **Server Function URL**: `https://your-app.vercel.app/api/vapi-function`
3. Save changes

**Checklist:**
- [ ] Find assistant/phone number configuration
- [ ] Update webhook URL
- [ ] Update server function URL
- [ ] Save changes

#### Update Supabase CORS
Go to: **Supabase Dashboard → Settings → API**

1. Under **CORS Configuration**, add your Vercel domain:
   - `https://your-app.vercel.app`
   - `https://*.vercel.app` (for preview deployments)
2. Save changes

**Checklist:**
- [ ] Add production domain to CORS
- [ ] Add wildcard for preview deployments
- [ ] Save changes

#### Enable Supabase Connection Pooling (Recommended)

For better performance in serverless environment:

1. In Supabase dashboard, go to **Settings** → **Database**
2. Note the **Connection Pooling** URL (port 6543)
3. Already configured in `lib/supabase.ts` - no action needed

**Checklist:**
- [ ] Verify connection pooling is available

---

## Testing Checklist

### Basic Functionality
- [ ] Homepage loads at production URL
- [ ] No console errors in browser
- [ ] Chat interface renders correctly

### Chat Features
- [ ] Text chat works (English)
- [ ] Text chat works (Arabic)
- [ ] RTL text displays correctly
- [ ] Responses come from RAG/knowledge base

### Voice Features
- [ ] Voice recording button works
- [ ] Can record voice (English)
- [ ] Can record voice (Arabic)
- [ ] Voice responses play correctly

### Document Management
- [ ] Can upload document
- [ ] Document appears in list
- [ ] Document content searchable in chat

### Phone Integration
- [ ] Call phone number: **+1 (510) 370 5981**
- [ ] Call connects successfully
- [ ] Agent responds to questions
- [ ] Call completes without errors

### Webhook & Logging
- [ ] Call logs appear in database
- [ ] Call dashboard shows statistics
- [ ] Metrics are correct (duration, cost, etc.)
- [ ] No webhook errors in logs

### Cost Dashboard
- [ ] Cost dashboard loads
- [ ] Shows API usage data
- [ ] Numbers are updating

---

## Monitor and Verify

### Check Logs

#### Real-time Logs
```bash
# View real-time logs
vercel logs --follow

# View logs for specific deployment
vercel logs [deployment-url]
```

#### Via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your project
3. View:
   - **Deployments**: All deployments and their status
   - **Logs**: Runtime logs and errors
   - **Analytics**: Performance metrics
   - **Speed Insights**: Core Web Vitals

**Checklist:**
- [ ] No errors during testing
- [ ] No missing environment variables
- [ ] No authentication errors

### Performance Check
- [ ] Test from different locations
- [ ] Load time <3 seconds
- [ ] API response times acceptable
- [ ] Check Vercel analytics

### Test with curl

```bash
# Test webhook endpoint
curl -X POST https://your-app.vercel.app/api/vapi-webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"status-update","status":"test"}'

# Test RAG endpoint
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","language":"en-US"}'
```

### Security Verification
- [ ] `.env.local` in `.gitignore`
- [ ] `lib/google-cloud-key.json` in `.gitignore`
- [ ] No secrets in Git
- [ ] Webhook endpoints validate tokens
- [ ] Supabase RLS policies enabled
- [ ] CORS properly configured

---

## Troubleshooting

### Issue: "Module not found" errors
**Cause:** Dependencies in `devDependencies` instead of `dependencies`  
**Solution:** 
- Ensure all required packages are in `package.json` under `dependencies`
- Redeploy: `vercel --prod`

### Issue: Environment variables not working
**Cause:** Variables not loaded or deployment not refreshed  
**Solution:** 
- Redeploy after adding env vars: `vercel --prod`
- Check variable names match exactly (case-sensitive)
- Verify variables selected for correct environments

### Issue: Google Cloud auth failing
**Cause:** Base64 encoding issue or incomplete string  
**Solution:** 
- Verify base64 string is complete (no line breaks)
- Ensure `GOOGLE_APPLICATION_CREDENTIALS_BASE64` set in all environments
- Re-run encoding script if needed

### Issue: Webhook not receiving events
**Cause:** URL mismatch or network issue  
**Solution:** 
- Verify webhook URL in Vapi dashboard matches exactly
- Test with: `curl -X POST https://your-app.vercel.app/api/vapi-webhook`
- Check Vercel logs for incoming requests

### Issue: Database connection timeout
**Cause:** Direct connection instead of connection pooling  
**Solution:** 
- Enable Supabase connection pooling (port 6543)
- Already configured in `lib/supabase.ts`
- Verify Supabase is accessible from Vercel

### Debugging Checklist
1. **Vercel logs**: `vercel logs`
2. **Browser console** for client errors
3. **Verify environment variables** in dashboard
4. **Supabase logs** for database errors
5. **Vapi configuration** matches production URLs
6. **Test individual endpoints** with curl

---

## Rollback Plan

If deployment has issues:

```bash
vercel ls                    # List deployments
vercel promote [url]         # Promote previous working deployment
```

---

## Optional: Custom Domain Setup

### Purchase Domain
1. Buy domain from Namecheap, GoDaddy, or any registrar
2. Example: `zoid.ai`, `yourbrand.ai`

### Configure in Vercel
1. Go to Vercel dashboard → Your project
2. Navigate to **Settings** → **Domains**
3. Click **Add Domain**
4. Enter your domain (e.g., `zoid.ai`)
5. Follow DNS configuration instructions:
   - Add A record: `76.76.21.21`
   - Add CNAME record: `cname.vercel-dns.com`
6. Wait for DNS propagation (5-60 minutes)

### Update Environment Variables
```bash
# Remove old URL
vercel env rm NEXT_PUBLIC_APP_URL production

# Add new URL
vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://zoid.ai
```

### Update Vapi Webhooks
Update webhook URLs to use custom domain:
- `https://zoid.ai/api/vapi-webhook`
- `https://zoid.ai/api/vapi-function`

### Update Supabase CORS
Add custom domain to CORS configuration:
- `https://zoid.ai`

### Redeploy
```bash
vercel --prod
```

**Checklist:**
- [ ] Domain purchased
- [ ] Vercel → Settings → Domains
- [ ] Add domain
- [ ] Configure DNS at registrar
- [ ] Wait for DNS propagation (5-60 min)
- [ ] Update `NEXT_PUBLIC_APP_URL`
- [ ] Redeploy: `vercel --prod`
- [ ] Update Vapi webhooks with new domain
- [ ] Update Supabase CORS
- [ ] Test all functionality

---

## Success Criteria ✅

Deployment is successful when:

✅ All tests pass (see Testing Checklist)  
✅ Phone calls work end-to-end  
✅ No errors in logs  
✅ Performance is acceptable  
✅ Webhooks receiving data  
✅ Database queries working  

---

## After Successful Deployment

- [ ] Update `PROJECT_STATE.md` with production URL
- [ ] Mark Phase 8 complete
- [ ] Commit changes to Git
- [ ] Celebrate! 🎉

---

## What's Next?

### Phase 9: Multi-Tenancy
- Organization/tenant isolation
- Database schema updates
- Row-level security (RLS)

### Phase 10: Authentication
- User login/signup
- Protected routes
- Session management

### Phase 11: Payments
- Stripe integration
- Usage tracking
- Billing dashboard

### Phase 12: Phone Provisioning
- Per-tenant phone numbers
- Automatic provisioning via Vapi API

### Phase 13: Admin Panel
- System management
- Email notifications
- Usage alerts

### Phase 14: MVP Ready
- Full production system
- Self-service onboarding
- Real customers

---

## Additional Resources

- **Phase Plan**: `PHASE_PLAN.md`
- **Project State**: `PROJECT_STATE.md`
- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Supabase Production**: https://supabase.com/docs/guides/platform/going-into-prod

---

**Ready to deploy! 🚀**

**Version:** 2.0 - Consolidated from DEPLOYMENT.md, PHASE_8_QUICKSTART.md, and PHASE_8_CHECKLIST.md  
**Last Updated:** November 14, 2025
