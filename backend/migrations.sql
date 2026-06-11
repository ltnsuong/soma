-- SOMA Auth Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Profile data (extends users with SOMA-specific data)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ai_name TEXT DEFAULT 'Soma',
  ai_photo TEXT,
  trusted_contact_name TEXT,
  trusted_contact_phone TEXT,
  memories JSONB DEFAULT '[]',
  circle JSONB DEFAULT '[]',
  diary JSONB DEFAULT '[]',
  connections JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id ON reset_tokens(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reset_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own data
CREATE POLICY "Users can read their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- RLS for profiles
CREATE POLICY "Users can read their own profile data" ON profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Notes:
-- 1. Run this SQL in Supabase Dashboard → SQL Editor
-- 2. Copy your SUPABASE_URL and SUPABASE_KEY from Settings → API
-- 3. Use SUPABASE_SERVICE_KEY (service_role) for backend auth
-- 4. Store JWT_SECRET in .env (min 32 chars)
-- 5. Configure EMAIL_* for nodemailer (Gmail: use App Password, not account password)

-- Social login columns (added for Google OAuth support)
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- ════════════════════════════════════════════════════════════
-- REAL GEO MATCHING (dating profiles, likes, matches)
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dating_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INT,
  photo TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  interests TEXT[] DEFAULT '{}',
  values TEXT[] DEFAULT '{}',
  love_language TEXT DEFAULT '',
  attachment TEXT DEFAULT '',
  looking_for TEXT DEFAULT '',
  work TEXT DEFAULT '',
  lat DOUBLE PRECISION,          -- rounded to ~1 km by the backend, never exact
  lng DOUBLE PRECISION,
  city TEXT DEFAULT '',
  active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dating_profiles_geo ON dating_profiles(lat, lng) WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS dating_likes (
  liker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (liker_id, target_id)
);
CREATE INDEX IF NOT EXISTS idx_dating_likes_target ON dating_likes(target_id);

CREATE TABLE IF NOT EXISTS dating_matches (
  user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_a, user_b)
);

-- Haversine distance search: active profiles within p_radius_km of (p_lat, p_lng)
CREATE OR REPLACE FUNCTION nearby_profiles(
  p_user_id UUID, p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION, p_limit INT DEFAULT 50
)
RETURNS TABLE (
  user_id UUID, name TEXT, age INT, photo TEXT, bio TEXT,
  interests TEXT[], values TEXT[], love_language TEXT, attachment TEXT,
  looking_for TEXT, work TEXT, city TEXT, distance_km DOUBLE PRECISION
) LANGUAGE sql STABLE AS $$
  SELECT
    dp.user_id, dp.name, dp.age, dp.photo, dp.bio,
    dp.interests, dp.values, dp.love_language, dp.attachment,
    dp.looking_for, dp.work, dp.city,
    6371 * 2 * asin(sqrt(
      sin(radians((dp.lat - p_lat) / 2)) ^ 2 +
      cos(radians(p_lat)) * cos(radians(dp.lat)) *
      sin(radians((dp.lng - p_lng) / 2)) ^ 2
    )) AS distance_km
  FROM dating_profiles dp
  WHERE dp.active = TRUE
    AND dp.user_id <> p_user_id
    AND dp.lat IS NOT NULL AND dp.lng IS NOT NULL
    AND 6371 * 2 * asin(sqrt(
      sin(radians((dp.lat - p_lat) / 2)) ^ 2 +
      cos(radians(p_lat)) * cos(radians(dp.lat)) *
      sin(radians((dp.lng - p_lng) / 2)) ^ 2
    )) <= p_radius_km
  ORDER BY distance_km ASC
  LIMIT p_limit;
$$;
