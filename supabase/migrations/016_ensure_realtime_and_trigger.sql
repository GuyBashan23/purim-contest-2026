-- ============================================================================
-- Ensure Realtime is enabled and trigger is working correctly
-- ============================================================================
-- This migration ensures:
-- 1. Realtime publication is set up for entries table
-- 2. Replica identity is FULL (for complete UPDATE events)
-- 3. Trigger function is correct and working
-- ============================================================================

-- Step 1: Ensure supabase_realtime publication exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
    RAISE NOTICE '✅ Created supabase_realtime publication';
  ELSE
    RAISE NOTICE '✅ supabase_realtime publication already exists';
  END IF;
END $$;

-- Step 2: Add entries table to publication (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.entries;
    RAISE NOTICE '✅ Added entries table to supabase_realtime publication';
  ELSE
    RAISE NOTICE '✅ entries table already in supabase_realtime publication';
  END IF;
END $$;

-- Step 3: Set replica identity to FULL (critical for UPDATE events with all columns)
ALTER TABLE public.entries
  REPLICA IDENTITY FULL;

-- Step 4: Verify trigger function exists and is correct
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

-- Step 5: Ensure trigger exists
DROP TRIGGER IF EXISTS trigger_update_entry_score ON votes;
CREATE TRIGGER trigger_update_entry_score
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_entry_score();

-- Step 6: Recalculate all scores to fix any inconsistencies
UPDATE entries
SET total_score = (
  SELECT COALESCE(SUM(points), 0)
  FROM votes
  WHERE votes.entry_id = entries.id
);

-- Step 7: Verification queries
DO $$
DECLARE
  publication_exists BOOLEAN;
  replica_identity TEXT;
  trigger_exists BOOLEAN;
  score_mismatches INTEGER;
BEGIN
  -- Check publication
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'entries'
  ) INTO publication_exists;
  
  -- Check replica identity
  SELECT CASE c.relreplident
    WHEN 'f' THEN 'FULL ✅'
    ELSE 'NOT FULL ❌'
  END INTO replica_identity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'entries' AND n.nspname = 'public';
  
  -- Check trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_update_entry_score'
    AND tgrelid = 'votes'::regclass
  ) INTO trigger_exists;
  
  -- Check score mismatches
  SELECT COUNT(*) INTO score_mismatches
  FROM entries e
  WHERE e.total_score != (
    SELECT COALESCE(SUM(points), 0)
    FROM votes
    WHERE entry_id = e.id
  );
  
  -- Report status
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Realtime & Trigger Status:';
  RAISE NOTICE '========================================';
  IF publication_exists THEN
    RAISE NOTICE '✅ Realtime publication: ENABLED';
  ELSE
    RAISE WARNING '❌ Realtime publication: NOT ENABLED';
  END IF;
  
  RAISE NOTICE '✅ Replica Identity: %', replica_identity;
  
  IF trigger_exists THEN
    RAISE NOTICE '✅ Trigger: EXISTS';
  ELSE
    RAISE WARNING '❌ Trigger: NOT FOUND';
  END IF;
  
  IF score_mismatches = 0 THEN
    RAISE NOTICE '✅ Score calculation: ALL CORRECT';
  ELSE
    RAISE WARNING '⚠️ Score calculation: % MISMATCHES FOUND', score_mismatches;
  END IF;
  RAISE NOTICE '========================================';
END $$;
