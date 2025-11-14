"use client";

import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Upload, FileText, X } from "lucide-react";
import { documentRefreshEmitter } from "@/lib/document-context";
import { getLanguageOptions, getDefaultLanguage } from "@/lib/language";
import { cn } from "@/lib/utils";

export function IngestionForm() {
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("");
  const [language, setLanguage] = useState<string>(getDefaultLanguage());
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "text">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = [
      "text/plain",
      "text/markdown",
      "text/x-markdown",
      "application/pdf",
    ];
    const validExtensions = [".txt", ".md", ".markdown", ".pdf"];
    const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (
      !validTypes.includes(file.type) &&
      !validExtensions.includes(fileExtension)
    ) {
      setStatus(
        `Invalid file type. Please upload a text file (.txt, .md) or PDF (.pdf).`
      );
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setStatus("File size exceeds 10MB limit. Please upload a smaller file.");
      return;
    }

    setSelectedFile(file);
    setFilename(file.name);
    setStatus("");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (uploadMode === "file") {
      if (!selectedFile || !filename.trim() || isLoading) {
        setStatus("Please select a file to upload.");
        return;
      }
    } else {
      if (!text.trim() || !filename.trim() || isLoading) {
        setStatus("Please provide both text content and a filename.");
        return;
      }
    }

    setIsLoading(true);
    setStatus("Ingesting document... This may take a moment.");

    try {
      let res: Response;

      if (uploadMode === "file" && selectedFile) {
        // Upload file using FormData
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("language", language);

        res = await fetch("/api/ingest", {
          method: "POST",
          body: formData,
        });
      } else {
        // Upload text using JSON
        res = await fetch("/api/ingest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text, filename, language }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        setStatus(`Ingestion Failed: ${data.error || "Unknown error."}`);
      } else {
        setStatus(`Ingestion Successful! ${data.count} chunks processed.`);
        setText("");
        setFilename("");
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        // Notify DocumentList to refresh
        console.log("📝 [INGESTION-FORM] Emitting document refresh event");
        documentRefreshEmitter.emit();
      }
    } catch (error) {
      console.error("Ingestion Error:", error);
      setStatus("Network Error: Could not reach the ingestion API.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto mb-8">
      <CardHeader>
        <CardTitle>Knowledge Base Ingestion</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "file" | "text")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="file">
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="text">
              <FileText className="w-4 h-4 mr-2" />
              Paste Text
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleIngest} className="flex flex-col space-y-4">
            <TabsContent value="file" className="space-y-4 mt-0">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50",
                  selectedFile && "border-primary/50 bg-primary/5"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-12 h-12 text-primary" />
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        setFilename("");
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="mt-2"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-12 h-12 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        Drag and drop a file here, or click to browse
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Supports .txt, .md, .markdown, .pdf (max 10MB)
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      className="mt-2"
                    >
                      Select File
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.markdown,.pdf"
                      onChange={handleFileInputChange}
                      className="hidden"
                      disabled={isLoading}
                    />
                  </div>
                )}
              </div>
              <Input
                type="text"
                placeholder="Document Filename (auto-filled from file)"
                value={filename}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilename(e.target.value)}
                disabled={isLoading || !!selectedFile}
                required
              />
            </TabsContent>

            <TabsContent value="text" className="space-y-4 mt-0">
              <Input
                type="text"
                placeholder="Document Filename (e.g., manual.txt)"
                value={filename}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilename(e.target.value)}
                disabled={isLoading}
                required
              />
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Paste document content here..."
                value={text}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
                disabled={isLoading}
                rows={10}
                required
              />
            </TabsContent>

            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-3 py-1 border rounded-md text-sm flex-1"
                disabled={isLoading}
              >
                {getLanguageOptions().map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Processing..." : "Ingest Document"}
            </Button>
          </form>
        </Tabs>
        {status && (
          <p
            className={cn(
              "mt-4 text-sm",
              status.includes("Failed") || status.includes("Error") || status.includes("Invalid")
                ? "text-red-500"
                : "text-green-500"
            )}
          >
            {status}
          </p>
        )}
      </CardContent>
    </Card>
  );
}