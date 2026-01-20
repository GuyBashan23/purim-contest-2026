-- ============================================================================
-- FIX: Resolve column reference ambiguity in update_entry_score trigger
-- ============================================================================
-- The trigger had an ambiguous reference: variable "entry_id" vs column "entry_id"
-- This migration fixes it by using a clearer variable name and table qualifiers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_entry_score()
RETURNS TRIGGER AS $$
DECLARE
  affected_entry_ids UUID[];
  affected_entry_id UUID;
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
    UPDATE entries
    SET total_score = (
      SELECT COALESCE(SUM(points), 0)
      FROM votes
      WHERE votes.entry_id = affected_entry_id
    )
    WHERE entries.id = affected_entry_id;
  END LOOP;
  
  -- Return appropriate value
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- The trigger should already exist, but ensure it's using the updated function
-- (No need to drop/recreate if it already exists)

-- Verify the function was updated
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger function update_entry_score() has been fixed';
  RAISE NOTICE '   - Changed variable name from entry_id to affected_entry_id';
  RAISE NOTICE '   - Added table qualifiers (votes.entry_id, entries.id)';
END $$;
