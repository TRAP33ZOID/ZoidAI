/**
 * Vapi Integration Utilities
 * Helper functions and types for Vapi integration
 */

export interface VapiCall {
  id: string;
  status: string;
  startedAt: string;
  endedAt?: string;
  from?: string;
  to?: string;
}

export interface VapiWebhookEvent {
  type: string;
  call?: VapiCall;
  callId?: string;
  message?: {
    type: string;
  };
}

export interface VapiFunctionCall {
  name: string;
  parameters: {
    query: string;
    language?: string;
    conversationHistory?: Array<{
      role: string;
      content: string;
    }>;
  };
}

/**
 * Get the base URL for webhooks
 * Uses NEXT_PUBLIC_APP_URL if available, otherwise constructs from request
 */
export function getWebhookBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // Fallback for development
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }
  
  throw new Error("NEXT_PUBLIC_APP_URL environment variable must be set for production");
}

/**
 * Get webhook URLs for Vapi configuration
 */
export function getVapiWebhookUrls() {
  const baseUrl = getWebhookBaseUrl();
  
  return {
    webhookUrl: `${baseUrl}/api/vapi-webhook`,
    serverFunctionUrl: `${baseUrl}/api/vapi-function`,
  };
}

/**
 * Validate Vapi API key
 */
export function validateVapiApiKey(): boolean {
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ VAPI_API_KEY environment variable not set");
    return false;
  }
  return true;
}

