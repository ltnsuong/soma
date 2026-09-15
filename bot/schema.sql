-- SOMA Relationship Bot Database Schema
-- Run this in Supabase SQL Editor

-- User Profiles (created in /start)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),

  -- Profile Info
  self_description TEXT,
  relationship_type VARCHAR(50),
  personality_traits JSONB,
  values JSONB,
  interests JSONB,
  what_they_need TEXT,
  lifestyle JSONB,
  communication_style VARCHAR(100),
  deal_breakers JSONB,

  -- Metadata
  profile_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Dating Chats (when bot added to 2-person chat)
CREATE TABLE dating_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES user_profiles(id),
  user_b_telegram_id BIGINT,
  telegram_chat_id BIGINT UNIQUE NOT NULL,

  -- Analysis Results
  compatibility_score INT,
  compatibility_data JSONB,
  red_flags JSONB,
  suggested_dates JSONB,

  -- Chat Analysis
  messages_analyzed INT DEFAULT 0,
  last_analyzed TIMESTAMP,
  chat_summary JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Messages Log (for analysis)
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES dating_chats(id),
  sender_telegram_id BIGINT NOT NULL,
  message_text TEXT NOT NULL,
  analyzed BOOLEAN DEFAULT false,
  extracted_insights JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Coaching History (track advice given)
CREATE TABLE coaching_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES dating_chats(id),
  advice_type VARCHAR(50),
  advice_text TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_user_profiles_telegram_id ON user_profiles(telegram_id);
CREATE INDEX idx_dating_chats_telegram_chat_id ON dating_chats(telegram_chat_id);
CREATE INDEX idx_dating_chats_user_a_id ON dating_chats(user_a_id);
CREATE INDEX idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX idx_coaching_history_chat_id ON coaching_history(chat_id);

-- Enable Row Level Security (optional, for production)
-- ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dating_chats ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE coaching_history ENABLE ROW LEVEL SECURITY;
