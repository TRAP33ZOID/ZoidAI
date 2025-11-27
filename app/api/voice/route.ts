import { NextResponse } from "next/server";
import { speechToText, textToAudio } from "@/lib/voice";
import { retrieveContext } from "@/lib/rag";
import { ai, CHAT_MODEL } from "@/lib/gemini";
import { getSystemInstruction, isValidLanguage, getDefaultLanguage } from "@/lib/language";

export async function POST(req: Request) {
  const requestStartTime = Date.now();
  console.log("\n========================================");
  console.log("🎤 [VOICE API] New voice request received");
  console.log("========================================");
  
  try {
    // 1. Extract audio from request and get language parameter
    console.log("📦 [VOICE API] Parsing form data...");
    const formData = await req.formData();
    const audioBlob = formData.get("audio") as Blob;
    const languageParam = (formData.get("language") as string) || getDefaultLanguage();
    
    console.log(`  Language Parameter: ${languageParam}`);
    console.log(`  Audio Blob Type: ${audioBlob?.type}`);
    console.log(`  Audio Blob Size: ${audioBlob?.size} bytes`);
    
    // Validate language parameter
    const language = isValidLanguage(languageParam) ? languageParam : getDefaultLanguage();
    
    if (languageParam !== language) {
      console.log(`  ⚠️ WARNING: Invalid language '${languageParam}', using default '${language}'`);
    }

    if (!audioBlob) {
      console.error("  ❌ ERROR: Audio blob missing");
      return NextResponse.json(
        { error: "Audio blob is required" },
        { status: 400 }
      );
    }

    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
    console.log(`  ✅ Audio buffer created: ${audioBuffer.length} bytes`);

    // 2. Convert speech to text (STT)
    console.log("\n🎤 [VOICE API] Step 2: Starting STT...");
    const sttStartTime = Date.now();
    let userQuery: string;
    let sttDuration: number;
    try {
      userQuery = await speechToText(audioBuffer, "WEBM_OPUS", language);
      sttDuration = Date.now() - sttStartTime;
      console.log(`  ✅ STT completed in ${sttDuration}ms`);
      console.log(`  Transcribed query: "${userQuery}"`);
    } catch (sttError: any) {
      // Handle case where no speech was detected (mic muted, silence, etc.)
      const errorMessage = sttError.message || "";
      if (
        errorMessage === "NO_SPEECH_DETECTED" || 
        errorMessage.includes("NO_SPEECH_DETECTED") ||
        errorMessage.includes("No transcription result")
      ) {
        console.log("  ⚠️ No speech detected in audio");
        return NextResponse.json(
          {
            error: "No speech detected",
            message: "No speech was detected in your recording. Please check that your microphone is not muted and try again.",
            errorType: "NO_SPEECH_DETECTED"
          },
          { status: 400 }
        );
      }
      // Re-throw other STT errors
      throw sttError;
    }

    // 3. Retrieve context using RAG
    console.log("\n📚 [VOICE API] Step 3: Retrieving context...");
    const ragStartTime = Date.now();
    const contextChunks = await retrieveContext(userQuery, language);
    const ragDuration = Date.now() - ragStartTime;
    console.log(`  ✅ RAG completed in ${ragDuration}ms`);
    console.log(`  Context chunks retrieved: ${contextChunks.length}`);
    const context = contextChunks.join("\n---\n");

    // 4. Generate AI response using Gemini
    console.log("\n🤖 [VOICE API] Step 4: Generating AI response...");
    const aiStartTime = Date.now();
    const baseSystemInstruction = getSystemInstruction(language);
    const systemInstruction = `${baseSystemInstruction}

CONTEXT:
---
${context}
---
`;

    const response = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: [{ role: "user", parts: [{ text: userQuery }] }],
      config: {
        systemInstruction: systemInstruction,
      },
    });

    const aiResponse = response.text || "Sorry, I could not generate a response.";
    const aiDuration = Date.now() - aiStartTime;
    console.log(`  ✅ AI response generated in ${aiDuration}ms`);
    console.log(`  Response preview: "${aiResponse.substring(0, 100)}${aiResponse.length > 100 ? '...' : ''}"`);

    // 5. Convert AI response to speech (TTS)
    console.log("\n🔊 [VOICE API] Step 5: Converting to speech...");
    const ttsStartTime = Date.now();
    const audioResponseBuffer = await textToAudio(aiResponse, language);
    const ttsDuration = Date.now() - ttsStartTime;
    console.log(`  ✅ TTS completed in ${ttsDuration}ms`);

    // 6. Return both text and audio to client
    const totalDuration = Date.now() - requestStartTime;
    console.log("\n✅ [VOICE API] Request completed successfully");
    console.log(`  Total Duration: ${totalDuration}ms`);
    console.log(`    - STT: ${sttDuration}ms`);
    console.log(`    - RAG: ${ragDuration}ms`);
    console.log(`    - AI: ${aiDuration}ms`);
    console.log(`    - TTS: ${ttsDuration}ms`);
    console.log("========================================\n");
    
    return NextResponse.json({
      transcript: userQuery,
      response: aiResponse,
      audioBuffer: audioResponseBuffer.toString("base64"),
      context: contextChunks,
      language: language,
      costData: {
        sttDuration: sttDuration,
        ttsCharacters: aiResponse.length,
        geminiMetadata: response.usageMetadata ? {
          promptTokenCount: response.usageMetadata.promptTokenCount || 0,
          candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0,
        } : null
      }
    });
  } catch (error: any) {
    const totalDuration = Date.now() - requestStartTime;
    console.error("\n❌ [VOICE API] Request FAILED");
    console.error(`  Total Duration: ${totalDuration}ms`);
    console.error("  Error Type:", error.constructor?.name || "Unknown");
    console.error("  Error Message:", error.message);
    console.error("  Error Stack:", error.stack);
    console.error("========================================\n");
    
    return NextResponse.json(
      {
        error: "Internal Server Error during voice processing",
        details: error.message,
        errorType: error.constructor?.name || "Unknown"
      },
      { status: 500 }
    );
  }
}