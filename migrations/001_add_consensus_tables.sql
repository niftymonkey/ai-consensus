-- Migration: Add Consensus Workflow Tables and User Preferences
-- Run this script in your Vercel Postgres database

-- Step 1: Add consensus preference columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS consensus_max_rounds INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS consensus_threshold INTEGER DEFAULT 80,
  ADD COLUMN IF NOT EXISTS consensus_evaluator_model VARCHAR(100) DEFAULT 'claude-3-7-sonnet-20250219';

-- Step 2: Create consensus_conversations table
CREATE TABLE IF NOT EXISTS consensus_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  max_rounds INTEGER NOT NULL,
  consensus_threshold INTEGER NOT NULL,
  final_consensus_text TEXT,
  final_consensus_score INTEGER,
  rounds_completed INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consensus_conversations_user
  ON consensus_conversations(user_id);

-- Step 3: Create consensus_rounds table
CREATE TABLE IF NOT EXISTS consensus_rounds (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES consensus_conversations(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  model_responses JSONB NOT NULL,
  evaluation_reasoning TEXT,
  evaluation_key_differences JSONB,
  consensus_score INTEGER,
  refinement_prompts JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(conversation_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_consensus_rounds_conversation
  ON consensus_rounds(conversation_id);

-- Migration complete!
-- You can now test the consensus workflow.
