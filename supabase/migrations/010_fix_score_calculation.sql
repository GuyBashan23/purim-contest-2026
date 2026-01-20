-- Migration: Fix score calculation and ensure trigger works correctly
-- This migration ensures the score trigger is properly set up and recalculates all scores

-- First, ensure the trigger function exists and is correct
CREATE OR REPLACE FUNCTION update_entry_score()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- When a vote is deleted (moved), update the old entry's score
    UPDATE entries
    SET total_score = (
      SELECT COALESCE(SUM(points), 0)
      FROM votes
      WHERE entry_id = OLD.entry_id
    )
    WHERE id = OLD.entry_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If entry_id changed (vote moved to different entry), update both
    IF OLD.entry_id != NEW.entry_id THEN
      -- Update old entry score
      UPDATE entries
      SET total_score = (
        SELECT COALESCE(SUM(points), 0)
        FROM votes
        WHERE entry_id = OLD.entry_id
      )
      WHERE id = OLD.entry_id;
      
      -- Update new entry score
      UPDATE entries
      SET total_score = (
        SELECT COALESCE(SUM(points), 0)
        FROM votes
        WHERE entry_id = NEW.entry_id
      )
      WHERE id = NEW.entry_id;
    ELSE
      -- Same entry, just points changed - update that entry
      UPDATE entries
      SET total_score = (
        SELECT COALESCE(SUM(points), 0)
        FROM votes
        WHERE entry_id = NEW.entry_id
      )
      WHERE id = NEW.entry_id;
    END IF;
    RETURN NEW;
  ELSE
    -- INSERT: Update score for the new entry
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

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS trigger_update_entry_score ON votes;
CREATE TRIGGER trigger_update_entry_score
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_entry_score();

-- Recalculate all scores to fix any inconsistencies
-- This ensures all entries have correct scores based on current votes
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

-- Verify: Check that scores are being calculated correctly
-- This query should return entries with their calculated scores matching total_score
DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM entries e
  WHERE e.total_score != (
    SELECT COALESCE(SUM(points), 0)
    FROM votes
    WHERE entry_id = e.id
  );
  
  IF mismatch_count > 0 THEN
    RAISE NOTICE 'Warning: Found % entries with mismatched scores. Recalculating...', mismatch_count;
    PERFORM recalculate_all_scores();
  ELSE
    RAISE NOTICE 'All scores are correctly calculated!';
  END IF;
END $$;
