-- Migration: Fix votes table unique constraint for Eurovision-style voting
-- Change from UNIQUE(voter_phone, phase) to UNIQUE(voter_phone, entry_id, phase)
-- This allows voters to vote for multiple entries in the same phase,
-- but prevents duplicate votes for the same entry

-- Find and drop the existing unique constraint on (voter_phone, phase)
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint that covers voter_phone and phase (2 columns)
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
        AND attname = 'entry_id' 
        AND attnum = ANY(conkey)
      )
    LIMIT 1;
    
    -- Drop it if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE votes DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No matching constraint found - may have already been changed';
    END IF;
END $$;

-- Add new unique constraint that includes entry_id
-- This allows multiple votes per voter per phase, but prevents duplicate votes for the same entry
ALTER TABLE votes ADD CONSTRAINT votes_voter_phone_entry_id_phase_key 
  UNIQUE(voter_phone, entry_id, phase);

-- Note: This migration allows Eurovision-style voting where:
-- - A voter can vote for multiple entries in the same phase
-- - A voter cannot vote twice for the same entry in the same phase
-- - Each vote is independent and can have different point values (8, 10, or 12)
