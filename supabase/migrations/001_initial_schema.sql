-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create contest_state table
CREATE TABLE IF NOT EXISTS contest_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  current_phase TEXT NOT NULL DEFAULT 'registration' CHECK (current_phase IN ('registration', 'voting', 'finals', 'winners')),
  phase_2_start_time TIMESTAMPTZ,
  phase_3_start_time TIMESTAMPTZ,
  phase_4_start_time TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create entries table
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  costume_title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  total_score INTEGER DEFAULT 0,
  is_finalist BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voter_phone TEXT NOT NULL,
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  points INTEGER NOT NULL CHECK (points IN (1, 8, 10, 12)),
  phase INTEGER NOT NULL CHECK (phase IN (1, 2)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(voter_phone, phase)
);

-- Create voters table
CREATE TABLE IF NOT EXISTS voters (
  phone TEXT PRIMARY KEY,
  voted_phase_2 BOOLEAN DEFAULT FALSE,
  voted_phase_3 BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_entries_total_score ON entries(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_entries_is_finalist ON entries(is_finalist);
CREATE INDEX IF NOT EXISTS idx_votes_entry_id ON votes(entry_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_phone ON votes(voter_phone);
CREATE INDEX IF NOT EXISTS idx_votes_phase ON votes(phase);

-- Function to update total_score when votes are added/updated/deleted
CREATE OR REPLACE FUNCTION update_entry_score()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE entries
    SET total_score = (
      SELECT COALESCE(SUM(points), 0)
      FROM votes
      WHERE entry_id = OLD.entry_id
    )
    WHERE id = OLD.entry_id;
    RETURN OLD;
  ELSE
    UPDATE entries
    SET total_score = (
      SELECT COALESCE(SUM(points), 0)
      FROM votes
      WHERE entry_id = NEW.entry_id
    )
    WHERE id = NEW.entry_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update scores automatically
DROP TRIGGER IF EXISTS trigger_update_entry_score ON votes;
CREATE TRIGGER trigger_update_entry_score
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_entry_score();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for contest_state updated_at
DROP TRIGGER IF EXISTS trigger_update_contest_state_updated_at ON contest_state;
CREATE TRIGGER trigger_update_contest_state_updated_at
  BEFORE UPDATE ON contest_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE contest_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contest_state (public read, admin write via service role)
CREATE POLICY "contest_state_read" ON contest_state
  FOR SELECT
  USING (true);

-- RLS Policies for entries (public read, authenticated insert)
CREATE POLICY "entries_read" ON entries
  FOR SELECT
  USING (true);

CREATE POLICY "entries_insert" ON entries
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for votes (public read, authenticated insert)
CREATE POLICY "votes_read" ON votes
  FOR SELECT
  USING (true);

CREATE POLICY "votes_insert" ON votes
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for voters (public read, authenticated insert/update)
CREATE POLICY "voters_read" ON voters
  FOR SELECT
  USING (true);

CREATE POLICY "voters_insert" ON voters
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "voters_update" ON voters
  FOR UPDATE
  USING (true);

-- Insert initial contest state
INSERT INTO contest_state (current_phase) 
VALUES ('registration')
ON CONFLICT DO NOTHING;
