-- nfchat Database Schema
-- Run with: psql $DATABASE_URL -f schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users (from GitHub OAuth)
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id     BIGINT UNIQUE NOT NULL,
  github_login  VARCHAR(255) NOT NULL,
  email         VARCHAR(255),
  credits       INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for GitHub ID lookup
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);

-- Rate limiting for authenticated users
CREATE TABLE IF NOT EXISTS rate_limits_users (
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  count         INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- Rate limiting for anonymous users (by IP)
CREATE TABLE IF NOT EXISTS rate_limits_anonymous (
  ip_hash       VARCHAR(64) NOT NULL,  -- SHA256 hash of IP for privacy
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  count         INTEGER DEFAULT 0,
  PRIMARY KEY (ip_hash, date)
);

-- Conversations for research
CREATE TABLE IF NOT EXISTS conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id    VARCHAR(64) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user conversation lookup
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);

-- Messages within conversations
CREATE TABLE IF NOT EXISTS messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role          VARCHAR(20) NOT NULL,  -- 'user', 'assistant', 'data_request', 'data_response'
  content       JSONB NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for conversation messages lookup
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- Stripe credit purchases
CREATE TABLE IF NOT EXISTS purchases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  stripe_id     VARCHAR(255) UNIQUE NOT NULL,
  credits       INTEGER NOT NULL,
  amount_cents  INTEGER NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user purchases lookup
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Cleanup old rate limit entries (run via cron or manually)
-- DELETE FROM rate_limits_users WHERE date < CURRENT_DATE - INTERVAL '7 days';
-- DELETE FROM rate_limits_anonymous WHERE date < CURRENT_DATE - INTERVAL '7 days';
