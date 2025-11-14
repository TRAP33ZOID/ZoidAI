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

-- 13. Add Vapi metrics columns to call_logs table
-- Vapi cost tracking
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS vapi_cost_usd DECIMAL(10, 4);
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS vapi_telephony_cost DECIMAL(10, 4);
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS vapi_stt_cost DECIMAL(10, 4);
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS vapi_tts_cost DECIMAL(10, 4);
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS vapi_ai_cost DECIMAL(10, 4);

-- Vapi usage metrics
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS vapi_tokens_used INTEGER;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS vapi_model_used VARCHAR(100);
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS vapi_recording_url TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS vapi_function_calls_count INTEGER DEFAULT 0;

-- Vapi call details
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS vapi_hangup_reason VARCHAR(100);
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS vapi_direction VARCHAR(20); -- 'inbound', 'outbound'
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS vapi_transferred BOOLEAN DEFAULT false;

-- 14. Create detailed metrics table for granular tracking
CREATE TABLE IF NOT EXISTS vapi_call_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id VARCHAR(255) NOT NULL,
  
  -- Cost breakdown
  total_cost_usd DECIMAL(10, 4),
  telephony_cost_usd DECIMAL(10, 4),
  stt_cost_usd DECIMAL(10, 4),
  stt_minutes DECIMAL(10, 2),
  tts_cost_usd DECIMAL(10, 4),
  tts_characters INTEGER,
  ai_cost_usd DECIMAL(10, 4),
  ai_tokens_input INTEGER,
  ai_tokens_output INTEGER,
  ai_model VARCHAR(100),
  
  -- Quality metrics
  average_latency_ms INTEGER,
  jitter_ms INTEGER,
  packet_loss_percent DECIMAL(5, 2),
  connection_quality VARCHAR(50),
  
  -- Call metrics
  recording_url TEXT,
  recording_duration_ms INTEGER,
  function_calls_count INTEGER,
  function_calls_success INTEGER,
  function_calls_failed INTEGER,
  transfers_count INTEGER,
  sentiment_score DECIMAL(3, 2),
  
  -- Metadata
  vapi_assistant_id VARCHAR(255),
  vapi_phone_number_id VARCHAR(255),
  raw_vapi_data JSONB, -- Store full webhook payload
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Create indexes for vapi_call_metrics
CREATE INDEX IF NOT EXISTS idx_vapi_metrics_call ON vapi_call_metrics(call_id);
CREATE INDEX IF NOT EXISTS idx_vapi_metrics_date ON vapi_call_metrics(created_at);

-- 15a. Add unique constraint on call_id for upsert to work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vapi_call_metrics_call_id_key'
  ) THEN
    ALTER TABLE vapi_call_metrics ADD CONSTRAINT vapi_call_metrics_call_id_key UNIQUE (call_id);
  END IF;
END $$;

-- 15b. Add foreign key constraint with DEFERRABLE for flexible insertion order
-- Note: DEFERRABLE INITIALLY DEFERRED allows inserting into both tables in the same transaction
-- The constraint is only checked at transaction commit, not immediately
DO $$
BEGIN
  -- Drop existing constraint if it exists (to recreate with DEFERRABLE)
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vapi_call_metrics_call_id_fkey'
  ) THEN
    ALTER TABLE vapi_call_metrics DROP CONSTRAINT vapi_call_metrics_call_id_fkey;
  END IF;

  -- Add deferred foreign key constraint
  ALTER TABLE vapi_call_metrics
  ADD CONSTRAINT vapi_call_metrics_call_id_fkey
  FOREIGN KEY (call_id) REFERENCES call_logs(call_id)
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;
END $$;

-- 16. Create trigger to auto-update updated_at for vapi_call_metrics
CREATE TRIGGER update_vapi_call_metrics_updated_at
  BEFORE UPDATE ON vapi_call_metrics
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
-- 5. Track comprehensive Vapi metrics via vapi_call_metrics table
--
-- IMPORTANT NOTES (Nov 14, 2025):
-- - Webhook extracts call ID from body.message.call.id for end-of-call-report events
-- - Metrics are extracted from body.message.costs array and body.message.costBreakdown
-- - Foreign key constraint is DEFERRABLE to allow flexible insertion order
-- - Test with: node scripts/test-webhook.js
-- - Verify with: node scripts/check-calls.js
-- ============================================

