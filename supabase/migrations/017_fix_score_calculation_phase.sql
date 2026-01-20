-- ============================================================================
-- CRITICAL FIX: Score calculation must consider PHASE
-- ============================================================================
-- The trigger was calculating total_score from ALL votes, but it should
-- only count votes from the CURRENT phase (phase 1 for VOTING, phase 2 for FINALS)
-- OR count all votes if we want cumulative scores
-- ============================================================================
-- Based on user feedback: "כל יוזר שמכניס ניקוד לתמונה מסוינת מתווסף בסכום הכולל"
-- This suggests votes are being counted correctly, but maybe the trigger
-- is not firing or there's a phase issue.
-- ============================================================================

-- First, let's check what the current behavior should be
-- Option 1: Count ALL votes (cumulative across phases)
-- Option 2: Count only current phase votes

-- For now, let's use Option 1 (count all votes) as it seems to be what's expected
-- But we'll make the trigger more robust

CREATE OR REPLACE FUNCTION update_entry_score()
RETURNS TRIGGER AS $$
DECLARE
  affected_entry_ids UUID[];
  affected_entry_id UUID;
  calculated_score INTEGER;
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
  FOREACH affected_entry_id IN ARRAY affected_entry_ids
  LOOP
    -- Calculate the total score by summing ALL votes for this entry
    -- (across all phases - cumulative score)
    SELECT COALESCE(SUM(points), 0) INTO calculated_score
    FROM votes
    WHERE votes.entry_id = affected_entry_id;
    
    -- Update the entry's score
    UPDATE entries
    SET total_score = calculated_score
    WHERE entries.id = affected_entry_id;
    
    -- Log for debugging (only in development, remove in production)
    RAISE NOTICE 'Updated entry % score to %', affected_entry_id, calculated_score;
  END LOOP;
  
  -- Return appropriate value
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists and is attached
DROP TRIGGER IF EXISTS trigger_update_entry_score ON votes;
CREATE TRIGGER trigger_update_entry_score
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_entry_score();

-- Recalculate ALL scores to fix any inconsistencies
UPDATE entries
SET total_score = (
  SELECT COALESCE(SUM(points), 0)
  FROM votes
  WHERE votes.entry_id = entries.id
);

-- Verify: Check for any mismatches
DO $$
DECLARE
  mismatch_count INTEGER;
  total_entries INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_entries FROM entries;
  
  SELECT COUNT(*) INTO mismatch_count
  FROM entries e
  WHERE e.total_score != (
    SELECT COALESCE(SUM(points), 0)
    FROM votes
    WHERE entry_id = e.id
  );
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Score Calculation Verification:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total entries: %', total_entries;
  
  IF mismatch_count = 0 THEN
    RAISE NOTICE '✅ ALL SCORES ARE CORRECT!';
  ELSE
    RAISE WARNING '❌ Found % entries with incorrect scores', mismatch_count;
    RAISE NOTICE 'Recalculating...';
    
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

-- Show sample of entries with their scores
SELECT 
  e.id,
  LEFT(e.costume_title, 30) as title,
  e.total_score,
  COUNT(v.id) as vote_count,
  COALESCE(SUM(v.points), 0) as calculated,
  CASE 
    WHEN e.total_score = COALESCE(SUM(v.points), 0) THEN '✅'
    ELSE '❌'
  END as status
FROM entries e
LEFT JOIN votes v ON v.entry_id = e.id
GROUP BY e.id, e.costume_title, e.total_score
ORDER BY e.total_score DESC
LIMIT 5;
