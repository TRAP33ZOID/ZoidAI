# Environment Setup Guide

> **Last Updated:** November 27, 2025  
> **Status:** All credentials rotated after security incident

## Quick Start

1. Copy `.env.example` to `.env.local`
2. Fill in your API keys
3. Run `npm run dev`

## Environment Files

| File | Purpose | Committed to Git? |
|------|---------|-------------------|
| `.env.local` | Local development secrets | ❌ **Never** |
| `.env.example` | Template with placeholders | ✅ Yes |
| Vercel Dashboard | Production/Preview secrets | N/A |

### Why `.env.local` (with the dot)?

Next.js automatically loads environment files in this order:
1. `.env` (all environments)
2. `.env.local` (local overrides - **gitignored**)
3. `.env.development` / `.env.production` (environment-specific)
4. `.env.development.local` / `.env.production.local` (local overrides)

**Important:** Files without the dot prefix (like `env.local`) are NOT loaded by Next.js!

## Required Environment Variables

### Gemini API (AI/Chat)
```bash
GEMINI_API_KEY=your_key_here
```
Get from: https://aistudio.google.com/app/apikey

### Supabase (Database/Vector Store)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # JWT format, starts with "eyJ"
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # JWT format, starts with "eyJ"
```
Get from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api

**Note:** Both keys must be JWT tokens starting with `eyJ`. If you see `sb_publishable_` or `sb_secret_` prefixes, those are management API keys, not client keys.

### Google Cloud (Voice/TTS)
```bash
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=lib/google-cloud-key.json
```
- Create service account: https://console.cloud.google.com/iam-admin/serviceaccounts
- Download JSON key and save to `lib/google-cloud-key.json`

### VAPI (Voice AI)
```bash
VAPI_API_KEY=your_private_key      # UUID format
VAPI_PUBLIC_KEY=your_public_key    # UUID format
VAPI_WEBHOOK_TOKEN=your_secret     # For webhook verification
```
Get from: https://dashboard.vapi.ai

### App URL
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
- **Local:** `http://localhost:3000`
- **Vercel Preview:** Automatically set via `VERCEL_URL`
- **Vercel Production:** Your production domain

## Vercel Deployment

For Vercel deployments, add environment variables in:
**Project Settings → Environment Variables**

You can set different values for:
- **Production** - Live site
- **Preview** - PR/branch previews  
- **Development** - `vercel dev` command

### Vercel-Specific Notes

1. **Don't use ngrok for Vercel** - Vercel provides preview URLs automatically
2. **VERCEL_URL** is auto-set by Vercel for the current deployment URL
3. For webhooks (like VAPI), use your Vercel production URL

## Security Best Practices

### Files That Should NEVER Be Committed
- `.env.local` - Local secrets
- `lib/google-cloud-key.json` - Service account private key
- Any file containing API keys or passwords

### If Keys Are Leaked

1. **Immediately rotate all leaked keys:**
   - Gemini: Delete and create new key in AI Studio
   - Supabase: Regenerate JWT secret (invalidates all keys)
   - Google Cloud: Delete old key, create new one in IAM
   - VAPI: Regenerate in dashboard

2. **Keys in git history remain exposed** even after deletion
   - Consider using `git filter-branch` or BFG Repo-Cleaner
   - Or create a fresh repository

3. **Update `.gitignore`** to prevent future leaks

## Troubleshooting

### "Supabase not configured" Error
- Check that `.env.local` exists (with the dot!)
- Verify keys start with `eyJ` (JWT format)
- Restart dev server after changing env files

### "Invalid API key" Error
- Supabase keys may have whitespace - check for trailing spaces
- Ensure you're using the correct key type (anon vs service_role)

### Environment Variables Not Loading
- Next.js requires restart after `.env` changes
- Verify file is named `.env.local` not `env.local`
- Check `console.log(process.env.YOUR_VAR)` to debug

## Current Configuration Status

✅ Gemini API - Working  
✅ Supabase - Connected (direct connection)  
✅ Google Cloud - Service account configured  
✅ VAPI - Keys configured  
✅ Local development - `http://localhost:3000`

