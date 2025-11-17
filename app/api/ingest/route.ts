import { NextResponse } from "next/server";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ai, EMBEDDING_MODEL, withRetry } from "@/lib/gemini";
import { supabase, DOCUMENTS_TABLE } from "@/lib/supabase";
import { isValidLanguage, getDefaultLanguage } from "@/lib/language";
import { PDFParse } from "pdf-parse";

// Define chunking parameters
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

// Helper function to extract text from file
async function extractTextFromFile(file: File): Promise<string> {
  const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
  const fileType = file.type;

  // Handle text files
  if (
    fileType.startsWith("text/") ||
    [".txt", ".md", ".markdown"].includes(fileExtension)
  ) {
    return await file.text();
  }

  // Handle PDF files
  if (fileType === "application/pdf" || fileExtension === ".pdf") {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      return result.text;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to parse PDF: ${errorMessage}`);
    }
  }

  throw new Error(`Unsupported file type: ${fileType || fileExtension}`);
}

export async function POST(req: Request) {
  try {
    let text: string;
    let filename: string;
    let languageParam: string;

    // Check if request is FormData (file upload) or JSON (text paste)
    const contentType = req.headers.get("content-type") || "";
    const isFormData = contentType.includes("multipart/form-data");

    if (isFormData) {
      // Handle file upload
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      languageParam = (formData.get("language") as string) || getDefaultLanguage();

      if (!file) {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
      }

      filename = file.name;
      
      try {
        text = await extractTextFromFile(file);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to extract text from file";
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }

      if (!text || !text.trim()) {
        return NextResponse.json({ error: "File appears to be empty or could not be read" }, { status: 400 });
      }
    } else {
      // Handle JSON text paste (existing functionality)
      const body = await req.json();
      text = body.text;
      filename = body.filename;
      languageParam = body.language;

      if (!text || !filename) {
        return NextResponse.json({ error: "Missing text or filename" }, { status: 400 });
      }
    }

    // Validate and set language
    const language = isValidLanguage(languageParam) ? languageParam : getDefaultLanguage();

    // 2. Chunk the Document
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
    });

    const chunks = await splitter.splitText(text);
    console.log(`Split document into ${chunks.length} chunks.`);

    // 3. Embed and Store Chunks
    const documentsToInsert: Array<{
      content: string;
      metadata: { filename: string; chunk_index: number };
      embedding: number[];
      language: string;
    }> = [];
    const chunkTexts: string[] = [];

    for (const chunk of chunks) {
      chunkTexts.push(chunk);
    }

    // Batch embed all chunks (with retry logic for transient errors)
    const embedResponse = await withRetry(
      async () => {
        return await ai.models.embedContent({
          model: EMBEDDING_MODEL,
          contents: chunkTexts,
        });
      },
      3,
      "Batch embedding generation"
    );

    const embeddings = embedResponse.embeddings;

    if (!embeddings || embeddings.length !== chunks.length) {
      throw new Error("Failed to generate embeddings for document chunks.");
    }

    for (let i = 0; i < chunks.length; i++) {
      const embedding = embeddings[i];
      if (!embedding || !embedding.values) {
        throw new Error(`Failed to generate embedding for chunk ${i}.`);
      }
      documentsToInsert.push({
        content: chunks[i],
        metadata: { filename: filename, chunk_index: i },
        embedding: embedding.values,
        language: language, // Store the language for filtering
      });
    }

    // 4. Insert into Supabase
    const { error } = await supabase.from(DOCUMENTS_TABLE).insert(documentsToInsert);

    if (error) {
      console.error("Supabase insertion error:", error);
      return NextResponse.json({ error: "Failed to insert documents into database." }, { status: 500 });
    }

    return NextResponse.json({ message: `Successfully ingested ${chunks.length} document chunks.`, count: chunks.length });
  } catch (error) {
    console.error("Ingestion API Error:", error);
    return NextResponse.json({ error: "Internal Server Error during ingestion." }, { status: 500 });
  }
}