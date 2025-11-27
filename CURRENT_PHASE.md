# Current Phase: Post-Security Fix - Ready for Testing

**Date:** November 27, 2025  
**Status:** Local development working, ready for Vercel deployment

---

## Recent Changes (Security Fix)

All API keys were rotated after accidental exposure:
- ✅ Gemini API Key - Rotated
- ✅ Supabase JWT Secret - Regenerated (new anon & service_role keys)
- ✅ Google Cloud Service Account - New key generated
- ✅ VAPI Keys - Rotated

---

## Environment Setup

### Local Development
- File: `.env.local` (auto-loaded by Next.js)
- Template: `.env.example` (safe to commit)
- Documentation: `archive/ENVIRONMENT_SETUP.md`

### Vercel Deployment
Add environment variables in: **Vercel Dashboard → Project Settings → Environment Variables**

Required variables:
1. `GEMINI_API_KEY`
2. `NEXT_PUBLIC_SUPABASE_URL`
3. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. `SUPABASE_SERVICE_ROLE_KEY`
5. `GOOGLE_CLOUD_PROJECT_ID`
6. `GOOGLE_APPLICATION_CREDENTIALS_BASE64` (base64 encoded service account JSON)
7. `VAPI_API_KEY`
8. `VAPI_PUBLIC_KEY`
9. `VAPI_WEBHOOK_TOKEN`
10. `NEXT_PUBLIC_APP_URL`

---

## Quick Commands

```bash
# Local development
npm run dev

# Check health
curl http://localhost:3000/api/health

# Deploy to Vercel preview
vercel

# Deploy to production
vercel --prod

# View production logs
vercel logs --prod
```

---

## Development Rules

1. **Never commit secrets** - Use `.env.local` locally, Vercel dashboard for deployments
2. **Test locally first** - Verify features work before deploying
3. **Incremental changes** - Small commits, test each step
4. **Keep docs updated** - Update PROJECT_STATE.md with progress

---

## Next Steps

1. ⏳ Deploy to Vercel with new credentials
2. ⏳ Update Vapi webhook URLs to production URL
3. ⏳ Complete Phase 8D testing checklist
4. ⏳ Move to Phase 9 (Multi-tenancy) after testing passes
