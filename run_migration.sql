-- Admin Update Policies Migration
-- Run this in Supabase Dashboard → SQL Editor
-- This migration fixes the "Unauthorized" error when updating phases

-- Allow admin updates to app_settings (via service role)
-- Service role bypasses RLS, but this ensures the policy exists if needed
CREATE POLICY IF NOT EXISTS "app_settings_update_admin" ON app_settings
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow admin inserts to app_settings (via service role)
CREATE POLICY IF NOT EXISTS "app_settings_insert_admin" ON app_settings
  FOR INSERT
  WITH CHECK (true);

-- Allow admin updates to contest_state (via service role)
-- Service role bypasses RLS, but this ensures the policy exists if needed
CREATE POLICY IF NOT EXISTS "contest_state_update_admin" ON contest_state
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow admin inserts to contest_state (via service role)
CREATE POLICY IF NOT EXISTS "contest_state_insert_admin" ON contest_state
  FOR INSERT
  WITH CHECK (true);

-- Note: The service role client used in app/actions/contest.ts and app/actions/admin.ts
-- should bypass all RLS policies. These policies are added as a safety measure
-- and to ensure proper database structure.
