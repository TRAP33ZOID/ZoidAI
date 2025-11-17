# Production Environment Variables Template

**Note:** The `.env.production.example` file cannot be created automatically due to `.gitignore` restrictions. Use this guide to set up your Vercel environment variables.

## Required Environment Variables

Copy these to **Vercel Dashboard → Your Project → Settings → Environment Variables**:

```
# Google AI (Gemini)
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Vapi Telephony Platform
VAPI_API_KEY=your_vapi_api_key_here
VAPI_PHONE_NUMBER_ID=your_vapi_phone_number_id_here
VAPI_WEBHOOK_TOKEN=your_vapi_webhook_token_here

# Google Cloud Credentials (Base64 Encoded)
# Run: .\scripts\prepare-deployment.ps1 to generate
GOOGLE_APPLICATION_CREDENTIALS_BASE64=your_base64_encoded_credentials_here

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production
```

## Setup Instructions

1. **Get values from your services:**
   - Gemini API Key: https://aistudio.google.com/app/apikey
   - Supabase: Dashboard → Settings → API
   - Vapi: https://dashboard.vapi.ai

2. **Generate Google Cloud credentials base64:**
   ```powershell
   .\scripts\prepare-deployment.ps1
   ```
   Copy the base64 string from `google-cloud-credentials-base64.txt`

3. **Add to Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add each variable above
   - Select all environments (Production, Preview, Development)
   - Save

4. **Update `NEXT_PUBLIC_APP_URL`** after deployment with your actual Vercel URL

