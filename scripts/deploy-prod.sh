#!/bin/bash

# Helper to get value from .env.local
get_env_val() {
  grep "^$1=" .env.local | cut -d= -f2- | sed 's/^"//;s/"$//'
}

echo "🚀 Preparing Production Deployment..."

# 1. Get Values
echo "Reading configuration..."
GEMINI_API_KEY=$(get_env_val "GEMINI_API_KEY")
NEXT_PUBLIC_SUPABASE_URL=$(get_env_val "NEXT_PUBLIC_SUPABASE_URL")
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(get_env_val "NEXT_PUBLIC_SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY=$(get_env_val "SUPABASE_SERVICE_ROLE_KEY")
VAPI_API_KEY=$(get_env_val "VAPI_API_KEY")
VAPI_PHONE_NUMBER_ID=$(get_env_val "VAPI_PHONE_NUMBER_ID")
if [ -z "$VAPI_PHONE_NUMBER_ID" ]; then
  VAPI_PHONE_NUMBER_ID="dddb9798-0efe-4773-bd26-89f48b5c8c2a"
  echo "ℹ️ Using hardcoded VAPI_PHONE_NUMBER_ID"
fi
VAPI_WEBHOOK_TOKEN=$(get_env_val "VAPI_WEBHOOK_TOKEN")

if [ -f google-cloud-credentials-base64.txt ]; then
  GOOGLE_CREDS=$(cat google-cloud-credentials-base64.txt)
else
  echo "⚠️ google-cloud-credentials-base64.txt not found!"
fi

# 2. Update Environment Variables
update_var() {
  local name=$1
  local value=$2
  
  if [ -z "$value" ]; then
    echo "⚠️ Skipping $name (empty value)"
    return
  fi

  echo "Updating $name..."
  # Try to remove first to avoid prompts/conflicts
  npx vercel env rm "$name" production --yes > /dev/null 2>&1
  
  # Add new value
  echo -n "$value" | npx vercel env add "$name" production > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "  ✅ Set $name"
  else
    echo "  ❌ Failed to set $name"
  fi
}

echo "Configuring Vercel Production Environment..."
update_var "GEMINI_API_KEY" "$GEMINI_API_KEY"
update_var "NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_URL"
update_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY"
update_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY"
update_var "VAPI_API_KEY" "$VAPI_API_KEY"
update_var "VAPI_PHONE_NUMBER_ID" "$VAPI_PHONE_NUMBER_ID"
update_var "VAPI_WEBHOOK_TOKEN" "$VAPI_WEBHOOK_TOKEN"
update_var "GOOGLE_APPLICATION_CREDENTIALS_BASE64" "$GOOGLE_CREDS"

# Set URL placeholder if needed (optional, skipping to let Vercel handle defaults or user set it)
# update_var "NEXT_PUBLIC_APP_URL" "https://zoiddd.vercel.app"

# 3. Deploy
echo ""
echo "🚢 Deploying to Production..."
npx vercel --prod --yes

