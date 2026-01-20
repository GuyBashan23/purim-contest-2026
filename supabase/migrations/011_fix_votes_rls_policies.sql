-- Migration: Fix RLS policies for votes table to allow DELETE and UPDATE
-- This is required for the "Steal" and "Switch" voting logic to work

-- Drop the deny policies that are blocking DELETE and UPDATE
DROP POLICY IF EXISTS "votes_delete_deny" ON votes;
DROP POLICY IF EXISTS "votes_update_deny" ON votes;

-- Allow DELETE operations for votes
-- Users can delete their own votes (needed for "Steal" logic - moving votes)
-- Since we use voter_phone for identification, we allow DELETE for all
-- (Server-side validation ensures users can only delete their own votes)
CREATE POLICY "votes_delete_allow" ON votes
  FOR DELETE
  USING (true);  -- Allow all deletes (server validates voter_phone)

-- Allow UPDATE operations for votes
-- Users can update their own votes (needed for "Switch" logic - changing points on same entry)
-- Server-side validation ensures users can only update their own votes
CREATE POLICY "votes_update_allow" ON votes
  FOR UPDATE
  USING (true)  -- Allow all updates (server validates voter_phone)
  WITH CHECK (true);

-- Note: Security is enforced via:
-- 1. Server-side validation in submitSingleVote() that checks voter_phone
-- 2. Database trigger prevent_self_vote() that prevents self-voting
-- 3. Database constraint UNIQUE(voter_phone, points, phase) that enforces Eurovision rules
-- 4. Database trigger update_entry_score() that automatically updates scores

-- The RLS policies are permissive because this is a public contest,
-- but all operations are validated server-side before reaching the database.
