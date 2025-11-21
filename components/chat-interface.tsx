"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, Square, Volume2, Globe, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getLanguageOptions, getDefaultLanguage, isValidLanguage } from "@/lib/language";
import { costMonitor } from "@/lib/cost-monitor";

// Storage keys for persistence
const STORAGE_KEY = 'zoid_chat_messages';
const LANGUAGE_STORAGE_KEY = 'zoid_preferred_language';

interface Message {
  id: number;
  text: string;
  sender: "user" | "ai";
  audioBase64?: string;
}

// Helper function to load messages from localStorage (runs synchronously)
function loadMessagesFromStorage(): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    if (savedMessages) {
      return JSON.parse(savedMessages);
    }
  } catch (e) {
    console.error('Failed to parse saved messages:', e);
  }
  return [];
}

// Helper function to load language from localStorage (runs synchronously)
function loadLanguageFromStorage(): string {
  if (typeof window === 'undefined') return getDefaultLanguage();
  try {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && isValidLanguage(savedLanguage)) {
      return savedLanguage;
    }
  } catch (e) {
    console.error('Failed to load saved language:', e);
  }
  return getDefaultLanguage();
}

export function ChatInterface() {
  // Use lazy initializer to load from localStorage synchronously before first render
  const [messages, setMessages] = useState<Message[]>(loadMessagesFromStorage);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [pendingAudioBlob, setPendingAudioBlob] = useState<Blob | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string>(loadLanguageFromStorage);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);
  const languageSelectRef = useRef<HTMLSelectElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Initialize audio playback element
  useEffect(() => {
    audioPlaybackRef.current = new Audio();
    return () => {
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.pause();
      }
    };
  }, []);

  // Save messages to localStorage whenever they change AND on unmount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch (e) {
        console.error('Failed to save messages to localStorage:', e);
      }
    }
    
    // Cleanup: save on unmount as well
    return () => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        } catch (e) {
          console.error('Failed to save messages on unmount:', e);
        }
      }
    };
  }, [messages]);

  // Save language preference to localStorage whenever it changes AND on unmount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
      } catch (e) {
        console.error('Failed to save language to localStorage:', e);
      }
    }
    
    // Cleanup: save on unmount as well
    return () => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
        } catch (e) {
          console.error('Failed to save language on unmount:', e);
        }
      }
    };
  }, [currentLanguage]);

  // Start recording audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
       const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
       setPendingAudioBlob(audioBlob);
       stream.getTracks().forEach((track) => track.stop());
     };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Timer for recording duration
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Microphone access error:", error);
      alert("Unable to access microphone. Please check permissions.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  // Handle voice input via /api/voice
  const handleVoiceInput = async (audioBlob: Blob) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("audio", audioBlob);
    formData.append("language", currentLanguage);

    // Show recording indicator
    const recordingMessage: Message = {
      id: Date.now() + 1,
      text: "🎤 Recording received... transcribing...",
      sender: "ai",
    };
    setMessages((prev) => [...prev, recordingMessage]);

    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Voice API Error:", errorData);
        
        // Handle no speech detected error with user-friendly message
        if (errorData.errorType === "NO_SPEECH_DETECTED" || errorData.message?.includes("No speech detected")) {
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].text = 
              "🎤 No speech detected. Please check that your microphone is not muted and try again.";
            return newMessages;
          });
          toast.error("No speech detected", {
            description: "Your microphone may be muted or no audio was recorded.",
          });
          setIsLoading(false);
          return;
        }
        
        throw new Error(errorData.message || errorData.error || "Failed to process voice input");
      }

      const data = await res.json();
      const responseText = data.response || "Sorry, I couldn't process that.";
      const audioBase64 = data.audioBuffer;
      const transcript = data.transcript || "(No speech detected)";

      // Track costs from voice response
      if (data.costData) {
        const { sttDuration, ttsCharacters, geminiMetadata } = data.costData;
        if (geminiMetadata) {
          costMonitor.trackGeminiTokens(
            geminiMetadata.promptTokenCount,
            geminiMetadata.candidatesTokenCount
          );
        }
        costMonitor.trackSTT(sttDuration);
        costMonitor.trackTTS(ttsCharacters);
      }

      // Add user message with transcript
      const userMessage: Message = {
        id: Date.now(),
        text: `📝 You said: "${transcript}"`,
        sender: "user",
      };
      
      // Update the transcribing message with AI response
      const aiResponseMessage: Message = {
        id: Date.now() + 2,
        text: responseText,
        sender: "ai",
        audioBase64: audioBase64,
      };
      
      setMessages((prev) => {
        const newMessages = [...prev];
        // Remove the "transcribing..." message and add user transcript + AI response
        newMessages.pop();
        return [...newMessages, userMessage, aiResponseMessage];
      });

      // Auto-play response audio
      if (audioBase64 && audioPlaybackRef.current) {
        const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
        audioPlaybackRef.current.src = audioUrl;
        audioPlaybackRef.current.play().catch(() => {
          console.log("Audio playback not available");
        });
      }
    } catch (error) {
      console.error("Voice API Error:", error);
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].text =
          "❌ Error processing voice input.";
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle text input or pending voice input
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    // If there's pending audio, process it as voice input
    if (pendingAudioBlob) {
      await handleVoiceInput(pendingAudioBlob);
      setPendingAudioBlob(null);
      return;
    }

    // Otherwise, process text input
    if (!input.trim()) return;

    const userMessage: Message = { id: Date.now(), text: input, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const aiMessage: Message = {
      id: Date.now() + 1,
      text: "⏳ Connecting to AI agent...",
      sender: "ai",
    };
    setMessages((prev) => [...prev, aiMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: userMessage.text, language: currentLanguage }),
      });

      if (!res.ok) {
        // Try to get error details from response
        let errorMessage = "Failed to fetch response from AI agent.";
        let errorDetails: any = null;
        
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details || null;
          console.error("API Error Response:", {
            status: res.status,
            statusText: res.statusText,
            error: errorMessage,
            details: errorDetails
          });
        } catch (parseError) {
          console.error("API Error (could not parse response):", {
            status: res.status,
            statusText: res.statusText,
            parseError
          });
        }
        
        throw new Error(errorMessage);
      }

      const data = await res.json();
      
      // Check if response contains an error
      if (data.error) {
        console.error("API returned error:", data);
        throw new Error(data.error);
      }
      
      const responseText = data.response || "Sorry, I couldn't find an answer.";

      // Track costs from chat response
      if (data.usageMetadata) {
        costMonitor.trackGeminiTokens(
          data.usageMetadata.promptTokenCount || 0,
          data.usageMetadata.candidatesTokenCount || 0
        );
      }

      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].text = responseText;
        return newMessages;
      });
    } catch (error: any) {
      console.error("API Error:", {
        message: error?.message || error,
        stack: error?.stack,
        name: error?.name
      });
      
      // Create a more detailed error message
      let errorMessage = "❌ Error: Could not connect to the support agent.";
      
      if (error?.message) {
        // Show specific error if available
        if (error.message.includes("Failed to retrieve context")) {
          errorMessage = "❌ Error: Could not access knowledge base. Please check if documents are uploaded.";
        } else if (error.message.includes("GEMINI_API_KEY")) {
          errorMessage = "❌ Error: AI service configuration issue. Please contact support.";
        } else if (error.message.includes("Supabase")) {
          errorMessage = "❌ Error: Database connection issue. Please try again later.";
        } else {
          // Show the actual error message (sanitized for user display)
          errorMessage = `❌ Error: ${error.message}`;
        }
      }
      
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].text = errorMessage;
        return newMessages;
      });
      
      // Show toast notification for better visibility
      toast.error("Failed to get response from AI agent", {
        description: error?.message || "Please try again or check your connection.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = (audioBase64: string) => {
    if (audioPlaybackRef.current) {
      const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
      audioPlaybackRef.current.src = audioUrl;
      audioPlaybackRef.current.play();
    }
  };

  const clearConversation = () => {
    // Stop any active recording
    if (isRecording) {
      stopRecording();
    }
    
    // Clear all state
    setMessages([]);
    setInput("");
    setPendingAudioBlob(null);
    setIsLoading(false);
    
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);
    
    toast.success("Conversation cleared!");
  };

  const copyConversation = () => {
    if (messages.length === 0) {
      toast.error("No conversation to copy!");
      return;
    }

    const conversationText = messages
      .map((msg) => {
        const sender = msg.sender === "user" ? "You" : "AI";
        return `${sender}: ${msg.text}`;
      })
      .join("\n\n");

    navigator.clipboard.writeText(conversationText);
    toast.success("Conversation copied to clipboard!");
  };

  const handleLanguageChange = (newLanguage: string) => {
    // If there are messages or input, prompt for confirmation
    if (messages.length > 0 || input.trim()) {
      // Show a cute confirmation toast with custom content
      toast.custom(
        (t) => (
          <div className="flex flex-col gap-3 p-4 bg-background border rounded-lg shadow-lg min-w-[300px]">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌍</span>
              <div className="flex flex-col">
                <p className="font-semibold">Change Language?</p>
                <p className="text-sm text-muted-foreground">
                  This will clear your current conversation.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.dismiss(t);
                  // Force select to revert to current language
                  if (languageSelectRef.current) {
                    languageSelectRef.current.value = currentLanguage;
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  toast.dismiss(t);
                  // Clear the conversation before changing language
                  clearConversation();
                  // Change the language
                  setCurrentLanguage(newLanguage);
                  toast.success("Language changed! 🌍");
                }}
              >
                Yes, change it
              </Button>
            </div>
          </div>
        ),
        {
          duration: Infinity, // Keep it open until user responds
        }
      );
      
      // Don't change the language yet - wait for user confirmation
      // The select will revert since currentLanguage state hasn't changed
      return;
    }
    
    // Change the language directly if there's nothing to clear
    setCurrentLanguage(newLanguage);
  };

  const MessageBubble = ({ message }: { message: Message }) => (
    <div
      className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} mb-4 group`}
    >
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-md ${
          message.sender === "user"
            ? "bg-blue-500 text-white"
            : "bg-gray-100 text-gray-800"
        }`}
        dir={currentLanguage === "ar-SA" ? "rtl" : "ltr"}
      >
        <p>{message.text}</p>
        <div className="flex gap-2 mt-2 flex-wrap">
          {message.audioBase64 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => playAudio(message.audioBase64!)}
              className="h-8"
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Play Audio
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const languageOptions = getLanguageOptions();

  return (
    <Card className="w-full max-w-3xl mx-auto h-[80vh] flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>🎙️ Zoid AI Support Agent (Voice-Enabled)</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyConversation}
              disabled={messages.length === 0}
              title="Copy entire conversation"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Conversation
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearConversation}
              disabled={messages.length === 0 && !input.trim()}
              title="Clear entire conversation"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <Globe className="w-4 h-4" />
            <select
              ref={languageSelectRef}
              value={currentLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              {languageOptions.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-4">
        <div className="h-full overflow-y-auto pr-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <MessageBubble
              message={{ id: 999, text: "⏳ Agent is processing...", sender: "ai" }}
            />
          )}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSend} className="flex w-full space-x-2">
         <Input
           type="text"
           placeholder="Ask a question or use the microphone..."
           value={input}
           onChange={(e) => setInput(e.target.value)}
           disabled={isLoading || isRecording || !!pendingAudioBlob}
         />
         <Button
           type="button"
           variant={isRecording ? "destructive" : "default"}
           onClick={isRecording ? stopRecording : startRecording}
           disabled={isLoading || !!pendingAudioBlob}
         >
           {isRecording ? (
             <>
               <Square className="w-4 h-4 mr-2" />
               Stop ({recordingTime}s)
             </>
           ) : (
             <>
               <Mic className="w-4 h-4 mr-2" />
               Record
             </>
           )}
         </Button>
         <Button type="submit" disabled={isLoading} variant={pendingAudioBlob ? "default" : "default"}>
           {pendingAudioBlob ? "Send Recording" : "Send"}
         </Button>
       </form>
      </CardFooter>
    </Card>
  );
}