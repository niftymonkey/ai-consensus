-- AI Consensus App Database Schema
-- Run this script in your Vercel Postgres database

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  image TEXT,
  consensus_max_rounds INTEGER DEFAULT 3,
  consensus_threshold INTEGER DEFAULT 80,
  consensus_evaluator_model VARCHAR(100) DEFAULT 'claude-3-7-sonnet-20250219',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'anthropic', 'openai', 'google'
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);

-- Optional: Create sessions table for NextAuth
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);

-- Optional: Create accounts table for OAuth providers
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type VARCHAR(50),
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

-- Consensus Workflow Tables
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

-- Store individual rounds with meta-conversation
CREATE TABLE IF NOT EXISTS consensus_rounds (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES consensus_conversations(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  model_responses JSONB NOT NULL, -- { "model-1": "response", "model-2": "response", ... }
  evaluation_reasoning TEXT,
  evaluation_key_differences JSONB,  -- Array of strings
  consensus_score INTEGER,
  refinement_prompts JSONB, -- { "model-1": "prompt", "model-2": "prompt", ... }
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(conversation_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_consensus_rounds_conversation
  ON consensus_rounds(conversation_id);

-- Trial Usage Tracking
-- Tracks free trial runs per user (identified by hashed IP address)
CREATE TABLE IF NOT EXISTS trial_usage (
  id SERIAL PRIMARY KEY,
  user_identifier VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 hash of IP (64 hex chars)
  runs_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trial_usage_user_identifier
  ON trial_usage(user_identifier);
