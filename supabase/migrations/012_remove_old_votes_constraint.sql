-- Migration: Remove old unique constraint that blocks multiple votes per phase
-- The old constraint UNIQUE(voter_phone, phase) prevents users from voting on multiple entries
-- We need to remove it to allow Eurovision-style voting (multiple votes per phase)

-- CRITICAL: Drop the old constraint by name first (most reliable method)
-- Try multiple possible constraint names
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_voter_phone_phase_key;
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_voter_phone_phase_key1;
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_voter_phone_phase_key2;

-- Also try to find and drop any constraint with voter_phone and phase (2 columns only)
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint that covers voter_phone and phase (2 columns) without entry_id or points
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
      AND NOT EXISTS (
        SELECT 1 FROM pg_attribute 
        WHERE attrelid = 'votes'::regclass 
        AND attname = 'points' 
        AND attnum = ANY(conkey)
      )
    LIMIT 1;
    
    -- Drop it if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE votes DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped old constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No old constraint found - may have already been removed';
    END IF;
END $$;

-- Verify the correct constraint exists: UNIQUE(voter_phone, points, phase)
-- This allows users to vote on multiple entries, but only one vote per point value per phase
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'votes'::regclass
          AND contype = 'u'
          AND conname = 'votes_voter_phone_points_phase_key'
    ) INTO constraint_exists;
    
    IF NOT constraint_exists THEN
        RAISE NOTICE 'Creating votes_voter_phone_points_phase_key constraint...';
        ALTER TABLE votes ADD CONSTRAINT votes_voter_phone_points_phase_key 
          UNIQUE(voter_phone, points, phase);
    ELSE
        RAISE NOTICE 'Constraint votes_voter_phone_points_phase_key already exists';
    END IF;
END $$;
