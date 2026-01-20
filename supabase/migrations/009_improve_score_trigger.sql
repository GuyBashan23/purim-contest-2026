-- Migration: Improve score update trigger to handle vote moves correctly
-- The trigger should update scores for BOTH the old entry (if vote was moved) and new entry

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_update_entry_score ON votes;

-- Improved function that handles all cases:
-- 1. INSERT: Update score for the new entry
-- 2. DELETE: Update score for the old entry (when vote is moved)
-- 3. UPDATE: Update scores for both old and new entries
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

-- Recreate trigger
CREATE TRIGGER trigger_update_entry_score
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_entry_score();

-- Also create a function to recalculate all scores (useful for fixing any inconsistencies)
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
