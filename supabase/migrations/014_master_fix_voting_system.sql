-- ============================================================================
-- MASTER FIX: Voting Logic & Score Calculation
-- ============================================================================
-- This migration comprehensively fixes:
-- 1. RLS Policies for votes table (SELECT, INSERT, UPDATE, DELETE)
-- 2. Robust scoring trigger that handles all vote operations
-- 3. Ensures proper constraint enforcement
-- ============================================================================

-- ============================================================================
-- PART 1: Fix RLS Policies for votes table
-- ============================================================================
-- Since this system uses voter_phone (not auth.uid()), we allow operations
-- based on voter_phone matching, with server-side validation for security.

-- Drop all existing votes policies to start fresh
DROP POLICY IF EXISTS "votes_read" ON votes;
DROP POLICY IF EXISTS "votes_insert" ON votes;
DROP POLICY IF EXISTS "votes_update_allow" ON votes;
DROP POLICY IF EXISTS "votes_delete_allow" ON votes;
DROP POLICY IF EXISTS "votes_update_deny" ON votes;
DROP POLICY IF EXISTS "votes_delete_deny" ON votes;

-- Allow SELECT: Anyone can read votes (needed for score calculation and display)
CREATE POLICY "votes_select_all" ON votes
  FOR SELECT
  USING (true);

-- Allow INSERT: Anyone can insert votes (server validates voter_phone)
-- This is needed for the voting system to work
CREATE POLICY "votes_insert_all" ON votes
  FOR INSERT
  WITH CHECK (true);

-- Allow UPDATE: Anyone can update votes (server validates voter_phone)
-- This is needed for "Switch" logic (changing vote on same entry)
CREATE POLICY "votes_update_all" ON votes
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow DELETE: Anyone can delete votes (server validates voter_phone)
-- This is needed for "Steal" logic (moving votes between entries)
CREATE POLICY "votes_delete_all" ON votes
  FOR DELETE
  USING (true);

-- ============================================================================
-- PART 2: Create/Replace Robust Scoring Trigger
-- ============================================================================
-- This trigger automatically updates entry scores when votes are inserted,
-- updated, or deleted. It handles all edge cases including vote moves.

CREATE OR REPLACE FUNCTION update_entry_score()
RETURNS TRIGGER AS $$
DECLARE
  affected_entry_ids UUID[];
  entry_id UUID;
BEGIN
  -- Collect all affected entry IDs (both old and new)
  affected_entry_ids := ARRAY[]::UUID[];
  
  IF TG_OP = 'DELETE' THEN
    -- When a vote is deleted, update the old entry's score
    IF OLD.entry_id IS NOT NULL THEN
      affected_entry_ids := ARRAY[OLD.entry_id];
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- When a vote is updated, check if entry_id changed
    IF OLD.entry_id != NEW.entry_id THEN
      -- Vote moved to different entry - update both
      affected_entry_ids := ARRAY[OLD.entry_id, NEW.entry_id];
    ELSE
      -- Same entry, just points changed
      affected_entry_ids := ARRAY[NEW.entry_id];
    END IF;
  ELSE
    -- INSERT: New vote added
    IF NEW.entry_id IS NOT NULL THEN
      affected_entry_ids := ARRAY[NEW.entry_id];
    END IF;
  END IF;
  
  -- Update scores for all affected entries
  FOREACH entry_id IN ARRAY affected_entry_ids
  LOOP
    UPDATE entries
    SET total_score = (
      SELECT COALESCE(SUM(points), 0)
      FROM votes
      WHERE entry_id = entry_id
    )
    WHERE id = entry_id;
  END LOOP;
  
  -- Return appropriate value
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger to ensure it's properly attached
DROP TRIGGER IF EXISTS trigger_update_entry_score ON votes;
CREATE TRIGGER trigger_update_entry_score
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_entry_score();

-- ============================================================================
-- PART 3: Ensure Unique Constraint is Correct
-- ============================================================================
-- The constraint should be UNIQUE(voter_phone, points, phase) to enforce
-- Eurovision rules: one vote per point value (8, 10, 12) per voter per phase.

-- Drop old constraint if it exists
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Try to drop the old constraint by name
  BEGIN
    ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_voter_phone_phase_key;
    RAISE NOTICE 'Dropped votes_voter_phone_phase_key constraint';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Constraint votes_voter_phone_phase_key does not exist or already dropped';
  END;
  
  -- Also try to find and drop any constraint on (voter_phone, phase)
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'votes'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 2
    AND EXISTS (
      SELECT 1 FROM pg_attribute 
      WHERE attrelid = 'votes'::regclass 
      AND attname = 'voter_phone' 
      AND attnum = ANY(conkey)
    )
    AND EXISTS (
      SELECT 1 FROM pg_attribute 
      WHERE attrelid = 'votes'::regclass 
      AND attname = 'phase' 
      AND attnum = ANY(conkey)
    )
    AND NOT EXISTS (
      SELECT 1 FROM pg_attribute 
      WHERE attrelid = 'votes'::regclass 
      AND attname = 'points' 
      AND attnum = ANY(conkey)
    )
  LIMIT 1;
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE votes DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_name;
  END IF;
END $$;

-- Ensure the correct constraint exists
DO $$
BEGIN
  -- Check if the correct constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'votes'::regclass
      AND conname = 'votes_voter_phone_points_phase_key'
  ) THEN
    -- Add the correct constraint
    ALTER TABLE votes 
    ADD CONSTRAINT votes_voter_phone_points_phase_key 
    UNIQUE(voter_phone, points, phase);
    RAISE NOTICE 'Added votes_voter_phone_points_phase_key constraint';
  ELSE
    RAISE NOTICE 'Constraint votes_voter_phone_points_phase_key already exists';
  END IF;
END $$;

-- ============================================================================
-- PART 4: Recalculate All Scores
-- ============================================================================
-- Fix any inconsistencies in existing scores

CREATE OR REPLACE FUNCTION recalculate_all_scores()
RETURNS void AS $$
BEGIN
  UPDATE entries
  SET total_score = (
    SELECT COALESCE(SUM(points), 0)
    FROM votes
    WHERE votes.entry_id = entries.id
  );
END;
$$ LANGUAGE plpgsql;

-- Run the recalculation
SELECT recalculate_all_scores();

-- ============================================================================
-- PART 5: Verification
-- ============================================================================
-- Verify that everything is set up correctly

DO $$
DECLARE
  trigger_exists BOOLEAN;
  constraint_exists BOOLEAN;
  mismatch_count INTEGER;
BEGIN
  -- Check if trigger exists
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_update_entry_score'
    AND tgrelid = 'votes'::regclass
  ) INTO trigger_exists;
  
  -- Check if constraint exists
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'votes'::regclass
      AND conname = 'votes_voter_phone_points_phase_key'
  ) INTO constraint_exists;
  
  -- Check for score mismatches
  SELECT COUNT(*) INTO mismatch_count
  FROM entries e
  WHERE e.total_score != (
    SELECT COALESCE(SUM(points), 0)
    FROM votes
    WHERE entry_id = e.id
  );
  
  -- Report status
  IF trigger_exists THEN
    RAISE NOTICE '✅ Trigger trigger_update_entry_score exists';
  ELSE
    RAISE WARNING '❌ Trigger trigger_update_entry_score NOT found!';
  END IF;
  
  IF constraint_exists THEN
    RAISE NOTICE '✅ Constraint votes_voter_phone_points_phase_key exists';
  ELSE
    RAISE WARNING '❌ Constraint votes_voter_phone_points_phase_key NOT found!';
  END IF;
  
  IF mismatch_count = 0 THEN
    RAISE NOTICE '✅ All scores are correctly calculated';
  ELSE
    RAISE WARNING '⚠️ Found % entries with mismatched scores. Recalculating...', mismatch_count;
    PERFORM recalculate_all_scores();
  END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- The voting system should now work correctly with:
-- 1. Proper RLS policies allowing all vote operations
-- 2. Automatic score calculation via trigger
-- 3. Correct unique constraint enforcing Eurovision rules
-- 4. All existing scores recalculated and verified
-- ============================================================================
