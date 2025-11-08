"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, Square, Volume2, Globe, Copy } from "lucide-react";
import { toast } from "sonner";
import { getLanguageOptions, getDefaultLanguage } from "@/lib/language";

interface Message {
  id: number;
  text: string;
  sender: "user" | "ai";
  audioBase64?: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [pendingAudioBlob, setPendingAudioBlob] = useState<Blob | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string>(getDefaultLanguage());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

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
        throw new Error("Failed to process voice input");
      }

      const data = await res.json();
      const responseText = data.response || "Sorry, I couldn't process that.";
      const audioBase64 = data.audioBuffer;
      const transcript = data.transcript || "(No speech detected)";

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
        throw new Error("Failed to fetch response from AI agent.");
      }

      const data = await res.json();
      const responseText = data.response || "Sorry, I couldn't find an answer.";

      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].text = responseText;
        return newMessages;
      });
    } catch (error) {
      console.error("API Error:", error);
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].text =
          "❌ Error: Could not connect to the support agent.";
        return newMessages;
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
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
          <Button
            size="sm"
            variant="ghost"
            onClick={() => copyToClipboard(message.text)}
            className="h-8 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Copy message to clipboard"
          >
            <Copy className="w-4 h-4" />
          </Button>
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
            <Globe className="w-4 h-4" />
            <select
              value={currentLanguage}
              onChange={(e) => setCurrentLanguage(e.target.value)}
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