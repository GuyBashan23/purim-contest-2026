-- Create app_settings table for centralized phase control
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  current_phase TEXT NOT NULL DEFAULT 'UPLOAD' CHECK (current_phase IN ('UPLOAD', 'VOTING', 'FINALS', 'ENDED')),
  voting_start_time TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to ensure only one row exists
CREATE OR REPLACE FUNCTION ensure_single_app_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all rows except the one being inserted/updated
  DELETE FROM app_settings WHERE id != NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one row
DROP TRIGGER IF EXISTS trigger_ensure_single_app_settings ON app_settings;
CREATE TRIGGER trigger_ensure_single_app_settings
  AFTER INSERT OR UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_app_settings();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for app_settings updated_at
DROP TRIGGER IF EXISTS trigger_update_app_settings_updated_at ON app_settings;
CREATE TRIGGER trigger_update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_updated_at();

-- Enable Row Level Security
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for app_settings (public read, admin write via service role)
CREATE POLICY "app_settings_read" ON app_settings
  FOR SELECT
  USING (true);

-- Insert initial app_settings row (with explicit conflict handling)
INSERT INTO app_settings (id, current_phase, voting_start_time) 
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'UPLOAD',
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  current_phase = EXCLUDED.current_phase,
  voting_start_time = EXCLUDED.voting_start_time;

-- If the above fails (no primary key conflict), try simple insert
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app_settings) THEN
    INSERT INTO app_settings (current_phase, voting_start_time)
    VALUES ('UPLOAD', NULL);
  END IF;
END $$;
