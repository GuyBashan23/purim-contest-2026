# 📋 Instructions: Run app_settings Migration

## 🚨 Important: Fix 404 Errors

If you're seeing 404 errors for `app_settings` table, you need to run the migration.

## ✅ Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase/migrations/002_app_settings.sql`
4. Paste and run it
5. Verify the table exists: Check **Table Editor** → `app_settings`

## ✅ Option 2: Supabase CLI

```bash
# If you have Supabase CLI installed
supabase migration up

# Or reset and apply all migrations
supabase db reset
```

## ✅ Option 3: Manual SQL (If above don't work)

Run this in Supabase SQL Editor:

```sql
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
```

## ✅ Verify It Worked

After running the migration, check:

1. **Table exists:** Go to Table Editor → Should see `app_settings`
2. **Has default row:** Should see 1 row with `current_phase = 'UPLOAD'`
3. **No more 404 errors:** Refresh the app, check console

---

**Status:** Ready to run
**File:** `supabase/migrations/002_app_settings.sql`
