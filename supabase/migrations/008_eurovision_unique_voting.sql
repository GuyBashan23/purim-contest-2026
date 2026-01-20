-- Migration: Implement Eurovision-style unique voting constraint
-- Change constraint to UNIQUE(voter_phone, points, phase)
-- This ensures each voter can give 8, 10, and 12 points EXACTLY ONCE each per phase

-- Drop the old unique constraint (from migration 007)
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint that covers voter_phone, entry_id, and phase (3 columns)
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'votes'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 3
      AND EXISTS (
        SELECT 1 FROM pg_attribute 
        WHERE attrelid = 'votes'::regclass 
        AND attname = 'voter_phone' 
        AND attnum = ANY(conkey)
      )
      AND EXISTS (
        SELECT 1 FROM pg_attribute 
        WHERE attrelid = 'votes'::regclass 
        AND attname = 'entry_id' 
        AND attnum = ANY(conkey)
      )
      AND EXISTS (
        SELECT 1 FROM pg_attribute 
        WHERE attrelid = 'votes'::regclass 
        AND attname = 'phase' 
        AND attnum = ANY(conkey)
      )
    LIMIT 1;
    
    -- Drop it if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE votes DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END IF;
    
    -- Also try to drop the old constraint from migration 001 (voter_phone, phase)
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
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE votes DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped old constraint: %', constraint_name;
    END IF;
END $$;

-- Add new unique constraint: UNIQUE(voter_phone, points, phase)
-- This ensures each voter can give each point value (8, 10, 12) exactly once per phase
ALTER TABLE votes ADD CONSTRAINT votes_voter_phone_points_phase_key 
  UNIQUE(voter_phone, points, phase);

-- Note: This constraint allows:
-- - A voter to give 8 points to entry A, 10 points to entry B, 12 points to entry C
-- - A voter CANNOT give 12 points to both entry A and entry B (only one 12-point vote per phase)
-- - When a voter tries to give 12 points to entry B when they already gave 12 to entry A,
--   the application logic will DELETE the vote for entry A and INSERT a new vote for entry B
