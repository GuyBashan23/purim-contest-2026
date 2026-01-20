-- ============================================================================
-- CRITICAL FIX: Robust Voting Logic & Realtime Score Trigger
-- ============================================================================
-- This migration ensures:
-- 1. Trigger function correctly calculates scores from votes
-- 2. Trigger handles vote moves (from Entry A to Entry B)
-- 3. All scores are recalculated and verified
-- ============================================================================

-- ============================================================================
-- PART 1: Create/Replace Robust Trigger Function
-- ============================================================================
-- This function recalculates the total_score for entries whenever votes change
-- It handles INSERT, UPDATE, and DELETE operations
-- It correctly handles vote moves (when a vote moves from Entry A to Entry B)

CREATE OR REPLACE FUNCTION calculate_entry_score()
RETURNS TRIGGER AS $$
DECLARE
  affected_entry_ids UUID[];
  affected_entry_id UUID;
  calculated_score INTEGER;
BEGIN
  -- Collect all affected entry IDs (both old and new)
  affected_entry_ids := ARRAY[]::UUID[];
  
  -- Determine which entries need score recalculation
  IF TG_OP = 'DELETE' THEN
    -- When a vote is deleted, update the old entry's score
    IF OLD.entry_id IS NOT NULL THEN
      affected_entry_ids := ARRAY[OLD.entry_id];
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- When a vote is updated, check if entry_id changed
    IF OLD.entry_id != NEW.entry_id THEN
      -- Vote moved to different entry - update BOTH entries
      affected_entry_ids := ARRAY[OLD.entry_id, NEW.entry_id];
    ELSE
      -- Same entry, just points changed - update that entry
      affected_entry_ids := ARRAY[NEW.entry_id];
    END IF;
  ELSE
    -- INSERT: New vote added
    IF NEW.entry_id IS NOT NULL THEN
      affected_entry_ids := ARRAY[NEW.entry_id];
    END IF;
  END IF;
  
  -- Update scores for all affected entries
  FOREACH affected_entry_id IN ARRAY affected_entry_ids
  LOOP
    -- Calculate the total score by summing ALL votes for this entry
    -- This counts votes from all phases (cumulative score)
    SELECT COALESCE(SUM(points), 0) INTO calculated_score
    FROM votes
    WHERE votes.entry_id = affected_entry_id;
    
    -- Update the entry's total_score
    UPDATE entries
    SET total_score = calculated_score
    WHERE entries.id = affected_entry_id;
    
    -- Log for debugging (visible in Supabase logs)
    RAISE NOTICE '[calculate_entry_score] Updated entry % score to %', affected_entry_id, calculated_score;
  END LOOP;
  
  -- Return appropriate value
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 2: Attach Trigger to votes table
-- ============================================================================
-- This trigger fires AFTER any INSERT, UPDATE, or DELETE on the votes table
-- It ensures scores are always up-to-date

DROP TRIGGER IF EXISTS trigger_calculate_entry_score ON votes;
CREATE TRIGGER trigger_calculate_entry_score
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION calculate_entry_score();

-- ============================================================================
-- PART 3: Ensure Unique Constraint (Eurovision Rules)
-- ============================================================================
-- Each voter can give 8, 10, and 12 points EXACTLY ONCE each per phase
-- This constraint enforces: UNIQUE(voter_phone, points, phase)

-- Drop old constraint if it exists
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Try to drop the old constraint by name
  BEGIN
    ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_voter_phone_phase_key;
    RAISE NOTICE 'Dropped old constraint votes_voter_phone_phase_key';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Constraint votes_voter_phone_phase_key does not exist or already dropped';
  END;
  
  -- Find and drop any constraint on (voter_phone, phase) without points
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
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'votes'::regclass
      AND conname = 'votes_voter_phone_points_phase_key'
  ) THEN
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
-- Fix any inconsistencies by recalculating all scores from current votes

UPDATE entries
SET total_score = (
  SELECT COALESCE(SUM(points), 0)
  FROM votes
  WHERE votes.entry_id = entries.id
);

-- ============================================================================
-- PART 5: Verification & Status Report
-- ============================================================================

DO $$
DECLARE
  trigger_exists BOOLEAN;
  constraint_exists BOOLEAN;
  mismatch_count INTEGER;
  total_entries INTEGER;
  total_votes INTEGER;
BEGIN
  -- Check trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_calculate_entry_score'
    AND tgrelid = 'votes'::regclass
  ) INTO trigger_exists;
  
  -- Check constraint
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'votes'::regclass
      AND conname = 'votes_voter_phone_points_phase_key'
  ) INTO constraint_exists;
  
  -- Count entries and votes
  SELECT COUNT(*) INTO total_entries FROM entries;
  SELECT COUNT(*) INTO total_votes FROM votes;
  
  -- Check for score mismatches
  SELECT COUNT(*) INTO mismatch_count
  FROM entries e
  WHERE e.total_score != (
    SELECT COALESCE(SUM(points), 0)
    FROM votes
    WHERE entry_id = e.id
  );
  
  -- Report status
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Voting System Status Report:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total entries: %', total_entries;
  RAISE NOTICE 'Total votes: %', total_votes;
  
  IF trigger_exists THEN
    RAISE NOTICE '✅ Trigger: EXISTS AND ACTIVE';
  ELSE
    RAISE WARNING '❌ Trigger: NOT FOUND';
  END IF;
  
  IF constraint_exists THEN
    RAISE NOTICE '✅ Unique Constraint: EXISTS (Eurovision Rules)';
  ELSE
    RAISE WARNING '❌ Unique Constraint: NOT FOUND';
  END IF;
  
  IF mismatch_count = 0 THEN
    RAISE NOTICE '✅ Score Calculation: ALL CORRECT';
  ELSE
    RAISE WARNING '⚠️ Score Calculation: % MISMATCHES FOUND', mismatch_count;
    RAISE NOTICE 'Recalculating all scores...';
    
    -- Force recalculation
    UPDATE entries
    SET total_score = (
      SELECT COALESCE(SUM(points), 0)
      FROM votes
      WHERE votes.entry_id = entries.id
    );
    
    RAISE NOTICE '✅ Recalculation complete';
  END IF;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- PART 6: Sample Verification Query
-- ============================================================================
-- Show top 5 entries with their scores for manual verification

SELECT 
  e.id,
  LEFT(e.costume_title, 40) as title,
  e.total_score as db_score,
  COUNT(v.id) as vote_count,
  COALESCE(SUM(v.points), 0) as calculated_score,
  CASE 
    WHEN e.total_score = COALESCE(SUM(v.points), 0) THEN '✅'
    ELSE '❌'
  END as status
FROM entries e
LEFT JOIN votes v ON v.entry_id = e.id
GROUP BY e.id, e.costume_title, e.total_score
ORDER BY e.total_score DESC
LIMIT 5;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- The voting system should now:
-- 1. ✅ Automatically calculate scores via trigger
-- 2. ✅ Enforce Eurovision rules (unique 8/10/12 per voter per phase)
-- 3. ✅ Handle vote moves correctly (update both old and new entries)
-- 4. ✅ Have all scores recalculated and verified
-- ============================================================================
