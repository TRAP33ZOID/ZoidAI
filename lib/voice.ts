import speech from "@google-cloud/speech";
import textToSpeech from "@google-cloud/text-to-speech";
import { getGoogleCloudCredentialsPath } from "./google-cloud-credentials";

// Get credentials path (handles both local file and production base64)
// This will throw an error if credentials are not available
let credentialsPath: string;
try {
  credentialsPath = getGoogleCloudCredentialsPath();
} catch (error: any) {
  throw new Error(`Failed to load Google Cloud credentials: ${error.message}`);
}

// Initialize Google Cloud clients
const speechClient = new speech.SpeechClient({
  keyFilename: credentialsPath,
});

const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFilename: credentialsPath,
});

/**
 * Converts audio buffer (WAV/MP3) to text using Google Cloud Speech-to-Text
 * @param audioBuffer The audio data as a Buffer
 * @param encoding Audio encoding (LINEAR16, MP3, etc.)
 * @param languageCode Language code for transcription (default: en-US)
 * @returns Promise resolving to transcribed text
 */
export async function speechToText(
  audioBuffer: Buffer,
  encoding: string = "LINEAR16",
  languageCode: string = "en-US"
): Promise<string> {
  // === DIAGNOSTIC LOGGING START ===
  console.log("🎤 [STT] Starting Speech-to-Text conversion");
  console.log(`  Language: ${languageCode}`);
  console.log(`  Encoding: ${encoding}`);
  console.log(`  Audio Buffer Size: ${audioBuffer.length} bytes`);
  
  const audio = {
    content: audioBuffer,
  };

  const config = {
    encoding: encoding,
    languageCode: languageCode,
    model: "latest_long",
    enableAutomaticPunctuation: true,
    // Add sample rate hint for WebM/Opus (48kHz is standard for browser recording)
    sampleRateHertz: encoding === "WEBM_OPUS" ? 48000 : undefined,
  };

  const request = {
    config,
    audio,
  };

  console.log("  Config:", JSON.stringify(config, null, 2));
  // === DIAGNOSTIC LOGGING END ===

  try {
    console.log("  Sending request to Google Cloud Speech API...");
    const [response] = await speechClient.recognize(request as any);
    
    // === DIAGNOSTIC LOGGING START ===
    console.log("  ✅ Response received from Google Cloud");
    console.log("  Results count:", response.results?.length || 0);
    
    if (response.results && response.results.length > 0) {
      response.results.forEach((result: any, index: number) => {
        const alternative = result.alternatives?.[0];
        console.log(`  Result ${index + 1}:`);
        console.log(`    Transcript: "${alternative?.transcript || '(empty)'}"`);
        console.log(`    Confidence: ${alternative?.confidence || 'N/A'}`);
      });
    } else {
      console.log("  ⚠️ WARNING: No results returned from API");
    }
    // === DIAGNOSTIC LOGGING END ===
    
    const transcription = response.results
      ?.map(
        (result: any) =>
          result.alternatives?.[0]?.transcript || ""
      )
      .join("\n");

    if (!transcription) {
      console.error("  ❌ ERROR: Empty transcription result");
      // This usually means no speech was detected (mic muted, silence, etc.)
      throw new Error("NO_SPEECH_DETECTED");
    }

    console.log(`  ✅ Final transcription: "${transcription}"`);
    return transcription;
  } catch (error: any) {
    console.error("  ❌ STT Error Details:");
    console.error("    Error Type:", error.constructor.name);
    console.error("    Error Message:", error.message);
    console.error("    Error Code:", error.code);
    console.error("    Error Details:", error.details);
    console.error("    Full Error:", error);
    throw new Error(`Failed to convert speech to text: ${error.message}`);
  }
}

/**
 * Converts text to speech audio using Google Cloud Text-to-Speech
 * @param text The text to convert to speech
 * @param languageCode Language code (default: en-US)
 * @returns Promise resolving to audio content as Buffer
 */
export async function textToAudio(
  text: string,
  languageCode: string = "en-US"
): Promise<Buffer> {
  // === DIAGNOSTIC LOGGING START ===
  console.log("🔊 [TTS] Starting Text-to-Speech conversion");
  console.log(`  Language: ${languageCode}`);
  console.log(`  Text Length: ${text.length} characters`);
  console.log(`  Text Preview: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
  // === DIAGNOSTIC LOGGING END ===
  
  const request = {
    input: { text },
    voice: {
      languageCode,
      ssmlGender: "NEUTRAL",
    },
    audioConfig: {
      audioEncoding: "MP3",
      pitch: 0,
      speakingRate: 1,
    },
  };

  console.log("  Voice Config:", JSON.stringify(request.voice, null, 2));

  try {
    console.log("  Sending request to Google Cloud TTS API...");
    const [response] = await ttsClient.synthesizeSpeech(request as any);
    const audioContent = response.audioContent;

    if (!audioContent) {
      console.error("  ❌ ERROR: No audio content in response");
      throw new Error("No audio content from Google Cloud Text-to-Speech");
    }

    const buffer = Buffer.isBuffer(audioContent)
      ? audioContent
      : Buffer.from(audioContent);
    
    console.log(`  ✅ Audio generated successfully (${buffer.length} bytes)`);
    return buffer;
  } catch (error: any) {
    console.error("  ❌ TTS Error Details:");
    console.error("    Error Type:", error.constructor.name);
    console.error("    Error Message:", error.message);
    console.error("    Error Code:", error.code);
    console.error("    Full Error:", error);
    throw new Error(`Failed to convert text to speech: ${error.message}`);
  }
}