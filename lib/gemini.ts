import { GoogleGenAI } from "@google/genai";

// Lazy initialization - only check API key when actually used (not at build time)
function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable not set.");
  }
  return apiKey;
}

// Initialize the GoogleGenAI client lazily
let aiInstance: GoogleGenAI | null = null;

export const ai = new Proxy({} as GoogleGenAI, {
  get(_target, prop) {
    if (!aiInstance) {
      aiInstance = new GoogleGenAI({ apiKey: getApiKey() });
    }
    const value = (aiInstance as any)[prop];
    return typeof value === 'function' ? value.bind(aiInstance) : value;
  }
});

// Define the models we will use
export const CHAT_MODEL = "gemini-2.5-flash";
export const EMBEDDING_MODEL = "text-embedding-004";

/**
 * Retry utility for handling transient API errors.
 * @param fn The async function to retry.
 * @param retries Number of retry attempts (default: 3).
 * @param operationName Name of the operation for logging (optional).
 * @returns The result of the function.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  operationName: string = "API call"
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      // Check if it's a retryable error (5xx status codes)
      const isRetryable = error?.status >= 500 || error?.status === 503;
      const isLastAttempt = attempt === retries;

      if (!isRetryable || isLastAttempt) {
        // If not retryable or this was the last attempt, throw the error
        throw error;
      }

      // Calculate exponential backoff delay: 1s, 2s, 4s, etc.
      const delayMs = Math.pow(2, attempt) * 1000;
      console.warn(
        `${operationName} error (attempt ${attempt + 1}/${retries + 1}): ${error?.message || error}. Retrying in ${delayMs}ms...`
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error(`${operationName} failed after ${retries + 1} attempts.`);
}