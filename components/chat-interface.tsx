"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Message {
  id: number;
  text: string;
  sender: "user" | "ai";
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now(), text: input, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Placeholder for API call (Integration step)
    const aiMessage: Message = {
      id: Date.now() + 1,
      text: "Connecting to AI agent...",
      sender: "ai",
    };
    setMessages((prev) => [...prev, aiMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: userMessage.text }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch response from AI agent.");
      }

      const data = await res.json();
      const responseText = data.response || "Sorry, I couldn't find an answer.";

      setMessages((prev) => {
        const newMessages = [...prev];
        // Update the last message (the "Connecting..." message) with the actual response
        newMessages[newMessages.length - 1].text = responseText;
        return newMessages;
      });
    } catch (error) {
      console.error("API Error:", error);
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].text = "Error: Could not connect to the support agent.";
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const MessageBubble = ({ message }: { message: Message }) => (
    <div className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-md ${
          message.sender === "user"
            ? "bg-blue-500 text-white"
            : "bg-gray-100 text-gray-800"
        }`}
      >
        {message.text}
      </div>
    </div>
  );

  return (
    <Card className="w-full max-w-3xl mx-auto h-[80vh] flex flex-col">
      <CardHeader>
        <CardTitle>Zoid AI Support Agent</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-4">
        <div className="h-full overflow-y-auto pr-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <MessageBubble message={{ id: 999, text: "Agent is typing...", sender: "ai" }} />
          )}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSend} className="flex w-full space-x-2">
          <Input
            type="text"
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}