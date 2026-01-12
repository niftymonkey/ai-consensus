-- Migration: Add Preview Usage Tracking Table
-- Run this script in your Vercel Postgres database

-- Create preview_usage table to track preview runs per user (identified by IP hash)
-- Design decisions:
--   - user_identifier: SHA-256 hash of IP address (privacy-friendly, no raw IPs stored)
--   - runs_used: Counter for consumed preview runs (max 3 for MVP)
--   - No expiration for MVP (lifetime 3 runs per IP hash)

CREATE TABLE IF NOT EXISTS preview_usage (
  id SERIAL PRIMARY KEY,
  user_identifier VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 hash (64 hex chars)
  runs_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups by user identifier
CREATE INDEX IF NOT EXISTS idx_preview_usage_user_identifier
  ON preview_usage(user_identifier);

-- Migration complete!
-- Preview users can now be tracked by hashed IP address.
