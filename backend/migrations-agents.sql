-- AI Agent System Schema

-- Agent Profiles (learned personality of each user)
CREATE TABLE IF NOT EXISTS agent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_name TEXT DEFAULT 'Soma',
  personality_traits TEXT[], -- ['curious', 'empathetic', 'adventurous']
  values TEXT[], -- ['authenticity', 'growth', 'connection']
  interests TEXT[], -- extracted from conversations
  communication_style TEXT, -- how they express themselves
  learning_score INT DEFAULT 0, -- 0-100, how well we know them
  summary TEXT, -- 1-2 paragraph description of agent
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Agent Memory (facts learned about each user)
CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL, -- 'relationships', 'goals', 'values', 'personality', 'interests'
  fact TEXT NOT NULL, -- "loves hiking and photography"
  confidence FLOAT DEFAULT 0.8, -- 0-1, how confident we are
  source TEXT, -- 'conversation', 'profile', 'diary'
  source_id TEXT, -- message_id, diary_entry_id, etc
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Agent Matches (which agents are compatible)
CREATE TABLE IF NOT EXISTS agent_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_a_id UUID NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  agent_b_id UUID NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  compatibility_score FLOAT DEFAULT 0, -- 0-100
  matched_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'matched', -- 'matched', 'rejected', 'archived'
  PRIMARY KEY (agent_a_id, agent_b_id)
);

-- Agent Conversations (AI agents talking to each other)
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES agent_matches(id) ON DELETE CASCADE,
  agent_a_id UUID NOT NULL REFERENCES agent_profiles(id),
  agent_b_id UUID NOT NULL REFERENCES agent_profiles(id),
  sender_agent_id UUID NOT NULL, -- which agent sent this message
  content TEXT NOT NULL,
  reasoning TEXT, -- why the agent said this
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (agent_a_id) REFERENCES agent_profiles(id),
  FOREIGN KEY (agent_b_id) REFERENCES agent_profiles(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_profiles_user_id ON agent_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_user_id ON agent_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_domain ON agent_memory(domain);
CREATE INDEX IF NOT EXISTS idx_agent_matches_agents ON agent_matches(agent_a_id, agent_b_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_match ON agent_conversations(match_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_sender ON agent_conversations(sender_agent_id);

-- RLS (Row Level Security) for agents
ALTER TABLE agent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can see their own agent profile"
  ON agent_profiles FOR SELECT
  USING (auth.uid()::TEXT = user_id::TEXT OR true); -- allow discovery

CREATE POLICY "Users can update their own agent profile"
  ON agent_profiles FOR UPDATE
  USING (auth.uid()::TEXT = user_id::TEXT);

CREATE POLICY "Users can view their own memory"
  ON agent_memory FOR SELECT
  USING (auth.uid()::TEXT = user_id::TEXT);

CREATE POLICY "System can insert agent memory"
  ON agent_memory FOR INSERT
  WITH CHECK (true); -- backend controls this
