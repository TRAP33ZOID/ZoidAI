import { NextResponse } from "next/server";
import { retrieveContext } from "@/lib/rag";
import { ai, CHAT_MODEL, withRetry } from "@/lib/gemini";
import { getSystemInstruction, isValidLanguage, getDefaultLanguage } from "@/lib/language";

/**
 * Vapi Server Function Endpoint
 * This endpoint is called by Vapi during a call to generate AI responses
 * using RAG (Retrieval-Augmented Generation).
 * 
 * Expected request format from Vapi:
 * {
 *   "functionCall": {
 *     "name": "get_ai_response",
 *     "parameters": {
 *       "query": "user's question",
 *       "language": "en-US" or "ar-SA",
 *       "conversationHistory": [...] // optional
 *     }
 *   }
 * }
 */
export async function POST(req: Request) {
  const requestStartTime = Date.now();
  console.log("\n========================================");
  console.log("🤖 [VAPI FUNCTION] Server function called");
  console.log("========================================");

  try {
    const body = await req.json();
    
    console.log("📥 [VAPI FUNCTION] Raw request body:", JSON.stringify(body, null, 2));
    
    // Extract function call data - handle multiple formats Vapi might send
    const functionCall = body.functionCall || body;
    const functionName = functionCall.name || "get_ai_response";
    
    // Parameters can be in different places depending on Vapi's format
    const parameters = functionCall.parameters || functionCall.args || functionCall || body.parameters || {};
    
    console.log("Function Name:", functionName);
    console.log("Parameters:", JSON.stringify(parameters, null, 2));

    // Extract query and language - handle multiple field names
    const userQuery = 
      parameters.query || 
      parameters.message || 
      parameters.transcript ||
      parameters.text ||
      body.query ||
      body.message ||
      body.transcript ||
      "";
    const languageParam = 
      parameters.language || 
      body.language || 
      getDefaultLanguage();
    const conversationHistory = 
      parameters.conversationHistory || 
      body.conversationHistory || 
      [];

    if (!userQuery) {
      console.error("❌ ERROR: No query provided");
      return NextResponse.json(
        { 
          error: "Query parameter is required",
          result: "I'm sorry, I didn't catch that. Could you please repeat your question?"
        },
        { status: 400 }
      );
    }

    // Validate language
    const language = isValidLanguage(languageParam) ? languageParam : getDefaultLanguage();
    if (languageParam !== language) {
      console.log(`⚠️ Invalid language '${languageParam}', using '${language}'`);
    }

    console.log(`\n📝 Query: "${userQuery}"`);
    console.log(`🌍 Language: ${language}`);

    // 1. Retrieve context using RAG
    console.log("\n📚 [VAPI FUNCTION] Step 1: Retrieving context...");
    const ragStartTime = Date.now();
    const contextChunks = await retrieveContext(userQuery, language, 3); // Get top 3 chunks
    const ragDuration = Date.now() - ragStartTime;
    console.log(`  ✅ RAG completed in ${ragDuration}ms`);
    console.log(`  Context chunks: ${contextChunks.length}`);
    
    const context = contextChunks.join("\n---\n");

    // 2. Build conversation history for context
    const conversationContext = conversationHistory.length > 0
      ? conversationHistory
          .slice(-5) // Last 5 messages for context
          .map((msg: any) => `${msg.role || "user"}: ${msg.content || msg.text || ""}`)
          .join("\n")
      : "";

    // 3. Generate AI response using Gemini
    console.log("\n🤖 [VAPI FUNCTION] Step 2: Generating AI response...");
    const aiStartTime = Date.now();
    
    const baseSystemInstruction = getSystemInstruction(language);
    const systemInstruction = `${baseSystemInstruction}

CONTEXT:
---
${context}
---
${conversationContext ? `\nPREVIOUS CONVERSATION:\n${conversationContext}\n` : ""}
`;

    const response = await withRetry(
      async () => {
        return await ai.models.generateContent({
          model: CHAT_MODEL,
          contents: [
            { role: "user", parts: [{ text: userQuery }] }
          ],
          config: {
            systemInstruction: systemInstruction,
          },
        });
      },
      3,
      "Vapi AI response generation"
    );

    const aiResponse = response.text || "Sorry, I could not generate a response.";
    const aiDuration = Date.now() - aiStartTime;
    
    console.log(`  ✅ AI response generated in ${aiDuration}ms`);
    console.log(`  Response: "${aiResponse.substring(0, 100)}${aiResponse.length > 100 ? '...' : ''}"`);

    const totalDuration = Date.now() - requestStartTime;
    console.log("\n✅ [VAPI FUNCTION] Request completed successfully");
    console.log(`  Total Duration: ${totalDuration}ms`);
    console.log(`    - RAG: ${ragDuration}ms`);
    console.log(`    - AI: ${aiDuration}ms`);
    console.log("========================================\n");

    // Return response in Vapi's expected format
    return NextResponse.json({
      result: aiResponse,
      // Include metadata for logging/debugging
      metadata: {
        language,
        contextChunksCount: contextChunks.length,
        responseTime: totalDuration,
        usageMetadata: response.usageMetadata ? {
          promptTokenCount: response.usageMetadata.promptTokenCount || 0,
          candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0,
        } : null
      }
    });

  } catch (error: any) {
    const totalDuration = Date.now() - requestStartTime;
    console.error("\n❌ [VAPI FUNCTION] Request FAILED");
    console.error(`  Total Duration: ${totalDuration}ms`);
    console.error("  Error Type:", error.constructor?.name || "Unknown");
    console.error("  Error Message:", error.message);
    console.error("  Error Stack:", error.stack);
    console.error("========================================\n");

    // Return error response that Vapi can handle
    return NextResponse.json(
      {
        error: "Internal Server Error",
        result: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.",
        details: error.message
      },
      { status: 500 }
    );
  }
}

// Handle GET requests (for health checks)
export async function GET(req: Request) {
  return NextResponse.json({ 
    message: "Vapi server function endpoint is active",
    timestamp: new Date().toISOString()
  });
}

