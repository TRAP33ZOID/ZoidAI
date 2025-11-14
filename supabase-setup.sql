-- ============================================
-- Supabase Database Setup for Zoid AI
-- ============================================
-- Run this entire script in your Supabase SQL Editor
-- to recreate the required tables and functions
-- ============================================

-- 1. Enable pgvector extension (required for vector similarity search)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the documents table
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  language VARCHAR(10) DEFAULT 'en-US',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create index for vector similarity search
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. Create index for language filtering
CREATE INDEX idx_documents_language ON documents(language);

-- 5. Create the match_documents function for RAG retrieval
-- This function performs vector similarity search with language filtering
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_count int,
  language varchar DEFAULT 'en-US',
  filter jsonb DEFAULT '{}'
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
  RETURN query
  SELECT
    id,
    content,
    metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE documents.language = match_documents.language
    AND metadata @> filter
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 6. Create the call_logs table for tracking phone calls
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id VARCHAR(255) UNIQUE NOT NULL, -- Vapi call ID
  phone_number VARCHAR(20), -- Caller's phone number
  status VARCHAR(50) DEFAULT 'initiated', -- initiated, ringing, in-progress, completed, failed
  language VARCHAR(10) DEFAULT 'en-US', -- Language used during call
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER, -- Call duration in milliseconds
  transcript TEXT, -- Full conversation transcript
  metadata JSONB DEFAULT '{}', -- Additional call metadata (error messages, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create index for call_id lookups
CREATE INDEX IF NOT EXISTS idx_call_logs_call_id ON call_logs(call_id);

-- 8. Create index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_call_logs_phone_number ON call_logs(phone_number);

-- 9. Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);

-- 10. Create index for date range queries
CREATE INDEX IF NOT EXISTS idx_call_logs_started_at ON call_logs(started_at DESC);

-- 11. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create trigger to auto-update updated_at
CREATE TRIGGER update_call_logs_updated_at
  BEFORE UPDATE ON call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Setup Complete!
-- ============================================
-- You can now:
-- 1. Restart your Next.js dev server
-- 2. Upload documents via the ingestion form
-- 3. Start using the RAG system
-- 4. Track phone calls via call_logs table
-- ============================================

