import { NextResponse } from "next/server";
import { ai, CHAT_MODEL, withRetry } from "@/lib/gemini";
import { retrieveContext } from "@/lib/rag";
import { getDefaultLanguage, isValidLanguage, getSystemInstruction } from "@/lib/language";
import { isSupabaseConfigured } from "@/lib/supabase";

// Check if we're in development/preview (for detailed error messages)
const isDevelopment = process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview";

export async function POST(req: Request) {
  const startTime = Date.now();
  console.log("🔵 [CHAT API] Request received");
  
  try {
    // Log environment variable presence (without values)
    const envCheck = {
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV || "local",
    };
    console.log("🔵 [CHAT API] Environment check:", envCheck);
    console.log("🔵 [CHAT API] Supabase configured:", isSupabaseConfigured());

    const { query, language: languageParam } = await req.json();
    console.log("🔵 [CHAT API] Query received:", { 
      queryLength: query?.length, 
      language: languageParam 
    });

    if (!query) {
      console.error("❌ [CHAT API] Missing query parameter");
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }
    
    const language = isValidLanguage(languageParam) ? languageParam : getDefaultLanguage();
    console.log("🔵 [CHAT API] Using language:", language);

    // 1. Retrieval Step (RAG)
    console.log("🔵 [CHAT API] Starting RAG retrieval...");
    let contextChunks: string[];
    try {
      contextChunks = await retrieveContext(query, language);
      console.log("✅ [CHAT API] RAG retrieval successful:", {
        chunksFound: contextChunks.length,
        firstChunkLength: contextChunks[0]?.length || 0
      });
    } catch (ragError: any) {
      console.error("❌ [CHAT API] RAG retrieval failed:", {
        error: ragError?.message || ragError,
        stack: ragError?.stack,
        name: ragError?.name
      });
      throw {
        type: "RAG_ERROR",
        message: ragError?.message || "Failed to retrieve context",
        originalError: ragError
      };
    }
    
    const context = contextChunks.join("\n---\n");

    // 2. Augmentation and Generation Step
    console.log("🔵 [CHAT API] Preparing system instruction...");
    const baseSystemInstruction = getSystemInstruction(language);
    const systemInstruction = `${baseSystemInstruction}

CONTEXT:
---
${context}
---
`;
    console.log("🔵 [CHAT API] System instruction length:", systemInstruction.length);

    console.log("🔵 [CHAT API] Calling Gemini API...");
    let response;
    try {
      response = await withRetry(
        async () => {
          return await ai.models.generateContent({
            model: CHAT_MODEL,
            contents: [
              { role: "user", parts: [{ text: query }] }
            ],
            config: {
              systemInstruction: systemInstruction,
            },
          });
        },
        3,
        "Content generation"
      );
      console.log("✅ [CHAT API] Gemini API call successful");
    } catch (geminiError: any) {
      console.error("❌ [CHAT API] Gemini API call failed:", {
        error: geminiError?.message || geminiError,
        status: geminiError?.status,
        statusText: geminiError?.statusText,
        stack: geminiError?.stack,
        name: geminiError?.name
      });
      throw {
        type: "GEMINI_ERROR",
        message: geminiError?.message || "Failed to generate response",
        status: geminiError?.status,
        originalError: geminiError
      };
    }

    const textResponse = response.text;
    const duration = Date.now() - startTime;
    console.log("✅ [CHAT API] Request completed successfully in", duration, "ms");

    return NextResponse.json({
      response: textResponse,
      context: contextChunks,
      usageMetadata: response.usageMetadata ? {
        promptTokenCount: response.usageMetadata.promptTokenCount || 0,
        candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0,
      } : null
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error("❌ [CHAT API] Error after", duration, "ms:", {
      error: error?.message || error,
      type: error?.type || "UNKNOWN_ERROR",
      stack: error?.stack,
      name: error?.name
    });

    // Return detailed error in development/preview, generic in production
    const errorMessage = isDevelopment 
      ? error?.message || "Internal Server Error"
      : "Internal Server Error";
    
    const errorDetails = isDevelopment ? {
      type: error?.type || "UNKNOWN_ERROR",
      message: errorMessage,
      duration: `${duration}ms`
    } : undefined;

    return NextResponse.json(
      { 
        error: errorMessage,
        ...(errorDetails && { details: errorDetails })
      },
      { status: 500 }
    );
  }
}